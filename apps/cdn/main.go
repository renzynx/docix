package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/docix/cdn/internal/config"
	"github.com/docix/cdn/internal/handler"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	cfg := config.Load()

	info, err := os.Stat(cfg.UploadDir)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Upload directory %s does not exist, creating...", cfg.UploadDir)
			if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
				log.Fatalf("Failed to create upload directory: %v", err)
			}
		} else {
			log.Fatalf("Failed to stat upload directory %s: %v", cfg.UploadDir, err)
		}
	} else if !info.IsDir() {
		log.Fatalf("Upload path %s exists but is not a directory", cfg.UploadDir)
	}

	h := handler.New(cfg)

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(middleware.Compress(5))

	r.Get("/health", h.Health)
	r.Options("/*", h.CORS)
	r.Get("/*", h.ServeImage)

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("🖼️  Docix CDN starting on http://localhost:%s", cfg.Port)
		log.Printf("   Upload dir: %s", cfg.UploadDir)
		log.Printf("   URL TTL: %d seconds", cfg.URLTTLSecs)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-done
	log.Println("Shutting down CDN server...")
}
