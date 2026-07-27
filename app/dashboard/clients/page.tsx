"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  UserRound,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  Hash,
  FolderOpen,
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
  createEmptyClientForm,
  createClientRecord,
  type ClientFormState,
  type ClientRecord,
} from "@/lib/clients";

const clientRowsSeed: ClientRecord[] = [
  {
    id: "client-001",
    createdAt: new Date().toISOString(),
    clientId: "CL-1001",
    clientName: "Dr. Maria Santos",
    projectId: "PRJ-204",
    emailAddress: "maria.santos@example.org",
    sex: "Female",
    mobileNumber: "+63 917 123 4567",
    affiliation: "Philippine Genome Center Visayas",
    affiliationAddress: "Diliman, Quezon City",
    designation: "Research Scientist",
  },
  {
    id: "client-002",
    createdAt: new Date().toISOString(),
    clientId: "CL-1002",
    clientName: "Prof. Daniel Cruz",
    projectId: "PRJ-205",
    emailAddress: "daniel.cruz@example.org",
    sex: "Male",
    mobileNumber: "+63 920 987 6543",
    affiliation: "UP Visayas",
    affiliationAddress: "Iloilo City",
    designation: "Professor",
  },
];

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
    key: "sex",
    label: "Sex",
    type: "text",
    placeholder: "Female",
    icon: UserRound,
  },
  {
    key: "mobileNumber",
    label: "Mobile Number",
    type: "tel",
    placeholder: "+63 9XX XXX XXXX",
    icon: Phone,
  },
  {
    key: "affiliation",
    label: "Affiliation",
    type: "text",
    placeholder: "Institution / Office",
    icon: Building2,
  },
  {
    key: "affiliationAddress",
    label: "Affiliation Address",
    type: "text",
    placeholder: "Complete address",
    icon: MapPin,
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
  const [clients, setClients] = useState<ClientRecord[]>(clientRowsSeed);
  const [formState, setFormState] = useState<ClientFormState>(
    createEmptyClientForm(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading] = useState(false);
  const [loadError] = useState<string | null>(null);
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  useEffect(() => {
    toggleSidebar(false);
  }, [toggleSidebar]);

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
        const nextClient = createClientRecord(formState);
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
    <div className="space-y-8 max-w-[1400px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={[
          { label: "Dashboard" },
          { label: "Clients", href: "/dashboard/clients" },
        ]}
        title="Clients"
        subtitle="Maintain client records and contact details for ongoing projects."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-slate-300/70 bg-surface p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-[#2a7797] font-quicksand">
                Add Client
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-800">
                Client Details
              </h2>
            </div>
            <div className="rounded-2xl bg-[#e8f6f8] p-3 text-[#2a7797]">
              <UserRound className="h-6 w-6" />
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {FIELD_CONFIG.map(
              ({ key, label, type = "text", placeholder, icon: Icon }) => (
                <label key={key} className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-slate-500">
                    <Icon className="h-3.5 w-3.5 text-[#2a7797]" />
                    {label}
                  </span>
                  <input
                    name={key}
                    type={type}
                    value={formState[key]}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#2a7797] focus:ring-2 focus:ring-[#2a7797]/20"
                    required={key !== "affiliationAddress" && key !== "sex"}
                  />
                </label>
              ),
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2a7797] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(42,119,151,0.25)] transition hover:bg-[#215f7b] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Client"}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-300/70 bg-surface p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-[#2a7797] font-quicksand">
                Client Directory
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-800">
                All Clients
              </h2>
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-sm">
              <Search className="h-4 w-4 text-[#2a7797]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search clients"
                className="w-full bg-transparent outline-none"
              />
            </label>
          </div>

          {isLoading ? (
            <LoadingState message="Loading client records..." />
          ) : loadError ? (
            <ErrorState message={loadError} />
          ) : filteredClients.length === 0 ? (
            <EmptyState
              title="No clients match your search yet."
              description="Try a broader search term or add a new client record."
            />
          ) : (
            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-extrabold uppercase tracking-[1.6px] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Client ID</th>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Project ID</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Sex</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Affiliation</th>
                      <th className="px-4 py-3">Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="align-top hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {client.clientId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {client.clientName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {client.affiliationAddress}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.projectId}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.emailAddress}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.sex}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.mobileNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.affiliation}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.designation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
