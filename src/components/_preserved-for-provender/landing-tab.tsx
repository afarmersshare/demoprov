"use client";

import type { Persona } from "./network-explorer";
import type { Tier } from "@/lib/auth/get-user";

// Personalized "your home view" rendered when an entitled user lands on the
// Landing tab. Demo / unentitled users see LockedModule instead — this only
// renders when isUnlocked('landing') is true.
//
// Per-persona copy is intentionally aspirational: the records, gaps, and
// matches it describes are the things the rest of the explorer surfaces, not
// the things rendered on this card. The Landing tab is the "you're inside
// the system" framing; the other tabs are where the data actually lives.
// When the demo grows real per-org records, this is the first surface to
// rewire to live data.

type TabId = "map" | "directory" | "list" | "county" | "network" | "flows";

type LandingCard = {
  label: string;
  detail: string;
  cta: { label: string; tab: TabId };
};

type PersonaCopy = {
  greeting: string; // "Welcome back, {name}." prefix is rendered separately.
  position: string; // 1-2 sentence personalized framing.
  cards: LandingCard[];
  closer: string; // single-line caption below the cards.
};

const PERSONA_COPY: Record<Persona, PersonaCopy> = {
  farmer: {
    greeting: "This is your view of the system.",
    position:
      "Provender starts where you are. Your certifications, capacity, and practices become legible to the buyers and institutions near you — without you having to navigate their procurement portals to get there.",
    cards: [
      {
        label: "Buyers in your delivery radius",
        detail: "Filterable by certification, sourcing volume, and seasonal window.",
        cta: { label: "Open the directory", tab: "directory" },
      },
      {
        label: "Demand match",
        detail: "See where your crops fit unmet regional supply.",
        cta: { label: "Open the map", tab: "map" },
      },
      {
        label: "Certification recognition",
        detail: "GAP, organic, regenerative — cross-referenced for buyers.",
        cta: { label: "Open the list", tab: "list" },
      },
    ],
    closer:
      "The more you contribute to the system, the more the system surfaces for you.",
  },
  buyer: {
    greeting: "This is your sourcing view.",
    position:
      "Provender maps what's available in your region — verified capacity, certification status, seasonal reliability — so you can evaluate supply before you make the call, not after.",
    cards: [
      {
        label: "Farms in your sourcing radius",
        detail: "Capacity, certifications, seasonality.",
        cta: { label: "Open the map", tab: "map" },
      },
      {
        label: "Compliance-ready producers",
        detail: "Pre-filtered for institutional procurement.",
        cta: { label: "Open the list", tab: "list" },
      },
      {
        label: "Regional supply gaps",
        detail: "Visible by crop type and county.",
        cta: { label: "Open by-county", tab: "county" },
      },
    ],
    closer:
      "Trust is built before the first PO. This is where buyers verify supply they're about to commit to.",
  },
  hub: {
    greeting: "This is your aggregation view.",
    position:
      "You sit between supply and demand. Provender maps upstream and downstream simultaneously — farms, buyers, flow volumes, county gaps — so you can see where you fit and where the connections you facilitate are most needed.",
    cards: [
      {
        label: "Upstream farm partners",
        detail: "By crop, capacity, and certification.",
        cta: { label: "Open the directory", tab: "directory" },
      },
      {
        label: "Downstream buyer channels",
        detail: "Institutional, retail, foodservice.",
        cta: { label: "Open the network", tab: "network" },
      },
      {
        label: "Active flow pathways",
        detail: "What's already routing through where.",
        cta: { label: "Open flows", tab: "flows" },
      },
    ],
    closer:
      "Provender connects to what you already use — it doesn't ask you to start over.",
  },
  policymaker: {
    greeting: "This is your regional view.",
    position:
      "Provender translates farm-level data into regional patterns — compliance readiness, supply gaps, equity indicators, concentration risk — so you can see where policy leverage actually exists.",
    cards: [
      {
        label: "County-level food system maps",
        detail: "Supply, demand, and infrastructure side by side.",
        cta: { label: "Open by-county", tab: "county" },
      },
      {
        label: "Regional resilience indicators",
        detail: "Where the system is thin, by metric.",
        cta: { label: "Open the map", tab: "map" },
      },
      {
        label: "Network connectivity",
        detail: "Who's connected to whom, and where it concentrates.",
        cta: { label: "Open the network", tab: "network" },
      },
    ],
    closer:
      "Trend data shows direction, not just state — whether things are improving or eroding.",
  },
  nonprofit: {
    greeting: "This is your access view.",
    position:
      "Provender shows you the farms, recovery sources, and access channels in your region — so you can build supply you can rely on without re-knocking on the same doors every season.",
    cards: [
      {
        label: "Farm partners by mission alignment",
        detail: "Recovery, donation, sliding-scale producers.",
        cta: { label: "Open the directory", tab: "directory" },
      },
      {
        label: "Recovery and surplus flows",
        detail: "What's routing through where, and where it's leaking.",
        cta: { label: "Open flows", tab: "flows" },
      },
      {
        label: "Access points and partner orgs",
        detail: "Co-mapped with farm supply.",
        cta: { label: "Open the map", tab: "map" },
      },
    ],
    closer:
      "Closing the loop matters more than scale. The system shows you both.",
  },
  funder: {
    greeting: "This is your impact view.",
    position:
      "Provender makes the regional food system's underlying structure visible — where capital gaps exist, where network maturity is accelerating, where a well-placed investment connects actors who are close but can't find each other.",
    cards: [
      {
        label: "Regional ecosystem mapping",
        detail: "Actors, flows, and gaps in one frame.",
        cta: { label: "Open the network", tab: "network" },
      },
      {
        label: "Practice adoption signals",
        detail: "Where regenerative practice is concentrating.",
        cta: { label: "Open by-county", tab: "county" },
      },
      {
        label: "Leverage points",
        detail: "Where capital connects existing actors.",
        cta: { label: "Open the map", tab: "map" },
      },
    ],
    closer:
      "What you see today is a system in early formation. Network density is the leading indicator.",
  },
  afs: {
    greeting: "AFS internal — operational view.",
    position:
      "The full surface: every actor, every relationship, every compliance gap. Use this view to triage outreach, route prospects, and stay ahead of what the network needs.",
    cards: [
      {
        label: "Member directory",
        detail: "All AFS-known actors across the region.",
        cta: { label: "Open the directory", tab: "directory" },
      },
      {
        label: "Compliance triage",
        detail: "Buyer-ready vs close vs needs-work — all farms.",
        cta: { label: "Open the list", tab: "list" },
      },
      {
        label: "Network coverage",
        detail: "Where AFS has presence and where it's thin.",
        cta: { label: "Open by-county", tab: "county" },
      },
    ],
    closer:
      "Pipeline lives on its own tab. This view is the everyday-operations frame.",
  },
  explore: {
    greeting: "Welcome — explorer mode.",
    position:
      "You're seeing what the system shows a curious visitor. Pick a role from the persona switcher to see what a farmer, buyer, or funder would find here — or sign in to claim a record of your own.",
    cards: [
      {
        label: "The regional map",
        detail: "Every farm, market, processor, and recovery node in view.",
        cta: { label: "Open the map", tab: "map" },
      },
      {
        label: "Who's connected to whom",
        detail: "A force-directed graph of regional relationships.",
        cta: { label: "Open the network", tab: "network" },
      },
      {
        label: "The full directory",
        detail: "Filter and scan every actor in the system.",
        cta: { label: "Open the directory", tab: "directory" },
      },
    ],
    closer:
      "What you see is a working slice of the Louisville and Kentuckiana foodshed — real entities, anonymized where appropriate.",
  },
};

