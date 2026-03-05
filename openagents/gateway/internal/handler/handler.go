package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/openagents/gateway/internal/middleware"
	"github.com/openagents/gateway/internal/proxy"
	"gorm.io/gorm"
)

type Handler struct {
	db            *gorm.DB
	opencodeProxy *proxy.OpencodeProxy
	authMW        *middleware.AuthMiddleware
}

func NewHandler(db *gorm.DB, opencodeProxy *proxy.OpencodeProxy, authMW *middleware.AuthMiddleware) *Handler {
	return &Handler{
		db:            db,
		opencodeProxy: opencodeProxy,
		authMW:        authMW,
	}
}

func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", h.Login)
			auth.POST("/register", h.Register)
			auth.POST("/refresh", h.RefreshToken)
		}

		protected := api.Group("")
		protected.Use(h.authMW.RequireAuth())
		{
			agents := protected.Group("/agents")
			{
				agents.GET("", h.ListAgents)
				agents.POST("", h.CreateAgent)
				agents.GET("/:name", h.GetAgent)
				agents.PUT("/:name", h.UpdateAgent)
				agents.DELETE("/:name", h.DeleteAgent)
				agents.POST("/:name/publish", h.PublishAgent)
				agents.POST("/:name/test", h.TestAgent)
				agents.POST("/generate", h.GenerateAgent)

				agents.GET("/:name/skills", h.ListSkills)
				agents.POST("/:name/skills", h.CreateSkill)
				agents.PUT("/:name/skills/:id", h.UpdateSkill)
				agents.DELETE("/:name/skills/:id", h.DeleteSkill)
			}

			threads := protected.Group("/threads")
			{
				threads.POST("", h.CreateThread)
				threads.GET("", h.ListThreads)
				threads.GET("/:id", h.GetThread)
				threads.DELETE("/:id", h.DeleteThread)
				threads.POST("/:id/messages", h.SendMessage)
				threads.GET("/:id/stream", h.StreamThread)
				threads.GET("/:id/artifacts/:path", h.GetArtifact)
			}

			tokens := protected.Group("/tokens")
			{
				tokens.GET("", h.ListTokens)
				tokens.POST("", h.CreateToken)
				tokens.DELETE("/:id", h.DeleteToken)
			}

			protected.GET("/models", h.ListModels)
		}

		v1 := api.Group("/v1")
		{
			v1.POST("/agents/:name/chat", h.PublicChat)
			v1.GET("/agents/:name/chat/stream", h.PublicChatStream)
		}
	}
}
