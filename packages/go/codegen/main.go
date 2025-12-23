package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	routesFile := flag.String("routes", "", "Path to routes.go file")
	handlerDir := flag.String("handlers", "", "Path to handler directory")
	outputFile := flag.String("output", "", "Output TypeScript file path")
	typesPackage := flag.String("types", "@docix/types", "TypeScript types package")
	flag.Parse()

	serverDir := findServerDir()
	if serverDir == "" {
		fmt.Fprintln(os.Stderr, "Error: Could not find apps/server directory")
		os.Exit(1)
	}

	config := Config{
		RoutesFile:   *routesFile,
		HandlerDir:   *handlerDir,
		OutputFile:   *outputFile,
		TypesPackage: *typesPackage,
	}

	if config.RoutesFile == "" {
		config.RoutesFile = filepath.Join(serverDir, "internal/server/routes.go")
	}
	if config.HandlerDir == "" {
		config.HandlerDir = filepath.Join(serverDir, "internal/handler")
	}
	if config.OutputFile == "" {
		// Find project root and output to apps/web
		projectRoot := filepath.Dir(filepath.Dir(serverDir))
		config.OutputFile = filepath.Join(projectRoot, "apps/web/src/lib/api.generated.ts")
	}

	fmt.Println("Generating API client...")
	fmt.Printf("  Routes file: %s\n", config.RoutesFile)
	fmt.Printf("  Handler dir: %s\n", config.HandlerDir)
	fmt.Printf("  Output file: %s\n", config.OutputFile)

	routes, handlerVarToType, err := ParseRoutes(config.RoutesFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing routes: %v\n", err)
		os.Exit(1)
	}

	handlers, err := ParseHandlers(config.HandlerDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing handlers: %v\n", err)
		os.Exit(1)
	}

	result := &ParseResult{
		Routes:           routes,
		Handlers:         handlers,
		HandlerVarToType: handlerVarToType,
	}

	output := Generate(result, config)

	if err := os.MkdirAll(filepath.Dir(config.OutputFile), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating output directory: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(config.OutputFile, []byte(output), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Done!")
}

func findServerDir() string {
	// Try to find from current directory
	cwd, _ := os.Getwd()

	// Check if we're in apps/server
	if strings.HasSuffix(cwd, "apps/server") || strings.HasSuffix(cwd, "apps\\server") {
		return cwd
	}

	// Check if apps/server exists relative to cwd
	serverDir := filepath.Join(cwd, "apps/server")
	if info, err := os.Stat(serverDir); err == nil && info.IsDir() {
		return serverDir
	}

	// Walk up to find project root
	dir := cwd
	for range 5 {
		serverDir := filepath.Join(dir, "apps/server")
		if info, err := os.Stat(serverDir); err == nil && info.IsDir() {
			return serverDir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return ""
}
