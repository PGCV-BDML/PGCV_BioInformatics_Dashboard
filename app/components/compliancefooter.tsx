import { ShieldCheck, Database, Link2 } from "lucide-react";

export default function ComplianceFooter() {
  return (
    <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.08)] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between text-xs text-gray-500 gap-4 mt-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <span>Google login and role-based access</span>
      </div>
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-600" />
        <span>Structured records and audit history</span>
      </div>
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-purple-600" />
        <span>Drive/GitHub links indexed, not duplicated</span>
      </div>
    </div>
  );
}
