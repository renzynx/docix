package main

import (
	"bytes"
	"fmt"
	"strings"
)

func emitQueryKeys(buf *bytes.Buffer, result *ParseResult) {
	seen := make(map[string]bool)

	for _, route := range result.Routes {
		if route.Method != "GET" {
			continue
		}

		handler := lookupHandler(route, result)
		keyName, keyValue := getQueryKeyParts(route, handler)

		actualKeyName := keyName
		if strings.Contains(keyName, ":") {
			actualKeyName = strings.Split(keyName, ":")[0]
		}

		if seen[actualKeyName] {
			continue
		}
		seen[actualKeyName] = true

		if keyValue == "" {
			fmt.Fprintf(buf, "\t%s,\n", keyName)
		} else {
			fmt.Fprintf(buf, "\t%s: %s,\n", keyName, keyValue)
		}
	}
}

func emitQueryOptions(buf *bytes.Buffer, result *ParseResult) {
	for _, route := range result.Routes {
		if route.Method != "GET" {
			continue
		}

		handler := lookupHandler(route, result)
		funcName := getFunctionName(route) + "QueryOptions"
		responseType := getResponseType(route, handler)

		var pathParams []string
		var queryParams []QueryParam
		if handler != nil {
			pathParams = handler.PathParams
			queryParams = handler.QueryParams
		}

		hasPathParams := len(pathParams) > 0
		hasQueryParams := len(queryParams) > 0

		// Build function signature
		sigParts := []string{}
		if hasPathParams {
			for _, p := range pathParams {
				sigParts = append(sigParts, p+": string")
			}
		}
		if hasQueryParams {
			paramsInterface := getQueryParamsInterfaceName(route)
			sigParts = append(sigParts, "params?: "+paramsInterface)
		}
		sigParts = append(sigParts, "config?: AxiosRequestConfig")

		fmt.Fprintf(buf, "export const %s = (%s) =>\n", funcName, strings.Join(sigParts, ", "))
		buf.WriteString("\tqueryOptions({\n")

		keyName, _ := getQueryKeyParts(route, handler)
		if strings.Contains(keyName, "=>") {
			actualKeyName := strings.Split(keyName, ":")[0]
			if hasPathParams && hasQueryParams {
				fmt.Fprintf(buf, "\t\tqueryKey: queryKeys.%s(%s, params),\n", actualKeyName, pathParams[0])
			} else if hasPathParams {
				fmt.Fprintf(buf, "\t\tqueryKey: queryKeys.%s(%s),\n", actualKeyName, pathParams[0])
			} else if hasQueryParams {
				fmt.Fprintf(buf, "\t\tqueryKey: queryKeys.%s(params),\n", actualKeyName)
			}
		} else {
			fmt.Fprintf(buf, "\t\tqueryKey: queryKeys.%s,\n", keyName)
		}

		buf.WriteString("\t\tqueryFn: async () => {\n")
		pathTemplate := convertPathToTemplate(route.Path)

		if hasQueryParams {
			// Pass params to axios config
			fmt.Fprintf(buf, "\t\t\tconst { data } = await api.get<%s>(%s, { ...config, params });\n", responseType, pathTemplate)
		} else {
			fmt.Fprintf(buf, "\t\t\tconst { data } = await api.get<%s>(%s, config);\n", responseType, pathTemplate)
		}
		buf.WriteString("\t\t\treturn data;\n")
		buf.WriteString("\t\t},\n")

		// Enabled flag for path params
		if hasPathParams {
			fmt.Fprintf(buf, "\t\tenabled: !!%s,\n", pathParams[0])
		}

		buf.WriteString("\t});\n\n")
	}
}

