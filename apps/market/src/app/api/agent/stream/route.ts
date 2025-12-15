import { ethers } from "ethers";
import { STORES, type Store } from "@/lib/catalog";
import { encodeBase64Url } from "@/lib/base64url";
import { createDeal, type Deal } from "@/lib/deal";
import { scoreText } from "@/lib/textScore";
import { clearSession, waitForConfirm } from "@/lib/agentSessions";
import type {
  TimelineStatus,
  ChatRole,
  ChatStage,
  SerializedDeal,
} from "@/lib/agentContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoMode = "testnet" | "simulate";
type CheckoutMode = "auto" | "confirm";

// === SSE Event Types ===
type AgentStreamEvent =
  | {
      type: "message";
      message: {
        id: string;
        role: ChatRole;
        stage: ChatStage;
        speaker: string;
        content: string;
        ts: number;
      };
    }
  | {
      type: "tool_call";
      tool: { id: string; stage: ChatStage; name: string; args: unknown; ts: number };
    }
  | {
      type: "tool_result";
      tool: { id: string; result: unknown; ts: number };
    }
  | {
      type: "timeline_step";
      step: { id: string; status?: TimelineStatus; detail?: string; txHash?: string };
    }
  | {
      type: "state";
      state: Partial<{
        selectedStoreId: string;
        selectedProductId: string;
        deal: SerializedDeal | null;
        running: boolean;
        settling: boolean;
        awaitingConfirm: boolean;
        sessionId: string;
      }>;
    }
  | { type: "done" }
  | { type: "error"; error: { message: string } };

type AgentStatePayload = Extract<AgentStreamEvent, { type: "state" }>["state"];
type AgentMessagePayload = Extract<AgentStreamEvent, { type: "message" }>["message"];
type AgentToolCallPayload = Extract<AgentStreamEvent, { type: "tool_call" }>["tool"];
type AgentToolResultPayload = Extract<AgentStreamEvent, { type: "tool_result" }>["tool"];
type AgentTimelineStepPayload = Extract<AgentStreamEvent, { type: "timeline_step" }>["step"];

// === Utilities ===
function now() {
  return Date.now();
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

function serializeDeal(deal: Deal): SerializedDeal {
  return {
    ...deal,
    tokenId: deal.tokenId.toString(),
    price: deal.price.toString(),
    deadline: deal.deadline.toString(),
  };
}

function isPresent(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function safeAddressFromPrivateKey(privateKey: string | undefined) {
  if (!isPresent(privateKey)) return undefined;
  try {
    return new ethers.Wallet(privateKey!).address;
  } catch {
    return undefined;
  }
}

function pseudoAddress(label: string) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`universal-ai-market:${label}`));
  return ethers.getAddress(`0x${hash.slice(-40)}`);
}

function normalizeAddress(value: string | undefined, label: string) {
  if (value && ethers.isAddress(value)) return ethers.getAddress(value);
  return pseudoAddress(label);
}

function kindLabel(kind: "digital" | "physical") {
  return kind === "physical" ? "实物" : "数字商品";
}

