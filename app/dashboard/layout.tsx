import Sidebar from "../components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full min-h-screen bg-[#faf9f5] overflow-hidden">
      {/* ── SIDEBAR (STAYS ON THE LEFT FOR ALL DASHBOARD PAGES) ── */}
      <Sidebar />

      {/* ── DYNAMIC PAGE CONTENT CONTAINER ── */}
      <main className="flex-1 h-screen overflow-y-auto p-8">{children}</main>
    </div>
  );
}
