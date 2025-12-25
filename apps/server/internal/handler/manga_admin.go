package handler

import (
	"context"
	"regexp"
	"strings"
	"unicode"

	"github.com/renzynx/docix/packages/go/signing"
	"github.com/renzynx/docix/server/internal/database"
)

// CDNAdminSettingsProvider defines the interface for CDN settings in admin handler
type CDNAdminSettingsProvider interface {
	IsCDNEnabled(ctx context.Context) bool
	GetCDNBaseURL(ctx context.Context) string
}

type MangaAdminHandler struct {
	DB       *database.Database
	Signer   *signing.Signer
	Settings CDNAdminSettingsProvider
}

func NewMangaAdminHandler(db *database.Database, signer *signing.Signer, settings CDNAdminSettingsProvider) *MangaAdminHandler {
	return &MangaAdminHandler{DB: db, Signer: signer, Settings: settings}
}

func (h *MangaAdminHandler) signCoverImage(ctx context.Context, filename string) string {
	if filename == "" {
		return ""
	}
	// Check if CDN is enabled in settings
	if h.Settings != nil && !h.Settings.IsCDNEnabled(ctx) {
		return filename // Return raw filename if CDN disabled
	}
	return h.Signer.GenerateSignedURL(filename)
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '-' {
			return r
		}
		return -1
	}, s)
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, "-")
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}
