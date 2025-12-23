package response

import (
	"encoding/json"
	"net/http"

	"github.com/renzynx/docix/server/internal/models"
	log "github.com/sirupsen/logrus"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Error("Failed to encode response: ", err)
	}
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, models.ErrorResponse{
		Error:   http.StatusText(status),
		Message: message,
	})
}

func ValidationError(w http.ResponseWriter, status int, errors any) {
	JSON(w, status, map[string]any{
		"error":   "Validation Error",
		"message": "One or more fields failed validation",
		"errors":  errors,
	})
}
