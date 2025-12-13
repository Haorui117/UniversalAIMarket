"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Cable,
  CircleCheck,
  CircleDashed,
  CircleX,
  Copy,
  Coins,
  Command,
  Layers,
  Maximize2,
  MessageSquareText,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  X,
} from "lucide-react";
import Button from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STORES, type InventoryStatus, type ProductKind } from "@/lib/catalog";
import { type Deal } from "@/lib/deal";
import { cn } from "@/lib/cn";

type DemoMode = "testnet" | "simulate";
type CheckoutMode = "auto" | "confirm";
type AgentEngine = "builtin" | "proxy";

type TimelineStatus = "idle" | "running" | "done" | "error";

type TimelineChain = "offchain" | "baseSepolia" | "zetaAthens" | "polygonAmoy";

interface TimelineItem {
  id: string;
  title: string;
  chain: TimelineChain;
  status: TimelineStatus;
  detail?: string;
  txHash?: string;
  ts: number;
}

type ChatRole = "buyer" | "seller" | "tool" | "system";

type ChatStage = "browse" | "negotiate" | "prepare" | "settle";

interface ToolCall {
  name: string;
  args: unknown;
  result?: unknown;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  stage?: ChatStage;
  speaker: string;
  content: string;
  ts: number;
  tool?: ToolCall;
}

interface PublicConfig {
  modeHint: DemoMode;
  accounts?: {
    buyer: string;
    seller: string;
  };
  contracts?: {
    baseGateway?: string;
    baseUSDC?: string;
    universalMarket?: string;
    polygonEscrow?: string;
    polygonNFT?: string;
  };
  missing: string[];
}

function now() {
  return Date.now();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}

