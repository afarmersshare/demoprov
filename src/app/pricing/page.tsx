import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import type { ModuleSlug } from "@/lib/auth/get-user";
import { AuthChip } from "@/components/auth/auth-chip";

export const metadata: Metadata = {
  title: "Plans · Provender",
  description:
    "How Provender plans work — farmer profiles, buyer licenses, government partnerships, and licensed aggregators.",
};

type TierBlockId = "farmer" | "buyer" | "gov_nonprofit" | "aggregator";

type TierBlock = {
  id: TierBlockId;
  eyebrow: string;
  name: string;
  who: string;
  priceHeadline: string;
  priceDetail: string;
  includes: string[];
  description: string;
  notes?: string;
  ctaSubject: string;
};

const TIER_BLOCKS: TierBlock[] = [
  {
    id: "farmer",
    eyebrow: "Tier 1",
    name: "Farmer / Producer",
    who: "For farmers and growers selling regionally.",
    priceHeadline: "Free, or $25–$49/mo",
    priceDetail: "Annual: $240–$480/year — less than one missed market day.",
    includes: ["Map", "Directory", "Network", "Dashboard", "Reports"],
    description:
      "Free profile with buyer discovery and simplified compliance. Paid adds the competitor toggle, regen and program eligibility scoring, and buyer contact unlocks.",
    ctaSubject: "Producer profile on Provender",
  },
  {
    id: "buyer",
    eyebrow: "Tier 2",
    name: "Buyer / Institution",
    who: "For institutions, hubs, retail, food service, markets, and processors sourcing regionally.",
    priceHeadline: "$1.5K–$18K / year",
    priceDetail: "Annual license, per region, by buyer segment.",
    includes: [
      "Map",
      "Network",
      "Flows",
      "List",
      "Directory",
      "By county",
      "Dashboard",
      "Reports",
    ],
    description:
      "Six segment-specific price points, each scoped to one region per license:",
    notes: [
      "Institutional (hospital, university, corporate) — $8K–$18K/yr",
      "Food hubs / aggregators — $5K–$12K/yr",
      "Grocery / retail — $6K–$15K/yr",
      "Food service — $4K–$10K/yr",
      "Farmers markets — $1.5K–$4K/yr",
      "Processors — $6K–$14K/yr",
      "Adjacent: compliance gap closure at $3K–$8K per gap, or retainer.",
    ].join("\n"),
    ctaSubject: "Buyer license on Provender",
  },
  {
    id: "gov_nonprofit",
    eyebrow: "Tier 3",
    name: "Government, Nonprofit, Research",
    who: "For agencies, food councils, foundations, and research teams working at jurisdiction scale.",
    priceHeadline: "$12K–$35K / year",
    priceDetail: "Negotiated, white-labeled. Not listed publicly.",
    includes: [
      "Map",
      "Flows",
      "By county",
      "Network (nonprofit)",
      "Dashboard",
      "Reports",
    ],
    description:
      "Tailored to your jurisdiction. County-scale aggregates, MMRV outcomes, network maps where they fit, and reports built for the questions you ask.",
    notes:
      "12-month license + 1 customization per year included. Additional customizations $1.5K–$3K each.",
    ctaSubject: "Government / nonprofit / research partnership",
  },
  {
    id: "aggregator",
    eyebrow: "Tier 4",
    name: "Licensed Aggregator",
    who: "For organizations operating an AFS-affiliated aggregation hub.",
    priceHeadline: "$15K–$25K setup + $10K–$18K / year",
    priceDetail: "Plus optional 2–4% revenue share on Provender-matched sales.",
    includes: [
      "Map",
      "Network",
      "Flows",
      "List",
      "Directory",
      "By county",
      "Dashboard",
      "Pipeline",
      "Reports",
    ],
    description:
      "Includes AFS brand co-use, the aggregation playbook, and defined training hours.",
    notes:
      "Does not include AFS operational sales involvement, Radicle traceability, or unlimited support — those are scoped separately.",
    ctaSubject: "Licensed aggregator partnership",
  },
];

const MODULE_LABEL: Record<ModuleSlug, string> = {
  landing: "Landing",
  map: "Map",
  network: "Network",
  flows: "Flows",
  list: "List",
  directory: "Directory",
  county: "By county",
  dashboard: "Dashboard",
  pipeline: "Pipeline",
  reports: "Reports",
};

// Cheapest tier block that unlocks each module — used by the highlight banner
// when a user lands here from a locked tab. Reflects the locked 2026-04-28
// matrix: Dashboard moved off the farmer block (operators land on Landing
// instead of Dashboard now), so the cheapest block that unlocks Dashboard
// is gov_nonprofit.
const MODULE_TIER_HINT: Record<ModuleSlug, TierBlockId> = {
  landing: "farmer",
  map: "farmer",
  directory: "farmer",
  reports: "farmer",
  network: "farmer",
  dashboard: "gov_nonprofit",
  list: "buyer",
  flows: "buyer",
  county: "buyer",
  pipeline: "aggregator",
};

const MODULE_SLUGS = new Set<ModuleSlug>(
  Object.keys(MODULE_LABEL) as ModuleSlug[],
);

function mailtoFor(subject: string): string {
  return `mailto:hello@afarmersshare.com?subject=${encodeURIComponent(subject)}`;
}

