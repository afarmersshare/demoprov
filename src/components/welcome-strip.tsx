import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Persona } from "@/components/farms/network-explorer";
import type { Tier } from "@/lib/auth/get-user";

const PERSONA_GREETING: Record<Persona, string> = {
  farmer: "Here's the regional view scoped to where you sell.",
  buyer: "Here's the supply side, ready to source from.",
  hub: "Here's the aggregation network around you.",
  policymaker: "Here's the regional food system at population scale.",
  nonprofit: "Here's the network you support and the gaps to close.",
  funder: "Here's where your portfolio lands in the regional system.",
  afs: "Here's the full network and pipeline.",
  explore: "Explore the regional food network.",
};

const PERSONA_LABEL: Record<Persona, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  hub: "Food hub",
  policymaker: "Government",
  nonprofit: "Nonprofit",
  funder: "Funder",
  afs: "AFS",
  explore: "Explorer",
};

const TIER_SHORT: Record<Tier, string> = {
  farmer_free: "Free plan",
  farmer_paid: "Farmer plan",
  buyer_institutional: "Institutional plan",
  buyer_foodhub: "Food-hub plan",
  buyer_grocery: "Grocery plan",
  buyer_foodservice: "Foodservice plan",
  buyer_farmersmarket: "Market plan",
  buyer_processor: "Processor plan",
  government: "Government plan",
  nonprofit: "Nonprofit plan",
  funder: "Funder plan",
  aggregator_licensed: "Aggregator plan",
  afs_internal: "AFS internal",
  demo: "Demo access",
};

// "Hi, [name] — here's [persona-specific copy]." Plus a small chip with
// their plan and a link to /profile. Renders only when we have a real
// authenticated user (display name OR email available). Pure presentation
// — page.tsx decides whether to show it.
export function WelcomeStrip({
  displayName,
  email,
  persona,
  tier,
}: {
  displayName: string | null;
  email: string | null;
  persona: Persona;
  tier: Tier;
}) {
  // Fall back to the local part of the email so we always have something
  // to greet by. "sam@provender.dev" → "sam".
  const fallback = email ? email.split("@")[0] : "there";
  const name = displayName?.trim() || fallback;
  const greeting = PERSONA_GREETING[persona];

  return (
    <div className="mb-6 rounded-[14px] border border-cream-shadow bg-white px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          {PERSONA_LABEL[persona]} · {TIER_SHORT[tier]}
        </p>
        <h2 className="mt-1 font-display text-[20px] sm:text-[22px] font-semibold text-slate-blue leading-tight tracking-[-0.01em] truncate">
          Hi, {name}.
        </h2>
        <p className="mt-0.5 text-[13px] text-charcoal-soft leading-snug">
          {greeting}
        </p>
      </div>
      <Link
        href="/profile"
        className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:border-slate-blue transition-colors"
      >
        Profile
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
