// Server-side helpers for the Didit verification API behind the admin KYC
// screens. Decision payloads are fetched live per view: the document/selfie
// images inside them are short-lived presigned links, so nothing here
// persists URLs. Pure normalizers are exported for unit tests.

const DIDIT_BASE_URL = "https://verification.didit.me/v3";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getDiditApiKey = (): string =>
  process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";

/**
 * Session routes store `document_url` as "<sessionId>:::<sessionUrl>";
 * webhook-created rows store the bare session id. Returns null for legacy
 * S3 keys and test doubles.
 */
export const parseDiditSessionId = (
  documentUrl: string | null | undefined,
): string | null => {
  if (!documentUrl) return null;
  if (documentUrl.includes(":::")) {
    return documentUrl.split(":::")[0] || null;
  }
  return UUID_PATTERN.test(documentUrl) ? documentUrl : null;
};

export interface DiditIdLookup {
  source?: string;
  outcome?: string;
  face_match_score?: number;
  comparison?: Record<string, unknown>[] | null;
  registry_portrait?: string;
}

export interface DiditIdVerification {
  node_id?: string;
  status?: string;
  document_type?: string;
  document_subtype?: string;
  document_number?: string;
  full_name?: string;
  date_of_birth?: string;
  front_image?: string | null;
  back_image?: string | null;
  portrait_image?: string | null;
  id_lookup?: DiditIdLookup | null;
  warnings?: { risk?: string; short_description?: string }[] | null;
}

export interface DiditFaceMatch {
  status?: string;
  score?: number;
}

export interface DiditLivenessCheck {
  node_id?: string;
  status?: string;
  method?: string;
  score?: number;
  reference_image?: string | null;
  matches?:
    | {
        session_id?: string;
        similarity_percentage?: number;
        is_blocklisted?: boolean;
      }[]
    | null;
}

export interface DiditAmlScreening {
  status?: string;
  total_hits?: number;
}

export interface DiditDecision {
  status?: string;
  features?: string | string[];
  id_verifications?: DiditIdVerification[] | null;
  face_matches?: DiditFaceMatch[] | null;
  liveness_checks?: DiditLivenessCheck[] | null;
  aml_screenings?: DiditAmlScreening[] | null;
  [key: string]: unknown;
}