type SearchParams = { highlight?: string | string[] };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.highlight)
    ? params.highlight[0]
    : params.highlight;
  const highlightModule: ModuleSlug | null =
    raw && MODULE_SLUGS.has(raw as ModuleSlug) ? (raw as ModuleSlug) : null;
  const highlightTierId: TierBlockId | null = highlightModule
    ? MODULE_TIER_HINT[highlightModule]
    : null;
  const highlightTier = highlightTierId
    ? TIER_BLOCKS.find((t) => t.id === highlightTierId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-chrome text-charcoal">
      <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md sticky top-0 z-20">
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

      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-10 sm:py-14 space-y-10">
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Plans
          </p>
          <h1 className="mt-1 font-display text-[34px] sm:text-[42px] font-semibold text-slate-blue leading-[1.1] tracking-[-0.015em]">
            How Provender plans work
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-charcoal-soft">
            Four kinds of organizations use Provender — each gets a different
            slice of the tools. Plans are relationship-led, not self-serve.
            Reach out and we&apos;ll scope what fits.
          </p>
        </header>

        {highlightModule && highlightTier ? (
          <aside
            className="rounded-[14px] border border-slate-blue/40 bg-slate-pale/60 px-5 sm:px-6 py-5 ring-1 ring-slate-blue/15"
            aria-label="Why you're seeing this page"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-blue">
              The {MODULE_LABEL[highlightModule]} tab is locked on your current plan
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-charcoal">
              The{" "}
              <a
                href={`#tier-${highlightTier.id}`}
                className="font-semibold text-slate-blue hover:text-slate-blue-light underline underline-offset-2"
              >
                {highlightTier.name}
              </a>{" "}
              plan unlocks it. See that block below for who it&apos;s built for
              and how to get in touch.
            </p>
          </aside>
        ) : null}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TIER_BLOCKS.map((tier) => {
            const isHighlighted = tier.id === highlightTierId;
            return (
              <article
                key={tier.id}
                id={`tier-${tier.id}`}
                className={
                  "scroll-mt-24 rounded-[14px] border bg-white p-6 sm:p-7 flex flex-col " +
                  (isHighlighted
                    ? "border-slate-blue/50 ring-2 ring-slate-blue/25"
                    : "border-cream-shadow")
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-amber">
                  {tier.eyebrow}
                </p>
                <h2 className="mt-1 font-display text-[24px] sm:text-[26px] font-semibold text-slate-blue leading-[1.15] tracking-[-0.015em]">
                  {tier.name}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-charcoal-soft">
                  {tier.who}
                </p>

                <div className="mt-5 rounded-[10px] bg-cream-deep/40 px-4 py-3">
                  <p className="font-display text-[20px] font-semibold text-charcoal leading-tight">
                    {tier.priceHeadline}
                  </p>
                  <p className="mt-1 text-[12px] text-charcoal-soft">
                    {tier.priceDetail}
                  </p>
                </div>

                <p className="mt-5 text-[13px] leading-relaxed text-charcoal">
                  {tier.description}
                </p>

                {tier.notes ? (
                  <ul className="mt-3 text-[12.5px] leading-relaxed text-charcoal-soft space-y-1">
                    {tier.notes.split("\n").map((line) => (
                      <li key={line} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-accent-amber"
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                    Includes
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {tier.includes.map((label) => (
                      <li
                        key={label}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-pale px-2.5 py-1 text-[11px] font-semibold text-slate-blue"
                      >
                        <Check className="h-3 w-3" aria-hidden />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={mailtoFor(tier.ctaSubject)}
                  className="mt-7 self-start inline-flex items-center gap-2 rounded-full bg-slate-blue px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-warm-cream hover:bg-slate-blue-light transition-colors"
                >
                  Talk to us
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </article>
            );
          })}
        </section>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8">
          <h2 className="font-display text-[22px] font-semibold text-slate-blue leading-tight">
            How this works
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 text-[13.5px] leading-relaxed text-charcoal">
            <div>
              <p className="font-semibold text-charcoal">Relationship-led</p>
              <p className="mt-1 text-charcoal-soft">
                AFS scopes plans through a conversation, not a checkout flow.
                Pricing reflects your region and segment.
              </p>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Region-scoped licenses</p>
              <p className="mt-1 text-charcoal-soft">
                Buyer and aggregator plans cover one region per license. Multi-region
                organizations license per region or negotiate a bundle.
              </p>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Demo is illustrative</p>
              <p className="mt-1 text-charcoal-soft">
                The data you see in the demo is illustrative. The schema and
                infrastructure underneath are real.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[14px] border border-slate-blue/30 bg-slate-pale/50 p-6 sm:p-8 text-center">
          <h2 className="font-display text-[24px] sm:text-[26px] font-semibold text-slate-blue leading-tight">
            Get in touch
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-charcoal-soft max-w-xl mx-auto">
            Tell us your organization, your region, and what you&apos;re trying
            to do. We&apos;ll come back with a fit and a number.
          </p>
          <a
            href={mailtoFor("Provender plans — getting in touch")}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-blue px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-warm-cream hover:bg-slate-blue-light transition-colors"
          >
            hello@afarmersshare.com
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
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
    </main>
  );
}
