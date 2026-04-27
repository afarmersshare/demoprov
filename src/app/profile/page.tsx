import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser, type ModuleSlug } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { updateDisplayName, toggleConsent } from "./actions";
import { AuthChip } from "@/components/auth/auth-chip";

type ConsentRow = {
  consent_type: string;
  granted_at: string;
  cns_upid: string;
};

type ManagedConsent = {
  type: "marketing_use" | "provender_directory_listing";
  title: string;
  description: string;
  whenOnLabel: (grantedAt: string) => string;
  whenOffLabel: string;
  grantButtonLabel: string;
  revokeButtonLabel: string;
};

const MANAGED_CONSENTS: ManagedConsent[] = [
  {
    type: "marketing_use",
    title: "Provender updates",
    description:
      "Occasional emails about product changes, regional notes, and new opportunities.",
    whenOnLabel: (date) =>
      `Subscribed since ${new Date(date).toLocaleDateString()}.`,
    whenOffLabel: "You're not subscribed.",
    grantButtonLabel: "Subscribe to updates",
    revokeButtonLabel: "Unsubscribe",
  },
  {
    type: "provender_directory_listing",
    title: "Directory listing",
    description:
      "Other paying users in your tier or above can see your name and organization.",
    whenOnLabel: (date) =>
      `Visible since ${new Date(date).toLocaleDateString()}.`,
    whenOffLabel: "You're hidden from the directory.",
    grantButtonLabel: "Show me in the directory",
    revokeButtonLabel: "Hide my profile",
  },
];

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

  // Fetch active consent records via the SECURITY DEFINER RPC. Returns an
  // empty array if the user has no persons row or no active consents.
  const supabase = await createClient();
  const { data: rawConsents } = await supabase.rpc("fn_get_my_consents");
  const consents = (rawConsents ?? []) as ConsentRow[];
  const activeByType = new Map<string, ConsentRow>(
    consents.map((c) => [c.consent_type, c]),
  );

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
            Communication preferences
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-soft">
            Toggle either consent off any time. Revocations are recorded and
            keep a full audit trail.
          </p>

          <div className="mt-5 space-y-4">
            {MANAGED_CONSENTS.map((c) => {
              const active = activeByType.get(c.type);
              const isOn = Boolean(active);
              return (
                <div
                  key={c.type}
                  className="rounded-[10px] border border-cream-shadow bg-cream-deep/30 p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[15px] font-semibold text-charcoal">
                          {c.title}
                        </h3>
                        <span
                          className={
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] " +
                            (isOn
                              ? "bg-slate-blue/10 text-slate-blue"
                              : "bg-cream-shadow text-charcoal-soft")
                          }
                        >
                          {isOn ? "On" : "Off"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-charcoal-soft leading-relaxed">
                        {c.description}
                      </p>
                      <p className="mt-1.5 text-[12px] text-charcoal-soft/80">
                        {isOn && active
                          ? c.whenOnLabel(active.granted_at)
                          : c.whenOffLabel}
                      </p>
                    </div>

                    <form action={toggleConsent} className="shrink-0">
                      <input type="hidden" name="consent_type" value={c.type} />
                      <input
                        type="hidden"
                        name="grant"
                        value={isOn ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={
                          "rounded-[10px] px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors " +
                          (isOn
                            ? "border border-cream-shadow bg-white text-charcoal hover:border-slate-blue hover:text-slate-blue"
                            : "bg-slate-blue text-warm-cream hover:bg-slate-blue-light")
                        }
                      >
                        {isOn ? c.revokeButtonLabel : c.grantButtonLabel}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
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
