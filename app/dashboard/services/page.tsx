"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ExternalLink } from "lucide-react";
import { DashboardBreadcrumbs } from "../../components/dashboardbreadcrumbs";
import { AnalysisDashboardStatCards } from "../../components/analysis-dashboard-stat-cards";
import { AnalysisTypeChart } from "../../components/analysis-type-chart";
import { AnalysisStatusChart } from "../../components/analysis-status-chart";
import { ErrorState, LoadingState } from "../../components/state-views";
import { getRowsFromDB } from "@/lib/supabase";
import {
  formatAnalysisYearLabel,
  getAnalysisDashboardStats,
  getAnalysesByStatus,
  getAnalysesByType,
  getAvailableAnalysisYears,
  type AnalysisDashboardRow,
} from "@/lib/analysis-dashboard-stats";
import { servicesDashboardBreadcrumbs } from "@/lib/breadcrumbs";
import type { Analysis } from "@/types/database";

const ALL_TIME = "all";

export default function ServicesDashboardPage() {
  const [rows, setRows] = useState<AnalysisDashboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(ALL_TIME);
  const [typeChartYear, setTypeChartYear] = useState<string>(ALL_TIME);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const analyses = await getRowsFromDB<Analysis>("analysis");
        if (cancelled) return;

        const mapped: AnalysisDashboardRow[] = analyses.map((a) => ({
          service_report_date: a.service_report_date,
          service_report_number: a.service_report_number,
          service_report_link: a.service_report_link,
          pipeline: a.pipeline,
          application: a.application,
          status: a.status,
          started_at: a.started_at,
          client_name: a.client_name,
        }));

        setRows(mapped);
        setSelectedYear((prev) => {
          if (prev === ALL_TIME) return ALL_TIME;
          const years = getAvailableAnalysisYears(mapped);
          return years.includes(prev) ? prev : ALL_TIME;
        });
      } catch (err) {
        console.error("Failed to load analysis dashboard:", err);
        if (!cancelled) {
          setLoadError("Couldn't load sequence analysis dashboard data.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep type-chart year in sync when the page-level year changes.
  useEffect(() => {
    setTypeChartYear(selectedYear);
  }, [selectedYear]);

  const availableYears = useMemo(
    () => getAvailableAnalysisYears(rows),
    [rows],
  );

  const yearLabel = formatAnalysisYearLabel(selectedYear);

  const stats = useMemo(
    () => getAnalysisDashboardStats(rows, selectedYear || ALL_TIME),
    [rows, selectedYear],
  );

  const byType = useMemo(
    () => getAnalysesByType(rows, typeChartYear || ALL_TIME),
    [rows, typeChartYear],
  );

  const byStatus = useMemo(
    () => getAnalysesByStatus(rows, selectedYear || ALL_TIME),
    [rows, selectedYear],
  );

  const trackerHrefForPipeline = (pipeline: string) => {
    const params = new URLSearchParams();
    if (typeChartYear && typeChartYear !== ALL_TIME) {
      params.set("year", typeChartYear);
    }
    if (pipeline && pipeline !== "—") params.set("pipeline", pipeline);
    const qs = params.toString();
    return `/dashboard/services/tracker${qs ? `?${qs}` : ""}`;
  };

  const trackerHref =
    selectedYear && selectedYear !== ALL_TIME
      ? `/dashboard/services/tracker?year=${selectedYear}`
      : "/dashboard/services/tracker";

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          <div className="opacity-95 text-xs tracking-wide">
            <DashboardBreadcrumbs items={servicesDashboardBreadcrumbs} />
          </div>
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Sequence Analysis Dashboard
          </h1>
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Sequence Analysis · Volume, types, and service reports by year
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start sm:self-auto mb-1">
          <Link
            href={trackerHref}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            Service Report Tracker
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="relative group">
            <div className="flex items-center gap-2 bg-surface group-hover:bg-slate-50 transition-colors duration-150 border border-slate-300 rounded-xl px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-left pointer-events-none min-h-10">
              <Calendar className="w-3.5 h-3.5 text-[#2a7797]" />
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-quicksand select-none">
                Year:
              </span>
              <span className="text-xs font-bold text-[#174e64] font-quicksand">
                {yearLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#174e64] ml-1" />
            </div>
            <select
              id="analysis-year-select"
              aria-label="Filter analyses by year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-bold text-xs font-quicksand"
            >
              <option value={ALL_TIME}>All time</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadError ? (
        <ErrorState message={loadError} />
      ) : isLoading ? (
        <LoadingState message="Loading sequence analysis metrics…" />
      ) : (
        <>
          <AnalysisDashboardStatCards
            stats={stats}
            isLoading={isLoading}
            selectedYear={yearLabel}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnalysisTypeChart
              data={byType}
              selectedYear={typeChartYear}
              availableYears={availableYears}
              onYearChange={setTypeChartYear}
              trackerHref={trackerHrefForPipeline}
            />
            <AnalysisStatusChart
              data={byStatus}
              selectedYear={selectedYear}
              total={stats.total}
            />
          </div>
        </>
      )}
    </div>
  );
}
