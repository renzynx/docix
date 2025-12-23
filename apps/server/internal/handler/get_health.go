package handler

import (
	"encoding/json"
	"net/http"

	log "github.com/sirupsen/logrus"
)

func GetHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	err := json.NewEncoder(w).Encode(map[string]any{
		"message": "OK",
		"code":    200,
	})
	if err != nil {
		log.Error(err)

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)

		return
	}
}
