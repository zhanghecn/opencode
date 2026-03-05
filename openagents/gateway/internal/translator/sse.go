package translator

import (
	"encoding/json"
	"fmt"
)

// OpencodeEvent represents an event from the opencode SSE stream
type OpencodeEvent struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
}

// FrontendEvent represents a translated event for the deer-flow frontend
type FrontendEvent struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}

// Translate converts an opencode SSE event into frontend-consumable events.
// Returns nil if the event should be dropped (e.g. heartbeats).
func Translate(raw []byte) []FrontendEvent {
	var evt OpencodeEvent
	if err := json.Unmarshal(raw, &evt); err != nil {
		return nil
	}

	switch evt.Type {
	case "server.connected":
		return []FrontendEvent{{
			Event: "open",
			Data:  `{"type":"connected"}`,
		}}

	case "server.heartbeat":
		return []FrontendEvent{{
			Event: "heartbeat",
			Data:  "{}",
		}}

	case "message.part.updated":
		return translatePartUpdated(evt.Properties)

	case "message.part.delta":
		return translatePartDelta(evt.Properties)

	case "message.updated":
		return translateMessageUpdated(evt.Properties)

	case "session.updated":
		return translateSessionUpdated(evt.Properties)

	default:
		// Pass through as custom event
		data, _ := json.Marshal(evt)
		return []FrontendEvent{{
			Event: evt.Type,
			Data:  string(data),
		}}
	}
}

func translatePartUpdated(props map[string]interface{}) []FrontendEvent {
	part, ok := props["part"].(map[string]interface{})
	if !ok {
		return nil
	}

	partType, _ := part["type"].(string)

	switch partType {
	case "text":
		// Text content from assistant
		text, _ := part["text"].(string)
		sessionID, _ := part["sessionID"].(string)
		messageID, _ := part["messageID"].(string)
		msg := map[string]interface{}{
			"type": "assistant_message",
			"data": map[string]interface{}{
				"session_id": sessionID,
				"message_id": messageID,
				"content":    text,
				"part":       part,
			},
		}
		data, _ := json.Marshal(msg)
		return []FrontendEvent{{Event: "message", Data: string(data)}}

	case "tool-invocation":
		// Tool call from assistant
		msg := map[string]interface{}{
			"type": "tool_call",
			"data": map[string]interface{}{
				"part": part,
			},
		}
		data, _ := json.Marshal(msg)
		return []FrontendEvent{{Event: "message", Data: string(data)}}

	case "tool-result":
		msg := map[string]interface{}{
			"type": "tool_result",
			"data": map[string]interface{}{
				"part": part,
			},
		}
		data, _ := json.Marshal(msg)
		return []FrontendEvent{{Event: "message", Data: string(data)}}

	default:
		msg := map[string]interface{}{
			"type": fmt.Sprintf("part_%s", partType),
			"data": map[string]interface{}{
				"part": part,
			},
		}
		data, _ := json.Marshal(msg)
		return []FrontendEvent{{Event: "message", Data: string(data)}}
	}
}

func translatePartDelta(props map[string]interface{}) []FrontendEvent {
	msg := map[string]interface{}{
		"type": "delta",
		"data": map[string]interface{}{
			"session_id": props["sessionID"],
			"message_id": props["messageID"],
			"part_id":    props["partID"],
			"field":      props["field"],
			"delta":      props["delta"],
		},
	}
	data, _ := json.Marshal(msg)
	return []FrontendEvent{{Event: "delta", Data: string(data)}}
}

func translateMessageUpdated(props map[string]interface{}) []FrontendEvent {
	msg := map[string]interface{}{
		"type": "message_updated",
		"data": props,
	}
	data, _ := json.Marshal(msg)
	return []FrontendEvent{{Event: "message", Data: string(data)}}
}

func translateSessionUpdated(props map[string]interface{}) []FrontendEvent {
	msg := map[string]interface{}{
		"type": "session_updated",
		"data": props,
	}
	data, _ := json.Marshal(msg)
	return []FrontendEvent{{Event: "session", Data: string(data)}}
}
