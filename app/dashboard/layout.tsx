"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "../components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes (e.g. sign out from another tab, or token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-[#faf9f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2a7797]"></div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-[#faf9f5] overflow-hidden">
      {/* ── SIDEBAR (STAYS ON THE LEFT FOR ALL DASHBOARD PAGES) ── */}
      <Sidebar />

      {/* ── DYNAMIC PAGE CONTENT CONTAINER ── */}
      <main className="flex-1 h-screen overflow-y-auto p-8">{children}</main>
    </div>
  );
}
