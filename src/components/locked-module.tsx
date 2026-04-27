"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import type { ModuleSlug } from "@/lib/auth/get-user";

const MODULE_PITCH: Record<
  ModuleSlug,
  { title: string; lede: string; bullets: string[] }
> = {
  map: {
    title: "Map",
    lede: "See every farm, market, processor, and recovery node in your region on one interactive map.",
    bullets: [
      "Filter by farm type, county, member status, and compliance",
      "Tap any pin for the live entity record",
      "Drop straight into a network analysis from any node",
    ],
  },
  network: {
    title: "Network",
    lede: "A force-directed graph of who buys from whom across the regional food system.",
    bullets: [
      "Trace producers, distributors, and end buyers in one view",
      "Find clustering and gaps your relationships don't show",
      "Click any node for full context and contact paths",
    ],
  },
  flows: {
    title: "Flows",
    lede: "Sankey-style aggregate flows: how product moves from farms through aggregation to end markets.",
    bullets: [
      "See where regional supply concentrates and where it leaks",
      "Quantify channel volume by buyer type",
      "Built for processors, hubs, and institutional procurement teams",
    ],
  },
  list: {
    title: "List",
    lede: "A working list of every farm matching your filters, with the operational detail buyers actually need.",
    bullets: [
      "Sort and scan by acres, type, and buyer-readiness",
      "Inline compliance status and gap counts",
      "Use the same filters as the map — keep one mental model",
    ],
  },
  directory: {
    title: "Directory",
    lede: "The full regional directory: farms, markets, distributors, processors, recovery nodes, and enablers.",
    bullets: [
      "Group by entity type or member status",
      "Find the right counterparty without a phone tree",
      "The fastest way to introduce two members of the network",
    ],
  },
  county: {
    title: "By county",
    lede: "Population-scale aggregates rolled up to the county level — the unit governments and funders fund.",
    bullets: [
      "Counts, acres, and member status per county",
      "Compare regions side by side without spreadsheets",
      "Drill into any county for the full member list",
    ],
  },
  dashboard: {
    title: "Dashboard",
    lede: "Your persona's home view. Headline metrics, regen acres, and the moves available right now.",
    bullets: [
      "Curated for your role — no generic chrome",
      "Same data as the underlying tools, summarised",
      "Where outreach and procurement decisions start",
    ],
  },
  pipeline: {
    title: "Pipeline",
    lede: "AFS-internal: the engagement pipeline across the region's farms, from prospect to enrolled.",
    bullets: [
      "Stage transitions, time-in-stage, and stuck deals",
      "Compliance gap-list to triage who's closest to ready",
      "Restricted to AFS staff — not part of any tenant tier",
    ],
  },
  reports: {
    title: "Reports",
    lede: "Persona-scoped reports: the recurring questions you ask the data, answered.",
    bullets: [
      "Buyers see sourcing and supply readiness",
      "Funders see outcomes and MMRV",
      "Farmers see audience reach and listing performance",
    ],
  },
};

// Renders inside a TabsContent slot when the user's tier doesn't entitle
// them to that module. Same shape as the live tools (rounded card, regional
// chrome) so the page doesn't feel broken — it feels gated. Primary CTA
// routes to /pricing with the locked module slug highlighted; the email
// address stays visible underneath as a direct fallback.
export function LockedModule({ slug }: { slug: ModuleSlug }) {
  const pitch = MODULE_PITCH[slug];
  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-slate-pale px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal-soft">
          <Lock className="h-3 w-3" />
          Available on a higher plan
        </div>

        <h2 className="mt-5 font-display text-[24px] sm:text-[28px] font-semibold text-slate-blue leading-[1.2] tracking-[-0.015em]">
          {pitch.title}
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-soft">
          {pitch.lede}
        </p>

        <ul className="mx-auto mt-6 max-w-md text-left text-[13px] leading-relaxed text-charcoal-soft space-y-2">
          {pitch.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span
                aria-hidden
                className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-accent-amber"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Link
          href={`/pricing?highlight=${slug}`}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-blue px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-warm-cream hover:bg-slate-blue-light transition-colors"
        >
          See plans that include this
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <p className="mt-4 text-[11px] text-charcoal-soft/80">
          Or email{" "}
          <a
            href={`mailto:hello@afarmersshare.com?subject=Unlock%20${encodeURIComponent(
              pitch.title,
            )}%20on%20Provender`}
            className="font-semibold text-slate-blue hover:text-slate-blue-light"
          >
            hello@afarmersshare.com
          </a>
        </p>
      </div>
    </div>
  );
}
