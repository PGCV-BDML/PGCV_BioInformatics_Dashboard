"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "../components/sidebar";
import { DashboardUIProvider, useDashboardUI } from "../components/dashboard-ui-context";
import { ToastProvider } from "../components/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes (e.g. sign out from another tab, or token expiry)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-[#F6F4EE]">
        <div role="status" aria-label="Loading dashboard" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2a7797]"></div>
      </div>
    );
  }

  return (
    <DashboardUIProvider>
      <ToastProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </ToastProvider>
    </DashboardUIProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isSidebarHidden, toggleSidebar } = useDashboardUI();

  return (
    <div className="flex w-full min-h-screen bg-[#F6F4EE] overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[#2a7797] focus:text-white focus:rounded-xl focus:text-sm focus:font-bold">
        Skip to main content
      </a>
      {/* ── SIDEBAR (STAYS ON THE LEFT FOR ALL DASHBOARD PAGES) ── */}
      <Sidebar />

      {/* ── MOBILE BACKDROP ── */}
      {!isSidebarHidden && (
        <div
          onClick={() => toggleSidebar(true)}
          className="lg:hidden fixed inset-0 bg-black/30 z-[90]"
          aria-hidden="true"
        />
      )}

      {/* ── DYNAMIC PAGE CONTENT CONTAINER ── */}
      <main id="main-content" className="flex-1 h-screen overflow-y-auto p-4 md:p-8">
        <button
          type="button"
          onClick={() => toggleSidebar(false)}
          className="lg:hidden mb-4 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-slate-200 text-[#2a7797] hover:bg-brand-tint transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {children}
      </main>
    </div>
  );
}
