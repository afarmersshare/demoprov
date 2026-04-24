// Sandbox layer for Pipeline-tab writes in the demo. Edits a farmer or
// aggregator makes (status changes, scheduled outreach, notes) are stored
// in the visitor's browser — not the shared Supabase database — so demo
// visitors can experience the bulk-action flow without polluting data
// for other visitors.
//
// Real product: swap `loadOverrides` + `saveOverrides` for Supabase
// writes scoped to the authenticated tenant. The shape of
// PipelineOverride is designed to mirror what the real mutation would
// send.

const STORAGE_KEY = "provender.pipeline.overrides.v1";
const ACTIVITY_KEY = "provender.pipeline.activity.v1";
const ACTIVITY_LIMIT = 50;

export type PipelineStage = "prospect" | "engaged" | "enrolled" | "alumni";

export type PipelineOverride = {
  status?: PipelineStage;
  nextContactDueAt?: string | null; // ISO date
  lastContactAt?: string | null; // ISO date
  note?: string;
  updatedAt: string; // ISO timestamp
};

export type PipelineOverrides = Record<string, PipelineOverride>;

export type ActivityEntry = {
  id: string;
  at: string; // ISO timestamp
  action: "status_change" | "schedule_outreach" | "note" | "flag";
  count: number;
  detail: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadOverrides(): PipelineOverrides {
  if (typeof window === "undefined") return {};
  return safeParse<PipelineOverrides>(
    window.localStorage.getItem(STORAGE_KEY),
    {},
  );
}

export function saveOverrides(next: PipelineOverrides): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function loadActivity(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse<ActivityEntry[]>(
    window.localStorage.getItem(ACTIVITY_KEY),
    [],
  );
}

export function saveActivity(next: ActivityEntry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = next.slice(0, ACTIVITY_LIMIT);
  window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
}

export function appendActivity(
  entry: Omit<ActivityEntry, "id" | "at">,
): ActivityEntry[] {
  const full: ActivityEntry = {
    ...entry,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  const existing = loadActivity();
  const next = [full, ...existing];
  saveActivity(next);
  return next;
}

export function clearSandbox(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(ACTIVITY_KEY);
}

// Deterministic per-farm synthesis — each farm gets a plausible "last
// contact" date and "next action due" date computed from its upid, so
// the pipeline looks busy without random-changes-between-renders.
// Swap for real Supabase columns once the activity-log table lands.
function hashUpid(upid: string): number {
  let h = 0;
  for (let i = 0; i < upid.length; i++) {
    h = (h * 31 + upid.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export type SyntheticTimeline = {
  lastContactAt: string; // ISO date
  nextContactDueAt: string; // ISO date
};

export function syntheticTimeline(
  upid: string,
  stage: PipelineStage,
): SyntheticTimeline {
  const h = hashUpid(upid);
  const now = new Date();
  // Last contact 2–60 days ago depending on stage
  const stageFactor: Record<PipelineStage, number> = {
    prospect: 40,
    engaged: 14,
    enrolled: 25,
    alumni: 120,
  };
  const maxDaysAgo = stageFactor[stage];
  const daysAgo = 2 + (h % maxDaysAgo);
  const last = new Date(now);
  last.setDate(last.getDate() - daysAgo);

  // Next due: some within 7 days, some in past (past-due), deterministic
  const dueOffset = (h % 21) - 5; // range roughly -5 .. +15 days
  const next = new Date(now);
  next.setDate(next.getDate() + dueOffset);

  return {
    lastContactAt: last.toISOString(),
    nextContactDueAt: next.toISOString(),
  };
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}
