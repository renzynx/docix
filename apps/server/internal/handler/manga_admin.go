package handler

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/renzynx/docix/packages/go/signing"
	"github.com/renzynx/docix/server/internal/database"
)

// Methods are split across multiple files:
//   - manga_admin_tags.go    - Tag CRUD
//   - manga_admin_series.go  - Series CRUD
//   - manga_admin_chapters.go - Chapter CRUD
//   - manga_admin_pages.go   - Page CRUD
type MangaAdminHandler struct {
	DB     *database.Database
	Signer *signing.Signer
}

func NewMangaAdminHandler(db *database.Database, signer *signing.Signer) *MangaAdminHandler {
	return &MangaAdminHandler{DB: db, Signer: signer}
}

// signCoverImage generates a signed URL for a cover image filename.
// Returns empty string if filename is empty.
func (h *MangaAdminHandler) signCoverImage(filename string) string {
	if filename == "" {
		return ""
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
