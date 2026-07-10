"use client";

import { useState, useRef, useEffect } from "react";
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
  LogOut,
} from "lucide-react";

const navItems = [
  {
    name: "Landing Page",
    href: "/dashboard",
    icon: LayoutGrid,
    animationClass: "group-hover:rotate-12 transition-transform duration-300",
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    animationClass:
      "group-hover:-translate-y-0.5 transition-transform duration-200",
  },
  {
    name: "Bioinformatics Services",
    href: "/dashboard/services",
    icon: Microscope,
    animationClass:
      "group-hover:scale-110 group-hover:rotate-6 transition-all duration-300",
  },
  {
    name: "Collaborations",
    href: "/dashboard/collaborations",
    icon: Users2,
    animationClass: "group-hover:scale-105 transition-transform duration-200",
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: Network,
    animationClass: "group-hover:animate-pulse",
  },
  {
    name: "Accomplishments",
    href: "/dashboard/accomplishments",
    icon: Activity,
    animationClass: "group-hover:scale-110 transition-transform duration-200",
  },
  {
    name: "Services List",
    href: "/dashboard/services-list",
    icon: ClipboardList,
    animationClass:
      "group-hover:translate-x-0.5 transition-transform duration-200",
  },
  {
    name: "Repositories",
    href: "/dashboard/repositories",
    icon: FolderGit2,
    animationClass: "group-hover:rotate-3 transition-transform duration-200",
  },
];

interface SidebarProps {
  isHidden?: boolean;
}

export default function Sidebar({
  isHidden: controlledIsHidden,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [localIsHidden, setLocalIsHidden] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  }>({
    name: "PGC Visayas",
    email: "Admin Account",
    avatarUrl: null,
  });

  // Combine parent controlled state with event system channel broadcasts
  const isCurrentlyHidden =
    controlledIsHidden !== undefined ? controlledIsHidden : localIsHidden;

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen: boolean }>;
      setLocalIsHidden(customEvent.detail.isOpen);
    };

    window.addEventListener("toggle-dashboard-sidebar", handleToggle);
    return () =>
      window.removeEventListener("toggle-dashboard-sidebar", handleToggle);
  }, []);

  useEffect(() => {
    async function getUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const identityMeta =
          user.identities?.[0]?.identity_data || user.user_metadata;
        setUserData({
          name: identityMeta?.full_name || identityMeta?.name || "PGC Visayas",
          email: user.email || "Admin Account",
          avatarUrl: identityMeta?.avatar_url || identityMeta?.picture || null,
        });
      }
    }
    getUserProfile();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowProfileCard(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={`h-screen bg-[#fffdf8] flex flex-col justify-between border-r border-[rgba(23,33,38,0.08)] shadow-[2px_0px_24px_rgba(40,37,96,0.02)] flex-shrink-0 relative transition-all duration-300 ease-in-out overflow-hidden ${
        isCurrentlyHidden
          ? "w-0 p-0 opacity-0 -translate-x-full border-r-0"
          : "w-[340px] p-6 opacity-100 translate-x-0"
      }`}
    >
      {/* Wrapped Content Layer stops text compression during width transitions */}
      <div
        className={`w-[292px] flex flex-col justify-between h-full transition-opacity duration-200 ${isCurrentlyHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
            <img
              src="/assets/pgcv_logo.png"
              alt="Logo"
              className="h-11 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-[#2a7797] font-black text-[13px] leading-tight font-aileron tracking-wide uppercase">
                Bioinformatics Workflow Dashboard
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6">
            <p className="text-[#8499a5] text-[11px] font-extrabold tracking-[1.5px] uppercase font-quicksand px-3 mb-3">
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
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-200 font-bold text-[13.5px] font-aileron tracking-wide ${
                      isActive
                        ? "bg-[#4ec2bb] text-white shadow-[0px_8px_16px_rgba(78,194,187,0.3)]"
                        : "text-[#1e293b] hover:bg-[#e6f5ff] hover:text-[#2a7797]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 stroke-[2.5] ${item.animationClass} ${isActive ? "text-white" : "text-[#334155] group-hover:text-[#2a7797]"}`}
                      />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-0.5 ${isActive ? "text-white" : "text-[#64748b]"}`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Profile Controls */}
        <div className="pt-4 border-t border-gray-100 relative" ref={cardRef}>
          {showProfileCard && (
            <div className="absolute bottom-[76px] left-0 w-full bg-[#FFFDF8] border border-[rgba(23,33,38,0.1)] rounded-2xl py-2 shadow-[0px_10px_32px_rgba(23,33,38,0.08)] z-30">
              <div className="px-4 py-2.5 border-b border-gray-100 min-w-0">
                <p className="text-[13px] font-bold text-[#1e293b] leading-tight truncate">
                  {userData.name}
                </p>
                <p className="text-[11.5px] font-semibold text-[#64748b] leading-tight mt-0.5 truncate">
                  {userData.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 mt-1 text-[#1e293b] hover:bg-[#f5f5f4] font-bold text-[13px] font-aileron transition-colors"
              >
                <LogOut className="w-4 h-4 text-[#64748b] stroke-[2.5]" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowProfileCard(!showProfileCard)}
            className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all duration-300 transform font-aileron focus:outline-none min-w-0 ${showProfileCard ? "bg-[#e6f5ff] text-[#2a7797]" : "hover:bg-[#e6f5ff]/60 hover:-translate-y-0.5 hover:scale-[1.01]"}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {userData.avatarUrl ? (
                <img
                  src={userData.avatarUrl}
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200/60"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2a7797] text-white flex items-center justify-center font-bold text-sm">
                  {userData.name[0]}
                </div>
              )}
              <div className="flex flex-col text-left min-w-0">
                <p className="text-[13px] font-bold text-[#1e293b] truncate">
                  {userData.name}
                </p>
                <p className="text-[11px] font-medium text-[#64748b] truncate">
                  {userData.email}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#64748b] ml-2 flex-shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