const TIER_LABEL: Partial<Record<Tier, string>> = {
  demo: "Demo access",
  farmer_free: "Farmer (free)",
  farmer_paid: "Farmer",
  buyer_institutional: "Institutional Buyer",
  buyer_grocery: "Grocery Buyer",
  buyer_foodservice: "Foodservice Buyer",
  buyer_farmersmarket: "Farmers' Market",
  buyer_processor: "Processor",
  buyer_foodhub: "Food Hub",
  government: "Government",
  nonprofit: "Nonprofit",
  funder: "Funder",
  aggregator_licensed: "Aggregator",
  afs_internal: "AFS Internal",
};

export function LandingTab({
  persona,
  displayName,
  tier,
  onSelectTab,
}: {
  persona: Persona;
  displayName?: string | null;
  tier?: Tier | null;
  onSelectTab: (tab: string) => void;
}) {
  const copy = PERSONA_COPY[persona];
  const tierLabel = tier ? TIER_LABEL[tier] : null;
  const firstName = displayName ? displayName.split(" ")[0] : null;

  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-pale px-3 py-1 text-slate-blue">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-amber" />
            Landing
          </span>
          {tierLabel ? (
            <span className="inline-flex items-center rounded-full border border-cream-shadow px-3 py-1">
              {tierLabel}
            </span>
          ) : null}
        </div>

        <h2 className="mt-5 font-display text-[26px] sm:text-[32px] font-semibold text-slate-blue leading-[1.15] tracking-[-0.015em]">
          {firstName ? `Welcome back, ${firstName}.` : "Welcome."}
        </h2>
        <p className="mt-2 text-[15px] sm:text-[16px] font-medium text-charcoal">
          {copy.greeting}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-charcoal-soft">
          {copy.position}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {copy.cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onSelectTab(card.cta.tab)}
              className="group rounded-[12px] border border-cream-shadow bg-cream-soft p-4 text-left transition-colors hover:border-slate-blue/40 hover:bg-white"
            >
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-blue">
                {card.label}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal-soft">
                {card.detail}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal group-hover:text-slate-blue">
                {card.cta.label}
                <span aria-hidden>→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-6 text-[12px] italic leading-relaxed text-charcoal-soft/90">
          {copy.closer}
        </p>
      </div>
    </div>
  );
}
