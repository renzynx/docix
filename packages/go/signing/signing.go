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
	secret         []byte
	baseURL        string
	ttl            time.Duration
	bucketDuration time.Duration
}

func NewSigner(secret, baseURL string, ttl time.Duration) *Signer {
	return &Signer{
		secret:         []byte(secret),
		baseURL:        baseURL,
		ttl:            ttl,
		bucketDuration: ttl,
	}
}

func NewSignerWithBucket(secret, baseURL string, ttl, bucketDuration time.Duration) *Signer {
	return &Signer{
		secret:         []byte(secret),
		baseURL:        baseURL,
		ttl:            ttl,
		bucketDuration: bucketDuration,
	}
}

func NewVerifier(secret string) *Signer {
	return &Signer{
		secret: []byte(secret),
	}
}

// quantizeExpiration aligns expiration time to bucket boundaries for cache efficiency.
// All requests within the same bucket window get identical expiration times,
// enabling Cloudflare to serve a single cached copy to all users.
func (s *Signer) quantizeExpiration(targetTime time.Time) time.Time {
	if s.bucketDuration == 0 {
		return targetTime
	}

	unixTarget := targetTime.Unix()
	bucketSecs := int64(s.bucketDuration.Seconds())

	quantized := ((unixTarget + bucketSecs - 1) / bucketSecs) * bucketSecs
	return time.Unix(quantized, 0)
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
	return s.GenerateSignedURLWithBase(filename, s.baseURL, ttl)
}

func (s *Signer) GenerateSignedURLWithBase(filename, baseURL string, ttl time.Duration) string {
	if ttl == 0 {
		ttl = s.ttl
	}

	rawExpiry := time.Now().Add(ttl)
	expiresAt := s.quantizeExpiration(rawExpiry)

	ex, hm := s.SignURL(filename, expiresAt)
	return fmt.Sprintf("%s/%s?ex=%s&hm=%s", baseURL, filename, ex, hm)
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
