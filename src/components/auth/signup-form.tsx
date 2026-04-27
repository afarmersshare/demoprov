"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "sent" | "error";

// Personas the user can self-select. Excludes "afs" (admin-only) and uses
// "explore" as the "just looking" fallback. Maps to the persona_t enum.
const PERSONA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Choose one…" },
  { value: "farmer", label: "Farmer / producer" },
  { value: "buyer", label: "Buyer (institution, retail, food service…)" },
  { value: "hub", label: "Food hub / aggregator" },
  { value: "policymaker", label: "Government / public sector" },
  { value: "nonprofit", label: "Nonprofit / food council" },
  { value: "funder", label: "Funder / researcher" },
  { value: "explore", label: "Just exploring" },
];

// Free-text declared org type. AFS classifies into a real entity node later
// via fn_classify_signup_org. Values here are user-facing buckets, not the
// enum; they land in persons.attributes.signup_organization_type as strings.
const ORG_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Choose one…" },
  { value: "farm", label: "Farm" },
  { value: "food_hub", label: "Food hub / aggregator" },
  { value: "grocery", label: "Grocery / retail" },
  { value: "institution", label: "Institution (hospital, university, corporate)" },
  { value: "food_service", label: "Food service" },
  { value: "farmers_market", label: "Farmers market" },
  { value: "processor", label: "Processor" },
  { value: "agency", label: "Government agency" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "foundation", label: "Foundation / funder" },
  { value: "research", label: "Research / academic" },
  { value: "other", label: "Other" },
];

// Lookup values seeded by sql/08_signup_to_persons_bridge.sql.
const INTEREST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Choose one…" },
  { value: "source_local_food", label: "Source local food" },
  { value: "sell_through_afs", label: "Sell through AFS" },
  { value: "policy_research", label: "Policy / research" },
  { value: "invest_in_afs", label: "Invest in AFS" },
  { value: "map_food_system", label: "Map the food system" },
  { value: "other", label: "Other" },
];

const REFERRAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Choose one…" },
  { value: "word_of_mouth", label: "Word of mouth" },
  { value: "social_media", label: "Social media" },
  { value: "event", label: "Conference / event" },
  { value: "partner_org", label: "Partner organization" },
  { value: "web_search", label: "Web search" },
  { value: "dawn_riley", label: "Dawn Riley (CCO)" },
  { value: "kelsey_direct", label: "Kelsey Hood Cattaneo (CEO)" },
  { value: "press_or_article", label: "Press / article" },
  { value: "other", label: "Other" },
];

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
  const [persona, setPersona] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [title, setTitle] = useState("");
  const [regionCounty, setRegionCounty] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [directoryConsent, setDirectoryConsent] = useState(false);

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
          persona: persona || "explore",
          // tier intentionally omitted — trigger COALESCEs to 'demo' and
          // AFS reclassifies later via admin tooling. User cannot self-tier.
          primary_interest: primaryInterest || null,
          referral_source: referralSource || null,
          organization_name: orgName.trim() || null,
          organization_type: orgType || null,
          website: website.trim() || null,
          title: title.trim() || null,
          region_county: regionCounty.trim() || null,
          marketing_consent: marketingConsent,
          directory_consent: directoryConsent,
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

          <Field label="Email address" htmlFor="signup-email">
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
          </Field>

          <Field
            label="Password"
            htmlFor="signup-password"
            hint="At least 8 characters."
          >
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
          </Field>

          <Field label="Full name" htmlFor="signup-name">
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
          </Field>
        </fieldset>

        {/* Who you are — optional but high-value to AFS */}
        <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
          <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
            Who you are
          </legend>
          <p className="text-[12px] text-charcoal-soft/80 -mt-1">
            Optional. The more you tell us, the faster we can route you to the
            right tools.
          </p>

          <Field label="I am a…" htmlFor="signup-persona">
            <select
              id="signup-persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              disabled={isSubmitting}
              className={selectClass}
            >
              {PERSONA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Organization name" htmlFor="signup-org">
            <input
              id="signup-org"
              type="text"
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              className={inputClass}
            />
          </Field>

          <Field label="Organization type" htmlFor="signup-org-type">
            <select
              id="signup-org-type"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              disabled={isSubmitting}
              className={selectClass}
            >
              {ORG_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Your role / job title" htmlFor="signup-title">
            <input
              id="signup-title"
              type="text"
              autoComplete="organization-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={isSubmitting}
              className={inputClass}
            />
          </Field>

          <Field label="Region or county" htmlFor="signup-region">
            <input
              id="signup-region"
              type="text"
              value={regionCounty}
              onChange={(e) => setRegionCounty(e.target.value)}
              placeholder="Jefferson County, KY"
              maxLength={120}
              disabled={isSubmitting}
              className={inputClass}
            />
          </Field>

          <Field label="Organization website" htmlFor="signup-website">
            <input
              id="signup-website"
              type="url"
              autoComplete="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              maxLength={200}
              disabled={isSubmitting}
              className={inputClass}
            />
          </Field>
        </fieldset>

        {/* Tell us a bit more — optional context */}
        <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
          <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
            Tell us a bit more
          </legend>

          <Field label="Why are you here?" htmlFor="signup-interest">
            <select
              id="signup-interest"
              value={primaryInterest}
              onChange={(e) => setPrimaryInterest(e.target.value)}
              disabled={isSubmitting}
              className={selectClass}
            >
              {INTEREST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="How did you find us?" htmlFor="signup-referral">
            <select
              id="signup-referral"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              disabled={isSubmitting}
              className={selectClass}
            >
              {REFERRAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        {/* Stay in touch — both default to OFF (consent is opt-in only) */}
        <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
          <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
            Stay in touch
          </legend>

          <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-charcoal">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 shrink-0 rounded border-cream-shadow text-slate-blue focus:ring-slate-blue"
            />
            <span>
              <span className="font-semibold text-charcoal">
                Email me about Provender updates.
              </span>{" "}
              <span className="text-charcoal-soft">
                Occasional emails — product changes, regional notes, and
                opportunities. You can opt out any time.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-charcoal">
            <input
              type="checkbox"
              checked={directoryConsent}
              onChange={(e) => setDirectoryConsent(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 shrink-0 rounded border-cream-shadow text-slate-blue focus:ring-slate-blue"
            />
            <span>
              <span className="font-semibold text-charcoal">
                Show me in the Provender directory.
              </span>{" "}
              <span className="text-charcoal-soft">
                Other paying users in your tier or above can see your name and
                organization. Off by default — you can change this later.
              </span>
            </span>
          </label>
        </fieldset>

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

const selectClass =
  "w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block mt-1 text-[11px] text-charcoal-soft/80">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

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
