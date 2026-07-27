"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  User,
  Clock,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Award,
  FileText,
  Users,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import type { ProgramType } from "@/lib/routes";
import { programRoutes } from "@/lib/routes";

export interface ProgramWorkspaceData {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  duration?: string;
  leaderName: string;
}

interface ProgramWorkspaceLayoutProps {
  programType: ProgramType;
  program: ProgramWorkspaceData | null;
  children: React.ReactNode;
}

export default function ProgramWorkspaceLayout({
  programType,
  program,
  children,
}: ProgramWorkspaceLayoutProps) {
  const pathname = usePathname();
  const routes = programRoutes(programType);
  const isTraining = programType === "training";
  const moduleTitle = isTraining ? "Training" : "Internship";
  const leaderLabel = isTraining ? "Instructor" : "Mentor";
  const brandLabel = isTraining
    ? "Philippine Genome Center Visayas - Bioinformatics Training Program"
    : "Philippine Genome Center Visayas - Bioinformatics Internship Program";

  const workspaceTabs = useMemo(() => {
    if (!program) return [];
    const base = routes.detail(program.id);
    return [
      { id: "modules", label: "Modules", icon: BookOpen, href: base },
      {
        id: "onboarding",
        label: "Onboarding Docs",
        icon: FileText,
        href: routes.onboarding(program.id),
      },
      {
        id: "participants",
        label: "Participants",
        icon: Users,
        href: routes.participants(program.id),
      },
      {
        id: "assessment",
        label: "Pre/Post Tests",
        icon: ClipboardCheck,
        href: routes.assessment(program.id),
      },
      {
        id: "evaluation",
        label: "Evaluation",
        icon: BarChart3,
        href: routes.evaluation(program.id),
      },
      {
        id: "certificate",
        label: "Certificate",
        icon: Award,
        href: routes.certificate(program.id),
      },
    ];
  }, [program, routes]);

  const activeIndex = useMemo(() => {
    const index = workspaceTabs.findIndex((tab) => pathname === tab.href);
    return index !== -1 ? index : 0;
  }, [pathname, workspaceTabs]);

  if (!program) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">
          Program Core Record Not Found
        </h2>
        <Link
          href={routes.list}
          className="inline-flex items-center gap-2 bg-[#2a7797] text-white text-xs font-bold px-5 py-2.5 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Programs Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto font-aileron w-full max-w-[1240px] px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Program Details Workspace
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            {moduleTitle}
          </h1>
        </div>

        <Link
          href={routes.list}
          className="group flex items-center gap-2 h-10 px-5 bg-surface hover:bg-[#4ec2bb] border border-slate-300 hover:border-[#4ec2bb] text-slate-700 hover:text-white text-xs font-extrabold rounded-full transition-all duration-200 self-start md:self-auto shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors duration-200" />
          <span>Back to Programs</span>
        </Link>
      </div>

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-[9px] font-bold text-[#f57f17] uppercase tracking-[1.5px] font-quicksand">
            {brandLabel}
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {program.title}
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          {program.description}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {leaderLabel}:{" "}
              <strong className="text-slate-700">{program.leaderName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Duration:{" "}
              <strong className="text-slate-700">
                {program.duration ?? "—"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Timeline:{" "}
              <strong className="text-slate-700">
                {program.start_date} to {program.end_date}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-slate-200 rounded-[24px] p-1.5 shadow-sm overflow-x-auto whitespace-nowrap">
        <div className="relative grid grid-cols-6 gap-1 min-w-[760px] md:min-w-full">
          <div
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
            }}
            className="absolute top-0 bottom-0 left-0 w-1/6 p-0.5 transition-transform duration-300 ease-out pointer-events-none"
          >
            <div className="w-full h-full bg-[#4ec2bb] rounded-[18px] shadow-md shadow-[#4ec2bb]/10" />
          </div>

          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative z-10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-[18px] text-xs font-bold transition-colors duration-300 text-center ${
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-[#4ec2bb]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="transition-all duration-200">{children}</div>
    </div>
  );
}
