"use client";

import { useAgent } from "@/lib/agentContext";
import { getProgressPercent } from "@/lib/agentTimeline";
import { TimelineStepItem } from "./TimelineStepItem";

export function AgentTimeline() {
  const { timeline } = useAgent();
  const progress = getProgressPercent(timeline);

  return (
    <div className="flex flex-col">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>进度</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline steps */}
      <div className="flex flex-col">
        {timeline.map((step, index) => (
          <TimelineStepItem
            key={step.id}
            step={step}
            isLast={index === timeline.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
