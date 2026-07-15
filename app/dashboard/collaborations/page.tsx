"use client";

import { useState, useMemo, useEffect } from "react";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import CollaborationSidebar from "../../components/collaborationmodal";
import { CollaborationRow, UserOption } from "../../../types/database";
import {
  Search,
  Users2,
  FileText,
  Edit3,
  Trash2,
  Plus,
  Inbox,
  GitBranch,
  ChevronDown,
} from "lucide-react";

//Database imports
import { getCollabFromDB, getUsersFromDB, saveCollabToDB } from "@/lib/supabase";

type CollaborationFormState = {
  partner_org: string;
  lead_user_id: string;
  documents_links: string[];
  notes: string;
  start_date: string;
  status: string;
  repository_link: string;
};

const ITEMS_PER_PAGE = 10;
const EMPTY_FORM: CollaborationFormState = {
  partner_org: "",
  lead_user_id: "",
  documents_links: [""],
  notes: "",
  start_date: "",
  status: "ongoing",
  repository_link: "",
};

const FILTER_OPTIONS = [
  { value: "All", label: "All" },
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "finished", label: "Finished" },
];

const STATUS_OPTIONS = [
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "finished", label: "Finished" },
];

export default function CollaborationsPage() {
  const [collaborationsList, setCollaborationsList] = useState<
    CollaborationRow[]
  >([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] =
    useState<CollaborationFormState>(EMPTY_FORM);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CollaborationRow;
    direction: "asc" | "desc";
  } | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] =
    useState<CollaborationRow | null>(null);

  const isPanelOpen = isAdding || isEditing;

  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isPanelOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isPanelOpen]);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [users, collaborations] = await Promise.all([
          getUsersFromDB(),
          getCollabFromDB(),
        ]);
        setAvailableUsers(users);
        setCollaborationsList(collaborations);
      } catch (error) {
        console.error("Error launching client data layer:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (availableUsers.length > 0 && !formState.lead_user_id) {
      setFormState(
        (prev) => ({ ...prev, lead_user_id: availableUsers[0].id }) as any,
      );
    }
  }, [availableUsers, formState.lead_user_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const handleInputChange = (key: keyof CollaborationFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  //Save changes to DB and change the value of collaborations list to update what is displayed
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await saveCollabToDB(id, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      setCollaborationsList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
              ...item,
              status: newStatus as CollaborationRow["status"],
              updated_at: new Date().toISOString(),
            }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update collaboration status:", error);
    }
  };

  const handleSort = (key: keyof CollaborationRow) => {
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
    const cleanDocs = formState.documents_links.filter((l) => l.trim() !== "");
    const id = crypto.randomUUID();

    const newRecord: CollaborationRow = {
      id,
      partner_org: formState.partner_org,
      lead_user_id: formState.lead_user_id,
      start_date:
        formState.start_date || new Date().toISOString().split("T")[0],
      status: formState.status as CollaborationRow["status"],
      documents: cleanDocs.length > 0 ? cleanDocs : null,
      notes: formState.notes || null,
      repository_link: formState.repository_link || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await saveCollabToDB(id, newRecord);
      setCollaborationsList((prev) => [newRecord, ...prev]);
    } catch (error) {
      console.error("Error checking collab data:", error);
      return;
    }

    setIsAdding(false);
    setFormState(EMPTY_FORM);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaboration) return;
    const cleanDocs = formState.documents_links.filter((l) => l.trim() !== "");

    setCollaborationsList((prev) =>
      prev.map((item) =>
        item.id === selectedCollaboration.id
          ? {
            ...item,
            partner_org: formState.partner_org,
            lead_user_id: formState.lead_user_id,
            start_date: formState.start_date,
            status: formState.status as CollaborationRow["status"],
            documents: cleanDocs.length > 0 ? cleanDocs : null,
            notes: formState.notes || null,
            // Add this line to update the repository link:
            repository_link: formState.repository_link || "",
            user: {
              name:
                availableUsers.find((u) => u.id === formState.lead_user_id)
                  ?.name || "Unassigned",
            },
            updated_at: new Date().toISOString(),
          }
          : item,
      ),
    );
    setIsEditing(false);
    setFormState(EMPTY_FORM);
  };

  const handleDeleteRecord = async () => {
    if (!selectedCollaboration) return;
    setCollaborationsList((prev) =>
      prev.filter((item) => item.id !== selectedCollaboration.id),
    );
    setShowDeleteConfirm(false);
  };

  const filteredCollaborations = useMemo(() => {
    let records = collaborationsList;

    if (activeFilter !== "All") {
      records = records.filter(
        (collab) => (collab.status || "") === activeFilter,
      );
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return records;

    return records.filter((collab) => {
      return (
        collab.partner_org.toLowerCase().includes(query) ||
        (collab.user?.name || "").toLowerCase().includes(query) ||
        (collab.status || "").toLowerCase().includes(query) ||
        (collab.notes || "").toLowerCase().includes(query)
      );
    });
  }, [searchQuery, collaborationsList, activeFilter]);

  const sortedCollaborations = useMemo(() => {
    const sortableItems = [...filteredCollaborations];
    if (!sortConfig) return sortableItems;
    return sortableItems.sort((a, b) => {
      let valA =
        sortConfig.key === "lead_user_id"
          ? a.user?.name || ""
          : (a[sortConfig.key] ?? "");
      let valB =
        sortConfig.key === "lead_user_id"
          ? b.user?.name || ""
          : (b[sortConfig.key] ?? "");
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
      if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredCollaborations, sortConfig]);

  const displayedCollaborations = useMemo(() => {
    const startOffset = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedCollaborations.slice(
      startOffset,
      startOffset + ITEMS_PER_PAGE,
    );
  }, [sortedCollaborations, currentPage]);

  const renderStatusDropdown = (id: string, currentStatus: string) => {
    const status = currentStatus || "for_approval";

    let colorClasses = "bg-gray-100 text-gray-700";
    let chevronClass = "text-gray-500";

    if (status === "finished") {
      colorClasses = "bg-[#eaf7ee] text-[#2e7d32]";
      chevronClass = "text-[#2e7d32]";
    } else if (status === "ongoing") {
      colorClasses = "bg-[#fffde7] text-[#f57f17]";
      chevronClass = "text-[#f57f17]";
    } else if (status === "for_approval") {
      colorClasses = "bg-blue-50 text-blue-700";
      chevronClass = "text-blue-700";
    }

    return (
      <div className="relative flex items-center justify-center w-full max-w-[140px]">
        <select
          value={status}
          onChange={(e) => handleStatusChange(id, e.target.value)}
          className={`pl-1 pr-6 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 text-center transition-all appearance-none whitespace-nowrap w-full ${colorClasses}`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-white text-slate-800 normal-case text-xs"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${chevronClass}`}
        />
      </div>
    );
  };

  const columns: Column<CollaborationRow>[] = [
    {
      key: "partner_org",
      label: "Partner Organization",
      width: "22%",
      sortable: true,
      render: (c) => (
        <span
          className="font-bold text-[#11161a] block truncate max-w-[150px] xl:max-w-[180px]"
          title={c.partner_org}
        >
          {c.partner_org}
        </span>
      ),
    },
    {
      key: "lead_user_id",
      label: "Lead Coordinator",
      width: "15%",
      sortable: true,
      render: (c) => (
        <span
          className="block truncate max-w-[100px] xl:max-w-[130px]"
          title={c.user?.name || "Unassigned"}
        >
          {c.user?.name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "15%",
      render: (c) => (
        <div className="flex items-center justify-center w-full">
          {renderStatusDropdown(c.id, c.status)}
        </div>
      ),
    },
    {
      key: "start_date",
      label: "Start Date",
      width: "11%",
      sortable: true,
      render: (c) => (
        <span className="text-xs text-slate-600">{c.start_date || "-"}</span>
      ),
    },
    {
      key: "documents",
      label: "Documents",
      width: "12%",
      render: (c) => {
        return c.documents && c.documents.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {c.documents.map((doc, index) => (
              <a
                key={index}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                title={doc}
              >
                <FileText className="w-3 h-3 flex-shrink-0" /> Doc {index + 1}
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
      width: "12%",
      render: (c) =>
        c.notes ? (
          <span
            className="text-xs text-slate-500 font-medium truncate max-w-[100px] xl:max-w-[130px] block"
            title={c.notes}
          >
            {c.notes}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">-</span>
        ),
    },
    {
      key: "reposityory_link" as any,
      label: "Repository Link",
      width: "14%",
      render: (c) => {
        const repoUrl = (c as any).repository_link || "";
        return repoUrl ? (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted truncate max-w-[120px]"
            title={repoUrl}
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-500" /> Repo Link
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">-</span>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      width: "10%",
      render: (c) => (
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCollaboration(c);
              setFormState({
                partner_org: c.partner_org,
                lead_user_id: c.lead_user_id,
                documents_links:
                  c.documents && c.documents.length > 0 ? c.documents : [""],
                notes: c.notes || "",
                start_date: c.start_date || "",
                status: c.status || "ongoing",
                repository_link: (c as any).repository_link || "",
              });
              setIsEditing(true);
            }}
            className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors shadow-sm hover:shadow"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCollaboration(c);
              setShowDeleteConfirm(true);
            }}
            className="p-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors shadow-sm hover:shadow"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div
      className={`space-y-6 mx-auto font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
        }`}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Collaborations Page
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Collaborations
          </h1>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search collaborations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus:shadow-[0_4px_16px_rgba(78,194,187,0.15)] transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFormState({
                ...EMPTY_FORM,
                lead_user_id: availableUsers[0]?.id || "",
              });
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Collaboration
          </button>
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Collaborations
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar max-w-full">
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActiveFilter(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all duration-200 whitespace-nowrap ${isActive
                    ? "bg-white text-[#2a7797] font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm font-medium text-slate-400 animate-pulse">
              Loading database records...
            </span>
          </div>
        ) : collaborationsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No collaborations discovered
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[920px]">
            <DataTable
              columns={columns}
              data={displayedCollaborations}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filteredCollaborations.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <CollaborationSidebar
        isOpen={isPanelOpen}
        isAdding={isAdding}
        formState={formState}
        availableUsers={availableUsers}
        onClose={() => {
          setIsAdding(false);
          setIsEditing(false);
        }}
        onChange={handleInputChange}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedCollaboration?.partner_org || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}
