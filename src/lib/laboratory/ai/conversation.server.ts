/**
 * Laboratory AI conversation store (server-only, in-memory).
 *
 * Stage 5 intentionally does NOT introduce new database tables (schema is
 * locked). Conversations are kept per Worker instance for the lifetime of
 * the process — good enough for advisory turns; persistent chat history
 * lands with a future stage that ships a `lab_ai_conversations` table.
 */
export interface LabAiTurn {
  id: string;
  purpose: string;
  createdAt: string;
  prompt: string;
  response: string;
  ok: boolean;
  latencyMs: number;
  tokensIn: number | null;
  tokensOut: number | null;
  model: string;
  actorId: string | null;
  status: "draft" | "suggested" | "accepted" | "rejected" | "archived";
  feedback?: "up" | "down";
}

const CONVERSATIONS = new Map<string, LabAiTurn[]>();
const MAX_TURNS_PER_KEY = 50;

function key(tenantId: string, scope: string): string {
  return `${tenantId}::${scope}`;
}

export function recordTurn(tenantId: string, scope: string, turn: LabAiTurn): void {
  const k = key(tenantId, scope);
  const list = CONVERSATIONS.get(k) ?? [];
  list.unshift(turn);
  CONVERSATIONS.set(k, list.slice(0, MAX_TURNS_PER_KEY));
}

export function listTurns(tenantId: string, scope: string): LabAiTurn[] {
  return CONVERSATIONS.get(key(tenantId, scope)) ?? [];
}

export function updateTurnStatus(
  tenantId: string,
  scope: string,
  id: string,
  status: LabAiTurn["status"],
): LabAiTurn | null {
  const list = CONVERSATIONS.get(key(tenantId, scope)) ?? [];
  const t = list.find((x) => x.id === id);
  if (!t) return null;
  t.status = status;
  return t;
}

export function feedbackTurn(
  tenantId: string,
  scope: string,
  id: string,
  feedback: "up" | "down",
): LabAiTurn | null {
  const list = CONVERSATIONS.get(key(tenantId, scope)) ?? [];
  const t = list.find((x) => x.id === id);
  if (!t) return null;
  t.feedback = feedback;
  return t;
}
