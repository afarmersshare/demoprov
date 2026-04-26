"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Top-nav chip:
//   anonymous → "Sign in"  (links to /login)
//   authed    → "Hi, [name]" (links to /profile, which hosts sign-out)
//
// Self-contained: subscribes to auth state changes and refreshes the label
// without needing props from the page. Display name comes from
// user_profiles.display_name with email-prefix fallback so we never render
// an empty chip.
export function AuthChip() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuthed(false);
        setLabel(null);
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fallback = user.email ? user.email.split("@")[0] : "you";
      const name = profile?.display_name?.trim() || fallback;
      setAuthed(true);
      setLabel(name);
    }

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pre-resolution: render nothing rather than flicker the wrong label.
  if (authed === null) return null;

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:border-slate-blue transition-colors max-w-[200px]";

  if (!authed) {
    return (
      <Link href="/login" className={chipClass}>
        Sign in
      </Link>
    );
  }

  return (
    <Link href="/profile" className={chipClass}>
      <span className="truncate normal-case tracking-normal text-[12px] font-semibold">
        Hi, {label}
      </span>
    </Link>
  );
}
