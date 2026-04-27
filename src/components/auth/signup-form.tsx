"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_PROFILE_VALUES,
  ProfileFields,
  type ProfileFieldsValues,
  normalizeWebsite,
} from "@/components/auth/profile-fields";

type Status = "idle" | "submitting" | "sent" | "error";

export function SignupForm({
  initialError,
  next,
}: {
  initialError?: string | null;
  // Pre-validated by the server page (must start with a single "/"). Threads
  // through Google OAuth and post-confirmation redirects.
  next?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [profile, setProfile] = useState<ProfileFieldsValues>(EMPTY_PROFILE_VALUES);

  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialError === "callback"
      ? "Sign-in didn't complete. Please try again."
      : null,
  );

  const supabase = createClient();
  const callbackUrl = (() => {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback";
    return next ? `${base}?next=${encodeURIComponent(next)}` : base;
  })();

  async function handleGoogle() {
    setStatus("submitting");
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password || password.length < 8 || !fullName.trim()) {
      return;
    }
    setStatus("submitting");
    setErrorMsg(null);

    // Everything in `data` lands in raw_user_meta_data and is read by the
    // handle_new_auth_user trigger (sql/08, Section D). Field names must
    // match exactly — they're string-keyed lookups in plpgsql.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          full_name: fullName.trim(),
          persona: profile.persona || "explore",
          // tier intentionally omitted — trigger COALESCEs to 'demo' and
          // AFS reclassifies later via admin tooling. User cannot self-tier.
          primary_interest: profile.primaryInterest || null,
          referral_source: profile.referralSource || null,
          organization_name: profile.orgName.trim() || null,
          organization_type: profile.orgType || null,
          website: normalizeWebsite(profile.website),
          title: profile.title.trim() || null,
          region_county: profile.regionCounty.trim() || null,
          // Opt-out boxes: a CHECKED box means the user is revoking consent,
          // so the consent boolean sent to the trigger is the inverted value.
          marketing_consent: !profile.marketingOptOut,
          directory_consent: !profile.directoryOptOut,
        },
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    // Two flows depending on the project's email-confirmation setting:
    //   - Confirmation required → data.session is null; show "check email".
    //   - Confirmation off (auto-confirm) → session exists, redirect.
    if (data.session) {
      window.location.href = next ?? "/";
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-[12px] border border-cream-shadow bg-warm-cream/60 px-5 py-6 text-center">
        <div className="font-display text-[22px] font-semibold text-slate-blue mb-2">
          Check your inbox
        </div>
        <p className="text-[14px] leading-relaxed text-charcoal-soft">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-charcoal">{email}</span>. Click it
          on this device to finish creating your account.
        </p>
      </div>
    );
  }

  const isSubmitting = status === "submitting";
  const patchProfile = (patch: Partial<ProfileFieldsValues>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-3 rounded-[10px] border border-cream-shadow bg-white px-4 py-3 text-[14px] font-semibold text-charcoal hover:border-slate-blue hover:text-slate-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-charcoal-soft/70">
        <div className="flex-1 border-t border-cream-shadow" />
        or sign up with email
        <div className="flex-1 border-t border-cream-shadow" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* The basics — required to actually create the account */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            The basics
          </legend>

          <label className="block" htmlFor="signup-email">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Email address
            </span>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              disabled={isSubmitting}
              className={inputClass}
            />
          </label>

          <label className="block" htmlFor="signup-password">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Password
            </span>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={inputClass}
            />
            <span className="block mt-1 text-[11px] text-charcoal-soft/80">
              At least 8 characters.
            </span>
          </label>

          <label className="block" htmlFor="signup-name">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Full name
            </span>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
              disabled={isSubmitting}
              className={inputClass}
            />
          </label>
        </fieldset>

        <ProfileFields
          values={profile}
          onChange={patchProfile}
          disabled={isSubmitting}
          idPrefix="signup"
        />

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !email.trim() ||
            !password ||
            password.length < 8 ||
            !fullName.trim()
          }
          className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      {errorMsg ? (
        <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60";

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.26c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.591.102-1.165.282-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.295C4.672 5.168 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
