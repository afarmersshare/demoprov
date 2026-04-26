"use client";

import Link from "next/link";
import { useState, type ReactElement } from "react";

// Phase 7 entry-style landing page (replaces the prior PERSONAS-card grid).
// Two-column reveal: left column shows role tiles, right column previews what
// the selected role will see. Selecting a tile makes the "Enter the system"
// CTA visible; clicking it routes to /?persona=<id>. "explore without a role"
// is always available and routes to /?persona=explore.
//
// Capability cards in the right-column reveal describe what each role will
// FIND inside (filters, views, cross-references) — not fabricated counts.
// Real numbers vary by region and tier and would be misleading on this page.

type RoleId =
  | "farmer"
  | "buyer"
  | "hub"
  | "policymaker"
  | "nonprofit"
  | "funder";

type Capability = { label: string; detail: string };

type Role = {
  id: RoleId;
  title: string; // e.g. "I grow food"
  need: string; // e.g. "I need buyers who understand what I produce"
  position: { head: string; body: string };
  finds: Capability[]; // 3 capability descriptors
  note: string;
};

const ROLES: Role[] = [
  {
    id: "farmer",
    title: "I grow food",
    need: "I need buyers who understand what I produce and can verify it.",
    position: {
      head: "You're inside the system. Most tools are built looking at you from outside it.",
      body: "Provender starts where you are. Your certifications, capacity, and practices become legible to the buyers and institutions near you — without you having to navigate their procurement portals to get there.",
    },
    finds: [
      {
        label: "Buyers in delivery radius",
        detail: "Filterable by certification, sourcing volume, seasonal window.",
      },
      {
        label: "Demand match",
        detail: "See where your crops fit unmet regional supply.",
      },
      {
        label: "Certification recognition",
        detail: "GAP, organic, regenerative cross-references.",
      },
    ],
    note: "The more you contribute to the system, the more the system surfaces for you.",
  },
  {
    id: "buyer",
    title: "I source food",
    need: "I need reliable regional supply I can trace and verify.",
    position: {
      head: "You need supply you can trust before you can commit to it.",
      body: "Provender maps what's available in your region — verified capacity, certification status, seasonal reliability — so you can evaluate supply before you make the call, not after.",
    },
    finds: [
      {
        label: "Farms in your sourcing radius",
        detail: "Capacity, certifications, seasonality.",
      },
      {
        label: "Compliance-ready producers",
        detail: "Pre-filtered for institutional procurement.",
      },
      {
        label: "Regional supply gaps",
        detail: "Visible by crop type and county.",
      },
    ],
    note: "Gaps are visible. That's intentional — you need to see where the system is thin, not just where it's strong.",
  },
  {
    id: "hub",
    title: "I move food",
    need: "I aggregate, process, or distribute between farms and markets.",
    position: {
      head: "You sit between supply and demand. The system rarely shows you both at once.",
      body: "Provender maps upstream and downstream simultaneously — farms, buyers, flow volumes, county gaps — so you can see where you fit and where the connections you facilitate are most needed.",
    },
    finds: [
      {
        label: "Upstream farm partners",
        detail: "By crop, capacity, certification.",
      },
      {
        label: "Downstream buyer channels",
        detail: "Institutional, retail, food service.",
      },
      {
        label: "Active flow pathways",
        detail: "What's already routing through where.",
      },
    ],
    note: "API integration means Provender connects to what you already use — it doesn't ask you to start over.",
  },
  {
    id: "policymaker",
    title: "I shape food policy",
    need: "I need to see system gaps and measure regional resilience.",
    position: {
      head: "You need the system to be legible before you can intervene in it.",
      body: "Provender translates farm-level data into regional patterns — compliance readiness, supply gaps, equity indicators, concentration risk — so you can see where policy leverage actually exists.",
    },
    finds: [
      {
        label: "County-level food system maps",
        detail: "Supply, demand, infrastructure.",
      },
      {
        label: "Regional resilience indicators",
        detail: "Where the system is thin, by metric.",
      },
      {
        label: "Policy leverage points",
        detail: "Flagged gaps, by intervention type.",
      },
    ],
    note: "Trend data shows direction, not just state. You can see whether things are improving or eroding.",
  },
  {
    id: "nonprofit",
    title: "I work in food access",
    need: "I source from farms and route food to people and places it needs to reach.",
    position: {
      head: "You move food where it's needed, not where it sells.",
      body: "Provender shows you the farms, recovery sources, and access channels in your region — so you can build supply you can rely on without re-knocking on the same doors every season.",
    },
    finds: [
      {
        label: "Farm partners by mission alignment",
        detail: "Recovery, donation, sliding-scale producers.",
      },
      {
        label: "Recovery and surplus sources",
        detail: "What's routing through where.",
      },
      {
        label: "Access points and partner orgs",
        detail: "Co-mapped with farm supply.",
      },
    ],
    note: "Closing the loop matters more than scale. The system shows you both.",
  },
  {
    id: "funder",
    title: "I fund food systems",
    need: "I need proof of impact and system-level investment opportunity.",
    position: {
      head: "You need to see system leverage, not just individual projects.",
      body: "Provender makes the regional food system's underlying structure visible — where capital gaps exist, where network maturity is accelerating, where a well-placed investment connects actors who are close but can't find each other.",
    },
    finds: [
      {
        label: "Regional ecosystem mapping",
        detail: "Actors, flows, gaps.",
      },
      {
        label: "Impact and outcome indicators",
        detail: "Practice adoption, network density.",
      },
      {
        label: "Leverage point analysis",
        detail: "Where investment connects existing actors.",
      },
    ],
    note: "The network grows denser as connections are made. What you see today is a system in early formation.",
  },
];

