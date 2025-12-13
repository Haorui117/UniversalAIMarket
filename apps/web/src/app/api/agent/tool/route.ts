import { ethers } from "ethers";
import { encodeBase64Url } from "@/lib/base64url";
import { STORES } from "@/lib/catalog";
import { createDeal, type Deal } from "@/lib/deal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoMode = "testnet" | "simulate";

type SerializedDeal = {
  dealId: string;
  buyer: string;
  sellerBase: string;
  polygonEscrow: string;
  nft: string;
  tokenId: string;
  price: string;
  deadline: string;
};

function isPresent(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function scoreText(haystack: string, needle: string) {
  const query = needle.toLowerCase();
  const tokens = new Set<string>();

  for (const t of query
    .split(/[\s,，。！？!?.；;]+/g)
    .map((v) => v.trim())
    .filter(Boolean)) {
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

function serializeDeal(deal: Deal): SerializedDeal {
  return {
    ...deal,
    tokenId: deal.tokenId.toString(),
    price: deal.price.toString(),
    deadline: deal.deadline.toString(),
  };
}

export async function GET() {
  return Response.json({
    tools: [
      {
        name: "search_stores",
        description: "Search stores in the marketplace catalog.",
        args: { query: "string", limit: "number" },
      },
      {
        name: "search_products",
        description: "Search products within a store.",
        args: { storeId: "string", query: "string", limit: "number" },
      },
      {
        name: "prepare_deal",
        description: "Create a cross-chain settlement deal payload (computes dealId).",
        args: {
          buyer: "address",
          sellerBase: "address",
          polygonEscrow: "address",
          nft: "address",
          tokenId: "number|string",
          priceUSDC: "string",
          deadlineSecondsFromNow: "number",
        },
      },
      {
        name: "settle_deal",
        description: "Returns a settlement SSE URL for a prepared deal.",
        args: { mode: "\"testnet\"|\"simulate\"", deal: "SerializedDeal" },
      },
    ],
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return new Response("Invalid body", { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const name = isPresent(obj.name) ? obj.name : "";
  const args = obj.args as Record<string, unknown> | undefined;

  try {
    if (name === "search_stores") {
      const query = isPresent(args?.query) ? args!.query : "";
      const limitRaw = typeof args?.limit === "number" ? args.limit : 5;
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;

      const scored = STORES.map((store) => {
        const content = `${store.name} ${store.tagline} ${store.location} ${store.categories.join(" ")} ${store.products
          .map((p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.highlights.join(" ")}`)
          .join(" ")}`;
        return { store, score: scoreText(content, query) };
      }).sort((a, b) => b.score - a.score);

      return Response.json({
        ok: true,
        result: {
          stores: scored.slice(0, limit).map(({ store }) => ({
            id: store.id,
            name: store.name,
            tagline: store.tagline,
            location: store.location,
            verified: store.verified,
            rating: store.rating,
            orders: store.orders,
            responseMins: store.responseMins,
            categories: store.categories,
            sellerAgentName: store.sellerAgentName,
            hasDemoReady: store.products.some((p) => p.demoReady),
          })),
        },
      });
    }

    if (name === "search_products") {
      const storeId = isPresent(args?.storeId) ? args!.storeId : "";
      const query = isPresent(args?.query) ? args!.query : "";
      const limitRaw = typeof args?.limit === "number" ? args.limit : 5;
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;

      const store = STORES.find((s) => s.id === storeId);
      if (!store) throw new Error("Unknown storeId");

      const scored = store.products
        .map((product) => {
          const content = `${product.name} ${product.description} ${product.tags.join(" ")} ${product.highlights.join(
            " "
          )}`;
          return { product, score: scoreText(content, query) };
        })
        .sort((a, b) => b.score - a.score);

      return Response.json({
        ok: true,
        result: {
          storeId: store.id,
          products: scored.slice(0, limit).map(({ product }) => ({
            id: product.id,
            name: product.name,
            kind: product.kind,
            description: product.description,
            priceUSDC: product.priceUSDC,
            tokenId: product.tokenId,
            demoReady: product.demoReady,
            inventory: product.inventory,
            leadTime: product.leadTime,
            highlights: product.highlights,
            tags: product.tags,
          })),
        },
      });
    }

    if (name === "prepare_deal") {
      const buyer = isPresent(args?.buyer) ? String(args!.buyer) : "";
      const sellerBase = isPresent(args?.sellerBase) ? String(args!.sellerBase) : "";
      const polygonEscrow = isPresent(args?.polygonEscrow) ? String(args!.polygonEscrow) : "";
      const nft = isPresent(args?.nft) ? String(args!.nft) : "";
      const tokenIdRaw = args?.tokenId;
      const tokenId =
        typeof tokenIdRaw === "number" || typeof tokenIdRaw === "bigint"
          ? BigInt(tokenIdRaw)
          : isPresent(tokenIdRaw)
            ? BigInt(tokenIdRaw)
            : undefined;
      const priceUSDC = isPresent(args?.priceUSDC) ? String(args!.priceUSDC) : "";
      const deadlineSecondsFromNow =
        typeof args?.deadlineSecondsFromNow === "number" ? args.deadlineSecondsFromNow : 3600;

      if (!ethers.isAddress(buyer)) throw new Error("Invalid buyer address");
      if (!ethers.isAddress(sellerBase)) throw new Error("Invalid sellerBase address");
      if (!ethers.isAddress(polygonEscrow)) throw new Error("Invalid polygonEscrow address");
      if (!ethers.isAddress(nft)) throw new Error("Invalid nft address");
      if (tokenId === undefined) throw new Error("Invalid tokenId");
      if (!priceUSDC) throw new Error("Missing priceUSDC");

      const deadline = BigInt(Math.floor(Date.now() / 1000) + Math.max(60, deadlineSecondsFromNow));
      const dealParams = {
        buyer: ethers.getAddress(buyer),
        sellerBase: ethers.getAddress(sellerBase),
        polygonEscrow: ethers.getAddress(polygonEscrow),
        nft: ethers.getAddress(nft),
        tokenId,
        price: ethers.parseUnits(priceUSDC, 6),
        deadline,
      } as const;
      const deal = createDeal(dealParams);
      const serialized = serializeDeal(deal);

      return Response.json({
        ok: true,
        result: {
          deal: serialized,
          dealId: deal.dealId,
          deadlineISO: new Date(Number(deal.deadline) * 1000).toISOString(),
        },
      });
    }

    if (name === "settle_deal") {
      const mode: DemoMode = args?.mode === "testnet" ? "testnet" : "simulate";
      const deal = args?.deal as SerializedDeal | undefined;
      if (!deal || typeof deal !== "object") throw new Error("Missing deal");
      if (!isPresent(deal.dealId)) throw new Error("Missing deal.dealId");

      const encoded = encodeBase64Url(JSON.stringify(deal));
      const streamUrl = `/api/settle/stream?mode=${mode}&deal=${encoded}`;

      return Response.json({
        ok: true,
        result: {
          streamUrl,
          sseEvents: ["step", "log", "done", "error"],
        },
      });
    }

    return new Response("Unknown tool name", { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}

