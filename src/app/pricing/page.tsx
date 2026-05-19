import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { AuthChip } from "@/components/auth/auth-chip";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Access · Atlas",
  description:
    "Request access to Atlas for your city, food council, nonprofit, funder, or research organization. Plans are relationship-led, not self-serve.",
};

function mailtoFor(subject: string): string {
  return `mailto:hello@afarmersshare.com?subject=${encodeURIComponent(subject)}`;
}

const AUDIENCE_LINES: Array<{ who: string; what: string }> = [
  {
    who: "Cities, counties, and food councils",
    what: "regional foodshed legibility, gap analysis at jurisdiction scale, and reporting for policy and planning conversations.",
  },
  {
    who: "Nonprofits and food-system advocates",
    what: "shared maps and metrics for the communities you serve, plus narrative-ready outputs for grant proposals and stakeholder briefings.",
  },
  {
    who: "Funders, CDFIs, and impact investors",
    what: "pipeline visibility across a region's food economy, with outcomes tracking against your investment thesis.",
  },
  {
    who: "Researchers and journalists",
    what: "a credible, traceable dataset on a regional food system and the relationships moving product through it.",
  },
];

export default async function PricingPage() {
  return (
    <main className="min-h-screen bg-chrome text-charcoal">
      <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-slate-blue hover:text-slate-blue-light transition-colors"
          >
            Atlas<span className="text-accent-amber">.</span>
          </Link>
          <AuthChip />
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 sm:px-10 py-10 sm:py-14 space-y-10">
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Access
          </p>
          <h1 className="mt-1 font-display text-[34px] sm:text-[42px] font-semibold text-slate-blue leading-[1.1] tracking-[-0.015em]">
            Request access for your organization
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-charcoal-soft">
            Atlas is the intelligence layer for a regional food system —
            built so non-operators (cities, councils, nonprofits, funders,
            researchers) can read what&apos;s happening, where the gaps are,
            and how value is moving. Access is relationship-led. We scope
            what fits your jurisdiction, region, or research question and
            come back with terms.
          </p>
        </header>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8">
          <h2 className="font-display text-[22px] font-semibold text-slate-blue leading-tight">
            Who Atlas is built for
          </h2>
          <ul className="mt-4 space-y-4 text-[13.5px] leading-relaxed text-charcoal">
            {AUDIENCE_LINES.map((line) => (
              <li key={line.who} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-amber"
                />
                <span>
                  <span className="font-semibold text-charcoal">
                    {line.who}
                  </span>
                  <span className="text-charcoal-soft"> — {line.what}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[14px] border border-slate-blue/30 bg-slate-pale/50 p-6 sm:p-8 text-center">
          <h2 className="font-display text-[24px] sm:text-[26px] font-semibold text-slate-blue leading-tight">
            Get in touch
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-charcoal-soft max-w-xl mx-auto">
            Tell us your organization, your region, and what you&apos;re trying
            to understand. We&apos;ll come back with a fit and a number.
          </p>
          <a
            href={mailtoFor("Atlas access — request")}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-blue px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-warm-cream hover:bg-slate-blue-light transition-colors"
          >
            hello@afarmersshare.com
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </section>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8">
          <h2 className="font-display text-[22px] font-semibold text-slate-blue leading-tight">
            How this works
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5 text-[13.5px] leading-relaxed text-charcoal">
            <div>
              <p className="font-semibold text-charcoal">Relationship-led</p>
              <p className="mt-1 text-charcoal-soft">
                Atlas scopes access through a conversation, not a
                checkout. Pricing reflects your region, audience, and the
                questions you need answered.
              </p>
            </div>
            <div>
              <p className="font-semibold text-charcoal">
                Demo data is illustrative
              </p>
              <p className="mt-1 text-charcoal-soft">
                What you see in the live demo is illustrative seed data for
                Louisville and Kentuckiana. The schema, infrastructure, and
                methodology underneath are real.
              </p>
            </div>
          </div>
        </section>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-[13px] font-semibold text-slate-blue hover:text-slate-blue-light transition-colors"
          >
            ← Back to the explorer
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
