import Link from "next/link";

// Lightweight site footer rendered on top-level public pages. Intentionally
// small — sits at the bottom of the visual hierarchy, doesn't compete with
// the explorer or the auth surfaces. Three jobs:
//   1. Tagline (the one-line "what is this" answer for visitors who scrolled
//      past a page without reading it).
//   2. Utility nav (Plans / Contact / Sign in) so anywhere on the site is
//      one click from those entry points.
//   3. Brand anchor + copyright.
//
// Embed mode (iframe inside pro-pitch) skips this — the parent site has
// its own footer and we don't want to stack two.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-cream-shadow bg-chrome/60">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-8 sm:py-10">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <div className="font-display text-[20px] font-bold tracking-[-0.01em] leading-none text-slate-blue">
              Provender<span className="text-accent-amber">.</span>
            </div>
            <p className="mt-2 text-[13px] text-charcoal-soft leading-relaxed max-w-md">
              Where the regional food system becomes legible — to the people
              who feed it, source from it, fund it, and shape its rules.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            <FooterLink href="/pricing">Plans</FooterLink>
            <FooterLink href="/contact-us">Contact</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
          </nav>
        </div>
        <div className="mt-7 pt-5 border-t border-cream-shadow/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] uppercase tracking-[0.08em] text-charcoal-soft/80">
          <p>
            © {year} A Farmer&apos;s Share Corporation. A public benefit
            corporation.
          </p>
          <p>Louisville &amp; Kentuckiana · Demo build</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue transition-colors"
    >
      {children}
    </Link>
  );
}
