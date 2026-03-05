"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import { getAPIClient } from "../api";
import type { LocalSettings } from "../settings";
import { useUpdateSubtask } from "../tasks/context";
import { uploadFiles } from "../uploads";

import type { AgentThread, AgentThreadState } from "./types";

export type ToolEndEvent = {
  name: string;
  data: unknown;
};

export type ThreadStreamOptions = {
  threadId?: string | null | undefined;
  context: LocalSettings["context"];
  isMock?: boolean;
  onStart?: (threadId: string) => void;
  onFinish?: (state: AgentThreadState) => void;
  onToolEnd?: (event: ToolEndEvent) => void;
};

type SSEMessage = {
  type: string;
  data: Record<string, unknown>;
};

// Custom hook to replace LangGraph SDK's useStream
function useOpenAgentStream(threadId: string | null | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [values, setValues] = useState<AgentThreadState>({
    title: "",
    messages: [],
    artifacts: [],
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbacksRef = useRef<{
    onMessage?: (msg: SSEMessage) => void;
    onFinish?: () => void;
  }>({});

  const connect = useCallback(
    (tid: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const client = getAPIClient();
      const url = client.threads.streamUrl(tid);
      const token = client.token;
      // EventSource doesn't support custom headers, use query param
      const streamUrl = token ? `${url}?token=${token}` : url;

      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;
      setIsLoading(true);
      setError(null);

      es.addEventListener("message", (event) => {
        try {
          const msg: SSEMessage = JSON.parse(event.data);
          callbacksRef.current.onMessage?.(msg);

          if (msg.type === "assistant_message") {
            const content = msg.data.content as string;
            const messageId = msg.data.message_id as string;
            setMessages((prev) => {
              const existing = prev.findIndex((m) => m.id === messageId);
              const newMsg = {
                id: messageId,
                type: "ai",
                content,
                tool_calls: [],
                additional_kwargs: {},
              };
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newMsg;
                return updated;
              }
              return [...prev, newMsg];
            });
          } else if (msg.type === "tool_call") {
            const part = msg.data.part as Record<string, unknown>;
            setMessages((prev) => {
              const lastAI = [...prev]
                .reverse()
                .find((m) => m.type === "ai");
              if (lastAI) {
                lastAI.tool_calls = lastAI.tool_calls || [];
                lastAI.tool_calls.push({
                  id: part.id,
                  name: part.toolName,
                  args: part.args || {},
                });
              }
              return [...prev];
            });
          } else if (msg.type === "tool_result") {
            const part = msg.data.part as Record<string, unknown>;
            setMessages((prev) => [
              ...prev,
              {
                id: part.id,
                type: "tool",
                name: part.toolName,
                content: typeof part.result === "string" ? part.result : JSON.stringify(part.result),
                tool_call_id: part.toolCallId,
              },
            ]);
          } else if (msg.type === "session_updated") {
            const data = msg.data as Record<string, unknown>;
            if (data.title) {
              setValues((prev) => ({ ...prev, title: data.title as string }));
            }
          } else if (msg.type === "message_updated") {
            // Full message update
          }
        } catch (e) {
          console.error("Failed to parse SSE message:", e);
        }
      });

      es.addEventListener("delta", (event) => {
        try {
          const msg: SSEMessage = JSON.parse(event.data);
          if (msg.type === "delta") {
            const delta = msg.data.delta as string;
            const messageId = msg.data.message_id as string;
            setMessages((prev) => {
              const existing = prev.findIndex((m) => m.id === messageId);
              if (existing >= 0) {
                const updated = [...prev];
                const current =
                  typeof updated[existing].content === "string"
                    ? updated[existing].content
                    : "";
                updated[existing] = {
                  ...updated[existing],
                  content: current + delta,
                };
                return updated;
              }
              return [
                ...prev,
                {
                  id: messageId,
                  type: "ai",
                  content: delta,
                  tool_calls: [],
                  additional_kwargs: {},
                },
              ];
            });
          }
        } catch (e) {
          console.error("Failed to parse delta:", e);
        }
      });

      es.onerror = () => {
        setIsLoading(false);
        es.close();
        callbacksRef.current.onFinish?.();
      };
    },
    [],
  );

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    values,
    setValues,
    connect,
    disconnect,
    callbacksRef,
  };
}

