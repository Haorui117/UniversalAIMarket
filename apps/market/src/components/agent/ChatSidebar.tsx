"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { clsx } from "clsx";
import { useAgent } from "@/lib/agentContext";
import { SellerChatCard } from "./SellerChatCard";

const MIN_WIDTH = 280;
const MAX_WIDTH = 450;
const DEFAULT_WIDTH = 320;

export function ChatSidebar() {
  const { sellerChats, connectionStatus } = useAgent();
  const [isExpanded, setIsExpanded] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDraggingRef = useRef(false);

  const isActive = connectionStatus !== "disconnected";

  // Auto-expand when chats appear
  useEffect(() => {
    if (sellerChats.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [sellerChats.length, isExpanded]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Toggle button when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={clsx(
            "fixed left-0 top-1/2 -translate-y-1/2 z-40",
            "flex items-center justify-center w-10 h-20 rounded-r-lg",
            "bg-[#0a0c14]/95 border border-l-0 border-white/10 backdrop-blur-xl",
            "text-white/60 hover:text-white hover:bg-white/5 transition-colors",
            !isActive && "opacity-50"
          )}
          title="打开聊天面板"
        >
          <div className="flex flex-col items-center gap-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {sellerChats.length > 0 && (
              <span className="text-[10px] font-medium text-emerald-400">
                {sellerChats.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Sidebar */}
      <aside
        style={{ width: `${width}px` }}
        className={clsx(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl transition-transform duration-300",
          isExpanded ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-indigo-500/50 active:bg-indigo-500/70 transition-colors"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-white">砍价对话</span>
            {sellerChats.length > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                {sellerChats.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {!isActive ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-white/5 p-3">
                <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/50">等待启动 Agent</p>
                <p className="mt-1 text-[10px] text-white/30">
                  启动后这里会显示砍价对话
                </p>
              </div>
            </div>
          ) : sellerChats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-white/5 p-3">
                <svg className="h-6 w-6 text-white/40 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/50">等待开始砍价...</p>
                <p className="mt-1 text-[10px] text-white/30">
                  每个商品会有独立的聊天卡片
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sellerChats.map((chat) => (
                <SellerChatCard key={`${chat.storeId}-${chat.productId}`} chat={chat} />
              ))}
            </div>
          )}
        </div>

        {/* Footer - Summary */}
        {sellerChats.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">
                {sellerChats.filter(c => c.status === "agreed").length} 成交 / {sellerChats.filter(c => c.status === "failed").length} 未成交
              </span>
              <span className="text-white/40">
                {sellerChats.filter(c => c.status === "negotiating").length > 0 && (
                  <span className="text-amber-400">砍价中...</span>
                )}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
