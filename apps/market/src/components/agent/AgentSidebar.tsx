"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useAgent } from "@/lib/agentContext";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentTimeline } from "./AgentTimeline";
import { AgentChatView } from "./AgentChatView";

type SidebarTab = "timeline" | "chat";

export function AgentSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("timeline");
  const {
    connectionStatus,
    isExpanded,
    toggleSidebar,
    deal,
    errorMessage,
    reset,
    messages,
    demoMode,
    setDemoMode,
  } = useAgent();

  const isDisconnected = connectionStatus === "disconnected";
  // Only count negotiate stage messages for the chat badge
  const chatCount = messages.filter(
    (m) => (m.role === "buyer" || m.role === "seller") && m.stage === "negotiate"
  ).length;

  return (
    <>
      {/* Backdrop (mobile) */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl transition-transform duration-300",
          isExpanded ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Agent 状态</span>
            <AgentStatusBadge status={connectionStatus} />
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-white/5">
          <span className="text-xs text-white/50">运行模式</span>
          <div className="flex rounded-lg bg-black/30 p-0.5">
            <button
              onClick={() => setDemoMode("simulate")}
              disabled={!isDisconnected}
              className={clsx(
                "px-3 py-1 text-xs rounded-md transition-all",
                demoMode === "simulate"
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-white/40 hover:text-white/60",
                !isDisconnected && "opacity-50 cursor-not-allowed"
              )}
            >
              模拟
            </button>
            <button
              onClick={() => setDemoMode("testnet")}
              disabled={!isDisconnected}
              className={clsx(
                "px-3 py-1 text-xs rounded-md transition-all",
                demoMode === "testnet"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-white/40 hover:text-white/60",
                !isDisconnected && "opacity-50 cursor-not-allowed"
              )}
            >
              Testnet
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!isDisconnected && (
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("timeline")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
                activeTab === "timeline"
                  ? "text-white border-b-2 border-indigo-500 bg-white/5"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              进度
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors relative",
                activeTab === "chat"
                  ? "text-white border-b-2 border-emerald-500 bg-white/5"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              对话
              {chatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center">
                  {chatCount > 9 ? "9+" : chatCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isDisconnected ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-white/5 p-4">
                <svg className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white/60">Agent 未启动</p>
                <p className="mt-1 text-xs text-white/40">
                  点击「启动 Agent」开始自动购物流程
                </p>
              </div>
            </div>
          ) : activeTab === "timeline" ? (
            <div className="space-y-6">
              {/* Error message */}
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-xs text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Timeline */}
              <AgentTimeline />

              {/* Deal info */}
              {deal && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
                    交易详情
                  </h3>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/50">Deal ID</span>
                        <span className="font-mono text-white/80">
                          {deal.dealId.slice(0, 10)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Token ID</span>
                        <span className="text-white/80">#{deal.tokenId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">价格</span>
                        <span className="text-emerald-400">
                          {(Number(deal.price) / 1e6).toFixed(2)} USDC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">截止时间</span>
                        <span className="text-white/80">
                          {new Date(Number(deal.deadline) * 1000).toLocaleString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AgentChatView />
          )}
        </div>

        {/* Footer */}
        {!isDisconnected && (
          <div className="border-t border-white/10 px-4 py-3">
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>重置</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
