"use client";

import { useState, useMemo, useEffect } from "react";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import { supabase } from "@/lib/supabase"; // Import initialized Supabase client instance
import {
  Search,
  Users2,
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
  id: string; // Changed to string since database primary keys are UUIDs
  partner_organization: string;
  lead: string;
  status: string;
  start_date: string;
  documents_link: string;
  repository_link: string;
};

const AVAILABLE_USERS = [
  "Dr. Analyst Cruz",
  "Prof. Lopez",
  "Engr. Santos",
  "Dr. Cruz",
  "Prof. Torres",
];

// Aligned with backend Enum strings for compatibility
const AVAILABLE_STATUSES = ["ongoing", "finished", "for_approval"];

export default function CollaborationsPage() {
  const [collaborationsList, setCollaborationsList] = useState<Collaboration[]>(
    [],
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
    start_date: new Date().toISOString().split("T")[0],
    status: "ongoing",
    documents_link: "",
    repository_link: "",
  };
  const [formState, setFormState] =
    useState<Omit<Collaboration, "id">>(emptyForm);

  // Fetch helper wrapper
  async function fetchCollaborations() {
    const { data, error } = await supabase
      .from("collaboration")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const structuredData: Collaboration[] = data.map((item: any) => ({
        id: item.id,
        // Fallback compatibility safely matching your db schema mapping
        partner_organization:
          item.partner_org || item.partner_organization || "",
        lead: item.lead || "Dr. Analyst Cruz",
        status: item.status || "ongoing",
        start_date: item.start_date || "",
        documents_link:
          item.documents_link || (item.documents && item.documents[0]) || "",
        repository_link: item.repository_link || item.notes || "",
      }));
      setCollaborationsList(structuredData);
    } else if (error) {
      console.error("Error fetching records:", error.message);
    }
  }

  // Fetch from live Supabase DB on initialization
  useEffect(() => {
    fetchCollaborations();
  }, []);

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map fields accurately to match database target definitions
    const payload = {
      partner_org: formState.partner_organization,
      lead_user_id: "00000000-0000-0000-0000-000000000000", // temporary static valid UUID string if referencing user table, or update database schema
      partner_organization: formState.partner_organization,
      lead: formState.lead,
      start_date: formState.start_date || null,
      status: formState.status,
      documents_link: formState.documents_link,
      repository_link: formState.repository_link,
      documents: formState.documents_link ? [formState.documents_link] : [],
    };

    const { data, error } = await supabase
      .from("collaboration")
      .insert([payload])
      .select();

    if (!error && data && data.length > 0) {
      const insertedItem: Collaboration = {
        id: data[0].id,
        partner_organization:
          data[0].partner_organization || data[0].partner_org || "",
        lead: data[0].lead || formState.lead,
        status: data[0].status || "ongoing",
        start_date: data[0].start_date || "",
        documents_link:
          data[0].documents_link ||
          (data[0].documents && data[0].documents[0]) ||
          "",
        repository_link: data[0].repository_link || "",
      };

      setCollaborationsList((prev) => [insertedItem, ...prev]);
      setIsAdding(false);
      setFormState(emptyForm);
    } else if (error) {
      alert(`Failed to save collaboration: ${error.message}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaboration) return;

    const payload = {
      partner_org: formState.partner_organization,
      partner_organization: formState.partner_organization,
      lead: formState.lead,
      start_date: formState.start_date || null,
      status: formState.status,
      documents_link: formState.documents_link,
      repository_link: formState.repository_link,
      documents: formState.documents_link ? [formState.documents_link] : [],
    };

    const { error } = await supabase
      .from("collaboration")
      .update(payload)
      .eq("id", selectedCollaboration.id);

    if (!error) {
      setCollaborationsList((prev) =>
        prev.map((item) =>
          item.id === selectedCollaboration.id
            ? { ...item, ...formState }
            : item,
        ),
      );
      setIsEditing(false);
      setSelectedCollaboration(null);
    } else {
      alert(`Failed to update collaboration: ${error.message}`);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedCollaboration) return;

    const { error } = await supabase
      .from("collaboration")
      .delete()
      .eq("id", selectedCollaboration.id);

    if (!error) {
      setCollaborationsList((prev) =>
        prev.filter((item) => item.id !== selectedCollaboration.id),
      );
      setShowDeleteConfirm(false);
      setSelectedCollaboration(null);
    } else {
      alert(`Failed to delete record: ${error.message}`);
    }
  };

  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-3 mt-1">
      {icon} <span>{text}</span>
    </div>
  );

  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold text-center min-w-[92px] inline-block tracking-wide uppercase";
    const normalizedStatus = status.toLowerCase().replace(/[\s-_]/g, "");

    switch (normalizedStatus) {
      case "finished":
      case "completed":
        return (
          <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
            Finished
          </span>
        );
      case "ongoing":
      case "inprogress":
        return (
          <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
            Ongoing
          </span>
        );
      case "forapproval":
        return (
          <span className={`${baseClass} bg-[#f1f5f9] text-slate-600`}>
            For Approval
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
          <span className="text-xs text-slate-400 italic">-</span>
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
      {/* Fixed Layout Header View */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - List
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
            Collaborations
          </h1>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full min-[480px]:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search collaborations..."
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
            className="flex items-center justify-center gap-2 h-11 px-5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-full shadow-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Collaboration
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Users2 className="w-6 h-6 text-[#333333]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            List of Collaborations
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

      {/* ADD / EDIT MODAL */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2a7797] via-[#4ec2bb] to-[#2a7797]" />

            <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-[#ffffff]">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isAdding ? "Add New Collaboration" : "Modify Collaboration"}
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-medium font-aileron">
                  {isAdding
                    ? "Define the partner organization, assign a lead coordinator, and link related resources."
                    : "Update partner details, timeline, status, or linked resources."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  isAdding ? setIsAdding(false) : setIsEditing(false);
                  setSelectedCollaboration(null);
                }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
              className="bg-[#ffffff] flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar"
            >
              <div className="space-y-3">
                {renderSectionLabel(
                  <FlaskConical className="w-3.5 h-3.5" />,
                  "Partner Organization",
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-800 ml-1">
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
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {renderSectionLabel(
                  <User className="w-3.5 h-3.5" />,
                  "Lead Coordinator & Start Date",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Lead Coordinator
                    </label>
                    <select
                      value={formState.lead}
                      onChange={(e) =>
                        setFormState({ ...formState, lead: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    >
                      {AVAILABLE_USERS.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-slate-800 ml-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <label className="text-sm font-bold">Start Date</label>
                    </div>
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
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {renderSectionLabel(
                  <ClipboardCheck className="w-3.5 h-3.5" />,
                  "Status",
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-800 ml-1">
                    Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({ ...formState, status: e.target.value })
                    }
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                  >
                    {AVAILABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status === "ongoing"
                          ? "Ongoing"
                          : status === "finished"
                            ? "Finished"
                            : "For Approval"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
                {renderSectionLabel(
                  <Link2 className="w-3.5 h-3.5" />,
                  "Documents Link & Repository Link",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Documents Link
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
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Repository Link
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
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 pb-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    isAdding ? setIsAdding(false) : setIsEditing(false);
                    setSelectedCollaboration(null);
                  }}
                  className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 h-12 px-6 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-200 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isAdding ? "Save Collaboration" : "Save Changes"}
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
