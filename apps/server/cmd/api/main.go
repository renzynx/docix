package main

import (
	"fmt"

	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/server"
	log "github.com/sirupsen/logrus"
)

func main() {
	log.SetReportCaller(true)

	cfg := config.Load()

	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	rbacService := rbac.NewService(db)
	srv := server.New(db, rbacService, cfg)

	printBanner(srv.Addr())

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
	fmt.Printf("\nAPI server is running at http://%s\n", addr)
}
