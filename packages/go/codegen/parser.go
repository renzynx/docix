package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func ParseRoutes(routesFile string) ([]Route, map[string]string, error) {
	content, err := os.ReadFile(routesFile)
	if err != nil {
		return nil, nil, err
	}

	var routes []Route
	handlerVarToType := make(map[string]string)

	lines := strings.Split(string(content), "\n")

	var basePaths []string
	var currentAuth bool
	var authStack []bool
	var currentPerms []string
	var permStack [][]string

	// Regex patterns
	routePattern := regexp.MustCompile(`\.Route\s*\(\s*"([^"]+)"\s*,\s*func`)
	groupPattern := regexp.MustCompile(`\.Group\s*\(\s*func`)
	methodPattern := regexp.MustCompile(`\.(Get|Post|Put|Patch|Delete)\s*\(\s*"([^"]+)"\s*,\s*(\w+)\.(\w+)\s*\)`)
	authPattern := regexp.MustCompile(`middleware\.Auth\(`)
	permPattern := regexp.MustCompile(`middleware\.RequirePermission\s*\(\s*\w+\s*,\s*constants\.(\w+)\s*\)`)
	handlerPattern := regexp.MustCompile(`(\w+)\s*:?=\s*handler\.New(\w+)\(`)
	closePattern := regexp.MustCompile(`^\s*\}\)`)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if matches := handlerPattern.FindStringSubmatch(trimmed); matches != nil {
			varName := matches[1]
			typeName := matches[2]
			handlerVarToType[varName] = typeName
			continue
		}

		if matches := routePattern.FindStringSubmatch(trimmed); matches != nil {
			basePaths = append(basePaths, matches[1])
			authStack = append(authStack, currentAuth)
			permStack = append(permStack, append([]string{}, currentPerms...))
			continue
		}

		// Match router groups (no path change)
		if groupPattern.MatchString(trimmed) {
			basePaths = append(basePaths, "")
			authStack = append(authStack, currentAuth)
			permStack = append(permStack, append([]string{}, currentPerms...))
			continue
		}

		if authPattern.MatchString(trimmed) {
			currentAuth = true
			continue
		}

		if matches := permPattern.FindStringSubmatch(trimmed); matches != nil {
			currentPerms = append(currentPerms, matches[1])
			continue
		}

		if matches := methodPattern.FindStringSubmatch(trimmed); matches != nil {
			method := strings.ToUpper(matches[1])
			path := matches[2]
			handlerVar := matches[3]
			handlerFunc := matches[4]

			fullPath := strings.Join(basePaths, "") + path
			fullPath = strings.TrimSuffix(fullPath, "/")
			if fullPath == "" {
				fullPath = "/"
			}

			routes = append(routes, Route{
				Method:       method,
				Path:         fullPath,
				HandlerVar:   handlerVar,
				HandlerFunc:  handlerFunc,
				RequiresAuth: currentAuth,
				Permissions:  append([]string{}, currentPerms...),
			})
			continue
		}

		if closePattern.MatchString(trimmed) && len(basePaths) > 0 {
			basePaths = basePaths[:len(basePaths)-1]
			if len(authStack) > 0 {
				currentAuth = authStack[len(authStack)-1]
				authStack = authStack[:len(authStack)-1]
			}
			if len(permStack) > 0 {
				currentPerms = permStack[len(permStack)-1]
				permStack = permStack[:len(permStack)-1]
			}
		}
	}

	return routes, handlerVarToType, nil
}

func ParseHandlers(handlerDir string) (map[string]Handler, error) {
	handlers := make(map[string]Handler)

	files, err := os.ReadDir(handlerDir)
	if err != nil {
		return nil, err
	}

	fset := token.NewFileSet()

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".go") {
			continue
		}

		filePath := filepath.Join(handlerDir, file.Name())
		node, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
		if err != nil {
			continue // Skip files that can't be parsed
		}

		// Read file content for regex-based parsing of function bodies
		content, _ := os.ReadFile(filePath)
		contentStr := string(content)

		ast.Inspect(node, func(n ast.Node) bool {
			fn, ok := n.(*ast.FuncDecl)
			if !ok || fn.Recv == nil || len(fn.Recv.List) == 0 {
				return true
			}

			if fn.Type.Params == nil || len(fn.Type.Params.List) < 2 {
				return true
			}

			var receiverType string
			switch t := fn.Recv.List[0].Type.(type) {
			case *ast.StarExpr:
				if ident, ok := t.X.(*ast.Ident); ok {
					receiverType = ident.Name
				}
			case *ast.Ident:
				receiverType = t.Name
			}

			if receiverType == "" {
				return true
			}

			// Create handler key: ReceiverType.FuncName
			handlerKey := receiverType + "." + fn.Name.Name

			// Extract function body for analysis
			start := fset.Position(fn.Body.Pos()).Offset
			end := min(fset.Position(fn.Body.End()).Offset, len(contentStr))
			funcBody := contentStr[start:end]

			handler := Handler{
				ReceiverType: receiverType,
				Name:         fn.Name.Name,
				PathParams:   parsePathParams(funcBody),
				QueryParams:  parseQueryParams(funcBody),
				RequestType:  parseRequestType(funcBody),
			}

			// Parse response type from the actual Go code
			handler.ResponseType, handler.ResponseArr = parseResponseType(funcBody)

			handlers[handlerKey] = handler
			return true
		})
	}

	return handlers, nil
}

