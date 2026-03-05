package model

import (
	"time"

	"github.com/google/uuid"
)

type ThreadMapping struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	AgentID   uuid.UUID `gorm:"type:uuid;not null" json:"agent_id"`
	Agent     *Agent    `gorm:"foreignKey:AgentID" json:"agent,omitempty"`
	ThreadID  string    `gorm:"size:255;uniqueIndex;not null" json:"thread_id"`
	SessionID string    `gorm:"size:255;not null" json:"session_id"`
	Env       string    `gorm:"size:20;default:prod" json:"env"`
	Title     string    `gorm:"size:500" json:"title"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

type UsageRecord struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID   uuid.UUID  `gorm:"type:uuid;not null" json:"agent_id"`
	UserID    *uuid.UUID `gorm:"type:uuid" json:"user_id"`
	SessionID string     `gorm:"size:255" json:"session_id"`
	TokensIn  int64      `gorm:"default:0" json:"tokens_in"`
	TokensOut int64      `gorm:"default:0" json:"tokens_out"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
}
