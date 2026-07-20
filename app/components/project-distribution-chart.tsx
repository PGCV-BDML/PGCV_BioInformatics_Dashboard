"use client";

import Link from "next/link";
import { PieChart as PieIcon, ExternalLink } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#4ec2bb", "#2a7797", "#f59e0b", "#6366f1", "#94a3b8"];

export interface ProjectDistributionChartProps {
  data: { name: string; value: number }[];
  selectedYear: string;
  totalProjects: number;
}

export function ProjectDistributionChart({
  data,
  selectedYear,
  totalProjects,
}: ProjectDistributionChartProps) {
  return (
    <div className="md:col-span-2 bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 font-quicksand">
          <div className="flex items-center gap-2 text-[#2a7797]">
            <PieIcon className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Project Distribution ({selectedYear})
            </h3>
          </div>

          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)] font-quicksand"
          >
            <span>View Projects Page</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center my-auto py-2">
          <div className="w-full h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{
                    fontFamily: "Aileron, sans-serif",
                    zIndex: 50,
                  }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="block text-xl font-black text-slate-800 tracking-tight font-aileron">
                {totalProjects}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-quicksand">
                Total
              </span>
            </div>
          </div>

          <div className="space-y-2.5 font-aileron">
            {data.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                    }}
                  />
                  <span className="text-slate-500 font-semibold text-xs">
                    {entry.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
