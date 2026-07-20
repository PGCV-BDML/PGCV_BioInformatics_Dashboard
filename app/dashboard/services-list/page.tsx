import { ClipboardCheck, ArrowUpRight } from "lucide-react";

export default function ServicesListPage() {
  // Hardcoded core analysis types from the services table catalog
  const hardcodedServices = [
    "De Novo Sequence Assembly",
    "Variant Calling / Resequencing Analysis",
    "Transcriptome/RNA-Seq Differential Expression",
    "Metagenomics Taxonomic Profiling",
    "Phylogenetic & Comparative Genomics",
    "Small RNA/MiRNA Discovery Analysis",
    "Custom High-Performance Compute Provisioning",
  ];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - List of Services
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Services List
        </h1>
      </div>

      {/* Hardcoded Roster Catalog */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-6 shadow-sm">
        <div className="flex items-center gap-2 text-[#2a7797] mb-6 font-quicksand">
          <ClipboardCheck className="w-4 h-4" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider">
            Available Core Analysis Capabilities (Read-Only)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hardcodedServices.map((service, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-[#4ec2bb]/40 transition-colors group"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* FIXED: Changed from text-slate-300 to text-slate-600 for a darker visual layout */}
                <span className="text-xs font-black text-slate-600 font-quicksand group-hover:text-slate-900 transition-colors w-5">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {service}
                </span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
