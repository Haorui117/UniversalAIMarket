"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { ToolCall } from "@/lib/agentContext";

interface ToolCallDisplayProps {
  tool: ToolCall;
  stage?: string;
  ts: number;
}

export function ToolCallDisplay({ tool, stage, ts }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = tool.result !== undefined;

  return (
    <div className="animate-fade-in rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20">
          <svg className="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </span>
        <span className="flex-1 font-mono text-xs text-amber-300">{tool.name}</span>
        {stage && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
            {stage}
          </span>
        )}
        {hasResult && (
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
            done
          </span>
        )}
        <svg
          className={clsx(
            "h-4 w-4 text-white/40 transition-transform",
            expanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Args */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Args</span>
            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-[11px] text-white/60">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {hasResult && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Result</span>
              <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-[11px] text-emerald-400/80">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-right">
            <span className="text-[10px] text-white/30">
              {new Date(ts).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
