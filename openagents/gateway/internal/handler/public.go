package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openagents/gateway/internal/model"
)

// PublicChat handles POST /api/v1/agents/:name/chat
// Authenticated via API Token
func (h *Handler) PublicChat(c *gin.Context) {
	token, agent, ok := h.authenticateAPIToken(c)
	if !ok {
		return
	}

	agentName := c.Param("name")
	if agent != nil && agent.Name != agentName {
		c.JSON(http.StatusForbidden, gin.H{"error": "token not authorized for this agent"})
		return
	}

	// Look up agent
	var agentModel model.Agent
	if err := h.db.Where("name = ?", agentName).First(&agentModel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var req struct {
		Message  string `json:"message" binding:"required"`
		ThreadID string `json:"thread_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	env := "prod"
	if agentModel.Status == "dev" {
		env = "dev"
	}

	// Create or reuse session
	sessionID := ""
	if req.ThreadID != "" {
		var mapping model.ThreadMapping
		if err := h.db.Where("thread_id = ?", req.ThreadID).First(&mapping).Error; err == nil {
			sessionID = mapping.SessionID
		}
	}

	if sessionID == "" {
		// Create new session
		resp, err := h.opencodeProxy.Request("POST", agentName, env, "/session", bytes.NewReader([]byte("{}")))
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to create session"})
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var sessionResp struct {
			ID string `json:"id"`
		}
		json.Unmarshal(body, &sessionResp)
		sessionID = sessionResp.ID

		// Store mapping
		mapping := model.ThreadMapping{
			ID:        uuid.New(),
			UserID:    token.UserID,
			AgentID:   agentModel.ID,
			ThreadID:  uuid.New().String(),
			SessionID: sessionID,
			Env:       env,
		}
		h.db.Create(&mapping)
		req.ThreadID = mapping.ThreadID
	}

	// Send message
	msgBody, _ := json.Marshal(map[string]interface{}{
		"parts": []map[string]interface{}{
			{"type": "text", "text": req.Message},
		},
	})
	msgPath := fmt.Sprintf("/session/%s/message", sessionID)
	resp, err := h.opencodeProxy.Request("POST", agentName, env, msgPath, bytes.NewReader(msgBody))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to send message"})
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	// Record usage
	usage := model.UsageRecord{
		ID:        uuid.New(),
		AgentID:   agentModel.ID,
		UserID:    &token.UserID,
		SessionID: sessionID,
	}
	h.db.Create(&usage)

	c.JSON(http.StatusOK, gin.H{
		"thread_id": req.ThreadID,
		"response":  json.RawMessage(body),
	})
}

// PublicChatStream handles GET /api/v1/agents/:name/chat/stream
func (h *Handler) PublicChatStream(c *gin.Context) {
	_, agent, ok := h.authenticateAPIToken(c)
	if !ok {
		return
	}

	agentName := c.Param("name")
	if agent != nil && agent.Name != agentName {
		c.JSON(http.StatusForbidden, gin.H{"error": "token not authorized for this agent"})
		return
	}

	threadID := c.Query("thread_id")
	if threadID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "thread_id required"})
		return
	}

	var mapping model.ThreadMapping
	if err := h.db.Where("thread_id = ?", threadID).Preload("Agent").First(&mapping).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "thread not found"})
		return
	}

	path := fmt.Sprintf("/event?sessionID=%s", mapping.SessionID)
	h.opencodeProxy.ForwardSSE(c, mapping.Agent.Name, mapping.Env, path)
}

func (h *Handler) authenticateAPIToken(c *gin.Context) (*model.APIToken, *model.Agent, bool) {
	tokenStr := ""

	// Check X-API-Token header
	if t := c.GetHeader("X-API-Token"); t != "" {
		tokenStr = t
	} else if auth := c.GetHeader("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		tokenStr = strings.TrimPrefix(auth, "Bearer ")
	}

	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "API token required"})
		return nil, nil, false
	}

	token, err := h.ValidateAPIToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return nil, nil, false
	}

	return token, token.Agent, true
}
