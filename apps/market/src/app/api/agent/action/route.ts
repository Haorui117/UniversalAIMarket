import { resolveConfirm, rejectConfirm, hasSession } from "@/lib/agentSessions";

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

  if (!sessionId) {
    return Response.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
  }

  if (!hasSession(sessionId)) {
    return Response.json({ ok: false, error: "Session not found or expired" }, { status: 404 });
  }

  if (action === "confirm_settlement") {
    const ok = resolveConfirm(sessionId);
    return Response.json({ ok });
  }

  if (action === "cancel_settlement") {
    const ok = rejectConfirm(sessionId, "User cancelled");
    return Response.json({ ok, cancelled: true });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
