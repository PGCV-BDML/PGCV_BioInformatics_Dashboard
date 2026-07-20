"use client";

import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex w-full min-h-screen items-center justify-center bg-[#F6F4EE]">
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-8 shadow-xl shadow-slate-400/20 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-[#c62828]" />
        </div>
        <h2 className="text-2xl font-bold text-[#333333] font-aileron">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-500 font-aileron">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all font-aileron"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
