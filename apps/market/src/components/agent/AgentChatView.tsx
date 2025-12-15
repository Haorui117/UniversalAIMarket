"use client";

import { useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useAgent } from "@/lib/agentContext";

export function AgentChatView() {
  const { messages } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter only negotiate stage buyer/seller messages (the actual agent-to-agent negotiation)
  const chatMessages = messages.filter(
    (msg) =>
      (msg.role === "buyer" || msg.role === "seller") &&
      msg.stage === "negotiate"
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (chatMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm text-white/40">暂无对话</p>
        <p className="text-xs text-white/30 mt-1">Agent 开始协商后会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-medium ring-2 ring-[#0a0c14]">
              B
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-medium ring-2 ring-[#0a0c14]">
              S
            </div>
          </div>
          <div>
            <span className="text-xs text-white/70">买家 Agent</span>
            <span className="text-white/30 mx-1">↔</span>
            <span className="text-xs text-white/70">卖家 Agent</span>
          </div>
        </div>
        <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
          {chatMessages.length} 条
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black/20 to-black/10 rounded-b-lg"
      >
        {chatMessages.map((msg) => {
          const isBuyer = msg.role === "buyer";

          return (
            <div
              key={msg.id}
              className={clsx(
                "flex animate-fade-in",
                isBuyer ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "flex items-end gap-2 max-w-[85%]",
                  isBuyer && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-medium shrink-0 shadow-lg",
                    isBuyer
                      ? "bg-gradient-to-br from-indigo-400 to-indigo-600"
                      : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                  )}
                >
                  {isBuyer ? "B" : "S"}
                </div>

                {/* Bubble */}
                <div
                  className={clsx(
                    "relative px-4 py-3 rounded-2xl shadow-lg",
                    isBuyer
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm"
                      : "bg-white/10 backdrop-blur-sm text-white/90 rounded-bl-sm border border-white/10"
                  )}
                >
                  {/* Speaker name */}
                  <div
                    className={clsx(
                      "text-[10px] mb-1 font-medium",
                      isBuyer ? "text-indigo-200" : "text-emerald-400"
                    )}
                  >
                    {msg.speaker}
                  </div>

                  {/* Content */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {/* Time */}
                  <div
                    className={clsx(
                      "text-[10px] mt-2 flex items-center gap-1",
                      isBuyer ? "text-indigo-200/60 justify-end" : "text-white/30"
                    )}
                  >
                    {new Date(msg.ts).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    {isBuyer && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
