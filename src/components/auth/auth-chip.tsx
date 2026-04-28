"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "provender-public-images";
const AVATAR_SIGNED_URL_TTL = 3600;

// Top-nav chip:
//   anonymous → "Sign in"  (links to /login)
//   authed    → thumbnail + "Hi, [name]" (links to /profile)
//
// Avatar fetch: hit fn_get_my_avatar_path (sql/12), then mint a signed URL
// from the private provender-public-images bucket. Anonymous viewers never
// get past the auth check, so they never see anyone's photo. The chip
// re-fetches on every auth-state change so a fresh upload from /profile
// shows up after router.refresh.
export function AuthChip() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
        setAvatarUrl(null);
        return;
      }

      const [{ data: profile }, { data: avatarPath }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("fn_get_my_avatar_path"),
      ]);
      if (cancelled) return;

      const fallback = user.email ? user.email.split("@")[0] : "you";
      const name = profile?.display_name?.trim() || fallback;
      setAuthed(true);
      setLabel(name);

      if (avatarPath && typeof avatarPath === "string") {
        const { data: signed } = await supabase.storage
          .from(AVATAR_BUCKET)
          .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_TTL);
        if (cancelled) return;
        setAvatarUrl(signed?.signedUrl ?? null);
      } else {
        setAvatarUrl(null);
      }
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
    "inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white pl-1.5 pr-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:border-slate-blue transition-colors max-w-[220px]";

  if (!authed) {
    return (
      <Link href="/login" className={chipClass.replace("pl-1.5", "pl-3.5")}>
        Sign in
      </Link>
    );
  }

  const initials = computeInitials(label);

  return (
    <span className="inline-flex items-center gap-2">
      <Link href="/profile" className={chipClass}>
        <span className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-cream-deep flex items-center justify-center border border-cream-shadow">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-slate-blue/70 normal-case tracking-normal">
              {initials}
            </span>
          )}
        </span>
        <span className="truncate normal-case tracking-normal text-[12px] font-semibold">
          Hi, {label}
        </span>
      </Link>
      {/*
        Server-side sign-out: POST to /auth/signout so the SSR Supabase
        client clears the session cookies. Styled as a quiet text link to
        keep the chip the primary visual; the button is the secondary action.
      */}
      <form action="/auth/signout" method="post" className="inline">
        <button
          type="submit"
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft/80 hover:text-slate-blue transition-colors px-1"
        >
          Sign out
        </button>
      </form>
    </span>
  );
}

function computeInitials(name: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
