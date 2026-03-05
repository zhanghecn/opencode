package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openagents/gateway/internal/model"
)

type CreateSkillRequest struct {
	SkillName string `json:"skill_name" binding:"required"`
	Content   string `json:"content"` // SKILL.md content
}

type UpdateSkillRequest struct {
	Content string `json:"content" binding:"required"` // SKILL.md content
}

func (h *Handler) ListSkills(c *gin.Context) {
	agentName := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", agentName).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var skills []model.AgentSkill
	if err := h.db.Where("agent_id = ?", agent.ID).Find(&skills).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list skills"})
		return
	}

	// Enrich with file content
	type SkillWithContent struct {
		model.AgentSkill
		Content string `json:"content"`
	}
	result := make([]SkillWithContent, 0, len(skills))
	for _, skill := range skills {
		s := SkillWithContent{AgentSkill: skill}
		skillPath := h.skillFilePath(agentName, skill.Status, skill.SkillName)
		if data, err := os.ReadFile(skillPath); err == nil {
			s.Content = string(data)
		}
		result = append(result, s)
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) CreateSkill(c *gin.Context) {
	agentName := c.Param("name")
	var agent model.Agent
	if err := h.db.Where("name = ?", agentName).First(&agent).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var req CreateSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	skill := model.AgentSkill{
		ID:        uuid.New(),
		AgentID:   agent.ID,
		SkillName: req.SkillName,
		Status:    "dev",
	}

	if err := h.db.Create(&skill).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "skill already exists"})
		return
	}

	// Create SKILL.md file
	skillDir := filepath.Dir(h.skillFilePath(agentName, "dev", req.SkillName))
	if err := os.MkdirAll(skillDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create skill directory"})
		return
	}

	content := req.Content
	if content == "" {
		content = fmt.Sprintf("# %s\n\nDescribe this skill here.\n", req.SkillName)
	}
	if err := os.WriteFile(h.skillFilePath(agentName, "dev", req.SkillName), []byte(content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write SKILL.md"})
		return
	}

	c.JSON(http.StatusCreated, skill)
}

func (h *Handler) UpdateSkill(c *gin.Context) {
	skillID := c.Param("id")
	agentName := c.Param("name")

	var skill model.AgentSkill
	if err := h.db.Where("id = ?", skillID).First(&skill).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
		return
	}

	var req UpdateSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	skillPath := h.skillFilePath(agentName, skill.Status, skill.SkillName)
	if err := os.WriteFile(skillPath, []byte(req.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update SKILL.md"})
		return
	}

	c.JSON(http.StatusOK, skill)
}

func (h *Handler) DeleteSkill(c *gin.Context) {
	skillID := c.Param("id")
	agentName := c.Param("name")

	var skill model.AgentSkill
	if err := h.db.Where("id = ?", skillID).First(&skill).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
		return
	}

	// Remove file
	skillDir := filepath.Dir(h.skillFilePath(agentName, skill.Status, skill.SkillName))
	os.RemoveAll(skillDir)

	// Remove from DB
	h.db.Delete(&skill)

	c.JSON(http.StatusOK, gin.H{"message": "skill deleted"})
}

func (h *Handler) skillFilePath(agentName, env, skillName string) string {
	return filepath.Join(h.opencodeProxy.AgentDir(env, agentName), "skills", skillName, "SKILL.md")
}