function stringifyForDisplay(value: unknown, pretty: boolean) {
  try {
    return JSON.stringify(
      value,
      (_key, v) => (typeof v === "bigint" ? v.toString() : v),
      pretty ? 2 : 0
    );
  } catch {
    return String(value);
  }
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

function formatAddress(address?: string) {
  if (!address) return "-";
  if (!address.startsWith("0x") || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function parseSerializedDeal(raw: unknown): Deal | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const dealId = typeof obj.dealId === "string" ? obj.dealId : undefined;
  const buyer = typeof obj.buyer === "string" ? obj.buyer : undefined;
  const sellerBase = typeof obj.sellerBase === "string" ? obj.sellerBase : undefined;
  const polygonEscrow = typeof obj.polygonEscrow === "string" ? obj.polygonEscrow : undefined;
  const nft = typeof obj.nft === "string" ? obj.nft : undefined;
  const tokenIdRaw = obj.tokenId;
  const priceRaw = obj.price;
  const deadlineRaw = obj.deadline;

  if (!dealId || !buyer || !sellerBase || !polygonEscrow || !nft) return null;

  try {
    const tokenId =
      typeof tokenIdRaw === "bigint"
        ? tokenIdRaw
        : typeof tokenIdRaw === "number"
          ? BigInt(tokenIdRaw)
          : typeof tokenIdRaw === "string"
            ? BigInt(tokenIdRaw)
            : null;
    const price =
      typeof priceRaw === "bigint"
        ? priceRaw
        : typeof priceRaw === "number"
          ? BigInt(priceRaw)
          : typeof priceRaw === "string"
            ? BigInt(priceRaw)
            : null;
    const deadline =
      typeof deadlineRaw === "bigint"
        ? deadlineRaw
        : typeof deadlineRaw === "number"
          ? BigInt(deadlineRaw)
          : typeof deadlineRaw === "string"
            ? BigInt(deadlineRaw)
            : null;

    if (tokenId === null || price === null || deadline === null) return null;

    return {
      dealId,
      buyer,
      sellerBase,
      polygonEscrow,
      nft,
      tokenId,
      price,
      deadline,
    };
  } catch {
    return null;
  }
}

function formatOrders(orders: number) {
  if (orders >= 10000) return `${(orders / 10000).toFixed(1)}万`;
  if (orders >= 1000) return `${(orders / 1000).toFixed(1)}k`;
  return `${orders}`;
}

function kindLabel(kind: ProductKind) {
  return kind === "physical" ? "实物" : "数字商品";
}

function inventoryLabel(status: InventoryStatus) {
  switch (status) {
    case "in_stock":
      return "库存充足";
    case "limited":
      return "限量";
    case "preorder":
      return "预售";
    default:
      return status;
  }
}

type NormalizedChatStage = ChatStage | "other";

function normalizeChatStage(stage: ChatStage | undefined): NormalizedChatStage {
  return stage ?? "other";
}

function chatStageLabel(stage: NormalizedChatStage) {
  switch (stage) {
    case "browse":
      return "逛市场";
    case "negotiate":
      return "协商条款";
    case "prepare":
      return "生成 Deal";
    case "settle":
      return "跨链结算";
    default:
      return "对话";
  }
}

function chatStageBadgeClass(stage: NormalizedChatStage) {
  switch (stage) {
    case "browse":
      return "border-indigo-300/20 bg-indigo-500/10 text-indigo-100";
    case "negotiate":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
    case "prepare":
      return "border-fuchsia-300/20 bg-fuchsia-500/10 text-fuchsia-100";
    case "settle":
      return "border-amber-300/20 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function chatStageIcon(stage: NormalizedChatStage) {
  switch (stage) {
    case "browse":
      return <Search className="h-3.5 w-3.5" />;
    case "negotiate":
      return <MessageSquareText className="h-3.5 w-3.5" />;
    case "prepare":
      return <Layers className="h-3.5 w-3.5" />;
    case "settle":
      return <Cable className="h-3.5 w-3.5" />;
    default:
      return <Sparkles className="h-3.5 w-3.5" />;
  }
}

function scoreText(haystack: string, needle: string) {
  const query = needle.toLowerCase();
  const tokens = new Set<string>();

  for (const t of query.split(/[\s,，。！？!?.；;]+/g).map((v) => v.trim()).filter(Boolean)) {
    tokens.add(t);
  }

  const segments = query.match(/[a-z0-9]+|[\u4e00-\u9fff]+/g) ?? [];
  for (const seg of segments) {
    if (/^[\u4e00-\u9fff]+$/.test(seg) && seg.length >= 2) {
      tokens.add(seg);
      for (let i = 0; i < seg.length - 1; i++) {
        tokens.add(seg.slice(i, i + 2));
      }
      continue;
    }
    tokens.add(seg);
  }

  const terms = Array.from(tokens)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2);
  const content = haystack.toLowerCase();
  return terms.reduce((sum, t) => sum + (content.includes(t) ? 1 : 0), 0);
}

function chainIcon(chain: TimelineChain) {
  switch (chain) {
    case "baseSepolia":
      return <Coins className="h-4 w-4" />;
    case "zetaAthens":
      return <Cable className="h-4 w-4" />;
    case "polygonAmoy":
      return <Layers className="h-4 w-4" />;
    default:
      return <Command className="h-4 w-4" />;
  }
}

function chainLabel(chain: TimelineChain) {
  switch (chain) {
    case "baseSepolia":
      return "Base Sepolia";
    case "zetaAthens":
      return "Zeta Athens";
    case "polygonAmoy":
      return "Polygon Amoy";
    default:
      return "链下";
  }
}

function statusIcon(status: TimelineStatus) {
  switch (status) {
    case "done":
      return <CircleCheck className="h-4 w-4 text-emerald-300" />;
    case "error":
      return <CircleX className="h-4 w-4 text-rose-300" />;
    case "running":
      return <CircleDashed className="h-4 w-4 text-indigo-300 animate-spin" />;
    default:
      return <CircleDashed className="h-4 w-4 text-white/30" />;
  }
}

function startOfDemoTimeline() {
  const t = now();
  return [
    {
      id: "browse",
      title: "买家 Agent 浏览店铺",
      chain: "offchain",
      status: "idle",
      ts: t,
    },
    {
      id: "negotiate",
      title: "买家 Agent 与卖家 Agent 协商",
      chain: "offchain",
      status: "idle",
      ts: t,
    },
    {
      id: "prepare",
      title: "生成 Deal 并编码 Payload",
      chain: "offchain",
      status: "idle",
      ts: t,
    },
    {
      id: "confirm",
      title: "确认并发起结算",
      chain: "offchain",
      status: "idle",
      ts: t,
    },
    {
      id: "approve",
      title: "授权 USDC 支付",
      chain: "baseSepolia",
      status: "idle",
      ts: t,
    },
    {
      id: "deposit",
      title: "Base 发起 depositAndCall（付款）",
      chain: "baseSepolia",
      status: "idle",
      ts: t,
    },
    {
      id: "orchestrate",
      title: "ZetaChain 编排（支付 + 交付）",
      chain: "zetaAthens",
      status: "idle",
      ts: t,
    },
    {
      id: "deliver",
      title: "Polygon 托管合约释放 NFT / 收据",
      chain: "polygonAmoy",
      status: "idle",
      ts: t,
    },
  ] satisfies TimelineItem[];
}

export default function DemoApp() {
  const [mode, setMode] = React.useState<DemoMode>("testnet");
  const [config, setConfig] = React.useState<PublicConfig>({
    modeHint: "testnet",
    missing: [],
  });

  const [marketModalOpen, setMarketModalOpen] = React.useState(false);
  const [chatModalOpen, setChatModalOpen] = React.useState(false);
  const [toolModal, setToolModal] = React.useState<{
    name: string;
    ts: number;
    stage?: ChatStage;
    args: unknown;
    result?: unknown;
  } | null>(null);
  const [toolModalMaximized, setToolModalMaximized] = React.useState(false);
  const chatScrollEmbeddedRef = React.useRef<HTMLDivElement | null>(null);

  const [chatView, setChatView] = React.useState<"process" | "dialogue">("process");
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "ok" | "err">("idle");

  const [goal, setGoal] = React.useState(
    "帮我在这个 AI 电商里找一个 100 USDC 以内的酷炫商品并购买。要求：卖家在 Base 收到 USDC，我在 Polygon 收到 NFT（或收据）。"
  );
  const [buyerNote, setBuyerNote] = React.useState("");
  const [checkoutMode, setCheckoutMode] = React.useState<CheckoutMode>("confirm");
  const [agentEngine, setAgentEngine] = React.useState<AgentEngine>("builtin");
  const [agentUpstream, setAgentUpstream] = React.useState("http://localhost:8080/api/agent/stream");
  const [agentSessionId, setAgentSessionId] = React.useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = React.useState(false);
  const agentSourceRef = React.useRef<EventSource | null>(null);

  const [marketQuery, setMarketQuery] = React.useState("");
  const [marketKind, setMarketKind] = React.useState<"all" | ProductKind>("all");

  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(STORES[0].id);
  const [selectedProductId, setSelectedProductId] = React.useState<string>(STORES[0].products[0].id);

  const selectedStore = React.useMemo(
    () => STORES.find((s) => s.id === selectedStoreId) ?? STORES[0],
    [selectedStoreId]
  );
  const selectedProduct = React.useMemo(
    () =>
      selectedStore.products.find((p) => p.id === selectedProductId) ??
      selectedStore.products[0],
    [selectedStore, selectedProductId]
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineItem[]>(startOfDemoTimeline());
  const [running, setRunning] = React.useState(false);
  const [deal, setDeal] = React.useState<Deal | null>(null);
  const [settling, setSettling] = React.useState(false);

  const visibleChatMessages = React.useMemo(() => {
    if (chatView === "dialogue") {
      return messages.filter((m) => m.role === "buyer" || m.role === "seller");
    }
    return messages;
  }, [messages, chatView]);

  const chatRows = React.useMemo(() => {
    const rows: Array<
      | { kind: "stage"; id: string; stage: NormalizedChatStage }
      | { kind: "message"; id: string; message: ChatMessage }
    > = [];

    let lastStage: NormalizedChatStage | null = null;
    for (const message of visibleChatMessages) {
      const stage = normalizeChatStage(message.stage);
      if (stage !== lastStage) {
        rows.push({ kind: "stage", id: `stage:${stage}:${message.id}`, stage });
        lastStage = stage;
      }
      rows.push({ kind: "message", id: message.id, message });
    }
    return rows;
  }, [visibleChatMessages]);

  const configReady = config.missing.length === 0;
  const liveOnchain = mode === "testnet" && configReady;

  React.useEffect(() => {
    const overlayOpen = marketModalOpen || chatModalOpen || toolModal !== null;
    if (!overlayOpen) return;

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        setMarketModalOpen(false);
        setChatModalOpen(false);
        setToolModal(null);
        setToolModalMaximized(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [marketModalOpen, chatModalOpen, toolModal]);

  React.useEffect(() => {
    if (!autoScroll) return;
    const el = chatScrollEmbeddedRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!nearBottom && messages.length > 1) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 2 ? "smooth" : "auto" });
  }, [messages, chatView, autoScroll, chatModalOpen]);

  React.useEffect(() => {
    if (copyStatus === "idle") return;
    const timer = window.setTimeout(() => setCopyStatus("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  React.useEffect(() => {
    if (!chatModalOpen) return;
    setChatView("process");
  }, [chatModalOpen]);

  React.useEffect(() => {
    return () => {
      agentSourceRef.current?.close();
      agentSourceRef.current = null;
    };
  }, []);

  const visibleStores = React.useMemo(() => {
    const query = marketQuery.trim();
    return STORES.filter((store) => {
      const kindOk =
        marketKind === "all" || store.products.some((p) => p.kind === marketKind);
      if (!kindOk) return false;
      if (!query) return true;

      const haystack = `${store.name} ${store.tagline} ${store.location} ${store.categories.join(" ")} ${store.products
        .map((p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.highlights.join(" ")}`)
        .join(" ")}`;
      return scoreText(haystack, query) > 0;
    });
  }, [marketQuery, marketKind]);

  React.useEffect(() => {
    if (visibleStores.length === 0) return;
    if (!visibleStores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(visibleStores[0].id);
      setSelectedProductId(visibleStores[0].products[0].id);
    }
  }, [visibleStores, selectedStoreId]);

  const visibleProducts = React.useMemo(() => {
    const query = marketQuery.trim();
    let products = selectedStore.products;
    if (marketKind !== "all") products = products.filter((p) => p.kind === marketKind);
    if (!query) return products;
    return products.filter((p) => {
      const haystack = `${p.name} ${p.description} ${p.tags.join(" ")} ${p.highlights.join(" ")}`;
      return scoreText(haystack, query) > 0;
    });
  }, [marketQuery, marketKind, selectedStore.products]);

  React.useEffect(() => {
    if (visibleProducts.length === 0) return;
    if (!visibleProducts.some((p) => p.id === selectedProductId)) {
      setSelectedProductId(visibleProducts[0].id);
    }
  }, [visibleProducts, selectedProductId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PublicConfig;
        if (cancelled) return;
        setConfig(json);
        setMode(json.modeHint);
      } catch {
        if (cancelled) return;
        setConfig({ modeHint: "simulate", missing: ["API_CONFIG_UNAVAILABLE"] });
        setMode("simulate");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pushMessage(next: Omit<ChatMessage, "id" | "ts"> & Partial<Pick<ChatMessage, "id" | "ts">>) {
    const msg: ChatMessage = {
      ...next,
      id: next.id ?? crypto.randomUUID(),
      ts: next.ts ?? now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }

  function setToolResult(messageId: string, result: unknown) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, tool: { ...m.tool!, result } } : m))
    );
  }

  function updateTimeline(id: string, patch: Partial<TimelineItem>) {
    setTimeline((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              ts: now(),
            }
          : t
      )
    );
  }

  function resetDemo() {
    agentSourceRef.current?.close();
    agentSourceRef.current = null;
    setRunning(false);
    setSettling(false);
    setAwaitingConfirm(false);
    setAgentSessionId(null);
    setMessages([]);
    setTimeline(startOfDemoTimeline());
    setDeal(null);
    setToolModal(null);
    setToolModalMaximized(false);
    setChatModalOpen(false);
    setCopyStatus("idle");
  }

  function buildTranscript(items: ChatMessage[]) {
    const lines: string[] = [];

    lines.push("通用 AI 市场 Demo 记录");
    lines.push(`模式：${mode === "testnet" ? "测试网" : "模拟"} | 视图：${chatView === "process" ? "流程" : "对话"}`);
    lines.push(`店铺：${selectedStore.name} | 商品：${selectedProduct.name} | 价格：${selectedProduct.priceUSDC} USDC`);
    if (deal) lines.push(`dealId：${deal.dealId}`);
    lines.push("");

    let lastStage: NormalizedChatStage | null = null;
    for (const m of items) {
      const stage = normalizeChatStage(m.stage);
      if (stage !== lastStage) {
        lines.push(`\n== ${chatStageLabel(stage)} ==`);
        lastStage = stage;
      }

      const stamp = formatTime(m.ts);
      if (m.role === "tool" && m.tool) {
        lines.push(`[${stamp}] [tool] ${m.tool.name}`);
        lines.push(`args: ${stringifyForDisplay(m.tool.args, true)}`);
        lines.push(`result: ${stringifyForDisplay(m.tool.result ?? null, true)}`);
        continue;
      }

      lines.push(`[${stamp}] ${m.speaker}: ${m.content}`);
    }

    return lines.join("\n");
  }

  async function copyTranscript() {
    try {
      const text = buildTranscript(visibleChatMessages);
      await navigator.clipboard.writeText(text);
      setCopyStatus("ok");
    } catch {
      setCopyStatus("err");
    }
  }

  function renderMarketplacePanel(variant: "embedded" | "modal") {
    const isModal = variant === "modal";
    const maxHeightClass = isModal ? "max-h-[72vh]" : "max-h-[640px]";

    const storePanel = (
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-white/70">店铺</div>
          <Badge className="bg-white/5 text-white/70">{visibleStores.length}</Badge>
        </div>
        {visibleStores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
            没有匹配的店铺，试试换个关键词或切换筛选。
          </div>
        ) : (
          <div className="grid gap-2">
            {visibleStores.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  setSelectedStoreId(store.id);
                  setSelectedProductId(store.products[0].id);
                }}
                className={cn(
                  "group w-full rounded-2xl border px-3 py-3 text-left transition",
                  store.id === selectedStoreId
                    ? "border-indigo-400/30 bg-indigo-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{store.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-white/70">{store.tagline}</div>
                  </div>
                  <Badge className="bg-white/5 text-white/70">{store.sellerAgentName}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {store.verified ? (
                    <Badge className="border-emerald-300/20 bg-emerald-500/15 text-emerald-100">
                      已认证
                    </Badge>
                  ) : (
                    <Badge className="border-white/10 bg-black/15 text-white/70">未认证</Badge>
                  )}
                  <Badge className="border-white/10 bg-black/15 text-white/70">
                    评分 {store.rating.toFixed(1)}
                  </Badge>
                  <Badge className="border-white/10 bg-black/15 text-white/70">
                    订单 {formatOrders(store.orders)}
                  </Badge>
                  <Badge className="border-white/10 bg-black/15 text-white/70">
                    响应 {store.responseMins} 分钟
                  </Badge>
                  <Badge className="border-white/10 bg-black/15 text-white/70">{store.location}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {store.categories.slice(0, 4).map((c) => (
                    <Badge key={c} className="border-white/10 bg-black/15 text-white/70">
                      {c}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    const productPanel = (
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-white/70">商品</div>
          <Badge className="bg-white/5 text-white/70">{visibleProducts.length}</Badge>
        </div>
        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
            这个店铺没有匹配的商品，试试换个关键词或切换筛选。
          </div>
        ) : (
          <div className="grid gap-2">
            {visibleProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-3 text-left transition",
                  p.id === selectedProductId
                    ? "border-emerald-400/25 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <Badge className="bg-white/5 text-white/75">{p.priceUSDC} USDC</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span>
                    {kindLabel(p.kind)} | Token #{p.tokenId}
                  </span>
                  <Badge className="border-white/10 bg-black/15 text-white/70">
                    {inventoryLabel(p.inventory)}
                  </Badge>
                  <Badge className="border-white/10 bg-black/15 text-white/70">{p.leadTime}</Badge>
                  {p.demoReady ? (
                    <Badge className="border-emerald-300/20 bg-emerald-500/15 text-emerald-100">
                      可上链
                    </Badge>
                  ) : (
                    <Badge className="border-white/10 bg-black/15 text-white/70">模拟</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    const selectedProductPanel = (
      <Card className="border-white/10 bg-black/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-white/75" />
            当前商品
          </CardTitle>
          <CardDescription>{selectedProduct.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-indigo-500/12 text-indigo-100 border-indigo-300/20">
              {selectedProduct.kind === "physical" ? "收据 NFT" : "NFT 交付"}
            </Badge>
            <Badge className="bg-white/5 text-white/75">Token #{selectedProduct.tokenId}</Badge>
            <Badge className="bg-white/5 text-white/75">{selectedProduct.priceUSDC} USDC</Badge>
            <Badge className="bg-white/5 text-white/75">{inventoryLabel(selectedProduct.inventory)}</Badge>
            {selectedProduct.demoReady ? (
              <Badge className="border-emerald-300/20 bg-emerald-500/15 text-emerald-100">可上链</Badge>
            ) : (
              <Badge className="bg-white/5 text-white/75">模拟</Badge>
            )}
          </div>
          <div className="text-xs text-white/70">{selectedProduct.leadTime}</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedProduct.tags.slice(0, 8).map((tag) => (
              <Badge key={tag} className="border-white/10 bg-black/15 text-white/70">
                {tag}
              </Badge>
            ))}
          </div>
          {liveOnchain && !selectedProduct.demoReady ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-100">
              提示：测试网实盘建议选择标记为「可上链」的商品（否则请切换到「模拟」模式）。
            </div>
          ) : null}
          <ul className="space-y-1 text-sm text-white/75">
            {selectedProduct.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-300/70" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );

    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-white/80" />
                电商市场
              </CardTitle>
              <CardDescription>店铺、商品与交付方式。</CardDescription>
            </div>
            {!isModal ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMarketModalOpen(true)}
                title="弹出查看市场"
              >
                <Maximize2 className="h-4 w-4" />
                弹出
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4 overflow-auto", maxHeightClass)}>
          <div className="grid gap-2">
            <Input
              value={marketQuery}
              onChange={(e) => setMarketQuery(e.target.value)}
            placeholder="搜索店铺 / 商品 / 标签..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={marketKind === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMarketKind("all")}
            >
              全部
            </Button>
            <Button
              variant={marketKind === "digital" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMarketKind("digital")}
            >
              数字商品
            </Button>
            <Button
              variant={marketKind === "physical" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMarketKind("physical")}
            >
              实物
            </Button>
              <Badge className="bg-white/5 text-white/70">匹配店铺 {visibleStores.length}</Badge>
            </div>
          </div>

          {isModal ? (
            <div className="grid gap-4 md:grid-cols-[320px_1fr]">
              <div className="space-y-4">{storePanel}</div>
              <div className="space-y-4">
                {productPanel}
                {selectedProductPanel}
              </div>
            </div>
          ) : (
            <>
              {storePanel}
              {productPanel}
              {selectedProductPanel}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  async function runBuyerAgent() {
    if (running || settling) return;

    agentSourceRef.current?.close();
    agentSourceRef.current = null;

    setAgentSessionId(null);
    setAwaitingConfirm(false);
    setRunning(true);
    setSettling(false);
    setDeal(null);
    setTimeline(startOfDemoTimeline());
    setMessages([]);
    setCopyStatus("idle");

    const qs = new URLSearchParams();
    qs.set("engine", agentEngine);
    qs.set("mode", mode);
    qs.set("checkoutMode", checkoutMode);
    qs.set("goal", goal);
    if (buyerNote.trim()) qs.set("buyerNote", buyerNote.trim());
    if (agentEngine === "proxy" && agentUpstream.trim()) qs.set("upstream", agentUpstream.trim());

    const source = new EventSource(`/api/agent/stream?${qs.toString()}`);
    agentSourceRef.current = source;

    const close = () => {
      source.close();
      if (agentSourceRef.current === source) agentSourceRef.current = null;
    };

    const fail = (message?: string) => {
      if (message) {
        pushMessage({
          role: "system",
          stage: "settle",
          speaker: "系统",
          content: message,
        });
      }
      setRunning(false);
      setSettling(false);
      setAwaitingConfirm(false);
      close();
    };

    source.addEventListener("state", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as Partial<{
          selectedStoreId: string;
          selectedProductId: string;
          deal: unknown;
          running: boolean;
          settling: boolean;
          awaitingConfirm: boolean;
          sessionId: string;
        }>;

        if (typeof data.sessionId === "string" && data.sessionId) setAgentSessionId(data.sessionId);
        if (typeof data.selectedStoreId === "string") setSelectedStoreId(data.selectedStoreId);
        if (typeof data.selectedProductId === "string") setSelectedProductId(data.selectedProductId);
        if ("deal" in data) {
          const parsed = data.deal === null ? null : parseSerializedDeal(data.deal);
          setDeal(parsed);
        }
        if (typeof data.running === "boolean") setRunning(data.running);
        if (typeof data.settling === "boolean") setSettling(data.settling);
        if (typeof data.awaitingConfirm === "boolean") setAwaitingConfirm(data.awaitingConfirm);
      } catch {
        // ignore
      }
    });

    source.addEventListener("timeline_step", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as Partial<TimelineItem> & { id: string };
        updateTimeline(data.id, data);
      } catch {
        // ignore
      }
    });

    source.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          id: string;
          role: "buyer" | "seller" | "system";
          stage: ChatStage;
          speaker: string;
          content: string;
          ts: number;
        };
        pushMessage({
          id: data.id,
          ts: data.ts,
          role: data.role,
          stage: data.stage,
          speaker: data.speaker,
          content: data.content,
        });
      } catch {
        // ignore
      }
    });

    source.addEventListener("tool_call", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          id: string;
          stage: ChatStage;
          name: string;
          args: unknown;
          ts: number;
        };
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            role: "tool",
            stage: data.stage,
            speaker: "tool",
            content: "",
            ts: data.ts,
            tool: { name: data.name, args: data.args },
          },
        ]);
      } catch {
        // ignore
      }
    });

    source.addEventListener("tool_result", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as { id: string; result: unknown };
        setToolResult(data.id, data.result);
      } catch {
        // ignore
      }
    });

    source.addEventListener("done", () => {
      close();
      setRunning(false);
      setSettling(false);
      setAwaitingConfirm(false);
    });

    source.addEventListener("error", (evt) => {
      const raw = (evt as MessageEvent).data;
      if (!raw) {
        fail("Agent 事件流连接中断。");
        return;
      }
      try {
        const data = JSON.parse(raw) as { message?: string };
        fail(data.message || "Agent 执行失败。");
      } catch {
        fail(typeof raw === "string" ? raw : "Agent 执行失败。");
      }
    });
  }

  async function confirmSettlement() {
    if (!agentSessionId || !awaitingConfirm || settling || running) return;
    try {
      const res = await fetch("/api/agent/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: agentSessionId, action: "confirm_settlement" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !json?.ok) throw new Error("确认失败，请重试。");
    } catch (err) {
      const message = err instanceof Error ? err.message : "确认失败，请重试。";
      pushMessage({ role: "system", stage: "settle", speaker: "系统", content: message });
      setAwaitingConfirm(true);
    }
  }

  const headerBadges = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="bg-indigo-500/15 text-indigo-100 border-indigo-300/20">
        Base Sepolia（付款）
      </Badge>
      <Badge className="bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-300/20">
        Zeta Athens（编排）
      </Badge>
      <Badge className="bg-emerald-500/15 text-emerald-100 border-emerald-300/20">
        Polygon Amoy（交付）
      </Badge>
    </div>
  );

  return (
    <div className="min-h-screen bg-hero text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 border border-white/10">
              <Sparkles className="h-5 w-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">通用 AI 市场</h1>
                <Badge
                  className={cn(
                    "border-white/10 bg-white/5 text-white/75",
                    !configReady && "border-rose-400/20 bg-rose-500/10 text-rose-100"
                  )}
                >
                  {mode === "testnet" ? "测试网" : "模拟"}
                </Badge>
              </div>
              <p className="text-sm text-white/70">
                买家 Agent 与卖家 Agent 协商后，由 ZetaChain 一次性完成跨链支付与交付。
              </p>
              <div className="mt-2">{headerBadges}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <Button
                variant={mode === "testnet" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode("testnet")}
                disabled={!configReady}
                title={!configReady ? `缺少环境变量：${config.missing.join(", ")}` : undefined}
              >
                <Coins className="h-4 w-4" />
                测试网实盘
              </Button>
              <Button
                variant={mode === "simulate" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMode("simulate")}
              >
                <Command className="h-4 w-4" />
                模拟
              </Button>
              <Button variant="ghost" size="sm" onClick={resetDemo}>
                重置
              </Button>
            </div>
            <div className="text-xs text-white/60">
              买家：<span className="font-mono">{formatAddress(config.accounts?.buyer)}</span> | 卖家：{" "}
              <span className="font-mono">{formatAddress(config.accounts?.seller)}</span>
            </div>
          </div>
        </header>

        {!configReady && (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="font-medium">测试网配置未完成</div>
            <div className="mt-1 text-rose-100/80">
              缺少环境变量：<span className="font-mono">{config.missing.join(", ")}</span>。你仍可以使用{" "}
              <span className="font-medium">模拟</span> 模式。
            </div>
          </div>
        )}

        <main className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr_420px]">
          {renderMarketplacePanel("embedded")}

          <div className={cn(chatModalOpen && "fixed inset-0 z-50 p-4")}>
            <div className={cn(chatModalOpen && "mx-auto h-full max-w-6xl")}>
              <Card className={cn("overflow-hidden", chatModalOpen && "flex h-full flex-col")}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-white/80" />
                  Agent 对话（可观测）
                </CardTitle>
                <CardDescription>买家 Agent 先浏览商品，再与卖家 Agent 对话协商。</CardDescription>
              </div>
              {chatModalOpen ? (
                <Button variant="secondary" size="sm" onClick={() => setChatModalOpen(false)}>
                  <X className="h-4 w-4" />
                  关闭
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChatModalOpen(true)}
                  title="放大查看对话"
                >
                  <Maximize2 className="h-4 w-4" />
                  放大
                </Button>
              )}
            </CardHeader>
            <CardContent
              className={cn(
                chatModalOpen
                  ? "grid flex-1 min-h-0 grid-cols-1 grid-rows-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]"
                  : "flex h-[640px] flex-col gap-3"
              )}
            >
              <div
                className={cn(
                  "grid gap-2",
                  chatModalOpen && "min-h-0 overflow-auto rounded-2xl border border-white/10 bg-black/10 p-3"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-white/70">买家 Agent 需求</div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={runBuyerAgent} disabled={running || settling}>
                      <Search className="h-4 w-4" />
                      开始逛
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={confirmSettlement}
                      disabled={
                        !deal ||
                        settling ||
                        running ||
                        !awaitingConfirm ||
                        (mode === "testnet" && (!configReady || !selectedProduct.demoReady))
                      }
                      title={
                        mode === "testnet" && deal && !selectedProduct.demoReady
                          ? "该商品仅支持模拟模式"
                          : !awaitingConfirm
                            ? checkoutMode === "auto"
                              ? "全自动模式下会自动结算"
                              : "等待 Agent 生成订单并进入确认阶段"
                            : undefined
                      }
                    >
                      <Send className="h-4 w-4" />
                      {awaitingConfirm ? "确认结算" : "发起结算"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-white/70">
                      结算模式：
                      <span className="ml-1 font-medium text-white">
                        {checkoutMode === "auto" ? "全自动（Agent 发起）" : "需确认（你点结算）"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                      <Button
                        variant={checkoutMode === "auto" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCheckoutMode("auto")}
                      >
                        全自动
                      </Button>
                      <Button
                        variant={checkoutMode === "confirm" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCheckoutMode("confirm")}
                      >
                        需确认
                      </Button>
                    </div>
                  </div>
                  <div className="text-[11px] text-white/60">
                    {checkoutMode === "auto"
                      ? "订单生成后自动调用结算工具（演示更丝滑）。"
                      : "订单生成后等待你点击「发起结算」再继续。"}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-white/70">
                      Agent 引擎：
                      <span className="ml-1 font-medium text-white">
                        {agentEngine === "builtin" ? "内置 Demo（本项目）" : "外部 LangChain（本机）"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                      <Button
                        variant={agentEngine === "builtin" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setAgentEngine("builtin")}
                        disabled={running || settling}
                      >
                        内置
                      </Button>
                      <Button
                        variant={agentEngine === "proxy" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setAgentEngine("proxy")}
                        disabled={running || settling}
                      >
                        外部
                      </Button>
                    </div>
                  </div>
                  {agentEngine === "proxy" ? (
                    <Input
                      value={agentUpstream}
                      onChange={(e) => setAgentUpstream(e.target.value)}
                      placeholder="http://localhost:8080/api/agent/stream"
                      disabled={running || settling}
                    />
                  ) : (
                    <div className="text-[11px] text-white/60">
                      外部 Agent 只需输出同样的 SSE 事件协议，并可调用 `/api/agent/tool` 执行工具。
                    </div>
                  )}
                </div>
                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} />
                <Input
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder="可选：补充备注（收货偏好/预算等）"
                />
              </div>

              <div
                className={cn(
                  "min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/15",
                  chatModalOpen ? "h-full" : "flex-1"
                )}
              >
                <div className="flex h-full flex-col">
                  <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-indigo-200" />
                      买家 Agent
                      <span className="text-white/30">|</span>
                      <Bot className="h-4 w-4 text-emerald-200" />
                      {selectedStore.sellerAgentName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
                        <Button
                          variant={chatView === "dialogue" ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => setChatView("dialogue")}
                        >
                          对话
                        </Button>
                        <Button
                          variant={chatView === "process" ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => setChatView("process")}
                        >
                          流程
                        </Button>
                      </div>
                      <Button
                        variant={autoScroll ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setAutoScroll((v) => !v)}
                        title={autoScroll ? "自动跟随最新消息" : "已暂停自动滚动"}
                      >
                        {autoScroll ? (
                          <CircleCheck className="h-4 w-4" />
                        ) : (
                          <CircleDashed className="h-4 w-4" />
                        )}
                        {autoScroll ? "跟随" : "暂停"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyTranscript}
                        disabled={visibleChatMessages.length === 0}
                      >
                        <Copy className="h-4 w-4" />
                        复制
                      </Button>
                      {copyStatus === "ok" ? (
                        <Badge className="border-emerald-300/20 bg-emerald-500/15 text-emerald-100">
                          已复制
                        </Badge>
                      ) : copyStatus === "err" ? (
                        <Badge className="border-rose-400/20 bg-rose-500/10 text-rose-100">
                          复制失败
                        </Badge>
                      ) : null}
                      <Badge className="bg-white/5 text-white/70">
                        订单：{" "}
                        <span className="font-mono">
                          {deal ? `${deal.dealId.slice(0, 6)}...${deal.dealId.slice(-4)}` : "-"}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <div ref={chatScrollEmbeddedRef} className="flex-1 min-h-0 overflow-auto p-4">
                    <AnimatePresence initial={false}>
                      {visibleChatMessages.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid place-items-center py-16 text-center text-sm text-white/60"
                        >
                          <div className="max-w-md">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 border border-white/10">
                              <Sparkles className="h-5 w-5 text-indigo-200" />
                            </div>
                            <div className="mt-4 font-medium text-white">
                              {messages.length === 0
                                ? "点击「开始逛」启动买家 Agent"
                                : "当前视图没有可显示的对话消息"}
                            </div>
                            <div className="mt-2">
                              {messages.length === 0
                                ? "评委将看到：意图 -> 工具调用 -> 跨链结算时间线（Base -> ZetaChain -> Polygon）。"
                                : "切换到「流程」可查看工具/系统消息，或继续推进对话。"}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          {chatView === "process" ? (
                            <div className="sticky top-0 z-10 hidden md:grid md:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)] md:gap-4 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70 backdrop-blur">
                              <div className="flex min-w-0 items-center gap-2 text-emerald-100/80">
                                <Bot className="h-4 w-4 text-emerald-200" />
                                <span className="truncate">{selectedStore.sellerAgentName}</span>
                              </div>
                              <div className="flex items-center justify-center gap-2 text-white/60">
                                <Command className="h-4 w-4" />
                                工具/系统
                              </div>
                              <div className="flex min-w-0 items-center justify-end gap-2 text-indigo-100/80">
                                买家 Agent
                                <Bot className="h-4 w-4 text-indigo-200" />
                              </div>
                            </div>
                          ) : (
                            <div className="sticky top-0 z-10 hidden md:grid md:grid-cols-2 md:gap-4 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70 backdrop-blur">
                              <div className="flex items-center gap-2 text-emerald-100/80">
                                <Bot className="h-4 w-4 text-emerald-200" />
                                <span className="truncate">{selectedStore.sellerAgentName}</span>
                              </div>
                              <div className="flex items-center justify-end gap-2 text-indigo-100/80">
                                买家 Agent
                                <Bot className="h-4 w-4 text-indigo-200" />
                              </div>
                            </div>
                          )}

                          <div
                            className={cn(
                              "grid gap-3 md:gap-x-4",
                              chatView === "process"
                                ? "md:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]"
                                : "md:grid-cols-2"
                            )}
                          >
                            {chatRows.map((row) =>
                              row.kind === "stage" ? (
                                <motion.div
                                  key={row.id}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  className={cn(
                                    "flex items-center justify-center",
                                    chatView === "process" ? "md:col-span-3" : "md:col-span-2"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                                      chatStageBadgeClass(row.stage)
                                    )}
                                  >
                                    {chatStageIcon(row.stage)}
                                    <span className="font-medium">{chatStageLabel(row.stage)}</span>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key={row.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  className={cn(
                                    "flex min-w-0",
                                    row.message.role === "seller" && "md:col-start-1 justify-start",
                                    row.message.role === "buyer" &&
                                      (chatView === "process"
                                        ? "md:col-start-3 justify-end"
                                        : "md:col-start-2 justify-end"),
                                    (row.message.role === "tool" || row.message.role === "system") &&
                                      (chatView === "process"
                                        ? "md:col-start-2 justify-center"
                                        : "md:col-span-2 justify-center"),
                                    !["buyer", "seller", "tool", "system"].includes(row.message.role) &&
                                      (chatView === "process"
                                        ? "md:col-start-2 justify-center"
                                        : "md:col-span-2 justify-center")
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-full max-w-[96%] rounded-2xl border px-3 py-2 text-sm",
                                      row.message.role === "buyer" &&
                                        "border-indigo-300/20 bg-indigo-500/15 text-indigo-50",
                                      row.message.role === "seller" &&
                                        "border-emerald-300/20 bg-emerald-500/10 text-emerald-50",
                                      row.message.role === "system" && "border-white/10 bg-white/5 text-white/80",
                                      row.message.role === "tool" &&
                                        "border-white/10 bg-black/20 text-white/80 cursor-pointer hover:bg-black/25"
                                    )}
                                    onClick={() => {
                                      if (row.message.role !== "tool" || !row.message.tool) return;
                                      setToolModalMaximized(false);
                                      setToolModal({
                                        name: row.message.tool.name,
                                        ts: row.message.ts,
                                        stage: row.message.stage,
                                        args: row.message.tool.args,
                                        result: row.message.tool.result,
                                      });
                                    }}
                                  >
                                    {row.message.role === "tool" && row.message.tool ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-white/70">
                                          <Command className="h-3.5 w-3.5" />
                                          <span className="font-mono">{row.message.tool.name}</span>
                                          <span className="ml-auto font-mono text-white/45">
                                            {formatTime(row.message.ts)}
                                          </span>
                                        </div>
                                        <div className="grid gap-2 rounded-xl bg-black/20 p-3 text-xs text-white/75">
                                          <div className="space-y-1">
                                            <div className="text-white/55">输入</div>
                                          <div className="font-mono text-white/75 break-all whitespace-pre-wrap">
                                            {truncateText(
                                              stringifyForDisplay(row.message.tool.args, false),
                                              220
                                            )}
                                          </div>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="text-white/55">输出</div>
                                            <div className="font-mono text-white/75 break-all whitespace-pre-wrap">
                                              {row.message.tool.result == null
                                                ? "（等待返回）"
                                                : truncateText(
                                                    stringifyForDisplay(row.message.tool.result, false),
                                                    220
                                                  )}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between pt-1 text-[11px] text-white/55">
                                            <span>点击卡片查看完整 JSON</span>
                                            <span className="inline-flex items-center gap-1">
                                              <Maximize2 className="h-3 w-3" />
                                              详情
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-center gap-2 text-xs text-white/60">
                                          {row.message.role === "buyer" ? (
                                            <Bot className="h-3.5 w-3.5 text-indigo-200" />
                                          ) : row.message.role === "seller" ? (
                                            <Bot className="h-3.5 w-3.5 text-emerald-200" />
                                          ) : (
                                            <Sparkles className="h-3.5 w-3.5 text-white/70" />
                                          )}
                                          <span className="font-medium">{row.message.speaker}</span>
                                          <span className="ml-auto font-mono text-white/45">
                                            {formatTime(row.message.ts)}
                                          </span>
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap leading-relaxed">
                                          {row.message.content}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </CardContent>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-4 w-4 text-white/80" />
                全流程时间线
              </CardTitle>
              <CardDescription>每一步都可见，适合评委快速理解。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {timeline.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-2xl border p-3",
                      t.status === "done" && "border-emerald-400/15 bg-emerald-500/10",
                      t.status === "running" && "border-indigo-400/20 bg-indigo-500/10",
                      t.status === "error" && "border-rose-400/20 bg-rose-500/10",
                      t.status === "idle" && "border-white/10 bg-white/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {statusIcon(t.status)}
                          <div className="truncate text-sm font-semibold">{t.title}</div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/65">
                          <span className="inline-flex items-center gap-1">
                            {chainIcon(t.chain)}
                            {chainLabel(t.chain)}
                          </span>
                          {t.detail ? (
                            <>
                              <span className="text-white/25">|</span>
                              <span className="truncate">{t.detail}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <Badge className="bg-white/5 text-white/60 font-mono">
                        {t.txHash ? `${t.txHash.slice(0, 10)}...` : "-"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="border-white/10 bg-black/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-200" />
                    演示提示
                  </CardTitle>
                  <CardDescription>
                    让评委一眼看懂：意图 -&gt; 工具调用 -&gt; 跨链结算。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-white/75">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/5 text-white/70">提示</Badge>
                    <span>
                      如果测试网缺少 USDC / Gas / 地址配置，切换到 <span className="font-medium">模拟</span> 模式即可。
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/5 text-white/70">一句话</Badge>
                    <span>Base 付款 -&gt; ZetaChain 编排 -&gt; Polygon 交付，一次完成。</span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </main>
      </div>

      <AnimatePresence>
        {chatModalOpen ? (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setChatModalOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {marketModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMarketModalOpen(false);
            }}
          >
            <div className="flex h-full w-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-5xl"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-white/75">电商市场（弹出窗口）</div>
                  <Button variant="secondary" size="sm" onClick={() => setMarketModalOpen(false)}>
                    <X className="h-4 w-4" />
                    关闭
                  </Button>
                </div>
                <div className="overflow-hidden">{renderMarketplacePanel("modal")}</div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toolModal ? (
          <motion.div
            key="tool-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setToolModal(null);
                setToolModalMaximized(false);
              }
            }}
          >
            <div className="flex h-full w-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "w-full",
                  toolModalMaximized ? "max-w-none" : "max-w-5xl"
                )}
              >
                <Card
                  className={cn(
                    "overflow-hidden border-white/10 bg-black/30",
                    toolModalMaximized && "max-h-[90vh]"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Command className="h-4 w-4 text-indigo-200" />
                          工具调用详情
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-white/80">{toolModal.name}</span>
                          <span className="text-white/30">|</span>
                          <span className="font-mono text-white/60">{formatTime(toolModal.ts)}</span>
                          {toolModal.stage ? (
                            <>
                              <span className="text-white/30">|</span>
                              <Badge className={chatStageBadgeClass(normalizeChatStage(toolModal.stage))}>
                                {chatStageLabel(normalizeChatStage(toolModal.stage))}
                              </Badge>
                            </>
                          ) : null}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setToolModalMaximized((v) => !v)}
                        >
                          <Maximize2 className="h-4 w-4" />
                          {toolModalMaximized ? "还原" : "放大"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setToolModal(null);
                            setToolModalMaximized(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                          关闭
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-white/70">输入（args）</div>
                          <pre
                            className={cn(
                            "overflow-auto rounded-2xl bg-black/35 p-3 text-xs text-white/80 whitespace-pre-wrap break-all",
                              toolModalMaximized ? "max-h-[70vh]" : "max-h-[55vh]"
                            )}
                          >
                            {stringifyForDisplay(toolModal.args, true)}
                          </pre>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-white/70">输出（result）</div>
                          <pre
                            className={cn(
                            "overflow-auto rounded-2xl bg-black/35 p-3 text-xs text-white/80 whitespace-pre-wrap break-all",
                              toolModalMaximized ? "max-h-[70vh]" : "max-h-[55vh]"
                            )}
                          >
                            {stringifyForDisplay(toolModal.result ?? null, true)}
                          </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
