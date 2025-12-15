/**
 * Agent Session Management
 *
 * Manages Promise-based confirmation flow for Agent settlement.
 * When Agent reaches "confirm" step, it waits for user confirmation
 * before proceeding with blockchain transactions.
 */

type AgentSession = {
  resolveConfirm: () => void;
  rejectConfirm: (reason?: string) => void;
};

const sessions = new Map<string, AgentSession>();

/**
 * Create a Promise that waits for user confirmation
 * Called by SSE stream when Agent needs confirmation
 */
export function waitForConfirm(sessionId: string): Promise<void> {
  let resolveConfirm: (() => void) | null = null;
  let rejectConfirm: ((reason?: string) => void) | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    resolveConfirm = resolve;
    rejectConfirm = reject;
  });

  sessions.set(sessionId, {
    resolveConfirm: () => resolveConfirm?.(),
    rejectConfirm: (reason?: string) => rejectConfirm?.(reason),
  });

  return promise;
}

/**
 * Resolve the confirmation Promise (user approved)
 * Called by action API when user confirms settlement
 */
export function resolveConfirm(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.resolveConfirm();
  return true;
}

/**
 * Reject the confirmation Promise (user cancelled)
 * Called by action API when user cancels settlement
 */
export function rejectConfirm(sessionId: string, reason?: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.rejectConfirm(reason);
  return true;
}

/**
 * Check if a session exists
 */
export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

/**
 * Clean up session after completion or error
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