// --- Inline SVG icons. Stroke uses currentColor so we tint via the wrapper. ---

function GrowerIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <circle cx="15" cy="22.5" r="5.5" />
      <path d="M15 17 C15 11 9.5 8.5 9.5 4" />
      <path d="M15 13.5 C17.5 9 22 9 22 4" />
      <path d="M15 15.5 C12.5 11 7.5 12 6 8.5" opacity="0.6" />
    </svg>
  );
}

function BuyerIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <rect x="5.5" y="11.5" width="19" height="13" rx="1.5" />
      <path d="M10.5 11.5 V8.5 C10.5 6.8 12 5.5 14 5.5 H16 C18 5.5 19.5 6.8 19.5 8.5 V11.5" />
      <circle cx="15" cy="18" r="2" opacity="0.6" />
    </svg>
  );
}

function HubIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <circle cx="15" cy="15" r="3.5" />
      <circle cx="6.5" cy="9.5" r="2.2" strokeWidth="0.8" />
      <circle cx="23.5" cy="9.5" r="2.2" strokeWidth="0.8" />
      <circle cx="6.5" cy="20.5" r="2.2" strokeWidth="0.8" />
      <circle cx="23.5" cy="20.5" r="2.2" strokeWidth="0.8" />
      <line x1="8.5" y1="10.7" x2="12" y2="13" strokeWidth="0.7" opacity="0.6" />
      <line x1="21.5" y1="10.7" x2="18" y2="13" strokeWidth="0.7" opacity="0.6" />
      <line x1="8.5" y1="19.3" x2="12" y2="17" strokeWidth="0.7" opacity="0.6" />
      <line x1="21.5" y1="19.3" x2="18" y2="17" strokeWidth="0.7" opacity="0.6" />
    </svg>
  );
}

function PolicyIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <rect x="7.5" y="5.5" width="15" height="19" rx="1.5" />
      <line x1="11" y1="11" x2="19" y2="11" strokeWidth="0.8" opacity="0.6" />
      <line x1="11" y1="15" x2="19" y2="15" strokeWidth="0.8" opacity="0.6" />
      <line x1="11" y1="19" x2="16" y2="19" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

function NonprofitIcon() {
  // Stylized hands-supporting-circle motif: outreach + recovery
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <circle cx="15" cy="11" r="4" />
      <path d="M5 22 C5 18 9 16 12 17 L15 18 L18 17 C21 16 25 18 25 22" />
      <path d="M15 18 L15 24" opacity="0.6" />
    </svg>
  );
}

function FunderIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3.5 L17.8 11 L26 11 L19.5 15.8 L22 24 L15 19.5 L8 24 L10.5 15.8 L4 11 L12.2 11 Z" />
    </svg>
  );
}

const ICON_BY_ID: Record<RoleId, () => ReactElement> = {
  farmer: GrowerIcon,
  buyer: BuyerIcon,
  hub: HubIcon,
  policymaker: PolicyIcon,
  nonprofit: NonprofitIcon,
  funder: FunderIcon,
};

// --- Right-column placeholder graphic (shown before any role is selected) ---

function ConstellationGraphic() {
  return (
    <svg width="144" height="144" viewBox="0 0 144 144" fill="none" aria-hidden="true">
      <circle cx="72" cy="72" r="5" fill="currentColor" opacity="0.3" />
      <circle cx="40" cy="50" r="3.5" fill="currentColor" opacity="0.2" />
      <circle cx="104" cy="50" r="3.5" fill="currentColor" opacity="0.2" />
      <circle cx="30" cy="90" r="3" fill="currentColor" opacity="0.13" />
      <circle cx="114" cy="90" r="3" fill="currentColor" opacity="0.13" />
      <circle cx="54" cy="112" r="3" fill="currentColor" opacity="0.12" />
      <circle cx="90" cy="112" r="3" fill="currentColor" opacity="0.12" />
      <circle cx="72" cy="28" r="2.5" fill="currentColor" opacity="0.1" />
      <line x1="72" y1="67" x2="42" y2="53" stroke="currentColor" strokeWidth="0.6" opacity="0.16" />
      <line x1="72" y1="67" x2="102" y2="53" stroke="currentColor" strokeWidth="0.6" opacity="0.16" />
      <line x1="42" y1="53" x2="32" y2="87" stroke="currentColor" strokeWidth="0.6" opacity="0.1" />
      <line x1="102" y1="53" x2="112" y2="87" stroke="currentColor" strokeWidth="0.6" opacity="0.1" />
      <line x1="32" y1="87" x2="55" y2="109" stroke="currentColor" strokeWidth="0.6" opacity="0.08" />
      <line x1="112" y1="87" x2="89" y2="109" stroke="currentColor" strokeWidth="0.6" opacity="0.08" />
      <line x1="72" y1="67" x2="72" y2="31" stroke="currentColor" strokeWidth="0.6" opacity="0.1" />
    </svg>
  );
}