/** Live decision fetch. Returns null when unconfigured, unreachable, or 404. */
export async function fetchDiditDecision(
  sessionId: string,
): Promise<DiditDecision | null> {
  const apiKey = getDiditApiKey();
  if (!apiKey || !sessionId) return null;
  try {
    const response = await fetch(
      `${DIDIT_BASE_URL}/session/${sessionId}/decision/`,
      { headers: { "x-api-key": apiKey }, cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as DiditDecision;
  } catch (error) {
    console.error("[Didit] Decision fetch failed:", error);
    return null;
  }
}

/**
 * Admin override on Didit itself (PATCH update-status). `skipped` means the
 * call was not made or Didit refused the current-state transition - the
 * caller records that in the local audit note instead of failing.
 */
export async function pushDiditStatusUpdate(
  sessionId: string,
  newStatus: "Approved" | "Declined" | "Resubmitted",
  options: {
    comment?: string;
    nodesToResubmit?: { node_id: string; feature: string }[];
  } = {},
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const apiKey = getDiditApiKey();
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: "Didit API key is not configured",
    };
  }
  try {
    const response = await fetch(
      `${DIDIT_BASE_URL}/session/${sessionId}/update-status/`,
      {
        method: "PATCH",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          new_status: newStatus,
          ...(options.comment ? { comment: options.comment } : {}),
          ...(options.nodesToResubmit?.length
            ? { nodes_to_resubmit: options.nodesToResubmit }
            : {}),
        }),
      },
    );
    if (response.ok) return { ok: true, skipped: false };
    if (response.status === 400 || response.status === 409) {
      return {
        ok: false,
        skipped: true,
        error: `Didit cannot update a session in its current state (HTTP ${response.status})`,
      };
    }
    return {
      ok: false,
      skipped: false,
      error: `Didit update-status failed (HTTP ${response.status})`,
    };
  } catch (error) {
    console.error("[Didit] update-status failed:", error);
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ---------------------------------------------------------------------------
// Pure normalizers (unit-tested)
// ---------------------------------------------------------------------------

export type RecordCheckResult = "match" | "partial" | "differs" | "unknown";

export interface RecordCheckRow {
  field: string;
  submitted: string | null;
  official: string | null;
  result: RecordCheckResult;
}

export interface DecisionSummary {
  status: string | null;
  sessionFinished: boolean;
  faceMatchScore: number | null;
  idType: string | null;
  idNumber: string | null;
  extracted: {
    fullName: string | null;
    dateOfBirth: string | null;
    idNumber: string | null;
  };
  documents: {
    documentType: string | null;
    frontImage: string | null;
    backImage: string | null;
    selfieImage: string | null;
  };
  recordCheck: { source: string | null; rows: RecordCheckRow[] } | null;
  checksTotal: number | null;
  checksPassed: number | null;
  amlHits: number | null;
  crossSessionMatches: number;
  blocklistedMatches: boolean;
  warnings: { risk?: string; short_description?: string }[];
}

const CHECK_BLOCKS = [
  "id_verifications",
  "liveness_checks",
  "face_matches",
  "aml_screenings",
  "nfc_verifications",
  "poa_verifications",
  "phone_verifications",
  "email_verifications",
  "database_validations",
  "ip_analyses",
] as const;

const PASSING_STATUSES = new Set([
  "approved",
  "passed",
  "success",
  "clear",
  "ok",
  "valid",
  "verified",
  "match",
  "complete",
  "completed",
]);

const countChecks = (
  source: Record<string, unknown>,
): { total: number | null; passed: number | null } => {
  const rawFeatures = source.features;
  const featureCount = Array.isArray(rawFeatures)
    ? rawFeatures.length
    : typeof rawFeatures === "string" && rawFeatures.trim()
      ? rawFeatures.split(",").filter(Boolean).length
      : null;

  let present = 0;
  let passed = 0;
  for (const key of CHECK_BLOCKS) {
    const value = source[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    present += 1;
    const first = value[0] as { status?: unknown } | null;
    if (
      first &&
      PASSING_STATUSES.has(String(first.status ?? "").toLowerCase())
    ) {
      passed += 1;
    }
  }

  return {
    total: featureCount ?? (present > 0 ? present : null),
    passed: present > 0 ? passed : null,
  };
};

export const isSessionFinished = (status?: string): boolean => {
  const value = status?.toLowerCase();
  if (!value) return false;
  return !["not started", "in progress", "awaiting user", "pending"].includes(
    value,
  );
};

export const normalizeComparisonResult = (
  result: unknown,
): RecordCheckResult => {
  const value = String(result ?? "").toLowerCase();
  if (!value) return "unknown";
  if (value.includes("partial")) return "partial";
  if (
    value.includes("diff") ||
    value.includes("mismatch") ||
    value.includes("no_match") ||
    value.includes("fail")
  ) {
    return "differs";
  }
  if (
    value.includes("match") ||
    value.includes("pass") ||
    value.includes("ok") ||
    value.includes("clear") ||
    value.includes("valid") ||
    value.includes("success") ||
    value.includes("approved")
  ) {
    return "match";
  }
  return "unknown";
};

const normalizeComparable = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,;:-]/g, " ")
    .replace(/\s+/g, " ");

const parseLooseDate = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  if (!text || !/\d/.test(text)) return null;
  // ISO dates parse as UTC; read their calendar fields directly so the
  // comparison never shifts with the server timezone.
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (isoMatch) {
    return `${Number(isoMatch[1])}-${Number(isoMatch[2])}-${Number(isoMatch[3])}`;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) return null;
  return `${year}-${date.getMonth() + 1}-${date.getDate()}`;
};

/**
 * Fallback field comparison for the record-check table when Didit's own
 * id_lookup comparison is unavailable: our stored value vs the extracted one.
 */
export function compareKycRecord(
  submitted: string | null | undefined,
  official: string | null | undefined,
): RecordCheckResult {
  const a = normalizeComparable(submitted);
  const b = normalizeComparable(official);
  if (!a || !b) return "unknown";
  if (a === b) return "match";

  const dateA = parseLooseDate(submitted);
  const dateB = parseLooseDate(official);
  if (dateA && dateB) return dateA === dateB ? "match" : "differs";

  const digitsA = a.replace(/\D/g, "");
  const digitsB = b.replace(/\D/g, "");
  if (digitsA.length >= 4 && digitsA === digitsB) return "match";

  if (a.includes(b) || b.includes(a)) return "partial";

  const tokensA = a.split(" ");
  const tokensB = b.split(" ");
  if (
    tokensA.length > 1 &&
    tokensB.length > 1 &&
    tokensA[0] === tokensB[0] &&
    tokensA[tokensA.length - 1] === tokensB[tokensB.length - 1]
  ) {
    return "partial";
  }
  return "differs";
}

const comparisonRow = (item: Record<string, unknown>): RecordCheckRow => ({
  field: String(item.field ?? item.name ?? item.key ?? "Field"),
  submitted:
    (item.provided as string) ??
    (item.submitted as string) ??
    (item.value as string) ??
    null,
  official:
    (item.record as string) ??
    (item.official as string) ??
    (item.expected as string) ??
    null,
  result: normalizeComparisonResult(item.result ?? item.status),
});

