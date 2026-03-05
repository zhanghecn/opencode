import { getGatewayBaseURL } from "@/core/config";

import type { Agent, CreateAgentRequest, UpdateAgentRequest } from "./types";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("openagents_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${getGatewayBaseURL()}/api/agents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load agents: ${res.statusText}`);
  const data = await res.json();
  // Gateway returns array directly, deer-flow backend wraps in { agents: [] }
  return Array.isArray(data) ? data : (data as { agents: Agent[] }).agents;
}

export async function getAgent(name: string): Promise<Agent> {
  const res = await fetch(`${getGatewayBaseURL()}/api/agents/${name}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Agent '${name}' not found`);
  return res.json() as Promise<Agent>;
}

export async function createAgent(request: CreateAgentRequest): Promise<Agent> {
  const res = await fetch(`${getGatewayBaseURL()}/api/agents`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to create agent: ${res.statusText}`);
  }
  return res.json() as Promise<Agent>;
}

export async function updateAgent(
  name: string,
  request: UpdateAgentRequest,
): Promise<Agent> {
  const res = await fetch(`${getGatewayBaseURL()}/api/agents/${name}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to update agent: ${res.statusText}`);
  }
  return res.json() as Promise<Agent>;
}

export async function deleteAgent(name: string): Promise<void> {
  const res = await fetch(`${getGatewayBaseURL()}/api/agents/${name}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete agent: ${res.statusText}`);
}

export async function checkAgentName(
  name: string,
): Promise<{ available: boolean; name: string }> {
  const res = await fetch(
    `${getGatewayBaseURL()}/api/agents/check?name=${encodeURIComponent(name)}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      err.error ?? `Failed to check agent name: ${res.statusText}`,
    );
  }
  return res.json() as Promise<{ available: boolean; name: string }>;
}
