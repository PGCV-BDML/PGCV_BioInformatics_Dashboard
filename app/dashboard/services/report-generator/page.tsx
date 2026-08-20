"use client";

import { FileOutput } from "lucide-react";
import { PageHeader } from "../../../components/pageheader";
import { ServiceReportGeneratorGrid } from "../../../components/service-report-generator-grid";
import { serviceReportGeneratorBreadcrumbs } from "@/lib/breadcrumbs";

export default function ServiceReportGeneratorPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 font-aileron">
      <PageHeader
        breadcrumbTrail={serviceReportGeneratorBreadcrumbs}
        title="Service Report Generator"
        subtitle="Shortcut cards for the analysis report generators — open a tool by URL or lab IP"
      />

      <section className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileOutput className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">Generators</h2>
          </div>
          <p className="hidden sm:block max-w-sm text-right text-[11px] leading-relaxed text-slate-400 font-medium">
            Each card opens its generator in a new tab. Cards without a link stay
            inactive until an address is attached.
          </p>
        </div>

        <ServiceReportGeneratorGrid />
      </section>
    </div>
  );
}
