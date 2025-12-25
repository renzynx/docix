package signing

import (
	"strings"
	"testing"
	"time"
)

func TestQuantizeExpiration(t *testing.T) {
	secret := "test-secret"
	baseURL := "https://cdn.example.com"
	ttl := 1 * time.Hour
	bucket := 6 * time.Hour

	signer := NewSignerWithBucket(secret, baseURL, ttl, bucket)

	tests := []struct {
		name     string
		input    time.Time
		expected time.Time
	}{
		{
			name:     "aligns to next 6-hour boundary",
			input:    time.Unix(3600, 0),  // 1 hour past epoch
			expected: time.Unix(21600, 0), // 6 hours (next boundary)
		},
		{
			name:     "exact boundary stays at next boundary",
			input:    time.Unix(21600, 0), // exactly 6 hours
			expected: time.Unix(21600, 0), // stays at 6 hours
		},
		{
			name:     "just past boundary goes to next",
			input:    time.Unix(21601, 0), // 1 second past 6 hours
			expected: time.Unix(43200, 0), // 12 hours (next boundary)
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := signer.quantizeExpiration(tc.input)
			if !result.Equal(tc.expected) {
				t.Errorf("quantizeExpiration(%v) = %v, want %v", tc.input, result, tc.expected)
			}
		})
	}
}

func TestQuantizationProducesSameURLs(t *testing.T) {
	secret := "test-secret"
	baseURL := "https://cdn.example.com"
	ttl := 1 * time.Hour
	bucket := 6 * time.Hour

	signer := NewSignerWithBucket(secret, baseURL, ttl, bucket)

	// Simulate two users requesting at different times within the same bucket
	now := time.Now()
	bucketSecs := int64(bucket.Seconds())
	currentBucketStart := (now.Unix() / bucketSecs) * bucketSecs
	nextBoundary := currentBucketStart + bucketSecs

	// Both times are within the same bucket window (before next boundary - ttl)
	safeWindowStart := time.Unix(nextBoundary-int64(ttl.Seconds())-3600, 0)

	time1 := safeWindowStart
	time2 := safeWindowStart.Add(30 * time.Minute)

	expiry1 := signer.quantizeExpiration(time1.Add(ttl))
	expiry2 := signer.quantizeExpiration(time2.Add(ttl))

	if !expiry1.Equal(expiry2) {
		t.Errorf("Expected same quantized expiry for requests in same bucket window: %v vs %v", expiry1, expiry2)
	}
}

func TestNewSignerDefaultsBucketToTTL(t *testing.T) {
	secret := "test-secret"
	baseURL := "https://cdn.example.com"
	ttl := 2 * time.Hour

	signer := NewSigner(secret, baseURL, ttl)

	if signer.bucketDuration != ttl {
		t.Errorf("Expected bucketDuration to default to ttl (%v), got %v", ttl, signer.bucketDuration)
	}
}

func TestSignAndVerify(t *testing.T) {
	secret := "test-secret"
	baseURL := "https://cdn.example.com"
	ttl := 1 * time.Hour

	signer := NewSigner(secret, baseURL, ttl)
	verifier := NewVerifier(secret)

	url := signer.GenerateSignedURL("manga/123/cover.jpg")

	// Extract parameters from URL
	parts := strings.Split(url, "?")
	if len(parts) != 2 {
		t.Fatalf("Expected URL with query params, got: %s", url)
	}

	params := strings.Split(parts[1], "&")
	var ex, hm string
	for _, p := range params {
		kv := strings.Split(p, "=")
		if kv[0] == "ex" {
			ex = kv[1]
		} else if kv[0] == "hm" {
			hm = kv[1]
		}
	}

	filename := strings.TrimPrefix(parts[0], baseURL+"/")
	valid, err := verifier.VerifyURL(filename, ex, hm)
	if err != nil {
		t.Errorf("Verification failed: %v", err)
	}
	if !valid {
		t.Error("Expected URL to be valid")
	}
}

func TestVerifyExpiredURL(t *testing.T) {
	secret := "test-secret"
	signer := NewSigner(secret, "https://cdn.example.com", 1*time.Hour)
	verifier := NewVerifier(secret)

	// Create a URL that expired in the past
	pastTime := time.Now().Add(-1 * time.Hour)
	ex, hm := signer.SignURL("test.jpg", pastTime)

	valid, err := verifier.VerifyURL("test.jpg", ex, hm)
	if valid {
		t.Error("Expected expired URL to be invalid")
	}
	if err == nil || !strings.Contains(err.Error(), "expired") {
		t.Errorf("Expected expiration error, got: %v", err)
	}
}

func TestVerifyTamperedSignature(t *testing.T) {
	secret := "test-secret"
	signer := NewSigner(secret, "https://cdn.example.com", 1*time.Hour)
	verifier := NewVerifier(secret)

	futureTime := time.Now().Add(1 * time.Hour)
	ex, _ := signer.SignURL("test.jpg", futureTime)

	valid, err := verifier.VerifyURL("test.jpg", ex, "tampered-signature")
	if valid {
		t.Error("Expected tampered URL to be invalid")
	}
	if err == nil || !strings.Contains(err.Error(), "invalid signature") {
		t.Errorf("Expected signature error, got: %v", err)
	}
}

func TestExpirationTime(t *testing.T) {
	expected := time.Unix(1700000000, 0)
	ex := "6553f100" // hex representation of 1700000000

	result, err := ExpirationTime(ex)
	if err != nil {
		t.Fatalf("ExpirationTime failed: %v", err)
	}

	if !result.Equal(expected) {
		t.Errorf("ExpirationTime(%s) = %v, want %v", ex, result, expected)
	}
}

func TestExpirationTimeInvalidFormat(t *testing.T) {
	_, err := ExpirationTime("not-hex")
	if err == nil {
		t.Error("Expected error for invalid hex format")
	}
}
