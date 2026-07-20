"use client";

import Link from "next/link";
import {
  CheckSquare,
  ExternalLink,
  FolderGit2,
  Calendar,
  CheckCircle2,
  Circle,
} from "lucide-react";

export interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  linkedProject: string;
  dueDate: Date | null;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
}

export interface WeeklyTaskListProps {
  tasks: WeeklyTask[];
  tasksLoading: boolean;
  tasksError: string | null;
  onToggleTask: (id: string, e: React.MouseEvent) => void;
}

const priorityConfig = {
  high: {
    bar: "bg-red-500",
    text: "text-red-600",
    tagBg: "bg-red-50 border-red-200/60",
    tagText: "text-red-700",
  },
  medium: {
    bar: "bg-amber-500",
    text: "text-amber-600",
    tagBg: "bg-amber-50 border-amber-200/60",
    tagText: "text-amber-700",
  },
  low: {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    tagBg: "bg-emerald-50 border-emerald-200/60",
    tagText: "text-emerald-700",
  },
};

export function WeeklyTaskList({
  tasks,
  tasksLoading,
  tasksError,
  onToggleTask,
}: WeeklyTaskListProps) {
  return (
    <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] xl:row-span-2">
      <div className="flex items-center justify-between mb-6 font-quicksand">
        <div className="flex items-center gap-2 text-[#2a7797]">
          <CheckSquare className="w-4 h-4" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider">
            Tasks for the Week
          </h3>
        </div>

        <Link
          href="/dashboard/tasks"
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)] font-quicksand"
        >
          <span>View Tasks Page</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* List showing Details */}
      <div className="space-y-3.5">
        {tasksLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[68px] rounded-2xl bg-slate-100/70 border border-slate-200 animate-pulse"
              />
            ))}
          </>
        )}

        {!tasksLoading && tasksError && (
          <div className="text-xs font-semibold text-red-500 p-4">
            {tasksError}
          </div>
        )}

        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <div className="text-xs font-semibold text-slate-400 p-4">
            No tasks due this week. 🎉
          </div>
        )}

        {!tasksLoading &&
          !tasksError &&
          tasks.map((task) => {
            const isCompleted = task.status === "completed";
            const currentPriority =
              priorityConfig[task.priority] || priorityConfig.low;

            return (
              <Link
                key={task.id}
                href={`/dashboard/tasks?search=${encodeURIComponent(task.title)}`}
                className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 cursor-pointer select-none group font-aileron ${isCompleted
                  ? "bg-slate-100/70 border-slate-200 opacity-60 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                  : "bg-[#fffdf8] border-slate-300 shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] hover:-translate-y-0.5"
                  }`}
              >
                {/* Left Area */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={(e) => onToggleTask(task.id, e)}
                    className="shrink-0 mt-1 cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-95 focus:outline-none"
                    title={
                      isCompleted ? "Mark as pending" : "Mark as completed"
                    }
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    )}
                  </button>

                  <div
                    className={`w-1 rounded-full shrink-0 min-h-[44px] ${isCompleted ? "bg-slate-300" : currentPriority.bar
                      }`}
                  />

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span
                      className={`text-sm font-bold tracking-tight ${isCompleted
                        ? "line-through text-slate-400"
                        : "text-slate-800"
                        }`}
                    >
                      {task.title}
                    </span>

                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold font-aileron ${isCompleted
                        ? "text-slate-400"
                        : "text-[#2a7797] hover:underline"
                        }`}
                    >
                      <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{task.linkedProject}</span>
                    </div>
                  </div>
                </div>

                {/* Right Area */}
                <div className="shrink-0 self-end md:self-center">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border font-quicksand ${isCompleted
                      ? "bg-slate-200 text-slate-500 border-slate-300"
                      : `${currentPriority.tagBg} ${currentPriority.tagText}`
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {task.dueDate
                        ? `Due: ${task.dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                        : "No due date"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
