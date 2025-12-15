"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  AgentContext,
  type AgentState,
  type AgentConnectionStatus,
  type TimelineStep,
  type ChatMessage,
  type SerializedDeal,
  type TimelineStatus,
  type ChatRole,
  type ChatStage,
  type DemoMode,
} from "@/lib/agentContext";
import { createInitialTimeline, updateTimelineStep } from "@/lib/agentTimeline";

interface AgentProviderProps {
  children: ReactNode;
}

const INITIAL_STATE: AgentState = {
  connectionStatus: "disconnected",
  sessionId: null,
  sessionToken: null,
  discovery: null,
  isExpanded: false,
  isChatExpanded: true,
  demoMode: "testnet", // Default to testnet for real transactions
  selectedStoreId: null,
  selectedProductId: null,
  timeline: createInitialTimeline(),
  messages: [],
  deal: null,
  errorMessage: null,
};

export function AgentProvider({ children }: AgentProviderProps) {
  const [state, setState] = useState<AgentState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  // === State update helpers ===
  const setConnectionStatus = useCallback((status: AgentConnectionStatus) => {
    setState((s) => ({ ...s, connectionStatus: status }));
  }, []);

  const setTimeline = useCallback((timeline: TimelineStep[]) => {
    setState((s) => ({ ...s, timeline }));
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setState((s) => ({ ...s, messages: [...s.messages, message] }));
  }, []);

  const setDeal = useCallback((deal: SerializedDeal | null) => {
    setState((s) => ({ ...s, deal }));
  }, []);

  const setError = useCallback((errorMessage: string | null) => {
    setState((s) => ({ ...s, errorMessage }));
  }, []);

  // === Actions ===
  const connect = useCallback(async (goal?: string) => {
    // Abort any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state but preserve demoMode
    setState((prev) => ({
      ...INITIAL_STATE,
      demoMode: prev.demoMode,
      isExpanded: true,
      isChatExpanded: true,
      connectionStatus: "discovering",
    }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Get current demoMode from state
    const currentMode = state.demoMode;

    try {
      // Build URL with parameters
      const params = new URLSearchParams();
      params.set("mode", currentMode); // Use selected demo mode
      params.set("checkoutMode", "auto"); // Auto settlement
      if (goal) params.set("goal", goal);

      const url = `/api/agent/stream?${params.toString()}`;

      setConnectionStatus("running");

      const response = await fetch(url, {
        signal: abortController.signal,
        headers: {
          Accept: "text/event-stream",
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let eventName = "message";
      let data = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const idx = buffer.indexOf("\n");
          if (idx === -1) break;

          const lineRaw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);

          const line = lineRaw.replace(/\r$/, "");

          if (line === "") {
            if (data !== "") {
              handleSseEvent(eventName, data);
            }
            eventName = "message";
            data = "";
            continue;
          }

          if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim();
            continue;
          }

          if (line.startsWith("data:")) {
            data += line.slice("data:".length).trimStart();
          }
        }
      }

      setConnectionStatus("completed");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Connection was aborted, don't show error
        return;
      }
      const message = err instanceof Error ? err.message : "连接失败";
      setError(message);
      setConnectionStatus("error");
    }
  }, [setConnectionStatus, setError, state.demoMode]);

  const handleSseEvent = useCallback((eventName: string, rawData: string) => {
    try {
      const data = JSON.parse(rawData);

      switch (eventName) {
        case "state": {
          setState((s) => {
            const newState = { ...s };
            if (data.sessionId) newState.sessionId = data.sessionId;
            if (data.selectedStoreId) newState.selectedStoreId = data.selectedStoreId;
            if (data.selectedProductId) newState.selectedProductId = data.selectedProductId;
            if (data.deal !== undefined) newState.deal = data.deal;
            if (data.running !== undefined && data.running) {
              newState.connectionStatus = "running";
            }
            return newState;
          });
          break;
        }

        case "timeline_step": {
          const step = data as {
            id: string;
            status?: TimelineStatus;
            detail?: string;
            txHash?: string;
          };
          setState((s) => ({
            ...s,
            timeline: updateTimelineStep(s.timeline, step.id, {
              status: step.status,
              detail: step.detail,
              txHash: step.txHash,
            }),
          }));
          break;
        }

        case "message": {
          const msg = data as {
            id: string;
            role: ChatRole;
            stage: ChatStage;
            speaker: string;
            content: string;
            ts: number;
          };
          addMessage({
            id: msg.id,
            role: msg.role,
            stage: msg.stage,
            speaker: msg.speaker,
            content: msg.content,
            ts: msg.ts,
          });
          break;
        }

        case "tool_call": {
          const tool = data as {
            id: string;
            stage: ChatStage;
            name: string;
            args: unknown;
            ts: number;
          };
          addMessage({
            id: tool.id,
            role: "tool",
            stage: tool.stage,
            speaker: "Tool",
            content: `调用工具: ${tool.name}`,
            ts: tool.ts,
            tool: {
              name: tool.name,
              args: tool.args,
            },
          });
          break;
        }

        case "tool_result": {
          const result = data as {
            id: string;
            result: unknown;
            ts: number;
          };
          // Update existing tool message with result
          setState((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === result.id && m.tool
                ? { ...m, tool: { ...m.tool, result: result.result } }
                : m
            ),
          }));
          break;
        }

        case "done": {
          setConnectionStatus("completed");
          break;
        }

        case "error": {
          const error = data as { message: string } | string;
          const message = typeof error === "string" ? error : error.message;
          setError(message);
          setConnectionStatus("error");
          break;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, [addMessage, setConnectionStatus, setError]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConnectionStatus("disconnected");
  }, [setConnectionStatus]);

  const toggleSidebar = useCallback(() => {
    setState((s) => ({ ...s, isExpanded: !s.isExpanded }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((s) => ({ ...s, isChatExpanded: !s.isChatExpanded }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  const setDemoMode = useCallback((mode: DemoMode) => {
    setState((s) => ({ ...s, demoMode: mode }));
  }, []);

  const contextValue = {
    ...state,
    connect,
    disconnect,
    toggleSidebar,
    toggleChat,
    reset,
    setDemoMode,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}