func emitMutationFunctions(buf *bytes.Buffer, result *ParseResult) {
	for _, route := range result.Routes {
		if route.Method == "GET" {
			continue
		}

		handler := lookupHandler(route, result)
		funcName := getFunctionName(route)
		responseType := getResponseType(route, handler)

		var pathParams []string
		var requestType string
		if handler != nil {
			pathParams = handler.PathParams
			requestType = handler.RequestType
		}

		// Build function signature
		params := []string{}
		for _, p := range pathParams {
			params = append(params, p+": string")
		}
		if requestType != "" {
			params = append(params, "request: "+requestType)
		}
		params = append(params, "config?: AxiosRequestConfig")

		fmt.Fprintf(buf, "export const %s = async (%s) => {\n", funcName, strings.Join(params, ", "))

		method := strings.ToLower(route.Method)
		pathTemplate := convertPathToTemplate(route.Path)

		if method == "delete" {
			if requestType != "" {
				fmt.Fprintf(buf, "\tconst { data } = await api.%s<%s>(%s, { ...config, data: request });\n",
					method, responseType, pathTemplate)
			} else {
				fmt.Fprintf(buf, "\tconst { data } = await api.%s<%s>(%s, config);\n",
					method, responseType, pathTemplate)
			}
		} else {
			if requestType != "" {
				fmt.Fprintf(buf, "\tconst { data } = await api.%s<%s>(%s, request, config);\n",
					method, responseType, pathTemplate)
			} else {
				fmt.Fprintf(buf, "\tconst { data } = await api.%s<%s>(%s, undefined, config);\n",
					method, responseType, pathTemplate)
			}
		}

		buf.WriteString("\treturn data;\n")
		buf.WriteString("};\n\n")
	}
}

func emitMutationOptions(buf *bytes.Buffer, result *ParseResult) {
	for _, route := range result.Routes {
		if route.Method == "GET" {
			continue
		}

		handler := lookupHandler(route, result)
		funcName := getFunctionName(route)
		optionFuncName := funcName + "MutationOptions"

		var pathParams []string
		var requestType string
		if handler != nil {
			pathParams = handler.PathParams
			requestType = handler.RequestType
		}

		fmt.Fprintf(buf, "export const %s = (config?: AxiosRequestConfig) =>\n", optionFuncName)
		buf.WriteString("\tmutationOptions({\n")

		if len(pathParams) > 1 && requestType != "" {
			// Multiple path params and request body - use object
			paramTypes := []string{}
			paramNames := []string{}
			for _, p := range pathParams {
				paramTypes = append(paramTypes, p+": string")
				paramNames = append(paramNames, p)
			}
			fmt.Fprintf(buf, "\t\tmutationFn: ({ %s, ...request }: { %s } & %s) =>\n",
				strings.Join(paramNames, ", "), strings.Join(paramTypes, "; "), requestType)
			fmt.Fprintf(buf, "\t\t\t%s(%s, request, config),\n", funcName, strings.Join(paramNames, ", "))
		} else if len(pathParams) > 1 {
			// Multiple path params only - use object
			paramTypes := []string{}
			paramNames := []string{}
			for _, p := range pathParams {
				paramTypes = append(paramTypes, p+": string")
				paramNames = append(paramNames, p)
			}
			fmt.Fprintf(buf, "\t\tmutationFn: ({ %s }: { %s }) => %s(%s, config),\n",
				strings.Join(paramNames, ", "), strings.Join(paramTypes, "; "), funcName, strings.Join(paramNames, ", "))
		} else if len(pathParams) == 1 && requestType != "" {
			// Single path param and request body
			fmt.Fprintf(buf, "\t\tmutationFn: ({ %s, ...request }: { %s: string } & %s) =>\n",
				pathParams[0], pathParams[0], requestType)
			fmt.Fprintf(buf, "\t\t\t%s(%s, request, config),\n", funcName, pathParams[0])
		} else if len(pathParams) == 1 {
			// Single path param only - keep simple
			fmt.Fprintf(buf, "\t\tmutationFn: (%s: string) => %s(%s, config),\n",
				pathParams[0], funcName, pathParams[0])
		} else if requestType != "" {
			// Only request body
			fmt.Fprintf(buf, "\t\tmutationFn: (request: %s) => %s(request, config),\n",
				requestType, funcName)
		} else {
			// No params
			fmt.Fprintf(buf, "\t\tmutationFn: () => %s(config),\n", funcName)
		}

		buf.WriteString("\t});\n\n")
	}
}
