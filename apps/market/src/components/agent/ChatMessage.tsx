"use client";

import { clsx } from "clsx";
import type { ChatMessage as ChatMessageType, ChatRole } from "@/lib/agentContext";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ROLE_CONFIG: Record<ChatRole, { bgColor: string; textColor: string; align: "left" | "right" }> = {
  buyer: { bgColor: "bg-indigo-500/20", textColor: "text-indigo-300", align: "right" },
  seller: { bgColor: "bg-emerald-500/20", textColor: "text-emerald-300", align: "left" },
  system: { bgColor: "bg-gray-500/20", textColor: "text-gray-300", align: "left" },
  tool: { bgColor: "bg-amber-500/10", textColor: "text-amber-300", align: "left" },
};

export function ChatMessage({ message }: ChatMessageProps) {
  const config = ROLE_CONFIG[message.role];
  const isBuyer = message.role === "buyer";

  return (
    <div
      className={clsx(
        "flex w-full animate-fade-in",
        isBuyer ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={clsx(
          "max-w-[85%] rounded-lg px-3 py-2",
          config.bgColor
        )}
      >
        {/* Speaker label */}
        <div className="mb-1 flex items-center gap-2">
          <span className={clsx("text-xs font-medium", config.textColor)}>
            {message.speaker}
          </span>
          {message.stage && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
              {message.stage}
            </span>
          )}
        </div>

        {/* Content */}
        <p className="whitespace-pre-wrap text-sm text-white/80">{message.content}</p>

        {/* Timestamp */}
        <div className="mt-1 text-right">
          <span className="text-[10px] text-white/30">
            {new Date(message.ts).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
