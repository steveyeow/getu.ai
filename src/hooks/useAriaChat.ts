import { useState, useCallback, useRef, useEffect } from "react";
import { streamChat, getConversationMessages } from "../lib/api.js";

export interface ChatMessage {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  // Shows a small card when ARIA creates a task
  taskCreated?: { taskId: string; agentName: string; title: string };
}

export function useAriaChat(initialConversationId?: string) {
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [streaming, setStreaming]           = useState(false);
  const [loading, setLoading]              = useState(!!initialConversationId);
  const [error, setError]                   = useState<string | null>(null);
  const abortRef                            = useRef(false);
  // Tracks the id of the in-flight assistant message (added on first text chunk)
  const assistantIdRef                      = useRef<string | null>(null);
  // When user switches conversation we stop applying in-flight stream updates to state
  const streamActiveRef                     = useRef(false);

  // When switching conversation (or opening one): sync state and load messages.
  // Do not remount the chat when selecting another conversation so in-flight streams
  // can finish and be persisted; when user comes back they see the full reply.
  useEffect(() => {
    // If the parent is passing back the same conversationId we already set from the
    // stream's conversationId event, skip the reset — the stream is still in-flight.
    if (initialConversationId && initialConversationId === conversationId && streamActiveRef.current) {
      return;
    }

    streamActiveRef.current = false; // ignore any in-flight stream for the previous conversation
    if (!initialConversationId) {
      setMessages([]);
      setConversationId(undefined);
      setLoading(false);
      setStreaming(false);
      return;
    }
    setConversationId(initialConversationId);
    setStreaming(false);
    setLoading(true);
    setMessages([]); // avoid showing previous conversation while loading
    getConversationMessages(initialConversationId)
      .then(msgs => {
        setMessages(msgs.map(m => ({
          id:      m.id,
          role:    m.role as "user" | "assistant",
          content: m.content,
        })));
      })
      .catch(() => { /* non-critical */ })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  const sendMessage = useCallback(async (text: string) => {
    if (streaming || !text.trim()) return;

    setError(null);
    abortRef.current     = false;
    assistantIdRef.current = null;
    streamActiveRef.current = true;

    // Optimistically add user message
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    try {
      await streamChat(text, conversationId, (event, data) => {
        if (abortRef.current || !streamActiveRef.current) return;

        if (event === "conversationId") {
          setConversationId(data);
        } else if (event === "text") {
          if (!assistantIdRef.current) {
            // First text chunk — create the assistant message now (no empty bubble)
            const id = crypto.randomUUID();
            assistantIdRef.current = id;
            setMessages(prev => [...prev, { id, role: "assistant", content: data }]);
          } else {
            const id = assistantIdRef.current;
            setMessages(prev =>
              prev.map(m => m.id === id ? { ...m, content: m.content + data } : m)
            );
          }
        } else if (event === "tool_result") {
          try {
            const result = JSON.parse(data);
            if (result.toolName === "create_task" && result.result?.taskId) {
              const id = assistantIdRef.current;
              if (id) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === id
                      ? { ...m, taskCreated: { taskId: result.result.taskId, agentName: result.result.agentName, title: result.result.title } }
                      : m
                  )
                );
              }
            }
          } catch {
            // Not JSON — ignore
          }
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      // Remove the in-flight assistant message on error
      const id = assistantIdRef.current;
      if (id) setMessages(prev => prev.filter(m => m.id !== id));
    } finally {
      streamActiveRef.current = false;
      setStreaming(false);
    }
  }, [streaming, conversationId]);

  return { messages, conversationId, streaming, loading, error, sendMessage };
}