// --- Component ---

export function Landing() {
  const [selected, setSelected] = useState<RoleId | null>(null);
  const role = selected ? ROLES.find((r) => r.id === selected) ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[calc(100vh-65px)]">
      {/* LEFT — role tiles */}
      <div className="bg-white lg:border-r border-cream-shadow px-8 sm:px-12 py-10 sm:py-14 flex flex-col">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-blue-light mb-10">
          Louisville &amp; Kentuckiana · Demo
        </div>

        <h1 className="font-display text-[28px] sm:text-[32px] leading-[1.25] text-charcoal font-normal mb-2">
          Where do you sit
          <br />
          in this food system?
        </h1>
        <div className="text-[10px] font-normal uppercase tracking-[0.15em] text-slate-blue-light mb-9">
          Your answer shapes what you see here
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {ROLES.map((r) => {
            const Icon = ICON_BY_ID[r.id];
            const isSelected = selected === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                aria-pressed={isSelected}
                className={
                  "group flex items-center gap-3.5 px-4 py-3 rounded-[3px] border text-left transition-all " +
                  (isSelected
                    ? "border-forest-sage bg-cream/60"
                    : "border-cream-shadow bg-chrome hover:border-slate-blue hover:bg-slate-pale/50")
                }
              >
                <span
                  className={
                    "h-[30px] w-[30px] flex-shrink-0 transition-opacity " +
                    (isSelected
                      ? "text-forest-sage opacity-100"
                      : "text-charcoal-soft opacity-50 group-hover:opacity-100")
                  }
                >
                  <Icon />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-[15px] text-charcoal font-medium leading-tight">
                    {r.title}
                  </span>
                  <span className="block text-[11px] text-charcoal-soft leading-[1.55] mt-0.5">
                    {r.need}
                  </span>
                </span>
                <span
                  className={
                    "text-sm transition-all flex-shrink-0 " +
                    (isSelected
                      ? "text-forest-sage translate-x-0.5"
                      : "text-cream-shadow group-hover:text-slate-blue group-hover:translate-x-0.5")
                  }
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 pt-6 border-t border-cream-shadow flex items-center gap-4">
          {selected ? (
            <Link
              href={`/?persona=${selected}`}
              className="inline-block bg-forest-sage hover:bg-forest-sage/90 text-white text-[10px] font-semibold uppercase tracking-[0.15em] px-5 py-2.5 rounded-[3px] transition-colors"
            >
              Enter the system →
            </Link>
          ) : null}
          <Link
            href="/?persona=explore"
            className="text-[11px] text-slate-blue-light hover:text-slate-blue underline underline-offset-2 decoration-cream-shadow hover:decoration-slate-blue transition-colors"
          >
            explore without a role
          </Link>
        </div>
      </div>

      {/* RIGHT — preview / placeholder */}
      <div className="bg-chrome px-8 sm:px-12 py-10 sm:py-14 flex flex-col">
        {!role ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-slate-blue-light min-h-[280px]">
            <ConstellationGraphic />
            <div className="font-display italic text-[13px] text-slate-blue-light text-center leading-[1.7]">
              Select a role to see
              <br />
              your place in the system
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-7 flex-1">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-blue-light mb-2">
                Your position
              </div>
              <div className="font-display text-[18px] text-charcoal leading-[1.4] mb-2.5">
                {role.position.head}
              </div>
              <div className="text-[12px] text-charcoal-soft leading-[1.75]">
                {role.position.body}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-blue-light mb-2.5">
                What you'll find inside
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {role.finds.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white border border-cream-shadow rounded-[3px] px-3 pt-2.5 pb-2.5"
                  >
                    <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-blue-light mb-1.5 leading-tight">
                      {c.label}
                    </div>
                    <div className="font-display text-[12px] text-charcoal leading-[1.45]">
                      {c.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-display italic text-[12px] text-slate-blue-light leading-[1.65] pt-3 border-t border-cream-shadow mt-1">
              {role.note}
            </div>
          </div>
        )}

        {/* Demo disclaimer pinned to bottom of right column */}
        <div className="text-[10px] text-charcoal-soft/70 leading-relaxed mt-7 pt-5 border-t border-cream-shadow">
          Every person, farm, and buyer in this demo is fictional, seeded in
          the Louisville–Kentuckiana region. County shapes are real (US Census);
          demographics are illustrative-plausible. The data layer underneath is
          the real Provender schema.
        </div>
      </div>
    </div>
  );
}
