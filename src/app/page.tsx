"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NetworkExplorer } from "@/components/farms/network-explorer";
import { Landing } from "@/components/landing";
import { PolicymakerDashboard } from "@/components/dashboards/policymaker";

type PersonaId = "policymaker" | "explore" | null;

function PersonaBadge({ persona }: { persona: PersonaId }) {
  if (!persona) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-bone px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
        <span className="inline-block h-2 w-2 rounded-full bg-amber" />
        Louisville &amp; Kentuckiana
      </div>
    );
  }
  const label =
    persona === "policymaker" ? "Policymaker view" : "Explorer view";
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-moss hover:border-moss transition-colors"
    >
      <span>← {label}</span>
    </Link>
  );
}

function PageBody() {
  const params = useSearchParams();
  const raw = params.get("persona");
  const persona: PersonaId =
    raw === "policymaker" || raw === "explore" ? raw : null;

  return (
    <main className="min-h-screen bg-cream text-charcoal">
      <nav className="border-b border-cream-shadow bg-cream/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-moss hover:text-moss-light transition-colors"
          >
            Provender<span className="text-amber">.</span>
          </Link>
          <PersonaBadge persona={persona} />
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-8 sm:py-10">
        {persona === null ? (
          <Landing />
        ) : persona === "policymaker" ? (
          <PolicymakerDashboard />
        ) : (
          <NetworkExplorer />
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <PageBody />
    </Suspense>
  );
}
