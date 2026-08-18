import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { routes } from "@/lib/routes";

export default function ProtocolNotFound() {
  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-8 shadow-xl shadow-slate-400/20 text-center space-y-4">
      <div className="flex justify-center">
        <FileQuestion className="w-10 h-10 text-[#2a7797]" />
      </div>
      <h2 className="text-xl font-bold text-[#333333] font-aileron">
        Protocol not found
      </h2>
      <p className="text-sm text-slate-500 font-quicksand">
        That protocol is not in the library yet.
      </p>
      <Link
        href={routes.protocols.list}
        className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all font-aileron"
      >
        Back to Protocols
      </Link>
    </div>
  );
}
