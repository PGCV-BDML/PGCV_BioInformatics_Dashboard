"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboardUI } from "./dashboard-ui-context";
import { usePortal } from "./portal-context";
import { getHomePathForRole } from "@/lib/portal";
import {
  LayoutGrid,
  CheckSquare,
  Calendar,
  Microscope,
  GraduationCap,
  Briefcase,
  Users2,
  Network,
  Activity,
  FolderGit2,
  ChevronRight,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Eye,
} from "lucide-react";

type NavChild = {
  name: string;
  href: string;
  exact?: boolean;
  icon: typeof LayoutGrid;
};

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  animationClass: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  {
    name: "Landing Page",
    href: "/dashboard",
    icon: LayoutGrid,
    exact: true,
    animationClass: "group-hover:rotate-12 transition-transform duration-300",
  },
  {
    name: "Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    animationClass:
      "group-hover:-translate-y-0.5 transition-transform duration-200",
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    animationClass:
      "group-hover:-translate-y-0.5 transition-transform duration-200",
  },
  {
    name: "Sequence Analysis",
    href: "/dashboard/services",
    icon: Microscope,
    animationClass:
      "group-hover:scale-110 group-hover:rotate-6 transition-all duration-300",
    children: [
      {
        name: "Dashboard",
        href: "/dashboard/services",
        exact: true,
        icon: LayoutDashboard,
      },
      {
        name: "Service Report Tracker",
        href: "/dashboard/services/tracker",
        icon: ClipboardList,
      },
    ],
  },
  {
    name: "Training",
    href: "/dashboard/training",
    icon: GraduationCap,
    animationClass: "group-hover:scale-105 transition-transform duration-200",
  },
  {
    name: "Internship",
    href: "/dashboard/internship",
    icon: Briefcase,
    animationClass: "group-hover:scale-105 transition-transform duration-200",
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
    name: "Clients",
    href: "/dashboard/clients",
    icon: Users2,
    animationClass: "group-hover:scale-105 transition-transform duration-200",
  },
  {
    name: "Accomplishments",
    href: "/dashboard/accomplishments",
    icon: Activity,
    animationClass: "group-hover:scale-110 transition-transform duration-200",
  },
  {
    name: "Repositories",
    href: "/dashboard/repositories",
    icon: FolderGit2,
    animationClass: "group-hover:rotate-3 transition-transform duration-200",
  },
];

function isPathActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  isHidden?: boolean;
}

