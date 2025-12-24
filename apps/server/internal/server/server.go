package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/session"
	log "github.com/sirupsen/logrus"
)

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	httpServer   *http.Server
	router       *chi.Mux
	db           *database.Database
	rbacService  *rbac.Service
	sessionStore session.Store
	cfg          *config.Config
}

// New creates a new Server instance with all dependencies.
func New(db *database.Database, rbacService *rbac.Service, sessionStore session.Store, cfg *config.Config) *Server {
	router := chi.NewRouter()

	s := &Server{
		router:       router,
		db:           db,
		rbacService:  rbacService,
		sessionStore: sessionStore,
		cfg:          cfg,
	}

	// Setup routes
	SetupRoutes(router, db, rbacService, sessionStore)

	// Create HTTP server
	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

// Run starts the server and blocks until shutdown signal is received.
func (s *Server) Run() error {
	// Channel to listen for errors from ListenAndServe
	serverErrors := make(chan error, 1)

	// Start the server
	go func() {
		log.Infof("API server starting on %s", s.httpServer.Addr)
		serverErrors <- s.httpServer.ListenAndServe()
	}()

	// Channel to listen for interrupt/terminate signals
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	// Block until we receive a signal or an error
	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-shutdown:
		log.Infof("Received signal %v, initiating graceful shutdown...", sig)

		if err := s.Shutdown(); err != nil {
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
	}

	return nil
}

// Shutdown gracefully shuts down the server.
func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := s.httpServer.Shutdown(ctx); err != nil {
		log.Errorf("HTTP server shutdown error: %v", err)
	}

	// Disconnect database
	if err := s.db.Disconnect(ctx); err != nil {
		log.Errorf("Database disconnect error: %v", err)
		return err
	}

	log.Info("Server shutdown complete")
	return nil
}

// Addr returns the server address.
func (s *Server) Addr() string {
	return s.httpServer.Addr
}
