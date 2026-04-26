"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Top-nav chip that shows "Sign in" when anonymous and "Sign out" when
// authed. Self-contained: doesn't rely on any state plumbed from the
// page. Survives the demo→real-build cut where the persona switcher
// goes away.
export function AuthChip() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthed(Boolean(data.user));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthed(Boolean(session?.user));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pre-resolution: render nothing rather than flicker the wrong label.
  if (authed === null) return null;

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:border-slate-blue transition-colors";

  if (!authed) {
    return (
      <Link href="/login" className={chipClass}>
        Sign in
      </Link>
    );
  }

  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={chipClass}>
        Sign out
      </button>
    </form>
  );
}
