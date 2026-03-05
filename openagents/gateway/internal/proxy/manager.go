package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"time"
)

type OpencodeManager struct {
	cmd        *exec.Cmd
	port       int
	agentsRoot string
	pluginPath string
}

func NewOpencodeManager(port int, agentsRoot, pluginPath string) *OpencodeManager {
	return &OpencodeManager{
		port:       port,
		agentsRoot: agentsRoot,
		pluginPath: pluginPath,
	}
}

// Start spawns the opencode serve process with full permissions
func (m *OpencodeManager) Start(ctx context.Context) error {
	opencodeBin := os.Getenv("OPENCODE_BIN")
	if opencodeBin == "" {
		opencodeBin = "opencode"
	}

	m.cmd = exec.CommandContext(ctx, opencodeBin, "serve", "--port", fmt.Sprintf("%d", m.port))

	// Full permission config injected via environment
	configContent := m.buildConfig()
	configJSON, _ := json.Marshal(configContent)

	m.cmd.Env = append(os.Environ(),
		fmt.Sprintf("OPENCODE_CONFIG_CONTENT=%s", string(configJSON)),
		"OPENCODE_CLIENT=sdk",
	)

	m.cmd.Stdout = os.Stdout
	m.cmd.Stderr = os.Stderr

	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start opencode: %w", err)
	}

	log.Printf("opencode serve started on port %d (pid=%d)", m.port, m.cmd.Process.Pid)

	// Wait for readiness
	if err := m.waitReady(ctx); err != nil {
		return fmt.Errorf("opencode not ready: %w", err)
	}

	return nil
}

func (m *OpencodeManager) Stop() {
	if m.cmd != nil && m.cmd.Process != nil {
		m.cmd.Process.Signal(os.Interrupt)
		m.cmd.Wait()
	}
}

func (m *OpencodeManager) buildConfig() map[string]interface{} {
	config := map[string]interface{}{
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

	// Add plugin if path is specified
	if m.pluginPath != "" {
		config["plugin"] = []string{
			fmt.Sprintf("file://%s", m.pluginPath),
		}
	}

	// Inject provider config from environment if available
	// Note: apiKey is NOT set here — @ai-sdk/anthropic reads ANTHROPIC_API_KEY from env automatically.
	// Only baseURL needs explicit config since it uses ${VAR} substitution in loadBaseURL().
	baseURL := os.Getenv("ANTHROPIC_BASE_URL")
	model := os.Getenv("ANTHROPIC_MODEL")
	if baseURL != "" {
		if model == "" {
			model = "kimi-k2.5"
		}
		config["provider"] = map[string]interface{}{
			"anthropic": map[string]interface{}{
				"options": map[string]interface{}{
					"baseURL": baseURL,
				},
				"models": map[string]interface{}{
					model: map[string]interface{}{
						"name":                  model,
						"attachment":            true,
						"input_cost_per_token":  0,
						"output_cost_per_token": 0,
						"context_length":        131072,
						"max_tokens":            8192,
					},
				},
			},
		}
		config["model"] = "anthropic/" + model
	}

	return config
}

func (m *OpencodeManager) waitReady(ctx context.Context) error {
	url := fmt.Sprintf("http://localhost:%d/doc", m.port)
	client := &http.Client{Timeout: 2 * time.Second}

	deadline := time.After(30 * time.Second)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-deadline:
			return fmt.Errorf("timeout waiting for opencode to be ready")
		case <-ticker.C:
			resp, err := client.Get(url)
			if err == nil {
				resp.Body.Close()
				if resp.StatusCode == 200 {
					log.Println("opencode serve is ready")
					return nil
				}
			}
		}
	}
}

func (m *OpencodeManager) HealthCheck() error {
	url := fmt.Sprintf("http://localhost:%d/doc", m.port)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("opencode health check failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("opencode returned status %d", resp.StatusCode)
	}
	return nil
}
