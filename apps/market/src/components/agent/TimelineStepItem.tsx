"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { TimelineStep } from "@/lib/agentContext";
import { CHAIN_CONFIG, getExplorerUrl } from "@/lib/agentTimeline";

interface TimelineStepItemProps {
  step: TimelineStep;
  isLast?: boolean;
}

export function TimelineStepItem({ step, isLast }: TimelineStepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const chainConfig = CHAIN_CONFIG[step.chain];
  const hasContent = step.detail || step.txHash;
  const isClickable = hasContent && step.status !== "idle";

  return (
    <div className="flex gap-3">
      {/* Status indicator + vertical line */}
      <div className="flex flex-col items-center">
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          {step.status === "idle" && (
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white/20" />
          )}
          {step.status === "running" && (
            <>
              <span className="absolute h-4 w-4 animate-ping rounded-full bg-blue-500/50" />
              <span className="h-3 w-3 rounded-full bg-blue-500" />
            </>
          )}
          {step.status === "done" && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          {step.status === "error" && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
        </div>
        {!isLast && (
          <div
            className={clsx(
              "w-0.5 grow",
              step.status === "done" ? "bg-emerald-500/30" : "bg-white/10"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-4">
        {/* Header - clickable */}
        <button
          onClick={() => isClickable && setIsExpanded(!isExpanded)}
          disabled={!isClickable}
          className={clsx(
            "flex w-full items-center gap-2 text-left",
            isClickable && "cursor-pointer hover:opacity-80",
            !isClickable && "cursor-default"
          )}
        >
          <span
            className={clsx(
              "text-sm font-medium",
              step.status === "running" && "text-blue-400",
              step.status === "done" && "text-emerald-400",
              step.status === "error" && "text-red-400",
              step.status === "idle" && "text-white/50"
            )}
          >
            {step.title}
          </span>
          <span
            className={clsx(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              chainConfig.bgColor,
              chainConfig.color
            )}
          >
            {chainConfig.name}
          </span>
          {isClickable && (
            <svg
              className={clsx(
                "ml-auto h-4 w-4 text-white/30 transition-transform",
                isExpanded && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Summary (always visible when not expanded) */}
        {!isExpanded && step.detail && (
          <p className="mt-1 text-xs text-white/50">{step.detail}</p>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-2 space-y-2 animate-fade-in">
            {/* Detail */}
            {step.detail && (
              <p className="text-xs text-white/50">{step.detail}</p>
            )}

            {/* Transaction hash */}
            {step.txHash && step.chain !== "offchain" && (
              <a
                href={getExplorerUrl(step.chain, step.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <span className="font-mono">
                  {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)}
                </span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Transaction hash (when not expanded) */}
        {!isExpanded && step.txHash && step.chain !== "offchain" && (
          <a
            href={getExplorerUrl(step.chain, step.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
          >
            <span className="font-mono">
              {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)}
            </span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
