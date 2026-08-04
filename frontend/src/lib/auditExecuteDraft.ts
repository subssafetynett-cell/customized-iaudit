/**
 * Local durable draft for Perform Audit — survives refresh / failed network /
 * unverified unload flush until the server ack clears it.
 */
import { countAuditDataAnswers, mergeAuditDataPreferRicher } from "@/lib/auditPlanModules";

const KEY_PREFIX = "auditExecuteDraft_v1_";

type DraftEnvelope = {
  savedAt: string;
  auditData: Record<string, unknown>;
};

function draftKey(planId: string | number): string {
  return `${KEY_PREFIX}${planId}`;
}

/** Drop bulky data-URL evidence so localStorage stays under quota; keep https URLs + answers. */
function stripHeavyEvidence(value: unknown, depth = 0): unknown {
  if (value == null || depth > 40) return value;
  if (typeof value === "string") {
    if (
      value.startsWith("data:") ||
      value.startsWith("blob:") ||
      (value.length > 800 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 200)))
    ) {
      return "[omitted]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripHeavyEvidence(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripHeavyEvidence(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function saveAuditExecuteDraft(
  planId: string | number | undefined | null,
  auditData: Record<string, unknown> | null | undefined,
): void {
  if (planId == null || planId === "" || !auditData || typeof auditData !== "object") {
    return;
  }
  try {
    const slim = stripHeavyEvidence(auditData) as Record<string, unknown>;
    const envelope: DraftEnvelope = {
      savedAt: new Date().toISOString(),
      auditData: slim,
    };
    localStorage.setItem(draftKey(planId), JSON.stringify(envelope));
  } catch (e) {
    console.warn("[audit-draft] Failed to persist local draft", e);
  }
}

export function loadAuditExecuteDraft(
  planId: string | number | undefined | null,
): Record<string, unknown> | null {
  if (planId == null || planId === "") return null;
  try {
    const raw = localStorage.getItem(draftKey(planId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (!parsed?.auditData || typeof parsed.auditData !== "object") return null;
    return parsed.auditData;
  } catch {
    return null;
  }
}

export function clearAuditExecuteDraft(
  planId: string | number | undefined | null,
): void {
  if (planId == null || planId === "") return;
  try {
    localStorage.removeItem(draftKey(planId));
  } catch {
    /* ignore */
  }
}

/**
 * Prefer local draft when it has more answers than the server blob
 * (covers failed keepalive / crash between debounce and PUT).
 */
export function mergeServerAuditDataWithLocalDraft(
  planId: string | number | undefined | null,
  serverData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const draft = loadAuditExecuteDraft(planId);
  if (!draft) return { ...(serverData || {}) };
  const serverCount = countAuditDataAnswers(serverData);
  const draftCount = countAuditDataAnswers(draft);
  if (draftCount > serverCount) {
    return mergeAuditDataPreferRicher(serverData, draft);
  }
  // Equal or draft emptier — still merge modules so neither side drops siblings.
  return mergeAuditDataPreferRicher(serverData, draft);
}
