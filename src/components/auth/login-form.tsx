"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "reset_sent" | "error";
type Mode = "magic" | "password" | "forgot";

export function LoginForm({
  initialError,
  next,
}: {
  initialError?: string | null;
  // Pre-validated by the server page (must start with a single "/"). The
  // form appends it to the auth-callback URL so /auth/callback/route.ts
  // can redirect there after the session exchange. If null, the callback
  // falls through to "/".
  next?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("magic");
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
    setStatus("sending");
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

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    // Password auth returns a session immediately and the SSR client writes
    // the cookies. A full navigation lets server middleware re-read the
    // session and route to the persona dashboard.
    window.location.href = next ?? "/";
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    // Recovery flow: Supabase emails a token-bearing link. The link routes
    // to /auth/callback which exchanges the code and forwards to
    // /reset-password where the user picks a new password. Forcing the next
    // hop to /reset-password keeps the recovery session scoped to that
    // single action.
    const redirectBase =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback";
    const redirectTo = `${redirectBase}?next=${encodeURIComponent("/reset-password")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("reset_sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-[12px] border border-cream-shadow bg-warm-cream/60 px-5 py-6 text-center">
        <div className="font-display text-[22px] font-semibold text-slate-blue mb-2">
          Check your inbox
        </div>
        <p className="text-[14px] leading-relaxed text-charcoal-soft">
          We sent a sign-in link to <span className="font-semibold text-charcoal">{email}</span>.
          Click it on this device to continue.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
          className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-blue hover:text-slate-blue-light transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (status === "reset_sent") {
    return (
      <div className="rounded-[12px] border border-cream-shadow bg-warm-cream/60 px-5 py-6 text-center">
        <div className="font-display text-[22px] font-semibold text-slate-blue mb-2">
          Check your inbox
        </div>
        <p className="text-[14px] leading-relaxed text-charcoal-soft">
          We sent a password-reset link to{" "}
          <span className="font-semibold text-charcoal">{email}</span>. Click
          it to choose a new password. The link works once and then expires.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMode("password");
            setEmail("");
          }}
          className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-blue hover:text-slate-blue-light transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="space-y-5">
        <form onSubmit={handleForgot} className="space-y-3">
          <div>
            <h3 className="font-display text-[18px] font-semibold text-slate-blue leading-tight">
              Reset your password
            </h3>
            <p className="mt-1.5 text-[13px] text-charcoal-soft leading-relaxed">
              Enter the email on your account and we&apos;ll send you a link
              to choose a new password.
            </p>
          </div>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Email address
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              disabled={status === "sending"}
              className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
              setStatus("idle");
            }}
            className="w-full text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue transition-colors"
          >
            Back to sign in
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

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={status === "sending"}
        className="w-full inline-flex items-center justify-center gap-3 rounded-[10px] border border-cream-shadow bg-white px-4 py-3 text-[14px] font-semibold text-charcoal hover:border-slate-blue hover:text-slate-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-charcoal-soft/70">
        <div className="flex-1 border-t border-cream-shadow" />
        or sign in with email
        <div className="flex-1 border-t border-cream-shadow" />
      </div>

      {mode === "magic" ? (
        <form onSubmit={handleMagicLink} className="space-y-3">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Email address
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              disabled={status === "sending"}
              className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
              setStatus("idle");
            }}
            className="w-full text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue transition-colors"
          >
            Have a password? Sign in with it instead
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword} className="space-y-3">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Email address
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              disabled={status === "sending"}
              className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft mb-1.5">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "sending"}
              className="w-full rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !email.trim() || !password}
            className="w-full rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setPassword("");
              setErrorMsg(null);
              setStatus("idle");
            }}
            className="w-full text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue transition-colors"
          >
            Use a sign-in link instead
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setPassword("");
              setErrorMsg(null);
              setStatus("idle");
            }}
            className="w-full text-center text-[11px] text-charcoal-soft/80 hover:text-slate-blue transition-colors"
          >
            Forgot your password?
          </button>
        </form>
      )}

      {errorMsg ? (
        <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
          {errorMsg}
        </p>
      ) : null}
    </div>
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
