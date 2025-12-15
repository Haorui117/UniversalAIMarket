"use client";

import { clsx } from "clsx";
import type { AgentConnectionStatus } from "@/lib/agentContext";

interface AgentStatusBadgeProps {
  status: AgentConnectionStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  AgentConnectionStatus,
  { label: string; color: string; pulse: boolean }
> = {
  disconnected: { label: "未连接", color: "bg-gray-500", pulse: false },
  discovering: { label: "发现服务", color: "bg-yellow-500", pulse: true },
  authenticating: { label: "认证中", color: "bg-yellow-500", pulse: true },
  connected: { label: "已连接", color: "bg-green-500", pulse: false },
  running: { label: "运行中", color: "bg-blue-500", pulse: true },
  completed: { label: "已完成", color: "bg-emerald-500", pulse: false },
  error: { label: "错误", color: "bg-red-500", pulse: false },
};

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={clsx(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.color
            )}
          />
        )}
        <span
          className={clsx("relative inline-flex h-2.5 w-2.5 rounded-full", config.color)}
        />
      </span>
      <span className="text-xs text-white/70">{config.label}</span>
    </div>
  );
}
