"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_PROFILE_VALUES,
  ProfileFields,
  type ProfileFieldsValues,
  normalizeWebsite,
} from "@/components/auth/profile-fields";

type Status = "idle" | "submitting" | "error";

// Post-OAuth profile completion. Submits to the fn_complete_profile RPC
// (sql/09 Section C), which updates user_profiles + persons, writes the
// two consent records as appropriate, bumps contact_visibility, and stamps
// profile_completed_at so middleware drops the gate on the next request.
export function CompleteProfileForm({
  defaultFullName,
}: {
  defaultFullName: string;
}) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [profile, setProfile] = useState<ProfileFieldsValues>(EMPTY_PROFILE_VALUES);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const isSubmitting = status === "submitting";

  // Only full name is required to clear the gate — same minimum-friction
  // bar as /signup. Persona defaults to 'explore' when blank (the trigger
  // does the same, AFS reclassifies later).
  const canSubmit = !isSubmitting && fullName.trim().length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMsg(null);

    const { error } = await supabase.rpc("fn_complete_profile", {
      p_persona: profile.persona || "explore",
      p_full_name: fullName.trim(),
      p_organization_name: profile.orgName.trim() || null,
      p_organization_type: profile.orgType || null,
      p_title: profile.title.trim() || null,
      p_region_county: profile.regionCounty.trim() || null,
      p_website: normalizeWebsite(profile.website),
      p_primary_interest: profile.primaryInterest || null,
      p_referral_source: profile.referralSource || null,
      // Opt-out boxes: a CHECKED box means the user is revoking consent,
      // so the consent boolean sent to the RPC is the inverted value.
      p_marketing_consent: !profile.marketingOptOut,
      p_directory_consent: !profile.directoryOptOut,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    // Hard redirect so the middleware reads the freshly-stamped
    // profile_completed_at on the next request and routes us to the
    // persona dashboard.
    window.location.href = "/";
  }

  const patchProfile = (patch: Partial<ProfileFieldsValues>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          The basics
        </legend>

        <label className="block" htmlFor="complete-name">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
            Full name
          </span>
          <input
            id="complete-name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
            disabled={isSubmitting}
            className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
          />
        </label>
      </fieldset>

      <ProfileFields
        values={profile}
        onChange={patchProfile}
        disabled={isSubmitting}
        idPrefix="complete"
        optionalHint="Your role drives which dashboard you land on — please pick one. The rest helps us route you better but is optional."
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving…" : "Finish setup and dive in"}
      </button>

      {errorMsg ? (
        <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}
