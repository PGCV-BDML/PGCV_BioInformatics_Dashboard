"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PenLine, Trash2, X } from "lucide-react";
import {
  getMySignaturePath,
  getSignatureSignedUrl,
  removeMySignature,
  uploadMySignature,
  validateSignatureImage,
} from "@/lib/user-signature";

interface MySignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * When true, copy explains this upload is required to finish review/approval.
   * Parent should retry the blocked action after a successful upload.
   */
  requiredForAction?: boolean;
  /** Called after a successful upload (not after remove). */
  onUploaded?: () => void;
}

export default function MySignatureModal({
  isOpen,
  onClose,
  requiredForAction = false,
  onUploaded,
}: MySignatureModalProps) {
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setPendingFile(null);
    setLocalPreview(null);
    setError(null);
    setIsLoading(true);

    void (async () => {
      try {
        const path = await getMySignaturePath();
        if (cancelled) return;
        setExistingPath(path);
        if (path) {
          const url = await getSignatureSignedUrl(path);
          if (!cancelled) setPreviewUrl(url);
        } else {
          setPreviewUrl(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Couldn't load your signature.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const displayPreview = localPreview || previewUrl;

  async function handleFilePicked(file: File | null) {
    setError(null);
    if (!file) {
      setPendingFile(null);
      return;
    }
    const validationError = await validateSignatureImage(file);
    if (validationError) {
      setError(validationError);
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
  }

  async function handleSave() {
    if (!pendingFile || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const path = await uploadMySignature(pendingFile);
      setExistingPath(path);
      setPendingFile(null);
      const url = await getSignatureSignedUrl(path);
      setPreviewUrl(url);
      onUploaded?.();
      if (requiredForAction) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save your signature. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await removeMySignature();
      setExistingPath(null);
      setPreviewUrl(null);
      setPendingFile(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't remove your signature. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Portal out of the sidebar: the aside uses overflow-hidden + transform,
  // which would clip a fixed overlay rendered as a child.
  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-signature-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-[24px] max-w-[480px] w-full flex flex-col overflow-hidden shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full bg-[#4ec2bb] shrink-0" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
              <PenLine className="w-4 h-4 text-[#2a7797]" />
            </span>
            <div className="min-w-0">
              <h3
                id="my-signature-title"
                className="text-lg font-bold text-[#2a7797] tracking-tight"
              >
                My signature
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {requiredForAction
                  ? "Upload your e-signature to finish this action."
                  : "Used when you sign a service report PDF."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 min-h-[120px] flex items-center justify-center p-4">
            {isLoading ? (
              <p className="text-xs text-slate-400 italic">Loading…</p>
            ) : displayPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayPreview}
                alt="Your electronic signature"
                className="max-h-24 max-w-full object-contain"
              />
            ) : (
              <p className="text-xs text-slate-400 text-center px-4">
                No signature on file yet. Upload a PNG of your handwritten
                signature (transparent background works best).
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={(e) => {
              void handleFilePicked(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving || isLoading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#2a7797] hover:bg-[#1f5c76] disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all"
            >
              {existingPath || pendingFile ? "Replace image" : "Upload PNG"}
            </button>
            {existingPath && !pendingFile ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleRemove()}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-60 text-slate-600 text-xs font-bold rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            ) : null}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            PNG only, under 2 MB. Transparent background works best. Only the
            image is stamped onto the PDF — the printed name on the report is
            left unchanged.
          </p>

          {error && (
            <p role="alert" className="text-xs text-red-600 font-semibold">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            {pendingFile ? "Cancel" : "Close"}
          </button>
          {pendingFile ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save signature"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
