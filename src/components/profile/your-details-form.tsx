"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ProfileFields,
  type ProfileFieldsValues,
  normalizeWebsite,
} from "@/components/auth/profile-fields";

type Status = "idle" | "submitting" | "saved" | "error";

// Self-service edit of the metadata captured at signup. Calls
// fn_update_my_profile (sql/11). Persona is editable here — the lock that
// existed in the previous /profile UI was a UX trap; tier remains admin-only
// and is handled by the upgrade CTA on the same page.
//
// The opt-out checkboxes (Preferences fieldset) are intentionally hidden —
// the standalone toggle UI in the Communication preferences section owns
// consent and writes via fn_set_consent (sql/10).
export function YourDetailsForm({
  initial,
}: {
  initial: ProfileFieldsValues;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileFieldsValues>(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const isSubmitting = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setStatus("submitting");
    setErrorMsg(null);

    const { error } = await supabase.rpc("fn_update_my_profile", {
      p_persona: profile.persona || "explore",
      // Display name is owned by the inline-edit section above; passing
      // null tells the RPC to leave it alone (sql/11 CASE-WHEN guard).
      p_organization_name: profile.orgName.trim() || null,
      p_organization_type: profile.orgType || null,
      p_title: profile.title.trim() || null,
      p_region_county: profile.regionCounty.trim() || null,
      p_website: normalizeWebsite(profile.website),
      p_primary_interest: profile.primaryInterest || null,
      p_referral_source: profile.referralSource || null,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("saved");
    // Refresh server-rendered values (persona drives Plan & role labels,
    // dashboard routing, etc.). router.refresh() re-runs the server
    // component without a hard reload.
    router.refresh();
  }

  const patchProfile = (patch: Partial<ProfileFieldsValues>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    if (status === "saved") setStatus("idle");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ProfileFields
        values={profile}
        onChange={patchProfile}
        disabled={isSubmitting}
        idPrefix="profile-edit"
        optionalHint="Edit anything — save updates the same fields you filled at signup."
        showPreferences={false}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[10px] bg-slate-blue px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-warm-cream hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving…" : "Save details"}
        </button>

        {status === "saved" ? (
          <span className="text-[13px] text-slate-blue font-semibold">
            Saved.
          </span>
        ) : null}

        {status === "error" && errorMsg ? (
          <span className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-1.5">
            {errorMsg}
          </span>
        ) : null}
      </div>
    </form>
  );
}
