"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  UserRound,
  Mail,
  Building2,
  Briefcase,
  Hash,
  FolderOpen,
  Users,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Inbox,
  Edit3,
} from "lucide-react";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/state-views";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import DataTable, { Column } from "../../components/datatable";
import { TruncatedText } from "../../components/cell-tooltip";
import Pagination from "../../components/pagination";
import {
  compareClientIds,
  createEmptyClientForm,
  formFromClientRecord,
  mapClientRowToRecord,
  saveExistingClient,
  saveNewClient,
  type ClientFormState,
  type ClientRecord,
  type SupabaseClientRow,
} from "@/lib/clients";
import { describeSaveError } from "@/lib/db-errors";
import { getRowsFromDB, supabase } from "@/lib/supabase";
import { useTableState } from "@/hooks/useTableState";
import SlideOverModal, {
  renderSectionLabel,
} from "../../components/slidemodal";

const FIELD_CONFIG: Array<{
  key: keyof ClientFormState;
  label: string;
  type?: string;
  placeholder?: string;
  icon: typeof UserRound;
  required?: boolean;
}> = [
  {
    key: "clientId",
    label: "Client ID",
    type: "text",
    placeholder: "Leave blank to auto-generate",
    icon: Hash,
  },
  {
    key: "clientName",
    label: "Client Name",
    type: "text",
    placeholder: "Enter full name",
    icon: UserRound,
    required: true,
  },
  {
    key: "projectId",
    label: "Project ID",
    type: "text",
    placeholder: "PRJ-204",
    icon: FolderOpen,
  },
  {
    key: "emailAddress",
    label: "Email Address",
    type: "email",
    placeholder: "name@example.org",
    icon: Mail,
  },
  {
    key: "affiliation",
    label: "Affiliation",
    type: "text",
    placeholder: "Institution / Office",
    icon: Building2,
    required: true,
  },
  {
    key: "designation",
    label: "Designation",
    type: "text",
    placeholder: "Research Scientist",
    icon: Briefcase,
  },
];

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q")?.trim() ?? "";
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [formState, setFormState] = useState<ClientFormState>(
    createEmptyClientForm(),
  );
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

  useEffect(() => {
    setSearchQuery(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const rows = await getRowsFromDB<SupabaseClientRow>("client");
        if (!isMounted) return;

        setClients(rows.map(mapClientRowToRecord));
      } catch (error) {
        console.error("Failed to load clients", error);
        if (isMounted) {
          setLoadError("Couldn't load client records right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const clientWriter = useMemo(
    () => ({
      insert: async (row: Record<string, unknown>) => {
        const { data, error } = await supabase
          .from("client")
          .insert(row)
          .select()
          .maybeSingle();
        if (error) throw error;
        return (data ?? row) as SupabaseClientRow;
      },
      update: async (id: string, patch: Record<string, unknown>) => {
        const { data, error } = await supabase
          .from("client")
          .update(patch)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data as SupabaseClientRow | null;
      },
    }),
    [],
  );

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setEditingClient(null);
    setFormState(createEmptyClientForm());
  }, []);

  const openAddPanel = useCallback(() => {
    setEditingClient(null);
    setFormState(createEmptyClientForm());
    setIsPanelOpen(true);
  }, []);

  const openEditPanel = useCallback((client: ClientRecord) => {
    setEditingClient(client);
    setFormState(formFromClientRecord(client));
    setIsPanelOpen(true);
  }, []);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      Object.values(client).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [clients, searchQuery]);

  const {
    displayed: visibleClients,
    currentPage,
    setCurrentPage,
    sortConfig,
    handleSort,
    totalItems,
  } = useTableState<ClientRecord>({
    items: filteredClients,
    itemsPerPage,
    resetKey: searchQuery,
    initialSort: { key: "clientId", direction: "desc" },
    customSorters: {
      clientId: (a, b) => compareClientIds(a.clientId, b.clientId),
    },
  });

  const columns: Column<ClientRecord>[] = useMemo(
    () => [
      // Every column supplies `render`, and DataTable only auto-wraps cells
      // that don't — so each one opts into TruncatedText explicitly to get the
      // full value on hover. The columns are narrow and most values clip.
      {
        key: "clientId",
        label: "Client ID",
        width: "14%",
        sortable: true,
        render: (c) => (
          <TruncatedText text={c.clientId} className="font-mono text-[11px]" />
        ),
      },
      {
        key: "clientName",
        label: "Client Name",
        width: "20%",
        sortable: true,
        render: (c) => (
          <TruncatedText
            text={c.clientName}
            className="font-semibold text-slate-800"
          />
        ),
      },
      {
        key: "projectId",
        label: "Project ID",
        width: "14%",
        sortable: true,
        render: (c) => (
          <TruncatedText text={c.projectId} className="font-mono text-[11px]" />
        ),
      },
      {
        key: "emailAddress",
        label: "Email",
        width: "18%",
        sortable: true,
        render: (c) => <TruncatedText text={c.emailAddress} />,
      },
      {
        key: "affiliation",
        label: "Affiliation",
        width: "18%",
        sortable: true,
        render: (c) => <TruncatedText text={c.affiliation} multiline />,
      },
      {
        key: "designation",
        label: "Designation",
        width: "14%",
        sortable: true,
        render: (c) => <TruncatedText text={c.designation} multiline />,
      },
      {
        key: "actions",
        label: "Actions",
        width: "8%",
        render: (c) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => openEditPanel(c)}
              className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all duration-200 shadow-sm"
              title="Edit client"
            >
              <Edit3 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
              <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-slate-400" />
            </button>
          </div>
        ),
      },
    ],
    [openEditPanel],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormState((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const clientName = formState.clientName.trim();
      const affiliation = formState.affiliation.trim();
      if (!clientName || !affiliation) {
        showToast("Client name and affiliation are required.", "error");
        return;
      }

      const typedClientId = formState.clientId.trim();
      if (
        typedClientId &&
        clients.some(
          (client) =>
            client.id !== editingClient?.id &&
            client.clientId.trim().toLowerCase() === typedClientId.toLowerCase(),
        )
      ) {
        showToast("A client with this ID already exists.", "error");
        return;
      }

      setIsSaving(true);

      try {
        if (editingClient) {
          const savedRow = await saveExistingClient(
            editingClient.id,
            formState,
            editingClient,
            clientWriter,
          );
          const nextClient = {
            ...mapClientRowToRecord(savedRow),
            id: editingClient.id,
            createdAt: editingClient.createdAt,
          };
          setClients((prev) =>
            prev.map((client) =>
              client.id === editingClient.id ? nextClient : client,
            ),
          );
          closePanel();
          showToast("Client updated successfully.", "success");
          return;
        }

        const savedRow = await saveNewClient(
          formState,
          clients.map((client) => client.clientId),
          clientWriter,
        );

        const nextClient = mapClientRowToRecord(savedRow);

        setClients((prev) => [nextClient, ...prev]);
        closePanel();
        showToast("Client added successfully.", "success");
      } catch (error) {
        console.error(
          editingClient ? "Failed to update client" : "Failed to add client",
          error,
        );
        showToast(describeSaveError(error, "client"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [clients, clientWriter, closePanel, editingClient, formState, showToast],
  );

  return (
    <div
      className={`space-y-8 mx-auto font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-[#2a7797] font-semibold">Clients</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Clients
          </h1>
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Maintain client records and contact details for ongoing projects.
          </p>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full min-[480px]:w-44">
            <div className="relative flex items-center bg-surface rounded-full border border-gray-200 px-3 h-10 shadow-sm w-full">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent text-xs text-slate-700 outline-none pr-5 cursor-pointer font-medium appearance-none w-full"
              >
                <option value={5}>Show 5 rows</option>
                <option value={10}>Show 10 rows</option>
                <option value={20}>Show 20 rows</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-slate-500" />
            </div>
          </div>
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              aria-label="Search clients"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-surface rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
            />
          </div>
          <button
            type="button"
            onClick={openAddPanel}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Client
          </button>
        </div>
      </div>

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Clients
            </h2>
          </div>
        </div>

        {isLoading ? (
          <LoadingState variant="skeleton" message="Loading clients…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No clients yet"
            description="Create your first client to get started."
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching clients"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={visibleClients}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <SlideOverModal
        isOpen={isPanelOpen}
        onClose={closePanel}
        title={editingClient ? "Edit Client" : "Add New Client"}
        subtitle={
          editingClient
            ? "Update this client's registration details and project affiliation."
            : "Capture client registration details and project affiliation information."
        }
        onSubmit={handleSubmit}
        submitLabel={editingClient ? "Save Changes" : "Save"}
        isSaving={isSaving}
        submitDisabled={isSaving}
      >
        <div className="space-y-2.5">
          {renderSectionLabel(
            <UserRound className="w-3.5 h-3.5" />,
            "Client Profile",
          )}

          {FIELD_CONFIG.map(
            ({
              key,
              label,
              type = "text",
              placeholder,
              icon: Icon,
              required = false,
            }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`client-${key}`}
                  className="text-xs font-bold text-slate-800 ml-1 font-aileron"
                >
                  {label}
                  {required ? (
                    <span className="text-red-500 font-bold"> *</span>
                  ) : null}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id={`client-${key}`}
                    name={key}
                    type={type}
                    value={formState[key]}
                    onChange={handleInputChange}
                    placeholder={
                      key === "clientId" && editingClient
                        ? "Existing Client ID"
                        : placeholder
                    }
                    className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                    required={required}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </SlideOverModal>
    </div>
  );
}