export function useThreadStream({
  threadId,
  context,
  onStart,
  onFinish,
  onToolEnd,
}: ThreadStreamOptions) {
  const [_threadId, setThreadId] = useState<string | null>(threadId ?? null);
  const queryClient = useQueryClient();
  const updateSubtask = useUpdateSubtask();

  const stream = useOpenAgentStream(_threadId);

  useEffect(() => {
    if (_threadId && _threadId !== threadId) {
      setThreadId(threadId ?? null);
    }
  }, [threadId, _threadId]);

  // Set up callbacks
  useEffect(() => {
    stream.callbacksRef.current = {
      onMessage: (msg) => {
        if (msg.type === "tool_call") {
          onToolEnd?.({
            name: (msg.data.part as any)?.toolName || "",
            data: msg.data,
          });
        }
        if (msg.type === "task_running") {
          updateSubtask({
            id: msg.data.task_id as string,
            latestMessage: msg.data.message as any,
          });
        }
      },
      onFinish: () => {
        onFinish?.(stream.values);
        void queryClient.invalidateQueries({
          queryKey: ["threads", "search"],
        });
      },
    };
  }, [stream.callbacksRef, stream.values, onToolEnd, onFinish, updateSubtask, queryClient]);

  // Connect to existing thread on mount
  useEffect(() => {
    if (_threadId) {
      stream.connect(_threadId);
    }
  }, [_threadId, stream.connect]);

  const sendMessage = useCallback(
    async (
      tid: string,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      const text = message.text.trim();

      // Upload files first if any
      if (message.files && message.files.length > 0) {
        try {
          const filePromises = message.files.map(async (fileUIPart) => {
            if (fileUIPart.url && fileUIPart.filename) {
              try {
                const response = await fetch(fileUIPart.url);
                const blob = await response.blob();
                return new File([blob], fileUIPart.filename, {
                  type: fileUIPart.mediaType || blob.type,
                });
              } catch (error) {
                console.error(
                  `Failed to fetch file ${fileUIPart.filename}:`,
                  error,
                );
                return null;
              }
            }
            return null;
          });

          const conversionResults = await Promise.all(filePromises);
          const files = conversionResults.filter(
            (file): file is File => file !== null,
          );

          if (files.length > 0) {
            await uploadFiles(tid, files);
          }
        } catch (error) {
          console.error("Failed to upload files:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to upload files.";
          toast.error(errorMessage);
          throw error;
        }
      }

      // Add user message locally
      stream.setMessages((prev) => [
        ...prev,
        {
          id: `human-${Date.now()}`,
          type: "human",
          content: [{ type: "text", text }],
        },
      ]);

      // Send message to gateway
      const client = getAPIClient();
      try {
        await client.threads.sendMessage(tid, {
          messages: [
            {
              type: "human",
              content: [{ type: "text", text }],
            },
          ],
          context: {
            ...extraContext,
            ...context,
            thinking_enabled: context.mode !== "flash",
            is_plan_mode: context.mode === "pro" || context.mode === "ultra",
            subagent_enabled: context.mode === "ultra",
            thread_id: tid,
          },
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message");
        throw error;
      }

      void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
    },
    [stream, context, queryClient],
  );

  // Build a thread-like object compatible with existing components
  const thread = {
    messages: stream.messages,
    values: stream.values,
    isLoading: stream.isLoading,
    error: stream.error,
    // Stub methods for compatibility
    submit: async () => {},
    stop: () => stream.disconnect(),
  };

  return [thread, sendMessage] as const;
}

export function useThreads(
  params: Record<string, any> = {},
) {
  const apiClient = getAPIClient();
  return useQuery<AgentThread[]>({
    queryKey: ["threads", "search", params],
    queryFn: async () => {
      const response = await apiClient.threads.search(params);
      return response as AgentThread[];
    },
    refetchOnWindowFocus: false,
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      await apiClient.threads.delete(threadId);
    },
    onSuccess(_, { threadId }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return oldData?.filter((t) => t.thread_id !== threadId) ?? [];
        },
      );
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      title,
    }: {
      threadId: string;
      title: string;
    }) => {
      // Title updates come through SSE events from the gateway
      // For now, just update local state
      void threadId;
      void title;
    },
    onSuccess(_, { threadId, title }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return (
            oldData?.map((t) => {
              if (t.thread_id === threadId) {
                return {
                  ...t,
                  values: {
                    ...t.values,
                    title,
                  },
                };
              }
              return t;
            }) ?? []
          );
        },
      );
    },
  });
}
