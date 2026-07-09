"use client";

import { useState, useMemo, useEffect } from "react";
// Import statement remains intact; uncomment or keep prepared for final integration
// import { supabase } from "@/lib/supabase";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import CollaborationModal from "../../components/collaborationmodal";
import { CollaborationRow, UserOption } from "../../../types/database";
import {
  Search,
  Users2,
  FileText,
  Edit3,
  Trash2,
  Plus,
  Inbox,
} from "lucide-react";

type CollaborationFormState = {
  partner_org: string;
  lead_user_id: string;
  documents_link: string;
  notes: string;
};

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM: CollaborationFormState = {
  partner_org: "",
  lead_user_id: "",
  documents_link: "",
  notes: "",
};

export default function CollaborationsPage() {
  // --- STATE MANAGEMENT ---
  const [collaborationsList, setCollaborationsList] = useState<
    CollaborationRow[]
  >([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] =
    useState<CollaborationFormState>(EMPTY_FORM);

  // Sorting state configuration
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CollaborationRow;
    direction: "asc" | "desc";
  } | null>(null);

  // Modal display controllers
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] =
    useState<CollaborationRow | null>(null);

  // --- 1. DATA INITIALIZATION (PREPARED FOR SUPABASE) ---
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        // [SUPABASE DISCONNECT PREPARATION]
        // Replace fake data blocks below with actual supabase queries later:
        // const { data: usersData } = await supabase.from("users").select("id, name");
        // const { data: collabData } = await supabase.from("collaboration").select(...);

        const mockUsers: UserOption[] = [
          { id: "u1", name: "Alex Jones" },
          { id: "u2", name: "Maria Santos" },
        ];

        const mockCollaborations: CollaborationRow[] = [
          {
            id: "collab-1",
            partner_org: "Philippine Genome Center",
            lead_user_id: "u1",
            start_date: "2026-01-15",
            status: "ongoing",
            documents: ["https://drive.google.com"],
            notes: "Primary repository linked",
            user: { name: "Alex Jones" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        setAvailableUsers(mockUsers);
        setCollaborationsList(mockCollaborations);
      } catch (error) {
        console.error("Error launching client data layer:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Sync form default leader whenever user options become available
  useEffect(() => {
    if (availableUsers.length > 0 && !formState.lead_user_id) {
      setFormState((prev) => ({ ...prev, lead_user_id: availableUsers[0].id }));
    }
  }, [availableUsers, formState.lead_user_id]);

  // Reset pagination indexes dynamically during lookups
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- 2. CLIENT HANDLERS & INPUT UTILITIES ---
  const handleInputChange = (
    key: keyof CollaborationFormState,
    value: string,
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
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

  // --- 3. MUTATION LAYERS (PREPARED FOR SUPABASE CONNECTIVITY) ---
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newRecord: CollaborationRow = {
      id: `local-id-${Date.now()}`,
      partner_org: formState.partner_org,
      lead_user_id: formState.lead_user_id,
      start_date: new Date().toISOString().split("T")[0],
      status: "ongoing",
      documents: formState.documents_link ? [formState.documents_link] : null,
      notes: formState.notes || null,
      user: {
        name:
          availableUsers.find((u) => u.id === formState.lead_user_id)?.name ||
          "Unassigned",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // [SUPABASE INSERT REGION]
    // const { data, error } = await supabase.from("collaboration").insert([...]).select().single();
    // Use data payload returned by database instead of local push logic below.

    setCollaborationsList((prev) => [newRecord, ...prev]);
    setIsAdding(false);
    setFormState(EMPTY_FORM);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaboration) return;

    // [SUPABASE UPDATE REGION]
    // const { data, error } = await supabase.from("collaboration").update({...}).eq("id", id);

    setCollaborationsList((prev) =>
      prev.map((item) =>
        item.id === selectedCollaboration.id
          ? {
              ...item,
              partner_org: formState.partner_org,
              lead_user_id: formState.lead_user_id,
              documents: formState.documents_link
                ? [formState.documents_link]
                : null,
              notes: formState.notes || null,
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

    // [SUPABASE DELETE REGION]
    // const { error } = await supabase.from("collaboration").delete().eq("id", id);

    setCollaborationsList((prev) =>
      prev.filter((item) => item.id !== selectedCollaboration.id),
    );
    setShowDeleteConfirm(false);
  };

  // --- 4. COMPUTED CLIENT MEMOS ---
  const filteredCollaborations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return collaborationsList;

    return collaborationsList.filter((collab) => {
      return (
        collab.partner_org.toLowerCase().includes(query) ||
        (collab.user?.name || "").toLowerCase().includes(query) ||
        (collab.status || "").toLowerCase().includes(query) ||
        (collab.notes || "").toLowerCase().includes(query)
      );
    });
  }, [searchQuery, collaborationsList]);

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

  // --- 5. RENDER CHUNKS & COLUMN SCHEMAS ---
  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold text-center min-w-[92px] inline-block tracking-wide uppercase";
    if (status === "finished")
      return (
        <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
          Completed
        </span>
      );
    if (status === "ongoing")
      return (
        <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
          In-Progress
        </span>
      );
    return (
      <span className={`${baseClass} bg-gray-100 text-gray-600`}>
        {status || "For approval"}
      </span>
    );
  };

  const columns: Column<CollaborationRow>[] = [
    {
      key: "partner_org",
      label: "Partner Organization",
      width: "20%",
      sortable: true,
      render: (c) => (
        <span className="font-bold text-[#11161a]">{c.partner_org}</span>
      ),
    },
    {
      key: "lead_user_id",
      label: "Lead Coordinator",
      width: "14%",
      sortable: true,
      render: (c) => <span>{c.user?.name || "Unassigned"}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (c) => renderStatusBadge(c.status),
    },
    {
      key: "start_date",
      label: "Start Date",
      width: "12%",
      sortable: true,
      render: (c) => <span>{c.start_date || "-"}</span>,
    },
    {
      key: "documents",
      label: "Documents",
      width: "12%",
      render: (c) => {
        const primaryDoc =
          c.documents && c.documents.length > 0 ? c.documents[0] : "";
        return primaryDoc ? (
          <a
            href={primaryDoc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" /> View Docs
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        );
      },
    },
    {
      key: "notes",
      label: "Notes / Repo Link",
      width: "15%",
      render: (c) =>
        c.notes ? (
          <span className="text-xs text-slate-700 font-medium truncate max-w-[180px] inline-block">
            {c.notes}
          </span>
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
                partner_org: c.partner_org,
                lead_user_id: c.lead_user_id,
                documents_link:
                  c.documents && c.documents.length > 0 ? c.documents[0] : "",
                notes: c.notes || "",
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
      {/* Top Controls Header */}
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
              setFormState({
                ...EMPTY_FORM,
                lead_user_id: availableUsers[0]?.id || "",
              });
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-full shadow-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Collaboration
          </button>
        </div>
      </div>

      {/* Main Table Interface Box */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Users2 className="w-6 h-6 text-[#333333]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            List of Collaborations
          </h2>
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
          <>
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
          </>
        )}
      </div>

      {/* Extracted Shared Form Modal */}
      <CollaborationModal
        isOpen={isAdding || isEditing}
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

      <ComplianceFooter />
    </div>
  );
}
