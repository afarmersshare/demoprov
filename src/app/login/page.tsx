import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthedUser } from "@/lib/auth/get-user";

type SearchParams = Promise<{ error?: string; next?: string }>;

// Only honour `next` if it's a same-origin relative path. Reject protocol-
// prefixed values ("https://...") and protocol-relative ones ("//host/...")
// so a crafted /login?next=https://evil.example can't turn the login page
// into an open redirector.
function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Already signed in? Skip the form, route to root (middleware will then
  // forward to the persona dashboard).
  const user = await getAuthedUser();
  if (user) redirect("/");

  const { error, next } = await searchParams;
  const safe = safeNext(next);

  return (
    <main className="min-h-screen bg-chrome text-charcoal flex flex-col">
      <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-slate-blue hover:text-slate-blue-light transition-colors"
          >
            Provender<span className="text-accent-amber">.</span>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-pale px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-region-badge" />
            Louisville &amp; Kentuckiana
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-7">
            <h1 className="font-display text-[28px] sm:text-[32px] font-semibold text-charcoal leading-tight tracking-[-0.01em]">
              Sign in to Provender
            </h1>
            <p className="mt-2 text-[14px] text-charcoal-soft leading-relaxed">
              Use your Google account, or we&apos;ll email you a one-time link.
            </p>
          </div>

          <div className="rounded-[14px] border border-cream-shadow bg-white px-6 py-7 shadow-sm">
            <LoginForm initialError={error ?? null} next={safe} />
          </div>

          <p className="mt-5 text-center text-[12px] text-charcoal-soft/80 leading-relaxed">
            New here?{" "}
            <Link
              href="/"
              className="font-semibold text-slate-blue hover:text-slate-blue-light transition-colors"
            >
              Explore the demo
            </Link>{" "}
            without signing in.
          </p>
        </div>
      </div>
    </main>
  );
}
