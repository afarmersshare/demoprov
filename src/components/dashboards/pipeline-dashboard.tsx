"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Farm,
  ComplianceInfo,
} from "../farms/network-explorer";
import {
  loadOverrides,
  saveOverrides,
  loadActivity,
  appendActivity,
  clearSandbox,
  syntheticTimeline,
  daysBetween,
  type PipelineOverrides,
  type ActivityEntry,
  type PipelineStage,
} from "@/lib/pipeline-sandbox";

// TODO(phase-4-auth): when real auth ships, scope `farms` to the
// logged-in tenant's farms via a server-side filter. Today every farm
// is visible because there's no tenant-ownership relation yet.

type Props = {
  farms: Farm[];
  complianceByFarm: Map<string, ComplianceInfo>;
};

type SortKey =
  | "name"
  | "county"
  | "stage"
  | "last"
  | "next"
  | "compliance";

const STAGE_ORDER: Record<PipelineStage, number> = {
  prospect: 0,
  engaged: 1,
  enrolled: 2,
  alumni: 3,
};

const STAGE_LABEL: Record<PipelineStage, string> = {
  prospect: "Prospect",
  engaged: "Engaged",
  enrolled: "Enrolled",
  alumni: "Alumni",
};

const STAGE_COLOR: Record<PipelineStage, string> = {
  prospect: "bg-terracotta",
  engaged: "bg-amber",
  enrolled: "bg-moss",
  alumni: "bg-charcoal-soft",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const now = new Date().toISOString();
  const diff = daysBetween(now, iso);
  if (diff === 0) return "today";
  if (diff > 0) return `in ${diff}d`;
  return `${Math.abs(diff)}d ago`;
}

function countyOf(f: Farm): string {
  return (f.attributes as { county_name?: string } | null)?.county_name ?? "—";
}

