"use client";

import { ArrowRight } from "lucide-react";

// Two contexts trigger the bottom-pinned CTA bar:
//
// 1. embedMode — the demo is loaded in an iframe on a partner site. The CTA
//    is an escape hatch back to the full standalone site.
// 2. persona views — user is in a curated subset of tools (e.g. policymaker,
//    farmer). The CTA invites them to see the entire tool surface.
//
// Only the "explore" persona — which already shows everything — hides the
// CTA. Once Phase 7 auth lands, persona views will gate certain tabs as
// purchasable modules; the CTA wording may need to evolve then.
type Variant = "embed" | "persona";

export function EmbedCta({ variant = "embed" }: { variant?: Variant } = {}) {
  const href = variant === "embed" ? "/?ref=afs" : "/?persona=explore";
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-shadow bg-chrome/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-end">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-slate-blue text-cream px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-slate-blue-light transition-colors"
        >
          Explore the full demo
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
