import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser, type ModuleSlug } from "@/lib/auth/get-user";
import { updateDisplayName } from "./actions";
import { AuthChip } from "@/components/auth/auth-chip";

const ALL_MODULE_SLUGS: ModuleSlug[] = [
  "map",
  "network",
  "flows",
  "list",
  "directory",
  "county",
  "dashboard",
  "pipeline",
  "reports",
];

const MODULE_LABEL: Record<ModuleSlug, string> = {
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

const PERSONA_LABEL: Record<string, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  hub: "Food hub",
  policymaker: "Government",
  nonprofit: "Nonprofit",
  funder: "Funder",
  afs: "AFS internal",
  explore: "Explore (default)",
};

const TIER_LABEL: Record<string, string> = {
  farmer_free: "Farmer · Free",
  farmer_paid: "Farmer · Paid",
  buyer_institutional: "Buyer · Institutional",
  buyer_foodhub: "Buyer · Food hub",
  buyer_grocery: "Buyer · Grocery",
  buyer_foodservice: "Buyer · Foodservice",
  buyer_farmersmarket: "Buyer · Farmers market",
  buyer_processor: "Buyer · Processor",
  government: "Government",
  nonprofit: "Nonprofit",
  funder: "Funder / researcher",
  aggregator_licensed: "Aggregator (licensed)",
  afs_internal: "AFS internal",
  demo: "Demo",
};

export default async function ProfilePage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login?next=/profile");

  const entitled = new Set<ModuleSlug>(user.entitledModules);

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

      <div className="mx-auto max-w-3xl px-6 sm:px-10 py-10 sm:py-14 space-y-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Your account
          </p>
          <h1 className="mt-1 font-display text-[30px] sm:text-[34px] font-semibold text-slate-blue leading-[1.15] tracking-[-0.015em]">
            {user.displayName ?? "Welcome to Provender"}
          </h1>
          <p className="mt-1.5 text-[14px] text-charcoal-soft">
            {user.email ?? "—"}
          </p>
        </div>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-7">
          <h2 className="font-display text-[18px] font-semibold text-charcoal">
            Display name
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-soft">
            Shown in the top nav and on personalized dashboards. You can leave
            it blank.
          </p>
          <form action={updateDisplayName} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="display_name"
              defaultValue={user.displayName ?? ""}
              placeholder="Your name"
              maxLength={80}
              className="flex-1 rounded-[10px] border border-cream-shadow bg-white px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-soft/50 focus:outline-none focus:border-slate-blue transition-colors"
            />
            <button
              type="submit"
              className="rounded-[10px] bg-slate-blue px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-warm-cream hover:bg-slate-blue-light transition-colors"
            >
              Save
            </button>
          </form>
        </section>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-7">
          <h2 className="font-display text-[18px] font-semibold text-charcoal">
            Plan &amp; role
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-soft">
            Tier governs which modules you can access. Persona governs which
            dashboard you land on. Both are set by AFS — email{" "}
            <a
              href="mailto:hello@afarmersshare.com"
              className="font-semibold text-slate-blue hover:text-slate-blue-light"
            >
              hello@afarmersshare.com
            </a>{" "}
            to change either.
          </p>

          <dl className="mt-5 divide-y divide-cream-shadow text-[14px]">
            <div className="flex justify-between gap-4 py-3 first:pt-0">
              <dt className="text-charcoal-soft">Tier</dt>
              <dd className="text-charcoal font-semibold text-right">
                {TIER_LABEL[user.tier] ?? user.tier}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-charcoal-soft">Persona</dt>
              <dd className="text-charcoal font-semibold text-right">
                {PERSONA_LABEL[user.persona] ?? user.persona}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-7">
          <h2 className="font-display text-[18px] font-semibold text-charcoal">
            Modules
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-soft">
            Filled = unlocked for your tier. Faded = locked, with an upsell
            inside the app.
          </p>
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_MODULE_SLUGS.map((slug) => {
              const on = entitled.has(slug);
              return (
                <li
                  key={slug}
                  className={
                    "rounded-[10px] border px-3 py-2 text-[13px] " +
                    (on
                      ? "border-slate-blue/30 bg-slate-blue/5 text-charcoal font-semibold"
                      : "border-cream-shadow bg-cream-deep/40 text-charcoal-soft/70")
                  }
                >
                  {MODULE_LABEL[slug]}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-7">
          <h2 className="font-display text-[18px] font-semibold text-charcoal">
            Sign out
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-soft">
            Ends your session on this device.
          </p>
          <form action="/auth/signout" method="post" className="mt-4">
            <button
              type="submit"
              className="rounded-[10px] border border-cream-shadow bg-white px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-charcoal hover:border-slate-blue hover:text-slate-blue transition-colors"
            >
              Sign out
            </button>
          </form>
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
