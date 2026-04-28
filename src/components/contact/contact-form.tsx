"use client";

import { useState } from "react";

const REASONS = [
  { value: "general", label: "General question" },
  { value: "plans", label: "Pricing or plan fit" },
  { value: "demo", label: "Schedule a walkthrough" },
  { value: "partnership", label: "Partnership or pilot" },
  { value: "regional", label: "Regional rollout (outside Louisville)" },
  { value: "research", label: "Research or data access" },
  { value: "press", label: "Press / media" },
  { value: "other", label: "Something else" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

const REASON_LABEL: Record<Reason, string> = REASONS.reduce(
  (acc, r) => ({ ...acc, [r.value]: r.label }),
  {} as Record<Reason, string>,
);

const TARGET_EMAIL = "hello@afarmersshare.com";

// No backend. Builds a mailto: URL from the form fields and hands off
// to the visitor's mail client. Pre-fills subject and body so the email
// arrives already structured. Small helper text underneath the submit
// button explains the handoff so visitors aren't surprised when their
// mail client opens.
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [reason, setReason] = useState<Reason>("general");
  const [message, setMessage] = useState("");

  const canSubmit = name.trim().length > 0 && message.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const subject = `Provender — ${REASON_LABEL[reason]}${
      organization.trim() ? ` (${organization.trim()})` : ""
    }`;

    const lines = [
      `Hi AFS,`,
      ``,
      message.trim(),
      ``,
      `—`,
      `${name.trim()}${email.trim() ? ` <${email.trim()}>` : ""}`,
      organization.trim() ? organization.trim() : null,
    ].filter(Boolean);

    const body = lines.join("\n");

    const url = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = url;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
            Your name <span className="text-red-700/70 normal-case">*</span>
          </span>
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last"
            className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organization.org"
            className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
          Organization
        </span>
        <input
          type="text"
          autoComplete="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Optional — your farm, business, agency, or affiliation"
          className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors"
        />
      </label>

      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
          What&apos;s this about?
        </span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
          className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal focus:outline-none focus:border-slate-blue transition-colors"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
          What would you like us to know?{" "}
          <span className="text-red-700/70 normal-case">*</span>
        </span>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A few lines is plenty. We'll come back with a real reply."
          className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors resize-y leading-relaxed"
        />
      </label>

      <div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:w-auto rounded-[10px] bg-slate-blue px-6 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Open in my email →
        </button>
        <p className="mt-2 text-[11px] text-charcoal-soft/80 leading-relaxed">
          Hitting this opens your default mail app with the message
          pre-filled. Hit Send from there and the note lands at{" "}
          {TARGET_EMAIL}.
        </p>
      </div>
    </form>
  );
}