function inventoryLabel(status: string) {
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

function formatUSDC(raw: bigint) {
  return `${ethers.formatUnits(raw, 6)} USDC`;
}

// === Store/Product Selection ===
function pickStore(goal: string, opts?: { preferDemoReady?: boolean }) {
  const candidateStores = opts?.preferDemoReady
    ? STORES.filter((store) => store.products.some((p) => p.demoReady))
    : STORES;
  const pool = candidateStores.length > 0 ? candidateStores : STORES;

  const scored = pool
    .map((store) => {
      const content = `${store.name} ${store.tagline} ${store.location} ${store.categories.join(" ")} ${store.products
        .map((p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.highlights.join(" ")}`)
        .join(" ")}`;
      let score = scoreText(content, goal);
      if (opts?.preferDemoReady && store.products.some((p) => p.demoReady)) score += 3;
      return { store, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.store ?? pool[0] ?? STORES[0];
}

function pickProduct(store: Store, goal: string, opts?: { preferDemoReady?: boolean }) {
  const candidateProducts = opts?.preferDemoReady
    ? store.products.filter((product) => product.demoReady)
    : store.products;
  const pool = candidateProducts.length > 0 ? candidateProducts : store.products;

  const scored = pool
    .map((product) => {
      const content = `${product.name} ${product.description} ${product.tags.join(" ")} ${product.highlights.join(" ")}`;
      let score = scoreText(content, goal);
      if (opts?.preferDemoReady && product.demoReady) score += 3;
      return { product, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.product ?? store.products[0];
}

// === SSE Stream Utilities ===
async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: string) => void,
  signal: AbortSignal
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let eventName = "message";
  let data = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n");
      if (idx === -1) break;
      const lineRaw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);

      const line = lineRaw.replace(/\r$/, "");
      if (line === "") {
        if (data !== "") onEvent(eventName, data);
        eventName = "message";
        data = "";
        continue;
      }

      if (line.startsWith("event:")) {
        eventName = line.slice("event:".length).trim();
        continue;
      }

      if (line.startsWith("data:")) {
        data += line.slice("data:".length).trimStart();
      }
    }
  }
}

function sendSse(controller: ReadableStreamDefaultController, encoder: TextEncoder, payload: AgentStreamEvent) {
  const event = payload.type;
  const data =
    payload.type === "message"
      ? payload.message
      : payload.type === "tool_call"
        ? payload.tool
        : payload.type === "tool_result"
          ? payload.tool
          : payload.type === "timeline_step"
            ? payload.step
            : payload.type === "state"
              ? payload.state
              : payload.type === "error"
                ? payload.error
                : {};

  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

// === Main Handler ===
export async function GET(req: Request) {
  const url = new URL(req.url);

  const mode: DemoMode = url.searchParams.get("mode") === "testnet" ? "testnet" : "simulate";
  const checkoutMode: CheckoutMode =
    url.searchParams.get("checkoutMode") === "auto" ? "auto" : "confirm";
  const goal = url.searchParams.get("goal") ?? "量子之剑";
  const buyerNote = url.searchParams.get("buyerNote") ?? "";

  const requiredForTestnet = [
    "BASE_GATEWAY_ADDRESS",
    "BASE_USDC_ADDRESS",
    "ZETA_UNIVERSAL_MARKET",
    "POLYGON_WEAPON_ESCROW",
    "POLYGON_MOCK_WEAPON_NFT",
    "BUYER_PRIVATE_KEY",
    "SELLER_PRIVATE_KEY",
  ] as const;

  const missing = requiredForTestnet.filter((key) => !isPresent(process.env[key]));
  const buyerFromEnv = safeAddressFromPrivateKey(process.env.BUYER_PRIVATE_KEY);
  const sellerFromEnv = safeAddressFromPrivateKey(process.env.SELLER_PRIVATE_KEY);
  if (!buyerFromEnv) missing.push("BUYER_PRIVATE_KEY");
  if (!sellerFromEnv) missing.push("SELLER_PRIVATE_KEY");

  const configReady = missing.length === 0;

  const buyerAddress = normalizeAddress(buyerFromEnv, "buyer");
  const sellerBase = normalizeAddress(sellerFromEnv, "sellerBase");
  const polygonEscrow = normalizeAddress(process.env.POLYGON_WEAPON_ESCROW, "polygonEscrow");
  const nft = normalizeAddress(process.env.POLYGON_MOCK_WEAPON_NFT, "polygonNFT");

  const sessionId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const signal = req.signal;

      const send = (payload: AgentStreamEvent) => sendSse(controller, encoder, payload);
      const sendState = (state: AgentStatePayload) => send({ type: "state", state: { ...state, sessionId } });
      const sendMessage = (message: AgentMessagePayload) => send({ type: "message", message });
      const sendToolCall = (tool: AgentToolCallPayload) => send({ type: "tool_call", tool });
      const sendToolResult = (tool: AgentToolResultPayload) => send({ type: "tool_result", tool });
      const sendStep = (step: AgentTimelineStepPayload) => send({ type: "timeline_step", step });

      const id = () => crypto.randomUUID();

      (async () => {
        try {
          sendState({ running: true, settling: false, awaitingConfirm: false });

          // === Step 1: Discover ===
          sendStep({ id: "discover", status: "running" });
          sendMessage({
            id: id(),
            role: "system",
            stage: "browse",
            speaker: "系统",
            content: "正在发现服务端点...",
            ts: now(),
          });
          await sleep(400, signal);
          if (signal.aborted) return;
          sendStep({ id: "discover", status: "done", detail: "已获取服务配置" });

          // === Step 2: Browse ===
          sendStep({ id: "browse", status: "running" });
          sendMessage({
            id: id(),
            role: "buyer",
            stage: "browse",
            speaker: "买家 Agent",
            content: buyerNote.trim()
              ? `收到。我会先浏览店铺/商品，再根据你的需求筛选：${goal}\n补充备注：${buyerNote.trim()}`
              : `收到。我会先浏览店铺/商品，再根据你的需求筛选：${goal}`,
            ts: now(),
          });
          await sleep(450, signal);
          if (signal.aborted) return;

          const storesToolId = id();
          sendToolCall({
            id: storesToolId,
            stage: "browse",
            name: "search_stores",
            args: { query: goal, limit: 5 },
            ts: now(),
          });
          await sleep(520, signal);
          if (signal.aborted) return;

          const preferDemoReady = mode === "testnet";
          const store = pickStore(goal, { preferDemoReady });
          sendToolResult({
            id: storesToolId,
            result: {
              stores: STORES.map((s) => ({
                id: s.id,
                name: s.name,
                tagline: s.tagline,
                location: s.location,
                verified: s.verified,
                rating: s.rating,
                orders: s.orders,
                responseMins: s.responseMins,
                categories: s.categories,
              })),
              picked: store.id,
            },
            ts: now(),
          });
          sendState({ selectedStoreId: store.id });
          sendMessage({
            id: id(),
            role: "system",
            stage: "browse",
            speaker: "系统",
            content: `店铺筛选完成：已选择「${store.name}」（${store.verified ? "已认证" : "未认证"}，评分 ${store.rating.toFixed(
              1
            )}，响应约 ${store.responseMins} 分钟）。`,
            ts: now(),
          });

          await sleep(450, signal);
          if (signal.aborted) return;

          const productsToolId = id();
          sendToolCall({
            id: productsToolId,
            stage: "browse",
            name: "search_products",
            args: { storeId: store.id, query: goal, limit: 5 },
            ts: now(),
          });
          await sleep(520, signal);
          if (signal.aborted) return;

          const product = pickProduct(store, goal, { preferDemoReady });
          sendToolResult({
            id: productsToolId,
            result: {
              storeId: store.id,
              products: store.products.map((p) => ({
                id: p.id,
                name: p.name,
                kind: p.kind,
                priceUSDC: p.priceUSDC,
                demoReady: p.demoReady,
                inventory: p.inventory,
                leadTime: p.leadTime,
              })),
              picked: product.id,
            },
            ts: now(),
          });
          sendState({ selectedProductId: product.id });
          sendMessage({
            id: id(),
            role: "system",
            stage: "browse",
            speaker: "系统",
            content: `商品已锁定：${product.name}（${kindLabel(product.kind)}，Token #${product.tokenId}，${
              product.priceUSDC
            } USDC，${inventoryLabel(product.inventory)}，${product.demoReady ? "可上链" : "仅模拟"}）。`,
            ts: now(),
          });
          sendStep({ id: "browse", status: "done", detail: `已选择：${product.name}` });

          await sleep(450, signal);
          if (signal.aborted) return;

          // === Step 3: Negotiate ===
          sendStep({ id: "negotiate", status: "running" });
          sendMessage({
            id: id(),
            role: "buyer",
            stage: "negotiate",
            speaker: "买家 Agent",
            content: `正在联系卖家 Agent（${store.sellerAgentName}）...`,
            ts: now(),
          });
          await sleep(600, signal);
          if (signal.aborted) return;

          sendMessage({
            id: id(),
            role: "seller",
            stage: "negotiate",
            speaker: store.sellerAgentName,
            content:
              store.sellerStyle === "friendly"
                ? "欢迎光临！告诉我你想买什么，我会把下单和跨链结算流程做得尽可能丝滑。"
                : store.sellerStyle === "strict"
                  ? "请说明：商品、目标价格、截止时间。我会回复交易条款。"
                  : "我可以确认库存，并给出用于 ZetaChain 跨链结算的 Deal Payload。",
            ts: now(),
          });
          await sleep(550, signal);
          if (signal.aborted) return;

          sendMessage({
            id: id(),
            role: "buyer",
            stage: "negotiate",
            speaker: "买家 Agent",
            content: `我想购买「${product.name}」，价格 ${product.priceUSDC} USDC。请在 Polygon 通过托管合约交付，卖家在 Base 收款，截止时间 1 小时。`,
            ts: now(),
          });
          await sleep(650, signal);
          if (signal.aborted) return;

          sendMessage({
            id: id(),
            role: "seller",
            stage: "negotiate",
            speaker: store.sellerAgentName,
            content:
              product.kind === "physical"
                ? "确认。实物我会链下发货，同时在 Polygon 给你发放一枚收据 NFT 用于验真/领取权益。"
                : "确认。NFT 已在 Polygon 托管，待跨链付款完成后会自动释放给你。",
            ts: now(),
          });
          sendStep({ id: "negotiate", status: "done", detail: `已确认价格：${product.priceUSDC} USDC` });
          sendMessage({
            id: id(),
            role: "system",
            stage: "negotiate",
            speaker: "系统",
            content: `条款摘要：价格 ${product.priceUSDC} USDC，付款链 Base，交付链 Polygon，截止时间 1 小时。`,
            ts: now(),
          });

          await sleep(450, signal);
          if (signal.aborted) return;

          // === Step 4: Prepare Deal ===
          sendStep({ id: "prepare", status: "running" });
          const prepareId = id();
          sendToolCall({
            id: prepareId,
            stage: "prepare",
            name: "prepare_deal",
            args: {
              buyer: buyerAddress,
              sellerBase,
              polygonEscrow,
              nft,
              tokenId: product.tokenId,
              priceUSDC: product.priceUSDC,
              deadlineSecondsFromNow: 3600,
            },
            ts: now(),
          });
          await sleep(520, signal);
          if (signal.aborted) return;

          const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
          const dealParams = {
            buyer: buyerAddress,
            sellerBase,
            polygonEscrow,
            nft,
            tokenId: BigInt(product.tokenId),
            price: ethers.parseUnits(product.priceUSDC, 6),
            deadline,
          } as const;
          const prepared = createDeal(dealParams);

          sendToolResult({
            id: prepareId,
            result: {
              dealId: prepared.dealId,
              price: formatUSDC(prepared.price),
              tokenId: prepared.tokenId.toString(),
              deadline: new Date(Number(prepared.deadline) * 1000).toISOString(),
            },
            ts: now(),
          });
          sendState({ deal: serializeDeal(prepared) });
          sendStep({ id: "prepare", status: "done", detail: `dealId ${prepared.dealId.slice(0, 10)}...` });
          sendMessage({
            id: id(),
            role: "system",
            stage: "prepare",
            speaker: "系统",
            content: `Deal 已生成：${prepared.dealId.slice(0, 10)}...（Payload 已就绪，可发起跨链结算）。`,
            ts: now(),
          });

          const wantsAuto = checkoutMode === "auto";
          const canAutoSettle =
            wantsAuto && (mode === "simulate" || (mode === "testnet" && configReady && product.demoReady));

          sendMessage({
            id: id(),
            role: "buyer",
            stage: canAutoSettle ? "settle" : "prepare",
            speaker: "买家 Agent",
            content: canAutoSettle
              ? mode === "testnet"
                ? "订单已生成，已开启全自动结算：我将立即在测试网发起跨链结算。"
                : "订单已生成，已开启全自动结算：我将立即模拟发起跨链结算流程。"
              : wantsAuto
                ? "订单已生成，但当前条件不支持全自动结算；请点击「发起结算」继续。"
                : mode === "testnet"
                  ? "订单已生成。点击「发起结算」即可在测试网执行跨链结算。"
                  : "订单已生成。点击「发起结算」即可模拟跨链结算流程。",
            ts: now(),
          });

          sendState({ running: false });

          if (!canAutoSettle) {
            sendState({ awaitingConfirm: true });
            const confirmPromise = waitForConfirm(sessionId);

            await confirmPromise;
            clearSession(sessionId);
            if (signal.aborted) return;
          } else {
            await sleep(450, signal);
            if (signal.aborted) return;
          }

          sendState({ awaitingConfirm: false, settling: true });

          // === Steps 5-8: Settlement ===
          const settleToolId = id();
          sendToolCall({
            id: settleToolId,
            stage: "settle",
            name: "settle_deal",
            args: { mode, dealId: prepared.dealId },
            ts: now(),
          });

          const qs = new URLSearchParams();
          qs.set("mode", mode);
          qs.set("deal", encodeBase64Url(JSON.stringify(serializeDeal(prepared))));

          const settleUrl = new URL(`/api/settle/stream?${qs.toString()}`, url.origin);
          const settleRes = await fetch(settleUrl, { signal });
          if (!settleRes.ok || !settleRes.body) {
            throw new Error(`结算接口错误：HTTP ${settleRes.status}`);
          }

          await readSseStream(
            settleRes.body,
            (evt, raw) => {
              if (signal.aborted) return;

              if (evt === "step") {
                try {
                  const step = JSON.parse(raw) as {
                    id: string;
                    status?: TimelineStatus;
                    detail?: string;
                    txHash?: string;
                  };
                  send({ type: "timeline_step", step });
                } catch {
                  // ignore
                }
                return;
              }

              if (evt === "log") {
                try {
                  const log = JSON.parse(raw) as { role: ChatRole; content: string };
                  sendMessage({
                    id: id(),
                    role: log.role,
                    stage: "settle",
                    speaker:
                      log.role === "buyer"
                        ? "买家 Agent"
                        : log.role === "seller"
                          ? store.sellerAgentName
                          : "系统",
                    content: log.content,
                    ts: now(),
                  });
                } catch {
                  // ignore
                }
                return;
              }

              if (evt === "error") {
                send({ type: "error", error: { message: raw } });
              }
            },
            signal
          );

          sendToolResult({ id: settleToolId, result: { ok: true }, ts: now() });
          sendState({ settling: false });
          send({ type: "done" });
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "未知错误";
          send({ type: "error", error: { message } });
          controller.close();
        } finally {
          clearSession(sessionId);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
