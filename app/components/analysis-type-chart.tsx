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
} from "recharts";

export interface AnalysisTypeChartProps {
  data: { name: string; value: number }[];
  selectedYear: string;
  trackerHref: (pipeline: string) => string;
}

const BAR_COLORS = ["#2a7797", "#4ec2bb", "#91247b", "#f59e0b", "#6366f1"];

export function AnalysisTypeChart({
  data,
  selectedYear,
  trackerHref,
}: AnalysisTypeChartProps) {
  const router = useRouter();
  const chartHeight = Math.max(280, data.length * 36);

  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
      <div className="flex items-center justify-between mb-6 font-quicksand gap-3">
        <div className="flex items-center gap-2 text-[#2a7797]">
          <BarChart3 className="w-4 h-4" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider">
            Analyses by Type ({selectedYear})
          </h3>
        </div>
        <Link
          href={`/dashboard/services/tracker?year=${selectedYear}`}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)]"
        >
          <span>Open Tracker</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400 font-aileron">
          No analyses for {selectedYear}
        </div>
      ) : (
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
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
                width={140}
                axisLine={false}
                tickLine={false}
                className="text-[11px] fill-slate-500 font-quicksand"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                wrapperStyle={{ fontFamily: "Aileron, sans-serif", zIndex: 50 }}
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "8px 12px",
                  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                }}
                formatter={(value) => [value ?? 0, "Analyses"]}
              />
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                barSize={18}
                cursor="pointer"
                onClick={(entry) => {
                  const name = (entry as { name?: string })?.name;
                  if (name) router.push(trackerHref(name));
                }}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`type-cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.length > 0 ? (
        <p className="mt-3 text-[11px] text-slate-400 font-quicksand">
          Click a bar to open the tracker filtered by that analysis type.
        </p>
      ) : null}
    </div>
  );
}