export function PipelineDashboard({ farms, complianceByFarm }: Props) {
  const [overrides, setOverrides] = useState<PipelineOverrides>({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("next");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [mutationDialog, setMutationDialog] = useState<
    null | "status" | "outreach" | "flag"
  >(null);
  const [pendingStage, setPendingStage] = useState<PipelineStage>("enrolled");
  const [pendingDate, setPendingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    setOverrides(loadOverrides());
    setActivity(loadActivity());
  }, []);

  // Build enriched view of each farm: actual stage (with override), synthetic
  // timeline (with override), compliance info.
  const rows = useMemo(() => {
    return farms.map((f) => {
      const override = overrides[f.upid];
      const rawStage =
        (override?.status ??
          (f.afs_member_status as PipelineStage | null) ??
          "prospect") as PipelineStage;
      const syn = syntheticTimeline(f.upid, rawStage);
      const lastContactAt = override?.lastContactAt ?? syn.lastContactAt;
      const nextContactDueAt =
        override?.nextContactDueAt === null
          ? null
          : (override?.nextContactDueAt ?? syn.nextContactDueAt);
      const compliance = complianceByFarm.get(f.upid) ?? null;
      return {
        farm: f,
        stage: rawStage,
        lastContactAt,
        nextContactDueAt,
        compliance,
        hasOverride: !!override,
      };
    });
  }, [farms, overrides, complianceByFarm]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (stageFilter !== "all") {
      out = out.filter((r) => r.stage === stageFilter);
    }
    const dirMul = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "name":
          return dirMul * a.farm.name.localeCompare(b.farm.name);
        case "county":
          return dirMul * countyOf(a.farm).localeCompare(countyOf(b.farm));
        case "stage":
          return dirMul * (STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
        case "last":
          return (
            dirMul *
            (new Date(a.lastContactAt).getTime() -
              new Date(b.lastContactAt).getTime())
          );
        case "next": {
          const an = a.nextContactDueAt
            ? new Date(a.nextContactDueAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bn = b.nextContactDueAt
            ? new Date(b.nextContactDueAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          return dirMul * (an - bn);
        }
        case "compliance": {
          const order = { buyer_ready: 0, close: 1, needs_work: 2 };
          const ax = a.compliance ? order[a.compliance.status] : 3;
          const bx = b.compliance ? order[b.compliance.status] : 3;
          return dirMul * (ax - bx);
        }
      }
    });
    return out;
  }, [rows, stageFilter, sort, sortDir]);

  // Metric cards
  const metrics = useMemo(() => {
    const stageCounts: Record<PipelineStage, number> = {
      prospect: 0,
      engaged: 0,
      enrolled: 0,
      alumni: 0,
    };
    let dueThisWeek = 0;
    let pastDue = 0;
    let readyToActivate = 0;
    const now = new Date();
    for (const r of rows) {
      stageCounts[r.stage] += 1;
      if (r.nextContactDueAt) {
        const diff = daysBetween(now.toISOString(), r.nextContactDueAt);
        if (diff < 0) pastDue += 1;
        else if (diff <= 7) dueThisWeek += 1;
      }
      if (
        r.stage === "enrolled" &&
        r.compliance?.status === "buyer_ready"
      ) {
        readyToActivate += 1;
      }
    }
    return {
      total: rows.length,
      stageCounts,
      dueThisWeek,
      pastDue,
      readyToActivate,
    };
  }, [rows]);

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selected.has(r.farm.upid)),
    [filteredRows, selected],
  );

  // Handlers
  const toggleOne = (upid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(upid)) next.delete(upid);
      else next.add(upid);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.farm.upid)));
    }
  };

  const applyStatusChange = () => {
    const next = { ...overrides };
    const nowIso = new Date().toISOString();
    for (const r of selectedRows) {
      next[r.farm.upid] = {
        ...next[r.farm.upid],
        status: pendingStage,
        updatedAt: nowIso,
      };
    }
    setOverrides(next);
    saveOverrides(next);
    const updated = appendActivity({
      action: "status_change",
      count: selectedRows.length,
      detail: `→ ${STAGE_LABEL[pendingStage]}`,
    });
    setActivity(updated);
    setMutationDialog(null);
    setSelected(new Set());
  };

  const applyOutreachSchedule = () => {
    const next = { ...overrides };
    const nowIso = new Date().toISOString();
    const dueIso = new Date(pendingDate).toISOString();
    for (const r of selectedRows) {
      next[r.farm.upid] = {
        ...next[r.farm.upid],
        nextContactDueAt: dueIso,
        updatedAt: nowIso,
      };
    }
    setOverrides(next);
    saveOverrides(next);
    const updated = appendActivity({
      action: "schedule_outreach",
      count: selectedRows.length,
      detail: `due ${pendingDate}`,
    });
    setActivity(updated);
    setMutationDialog(null);
    setSelected(new Set());
  };

  const applyFlagCompliance = () => {
    const withGaps = selectedRows.filter(
      (r) => r.compliance && r.compliance.missing.length > 0,
    );
    const updated = appendActivity({
      action: "flag",
      count: withGaps.length,
      detail: `${withGaps.length} of ${selectedRows.length} have compliance gaps`,
    });
    setActivity(updated);
    setMutationDialog(null);
  };

  const resetSandbox = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Clear all sandbox changes? This will remove your local status changes and scheduled outreach from this browser.",
      )
    ) {
      return;
    }
    clearSandbox();
    setOverrides({});
    setActivity([]);
    setSelected(new Set());
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="space-y-5">
      {/* Header + sandbox notice */}
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
              Pipeline status
            </div>
            <div className="font-display text-[22px] font-semibold text-moss leading-tight">
              Make the aggregation network operational
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overrideCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                {overrideCount} sandbox edit{overrideCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={resetSandbox}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-charcoal-soft hover:text-terracotta transition-colors"
              disabled={overrideCount === 0 && activity.length === 0}
            >
              <RotateCcw className="w-3 h-3" />
              Clear sandbox
            </button>
          </div>
        </div>
        <p className="text-[13px] text-charcoal-soft leading-relaxed max-w-prose">
          Track where every farm sits in the pipeline, see who&apos;s due for
          outreach, and act on multiple farms at once. Edits made here are
          saved in your browser as a demo sandbox — in the real product,
          bulk actions write back to the shared database for everyone on
          your team.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[14px] border border-cream-shadow bg-white p-5 shadow-sm">
          <div className="font-display text-[36px] font-semibold text-charcoal leading-none tabular-nums">
            {metrics.total}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Total farms tracked
          </div>
          <div className="mt-1 text-[12px] text-charcoal-soft/80">
            {metrics.stageCounts.prospect} prospect ·{" "}
            {metrics.stageCounts.engaged} engaged ·{" "}
            {metrics.stageCounts.enrolled} enrolled
          </div>
        </div>
        <div className="rounded-[14px] border border-cream-shadow bg-white p-5 shadow-sm">
          <div className="font-display text-[36px] font-semibold text-charcoal leading-none tabular-nums">
            {metrics.dueThisWeek}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Outreach due this week
          </div>
          <div
            className={`mt-1 text-[12px] ${metrics.pastDue > 0 ? "text-terracotta" : "text-charcoal-soft/80"}`}
          >
            {metrics.pastDue > 0
              ? `${metrics.pastDue} past due — needs attention`
              : "All caught up"}
          </div>
        </div>
        <div className="rounded-[14px] border border-cream-shadow bg-white p-5 shadow-sm">
          <div className="font-display text-[36px] font-semibold text-moss leading-none tabular-nums">
            {metrics.readyToActivate}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Ready to activate
          </div>
          <div className="mt-1 text-[12px] text-charcoal-soft/80">
            Enrolled &amp; buyer-ready — can move to a live sourcing deal
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-[14px] border border-cream-shadow bg-white p-5 shadow-sm">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
          Pipeline funnel
        </div>
        <div className="flex h-8 rounded-[8px] overflow-hidden border border-cream-shadow">
          {(["prospect", "engaged", "enrolled", "alumni"] as PipelineStage[]).map((s) => {
            const count = metrics.stageCounts[s];
            const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s}
                className={`${STAGE_COLOR[s]} flex items-center justify-center text-[11px] font-semibold text-cream`}
                style={{ width: `${pct}%` }}
                title={`${STAGE_LABEL[s]}: ${count} (${pct.toFixed(0)}%)`}
              >
                {pct > 8 ? `${STAGE_LABEL[s]} · ${count}` : count}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-charcoal-soft">
          {(["prospect", "engaged", "enrolled", "alumni"] as PipelineStage[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${STAGE_COLOR[s]}`} />
              {STAGE_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-[14px] border border-cream-shadow bg-white p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Stage filter
          </label>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="engaged">Engaged</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-[12px] text-charcoal-soft">
          Showing <b>{filteredRows.length}</b> of {rows.length} farms
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() => setMutationDialog("status")}
            className="inline-flex items-center gap-1.5 rounded-full bg-moss text-cream px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-moss-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-3 h-3" />
            Update status
          </button>
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() => setMutationDialog("outreach")}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-shadow bg-white text-charcoal px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-cream/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Calendar className="w-3 h-3" />
            Schedule outreach
          </button>
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() => setMutationDialog("flag")}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-shadow bg-white text-charcoal px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-cream/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-3 h-3" />
            Flag compliance gaps
          </button>
        </div>
      </div>

      {/* Farm table */}
      <div className="rounded-[14px] border border-cream-shadow bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-cream/40 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
                <th className="p-3 w-10">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center text-charcoal-soft hover:text-moss"
                    aria-label="Select all"
                  >
                    {selected.size > 0 && selected.size === filteredRows.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <SortHeader
                  label="Farm"
                  column="name"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
                <SortHeader
                  label="County"
                  column="county"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
                <SortHeader
                  label="Stage"
                  column="stage"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
                <SortHeader
                  label="Last contact"
                  column="last"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
                <SortHeader
                  label="Next action"
                  column="next"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
                <SortHeader
                  label="Compliance"
                  column="compliance"
                  sort={sort}
                  sortDir={sortDir}
                  onSort={(c) => {
                    if (sort === c)
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSort(c);
                      setSortDir("asc");
                    }
                  }}
                />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const isSelected = selected.has(r.farm.upid);
                const now = new Date().toISOString();
                const nextDays = r.nextContactDueAt
                  ? daysBetween(now, r.nextContactDueAt)
                  : null;
                const nextClass =
                  nextDays == null
                    ? "text-charcoal-soft"
                    : nextDays < 0
                      ? "text-terracotta font-semibold"
                      : nextDays <= 7
                        ? "text-amber font-semibold"
                        : "text-charcoal-soft";
                const compClass =
                  r.compliance?.status === "buyer_ready"
                    ? "text-moss"
                    : r.compliance?.status === "close"
                      ? "text-amber"
                      : r.compliance?.status === "needs_work"
                        ? "text-terracotta"
                        : "text-charcoal-soft";
                return (
                  <tr
                    key={r.farm.upid}
                    className={`border-t border-cream-shadow hover:bg-cream/20 transition-colors ${isSelected ? "bg-moss/5" : ""}`}
                  >
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => toggleOne(r.farm.upid)}
                        className="inline-flex items-center text-charcoal-soft hover:text-moss"
                        aria-label={`Select ${r.farm.name}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-moss" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-medium text-charcoal">
                      {r.farm.name}
                      {r.hasOverride ? (
                        <span
                          className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-amber"
                          title="Sandbox edit"
                        />
                      ) : null}
                    </td>
                    <td className="p-3 text-charcoal-soft">
                      {countyOf(r.farm)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-cream ${STAGE_COLOR[r.stage]}`}
                      >
                        {STAGE_LABEL[r.stage]}
                      </span>
                    </td>
                    <td className="p-3 text-charcoal-soft tabular-nums">
                      {fmtDate(r.lastContactAt)}{" "}
                      <span className="text-[11px] text-charcoal-soft/60">
                        ({fmtRelative(r.lastContactAt)})
                      </span>
                    </td>
                    <td className={`p-3 tabular-nums ${nextClass}`}>
                      {r.nextContactDueAt ? (
                        <>
                          {fmtDate(r.nextContactDueAt)}{" "}
                          <span className="text-[11px] opacity-80">
                            ({fmtRelative(r.nextContactDueAt)})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`p-3 font-medium ${compClass}`}>
                      {r.compliance?.status === "buyer_ready"
                        ? "Buyer-ready"
                        : r.compliance?.status === "close"
                          ? `${r.compliance.missing.length} gap${r.compliance.missing.length === 1 ? "" : "s"}`
                          : r.compliance?.status === "needs_work"
                            ? "Needs work"
                            : "—"}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-charcoal-soft italic"
                  >
                    No farms match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity log */}
      {activity.length > 0 ? (
        <div className="rounded-[14px] border border-cream-shadow bg-white p-5 shadow-sm">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Recent pipeline activity
          </div>
          <div className="space-y-2">
            {activity.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="flex items-baseline justify-between gap-4 text-[12px] border-b border-cream-shadow/60 pb-2 last:border-b-0"
              >
                <span className="text-charcoal">
                  <b className="font-semibold">
                    {a.action === "status_change"
                      ? "Status change"
                      : a.action === "schedule_outreach"
                        ? "Scheduled outreach"
                        : a.action === "note"
                          ? "Note added"
                          : "Flagged"}
                  </b>{" "}
                  · {a.count} farm{a.count === 1 ? "" : "s"} · {a.detail}
                </span>
                <span className="text-charcoal-soft/70 tabular-nums text-[11px]">
                  {new Date(a.at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ========= Dialogs ========= */}
      {mutationDialog === "status" ? (
        <Dialog onClose={() => setMutationDialog(null)}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Update status
          </div>
          <h3 className="font-display text-[20px] text-charcoal mb-3">
            Move {selectedRows.length} farm{selectedRows.length === 1 ? "" : "s"} to a new stage
          </h3>
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-2">
              New stage
            </label>
            <Select
              value={pendingStage}
              onValueChange={(v) => setPendingStage(v as PipelineStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4 text-[12px] text-charcoal-soft max-h-32 overflow-y-auto border border-cream-shadow rounded-[6px] p-3 bg-cream/20">
            {selectedRows.map((r) => (
              <div key={r.farm.upid} className="py-0.5">
                • {r.farm.name}{" "}
                <span className="text-charcoal-soft/60">
                  ({STAGE_LABEL[r.stage]} → {STAGE_LABEL[pendingStage]})
                </span>
              </div>
            ))}
          </div>
          <DialogActions
            onCancel={() => setMutationDialog(null)}
            onConfirm={applyStatusChange}
            confirmLabel={`Update ${selectedRows.length}`}
          />
        </Dialog>
      ) : null}

      {mutationDialog === "outreach" ? (
        <Dialog onClose={() => setMutationDialog(null)}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Schedule outreach
          </div>
          <h3 className="font-display text-[20px] text-charcoal mb-3">
            Set next-action date for {selectedRows.length} farm
            {selectedRows.length === 1 ? "" : "s"}
          </h3>
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-2">
              Due date
            </label>
            <input
              type="date"
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
              className="w-full border border-cream-shadow rounded-[6px] px-3 py-2 text-[13px]"
            />
          </div>
          <DialogActions
            onCancel={() => setMutationDialog(null)}
            onConfirm={applyOutreachSchedule}
            confirmLabel={`Schedule ${selectedRows.length}`}
          />
        </Dialog>
      ) : null}

      {mutationDialog === "flag" ? (
        <Dialog onClose={() => setMutationDialog(null)}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            Flag compliance gaps
          </div>
          <h3 className="font-display text-[20px] text-charcoal mb-3">
            Review compliance across {selectedRows.length} selected farm
            {selectedRows.length === 1 ? "" : "s"}
          </h3>
          <div className="mb-4 text-[13px] text-charcoal-soft leading-relaxed">
            {selectedRows.filter((r) => r.compliance && r.compliance.missing.length > 0).length}{" "}
            farm
            {selectedRows.filter((r) => r.compliance && r.compliance.missing.length > 0)
              .length === 1
              ? ""
              : "s"}{" "}
            have open compliance gaps. Flagging adds a pipeline activity
            entry so the team knows to address these before the next buyer
            conversation.
          </div>
          <div className="mb-4 max-h-48 overflow-y-auto border border-cream-shadow rounded-[6px] p-3 bg-cream/20 text-[12px]">
            {selectedRows
              .filter((r) => r.compliance && r.compliance.missing.length > 0)
              .map((r) => (
                <div key={r.farm.upid} className="py-0.5 text-charcoal">
                  <b>{r.farm.name}</b>{" "}
                  <span className="text-terracotta">
                    — {r.compliance?.missing.join(", ")}
                  </span>
                </div>
              ))}
            {selectedRows.filter(
              (r) => r.compliance && r.compliance.missing.length > 0,
            ).length === 0 ? (
              <div className="text-moss italic">
                No gaps — all selected farms are buyer-ready.
              </div>
            ) : null}
          </div>
          <DialogActions
            onCancel={() => setMutationDialog(null)}
            onConfirm={applyFlagCompliance}
            confirmLabel="Log to activity"
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  sortDir: "asc" | "desc";
  onSort: (c: SortKey) => void;
}) {
  const active = sort === column;
  return (
    <th className="p-3 text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${active ? "text-moss" : "text-charcoal-soft hover:text-moss"}`}
      >
        {label}
        {active ? (
          <span className="text-[10px]">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

function Dialog({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-[14px] border border-cream-shadow bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-cream-shadow text-charcoal px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-cream/50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-full bg-moss text-cream px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-moss-light transition-colors"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
