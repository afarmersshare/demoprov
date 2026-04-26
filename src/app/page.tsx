"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NetworkExplorer } from "@/components/farms/network-explorer";
import { Landing } from "@/components/landing";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { EntryBanner } from "@/components/entry-banner";
import { AuthChip } from "@/components/auth/auth-chip";
import { WelcomeStrip } from "@/components/welcome-strip";
import { createClient } from "@/lib/supabase/client";
import type { Persona } from "@/components/farms/network-explorer";
import type { ModuleSlug, Tier } from "@/lib/auth/get-user";

function isPersona(v: string | null | undefined): v is Persona {
  return (
    v === "policymaker" ||
    v === "afs" ||
    v === "farmer" ||
    v === "buyer" ||
    v === "hub" ||
    v === "nonprofit" ||
    v === "funder" ||
    v === "explore"
  );
}

function PageBody() {
  const params = useSearchParams();
  const raw = params.get("persona");
  const urlPersona: Persona | null = isPersona(raw) ? raw : null;
  const embedMode = params.get("mode") === "embed";
  const fromAfs = params.get("ref") === "afs";

  // Authed-user resolution: if there's no ?persona= override and the visitor
  // is signed in, use their profile.persona. Middleware also redirects on /
  // for SSR'd loads; this client-side fallback handles same-page navigations
  // (e.g. clicking the wordmark home link from inside the app) where the
  // server middleware doesn't re-run.
  const [profilePersona, setProfilePersona] = useState<Persona | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // undefined = not yet resolved or anonymous (treat as demo, all unlocked).
  // [] = signed in with zero entitlements. Distinct so NetworkExplorer can
  // tell "no row in DB" apart from "still loading".
  const [entitledModules, setEntitledModules] = useState<
    ModuleSlug[] | undefined
  >(undefined);
  // Welcome-strip personalization. Populated only when signed in; the
  // strip renders only when displayName-or-email is available.
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (embedMode) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const [{ data: profile }, { data: entitlements }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("persona, tier, display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_module_entitlements")
          .select("module_slug")
          .eq("user_id", user.id),
      ]);
      if (cancelled || !profile) return;
      if (isPersona(profile.persona)) setProfilePersona(profile.persona);
      if (profile.tier === "afs_internal") setIsAdmin(true);
      setTier(profile.tier as Tier);
      setDisplayName(profile.display_name ?? null);
      setUserEmail(user.email ?? null);
      setEntitledModules(
        (entitlements ?? []).map(
          (row: { module_slug: string }) => row.module_slug as ModuleSlug,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [embedMode]);

  const persona: Persona | null = urlPersona ?? profilePersona;

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
      <main className="min-h-screen bg-chrome text-charcoal">
        <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md sticky top-0 z-20">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
            <div className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-slate-blue">
              Provender<span className="text-accent-amber">.</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-pale px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
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
    <main className="min-h-screen bg-chrome text-charcoal">
      {fromAfs ? <EntryBanner /> : null}
      <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-slate-blue hover:text-slate-blue-light transition-colors"
          >
            Provender<span className="text-accent-amber">.</span>
          </Link>
          <div className="flex items-center gap-2.5">
            {persona ? <PersonaSwitcher persona={persona} isAdmin={isAdmin} /> : null}
            <AuthChip />
          </div>
        </div>
      </nav>
      {persona === null ? (
        <Landing />
      ) : (
        <div className="mx-auto max-w-7xl px-6 sm:px-10 py-8 sm:py-10">
          {tier && (displayName || userEmail) ? (
            <WelcomeStrip
              displayName={displayName}
              email={userEmail}
              persona={persona}
              tier={tier}
            />
          ) : null}
          <NetworkExplorer
            persona={persona}
            entitledModules={entitledModules}
          />
        </div>
      )}
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
