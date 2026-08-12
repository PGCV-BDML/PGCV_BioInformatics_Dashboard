"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { usePortal } from "@/app/components/portal-context";
import SlideOverModal, {
  renderSectionLabel,
} from "@/app/components/slidemodal";
import { useToast } from "@/app/components/toast";
import {
  MAX_ONBOARDING_FILE_BYTES,
  deleteOnboardingDocumentFile,
  formatOnboardingFileSize,
  hasUploadedOnboardingFile,
  resolveOnboardingDocumentHref,
  uploadOnboardingDocumentFile,
  validateExternalDocumentLink,
  validateOnboardingDocumentFile,
} from "@/lib/onboarding-document-file";
import {
  deleteDataFromDB,
  getRowsFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import type { OnboardingDocument } from "@/types/database";

type SourceMode = "link" | "file";

type FormState = {
  title: string;
  isRequired: boolean;
  source: SourceMode;
  link: string;
  file: File | null;
};

const EMPTY_FORM: FormState = {
  title: "",
  isRequired: true,
  source: "file",
  link: "",
  file: null,
};

interface ProgramOnboardingProps {
  programId: string;
  programLabel: "training" | "internship";
}

function OnboardingFileDropzone({
  file,
  existingFileName,
  existingFileSize,
  onFileChange,
  error,
  onError,
  disabled = false,
}: {
  file: File | null;
  existingFileName?: string | null;
  existingFileSize?: number | null;
  onFileChange: (file: File | null) => void;
  error?: string | null;
  onError?: (message: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    const validationError = validateOnboardingDocumentFile(candidate);
    if (validationError) {
      onError?.(validationError);
      onFileChange(null);
      return;
    }
    onError?.(null);
    onFileChange(candidate);
  }

  function clear() {
    onError?.(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const shownName = file?.name ?? existingFileName;
  const shownSize = file?.size ?? existingFileSize;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-bold text-slate-800 ml-1 font-aileron"
      >
        Document file
      </label>

      {shownName && !file ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <FileText className="w-4 h-4 shrink-0 text-[#2a7797]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">
              {shownName}
            </p>
            <p className="text-[10px] text-slate-500">
              Current upload · {formatOnboardingFileSize(shownSize)}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-[#2a7797] hover:bg-white disabled:opacity-50"
          >
            Replace
          </button>
        </div>
      ) : file ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#4ec2bb]/50 bg-[#e6f7f5] px-3.5 py-2.5">
          <FileText className="w-4 h-4 shrink-0 text-[#2a7797]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">
              {file.name}
            </p>
            <p className="text-[10px] text-slate-500">
              {formatOnboardingFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove selected file"
            className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
            isDragging
              ? "border-[#4ec2bb] bg-[#e6f7f5]"
              : "border-slate-300 bg-slate-50"
          } ${disabled ? "opacity-60" : ""}`}
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <p className="text-[11px] font-bold text-slate-600">
            Drop a file here, or{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="text-[#2a7797] underline decoration-dotted hover:text-[#1f5c76] disabled:no-underline"
            >
              browse
            </button>
          </p>
          <p className="text-[10px] text-slate-400">
            PDF, Word, PNG, JPEG, or TXT · up to{" "}
            {formatOnboardingFileSize(MAX_ONBOARDING_FILE_BYTES)}
          </p>
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,text/plain"
        disabled={disabled}
        onChange={(e) => accept(e.target.files?.[0])}
        className="sr-only"
      />

      {error && (
        <p className="ml-1 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProgramOnboarding({
  programId,
  programLabel,
}: ProgramOnboardingProps) {
  const { isStaff, isLearnerView } = usePortal();
  const { showToast } = useToast();
  const canManage = isStaff && !isLearnerView;

  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<OnboardingDocument | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fileError, setFileError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OnboardingDocument | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const docs = await getRowsFromDB<OnboardingDocument>("onboarding_document");
      setDocuments(
        docs
          .filter((d) => d.program_id === programId)
          .sort((a, b) =>
            (a.title ?? "").localeCompare(b.title ?? "", undefined, {
              sensitivity: "base",
            }),
          ),
      );
    } catch (err) {
      console.error("Error loading onboarding documents:", err);
      setLoadError("Failed to load onboarding documents. Please refresh.");
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFileError(null);
    setLinkError(null);
    setIsModalOpen(true);
  };

  const openEdit = (doc: OnboardingDocument) => {
    const hasFile = hasUploadedOnboardingFile(doc.file_path);
    setEditing(doc);
    setForm({
      title: doc.title ?? "",
      isRequired: doc.is_required,
      source: hasFile ? "file" : "link",
      link: doc.link ?? "",
      file: null,
    });
    setFileError(null);
    setLinkError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFileError(null);
    setLinkError(null);
  };

  const handleOpen = async (doc: OnboardingDocument) => {
    setOpeningId(doc.id);
    try {
      const href = await resolveOnboardingDocumentHref(doc);
      if (!href) {
        showToast("No file or link is attached to this document.", "error");
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open onboarding document:", err);
      showToast("Couldn't open that document. Please try again.", "error");
    } finally {
      setOpeningId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isSaving) return;

    const title = form.title.trim();
    if (!title) {
      showToast("Add a document title.", "error");
      return;
    }

    let nextLink: string | null = null;
    let nextFile: {
      file_path: string | null;
      file_name: string | null;
      file_size: number | null;
    } = {
      file_path: null,
      file_name: null,
      file_size: null,
    };
    let uploadedPath: string | null = null;
    const previousPath = editing?.file_path ?? null;

    if (form.source === "link") {
      const linkValidation = validateExternalDocumentLink(form.link);
      if (linkValidation) {
        setLinkError(linkValidation);
        return;
      }
      setLinkError(null);
      nextLink = form.link.trim();
    } else if (form.file) {
      const fileValidation = validateOnboardingDocumentFile(form.file);
      if (fileValidation) {
        setFileError(fileValidation);
        return;
      }
      setFileError(null);
    } else if (editing && hasUploadedOnboardingFile(editing.file_path)) {
      nextFile = {
        file_path: editing.file_path,
        file_name: editing.file_name,
        file_size: editing.file_size,
      };
    } else {
      setFileError("Choose a file to upload.");
      return;
    }

    setIsSaving(true);
    try {
      if (form.source === "file" && form.file) {
        const uploaded = await uploadOnboardingDocumentFile({
          programId,
          file: form.file,
        });
        uploadedPath = uploaded.file_path;
        nextFile = uploaded;
        nextLink = null;
      }

      const id = editing?.id ?? crypto.randomUUID();
      await saveDataToDB("onboarding_document", id, {
        program_id: programId,
        title,
        is_required: form.isRequired,
        link: nextLink,
        file_path: nextFile.file_path,
        file_name: nextFile.file_name,
        file_size: nextFile.file_size,
      });

      if (
        previousPath &&
        previousPath !== nextFile.file_path &&
        (form.source === "link" || uploadedPath)
      ) {
        try {
          await deleteOnboardingDocumentFile(previousPath);
        } catch (cleanupError) {
          console.error(
            "Saved document but failed to remove old file:",
            cleanupError,
          );
        }
      }

      showToast(
        editing ? "Onboarding document updated." : "Onboarding document added.",
        "success",
      );
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      console.error("Failed to save onboarding document:", err);
      if (uploadedPath) {
        try {
          await deleteOnboardingDocumentFile(uploadedPath);
        } catch {
          // ignore cleanup failure
        }
      }
      showToast(
        err instanceof Error
          ? err.message
          : "Couldn't save the document. Please try again.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || !canManage || isRemoving) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("onboarding_document", removeTarget.id);
      if (removeTarget.file_path) {
        try {
          await deleteOnboardingDocumentFile(removeTarget.file_path);
        } catch (cleanupError) {
          console.error(
            "Deleted document row but failed to remove file:",
            cleanupError,
          );
        }
      }
      showToast("Onboarding document removed.", "success");
      setRemoveTarget(null);
      await load();
    } catch (err) {
      console.error("Failed to remove onboarding document:", err);
      showToast("Couldn't remove that document. Please try again.", "error");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4ec2bb]" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Onboarding Documents
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Compliance records and onboarding materials for this{" "}
                {programLabel} cohort. Attach a link or upload a file.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#2a7797] text-white text-xs font-bold shadow-sm hover:bg-[#1f5f79] transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add document
            </button>
          )}
        </div>

        {loadError ? (
          <p className="text-xs font-semibold text-red-600" role="alert">
            {loadError}
          </p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No onboarding documents yet
            {canManage ? " — add a link or upload a file to get started." : "."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const hasFile = hasUploadedOnboardingFile(doc.file_path);
              const hasLink = Boolean(doc.link?.trim());
              const canOpen = hasFile || hasLink;

              return (
                <div
                  key={doc.id}
                  className="flex items-start justify-between gap-3 p-4 bg-surface border border-slate-200 rounded-[20px] shadow-sm"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {doc.title?.trim() || "Untitled"}
                      </span>
                      {doc.is_required && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-bold rounded-md">
                          <AlertCircle className="w-2.5 h-2.5" /> Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
                      {hasFile ? (
                        <>
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {doc.file_name ?? "Uploaded file"}
                            {doc.file_size != null
                              ? ` · ${formatOnboardingFileSize(doc.file_size)}`
                              : ""}
                          </span>
                        </>
                      ) : hasLink ? (
                        <>
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{doc.link}</span>
                        </>
                      ) : (
                        <span>No file or link attached</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          aria-label={`Edit ${doc.title ?? "document"}`}
                          className="p-2 text-slate-400 hover:text-[#2a7797] bg-surface hover:bg-brand-tint border border-slate-200 rounded-xl transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(doc)}
                          aria-label={`Remove ${doc.title ?? "document"}`}
                          className="p-2 text-slate-400 hover:text-rose-600 bg-surface hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => void handleOpen(doc)}
                        disabled={openingId === doc.id}
                        aria-label={`Open ${doc.title ?? "document"}`}
                        className="p-2 text-slate-400 hover:text-white bg-surface hover:bg-[#4ec2bb] border border-slate-200 hover:border-[#4ec2bb] rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
                      >
                        {hasFile ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span
                        className="p-2 text-slate-300 bg-slate-50 border border-slate-100 rounded-xl cursor-not-allowed"
                        title="No file or link attached"
                      >
                        <Download className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlideOverModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Edit onboarding document" : "Add onboarding document"}
        subtitle="Choose a link or upload a file"
        onSubmit={handleSave}
        submitLabel={editing ? "Save changes" : "Add document"}
        isSaving={isSaving}
        submitDisabled={isSaving}
      >
        <div className="space-y-5">
          <div>
            {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Details")}
            <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. Code of Conduct Agreement"
              className="mt-1.5 w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
              required
            />
            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isRequired: e.target.checked,
                  }))
                }
                className="rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
              />
              Required for participants
            </label>
          </div>

          <div>
            {renderSectionLabel(<Link2 className="w-3.5 h-3.5" />, "Source")}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, source: "file" }))
                }
                className={`h-10 rounded-xl border text-xs font-bold transition-colors ${
                  form.source === "file"
                    ? "border-[#2a7797] bg-[#e6f7f5] text-[#2a7797]"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, source: "link" }))
                }
                className={`h-10 rounded-xl border text-xs font-bold transition-colors ${
                  form.source === "link"
                    ? "border-[#2a7797] bg-[#e6f7f5] text-[#2a7797]"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Paste link
              </button>
            </div>

            {form.source === "file" ? (
              <OnboardingFileDropzone
                file={form.file}
                existingFileName={
                  form.file
                    ? null
                    : editing && form.source === "file"
                      ? editing.file_name
                      : null
                }
                existingFileSize={
                  form.file
                    ? null
                    : editing && form.source === "file"
                      ? editing.file_size
                      : null
                }
                onFileChange={(file) =>
                  setForm((prev) => ({ ...prev, file }))
                }
                error={fileError}
                onError={setFileError}
                disabled={isSaving}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Document link
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => {
                    setLinkError(null);
                    setForm((prev) => ({ ...prev, link: e.target.value }));
                  }}
                  placeholder="https://…"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
                />
                {linkError && (
                  <p
                    className="ml-1 text-xs font-semibold text-red-600"
                    role="alert"
                  >
                    {linkError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </SlideOverModal>

      <ConfirmModal
        isOpen={Boolean(removeTarget)}
        title="Remove onboarding document"
        message={
          <>
            Remove{" "}
            <span className="font-bold text-slate-700">
              {removeTarget?.title?.trim() || "this document"}
            </span>
            ? Participants will no longer see it in this cohort.
          </>
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onClose={() => {
          if (!isRemoving) setRemoveTarget(null);
        }}
        onConfirm={() => void handleRemove()}
      />
    </>
  );
}