// parsePathParams extracts path parameters from function body.
func parsePathParams(funcBody string) []string {
	var params []string
	seen := make(map[string]bool)

	// Match chi.URLParam(r, "param")
	chiPattern := regexp.MustCompile(`chi\.URLParam\s*\(\s*r\s*,\s*"(\w+)"\s*\)`)
	for _, match := range chiPattern.FindAllStringSubmatch(funcBody, -1) {
		if !seen[match[1]] {
			params = append(params, match[1])
			seen[match[1]] = true
		}
	}

	// Match r.PathValue("param")
	pathValuePattern := regexp.MustCompile(`r\.PathValue\s*\(\s*"(\w+)"\s*\)`)
	for _, match := range pathValuePattern.FindAllStringSubmatch(funcBody, -1) {
		if !seen[match[1]] {
			params = append(params, match[1])
			seen[match[1]] = true
		}
	}

	return params
}

// parseQueryParams extracts query parameters from function body.
func parseQueryParams(funcBody string) []QueryParam {
	var params []QueryParam
	seen := make(map[string]bool)

	// Match strconv.Atoi(r.URL.Query().Get("param")) for number types
	numberPattern := regexp.MustCompile(`strconv\.Atoi\s*\(\s*r\.URL\.Query\(\)\.Get\s*\(\s*"(\w+)"\s*\)\s*\)`)
	for _, match := range numberPattern.FindAllStringSubmatch(funcBody, -1) {
		if !seen[match[1]] {
			params = append(params, QueryParam{Name: match[1], Type: "number"})
			seen[match[1]] = true
		}
	}

	// Match r.URL.Query().Get("param") for string types (that aren't wrapped in strconv.Atoi)
	stringPattern := regexp.MustCompile(`r\.URL\.Query\(\)\.Get\s*\(\s*"(\w+)"\s*\)`)
	for _, match := range stringPattern.FindAllStringSubmatch(funcBody, -1) {
		if !seen[match[1]] {
			params = append(params, QueryParam{Name: match[1], Type: "string"})
			seen[match[1]] = true
		}
	}

	return params
}

// parseRequestType extracts the request type from function body.
func parseRequestType(funcBody string) string {
	pattern := regexp.MustCompile(`validator\.HandleRequest\[models\.(\w+)\]`)
	if match := pattern.FindStringSubmatch(funcBody); match != nil {
		return match[1]
	}
	return ""
}

// parseResponseType extracts the response type from function body by analyzing
// the actual Go types used in response.JSON calls.
func parseResponseType(funcBody string) (string, bool) {
	// Priority 1: Look for typed variable declarations like "resp := models.Type{...}"
	// This catches: resp := models.PaginatedResponse[models.Series]{...}
	respDeclPattern := regexp.MustCompile(`resp\s*:=\s*models\.([A-Za-z]+)(?:\[models\.([A-Za-z]+)\])?\s*\{`)
	if match := respDeclPattern.FindStringSubmatch(funcBody); match != nil {
		if match[2] != "" {
			return match[1] + "<" + match[2] + ">", false
		}
		return match[1], false
	}

	// Priority 2: Look for response.JSON with models.Type{} inline
	// This catches: response.JSON(w, http.StatusOK, models.AuthResponse{...})
	inlineModelPattern := regexp.MustCompile(`response\.JSON\s*\(\s*w\s*,\s*http\.Status(?:OK|Created)\s*,\s*models\.([A-Za-z]+)\{`)
	if match := inlineModelPattern.FindStringSubmatch(funcBody); match != nil {
		return match[1], false
	}

	// Priority 3: Look for response.JSON calls and trace back variable types
	jsonPattern := regexp.MustCompile(`response\.JSON\s*\(\s*w\s*,\s*http\.Status(?:OK|Created)\s*,\s*(\w+)\s*\)`)
	matches := jsonPattern.FindAllStringSubmatch(funcBody, -1)

	if len(matches) == 0 {
		return "MessageResponse", false
	}

	// Get the last successful response variable name
	lastVarName := strings.TrimSpace(matches[len(matches)-1][1])

	// Check if it's a map[string]string message response
	if lastVarName == "map[string]string" || strings.Contains(funcBody, `map[string]string{"message"`) {
		return "MessageResponse", false
	}

	// Look for the variable declaration to find its type
	// Pattern: varName := models.Type{...} or var varName []models.Type
	varDeclPattern := regexp.MustCompile(lastVarName + `\s*:=\s*models\.([A-Za-z]+)(?:\[models\.([A-Za-z]+)\])?\s*\{`)
	if match := varDeclPattern.FindStringSubmatch(funcBody); match != nil {
		if match[2] != "" {
			return match[1] + "<" + match[2] + ">", false
		}
		return match[1], false
	}

	// Pattern: var varName []models.Type (slice declaration)
	slicePattern := regexp.MustCompile(`var\s+` + lastVarName + `\s+\[\]models\.([A-Za-z]+)`)
	if match := slicePattern.FindStringSubmatch(funcBody); match != nil {
		return match[1], true
	}

	// Pattern: varName := []models.Type{} (slice literal)
	sliceLiteralPattern := regexp.MustCompile(lastVarName + `\s*:=\s*\[\]models\.([A-Za-z]+)\s*\{`)
	if match := sliceLiteralPattern.FindStringSubmatch(funcBody); match != nil {
		return match[1], true
	}

	// Check for common variable names that indicate types
	typeMap := map[string]struct {
		typ   string
		isArr bool
	}{
		"sessions": {"SessionListItem", true},
		"users":    {"User", true},
		"roles":    {"Role", true},
		"role":     {"Role", false},
		"user":     {"User", false},
		"tags":     {"Tag", true},
		"tag":      {"Tag", false},
		"series":   {"Series", false},
		"chapters": {"Chapter", true},
		"chapter":  {"Chapter", false},
		"pages":    {"Page", true},
		"page":     {"Page", false},
	}

	if info, ok := typeMap[lastVarName]; ok {
		return info.typ, info.isArr
	}

	// Default to MessageResponse if we can't determine
	return "MessageResponse", false
}
