"use client";

import { type ReactNode } from "react";
import { DashboardBreadcrumbs, type BreadcrumbItem } from "./dashboardbreadcrumbs";

interface PageHeaderProps {
  breadcrumbTrail: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumbTrail, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
      <div className="flex flex-col gap-1">
        <div className="opacity-95 text-xs tracking-wide transition-colors">
          <DashboardBreadcrumbs items={breadcrumbTrail} />
        </div>
        <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
