"use client";

import { AlertCircle, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── LoadingState ─────────────────────────────────────────────── */

interface LoadingStateProps {
  message?: string;
  variant?: "spinner" | "skeleton";
}

export function LoadingState({
  message = "Loading…",
  variant = "skeleton",
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-8 h-8 border-2 border-[#2a7797] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 font-aileron">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div
      className="animate-pulse space-y-3 py-4"
      role="status"
      aria-label={message}
    >
      <div className="h-8 bg-slate-200/50 rounded-lg w-full" />
      <div className="h-10 bg-slate-200/30 rounded-lg w-full" />
      <div className="h-10 bg-slate-200/30 rounded-lg w-11/12" />
      <div className="h-10 bg-slate-200/30 rounded-lg w-4/5" />
      <div className="h-10 bg-slate-200/30 rounded-lg w-10/12" />
      <span className="sr-only">{message}</span>
    </div>
  );
}

/* ── ErrorState ───────────────────────────────────────────────── */

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50/50 rounded-2xl border border-dashed border-red-200 p-6">
      <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
      <p className="text-sm font-medium text-red-600 font-aileron mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all font-aileron"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ── EmptyState ───────────────────────────────────────────────── */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
      <Icon className="w-10 h-10 text-slate-300 mb-2" />
      <h3 className="text-sm font-semibold text-slate-600 font-aileron mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-400 font-aileron">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
