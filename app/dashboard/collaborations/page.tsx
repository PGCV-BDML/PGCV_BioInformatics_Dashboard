"use client";

import { useState, useMemo, useEffect } from "react";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import {
  Search,
  Network,
  Link2,
  ExternalLink,
  FileText,
  Edit3,
  Trash2,
  Plus,
  X,
  FlaskConical,
  User,
  Calendar,
  ClipboardCheck,
  Save,
  Inbox,
} from "lucide-react";

type Collaboration = {
  id: number;
  partner_organization: string;
  lead: string;
  status: string;
  start_date: string;
  documents_link: string;
  notes: string;
  repository_link: string;
};

const INITIAL_COLLABORATIONS: Collaboration[] = [
  {
    id: 1,
    partner_organization: "Philippine Genome Center",
    lead: "Dr. Analyst Cruz",
    status: "On-going",
    start_date: "2026-01-15",
    documents_link: "https://drive.google.com/drive/folders/mock-pgc-share",
    notes: "Core sequence indexing alliance",
    repository_link:
      "https://github.com/pgc-core/collaborative-variant-pipeline",
  },
  {
    id: 2,
    partner_organization: "International Rice Research Institute (IRRI)",
    lead: "Prof. Lopez",
    status: "Completed",
    start_date: "2026-02-10",
    documents_link: "https://irri.org/resources/mock-docs",
    notes: "Phenotype classification validation dataset share",
    repository_link: "https://github.com/irri-genomics/rice-subspecies-mra",
  },
];

const AVAILABLE_USERS = [
  "Dr. Analyst Cruz",
  "Prof. Lopez",
  "Engr. Santos",
  "Dr. Cruz",
  "Prof. Torres",
];

const AVAILABLE_STATUSES = [
  "On-going",
  "Completed",
  "On hold",
  "For approval",
  "Submitted",
];

