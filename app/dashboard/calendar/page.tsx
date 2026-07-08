"use client";

import { useState } from "react";

export default function ServicesPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
            Calendar
          </h1>
        </div>

        <div className="p-8 text-center text-slate-400 font-medium text-xs">
          Calendar tracking module data table renders here.
        </div>
      </div>
    </div>
  );
}
