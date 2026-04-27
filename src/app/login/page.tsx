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

  const signupHref = safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup";

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
        <div className="w-full max-w-[960px]">
          <div className="text-center mb-8">
            <h1 className="font-display text-[28px] sm:text-[32px] font-semibold text-charcoal leading-tight tracking-[-0.01em]">
              Welcome to Provender
            </h1>
            <p className="mt-2 text-[14px] text-charcoal-soft leading-relaxed">
              New here? Create an account on the left. Already signed up?
              Sign in on the right.
            </p>
          </div>

          {/* Two-column on md+, stacked on mobile. Both cards keep equal
              visual weight so neither path looks secondary. */}
          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {/* Create an account — left column */}
            <section className="rounded-[14px] border border-cream-shadow bg-white px-6 sm:px-7 py-7 shadow-sm flex flex-col">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
                New to Provender
              </div>
              <h2 className="mt-2 font-display text-[22px] font-semibold text-slate-blue leading-tight">
                Create an account
              </h2>
              <p className="mt-3 text-[14px] text-charcoal-soft leading-relaxed">
                Map your role in the regional food system. Free while we&apos;re
                in beta.
              </p>

              <ul className="mt-5 space-y-2.5 text-[13px] text-charcoal leading-relaxed">
                <li className="flex gap-2.5">
                  <Bullet />
                  <span>
                    Pick your role — farmer, buyer, food council, funder, or
                    just exploring.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <Bullet />
                  <span>
                    Land on a dashboard built for how you actually think about
                    food.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <Bullet />
                  <span>
                    Set your visibility on your terms — directory listing is
                    opt-out.
                  </span>
                </li>
              </ul>

              <div className="mt-auto pt-7">
                <Link
                  href={signupHref}
                  className="block w-full text-center rounded-[10px] bg-slate-blue px-4 py-3 text-[14px] font-semibold text-white hover:bg-slate-blue-light transition-colors"
                >
                  Create your account
                </Link>
                <p className="mt-3 text-center text-[12px] text-charcoal-soft/80">
                  Or{" "}
                  <Link
                    href="/"
                    className="font-semibold text-slate-blue hover:text-slate-blue-light transition-colors"
                  >
                    explore the demo
                  </Link>{" "}
                  without signing in.
                </p>
              </div>
            </section>

            {/* Sign in — right column */}
            <section className="rounded-[14px] border border-cream-shadow bg-white px-6 sm:px-7 py-7 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
                Already have an account
              </div>
              <h2 className="mt-2 font-display text-[22px] font-semibold text-slate-blue leading-tight">
                Sign in
              </h2>
              <p className="mt-3 text-[14px] text-charcoal-soft leading-relaxed">
                Use your Google account, send yourself a sign-in link, or use a
                password.
              </p>

              <div className="mt-5">
                <LoginForm initialError={error ?? null} next={safe} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden="true"
      className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-blue"
    />
  );
}
