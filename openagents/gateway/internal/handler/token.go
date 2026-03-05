package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openagents/gateway/internal/model"
)

type CreateTokenRequest struct {
	Name      string     `json:"name" binding:"required"`
	AgentID   *uuid.UUID `json:"agent_id"`
	ExpiresIn *int       `json:"expires_in_days"` // days until expiry, nil = never
}

func (h *Handler) ListTokens(c *gin.Context) {
	userID := getUserID(c)
	var tokens []model.APIToken
	if err := h.db.Where("user_id = ? AND revoked_at IS NULL", userID).
		Preload("Agent").Find(&tokens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tokens"})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) CreateToken(c *gin.Context) {
	var req CreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := getUserID(c)

	// Generate random token
	rawToken := make([]byte, 32)
	if _, err := rand.Read(rawToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	tokenStr := fmt.Sprintf("oa_%s", hex.EncodeToString(rawToken))

	// Store hash
	hash := sha256.Sum256([]byte(tokenStr))
	tokenHash := hex.EncodeToString(hash[:])

	var expiresAt *time.Time
	if req.ExpiresIn != nil {
		t := time.Now().Add(time.Duration(*req.ExpiresIn) * 24 * time.Hour)
		expiresAt = &t
	}

	token := model.APIToken{
		ID:        uuid.New(),
		AgentID:   req.AgentID,
		UserID:    userID,
		TokenHash: tokenHash,
		Name:      req.Name,
		ExpiresAt: expiresAt,
	}

	if err := h.db.Create(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create token"})
		return
	}

	// Return the raw token only once (it's never stored)
	c.JSON(http.StatusCreated, gin.H{
		"id":         token.ID,
		"token":      tokenStr,
		"name":       token.Name,
		"agent_id":   token.AgentID,
		"expires_at": token.ExpiresAt,
		"created_at": token.CreatedAt,
	})
}

func (h *Handler) DeleteToken(c *gin.Context) {
	tokenID := c.Param("id")
	userID := getUserID(c)

	now := time.Now()
	result := h.db.Model(&model.APIToken{}).
		Where("id = ? AND user_id = ?", tokenID, userID).
		Update("revoked_at", &now)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "token not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "token revoked"})
}

// ValidateAPIToken checks an API token and returns the associated user/agent info
func (h *Handler) ValidateAPIToken(tokenStr string) (*model.APIToken, error) {
	hash := sha256.Sum256([]byte(tokenStr))
	tokenHash := hex.EncodeToString(hash[:])

	var token model.APIToken
	if err := h.db.Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Preload("Agent").Preload("User").First(&token).Error; err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	if token.ExpiresAt != nil && token.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token expired")
	}

	return &token, nil
}
