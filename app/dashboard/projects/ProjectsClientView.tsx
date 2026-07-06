"use client";

import { useState, useMemo } from "react";
import ComplianceFooter from "../../components/compliancefooter";
import {
  Search,
  Network,
  ArrowUpDown,
  Maximize2,
  Minimize2,
} from "lucide-react";

type Project = {
  id: number;
  name: string;
  client_name: string;
  service_type: string;
  status: string;
  lead: string;
  start_date: string;
  target_delivery_date: string;
};

export default function ProjectsClientView({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  // ── SEARCH & FILTER LOGIC ───────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((project) =>
      Object.values(project).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, initialProjects]);

  // ── SORTING LOGIC ───────────────────────────────────────────────
  const sortedProjects = useMemo(() => {
    let sortableItems = [...filteredProjects];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProjects, sortConfig]);

  // ── 5-ROW EXPANSION SLICE VIEW CONTROLLER ────────────────────────
  const displayedProjects = useMemo(() => {
    if (isExpanded) return sortedProjects;
    return sortedProjects.slice(0, 5);
  }, [sortedProjects, isExpanded]);

  const requestSort = (key: keyof Project) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[12px] font-bold font-aileron text-center min-w-[92px] inline-block";
    switch (status) {
      case "Completed":
        return (
          <span className={`${baseClass} bg-[#eaf7ee] text-[#55b672]`}>
            Completed
          </span>
        );
      case "On-going":
        return (
          <span className={`${baseClass} bg-[#f2f4f5] text-[#55656e]`}>
            On-going
          </span>
        );
      case "On hold":
        return (
          <span className={`${baseClass} bg-[#fff8eb] text-[#f4ba61]`}>
            On hold
          </span>
        );
      case "Submitted":
        return (
          <span className={`${baseClass} bg-[#f8fafb] text-[#788894]`}>
            Submitted
          </span>
        );
      case "For approval":
        return (
          <span className={`${baseClass} bg-[#f2f2f5] text-[#8e8d94]`}>
            For approval
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-gray-50 text-gray-500`}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto font-aileron">
      {/* ── TOP ACTION BAR ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-4xl font-bold font-aileron text-[#2a7797] tracking-tight">
          Projects
        </h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 outline-none text-[14px] focus:ring-2 focus:ring-[#4ec2bb] transition-all"
          />
        </div>
      </div>

      {/* ── PROJECTS TRACKER (LIVE DATA TABLE) ───────────────────────── */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[11px] font-bold text-[#7b7979] tracking-widest uppercase mb-2 font-aileron">
              Projects Tracker
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-6 h-6 text-[#2a7797]" />
              <h2 className="text-3xl font-bold font-aileron text-[#333333]">
                List of Projects
              </h2>
            </div>
          </div>
          <span className="hidden sm:inline-block bg-gray-100 text-[#55656e] font-bold text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">
            Internal and Service-Linked Work
          </span>
        </div>

        {/* Minimal Alternating Neutral Light Gray & White Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              {/* Table header is a clean soft gray */}
              <tr className="bg-[#f4f6f7] text-[#55656e] text-[13px] font-bold tracking-wide border-b border-gray-200 select-none">
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[24%]"
                  onClick={() => requestSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Project Name{" "}
                    <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                  </div>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[18%]"
                  onClick={() => requestSort("client_name")}
                >
                  <div className="flex items-center gap-1">
                    Client <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                  </div>
                </th>
                <th className="py-4 px-4 w-[16%]">Service Type</th>
                <th className="py-4 px-4 w-[12%]">Status</th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[12%]"
                  onClick={() => requestSort("lead")}
                >
                  <div className="flex items-center gap-1">
                    Lead <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                  </div>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[9%]"
                  onClick={() => requestSort("start_date")}
                >
                  <div className="flex items-center gap-1">
                    Start <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                  </div>
                </th>
                <th className="py-4 px-4 w-[9%]">Target Del.</th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-[#2c3a42] divide-y-0">
              {displayedProjects.map((project) => (
                <tr
                  key={project.id}
                  // Rows alternate strictly between light gray (#f9fafb) and clean white
                  className="odd:bg-[#f9fafb] even:bg-[#6E6E6] hover:bg-[#f1f3f4] transition-colors group border-b border-gray-200/40 last:border-b-0"
                >
                  <td className="py-4 px-4 font-bold text-[#11161a] break-words">
                    {project.name}
                  </td>
                  <td className="py-4 px-4 text-[#38454f] font-medium break-words">
                    {project.client_name}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-0.5 bg-[#f0f2f3] text-[#4a5963] rounded-full text-[12px] font-bold tracking-wide inline-block break-words">
                      {project.service_type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {renderStatusBadge(project.status)}
                  </td>
                  <td className="py-4 px-4 text-[#4a5963] break-words">
                    {project.lead}
                  </td>
                  <td className="py-4 px-4 text-[#788894] font-medium">
                    {project.start_date}
                  </td>
                  <td className="py-4 px-4 text-[#788894] font-medium">
                    {project.target_delivery_date}
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr className="bg-white">
                  <td
                    colSpan={7}
                    className="text-center py-12 text-gray-400 font-medium"
                  >
                    No active projects found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── EXPAND/COLLAPSE ACTION BUTTON ─────────────────────────── */}
        {filteredProjects.length > 5 && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl font-bold text-[13px] text-[#2a7797] transition-all shadow-sm active:scale-[0.98]"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-4 h-4" /> Collapse View
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" /> Expand View (
                  {filteredProjects.length - 5} More)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── REQUIRED FIELDS GUIDE REFERENCE ──────────────────────────── */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.08)] rounded-[28px] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-[11px] font-bold tracking-[1.5px] uppercase font-aileron text-[#7b7979]">
              Required Fields Guide
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Reference blueprint layout for clients lodging submission
              workflows.
            </p>
          </div>
          <span className="bg-gray-100 text-[#7b7979] font-bold text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">
            Review with biology track
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              label: "Project Name",
              desc: "Descriptive title of work assignment",
            },
            {
              label: "Client",
              desc: "Origin organization, university or lab unit",
            },
            {
              label: "Service Type",
              desc: "Bioinformatics analysis branch requested",
            },
            { label: "Status", desc: "Pipeline tracking position flag" },
            {
              label: "Lead",
              desc: "Assigned head supervisor processing parameters",
            },
            {
              label: "Target Delivery",
              desc: "Estimated delivery pipeline threshold date",
            },
          ].map((field, i) => (
            <div
              key={i}
              className="bg-[#fffdf8] rounded-2xl border border-gray-200/60 p-4 flex flex-col justify-center"
            >
              <span className="text-sm font-bold text-[#172126]">
                {field.label}
              </span>
              <span className="text-xs text-gray-400 mt-1">{field.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SHARED COMPLIANCE FOOTER MODULE ─────────────────────────── */}
      <ComplianceFooter />
    </div>
  );
}
