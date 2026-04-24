"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NetworkExplorer } from "@/components/farms/network-explorer";
import { Landing } from "@/components/landing";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { EntryBanner } from "@/components/entry-banner";
import type { Persona } from "@/components/farms/network-explorer";

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
  const embedMode = params.get("mode") === "embed";
  const fromAfs = params.get("ref") === "afs";

  // In embed mode the demo is loaded inside an iframe on pro-pitch. Silence
  // console errors/warnings so they don't bubble into the parent page's devtools.
  useEffect(() => {
    if (!embedMode) return;
    const original = { error: console.error, warn: console.warn };
    const noop = () => {};
    console.error = noop;
    console.warn = noop;
    return () => {
      console.error = original.error;
      console.warn = original.warn;
    };
  }, [embedMode]);

  // Embed mode: skip landing, skip persona switcher, lock to an explorer surface.
  if (embedMode) {
    return (
      <main className="min-h-screen bg-cream text-charcoal">
        <nav className="border-b border-cream-shadow bg-cream/85 backdrop-blur-md sticky top-0 z-20">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
            <div className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-moss">
              Provender<span className="text-amber">.</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-bone px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
              <span className="inline-block h-2 w-2 rounded-full bg-region-badge" />
              Louisville &amp; Kentuckiana
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 pb-24">
          <NetworkExplorer persona="explore" embedMode />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-charcoal">
      {fromAfs ? <EntryBanner /> : null}
      <nav className="border-b border-cream-shadow bg-cream/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-moss hover:text-moss-light transition-colors"
          >
            Provender<span className="text-amber">.</span>
          </Link>
          {persona ? (
            <PersonaSwitcher persona={persona} />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-bone px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
              <span className="inline-block h-2 w-2 rounded-full bg-region-badge" />
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
