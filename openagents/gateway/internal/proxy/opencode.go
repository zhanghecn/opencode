package proxy

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/openagents/gateway/internal/translator"
)

type OpencodeProxy struct {
	baseURL    string
	agentsRoot string
	client     *http.Client
}

func NewOpencodeProxy(baseURL, agentsRoot string) *OpencodeProxy {
	return &OpencodeProxy{
		baseURL:    baseURL,
		agentsRoot: agentsRoot,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (p *OpencodeProxy) AgentDir(env, agentName string) string {
	return filepath.Join(p.agentsRoot, env, agentName)
}

func (p *OpencodeProxy) AgentsRoot() string {
	return p.agentsRoot
}

// Request sends a request to opencode and returns the raw response body.
// Caller is responsible for closing the response body.
func (p *OpencodeProxy) Request(method, agentName, env, path string, body io.Reader) (*http.Response, error) {
	agentDir := p.AgentDir(env, agentName)
	targetURL := fmt.Sprintf("%s%s", p.baseURL, path)

	req, err := http.NewRequest(method, targetURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-opencode-directory", agentDir)

	return p.client.Do(req)
}

func (p *OpencodeProxy) Forward(c *gin.Context, agentName, env, path string) {
	agentDir := p.AgentDir(env, agentName)
	targetURL := fmt.Sprintf("%s%s", p.baseURL, path)

	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, targetURL, c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create proxy request"})
		return
	}

	for k, vv := range c.Request.Header {
		for _, v := range vv {
			req.Header.Add(k, v)
		}
	}
	req.Header.Set("x-opencode-directory", agentDir)

	if q := c.Request.URL.RawQuery; q != "" {
		req.URL.RawQuery = q
	}

	resp, err := p.client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "opencode unreachable"})
		return
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		for _, v := range vv {
			c.Header(k, v)
		}
	}
	c.Status(resp.StatusCode)
	io.Copy(c.Writer, resp.Body)
}

func (p *OpencodeProxy) ForwardSSE(c *gin.Context, agentName, env, path string) {
	agentDir := p.AgentDir(env, agentName)
	targetURL := fmt.Sprintf("%s%s", p.baseURL, path)

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create SSE request"})
		return
	}

	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("x-opencode-directory", agentDir)

	if q := c.Request.URL.RawQuery; q != "" {
		req.URL.RawQuery = q
	}

	sseClient := &http.Client{Timeout: 0}
	resp, err := sseClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "opencode SSE unreachable"})
		return
	}
	defer resp.Body.Close()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Status(resp.StatusCode)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	// Parse SSE events line-by-line and translate
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 64*1024), 64*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") {
			data := strings.TrimPrefix(line, "data:")
			data = strings.TrimSpace(data)
			events := translator.Translate([]byte(data))
			for _, evt := range events {
				fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", evt.Event, evt.Data)
				flusher.Flush()
			}
		} else if line == "" {
			// Empty line (SSE event separator), skip
		} else {
			// Pass through non-data lines (e.g. event:, id:, retry:)
			fmt.Fprintf(c.Writer, "%s\n", line)
			flusher.Flush()
		}
	}
}
