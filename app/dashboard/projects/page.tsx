"use client";

import { useState, useMemo } from "react";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import { Search, Network, Edit3, Trash2, X, Save } from "lucide-react";

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

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: "De Novo Transcriptome Assembly Pipeline",
    client_name: "UP Visayas Marine Science",
    service_type: "Bioinformatics Analysis",
    status: "On-going",
    lead: "Dr. Analyst Cruz",
    start_date: "2026-05-10",
    target_delivery_date: "2026-07-20",
  },
  {
    id: 2,
    name: "Metagenomic Sequencing Validation",
    client_name: "DOST Region VI",
    service_type: "Sequencing Service",
    status: "For approval",
    lead: "Prof. Lopez",
    start_date: "2026-06-01",
    target_delivery_date: "2026-08-15",
  },
  {
    id: 3,
    name: "Variant Calling on Rice Subspecies",
    client_name: "PhilRice",
    service_type: "Custom Workflow",
    status: "Submitted",
    lead: "Engr. Santos",
    start_date: "2026-04-12",
    target_delivery_date: "2026-06-30",
  },
  {
    id: 4,
    name: "RNA-Seq Differential Expression Analysis",
    client_name: "UP Manila",
    service_type: "Bioinformatics Analysis",
    status: "Completed",
    lead: "Dr. Cruz",
    start_date: "2026-02-10",
    target_delivery_date: "2026-04-15",
  },
  {
    id: 5,
    name: "ChIP-Seq Transcription Profiling",
    client_name: "MSU-IIT",
    service_type: "Custom Workflow",
    status: "On hold",
    lead: "Prof. Torres",
    start_date: "2026-03-01",
    target_delivery_date: "2026-06-15",
  },
  {
    id: 6,
    name: "Amplicion Deep Sequencing Verification",
    client_name: "DOST-PCHRD",
    service_type: "Sequencing Service",
    status: "On-going",
    lead: "Dr. Analyst Cruz",
    start_date: "2026-05-20",
    target_delivery_date: "2026-08-01",
  },
  {
    id: 7,
    name: "Exome Variant Annotation Pipeline",
    client_name: "PGH Pediatric Labs",
    service_type: "Bioinformatics Analysis",
    status: "Submitted",
    lead: "Engr. Santos",
    start_date: "2026-06-11",
    target_delivery_date: "2026-09-10",
  },
  {
    id: 8,
    name: "CRISPR Off-Target Screening Monitor",
    client_name: "IRRI",
    service_type: "Custom Workflow",
    status: "On-going",
    lead: "Dr. Cruz",
    start_date: "2026-01-15",
    target_delivery_date: "2026-05-30",
  },
  {
    id: 9,
    name: "Single-Cell RNA-Seq Clustering Atlas",
    client_name: "UP Diliman NIMBB",
    service_type: "Bioinformatics Analysis",
    status: "Completed",
    lead: "Prof. Torres",
    start_date: "2026-02-20",
    target_delivery_date: "2026-05-15",
  },
  {
    id: 10,
    name: "HLA Typing Pipeline Optimization",
    client_name: "Philippine Genome Center",
    service_type: "Sequencing Service",
    status: "For approval",
    lead: "Dr. Analyst Cruz",
    start_date: "2026-06-10",
    target_delivery_date: "2026-08-20",
  },
];

export default function ProjectsPage() {
  const [projectsList, setProjectsList] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) =>
      Object.values(project).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, projectsList]);

  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const displayedProjects = useMemo(() => {
    const startOffset = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startOffset, startOffset + itemsPerPage);
  }, [sortedProjects, currentPage]);

  const handleSort = (key: keyof Project) => {
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

  const handleDeleteRecord = () => {
    if (!selectedProject) return;
    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    setShowDeleteConfirm(false);
  };

  // ── DEFINE COLUMNS SCHEMATIC FOR CORE TABLE ───────────────────────
  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      width: "20%",
      sortable: true,
      render: (p) => <span className="font-bold text-[#11161a]">{p.name}</span>,
    },
    { key: "client_name", label: "Client", width: "16%", sortable: true },
    {
      key: "service_type",
      label: "Service Type",
      width: "14%",
      render: (p) => (
        <span className="px-2.5 py-0.5 bg-[#f0f2f3] text-[#4a5963] rounded-full text-[12px] font-bold">
          {p.service_type}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (p) => (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-center min-w-[92px] inline-block uppercase bg-gray-100 text-gray-700">
          {p.status}
        </span>
      ),
    },
    { key: "lead", label: "Lead", width: "12%", sortable: true },
    { key: "start_date", label: "Start Date", width: "13%", sortable: true },
    {
      key: "target_delivery_date",
      label: "Target Delivery",
      width: "13%",
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      width: "10%",
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setEditForm(p);
              setIsEditing(true);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto font-aileron">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Projects
        </h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-[14px] outline-none focus:ring-2 focus:ring-[#4ec2bb]"
          />
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-6 h-6 text-[#2a7797]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            Project Tracking Workspace
          </h2>
        </div>

        {/* REUSABLE DATA TABLE */}
        <DataTable
          columns={columns}
          data={displayedProjects}
          sortConfig={sortConfig}
          onSort={handleSort}
        />

        {/* REUSABLE PAGINATION BAR */}
        <Pagination
          totalItems={filteredProjects.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* REUSABLE DELETE CONFIRMATION MODAL */}
      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />

      {/* Localized Edit Parameter Form */}
      {isEditing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="bg-[#fffdf8] rounded-[28px] max-w-[640px] w-full p-8 shadow-xl border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="absolute top-6 right-6 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setProjectsList((prev) =>
                  prev.map((item) =>
                    item.id === editForm.id ? editForm : item,
                  ),
                );
                setIsEditing(false);
              }}
              className="space-y-5"
            >
              <h3 className="text-2xl font-bold text-[#333333]">
                Update Record Parameters
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#172126]">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="h-10 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-11 px-5 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 h-11 px-5 bg-[#4ec2bb] text-white font-bold text-sm rounded-xl shadow-md"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ComplianceFooter />
    </div>
  );
}
