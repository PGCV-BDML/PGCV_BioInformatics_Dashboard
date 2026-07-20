"use client";

import { BarChart3 } from "lucide-react";
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

export interface ServiceReportsChartProps {
  data: { year: string; Delivered: number }[];
  selectedYear: string;
}

export function ServiceReportsChart({
  data,
  selectedYear,
}: ServiceReportsChartProps) {
  return (
    <div className="md:col-span-2 bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
      <div className="flex items-center gap-2 text-[#2a7797] mb-6 font-quicksand">
        <BarChart3 className="w-4 h-4" />
        <h3 className="text-xs font-extrabold uppercase tracking-wider">
          Service Reports Delivered by Year
        </h3>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              className="text-xs font-bold fill-slate-400 font-quicksand"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs fill-slate-400 font-quicksand"
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
              itemStyle={{
                fontSize: "12px",
                fontWeight: "500",
                fontFamily: "Aileron, sans-serif",
              }}
              labelStyle={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#64748b",
                marginBottom: "2px",
                fontFamily: "Aileron, sans-serif",
              }}
            />
            <Bar dataKey="Delivered" radius={[6, 6, 0, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.year === selectedYear ? "#2a7797" : "#91247b"}
                  opacity={entry.year === selectedYear ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
