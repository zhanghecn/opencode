package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListModels(c *gin.Context) {
	models := []map[string]interface{}{
		{"id": "anthropic/claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
		{"id": "anthropic/claude-opus-4-20250514", "name": "Claude Opus 4"},
		{"id": "openai/gpt-4o", "name": "GPT-4o"},
	}
	c.JSON(http.StatusOK, models)
}
