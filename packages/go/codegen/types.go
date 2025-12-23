package main

// Route represents a parsed HTTP route.
type Route struct {
	Method       string
	Path         string
	HandlerVar   string // e.g., "mangaPublicHandler"
	HandlerFunc  string // e.g., "ListSeries"
	RequiresAuth bool
	Permissions  []string
}

// QueryParam represents a parsed query parameter.
type QueryParam struct {
	Name string // e.g., "page"
	Type string // "number" or "string"
}

// Handler represents a parsed handler function.
type Handler struct {
	ReceiverType string       // e.g., "MangaPublicHandler"
	Name         string       // e.g., "ListSeries"
	RequestType  string       // e.g., "CreateSeriesRequest"
	ResponseType string       // e.g., "Series"
	ResponseArr  bool         // true if response is an array
	PathParams   []string     // e.g., ["id", "slug"]
	QueryParams  []QueryParam // e.g., [{Name: "page", Type: "number"}]
}

// Config holds generation configuration.
type Config struct {
	RoutesFile   string
	HandlerDir   string
	OutputFile   string
	TypesPackage string
}

// ParseResult holds the combined results of parsing routes and handlers.
type ParseResult struct {
	Routes           []Route
	Handlers         map[string]Handler
	HandlerVarToType map[string]string
}
