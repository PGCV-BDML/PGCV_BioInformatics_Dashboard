"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  formatAnalysisYearLabel,
  MISSING_CLIENT_ID_LABEL,
} from "@/lib/analysis-dashboard-stats";
import { routes } from "@/lib/routes";

export interface AnalysisClientIdChartProps {
  data: { name: string; value: number }[];
  /** Raw year value (`all` or `YYYY`). */
  selectedYear: string;
}

const BAR_COLORS = ["#2a7797", "#4ec2bb", "#91247b", "#f59e0b", "#6366f1"];

export function AnalysisClientIdChart({
  data,
  selectedYear,
}: AnalysisClientIdChartProps) {
  const router = useRouter();
  const chartHeight = Math.max(280, data.length * 36);
  const yearLabel = formatAnalysisYearLabel(selectedYear);
  const trackerUrl =
    selectedYear && selectedYear !== "all"
      ? `${routes.services.tracker}?year=${selectedYear}`
      : routes.services.tracker;
  const uniqueClients = data.filter(
    (row) => row.name !== MISSING_CLIENT_ID_LABEL,
  ).length;
  const totalReports = data.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 font-quicksand gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[#2a7797]">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Service Reports by Client ID ({yearLabel})
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-aileron pl-6">
            Generated reports grouped by unique Client ID
          </p>
        </div>

        <Link
          href={trackerUrl}
          className="flex items-center gap-1.5 self-start text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)]"
        >
          <span>Open Tracker</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400 font-aileron">
          No service reports generated for {yearLabel}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-quicksand">
                Unique Client IDs
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-800 font-aileron">
                {uniqueClients}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(42,119,151,0.22)] bg-[#e6f4f8]/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2a7797] font-quicksand">
                Reports counted
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-[#174e64] font-aileron">
                {totalReports}
              </p>
            </div>
          </div>

          <div
            className="w-full overflow-y-auto"
            style={{ maxHeight: 520 }}
          >
            <div style={{ height: chartHeight, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    className="text-xs fill-slate-400 font-quicksand"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    className="text-[11px] fill-slate-500 font-quicksand"
                    tick={{ fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  />
                  <Tooltip
                    wrapperStyle={{
                      fontFamily: "Aileron, sans-serif",
                      zIndex: 50,
                    }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "8px 12px",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                    }}
                    formatter={(value) => [
                      `${Number(value ?? 0)} ${Number(value ?? 0) === 1 ? "report" : "reports"}`,
                      "Generated",
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                    cursor="pointer"
                    onClick={(entry) => {
                      const name = (entry as { name?: string })?.name;
                      if (!name || name === MISSING_CLIENT_ID_LABEL) return;
                      router.push(
                        routes.services.trackerByClientId(name, selectedYear),
                      );
                    }}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`client-id-cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      offset={8}
                      className="fill-slate-600 text-[11px] font-bold"
                      formatter={(value) =>
                        Number(value) > 0 ? String(value) : ""
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 font-quicksand">
            Click a Client ID to open the tracker filtered to that ID.
          </p>
        </>
      )}
    </div>
  );
}
