package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openagents/gateway/internal/model"
)

func (h *Handler) CreateThread(c *gin.Context) {
	agentName := c.Query("agent")
	if agentName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent parameter required"})
		return
	}

	var agent model.Agent
	if err := h.db.Where("name = ?", agentName).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	env := c.DefaultQuery("env", "prod")

	// Create session in opencode
	resp, err := h.opencodeProxy.Request("POST", agentName, env, "/session", bytes.NewReader([]byte("{}")))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to create session in opencode"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": "opencode session creation failed"})
		return
	}

	// Parse opencode response to get session ID
	var sessionResp struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &sessionResp); err != nil || sessionResp.ID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid session response from opencode"})
		return
	}

	// Create thread mapping
	userID := getUserID(c)
	threadID := uuid.New().String()
	mapping := model.ThreadMapping{
		ID:        uuid.New(),
		UserID:    userID,
		AgentID:   agent.ID,
		ThreadID:  threadID,
		SessionID: sessionResp.ID,
		Env:       env,
	}

	if err := h.db.Create(&mapping).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store thread mapping"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"thread_id":  threadID,
		"session_id": sessionResp.ID,
		"agent":      agentName,
		"env":        env,
	})
}

func (h *Handler) ListThreads(c *gin.Context) {
	userID := getUserID(c)
	var mappings []model.ThreadMapping
	if err := h.db.Where("user_id = ?", userID).Preload("Agent").Find(&mappings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list threads"})
		return
	}
	c.JSON(http.StatusOK, mappings)
}

func (h *Handler) getThreadMapping(c *gin.Context) (*model.ThreadMapping, bool) {
	threadID := c.Param("id")
	var mapping model.ThreadMapping
	if err := h.db.Where("thread_id = ?", threadID).Preload("Agent").First(&mapping).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "thread not found"})
		return nil, false
	}
	return &mapping, true
}

func (h *Handler) GetThread(c *gin.Context) {
	mapping, ok := h.getThreadMapping(c)
	if !ok {
		return
	}
	path := fmt.Sprintf("/session/%s", mapping.SessionID)
	h.opencodeProxy.Forward(c, mapping.Agent.Name, mapping.Env, path)
}

func (h *Handler) DeleteThread(c *gin.Context) {
	mapping, ok := h.getThreadMapping(c)
	if !ok {
		return
	}
	path := fmt.Sprintf("/session/%s", mapping.SessionID)
	h.opencodeProxy.Forward(c, mapping.Agent.Name, mapping.Env, path)
	h.db.Delete(&mapping)
}

func (h *Handler) SendMessage(c *gin.Context) {
	mapping, ok := h.getThreadMapping(c)
	if !ok {
		return
	}
	path := fmt.Sprintf("/session/%s/message", mapping.SessionID)
	h.opencodeProxy.Forward(c, mapping.Agent.Name, mapping.Env, path)
}

func (h *Handler) StreamThread(c *gin.Context) {
	mapping, ok := h.getThreadMapping(c)
	if !ok {
		return
	}
	path := fmt.Sprintf("/event?sessionID=%s", mapping.SessionID)
	h.opencodeProxy.ForwardSSE(c, mapping.Agent.Name, mapping.Env, path)
}

func (h *Handler) GetArtifact(c *gin.Context) {
	mapping, ok := h.getThreadMapping(c)
	if !ok {
		return
	}
	artifactPath := c.Param("path")
	path := fmt.Sprintf("/session/%s/artifact/%s", mapping.SessionID, artifactPath)
	h.opencodeProxy.Forward(c, mapping.Agent.Name, mapping.Env, path)
}
