"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "saving" | "success" | "error";

// Client-side new-password form. Calls supabase.auth.updateUser on the
// active session — works for both the recovery-email flow (lands here
// from /auth/callback?next=/reset-password) and any signed-in user who
// navigates directly. On success, redirects home so middleware can route
// to the persona dashboard.
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    password.length >= 8 && confirm === password && status !== "saving";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("saving");
    setErrorMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("success");
    // Full nav so middleware re-reads the session and routes to the right
    // persona surface.
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
          New password
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === "saving" || status === "success"}
          className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
        />
        {tooShort ? (
          <span className="block mt-1.5 text-[11px] text-charcoal-soft/80">
            At least 8 characters.
          </span>
        ) : null}
      </label>
      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
          Confirm new password
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={status === "saving" || status === "success"}
          className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
        />
        {mismatch ? (
          <span className="block mt-1.5 text-[11px] text-red-700">
            Passwords don&apos;t match.
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "saving"
          ? "Saving…"
          : status === "success"
            ? "Saved — redirecting…"
            : "Save new password"}
      </button>
      {errorMsg ? (
        <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}
