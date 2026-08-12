"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "../components/sidebar";
import { NotificationBell } from "../components/notification-bell";
import {
  DashboardUIProvider,
  useDashboardUI,
} from "../components/dashboard-ui-context";
import { ToastProvider } from "../components/toast";
import {
  PortalProvider,
  usePortal,
} from "../components/portal-context";
import PortalPreviewBanner from "../components/portal-preview-banner";
import { ChatPanel } from "../components/chat-panel";
import { DashboardFooter } from "../components/dashboard-footer";

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
        <div
          role="status"
          aria-label="Loading dashboard"
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2a7797]"
        ></div>
      </div>
    );
  }

  return (
    <DashboardUIProvider>
      <ToastProvider>
        <PortalProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </PortalProvider>
      </ToastProvider>
    </DashboardUIProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isSidebarHidden, toggleSidebar } = useDashboardUI();
  const { loading: portalLoading, effectiveRole, isOfficerView } = usePortal();
  const hideChrome = !effectiveRole || effectiveRole === "none";

  if (portalLoading) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-[#F6F4EE]">
        <div
          role="status"
          aria-label="Loading portal"
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2a7797]"
        ></div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-[#F6F4EE] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[#2a7797] focus:text-white focus:rounded-xl focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>

      {!hideChrome && <Sidebar />}

      {!hideChrome && !isSidebarHidden && (
        <div
          onClick={() => toggleSidebar(true)}
          className="lg:hidden fixed inset-0 bg-black/30 z-[90]"
          aria-hidden="true"
        />
      )}

      <main
        id="main-content"
        className="flex-1 h-screen overflow-y-auto flex flex-col"
      >
        <PortalPreviewBanner />
        {!hideChrome && (
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 md:px-8 py-3 bg-[#F6F4EE]/95 backdrop-blur-sm border-b border-[rgba(23,33,38,0.06)]">
            <div>
              {isSidebarHidden ? (
                <button
                  type="button"
                  onClick={() => toggleSidebar(false)}
                  className="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-surface border border-slate-200 text-[#2a7797] hover:bg-brand-tint transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                  aria-label="Open navigation menu"
                  title="Open navigation"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-xs font-bold font-quicksand tracking-wide hidden sm:inline">
                    Menu
                  </span>
                </button>
              ) : (
                <span className="sr-only">Dashboard</span>
              )}
            </div>
            <NotificationBell />
          </header>
        )}
        <div className="flex-1 p-4 md:p-8">{children}</div>
        {!hideChrome && <DashboardFooter />}
      </main>

      {!hideChrome && !isOfficerView && <ChatPanel />}
    </div>
  );
}
