package server

import (
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/renzynx/docix/packages/go/signing"
	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/handler"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/settings"
	"github.com/sirupsen/logrus"
)

func SetupRoutes(r *chi.Mux, db *database.Database, rbacService *rbac.Service, settingsService *settings.Service) {
	cfg := config.Get()
	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})

	r.Use(chimiddleware.StripSlashes)
	r.Use(middleware.CORS())
	r.Use(middleware.Maintenance(settingsService))

	signer := signing.NewSigner(
		cfg.CDN.HMACSecret,
		cfg.CDN.BaseURL,
		time.Duration(cfg.CDN.URLTTLSecs)*time.Second,
	)

	authHandler := handler.NewAuthHandler(db, rbacService, settingsService)
	adminHandler := handler.NewAdminHandler(db, rbacService, settingsService)
	mangaHandler := handler.NewMangaHandler(db)
	mangaAdminHandler := handler.NewMangaAdminHandler(db, signer, settingsService)
	mangaPublicHandler := handler.NewMangaPublicHandler(db, signer, settingsService)
	uploadHandler := handler.NewUploadHandler(db, cfg, settingsService)
	bookmarkHandler := handler.NewBookmarkHandler(db)
	taskHandler := handler.NewTaskHandler(logrus.New())

	r.Route("/health", func(router chi.Router) {
		router.Get("/", handler.GetHealth)
	})

	r.Route("/auth", func(router chi.Router) {
		router.Post("/sign-up", authHandler.SignUp)
		router.Post("/sign-in", authHandler.SignIn)
		router.Post("/sign-out", authHandler.SignOut)
		router.Post("/verify-email", authHandler.VerifyEmail)

		router.Group(func(r chi.Router) {
			r.Use(middleware.OptionalAuth(db))
			r.Get("/session", authHandler.GetCurrentSession)
		})

		router.Group(func(r chi.Router) {
			r.Use(middleware.Auth(db))
			r.Patch("/update-user", authHandler.UpdateUser)
			r.Post("/change-password", authHandler.ChangePassword)
			r.Post("/request-verification", authHandler.RequestEmailVerification)
			r.Get("/sessions", authHandler.ListSessions)
			r.Delete("/sessions", authHandler.RevokeSession)
			r.Get("/permissions", adminHandler.GetUserPermissions)
		})
	})

	r.Route("/bookmarks", func(router chi.Router) {
		router.Use(middleware.Auth(db))
		router.Get("/", bookmarkHandler.ListBookmarks)
		router.Get("/{seriesId}", bookmarkHandler.GetBookmarkStatus)
		router.Post("/{seriesId}", bookmarkHandler.ToggleBookmark)
	})

	r.Route("/series", func(router chi.Router) {
		router.Post("/{id}/view", mangaHandler.IncrementSeriesView)
	})

	r.Route("/chapters", func(router chi.Router) {
		router.Post("/{id}/view", mangaHandler.IncrementChapterView)
	})

	r.Route("/manga", func(router chi.Router) {
		router.Get("/", mangaPublicHandler.ListSeries)
		router.Get("/{slug}", mangaPublicHandler.GetSeriesBySlug)
		router.Get("/{slug}/chapters/{number}", mangaPublicHandler.GetChapter)
	})

	r.Get("/tags", mangaPublicHandler.ListTags)

	r.Route("/admin", func(router chi.Router) {
		router.Use(middleware.Auth(db))
		router.Use(middleware.RequirePermission(rbacService, constants.PermAdminPanel))

		router.Get("/permissions", adminHandler.GetPermissions)
		router.Get("/stats", adminHandler.GetDashboardStats)

		router.Get("/tasks", taskHandler.GetTaskStats)

		router.Route("/upload", func(r chi.Router) {
			r.Post("/", uploadHandler.UploadFile)
			r.Post("/bulk", uploadHandler.UploadMultipleFiles)
			r.Get("/{id}/status", uploadHandler.GetUploadStatus)
			r.Delete("/cleanup", uploadHandler.CleanOrphanedFiles)
		})

		router.Route("/roles", func(r chi.Router) {
			r.Get("/", adminHandler.ListRoles)
			r.Post("/", adminHandler.CreateRole)
			r.Get("/{id}", adminHandler.GetRole)
			r.Patch("/{id}", adminHandler.UpdateRole)
			r.Delete("/{id}", adminHandler.DeleteRole)
			r.Post("/assign", adminHandler.AssignRole)
			r.Post("/remove", adminHandler.RemoveRole)
		})

		router.Route("/users", func(r chi.Router) {
			r.Use(middleware.RequirePermission(rbacService, constants.PermUserManage))
			r.Get("/", adminHandler.ListUsers)
			r.Post("/ban", adminHandler.BanUser)
			r.Post("/unban/{id}", adminHandler.UnbanUser)
		})

		router.Route("/tags", func(r chi.Router) {
			r.Use(middleware.RequirePermission(rbacService, constants.PermMangaManageTags))
			r.Get("/", mangaAdminHandler.ListTags)
			r.Post("/", mangaAdminHandler.CreateTag)
			r.Patch("/{id}", mangaAdminHandler.UpdateTag)
			r.Delete("/{id}", mangaAdminHandler.DeleteTag)
		})

		router.Route("/series", func(r chi.Router) {
			r.Get("/", mangaAdminHandler.ListSeries)
			r.Post("/", mangaAdminHandler.CreateSeries)
			r.Get("/{id}", mangaAdminHandler.GetSeries)
			r.Patch("/{id}", mangaAdminHandler.UpdateSeries)
			r.Delete("/{id}", mangaAdminHandler.DeleteSeries)
			r.Get("/{id}/chapters", mangaAdminHandler.ListChapters)
			r.Post("/{id}/chapters", mangaAdminHandler.CreateChapter)
		})

		router.Route("/chapters", func(r chi.Router) {
			r.Get("/{id}", mangaAdminHandler.GetChapter)
			r.Patch("/{id}", mangaAdminHandler.UpdateChapter)
			r.Delete("/{id}", mangaAdminHandler.DeleteChapter)
			r.Post("/{id}/pages", mangaAdminHandler.AddPages)
			r.Post("/{id}/pages/reorder", mangaAdminHandler.ReorderPages)
		})

		router.Route("/pages", func(r chi.Router) {
			r.Patch("/{id}", mangaAdminHandler.UpdatePage)
			r.Delete("/{id}", mangaAdminHandler.DeletePage)
		})

		router.Route("/settings", func(r chi.Router) {
			r.Use(middleware.RequirePermission(rbacService, constants.PermSettingsRead))
			r.Get("/", adminHandler.GetSiteSettings)
			r.Get("/system", adminHandler.GetSystemInfo)

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(rbacService, constants.PermSettingsUpdate))
				r.Put("/", adminHandler.UpdateSiteSettings)
			})

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(rbacService, constants.PermAdminMaintenance))
				r.Post("/maintenance", adminHandler.PerformMaintenanceAction)
			})
		})
	})
}
