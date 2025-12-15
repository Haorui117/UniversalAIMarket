"use client";

import { useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useAgent } from "@/lib/agentContext";
import { ChatMessage } from "./ChatMessage";

export function AgentChatPanel() {
  const { messages, isChatExpanded, toggleChat } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isChatExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatExpanded]);

  return (
    <div className="flex flex-col">
      {/* Header (toggle button) */}
      <button
        onClick={toggleChat}
        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm text-white/70">对话记录</span>
          {messages.length > 0 && (
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
              {messages.length}
            </span>
          )}
        </div>
        <svg
          className={clsx(
            "h-4 w-4 text-white/40 transition-transform",
            isChatExpanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Chat messages */}
      {isChatExpanded && (
        <div
          ref={scrollRef}
          className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg bg-black/20 p-3"
        >
          {messages.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">暂无对话</p>
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}
        </div>
      )}
    </div>
  );
}
