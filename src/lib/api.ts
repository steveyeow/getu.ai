import { getAuthToken } from "./supabase.js";
import type {
  ApiResponse,
  PaginatedResponse,
  Task,
  ProductProfile,
  Conversation,
} from "../../shared/types.js";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Chat ──────────────────────────────────────────────────────────────────────

// Opens a streaming SSE connection to ARIA.
// Returns an EventSource-like async iterator over { event, data } pairs.
export async function streamChat(
  message: string,
  conversationId?: string,
  onEvent?: (event: string, data: string) => void
): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE}/api/v1/chat`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${token}`,
      Accept:          "text/event-stream",
    },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let event = "message";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = line.slice(6);
        onEvent?.(event, data);
        event = "message";
      }
    }
  }
}

// Direct agent chat (bypasses ARIA, talks to a specialist agent)
export async function streamAgentChat(
  agentName: string,
  message: string,
  conversationId?: string,
  onEvent?: (event: string, data: string) => void
): Promise<void> {
  const token = await getAuthToken();
  const res   = await fetch(`${BASE}/api/v1/agents/${agentName.toLowerCase()}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    body:    JSON.stringify({ message, conversationId }),
  });
  if (!res.ok) throw new Error(`Agent chat failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    let event = "message";
    for (const line of lines) {
      if (line.startsWith("event: ")) { event = line.slice(7).trim(); }
      else if (line.startsWith("data: ")) { onEvent?.(event, line.slice(6)); event = "message"; }
    }
  }
}

export async function getAgentConversations(agentName: string): Promise<Conversation[]> {
  const res  = await fetch(`${BASE}/api/v1/agents/${agentName.toLowerCase()}/conversations`, { headers: await authHeaders() });
  const json: ApiResponse<Conversation[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

export async function getConversationMessages(conversationId: string): Promise<{ id: string; role: string; content: string }[]> {
  const res  = await fetch(`${BASE}/api/v1/chat/conversations/${conversationId}/messages`, { headers: await authHeaders() });
  const json: ApiResponse<{ id: string; role: string; content: string }[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${BASE}/api/v1/chat/conversations`, {
    headers: await authHeaders(),
  });
  const json: ApiResponse<Conversation[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

// ── Product Profile ───────────────────────────────────────────────────────────

export async function getProductProfile(): Promise<ProductProfile | null> {
  const res = await fetch(`${BASE}/api/v1/product`, {
    headers: await authHeaders(),
  });
  if (res.status === 404) return null;
  const json: ApiResponse<ProductProfile> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function getTasks(status?: string): Promise<Task[]> {
  const url = status
    ? `${BASE}/api/v1/tasks?status=${status}`
    : `${BASE}/api/v1/tasks`;
  const res  = await fetch(url, { headers: await authHeaders() });
  const json: PaginatedResponse<Task> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function getTask(id: string): Promise<{ task: Task; executions: unknown[] }> {
  const res  = await fetch(`${BASE}/api/v1/tasks/${id}`, { headers: await authHeaders() });
  const json: ApiResponse<{ task: Task; executions: unknown[] }> = await res.json();
  if (json.error || !json.data) throw new Error(json.error ?? "not found");
  return json.data;
}

export async function pauseTask(id: string): Promise<void> {
  await fetch(`${BASE}/api/v1/tasks/${id}/pause`, {
    method:  "POST",
    headers: await authHeaders(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/tasks/${id}`, {
    method:  "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function updateTaskPriority(id: string, priority: number): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/tasks/${id}`, {
    method:  "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body:    JSON.stringify({ priority }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Failed to update priority");
  }
}
