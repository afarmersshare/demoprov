import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { SiteFooter } from "@/components/site-footer";

// Server-rendered gate page. Reached by the middleware when an authenticated
// user has user_profiles.profile_completed_at IS NULL. Two short-circuit
// branches before the form renders:
//   * No authed user  → /login (with ?next=/complete-profile so the OAuth
//                       handshake brings them back here on success).
//   * Already complete → / (let middleware route them onward to their
//                       persona dashboard).
// Anyone past those checks sees the form, prefilled with whatever the
// trigger captured at first sign-in (display_name and email).

export default async function CompleteProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/complete-profile");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, profile_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.profile_completed_at) {
    redirect("/");
  }

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
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[12px] font-semibold uppercase tracking-[0.06em] text-charcoal-soft hover:text-slate-blue transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">
          <div className="text-center mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
              One more step
            </p>
            <h1 className="mt-2 font-display text-[28px] sm:text-[32px] font-semibold text-charcoal leading-tight tracking-[-0.01em]">
              Tell us about yourself
            </h1>
            <p className="mt-3 text-[14px] text-charcoal-soft leading-relaxed">
              You&apos;re signed in as{" "}
              <span className="font-semibold text-charcoal">{user.email}</span>.
              We need a few more details before you can dive in — these help
              us route you to the right tools and keep you in the loop on your
              terms.
            </p>
          </div>

          <div className="rounded-[14px] border border-cream-shadow bg-white px-6 sm:px-8 py-7 shadow-sm">
            <CompleteProfileForm
              defaultFullName={profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
