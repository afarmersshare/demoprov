"use client";

import Link from "next/link";

type PersonaCard = {
  id: string;
  label: string;
  headline: string;
  questions: string[];
  status: "live" | "coming_soon";
  color: string;
};

const PERSONAS: PersonaCard[] = [
  {
    id: "policymaker",
    label: "I'm a policymaker or nonprofit",
    headline: "Food system intelligence for your region.",
    questions: [
      "Where do food-access gaps line up with local supply?",
      "What infrastructure is missing to close them?",
      "How does my county compare across the foodshed?",
    ],
    status: "live",
    color: "#2f4a3a",
  },
  {
    id: "afs",
    label: "I work at A Farmer's Share",
    headline: "Operational view across the pipeline.",
    questions: [
      "Where are my prospects, engaged, enrolled?",
      "Which counties need more recruitment coverage?",
      "Where are processor capacity bottlenecks?",
    ],
    status: "coming_soon",
    color: "#c77f2a",
  },
  {
    id: "farmer",
    label: "I'm a farmer or producer",
    headline: "Buyers and infrastructure near me.",
    questions: [
      "Which buyers in delivery radius are sourcing my products?",
      "What processing access do I have?",
      "Which support orgs — lenders, certifiers, extension — are in my county?",
    ],
    status: "coming_soon",
    color: "#6b9370",
  },
  {
    id: "buyer",
    label: "I'm a buyer or institution",
    headline: "Local supply for your product needs.",
    questions: [
      "What's grown within my sourcing radius?",
      "Who can aggregate and deliver at my volume?",
      "How do peer institutions source locally?",
    ],
    status: "coming_soon",
    color: "#a14a2a",
  },
  {
    id: "explore",
    label: "I'm just exploring",
    headline: "See the raw network.",
    questions: [
      "Map, force-directed graph, flow diagram, county breakdown — browse freely.",
    ],
    status: "live",
    color: "#4a524e",
  },
];

export function Landing() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
          Louisville &amp; Kentuckiana · Demo
        </div>
        <h1 className="font-display text-[44px] sm:text-[56px] font-semibold text-moss leading-[1.02] tracking-[-0.02em]">
          One data layer. Many ways in.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-charcoal-soft">
          Provender is food system intelligence: farms, buyers,
          infrastructure, and the people who connect them, on one graph.
          Different users need different lenses on the same data. Pick
          how you&apos;d walk in.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERSONAS.map((p) => {
          const isLive = p.status === "live";
          const href = `/?persona=${p.id}`;
          const cardBody = (
            <div
              className={
                "group relative h-full rounded-[14px] border bg-white p-6 transition-all " +
                (isLive
                  ? "border-cream-shadow hover:border-moss hover:shadow-md cursor-pointer"
                  : "border-cream-shadow/70 cursor-not-allowed")
              }
            >
              {!isLive ? (
                <span className="absolute top-4 right-4 inline-block px-2 py-0.5 rounded-full bg-bone text-[10px] font-medium uppercase tracking-[0.08em] text-charcoal-soft">
                  Coming soon
                </span>
              ) : null}
              <div
                className="inline-block w-2.5 h-2.5 rounded-full mb-3"
                style={{ background: p.color }}
              />
              <div
                className={
                  "text-[11px] font-bold uppercase tracking-[0.1em] mb-1 " +
                  (isLive ? "text-charcoal-soft" : "text-charcoal-soft/60")
                }
              >
                {p.label}
              </div>
              <div
                className={
                  "font-display text-[19px] font-semibold leading-tight mb-3 " +
                  (isLive ? "text-charcoal" : "text-charcoal-soft/70")
                }
              >
                {p.headline}
              </div>
              <ul
                className={
                  "space-y-1.5 text-sm leading-snug " +
                  (isLive ? "text-charcoal-soft" : "text-charcoal-soft/60")
                }
              >
                {p.questions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-charcoal-soft/40">›</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              {isLive ? (
                <div className="mt-5 text-xs font-medium text-moss group-hover:translate-x-0.5 transition-transform">
                  Open this view →
                </div>
              ) : null}
            </div>
          );
          return isLive ? (
            <Link key={p.id} href={href} className="block h-full">
              {cardBody}
            </Link>
          ) : (
            <div key={p.id} className="h-full">
              {cardBody}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-charcoal-soft/80 max-w-3xl leading-relaxed border-t border-cream-shadow pt-6">
        Every person, farm, and buyer in this demo is fictional, seeded
        in the Louisville–Kentuckiana region. County shapes are real
        (US Census); demographics are illustrative-plausible. The data
        layer underneath is the real Provender schema.
      </div>
    </div>
  );
}
