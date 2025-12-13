import { resolveConfirm } from "@/lib/agentSessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const sessionId = typeof obj.sessionId === "string" ? obj.sessionId : "";
  const action = typeof obj.action === "string" ? obj.action : "";

  if (!sessionId) return new Response("Missing sessionId", { status: 400 });

  if (action === "confirm_settlement") {
    const ok = resolveConfirm(sessionId);
    return Response.json({ ok });
  }

  return new Response("Unknown action", { status: 400 });
}
