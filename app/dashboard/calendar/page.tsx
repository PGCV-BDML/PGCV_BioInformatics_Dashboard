"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import TaskCalendar from "../../components/task-calendar";
import { calendarBreadcrumbs } from "@/lib/breadcrumbs";

export default function CalendarPage() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={calendarBreadcrumbs}
        title="Calendar"
        subtitle="Your Google Calendar (private to you), plus lab task dates, team leave/travel, and Philippine holidays."
        actions={
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#2a7797] hover:bg-[#236584] text-white text-xs font-bold rounded-xl shadow-sm transition-colors font-quicksand"
          >
            Manage Tasks
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <TaskCalendar />
    </div>
  );
}
