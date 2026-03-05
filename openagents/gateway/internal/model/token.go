package model

import (
	"time"

	"github.com/google/uuid"
)

type APIToken struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID   *uuid.UUID `gorm:"type:uuid" json:"agent_id"`
	Agent     *Agent     `gorm:"foreignKey:AgentID" json:"agent,omitempty"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	User      *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TokenHash string     `gorm:"size:255;uniqueIndex;not null" json:"-"`
	Name      string     `gorm:"size:255" json:"name"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at"`
}
