"use client";

import React, { useEffect, useState } from "react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { Dna, User, Activity, Plus, Trash2, Info } from "lucide-react";

export type SampleFormState = {
  sample_id: string;
  sample_name: string;
  organism: string;
  status: string;
  metadata: { key: string; value: string }[];
};

interface AddSampleSidebarProps {
  isOpen: boolean;
  isSaving?: boolean;
  formState: SampleFormState;
  pipeline: string;
  onClose: () => void;
  onChange: (key: keyof SampleFormState, value: string | number | string[] | boolean | { key: string; value: string }[]) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddSampleSidebar({
  isOpen,
  isSaving = false,
  formState,
  pipeline,
  onClose,
  onChange,
  onSubmit,
}: AddSampleSidebarProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.sample_id.trim()) errs.sample_id = "Sample ID is required";
    if (!formState.sample_name.trim()) errs.sample_name = "Sample name is required";
    if (!formState.organism.trim()) errs.organism = "Organism is required";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(e);
  };

  const handleChange = (key: keyof SampleFormState, value: string | number | string[] | boolean | { key: string; value: string }[]) => {
    setErrors((prev) => ({ ...prev, [key]: "" }));
    onChange(key, value);
  };

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
    const existing = updatedMetadata[index]!;
    updatedMetadata[index] = { ...existing, [field]: value };
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
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Link New Biological Sample"
      subtitle="Register sample parameters mapped to tracking expectations."
      onSubmit={handleSubmit}
      submitLabel="Link Sample"
      isSaving={isSaving}
      submitDisabled={isSaving}
    >
      {/* 1. Core Identity Registry */}
      <div className="space-y-2.5">
        {renderSectionLabel(
          <Dna className="w-3.5 h-3.5" />,
          "Identity & Core Details",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-id" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Sample ID Reference
          </label>
          <input
            id="sample-id"
            type="text"
            required
            aria-invalid={!!errors.sample_id}
            value={formState.sample_id}
            onChange={(e) => handleChange("sample_id", e.target.value)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-mono font-bold text-slate-800 transition-all shadow-sm"
          />
          {errors.sample_id && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.sample_id}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-name" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Target Identifier / Name
          </label>
          <input
            id="sample-name"
            type="text"
            required
            aria-invalid={!!errors.sample_name}
            value={formState.sample_name}
            onChange={(e) => handleChange("sample_name", e.target.value)}
            placeholder="e.g., Primary_Tumor_01"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.sample_name && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.sample_name}</p>
          )}
        </div>
      </div>

      {/* 2. Organism Host Context */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <User className="w-3.5 h-3.5" />,
          "Taxonomy Context",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-organism" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Organism Host
          </label>
          <input
            id="sample-organism"
            type="text"
            required
            aria-invalid={!!errors.organism}
            value={formState.organism}
            onChange={(e) => handleChange("organism", e.target.value)}
            placeholder="e.g., Homo sapiens"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.organism && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.organism}</p>
          )}
        </div>
      </div>

      {/* 3. Operational Processing Status */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Activity className="w-3.5 h-3.5" />,
          "Lifecycle Status",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sample-status" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Status Target
          </label>
          <select
            id="sample-status"
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
    </SlideOverModal>
  );
}
