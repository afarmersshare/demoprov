import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { AuthChip } from "@/components/auth/auth-chip";
import { SiteFooter } from "@/components/site-footer";

// WINNOW landing — read-only view of the AFS profile (sql/015) + partners
// (sql/016). The single declarative input that drives every funder match.
//
// Auth gate: authed + tier=afs_internal. RLS in Postgres enforces the same
// boundary at the data layer; this redirect is a UX nicety so non-admin
// users land somewhere coherent instead of seeing an empty page.
//
// Slice 1 scope: read-only render. /winnow/onboarding (next slice) adds
// the edit form. /winnow/opportunities (slice 2) adds the dashboard.

type OrgProfileRow = {
  slug: string;
  legal_name: string;
  dba_name: string | null;
  entity_type: string;
  b_corp_status: string;
  state_of_incorporation: string | null;
  foreign_registrations: string[];
  founded_date: string | null;
  leadership_attributes: string[];
  service_lines: string[];
  mission_statement: string | null;
  vision_statement: string | null;
  geography_focus: string[];
  ask_size_min_usd: number | null;
  ask_size_max_usd: number | null;
  mission_tags: string[];
  domain_expertise: string[];
  revenue_streams: string[];
  founders: Array<{ name: string; title: string; focus: string }>;
  website: string | null;
  primary_email: string | null;
  notes: string | null;
  updated_at: string;
};

type RelationshipRow = {
  id: string;
  partner_name: string;
  partner_type: string;
  relationship_kind: string;
  status: string;
  state: string | null;
  ein: string | null;
  website: string | null;
  mission_tags: string[];
  notes: string | null;
};

const ENTITY_LABEL: Record<string, string> = {
  pbc: "Public Benefit Corporation (PBC)",
  b_corp_certified: "Certified B Corporation",
  llc: "LLC",
  c_corp: "C-Corp",
  s_corp: "S-Corp",
  nonprofit_501c3: "501(c)(3) Nonprofit",
  fiscally_sponsored: "Fiscally Sponsored",
  sole_prop: "Sole Proprietorship",
  cooperative: "Cooperative",
  government: "Government",
  tribal: "Tribal Entity",
};

const B_CORP_LABEL: Record<string, string> = {
  none: "Not pursuing B-Corp certification",
  pending_assessment: "B Impact Assessment in progress",
  certified: "Certified",
  recertified: "Recertified",
};

const SERVICE_LINE_LABEL: Record<string, string> = {
  advising: "Grow Together Advising",
  commons_lab: "The Commons Lab",
  blueprint_reservoir: "Impact Blueprint Reservoir",
  engagement_collective: "Igniting Change Collective",
};

const RELATIONSHIP_KIND_LABEL: Record<string, string> = {
  co_applicant_partner: "Co-applicant partner",
  fiscal_sponsor: "Fiscal sponsor",
  advisor: "Advisor",
  board: "Board member",
  alumni_grantee: "Alumni grantee",
  warm_intro_path: "Warm-intro path",
  funder_prior: "Prior funder",
  client: "Client",
  coalition: "Coalition",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-forest-sage/15 text-forest-sage",
  prospective: "bg-accent-amber/15 text-accent-amber",
  former: "bg-cream-shadow text-charcoal-soft",
};