export default function Sidebar({
  isHidden: controlledIsHidden,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarHidden, toggleSidebar } = useDashboardUI();
  const { effectiveRole, isStaff, previewMode, setPreviewMode } = usePortal();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );
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

  const isCurrentlyHidden =
    controlledIsHidden !== undefined ? controlledIsHidden : isSidebarHidden;

  const homeHref = getHomePathForRole(effectiveRole);

  const visibleNavItems = useMemo(() => {
    if (effectiveRole === "trainee") {
      return navItems.filter((item) => item.href === "/dashboard/training");
    }
    if (effectiveRole === "intern") {
      return navItems.filter((item) => item.href === "/dashboard/internship");
    }
    return navItems;
  }, [effectiveRole]);

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

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of visibleNavItems) {
      if (item.children?.length) {
        next[item.name] = isPathActive(pathname, item.href);
      }
    }
    setExpandedMenus((prev) => ({ ...prev, ...next }));
  }, [pathname, visibleNavItems]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      router.push("/login");
    }
  };

  const closeMobileSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleSidebar(true);
    }
  };

  return (
    <aside
      className={`h-screen bg-surface flex flex-col justify-between border-r border-[rgba(23,33,38,0.08)] flex-shrink-0 lg:relative fixed z-[100] transition-all duration-300 ease-in-out overflow-hidden ${
        isCurrentlyHidden
          ? "w-[340px] p-6 opacity-0 -translate-x-full lg:w-0 lg:p-0 lg:border-r-0 lg:shadow-none"
          : "w-[340px] p-6 opacity-100 translate-x-0 shadow-[6px_0_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div
        className={`w-[292px] flex flex-col justify-between h-full transition-opacity duration-200 ${isCurrentlyHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div>
          <Link
            href={homeHref}
            className="flex items-center gap-3 pb-5 border-b border-gray-100 cursor-pointer select-none"
          >
            <img
              src="/assets/pgcv_logo.png"
              alt="Philippine Genome Center Visayas logo"
              className="h-11 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-[#2a7797] font-black text-[13px] leading-tight font-aileron tracking-wide uppercase">
                Bioinformatics Workflow Dashboard
              </span>
              <span className="text-[#8499a5] text-[10px] font-quicksand tracking-wide mt-0.5">
                University of the Philippines
              </span>
            </div>
          </Link>

          <div className="mt-6">
            <p className="text-[#8499a5] text-[11px] font-extrabold tracking-[1.5px] uppercase font-quicksand px-3 mb-3">
              Navigation
            </p>
            <nav aria-label="Main navigation" className="flex flex-col gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = Boolean(item.children?.length);
                const childActive = item.children?.some((child) =>
                  isPathActive(pathname, child.href, child.exact),
                );
                const isActive = hasChildren
                  ? isPathActive(pathname, item.href) || Boolean(childActive)
                  : isPathActive(pathname, item.href, item.exact);
                const isExpanded = hasChildren
                  ? (expandedMenus[item.name] ?? isActive)
                  : false;

                return (
                  <div key={item.name} className="flex flex-col gap-0.5">
                    {hasChildren ? (
                      <div
                        className={`group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-200 font-bold text-[13.5px] font-aileron tracking-wide ${
                          isActive
                            ? "bg-[#4ec2bb] text-white shadow-[0px_8px_16px_rgba(78,194,187,0.3)]"
                            : "text-[#1e293b] hover:bg-brand-tint hover:text-[#2a7797]"
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMobileSidebar}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <Icon
                            className={`w-4 h-4 stroke-[2.5] ${item.animationClass} ${isActive ? "text-white" : "text-[#334155] group-hover:text-[#2a7797]"}`}
                          />
                          <span>{item.name}</span>
                        </Link>
                        <button
                          type="button"
                          aria-label={`Toggle ${item.name} submenu`}
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedMenus((prev) => ({
                              ...prev,
                              [item.name]: !isExpanded,
                            }))
                          }
                          className="p-0.5 rounded-md"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 stroke-[2.5] transition-transform ${isExpanded ? "rotate-180" : ""} ${isActive ? "text-white" : "text-[#64748b]"}`}
                          />
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={closeMobileSidebar}
                        className={`group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-200 font-bold text-[13.5px] font-aileron tracking-wide ${
                          isActive
                            ? "bg-[#4ec2bb] text-white shadow-[0px_8px_16px_rgba(78,194,187,0.3)]"
                            : "text-[#1e293b] hover:bg-brand-tint hover:text-[#2a7797]"
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
                    )}

                    {hasChildren && isExpanded ? (
                      <div className="ml-4 pl-3 border-l border-slate-200/80 flex flex-col gap-0.5 py-1">
                        {item.children!.map((child) => {
                          const ChildIcon = child.icon;
                          const childIsActive = isPathActive(
                            pathname,
                            child.href,
                            child.exact,
                          );
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMobileSidebar}
                              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold font-aileron transition-colors ${
                                childIsActive
                                  ? "bg-[#e6f4f8] text-[#2a7797]"
                                  : "text-[#475569] hover:bg-brand-tint hover:text-[#2a7797]"
                              }`}
                            >
                              <ChildIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 relative" ref={cardRef}>
          <div
            className={`absolute bottom-[76px] left-0 w-full bg-surface border border-[rgba(23,33,38,0.1)] rounded-2xl py-1 shadow-[0px_10px_32px_rgba(23,33,38,0.08)] z-30 transition-all duration-200 ease-out origin-bottom ${
              showProfileCard
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            }`}
          >
            {isStaff && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode(
                      previewMode === "trainee" ? null : "trainee",
                    );
                    setShowProfileCard(false);
                    router.push("/dashboard/training");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#1e293b] hover:bg-[#f5f5f4] rounded-xl font-bold text-[13px] font-aileron transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#64748b] stroke-[2.5]" />
                  <span>
                    {previewMode === "trainee"
                      ? "Exit trainee preview"
                      : "Preview as trainee"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode(previewMode === "intern" ? null : "intern");
                    setShowProfileCard(false);
                    router.push("/dashboard/internship");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#1e293b] hover:bg-[#f5f5f4] rounded-xl font-bold text-[13px] font-aileron transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#64748b] stroke-[2.5]" />
                  <span>
                    {previewMode === "intern"
                      ? "Exit intern preview"
                      : "Preview as intern"}
                  </span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#1e293b] hover:bg-[#f5f5f4] rounded-xl font-bold text-[13px] font-aileron transition-colors"
            >
              <LogOut className="w-4 h-4 text-[#64748b] stroke-[2.5]" />
              <span>Sign out</span>
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle profile menu"
            aria-expanded={showProfileCard}
            onClick={() => setShowProfileCard(!showProfileCard)}
            className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all duration-300 transform font-aileron focus:outline-none min-w-0 group ${
              showProfileCard
                ? "bg-brand-tint text-[#2a7797] -translate-y-0.5 scale-[1.01]"
                : "text-[#1e293b] hover:bg-brand-tint hover:text-[#2a7797] hover:-translate-y-0.5 hover:scale-[1.01]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {userData.avatarUrl ? (
                <img
                  src={userData.avatarUrl}
                  alt="User profile avatar"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200/60"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200 ${
                    showProfileCard
                      ? "bg-[#2a7797] text-white"
                      : "bg-[#2a7797] text-white group-hover:bg-[#2a7797] group-hover:text-white"
                  }`}
                >
                  {userData.name[0]}
                </div>
              )}
              <div className="flex flex-col text-left min-w-0">
                <p
                  className={`text-[13px] font-bold truncate transition-colors duration-200 ${
                    showProfileCard
                      ? "text-[#2a7797]"
                      : "text-[#1e293b] group-hover:text-[#2a7797]"
                  }`}
                >
                  {userData.name}
                </p>
                <p
                  className={`text-[11px] font-medium truncate transition-colors duration-200 ${
                    showProfileCard
                      ? "text-[#2a7797]/80"
                      : "text-[#64748b] group-hover:text-[#2a7797]/80"
                  }`}
                >
                  {userData.email}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 ml-2 flex-shrink-0 transition-all duration-200 ${
                showProfileCard
                  ? "rotate-180 text-[#2a7797]"
                  : "text-[#64748b] group-hover:text-[#2a7797]"
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
