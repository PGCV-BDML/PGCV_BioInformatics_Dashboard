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
  SlidersHorizontal,
  Inbox,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/state-views";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import {
  buildClientPayload,
  createEmptyClientForm,
  mapClientRowToRecord,
  type ClientFormState,
  type ClientRecord,
  type SupabaseClientRow,
} from "@/lib/clients";
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import SlideOverModal, {
  renderSectionLabel,
} from "../../components/slidemodal";

const FIELD_CONFIG: Array<{
  key: keyof ClientFormState;
  label: string;
  type?: string;
  placeholder?: string;
  icon: typeof UserRound;
}> = [
  {
    key: "clientId",
    label: "Client ID",
    type: "text",
    placeholder: "CL-1001",
    icon: Hash,
  },
  {
    key: "clientName",
    label: "Client Name",
    type: "text",
    placeholder: "Enter full name",
    icon: UserRound,
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

  const visibleClients = useMemo(() => {
    const start = 0;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, itemsPerPage]);

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
      setIsSaving(true);

      try {
        const clientId = crypto.randomUUID();
        const payload = buildClientPayload(formState);

        let savedRow: SupabaseClientRow | null = null;

        try {
          savedRow = (await saveDataToDB(
            "client",
            clientId,
            payload,
          )) as SupabaseClientRow;
        } catch (error) {
          console.warn(
            "Primary client insert failed; trying legacy fallback.",
            error,
          );
          savedRow = (await saveDataToDB("client", clientId, {
            name: formState.clientName.trim(),
            affiliation: formState.affiliation.trim(),
            project_id: formState.projectId.trim() || null,
            designation: formState.designation.trim() || null,
            contact_info:
              [formState.emailAddress.trim()].filter(Boolean).join(" | ") ||
              formState.clientName.trim(),
            notes: `Project ID: ${formState.projectId.trim() || "N/A"}`,
            client_id: formState.clientId.trim(),
            email_address: formState.emailAddress.trim() || null,
          })) as SupabaseClientRow;
        }

        const nextClient = mapClientRowToRecord(
          savedRow ?? {
            id: clientId,
            ...payload,
          },
        );

        setClients((prev) => [nextClient, ...prev]);
        setFormState(createEmptyClientForm());
        showToast("Client added successfully.", "success");
      } catch (error) {
        console.error("Failed to add client", error);
        showToast("Failed to save client. Please try again.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [formState, showToast],
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
            onClick={() => {
              setFormState(createEmptyClientForm());
              setIsPanelOpen(true);
            }}
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
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No clients yet"
            description="Create your first client to get started."
          />
        ) : visibleClients.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching clients"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[960px]">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-surface shadow-sm">
              <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-[13px] font-semibold text-[#55656e] select-none">
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Client ID</th>
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Client Name</th>
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Project ID</th>
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Email</th>
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Affiliation</th>
                    <th className="px-4 py-3.5 bg-[#2A7797]/10">Designation</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] text-[#2c3a42]">
                  {visibleClients.map((client) => (
                    <tr
                      key={client.id}
                      className="odd:bg-surface even:bg-[#F6F4EE]/40 border-b border-gray-200/40 transition-colors hover:bg-[#F1EFE8]/70"
                    >
                      <td className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                        {client.clientId || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <div className="font-semibold text-slate-800">
                          {client.clientName || "—"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {client.affiliation || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                        {client.projectId || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                        {client.emailAddress || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                        {client.affiliation || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
                        {client.designation || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SlideOverModal
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Add New Client"
        subtitle="Capture client registration details and project affiliation information."
        onSubmit={handleSubmit}
        submitLabel="Save"
        isSaving={isSaving}
        submitDisabled={isSaving}
      >
        <div className="space-y-2.5">
          {renderSectionLabel(
            <UserRound className="w-3.5 h-3.5" />,
            "Client Profile",
          )}

          {FIELD_CONFIG.map(
            ({ key, label, type = "text", placeholder, icon: Icon }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`client-${key}`}
                  className="text-xs font-bold text-slate-800 ml-1 font-aileron"
                >
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id={`client-${key}`}
                    name={key}
                    type={type}
                    value={formState[key]}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                    required={true}
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
