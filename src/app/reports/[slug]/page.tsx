import { notFound } from "next/navigation";
import Link from "next/link";
import { RegionalSupplyReport } from "@/components/reports/regional-supply-report";
import { GapAnalysisReport } from "@/components/reports/gap-analysis-report";
import { ReportShell, ReportSection } from "@/components/reports/report-shell";
import { getReport, type ReportSlug } from "@/lib/reports/registry";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) return { title: "Report not found" };
  return {
    title: `${report.name} · Provender`,
    description: report.description,
  };
}

const NARRATIVE_REPORTS: Record<ReportSlug, React.ComponentType | null> = {
  "regional-supply": RegionalSupplyReport,
  "gap-analysis": GapAnalysisReport,
  "food-recovery": null,
  "procurement-readiness": null,
  "regen-cert-audit": null,
  "full-dataset": null,
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();

  const Component = NARRATIVE_REPORTS[report.slug];
  if (Component) {
    return <Component />;
  }

  return (
    <ReportShell
      title={report.name}
      subtitle="The narrative version of this report is in development. The CSV export is available from the Reports tab of the demo."
    >
      <ReportSection title="Available now">
        <p className="text-[14px] text-charcoal-soft leading-relaxed">
          This report currently ships as a CSV export only. Open the demo,
          navigate to the <b className="text-charcoal">Reports</b> tab, and
          click{" "}
          <span className="rounded bg-moss/10 px-1.5 py-0.5 font-mono text-[12px] text-moss">
            Download CSV
          </span>{" "}
          on the {report.name} card to download the current data.
        </p>
      </ReportSection>

      <ReportSection title="What the narrative version will include">
        <p className="text-[14px] text-charcoal-soft leading-relaxed">
          {report.description}
        </p>
        <p className="mt-3 text-[14px] text-charcoal-soft leading-relaxed">
          The narrative report will layer written analysis over the underlying
          data — scoped to the current region, with charts, methodology notes,
          and citations. Estimated delivery: after the remaining Tier 1 tools
          land.
        </p>
      </ReportSection>

      <ReportSection title="Next steps">
        <p className="text-[14px] text-charcoal-soft leading-relaxed">
          <Link href="/" className="underline text-moss font-semibold">
            Return to the demo
          </Link>{" "}
          and open the Reports tab to download the current CSV, or contact{" "}
          <a
            href="mailto:hello@afarmersshare.com"
            className="underline text-moss font-semibold"
          >
            hello@afarmersshare.com
          </a>{" "}
          to request a custom narrative report for your region.
        </p>
      </ReportSection>
    </ReportShell>
  );
}
