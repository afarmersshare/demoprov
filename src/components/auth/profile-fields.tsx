"use client";

// Shared UI for the Provender profile form. Used by both /signup (with
// email + password wrapper) and /complete-profile (post-OAuth gate, no
// auth fields). Renders three fieldsets: "Who you are", "Tell us a bit
// more", and "Preferences" with the two informed-consent opt-out boxes.
//
// State is fully controlled by the parent — the parent owns `values` and
// applies a partial patch via `onChange`. That keeps the parent in charge
// of submit semantics (signup vs. RPC-call) without forking the UI.

import type { ChangeEvent } from "react";

export type ProfileFieldsValues = {
  persona: string;
  orgName: string;
  orgType: string;
  title: string;
  regionCounty: string;
  website: string;
  primaryInterest: string;
  referralSource: string;
  marketingOptOut: boolean;
  directoryOptOut: boolean;
};

export const EMPTY_PROFILE_VALUES: ProfileFieldsValues = {
  persona: "",
  orgName: "",
  orgType: "",
  title: "",
  regionCounty: "",
  website: "",
  primaryInterest: "",
  referralSource: "",
  marketingOptOut: false,
  directoryOptOut: false,
};

// Personas the user can self-select. Excludes "afs" (admin-only) and uses
// "explore" as the "just looking" fallback. Maps to the persona_t enum.
export const PERSONA_OPTIONS: Array<{ value: string; label: string }> = [
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
export const ORG_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
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
export const INTEREST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Choose one…" },
  { value: "source_local_food", label: "Source local food" },
  { value: "sell_through_afs", label: "Sell through AFS" },
  { value: "policy_research", label: "Policy / research" },
  { value: "invest_in_afs", label: "Invest in AFS" },
  { value: "map_food_system", label: "Map the food system" },
  { value: "other", label: "Other" },
];

