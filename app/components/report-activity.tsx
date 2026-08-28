"use client";

import { History } from "lucide-react";
import { analysisStatusEventLabel } from "@/lib/analysis-tracker";
import type { AnalysisStatusEvent } from "@/types/database";
import { renderSectionLabel } from "./slidemodal";

export function ReportActivityList({
  events,
  loading = false,
  userNames,
}: {
  events: AnalysisStatusEvent[];
  loading?: boolean;
  userNames: Record<string, string>;
}) {
  if (loading) {
    return (
      <p className="text-[11px] text-slate-400 ml-1 font-aileron">
        Loading activity…
      </p>
    );
  }
  if (events.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 ml-1 font-aileron">
        No status history yet.
      </p>
    );
  }
  return (
    <ol className="space-y-2 ml-1">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
        >
          <p className="text-[11px] font-semibold text-slate-700 font-aileron leading-relaxed">
            {analysisStatusEventLabel(
              event,
              event.changed_by ? userNames[event.changed_by] : null,
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Slide-over section, matching incident Case activity. */
export function ReportActivitySection({
  events,
  loading = false,
  userNames,
}: {
  events: AnalysisStatusEvent[];
  loading?: boolean;
  userNames: Record<string, string>;
}) {
  return (
    <div className="space-y-2.5 pt-1 border-t border-slate-100">
      {renderSectionLabel(<History className="w-3.5 h-3.5" />, "Report activity")}
      <ReportActivityList
        events={events}
        loading={loading}
        userNames={userNames}
      />
    </div>
  );
}
