package signing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"
)

type Signer struct {
	secret  []byte
	baseURL string
	ttl     time.Duration
}

func NewSigner(secret, baseURL string, ttl time.Duration) *Signer {
	return &Signer{
		secret:  []byte(secret),
		baseURL: baseURL,
		ttl:     ttl,
	}
}

func NewVerifier(secret string) *Signer {
	return &Signer{
		secret: []byte(secret),
	}
}

func (s *Signer) SignURL(filename string, expiresAt time.Time) (ex string, hm string) {
	expiresUnix := expiresAt.Unix()
	ex = fmt.Sprintf("%x", expiresUnix)

	hm = s.generateHMAC(filename, ex)

	return ex, hm
}

func (s *Signer) GenerateSignedURL(filename string) string {
	return s.GenerateSignedURLWithTTL(filename, s.ttl)
}

func (s *Signer) GenerateSignedURLWithTTL(filename string, ttl time.Duration) string {
	expiresAt := time.Now().Add(ttl)
	ex, hm := s.SignURL(filename, expiresAt)
	return fmt.Sprintf("%s/%s?ex=%s&hm=%s", s.baseURL, filename, ex, hm)
}

func (s *Signer) VerifyURL(filename, ex, hm string) (bool, error) {
	expiresUnix, err := strconv.ParseInt(ex, 16, 64)
	if err != nil {
		return false, fmt.Errorf("invalid expiration format")
	}

	expiresAt := time.Unix(expiresUnix, 0)
	if time.Now().After(expiresAt) {
		return false, fmt.Errorf("URL has expired")
	}

	expectedHM := s.generateHMAC(filename, ex)
	if !hmac.Equal([]byte(hm), []byte(expectedHM)) {
		return false, fmt.Errorf("invalid signature")
	}

	return true, nil
}

func (s *Signer) generateHMAC(filename, ex string) string {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(filename + ex))
	return hex.EncodeToString(h.Sum(nil))
}

func ExpirationTime(ex string) (time.Time, error) {
	expiresUnix, err := strconv.ParseInt(ex, 16, 64)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid expiration format")
	}
	return time.Unix(expiresUnix, 0), nil
}
