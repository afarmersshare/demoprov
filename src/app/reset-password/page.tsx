import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/get-user";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

// Recovery-flow landing page. Users arrive here after clicking the link in
// a "reset your password" email — /auth/callback exchanges the code, sets
// the session cookies, and forwards here. From this page the user picks a
// new password, which calls supabase.auth.updateUser({password}) on the
// active session.
//
// Direct navigation (no recovery email click) lands here only if the user
// is already signed in for some other reason — in which case treating this
// as a routine "change password" surface is the right behaviour. Anonymous
// visitors get bounced back to /login.
export default async function ResetPasswordPage() {
  const user = await getAuthedUser();
  if (!user) {
    redirect("/login");
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
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          <div className="text-center mb-7">
            <h1 className="font-display text-[28px] sm:text-[32px] font-semibold text-charcoal leading-tight tracking-[-0.01em]">
              Choose a new password
            </h1>
            <p className="mt-2 text-[14px] text-charcoal-soft leading-relaxed">
              You&apos;re signed in as{" "}
              <span className="font-semibold text-charcoal">{user.email}</span>.
              Pick a password you can remember — at least 8 characters.
            </p>
          </div>
          <section className="rounded-[14px] border border-cream-shadow bg-white px-6 sm:px-7 py-7 shadow-sm">
            <ResetPasswordForm />
          </section>
        </div>
      </div>
    </main>
  );
}
