import { FarmsExplorer } from "@/components/farms/farms-explorer";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-charcoal">
      <nav className="border-b border-cream-shadow bg-cream/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <div className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-moss">
            Provender<span className="text-amber">.</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-bone px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-amber" />
            Louisville &amp; Kentuckiana
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-8 sm:py-10">
        <FarmsExplorer />
      </div>
    </main>
  );
}
