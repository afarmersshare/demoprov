"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NetworkExplorer } from "@/components/farms/network-explorer";
import { Landing } from "@/components/landing";
import type { Persona } from "@/components/farms/network-explorer";

const PERSONA_LABEL: Record<Persona, string> = {
  policymaker: "Policymaker view",
  afs: "A Farmer's Share view",
  farmer: "Farmer view",
  buyer: "Buyer view",
  explore: "Just exploring",
};

function isPersona(v: string | null): v is Persona {
  return (
    v === "policymaker" ||
    v === "afs" ||
    v === "farmer" ||
    v === "buyer" ||
    v === "explore"
  );
}

function PageBody() {
  const params = useSearchParams();
  const raw = params.get("persona");
  const persona: Persona | null = isPersona(raw) ? raw : null;

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
          {persona ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-moss hover:border-moss transition-colors"
            >
              <span>← {PERSONA_LABEL[persona]}</span>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-bone px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
              <span className="inline-block h-2 w-2 rounded-full bg-amber" />
              Louisville &amp; Kentuckiana
            </div>
          )}
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-8 sm:py-10">
        {persona === null ? <Landing /> : <NetworkExplorer persona={persona} />}
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
