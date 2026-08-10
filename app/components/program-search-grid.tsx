"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  User,
  Users,
  Building2,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { programRoutes } from "@/lib/routes";
import type {
  TrainingProgramStatus,
  TrainingType,
} from "@/types/database";
import { TRAINING_PROGRAM_STATUS_OPTIONS } from "@/types/database";

export interface ProgramCard {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  requesting_institution: string;
  start_date: string;
  end_date: string;
  participant_count: number;
  status: TrainingProgramStatus;
}

type StatusFilter = "active" | TrainingProgramStatus | "all";

const FILTER_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  ...TRAINING_PROGRAM_STATUS_OPTIONS.map((o) => ({
    value: o.value as StatusFilter,
    label: o.label,
  })),
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<
  TrainingProgramStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  ongoing: {
    label: "On-going",
    className: "bg-teal-50 text-teal-700 border-teal-100",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  archived: {
    label: "Archived",
    className: "bg-amber-50 text-amber-800 border-amber-100",
  },
};

interface ProgramSearchGridProps {
  programs: ProgramCard[];
  type: TrainingType;
  canManage?: boolean;
  onEdit?: (program: ProgramCard) => void;
  onMarkDone?: (program: ProgramCard) => void;
  onArchive?: (program: ProgramCard) => void;
  onRestore?: (program: ProgramCard) => void;
  onDelete?: (program: ProgramCard) => void;
}

function ProgramCardMenu({
  prog,
  onEdit,
  onMarkDone,
  onArchive,
  onRestore,
  onDelete,
}: {
  prog: ProgramCard;
  onEdit?: (program: ProgramCard) => void;
  onMarkDone?: (program: ProgramCard) => void;
  onArchive?: (program: ProgramCard) => void;
  onRestore?: (program: ProgramCard) => void;
  onDelete?: (program: ProgramCard) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const items = [
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      show: true,
      onClick: () => onEdit?.(prog),
    },
    {
      key: "done",
      label: "Mark as done",
      icon: CheckCircle2,
      show: prog.status !== "completed" && prog.status !== "archived",
      onClick: () => onMarkDone?.(prog),
    },
    {
      key: "archive",
      label: "Archive",
      icon: Archive,
      show: prog.status !== "archived",
      onClick: () => onArchive?.(prog),
    },
    {
      key: "restore",
      label: "Restore",
      icon: RotateCcw,
      show: prog.status === "archived",
      onClick: () => onRestore?.(prog),
    },
    {
      key: "delete",
      label: "Delete permanently",
      icon: Trash2,
      show: Boolean(onDelete),
      destructive: true,
      onClick: () => onDelete?.(prog),
    },
  ].filter((item) => item.show);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Program actions"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${
                  "destructive" in item && item.destructive
                    ? "text-red-600"
                    : "text-slate-700"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    "destructive" in item && item.destructive
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProgramSearchGrid({
  programs,
  type,
  canManage = false,
  onEdit,
  onMarkDone,
  onArchive,
  onRestore,
  onDelete,
}: ProgramSearchGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const filteredPrograms = useMemo(() => {
    let list = programs;

    if (statusFilter === "active") {
      list = list.filter((p) => p.status !== "archived");
    } else if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (prog) =>
        prog.title.toLowerCase().includes(q) ||
        prog.description.toLowerCase().includes(q) ||
        prog.instructor_name.toLowerCase().includes(q) ||
        prog.requesting_institution.toLowerCase().includes(q),
    );
  }, [programs, searchQuery, statusFilter]);

  const isTraining = type === "training";
  const typeLabel = isTraining ? "Training" : "Internship";
  const roleLabel = isTraining ? "Instructor:" : "Mentor:";
  const participantLabel = isTraining ? "Active Enrolled" : "Active Interns";
  const subtitle = isTraining
    ? "Select a training program sequence to manage documents, syllabus and grading records."
    : "Select an internship program sequence to manage documents, syllabus and grading records.";
  const searchPlaceholder = isTraining
    ? "Search programs or trainers..."
    : "Search programs or mentors...";
  const emptyMessage = isTraining
    ? "No training programs match your search criteria."
    : "No internship programs match your search criteria.";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold text-slate-800">
            Cohorts Directory
          </h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const isActive = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={`h-8 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                isActive
                  ? "bg-[#2a7797] text-white border-[#2a7797]"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPrograms.map((prog) => {
          const badge = STATUS_BADGE[prog.status];
          return (
            <div
              key={prog.id}
              className="flex flex-col justify-between bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-200 relative group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-[#f57f17] uppercase tracking-[1.5px] font-quicksand bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                      {typeLabel}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-[1px] border px-2 py-0.5 rounded-md ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-300" />
                      <span>
                        {prog.participant_count} {participantLabel}
                      </span>
                    </div>
                    {canManage && (
                      <ProgramCardMenu
                        prog={prog}
                        onEdit={onEdit}
                        onMarkDone={onMarkDone}
                        onArchive={onArchive}
                        onRestore={onRestore}
                        onDelete={onDelete}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-[#2a7797] transition-colors">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {prog.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {roleLabel}{" "}
                      <strong className="text-slate-700 font-bold">
                        {prog.instructor_name}
                      </strong>
                    </span>
                  </div>
                  {prog.requesting_institution && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Requesting Institution:{" "}
                        <strong className="text-slate-700 font-bold">
                          {prog.requesting_institution}
                        </strong>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Timeline:{" "}
                      <strong className="text-slate-700 font-bold">
                        {prog.start_date || "—"} to {prog.end_date || "—"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  href={programRoutes(type).detail(prog.id)}
                  className="flex items-center justify-center gap-1.5 w-full h-10 bg-[#f0fdfa] border border-[#ccfbf1] text-[#115e59] hover:bg-[#14b8a6] hover:border-[#14b8a6] hover:text-white text-xs font-bold rounded-xl shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <span>See Details</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredPrograms.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white border border-slate-200 rounded-[24px]">
            <p className="text-sm text-slate-400 font-medium">{emptyMessage}</p>
          </div>
        )}
      </div>
    </>
  );
}
