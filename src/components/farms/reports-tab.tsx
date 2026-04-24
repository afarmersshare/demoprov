"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Download, ExternalLink } from "lucide-react";
import type {
  Farm,
  Market,
  Distributor,
  Processor,
  RecoveryNode,
  Enabler,
  FarmCrop,
  ImpactDoc,
  Region,
  ComplianceInfo,
} from "./network-explorer";
import { downloadCsv } from "@/lib/csv";
import { REPORT_REGISTRY, type ReportSlug } from "@/lib/reports/registry";
import {
  regionalSupplyCsv,
  foodRecoveryCsv,
  procurementReadinessCsv,
  regenCertAuditCsv,
  gapAnalysisCsv,
  fullDatasetCsv,
  COUNTY_DEMAND_INDICATOR,
} from "@/lib/reports/csv-generators";

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  farmCrops: FarmCrop[];
  impactDocs: ImpactDoc[];
  regions: Region[];
  complianceByFarm: Map<string, ComplianceInfo>;
};

export function ReportsTab({
  farms,
  markets,
  distributors,
  processors,
  recoveryNodes,
  enablers,
  farmCrops,
  impactDocs,
  regions,
  complianceByFarm,
}: Props) {
  const generators = useMemo(
    () => ({
      "regional-supply": () =>
        regionalSupplyCsv({
          farms,
          farmCrops,
          compliance: complianceByFarm,
        }),
      "food-recovery": () => foodRecoveryCsv({ recoveryNodes }),
      "procurement-readiness": () =>
        procurementReadinessCsv({
          farms,
          farmCrops,
          compliance: complianceByFarm,
        }),
      "regen-cert-audit": () => regenCertAuditCsv({ farms, impactDocs }),
      "gap-analysis": () =>
        gapAnalysisCsv({
          farms,
          regions,
          countyDemand: COUNTY_DEMAND_INDICATOR,
        }),
      "full-dataset": () =>
        fullDatasetCsv({
          farms,
          markets,
          distributors,
          processors,
          recoveryNodes,
          enablers,
        }),
    }),
    [
      farms,
      markets,
      distributors,
      processors,
      recoveryNodes,
      enablers,
      farmCrops,
      impactDocs,
      regions,
      complianceByFarm,
    ],
  );

  const handleDownload = (slug: ReportSlug) => {
    const g = generators[slug];
    if (!g) return;
    const { filename, csv } = g();
    downloadCsv(filename, csv);
  };

  const counts = {
    farms: farms.length,
    buyers:
      markets.length + distributors.length + processors.length,
    recovery: recoveryNodes.length,
    enablers: enablers.length,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
              Reports
            </div>
            <div className="font-display text-[22px] font-semibold text-slate-blue leading-tight">
              Generate &amp; export
            </div>
          </div>
          <div className="text-[11px] text-charcoal-soft/70 italic">
            Louisville–Kentuckiana demo dataset · {counts.farms} farms ·{" "}
            {counts.buyers} buyers · {counts.recovery} recovery ·{" "}
            {counts.enablers} enablers
          </div>
        </div>
        <p className="text-sm text-charcoal-soft leading-relaxed max-w-prose">
          Data exports download as CSV — ready for grant reporting, pipeline
          review, or integration with existing systems. Narrative reports open
          as printable pages in a new tab; use your browser&apos;s print
          dialog (Ctrl+P / Cmd+P) to save as PDF or share the URL directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORT_REGISTRY.map((report) => (
          <div
            key={report.slug}
            className="rounded-[14px] border border-cream-shadow bg-white p-6 shadow-sm flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-[8px] bg-slate-blue/10 flex items-center justify-center text-slate-blue">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[16px] font-semibold text-charcoal leading-snug">
                  {report.name}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal-soft/70">
                  {report.primaryPersona === "any"
                    ? "General"
                    : `For ${report.primaryPersona}s`}
                </div>
              </div>
            </div>

            <p className="text-[13px] text-charcoal-soft leading-relaxed mb-5 flex-grow">
              {report.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-auto">
              <button
                type="button"
                onClick={() => handleDownload(report.slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-blue text-cream px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-slate-blue-light transition-colors"
              >
                <Download className="w-3 h-3" />
                Download CSV
              </button>
              {report.hasNarrative ? (
                <Link
                  href={`/reports/${report.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-shadow text-charcoal px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-cream/50 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open narrative
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-charcoal-soft/70 italic text-center pt-2">
        All exports reflect the current filter state. Demo dataset —
        Louisville–Kentuckiana.
      </div>
    </div>
  );
}
