import type { Todo } from "../todos";

// Message types compatible with deer-flow's existing components
// These replace the LangGraph SDK types
export interface Message {
  id?: string;
  type: "human" | "ai" | "tool";
  content: string | Array<{ type: string; text?: string; image_url?: string | { url: string } }>;
  name?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  tool_call_id?: string;
  additional_kwargs?: Record<string, unknown>;
}

export type AIMessage = Message & { type: "ai" };

export interface AgentThreadState extends Record<string, unknown> {
  title: string;
  messages: Message[];
  artifacts: string[];
  todos?: Todo[];
}

export interface AgentThread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  values: AgentThreadState;
  metadata?: Record<string, unknown>;
}

export interface AgentThreadContext extends Record<string, unknown> {
  thread_id: string;
  model_name: string | undefined;
  thinking_enabled: boolean;
  is_plan_mode: boolean;
  subagent_enabled: boolean;
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  agent_name?: string;
}

export type BaseStream<T = unknown> = {
  messages: Message[];
  values: T;
  isLoading: boolean;
  error: Error | null;
};
