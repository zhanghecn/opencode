package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/openagents/gateway/internal/database"
	"github.com/openagents/gateway/internal/handler"
	"github.com/openagents/gateway/internal/middleware"
	"github.com/openagents/gateway/internal/proxy"

	"github.com/gin-gonic/gin"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	agentsRoot := getEnv("AGENTS_ROOT", "/data/agents")
	opencodePort, _ := strconv.Atoi(getEnv("OPENCODE_PORT", "4096"))
	pluginPath := getEnv("OPENAGENT_PLUGIN_PATH", "")

	// Start opencode serve if OPENCODE_MANAGED=true
	if getEnv("OPENCODE_MANAGED", "false") == "true" {
		mgr := proxy.NewOpencodeManager(opencodePort, agentsRoot, pluginPath)
		if err := mgr.Start(ctx); err != nil {
			log.Fatalf("failed to start opencode: %v", err)
		}
		defer mgr.Stop()
	}

	opencodeURL := getEnv("OPENCODE_URL", "http://localhost:"+strconv.Itoa(opencodePort))
	opencodeProxy := proxy.NewOpencodeProxy(opencodeURL, agentsRoot)

	authMiddleware := middleware.NewAuthMiddleware(getEnv("JWT_SECRET", "change-me-in-production"))

	h := handler.NewHandler(db, opencodeProxy, authMiddleware)

	r := gin.Default()
	r.Use(middleware.CORS())
	h.RegisterRoutes(r)

	port := getEnv("PORT", "8080")
	log.Printf("OpenAgents gateway starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
