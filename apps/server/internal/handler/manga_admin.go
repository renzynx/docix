package handler

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/renzynx/docix/packages/go/signing"
	"github.com/renzynx/docix/server/internal/database"
)

type MangaAdminHandler struct {
	DB     *database.Database
	Signer *signing.Signer
}

func NewMangaAdminHandler(db *database.Database, signer *signing.Signer) *MangaAdminHandler {
	return &MangaAdminHandler{DB: db, Signer: signer}
}

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
