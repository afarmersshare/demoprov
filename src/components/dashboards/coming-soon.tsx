"use client";

type Props = {
  personaLabel: string;
  headline: string;
  willInclude: string[];
};

export function ComingSoonDashboard({
  personaLabel,
  headline,
  willInclude,
}: Props) {
  return (
    <div className="rounded-[14px] border border-dashed border-cream-shadow bg-bone/30 p-8 sm:p-10">
      <div className="max-w-2xl">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-2">
          {personaLabel} · dashboard coming soon
        </div>
        <h2 className="font-display text-[28px] font-semibold text-moss leading-tight tracking-[-0.01em]">
          {headline}
        </h2>
        <p className="mt-4 text-charcoal-soft leading-relaxed">
          The curated dashboard for this lens is next on the build list. In
          the meantime, every other tab — Map, Network, Flows, List,
          Directory, By county — shows the same underlying data and is fully
          interactive.
        </p>
        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
            When it ships, this dashboard will include
          </div>
          <ul className="space-y-2 text-sm text-charcoal leading-snug">
            {willInclude.map((item, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-moss mt-[0.15em]">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