/** Turns a live decision payload into the shape the detail page renders. */
export function summarizeDecision(decision: DiditDecision): DecisionSummary {
  const idv = decision.id_verifications?.[0] ?? null;
  const faceMatch = decision.face_matches?.[0] ?? null;
  const liveness = decision.liveness_checks?.[0] ?? null;
  const aml = decision.aml_screenings?.[0] ?? null;

  const rawScore =
    typeof faceMatch?.score === "number"
      ? faceMatch.score
      : typeof idv?.id_lookup?.face_match_score === "number"
        ? idv.id_lookup.face_match_score
        : null;

  const comparison = Array.isArray(idv?.id_lookup?.comparison)
    ? idv.id_lookup.comparison
    : [];
  const rows = comparison.map(comparisonRow);
  const recordCheck = rows.length
    ? { source: idv?.id_lookup?.source ?? null, rows }
    : null;

  const checks = countChecks(decision as unknown as Record<string, unknown>);
  const matches = liveness?.matches ?? [];

  return {
    status: decision.status ?? null,
    sessionFinished: isSessionFinished(decision.status),
    faceMatchScore: rawScore == null ? null : Math.round(rawScore),
    idType: idv?.document_subtype || idv?.document_type || null,
    idNumber: idv?.document_number ?? null,
    extracted: {
      fullName: idv?.full_name ?? null,
      dateOfBirth: idv?.date_of_birth ?? null,
      idNumber: idv?.document_number ?? null,
    },
    documents: {
      documentType: idv?.document_type ?? null,
      frontImage: idv?.front_image ?? null,
      backImage: idv?.back_image ?? null,
      selfieImage: liveness?.reference_image ?? idv?.portrait_image ?? null,
    },
    recordCheck,
    checksTotal: checks.total,
    checksPassed: checks.passed,
    amlHits: aml
      ? typeof aml.total_hits === "number"
        ? aml.total_hits
        : null
      : null,
    crossSessionMatches: matches.length,
    blocklistedMatches: matches.some((match) => match.is_blocklisted),
    warnings: (idv?.warnings ?? []).map((warning) => ({
      risk: warning?.risk,
      short_description: warning?.short_description,
    })),
  };
}

/**
 * Queue-cache extraction from a webhook/decision payload: everything the
 * queue renders without calling Didit per row.
 */
export function extractCachedDecisionFields(
  payload: Record<string, unknown> | null | undefined,
): {
  faceMatchScore: number | null;
  idType: string | null;
  idNumber: string | null;
  checksPassed: number | null;
  checksTotal: number | null;
} {
  const empty = {
    faceMatchScore: null,
    idType: null,
    idNumber: null,
    checksPassed: null,
    checksTotal: null,
  };
  if (!payload || typeof payload !== "object") return empty;

  const idv = Array.isArray(payload.id_verifications)
    ? ((payload.id_verifications[0] ?? null) as DiditIdVerification | null)
    : null;
  const face = Array.isArray(payload.face_matches)
    ? ((payload.face_matches[0] ?? null) as DiditFaceMatch | null)
    : null;

  const rawScore =
    typeof face?.score === "number"
      ? face.score
      : typeof idv?.id_lookup?.face_match_score === "number"
        ? idv.id_lookup.face_match_score
        : null;

  const checks = countChecks(payload);

  return {
    faceMatchScore: rawScore == null ? null : Math.round(rawScore),
    idType: idv?.document_subtype || idv?.document_type || null,
    idNumber: idv?.document_number ?? null,
    checksPassed: checks.passed,
    checksTotal: checks.total,
  };
}

/**
 * Maps the dialog's redo choices onto Didit nodes from the live decision so
 * PATCH update-status can request a partial redo. Empty when node ids are
 * unavailable (caller falls back to a local-only resubmission).
 */
export function buildResubmitNodes(
  decision: DiditDecision | null,
  redo: readonly string[],
): { node_id: string; feature: string }[] {
  if (!decision) return [];
  const nodes: { node_id: string; feature: string }[] = [];
  const idNode = decision.id_verifications?.[0]?.node_id;
  const livenessNode = decision.liveness_checks?.[0]?.node_id;

  if (redo.includes("selfie") && livenessNode) {
    nodes.push({ node_id: livenessNode, feature: "liveness" });
  }
  if (
    (redo.includes("id_document") || redo.includes("date_of_birth")) &&
    idNode
  ) {
    nodes.push({ node_id: idNode, feature: "id_verification" });
  }
  return nodes;
}
