export interface Agent {
  id?: string;
  name: string;
  display_name?: string;
  description: string;
  model: string | null;
  status?: "dev" | "prod";
  config_json?: Record<string, unknown>;
  tool_groups?: string[] | null;
  soul?: string | null;
  skills?: AgentSkill[];
  created_at?: string;
  updated_at?: string;
}

export interface AgentSkill {
  id: string;
  skill_name: string;
  status: "dev" | "prod";
}

export interface CreateAgentRequest {
  name: string;
  display_name?: string;
  description?: string;
  model?: string | null;
  config_json?: Record<string, unknown>;
  tool_groups?: string[] | null;
  soul?: string;
}

export interface UpdateAgentRequest {
  display_name?: string;
  description?: string | null;
  model?: string | null;
  config_json?: Record<string, unknown>;
  tool_groups?: string[] | null;
  soul?: string | null;
}
