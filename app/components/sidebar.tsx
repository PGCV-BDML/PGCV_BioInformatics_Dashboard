"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutGrid,
  Calendar,
  Microscope,
  Users2,
  Network,
  Activity,
  ClipboardList,
  FolderGit2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { name: "Landing Page", href: "/dashboard", icon: LayoutGrid },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  {
    name: "Bioinformatics Services",
    href: "/dashboard/services",
    icon: Microscope,
  },
  { name: "Collaborations", href: "/dashboard/collaborations", icon: Users2 },
  { name: "Projects", href: "/dashboard/projects", icon: Network },
  {
    name: "Accomplishments",
    href: "/dashboard/accomplishments",
    icon: Activity,
  },
  {
    name: "Services List",
    href: "/dashboard/services-list",
    icon: ClipboardList,
  },
  { name: "Repositories", href: "/dashboard/repositories", icon: FolderGit2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-[340px] h-screen bg-[#fffdf8] flex flex-col justify-between p-6 border-r border-[rgba(23,33,38,0.08)] shadow-[2px_0px_24px_rgba(40,37,96,0.02)] flex-shrink-0">
      {/* ── Header / Branding ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
          <img
            src="/assets/pgcv_logo.png"
            alt="Philippine Genome Center Visayas logo"
            className="h-11 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-[#2a7797] font-bold text-[13px] leading-tight font-aileron tracking-wide uppercase">
              Bioinformatics Workflow Dashboard
            </span>
          </div>
        </div>

        {/* ── Navigation Menu ─────────────────────────────────────────── */}
        <div className="mt-6">
          <p className="text-[#a4b4bc] text-[10px] font-bold tracking-[1.5px] uppercase font-aileron px-3 mb-3">
            Navigation
          </p>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-200 font-medium text-[13.5px] font-aileron ${
                    isActive
                      ? "bg-[#4ec2bb] text-white shadow-[0px_8px_16px_rgba(78,194,187,0.25)]"
                      : "text-[#333333] hover:bg-[#e6f5ff] hover:text-[#2a7797]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "text-white"
                          : "text-[#333333] group-hover:text-[#2a7797]"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? "text-white" : "text-[#7b7979]"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Footer / User Profile ────────────────────────────────────── */}
      <div className="pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2a7797] flex items-center justify-center font-bold text-white text-xs font-aileron shadow-sm">
              PG
            </div>
            <div className="text-left flex flex-col">
              <span className="text-[#333333] text-[13.5px] font-bold font-aileron leading-tight">
                PGC Visayas
              </span>
              <span className="text-[#7b7979] text-[11px] font-aileron leading-tight mt-0.5">
                Admin
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#7b7979] mr-1" />
        </button>
      </div>
    </aside>
  );
}
