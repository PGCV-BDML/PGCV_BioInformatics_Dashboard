"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

interface DashboardUIContextValue {
  isSidebarHidden: boolean;
  toggleSidebar: (hidden: boolean) => void;
}

const DashboardUIContext = createContext<DashboardUIContextValue | null>(null);

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    if (typeof window === "undefined") return false; // SSR: default visible
    return window.innerWidth < 1024; // Client: hidden on mobile
  });

  return (
    <DashboardUIContext.Provider
      value={{ isSidebarHidden, toggleSidebar: setIsSidebarHidden }}
    >
      {children}
    </DashboardUIContext.Provider>
  );
}

export function useDashboardUI() {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) {
    throw new Error("useDashboardUI must be used within a DashboardUIProvider");
  }
  return ctx;
}
