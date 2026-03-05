package handler

import (
	"net/http"
	"os"
	"os/exec"

	"github.com/gin-gonic/gin"
	"github.com/openagents/gateway/internal/model"
)

func (h *Handler) PublishAgent(c *gin.Context) {
	name := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", name).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	srcDir := h.opencodeProxy.AgentDir("dev", name)
	dstDir := h.opencodeProxy.AgentDir("prod", name)

	// Check dev directory exists
	if _, err := os.Stat(srcDir); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dev agent directory does not exist"})
		return
	}

	// Remove old prod and copy dev -> prod
	os.RemoveAll(dstDir)
	cmd := exec.Command("cp", "-r", srcDir, dstDir)
	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to copy agent to prod"})
		return
	}

	// Update DB status
	agent.Status = "prod"
	if err := h.db.Save(&agent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update agent status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "agent published to prod",
		"agent":   agent,
	})
}

func (h *Handler) TestAgent(c *gin.Context) {
	name := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", name).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	// Create a test session in dev environment
	c.JSON(http.StatusOK, gin.H{
		"message": "test session ready",
		"agent":   name,
		"env":     "dev",
	})
}

func (h *Handler) GenerateAgent(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "AI agent generation not yet implemented"})
}