function fmtUsd(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toLocaleString()}k`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function prettify(s: string): string {
  return s.replace(/_/g, " ");
}

export default async function WinnowPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/login?next=/winnow");
  if (user.tier !== "afs_internal") redirect("/");

  const supabase = await createClient();
  const [{ data: profileRow }, { data: relationshipRows }] = await Promise.all([
    supabase
      .from("winnow_org_profile")
      .select("*")
      .eq("slug", "afs")
      .maybeSingle<OrgProfileRow>(),
    supabase
      .from("winnow_org_relationships")
      .select(
        "id, partner_name, partner_type, relationship_kind, status, state, ein, website, mission_tags, notes",
      )
      .eq("org_slug", "afs")
      .order("status", { ascending: true })
      .order("partner_name", { ascending: true }),
  ]);

  const profile = profileRow ?? null;
  const relationships = (relationshipRows ?? []) as RelationshipRow[];

  return (
    <main className="min-h-screen bg-chrome text-charcoal flex flex-col">
      <nav className="border-b border-cream-shadow bg-chrome/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-3.5">
          <Link
            href="/"
            className="font-display text-[26px] font-bold tracking-[-0.02em] leading-none text-slate-blue hover:text-slate-blue-light transition-colors"
          >
            Provender<span className="text-accent-amber">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-blue">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-blue" />
              WINNOW · AFS internal
            </span>
            <AuthChip />
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 py-10 sm:py-14 space-y-8 flex-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            AFS Funding Discovery
          </p>
          <h1 className="mt-1 font-display text-[34px] sm:text-[40px] font-semibold text-slate-blue leading-[1.1] tracking-[-0.015em]">
            WINNOW
          </h1>
          <p className="mt-2 text-[15px] text-charcoal-soft max-w-2xl leading-relaxed">
            The funding opportunities engine. One profile drives every match.
            Below is the canonical AFS profile the matcher will score against
            — opportunities ingestion arrives in the next slice.
          </p>
        </div>

        {profile == null ? (
          <section className="rounded-[14px] border border-accent-amber/30 bg-accent-amber/5 p-6">
            <h2 className="font-display text-[18px] font-semibold text-charcoal">
              No AFS profile yet
            </h2>
            <p className="mt-2 text-[14px] text-charcoal-soft">
              Run <code className="rounded bg-cream-deep px-1.5 py-0.5 text-[12px]">sql/015_winnow_org_profile.sql</code>{" "}
              in the Supabase SQL editor to seed it, then refresh this page.
            </p>
          </section>
        ) : (
          <>
            <ProfileHeaderCard profile={profile} />
            <ProfileTextSection
              title="Mission"
              body={profile.mission_statement}
            />
            <ProfileTextSection
              title="Vision"
              body={profile.vision_statement}
            />
            <ProfileFoundersCard founders={profile.founders} />
            <ProfileMatchingCard profile={profile} />
            <ProfileTagsCard
              title="Mission tags"
              subtitle="Embedded against funder priority statements during matching."
              tags={profile.mission_tags}
            />
            <ProfileTagsCard
              title="Domain expertise"
              subtitle="Capabilities AFS brings to funded work — surfaced in funder fit explanations."
              tags={profile.domain_expertise}
            />
            <ProfileRelationshipsCard relationships={relationships} />
            {profile.notes ? (
              <ProfileTextSection title="Notes" body={profile.notes} />
            ) : null}
            <p className="text-[12px] text-charcoal-soft/80 pt-4 border-t border-cream-shadow">
              Profile last updated {fmtDate(profile.updated_at)}. Edit form
              ships in the next slice (<code className="font-mono">/winnow/onboarding</code>).
            </p>
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

function ProfileHeaderCard({ profile }: { profile: OrgProfileRow }) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-semibold text-charcoal leading-tight">
            {profile.legal_name}
          </h2>
          {profile.dba_name && profile.dba_name !== profile.legal_name ? (
            <p className="text-[13px] text-charcoal-soft mt-0.5">
              dba {profile.dba_name}
            </p>
          ) : null}
          <p className="mt-3 text-[13px] text-charcoal-soft">
            {ENTITY_LABEL[profile.entity_type] ?? profile.entity_type}
            {profile.state_of_incorporation
              ? ` · incorporated in ${profile.state_of_incorporation}`
              : ""}
            {profile.foreign_registrations.length > 0
              ? ` · registered in ${profile.foreign_registrations.join(", ")}`
              : ""}
          </p>
          <p className="text-[13px] text-charcoal-soft">
            {B_CORP_LABEL[profile.b_corp_status] ?? profile.b_corp_status}
            {profile.founded_date ? ` · founded ${fmtDate(profile.founded_date)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.leadership_attributes.map((a) => (
            <span
              key={a}
              className="inline-block rounded-full bg-forest-sage/15 text-forest-sage px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
            >
              {prettify(a)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-cream-shadow grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
        {profile.website ? (
          <div>
            <span className="text-charcoal-soft">Website · </span>
            <a
              href={profile.website}
              className="font-semibold text-slate-blue hover:text-slate-blue-light"
            >
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        ) : null}
        {profile.primary_email ? (
          <div>
            <span className="text-charcoal-soft">Contact · </span>
            <a
              href={`mailto:${profile.primary_email}`}
              className="font-semibold text-slate-blue hover:text-slate-blue-light"
            >
              {profile.primary_email}
            </a>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ProfileTextSection({
  title,
  body,
}: {
  title: string;
  body: string | null;
}) {
  if (!body) return null;
  return (
    <Card>
      <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] text-charcoal leading-[1.65]">{body}</p>
    </Card>
  );
}

function ProfileFoundersCard({
  founders,
}: {
  founders: Array<{ name: string; title: string; focus: string }>;
}) {
  if (!founders || founders.length === 0) return null;
  return (
    <Card>
      <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
        Founders
      </h2>
      <ul className="mt-4 space-y-4">
        {founders.map((f) => (
          <li
            key={f.name}
            className="border-l-2 border-slate-blue/30 pl-4"
          >
            <div className="font-display text-[16px] font-semibold text-charcoal">
              {f.name}
            </div>
            <div className="text-[12px] text-slate-blue font-semibold uppercase tracking-[0.06em] mt-0.5">
              {f.title}
            </div>
            <p className="mt-1.5 text-[13px] text-charcoal-soft leading-relaxed">
              {f.focus}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProfileMatchingCard({ profile }: { profile: OrgProfileRow }) {
  return (
    <Card>
      <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
        Matching parameters
      </h2>
      <p className="mt-1.5 text-[13px] text-charcoal-soft">
        Hard-ish bounds the matcher uses to flag (not hide) opportunities.
      </p>
      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-cream-shadow text-[14px]">
        <Row label="Geography focus">
          {profile.geography_focus.length === 0
            ? "—"
            : profile.geography_focus.join(" · ")}
        </Row>
        <Row label="Ask size">
          {fmtUsd(profile.ask_size_min_usd)} —{" "}
          {profile.ask_size_max_usd == null
            ? "no ceiling"
            : fmtUsd(profile.ask_size_max_usd)}
        </Row>
        <Row label="Service lines (ACRE)">
          <ul className="space-y-0.5">
            {profile.service_lines.map((s) => (
              <li key={s}>{SERVICE_LINE_LABEL[s] ?? s}</li>
            ))}
          </ul>
        </Row>
        <Row label="Revenue streams">
          {profile.revenue_streams.length === 0
            ? "—"
            : profile.revenue_streams.map(prettify).join(" · ")}
        </Row>
      </dl>
    </Card>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft mb-1">
        {label}
      </dt>
      <dd className="text-charcoal">{children}</dd>
    </div>
  );
}

function ProfileTagsCard({
  title,
  subtitle,
  tags,
}: {
  title: string;
  subtitle: string;
  tags: string[];
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <Card>
      <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
        {title}
      </h2>
      <p className="mt-1.5 text-[13px] text-charcoal-soft">{subtitle}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <li
            key={t}
            className="inline-block rounded-full bg-cream-deep border border-cream-shadow px-3 py-1 text-[12px] text-charcoal-soft"
          >
            {prettify(t)}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProfileRelationshipsCard({
  relationships,
}: {
  relationships: RelationshipRow[];
}) {
  if (!relationships || relationships.length === 0) {
    return (
      <Card>
        <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
          Partner relationships
        </h2>
        <p className="mt-3 text-[13px] text-charcoal-soft italic">
          None on file. Add via the onboarding form (coming next slice).
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="font-display text-[15px] font-semibold text-charcoal uppercase tracking-[0.1em]">
        Partner relationships
      </h2>
      <p className="mt-1.5 text-[13px] text-charcoal-soft">
        Co-applicants, sponsors, and warm-intro paths. The anchor nodes for
        the foundation graph the matcher will traverse.
      </p>
      <ul className="mt-4 divide-y divide-cream-shadow">
        {relationships.map((r) => (
          <li key={r.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-[16px] font-semibold text-charcoal">
                {r.partner_name}
                {r.state ? (
                  <span className="ml-2 text-[12px] text-charcoal-soft font-normal">
                    {r.state}
                  </span>
                ) : null}
              </h3>
              <span
                className={
                  "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] " +
                  (STATUS_BADGE[r.status] ?? "bg-cream-shadow text-charcoal-soft")
                }
              >
                {r.status}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-blue font-semibold uppercase tracking-[0.06em]">
              {RELATIONSHIP_KIND_LABEL[r.relationship_kind] ??
                r.relationship_kind}
              {" · "}
              {prettify(r.partner_type)}
            </p>
            {r.notes ? (
              <p className="mt-2 text-[13px] text-charcoal-soft leading-relaxed">
                {r.notes}
              </p>
            ) : null}
            {r.mission_tags && r.mission_tags.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {r.mission_tags.map((t) => (
                  <li
                    key={t}
                    className="inline-block rounded-full bg-cream-deep px-2 py-0.5 text-[11px] text-charcoal-soft"
                  >
                    {prettify(t)}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
