import { Award, Info } from "lucide-react";

export default function AccomplishmentsComingSoonPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - Accomplishments Page
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Accomplishments
        </h1>
      </div>

      {/* Clean Slate Coming Soon */}
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-[#4ec2bb]/10 flex items-center justify-center text-[#4ec2bb] mb-6 border border-[#4ec2bb]/20">
          <Award className="w-8 h-8" aria-hidden="true" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Accomplishments — Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium max-w-md mt-2 font-aileron">
          A designated repository wall to log published genome notes, resource
          generation trackers, and research highlights spearheaded by the team.
        </p>

        {/* Helpful Context Note */}
        <div className="mt-8 max-w-md bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex gap-3 text-left items-start">
          <Info className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs">
            <span className="font-bold text-slate-700 block mb-0.5">Note:</span>
            <span className="text-slate-500 font-medium font-aileron leading-relaxed">
              Service reports and completed projects can be viewed in their
              respective pages.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
