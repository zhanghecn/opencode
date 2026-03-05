package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openagents/gateway/internal/model"
)

type CreateAgentRequest struct {
	Name        string          `json:"name" binding:"required"`
	DisplayName string          `json:"display_name"`
	Description string          `json:"description"`
	Model       string          `json:"model"`
	ConfigJSON  json.RawMessage `json:"config_json"`
}

func (h *Handler) ListAgents(c *gin.Context) {
	userID := getUserID(c)
	var agents []model.Agent
	if err := h.db.Where("created_by = ?", userID).Find(&agents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list agents"})
		return
	}
	c.JSON(http.StatusOK, agents)
}

func (h *Handler) CreateAgent(c *gin.Context) {
	var req CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := getUserID(c)
	agent := model.Agent{
		ID:          uuid.New(),
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Model:       req.Model,
		Status:      "dev",
		ConfigJSON:  req.ConfigJSON,
		CreatedBy:   userID,
	}

	if err := h.db.Create(&agent).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "agent name already exists"})
		return
	}

	if err := h.createAgentFileSystem(&agent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create agent filesystem"})
		return
	}

	c.JSON(http.StatusCreated, agent)
}

func (h *Handler) GetAgent(c *gin.Context) {
	name := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", name).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}
	c.JSON(http.StatusOK, agent)
}

func (h *Handler) UpdateAgent(c *gin.Context) {
	name := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", name).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var req CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agent.DisplayName = req.DisplayName
	agent.Description = req.Description
	agent.Model = req.Model
	agent.ConfigJSON = req.ConfigJSON

	if err := h.db.Save(&agent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update agent"})
		return
	}

	c.JSON(http.StatusOK, agent)
}

func (h *Handler) DeleteAgent(c *gin.Context) {
	name := c.Param("name")
	if err := h.db.Where("name = ?", name).Delete(&model.Agent{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete agent"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "agent deleted"})
}

func (h *Handler) createAgentFileSystem(agent *model.Agent) error {
	agentDir := h.opencodeProxy.AgentDir("dev", agent.Name)
	if err := os.MkdirAll(filepath.Join(agentDir, "skills"), 0755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(agentDir, ".opencode"), 0755); err != nil {
		return err
	}

	agentsMd := fmt.Sprintf("# %s\n\n%s\n", agent.DisplayName, agent.Description)
	if err := os.WriteFile(filepath.Join(agentDir, "AGENTS.md"), []byte(agentsMd), 0644); err != nil {
		return err
	}

	// Build opencode config with model and full permissions
	opencodeConfig := map[string]interface{}{
		"model": agent.Model,
		"permission": map[string]interface{}{
			"*":         "allow",
			"doom_loop": "allow",
			"external_directory": map[string]interface{}{
				"*": "allow",
			},
			"read": map[string]interface{}{
				"*": "allow",
			},
		},
	}
	if len(agent.ConfigJSON) > 0 {
		json.Unmarshal(agent.ConfigJSON, &opencodeConfig)
	}
	configBytes, _ := json.MarshalIndent(opencodeConfig, "", "  ")
	if err := os.WriteFile(filepath.Join(agentDir, ".opencode", "opencode.json"), configBytes, 0644); err != nil {
		return err
	}

	return nil
}
