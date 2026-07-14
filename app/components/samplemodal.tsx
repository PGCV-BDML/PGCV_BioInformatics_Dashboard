"use client";

import React, { useEffect } from "react";
import {
  X,
  Save,
  Dna,
  User,
  Activity,
  Calendar,
  Plus,
  Trash2,
  Info,
} from "lucide-react";

export type SampleFormState = {
  sample_id: string;
  sample_name: string;
  organism: string;
  status: string;
  metadata: { key: string; value: string }[];
};

interface AddSampleSidebarProps {
  isOpen: boolean;
  formState: SampleFormState;
  pipeline: string;
  onClose: () => void;
  onChange: (key: keyof SampleFormState, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddSampleSidebar({
  isOpen,
  formState,
  pipeline,
  onClose,
  onChange,
  onSubmit,
}: AddSampleSidebarProps) {
  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] mb-2 mt-0.5 font-quicksand">
      {icon} <span>{text}</span>
    </div>
  );

  useEffect(() => {
    if (!isOpen) return;

    // Prefill fields based on active service pipeline archetype rules
    const pipeLower = pipeline.toLowerCase();
    let defaultFields: { key: string; value: string }[] = [];

    if (pipeLower.includes("gatk") || pipeLower.includes("wes")) {
      defaultFields = [
        { key: "Target Coverage", value: "100x" },
        { key: "Library Prep Kit", value: "Agilent SureSelect v8" },
      ];
    } else if (pipeLower.includes("qiime") || pipeLower.includes("16s")) {
      defaultFields = [
        { key: "Primer Region", value: "V3-V4" },
        { key: "Extraction Method", value: "PowerSoil DNA Kit" },
      ];
    } else if (pipeLower.includes("crispr")) {
      defaultFields = [
        { key: "gRNA Target", value: "Exon 3" },
        { key: "Evaluation Window", value: "72 hours" },
      ];
    } else {
      defaultFields = [
        { key: "Concentration", value: "" },
        { key: "Volume (uL)", value: "" },
      ];
    }
    onChange("metadata", defaultFields);
    onChange("sample_id", `SMP-${Math.floor(100 + Math.random() * 900)}`);
  }, [isOpen, pipeline]);

  const handleMetadataChange = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const updatedMetadata = [...formState.metadata];
    updatedMetadata[index] = { ...updatedMetadata[index], [field]: value };
    onChange("metadata", updatedMetadata);
  };

  const addMetadataField = () => {
    onChange("metadata", [...formState.metadata, { key: "", value: "" }]);
  };

  const removeMetadataField = (index: number) => {
    const updatedMetadata = formState.metadata.filter((_, i) => i !== index);
    onChange("metadata", updatedMetadata);
  };

  return (
    <>
      {/* Backdrop overlay transparently handling layout actions without darkening background */}
      <div
        onClick={onClose}
        className={`fixed inset-0 w-screen h-screen z-[90] bg-transparent transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Container transforming smoothly from the right side of the screen workspace */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-[0_0_40px_0_rgba(15,23,42,0.12)] z-[100] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Dynamic decorative visual accent bar */}
        <div className="h-1.5 w-full bg-[#4ec2bb]" />

        {/* Sidebar Header Area */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-[#ffffff]">
          <div>
            <h3 className="text-lg font-bold text-[#2a7797] tracking-tight font-aileron">
              Link New Biological Sample
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5 font-semibold font-aileron">
              Register sample parameters mapped to tracking expectations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Scrollable Form Body */}
        <form
          onSubmit={onSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
        >
          {/* 1. Core Identity Registry */}
          <div className="space-y-2.5">
            {renderSectionLabel(
              <Dna className="w-3.5 h-3.5" />,
              "Identity & Core Details",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Sample ID Reference
              </label>
              <input
                type="text"
                required
                value={formState.sample_id}
                onChange={(e) => onChange("sample_id", e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-mono font-bold text-slate-800 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Target Identifier / Name
              </label>
              <input
                type="text"
                required
                value={formState.sample_name}
                onChange={(e) => onChange("sample_name", e.target.value)}
                placeholder="e.g., Primary_Tumor_01"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* 2. Organism Host Context */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <User className="w-3.5 h-3.5" />,
              "Taxonomy Context",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Organism Host
              </label>
              <input
                type="text"
                required
                value={formState.organism}
                onChange={(e) => onChange("organism", e.target.value)}
                placeholder="e.g., Homo sapiens"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* 3. Operational Processing Status */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <Activity className="w-3.5 h-3.5" />,
              "Lifecycle Status",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Status Target
              </label>
              <select
                required
                value={formState.status}
                onChange={(e) => onChange("status", e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
              >
                <option value="Pending">Pending Approval</option>
                <option value="Processing">Processing</option>
                <option value="Aligned">Aligned</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* 4. Flexible Key-Value Metadata Segment Mapping */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            {renderSectionLabel(
              <Info className="w-3.5 h-3.5" />,
              `Metadata (${pipeline})`,
            )}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-slate-800 font-aileron flex items-center gap-1">
                    Flexible Field Attribute Form Parameters
                  </label>
                  <button
                    type="button"
                    onClick={addMetadataField}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#4ec2bb] uppercase font-aileron"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>

                {formState.metadata.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={item.key}
                      onChange={(e) =>
                        handleMetadataChange(idx, "key", e.target.value)
                      }
                      placeholder="Field Key"
                      className="w-1/2 h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                    />
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) =>
                        handleMetadataChange(idx, "value", e.target.value)
                      }
                      placeholder="Value"
                      className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold font-mono text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetadataField(idx)}
                      className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Sticky Action Footer controls */}
          <div className="flex gap-2.5 justify-end pt-5 pb-1 border-t border-slate-100 bg-[#ffffff]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors font-aileron"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md shadow-slate-400/20 transition-all font-aileron"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Link Sample</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
