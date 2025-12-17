"use client";

import { clsx } from "clsx";
import type { DealItem } from "@/lib/agentContext";

interface DealListProps {
  deals: DealItem[];
  onSettle?: (dealId: string) => void;
  currentSettlingDealId?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "待结算",
    bgColor: "bg-sky-500/20",
    textColor: "text-sky-400",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  settling: {
    label: "结算中...",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-400",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  },
  completed: {
    label: "已完成",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-400",
    icon: "M5 13l4 4L19 7",
  },
  failed: {
    label: "未成交",
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
    icon: "M6 18L18 6M6 6l12 12",
  },
};

function DealItemRow({ deal, onSettle, isSettling }: { deal: DealItem; onSettle?: (dealId: string) => void; isSettling: boolean }) {
  const config = STATUS_CONFIG[deal.status];
  const canSettle = deal.status === "pending" && deal.deal && !isSettling;

  return (
    <div className={clsx(
      "rounded-lg border border-white/10 bg-white/5 p-3 animate-fade-in",
      deal.status === "failed" && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/80 truncate">
              {deal.storeName}
            </span>
            <span className={clsx(
              "shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
              config.bgColor,
              config.textColor
            )}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
              </svg>
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-white/40 truncate">{deal.productName}</p>
        </div>
        <div className="text-right">
          <span className={clsx(
            "text-sm font-medium",
            deal.status === "failed" ? "text-gray-400" : "text-emerald-400"
          )}>
            {deal.priceUSDC}
          </span>
          <span className="text-xs text-white/40 ml-1">USDC</span>
        </div>
      </div>

      {/* Settle button for pending deals */}
      {canSettle && onSettle && (
        <button
          onClick={() => onSettle(deal.id)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          结算此订单
        </button>
      )}

      {/* Settling animation */}
      {deal.status === "settling" && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-amber-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          正在结算...
        </div>
      )}

      {/* Error message */}
      {deal.error && (
        <p className="mt-2 text-[10px] text-red-400">{deal.error}</p>
      )}
    </div>
  );
}

export function DealList({ deals, onSettle, currentSettlingDealId }: DealListProps) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-white/5 p-3 mb-3">
          <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-xs text-white/50">暂无 Deal</p>
        <p className="mt-1 text-[10px] text-white/30">
          成交或未成交的商品会显示在这里
        </p>
      </div>
    );
  }

  const pendingDeals = deals.filter(d => d.status === "pending");
  const settlingDeals = deals.filter(d => d.status === "settling");
  const completedDeals = deals.filter(d => d.status === "completed");
  const failedDeals = deals.filter(d => d.status === "failed");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-white/40">共 {deals.length} 个 Deal</span>
        <div className="flex items-center gap-2 text-[10px]">
          {pendingDeals.length > 0 && (
            <span className="text-sky-400">{pendingDeals.length} 待结算</span>
          )}
          {settlingDeals.length > 0 && (
            <span className="text-amber-400">{settlingDeals.length} 结算中</span>
          )}
          {completedDeals.length > 0 && (
            <span className="text-emerald-400">{completedDeals.length} 已完成</span>
          )}
          {failedDeals.length > 0 && (
            <span className="text-gray-400">{failedDeals.length} 未成交</span>
          )}
        </div>
      </div>

      {/* Deal list */}
      <div className="space-y-2">
        {/* Show settling deals first */}
        {settlingDeals.map(deal => (
          <DealItemRow
            key={deal.id}
            deal={deal}
            onSettle={onSettle}
            isSettling={deal.id === currentSettlingDealId}
          />
        ))}
        {/* Then pending deals */}
        {pendingDeals.map(deal => (
          <DealItemRow
            key={deal.id}
            deal={deal}
            onSettle={onSettle}
            isSettling={deal.id === currentSettlingDealId}
          />
        ))}
        {/* Then completed deals */}
        {completedDeals.map(deal => (
          <DealItemRow
            key={deal.id}
            deal={deal}
            onSettle={onSettle}
            isSettling={deal.id === currentSettlingDealId}
          />
        ))}
        {/* Failed deals last */}
        {failedDeals.map(deal => (
          <DealItemRow
            key={deal.id}
            deal={deal}
            onSettle={onSettle}
            isSettling={deal.id === currentSettlingDealId}
          />
        ))}
      </div>
    </div>
  );
}
