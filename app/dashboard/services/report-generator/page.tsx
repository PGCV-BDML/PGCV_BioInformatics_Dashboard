"use client";

import { PageHeader } from "../../../components/pageheader";
import { ServiceReportGeneratorGrid } from "../../../components/service-report-generator-grid";
import { serviceReportGeneratorBreadcrumbs } from "@/lib/breadcrumbs";

export default function ServiceReportGeneratorPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 font-aileron">
      <PageHeader
        breadcrumbTrail={serviceReportGeneratorBreadcrumbs}
        title="Service Report Generator"
        subtitle="Shortcut cards for the analysis report generators — staff can edit the lab IP here when it changes"
      />

      <section className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <ServiceReportGeneratorGrid />
      </section>
    </div>
  );
}