export const REFERRAL_OPTIONS: Array<{ value: string; label: string }> = [
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

// Take whatever the user typed in the website field and turn it into a
// well-formed URL. Rules:
//   * empty / whitespace-only → null (the trigger drops null fields)
//   * already starts with http:// or https:// → leave alone
//   * starts with www. → prepend http://
//   * otherwise (bare domain or anything else) → prepend http://www.
// We never reject; the field accepts arbitrary text and AFS classifies on
// the backend if the string is unusable.
export function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `http://${trimmed}`;
  return `http://www.${trimmed}`;
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

export function ProfileFields({
  values,
  onChange,
  disabled = false,
  // Prefix lets two ProfileFields instances coexist on a page without
  // colliding HTML id attributes. Default matches the original signup form.
  idPrefix = "signup",
  optionalHint = "Optional. The more you tell us, the faster we can route you to the right tools.",
}: {
  values: ProfileFieldsValues;
  onChange: (patch: Partial<ProfileFieldsValues>) => void;
  disabled?: boolean;
  idPrefix?: string;
  optionalHint?: string;
}) {
  const text =
    (key: keyof ProfileFieldsValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ [key]: e.target.value } as Partial<ProfileFieldsValues>);

  const checkbox =
    (key: keyof ProfileFieldsValues) => (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ [key]: e.target.checked } as Partial<ProfileFieldsValues>);

  return (
    <>
      {/* Who you are — optional but high-value to AFS */}
      <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
        <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
          Who you are
        </legend>
        <p className="text-[12px] text-charcoal-soft/80 -mt-1">
          {optionalHint}
        </p>

        <Field label="I am a…" htmlFor={`${idPrefix}-persona`}>
          <select
            id={`${idPrefix}-persona`}
            value={values.persona}
            onChange={text("persona")}
            disabled={disabled}
            className={selectClass}
          >
            {PERSONA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Organization name" htmlFor={`${idPrefix}-org`}>
          <input
            id={`${idPrefix}-org`}
            type="text"
            autoComplete="organization"
            value={values.orgName}
            onChange={text("orgName")}
            maxLength={200}
            disabled={disabled}
            className={inputClass}
          />
        </Field>

        <Field label="Organization type" htmlFor={`${idPrefix}-org-type`}>
          <select
            id={`${idPrefix}-org-type`}
            value={values.orgType}
            onChange={text("orgType")}
            disabled={disabled}
            className={selectClass}
          >
            {ORG_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Your role / job title" htmlFor={`${idPrefix}-title`}>
          <input
            id={`${idPrefix}-title`}
            type="text"
            autoComplete="organization-title"
            value={values.title}
            onChange={text("title")}
            maxLength={120}
            disabled={disabled}
            className={inputClass}
          />
        </Field>

        <Field label="Region or county" htmlFor={`${idPrefix}-region`}>
          <input
            id={`${idPrefix}-region`}
            type="text"
            value={values.regionCounty}
            onChange={text("regionCounty")}
            placeholder="Jefferson County, KY"
            maxLength={120}
            disabled={disabled}
            className={inputClass}
          />
        </Field>

        <Field
          label="Organization website"
          htmlFor={`${idPrefix}-website`}
          hint="No need to type http:// — we'll add it for you."
        >
          <input
            id={`${idPrefix}-website`}
            type="text"
            autoComplete="url"
            value={values.website}
            onChange={text("website")}
            placeholder="example.com"
            maxLength={200}
            disabled={disabled}
            className={inputClass}
          />
        </Field>
      </fieldset>

      {/* Tell us a bit more — optional context */}
      <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
        <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
          Tell us a bit more
        </legend>

        <Field label="Why are you here?" htmlFor={`${idPrefix}-interest`}>
          <select
            id={`${idPrefix}-interest`}
            value={values.primaryInterest}
            onChange={text("primaryInterest")}
            disabled={disabled}
            className={selectClass}
          >
            {INTEREST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="How did you find us?" htmlFor={`${idPrefix}-referral`}>
          <select
            id={`${idPrefix}-referral`}
            value={values.referralSource}
            onChange={text("referralSource")}
            disabled={disabled}
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

      {/* Preferences — both default to OFF (= consent given). Checking
          the box revokes the corresponding consent. The intro sentence
          makes the opt-in explicit at signup time so the granular opt-out
          controls below sit on top of informed consent. */}
      <fieldset className="space-y-3 pt-2 border-t border-cream-shadow">
        <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft pt-4">
          Preferences
        </legend>
        <p className="text-[13px] leading-relaxed text-charcoal-soft -mt-1">
          By creating your account, you&apos;re agreeing to occasional
          Provender updates and a directory listing visible to other paying
          users in your tier. Use the boxes below to opt out of either.
        </p>

        <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-charcoal">
          <input
            type="checkbox"
            checked={values.marketingOptOut}
            onChange={checkbox("marketingOptOut")}
            disabled={disabled}
            className="mt-1 h-4 w-4 shrink-0 rounded border-cream-shadow text-slate-blue focus:ring-slate-blue"
          />
          <span>
            <span className="font-semibold text-charcoal">
              Opt out of Provender updates.
            </span>{" "}
            <span className="text-charcoal-soft">
              We send occasional emails about product changes, regional
              notes, and opportunities. Check this box if you&apos;d rather
              not receive them. You can change your mind any time.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-charcoal">
          <input
            type="checkbox"
            checked={values.directoryOptOut}
            onChange={checkbox("directoryOptOut")}
            disabled={disabled}
            className="mt-1 h-4 w-4 shrink-0 rounded border-cream-shadow text-slate-blue focus:ring-slate-blue"
          />
          <span>
            <span className="font-semibold text-charcoal">
              Do not show me in the Provender directory.
            </span>{" "}
            <span className="text-charcoal-soft">
              By default, other paying users in your tier or above can see
              your name and organization. Check this box to keep your
              account hidden. You can change this later.
            </span>
          </span>
        </label>
      </fieldset>
    </>
  );
}
