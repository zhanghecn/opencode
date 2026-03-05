"use client";

import { getGatewayBaseURL } from "../config";

export interface OpenAgentClient {
  baseUrl: string;
  token: string | null;

  setToken(token: string): void;

  // Agent APIs
  agents: {
    list(): Promise<any[]>;
    create(data: any): Promise<any>;
    get(name: string): Promise<any>;
    update(name: string, data: any): Promise<any>;
    delete(name: string): Promise<void>;
  };

  // Thread/Session APIs
  threads: {
    create(agentName: string, env?: string): Promise<any>;
    search(params?: Record<string, any>): Promise<any[]>;
    get(threadId: string): Promise<any>;
    delete(threadId: string): Promise<void>;
    sendMessage(threadId: string, message: any): Promise<any>;
    streamUrl(threadId: string): string;
  };

  // Auth APIs
  auth: {
    login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: any }>;
    register(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: any }>;
    refresh(refreshToken: string): Promise<{ access_token: string }>;
  };
}

function createClient(baseUrl: string): OpenAgentClient {
  let token: string | null = null;

  async function request(path: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const resp = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!resp.ok) {
      const error = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(error.error || `Request failed: ${resp.status}`);
    }

    if (resp.status === 204) return null;
    return resp.json();
  }

  return {
    baseUrl,
    token,

    setToken(t: string) {
      token = t;
    },

    agents: {
      list: () => request("/api/agents"),
      create: (data) => request("/api/agents", { method: "POST", body: JSON.stringify(data) }),
      get: (name) => request(`/api/agents/${name}`),
      update: (name, data) => request(`/api/agents/${name}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (name) => request(`/api/agents/${name}`, { method: "DELETE" }),
    },

    threads: {
      create: (agentName, env = "prod") => request(`/api/threads?agent=${agentName}&env=${env}`, { method: "POST" }),
      search: (params) => {
        const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
        return request(`/api/threads${qs}`);
      },
      get: (threadId) => request(`/api/threads/${threadId}`),
      delete: (threadId) => request(`/api/threads/${threadId}`, { method: "DELETE" }),
      sendMessage: (threadId, message) => request(`/api/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify(message),
      }),
      streamUrl: (threadId) => `${baseUrl}/api/threads/${threadId}/stream`,
    },

    auth: {
      login: (email, password) => request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
      register: (email, password) => request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
      refresh: (refreshToken) => request("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    },
  };
}

let _singleton: OpenAgentClient | null = null;

export function getAPIClient(): OpenAgentClient {
  _singleton ??= createClient(getGatewayBaseURL());

  // Restore token from localStorage if available
  if (typeof window !== "undefined" && !_singleton.token) {
    const savedToken = localStorage.getItem("openagents_token");
    if (savedToken) {
      _singleton.setToken(savedToken);
    }
  }

  return _singleton;
}

// Keep backward-compatible export name
export { getAPIClient as getOpenAgentClient };
