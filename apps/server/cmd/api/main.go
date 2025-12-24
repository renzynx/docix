package main

import (
	"fmt"

	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/server"
	"github.com/renzynx/docix/server/internal/session"
	log "github.com/sirupsen/logrus"
)

func main() {
	log.SetReportCaller(true)

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Initialize RBAC service
	rbacService := rbac.NewService(db)

	// Initialize session store (MongoDB for now, can swap for Redis later)
	sessionStore := session.NewMongoStore(db.Sessions)

	// Create and configure server
	srv := server.New(db, rbacService, sessionStore, cfg)

	// Print banner
	printBanner(srv.Addr())

	// Run server (blocks until shutdown)
	if err := srv.Run(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func printBanner(addr string) {
	fmt.Print(`
 ________  ________  ________  ___     ___    ___ 
|\   ___ \|\   __  \|\   ____\|\  \   |\  \  /  /|
\ \  \_|\ \ \  \|\  \ \  \___|\ \  \  \ \  \/  / /
 \ \  \ \\ \ \  \\\  \ \  \    \ \  \  \ \    / / 
  \ \  \_\\ \ \  \\\  \ \  \____\ \  \  /     \/  
   \ \_______\ \_______\ \_______\ \__\/  /\   \  
    \|_______|\|_______|\|_______|\|__/__/ /\ __\ 
                                      |__|/ \|__| 
`)
	fmt.Printf("\nAPI server is running at http://%s\n\n", addr)
}
