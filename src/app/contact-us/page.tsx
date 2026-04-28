import Link from "next/link";
import type { Metadata } from "next";
import { AuthChip } from "@/components/auth/auth-chip";
import { ContactForm } from "@/components/contact/contact-form";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact · Provender",
  description:
    "Reach the Provender team — questions about plans, partnerships, regional rollouts, or research access.",
};

// Plain-English contact surface. No backend wiring: the form builds a
// mailto: link and hands off to the visitor's mail client. Keeps the page
// server-renderable, keeps the demo lean (no edge function or queue), and
// matches how AFS already takes inbound today (everything routes through
// hello@afarmersshare.com).
export default function ContactPage() {
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
          <AuthChip />
        </div>
      </nav>

      <div className="flex-1 px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-[640px]">
          <div className="text-center mb-9">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
              Get in touch
            </p>
            <h1 className="mt-2 font-display text-[30px] sm:text-[36px] font-semibold text-charcoal leading-[1.1] tracking-[-0.015em]">
              Tell us what you&apos;re working on.
            </h1>
            <p className="mt-3 text-[15px] text-charcoal-soft leading-relaxed">
              Provender is built around real conversations. Drop us a note
              and we&apos;ll come back with a real reply — usually inside a
              few business days.
            </p>
          </div>

          <section className="rounded-[14px] border border-cream-shadow bg-white px-6 sm:px-8 py-7 shadow-sm">
            <ContactForm />
          </section>

          <div className="mt-7 rounded-[12px] border border-cream-shadow bg-cream-deep/30 px-5 py-4 text-[13px] text-charcoal-soft leading-relaxed">
            <p>
              <span className="font-semibold text-charcoal">Prefer email?</span>{" "}
              Write directly to{" "}
              <a
                href="mailto:hello@afarmersshare.com"
                className="font-semibold text-slate-blue hover:text-slate-blue-light"
              >
                hello@afarmersshare.com
              </a>
              . Press, partnership, or research questions — same address.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-[13px] font-semibold text-slate-blue hover:text-slate-blue-light transition-colors"
            >
              ← Back to the explorer
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
