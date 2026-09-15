"use client";

import { useEffect, useState } from "react";
import { CircleHelp, FileText } from "lucide-react";
import type { FaqTag, FaqThreadFormData } from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { CategoryMultiSelect } from "./category-chips";
import { FaqPostComposer } from "./faq-post-composer";
import { FAQ_TAG_OPTIONS, FAQ_TAG_STYLES } from "@/lib/faq-tags";
import { MAX_FAQ_BODY, MAX_FAQ_TITLE } from "@/lib/faqs";

const inputClass =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

interface FaqAskModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: FaqThreadFormData;
  onClose: () => void;
  onSubmit: (data: FaqThreadFormData) => void;
}

export default function FaqAskModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  onClose,
  onSubmit,
}: FaqAskModalProps) {
  const [formState, setFormState] = useState<FaqThreadFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = "A question title is required";
    if (formState.title.trim().length > MAX_FAQ_TITLE) {
      errs.title = `Keep the title to ${MAX_FAQ_TITLE} characters`;
    }
    if (!formState.body.trim()) errs.body = "Write a question body";
    if (formState.body.trim().length > MAX_FAQ_BODY) {
      errs.body = `Keep the body to ${MAX_FAQ_BODY} characters`;
    }
    if (formState.tags.length === 0) errs.tags = "Choose at least one tag";
    return errs;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      title: formState.title.trim(),
      body: formState.body,
      tags: formState.tags,
    });
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Ask a question" : "Edit question"}
      subtitle="Staff Q&A. Tags help people find the thread later."
      onSubmit={handleSubmit}
      submitLabel={isAdding ? "Post question" : "Save"}
      isSaving={isSaving}
    >
      {renderSectionLabel(<CircleHelp className="w-3.5 h-3.5" />, "Question")}
      <label className="flex flex-col gap-1.5 mb-4">
        <span className="text-xs font-bold text-slate-800 ml-1 font-aileron">
          Title
        </span>
        <input
          type="text"
          value={formState.title}
          maxLength={MAX_FAQ_TITLE}
          className={inputClass}
          placeholder="How do I install QIIME 2 with conda?"
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, title: event.target.value }))
          }
        />
        {errors.title ? (
          <p className="text-red-500 text-xs ml-1 font-aileron" role="alert">
            {errors.title}
          </p>
        ) : null}
      </label>

      {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Details")}
      <div className="mb-4">
        <FaqPostComposer
          value={formState.body}
          onChange={(body) => setFormState((prev) => ({ ...prev, body }))}
          maxLength={MAX_FAQ_BODY}
          error={errors.body}
          rows={10}
        />
      </div>

      <CategoryMultiSelect<FaqTag>
        selected={formState.tags}
        options={FAQ_TAG_OPTIONS}
        styles={FAQ_TAG_STYLES}
        onChange={(tags) => setFormState((prev) => ({ ...prev, tags }))}
        label="Tags"
        hint="Select one or more tags so others can filter this thread."
        groupLabel="FAQ tags"
        error={errors.tags}
      />
    </SlideOverModal>
  );
}
