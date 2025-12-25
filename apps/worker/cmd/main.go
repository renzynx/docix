package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/renzynx/docix/apps/worker/internal/config"
	"github.com/renzynx/docix/apps/worker/internal/database"
	"github.com/renzynx/docix/apps/worker/internal/handlers"
	"github.com/renzynx/docix/apps/worker/internal/processor"
	"github.com/renzynx/docix/apps/worker/internal/tasks"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/sirupsen/logrus"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})
	logger.SetLevel(logrus.InfoLevel)

	if os.Getenv("DEBUG") == "true" {
		logger.SetLevel(logrus.DebugLevel)
	}

	log := logger.WithField("service", "worker")
	log.Info("Starting image processing worker")

	cfg := config.Load()
	log.WithFields(logrus.Fields{
		"redis_addr":   cfg.RedisAddr,
		"mongo_url":    cfg.MongoURL,
		"concurrency":  cfg.Concurrency,
		"upload_dir":   cfg.UploadDir,
		"pending_dir":  cfg.PendingUploadDir,
		"webp_quality": cfg.WebPQuality,
	}).Info("Configuration loaded")

	redisClient, err := redis.GetClient()
	if err != nil {
		log.WithError(err).Fatal("Failed to connect to Redis")
	}
	defer redisClient.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		cancel()
		log.WithError(err).Fatal("Failed to ping Redis")
	}
	cancel()
	log.Info("Redis connection established")

	db, err := database.New(cfg.MongoURL)
	if err != nil {
		log.WithError(err).Fatal("Failed to connect to MongoDB")
	}
	defer db.Disconnect(context.Background())
	log.Info("MongoDB connection established")

	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.WithError(err).Fatal("Failed to create upload directory")
	}
	if err := os.MkdirAll(cfg.PendingUploadDir, 0755); err != nil {
		log.WithError(err).Fatal("Failed to create pending upload directory")
	}

	imgProcessor := processor.NewImageProcessor(cfg.WebPQuality)
	log.Info("Image processor initialized")

	imageHandler := handlers.NewImageHandler(imgProcessor, redisClient, logger)
	cleanupHandler := handlers.NewCleanupHandler(db, cfg, redisClient, logger)
	viewSyncHandler := handlers.NewViewSyncHandler(db, redisClient, logger)

	redisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	}

	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: cfg.Concurrency,
		Queues:      cfg.Queues,
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			retried, _ := asynq.GetRetryCount(ctx)
			maxRetry, _ := asynq.GetMaxRetry(ctx)
			log.WithFields(logrus.Fields{
				"task_type": task.Type(),
				"retried":   retried,
				"max_retry": maxRetry,
				"error":     err.Error(),
			}).Error("Task failed")
		}),
		Logger:   &asynqLogAdapter{logger: logger},
		LogLevel: asynq.InfoLevel,
	})

	mux := asynq.NewServeMux()
	mux.Use(loggingMiddleware(logger))
	mux.Handle(tasks.TypeImageConvert, imageHandler)
	mux.Handle(tasks.TypeImageThumbnail, imageHandler)
	mux.Handle(tasks.TypeCleanupOrphans, cleanupHandler)
	mux.Handle(tasks.TypeViewSync, viewSyncHandler)

	// Scheduler for periodic tasks (view sync every 5 minutes)
	scheduler := asynq.NewScheduler(redisOpt, &asynq.SchedulerOpts{
		Location: time.UTC,
		Logger:   &asynqLogAdapter{logger: logger},
		LogLevel: asynq.InfoLevel,
	})

	viewSyncTask := asynq.NewTask(tasks.TypeViewSync, nil)
	if _, err := scheduler.Register("@every 5m", viewSyncTask, asynq.Queue(tasks.QueueDefault)); err != nil {
		log.WithError(err).Fatal("Failed to register view sync task")
	}
	log.Info("Registered periodic view sync task (every 5 minutes)")

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Run scheduler in background
	go func() {
		if err := scheduler.Run(); err != nil {
			log.WithError(err).Error("Scheduler error")
		}
	}()

	// Run server in background
	go func() {
		log.Info("Worker is ready to process tasks")
		if err := srv.Run(mux); err != nil {
			log.WithError(err).Error("Server error")
		}
	}()

	// Wait for shutdown signal
	sig := <-sigChan
	log.WithField("signal", sig).Info("Received shutdown signal, stopping...")

	scheduler.Shutdown()
	srv.Shutdown()

	log.Info("Worker shutdown complete")
}

func loggingMiddleware(logger *logrus.Logger) func(asynq.Handler) asynq.Handler {
	return func(h asynq.Handler) asynq.Handler {
		return asynq.HandlerFunc(func(ctx context.Context, t *asynq.Task) error {
			start := time.Now()
			logger.WithFields(logrus.Fields{
				"task_type": t.Type(),
			}).Debug("Processing task")

			err := h.ProcessTask(ctx, t)

			elapsed := time.Since(start)
			if err != nil {
				logger.WithFields(logrus.Fields{
					"task_type":  t.Type(),
					"elapsed_ms": elapsed.Milliseconds(),
					"error":      err.Error(),
				}).Error("Task processing failed")
			} else {
				logger.WithFields(logrus.Fields{
					"task_type":  t.Type(),
					"elapsed_ms": elapsed.Milliseconds(),
				}).Debug("Task processing completed")
			}

			return err
		})
	}
}

type asynqLogAdapter struct {
	logger *logrus.Logger
}

func (l *asynqLogAdapter) Debug(args ...any) {
	l.logger.Debug(args...)
}

func (l *asynqLogAdapter) Info(args ...any) {
	l.logger.Info(args...)
}

func (l *asynqLogAdapter) Warn(args ...any) {
	l.logger.Warn(args...)
}

func (l *asynqLogAdapter) Error(args ...any) {
	l.logger.Error(args...)
}

func (l *asynqLogAdapter) Fatal(args ...any) {
	l.logger.Fatal(args...)
}
