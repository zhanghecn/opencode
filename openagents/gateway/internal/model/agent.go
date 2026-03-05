package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Agent struct {
	ID          uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string          `gorm:"uniqueIndex;size:255;not null" json:"name"`
	DisplayName string          `gorm:"size:255" json:"display_name"`
	Description string          `gorm:"type:text" json:"description"`
	Model       string          `gorm:"size:255" json:"model"`
	Status      string          `gorm:"size:20;default:dev" json:"status"`
	ConfigJSON  json.RawMessage `gorm:"type:jsonb;default:'{}'" json:"config_json"`
	CreatedBy   uuid.UUID       `gorm:"type:uuid" json:"created_by"`
	Creator     *User           `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Skills      []AgentSkill    `gorm:"foreignKey:AgentID" json:"skills,omitempty"`
	CreatedAt   time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

type AgentSkill struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_agent_skill" json:"agent_id"`
	SkillName string    `gorm:"size:255;not null;uniqueIndex:idx_agent_skill" json:"skill_name"`
	Status    string    `gorm:"size:20;default:dev" json:"status"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
