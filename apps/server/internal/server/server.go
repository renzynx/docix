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
	log "github.com/sirupsen/logrus"
)

type Server struct {
	httpServer  *http.Server
	router      *chi.Mux
	db          *database.Database
	rbacService *rbac.Service
	cfg         *config.Config
}

func New(db *database.Database, rbacService *rbac.Service, cfg *config.Config) *Server {
	router := chi.NewRouter()

	s := &Server{
		router:      router,
		db:          db,
		rbacService: rbacService,
		cfg:         cfg,
	}

	SetupRoutes(router, db, rbacService)

	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

func (s *Server) Run() error {
	serverErrors := make(chan error, 1)

	go func() {
		log.Infof("API server starting on %s", s.httpServer.Addr)
		serverErrors <- s.httpServer.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

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

func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		log.Errorf("HTTP server shutdown error: %v", err)
	}

	if err := s.db.Disconnect(ctx); err != nil {
		log.Errorf("Database disconnect error: %v", err)
		return err
	}

	log.Info("Server shutdown complete")
	return nil
}

func (s *Server) Addr() string {
	return s.httpServer.Addr
}
