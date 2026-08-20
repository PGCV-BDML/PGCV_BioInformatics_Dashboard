"use client";

import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";
import { usePortal } from "@/app/components/portal-context";
import { supabase } from "@/lib/supabase";
import { clearGoogleCalendarReconnectAttempt, clearGoogleCalendarToken } from "@/lib/google-calendar";
import { useRouter } from "next/navigation";

export default function PendingAccessPage() {
  const { profile } = usePortal();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      clearGoogleCalendarToken();
      clearGoogleCalendarReconnectAttempt();
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 font-aileron">
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-8 shadow-xl shadow-slate-400/20 space-y-5 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Account pending access
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {profile?.name ? `Hi ${profile.name}. ` : ""}
            Your account is signed in, but a team lead still needs to assign
            your role and enroll you in a training or internship program.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-left space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 font-quicksand">
            Contact
          </p>
          <a
            href="mailto:bioinfo.pgc.upvisayas@up.edu.ph"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2a7797] hover:underline"
          >
            <Mail className="w-4 h-4" />
            bioinfo.pgc.upvisayas@up.edu.ph
          </a>
          <p className="text-[11px] text-slate-500">
            Include your Google account email so staff can locate your user
            record.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Link
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#2a7797] hover:bg-[#1f5f79] text-white text-xs font-bold transition-colors"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