export default function CollaborationsPage() {
  const [collaborationsList, setCollaborationsList] = useState<Collaboration[]>(
    INITIAL_COLLABORATIONS,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Collaboration;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal Visibility States
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] =
    useState<Collaboration | null>(null);

  // Form State Containers
  const emptyForm: Omit<Collaboration, "id"> = {
    partner_organization: "",
    lead: AVAILABLE_USERS[0],
    start_date: "",
    status: "On-going",
    documents_link: "",
    notes: "",
    repository_link: "",
  };
  const [formState, setFormState] =
    useState<Omit<Collaboration, "id">>(emptyForm);

  const filteredCollaborations = useMemo(() => {
    return collaborationsList.filter((collab) =>
      Object.values(collab).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, collaborationsList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sortedCollaborations = useMemo(() => {
    let sortableItems = [...filteredCollaborations];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCollaborations, sortConfig]);

  const displayedCollaborations = useMemo(() => {
    const startOffset = (currentPage - 1) * itemsPerPage;
    return sortedCollaborations.slice(startOffset, startOffset + itemsPerPage);
  }, [sortedCollaborations, currentPage]);

  const handleSort = (key: keyof Collaboration) => {
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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId =
      collaborationsList.length > 0
        ? Math.max(...collaborationsList.map((c) => c.id)) + 1
        : 1;

    setCollaborationsList((prev) => [
      { id: generatedId, ...formState },
      ...prev,
    ]);
    setIsAdding(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaboration) return;

    setCollaborationsList((prev) =>
      prev.map((item) =>
        item.id === selectedCollaboration.id ? { ...item, ...formState } : item,
      ),
    );
    setIsEditing(false);
  };

  const handleDeleteRecord = () => {
    if (!selectedCollaboration) return;
    setCollaborationsList((prev) =>
      prev.filter((item) => item.id !== selectedCollaboration.id),
    );
    setShowDeleteConfirm(false);
  };

  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-3 mt-1">
      {icon} <span>{text}</span>
    </div>
  );

  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold text-center min-w-[92px] inline-block tracking-wide uppercase";
    const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, "");

    switch (normalizedStatus) {
      case "completed":
        return (
          <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
            Completed
          </span>
        );
      case "ongoing":
      case "inprogress":
        return (
          <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
            In-Progress
          </span>
        );
      case "onhold":
        return (
          <span className={`${baseClass} bg-[#ffebee] text-[#c62828]`}>
            On hold
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-gray-100 text-gray-600`}>
            {status}
          </span>
        );
    }
  };

  const columns: Column<Collaboration>[] = [
    {
      key: "partner_organization",
      label: "Partner Organization",
      width: "20%",
      sortable: true,
      render: (c) => (
        <span className="font-bold text-[#11161a]">
          {c.partner_organization}
        </span>
      ),
    },
    { key: "lead", label: "Lead Coordinator", width: "14%", sortable: true },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (c) => renderStatusBadge(c.status),
    },
    { key: "start_date", label: "Start Date", width: "12%", sortable: true },
    {
      key: "documents_link",
      label: "Documents",
      width: "12%",
      render: (c) =>
        c.documents_link ? (
          <a
            href={c.documents_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" /> View Docs
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        ),
    },
    {
      key: "repository_link",
      label: "Repository Link",
      width: "15%",
      render: (c) =>
        c.repository_link ? (
          <a
            href={c.repository_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-black font-semibold bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-500" /> <span>Repo</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">No sync</span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      width: "10%",
      render: (c) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCollaboration(c);
              setFormState({
                partner_organization: c.partner_organization,
                lead: c.lead,
                start_date: c.start_date,
                status: c.status,
                documents_link: c.documents_link,
                notes: c.notes,
                repository_link: c.repository_link,
              });
              setIsEditing(true);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCollaboration(c);
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
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Collaborations
        </h1>
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full min-[480px]:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alliances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-[14px] outline-none focus:ring-2 focus:ring-[#4ec2bb]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFormState(emptyForm);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-[#4ec2bb] hover:bg-[#3fb0a9] text-white text-sm font-bold rounded-full shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Collaboration
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-6 h-6 text-[#2a7797]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            Alliances & Consortium Network
          </h2>
        </div>

        {collaborationsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No collaborations
            </span>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={displayedCollaborations}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filteredCollaborations.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* MATCHING REGISTRY MODAL OVERLAY WRAPPER */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 w-full h-full z-[100] flex items-center justify-center bg-[#172126]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#fffdf8] w-full max-w-xl rounded-[24px] border border-[rgba(23,33,38,0.08)] shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-6 pb-3 flex items-start justify-between border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-[#11161a]">
                  {isAdding
                    ? "Initialize Collaboration"
                    : "Modify Collaboration Record"}
                </h3>
                <p className="text-xs text-[#5c6e7a] mt-0.5">
                  {isAdding
                    ? "Specify operational scope parameters, allocate core research staff leaders, and connect runtime workspace parameters."
                    : "Update sequence alignment paths, client anchors, or re-assign platform milestones for the project registry entry."}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  isAdding ? setIsAdding(false) : setIsEditing(false)
                }
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {/* SECTION: IDENTITY */}
              <div>
                {renderSectionLabel(
                  <FlaskConical className="w-3.5 h-3.5 text-slate-400" />,
                  "Project Identity",
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#11161a]">
                    Partner Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.partner_organization}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        partner_organization: e.target.value,
                      })
                    }
                    placeholder="e.g., Philippine Genome Center"
                    className="w-full h-11 px-4 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none focus:ring-1 focus:ring-[#4ec2bb] focus:border-[#4ec2bb]"
                  />
                </div>
              </div>

              {/* SECTION: COORDINATION */}
              <div>
                {renderSectionLabel(
                  <User className="w-3.5 h-3.5 text-slate-400" />,
                  "Personnel Allocation & Operational Timeline",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#11161a]">
                      Lead Coordinator
                    </label>
                    <select
                      value={formState.lead}
                      onChange={(e) =>
                        setFormState({ ...formState, lead: e.target.value })
                      }
                      className="w-full h-11 px-3 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none"
                    >
                      {AVAILABLE_USERS.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#11161a]">
                      Commencement Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formState.start_date}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full h-11 px-4 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PROTOCOL */}
              <div>
                {renderSectionLabel(
                  <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />,
                  "Classification & Workflow Protocol",
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#11161a]">
                    Workflow Status State
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({ ...formState, status: e.target.value })
                    }
                    className="w-full h-11 px-3 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none"
                  >
                    {AVAILABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION: CONNECTIONS */}
              <div>
                {renderSectionLabel(
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />,
                  "Resource Asset Connections",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#11161a]">
                      Documents Vault (URL)
                    </label>
                    <input
                      type="url"
                      value={formState.documents_link}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          documents_link: e.target.value,
                        })
                      }
                      placeholder="https://drive.google.com/..."
                      className="w-full h-11 px-4 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#11161a]">
                      Repository Link Asset
                    </label>
                    <input
                      type="url"
                      value={formState.repository_link}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          repository_link: e.target.value,
                        })
                      }
                      placeholder="https://github.com/..."
                      className="w-full h-11 px-4 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: ANNOTATIONS */}
              <div>
                {renderSectionLabel(
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />,
                  "Supplemental Annotations",
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#11161a]">
                    Internal Context Notes
                  </label>
                  <textarea
                    value={formState.notes}
                    onChange={(e) =>
                      setFormState({ ...formState, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Provide high-level context notes regarding agreement status..."
                    className="w-full p-4 bg-[#fffdf8] rounded-xl border border-gray-200 text-[14px] outline-none resize-none shadow-sm focus:ring-1 focus:ring-[#4ec2bb]"
                  />
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    isAdding ? setIsAdding(false) : setIsEditing(false)
                  }
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 h-11 bg-[#4ec2bb] hover:bg-[#3fb0a9] text-white text-sm font-bold rounded-full shadow-sm transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isAdding ? "Add Collaboration" : "Commit Changes"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedCollaboration?.partner_organization || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />

      <ComplianceFooter />
    </div>
  );
}
