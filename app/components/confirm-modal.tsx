"use client";

import type { ReactNode } from "react";
import { Archive, type LucideIcon } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  isConfirming?: boolean;
  /** "danger" colors the title and confirm button red. */
  tone?: "default" | "danger";
  icon?: LucideIcon;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  isConfirming = false,
  tone = "default",
  icon: Icon = Archive,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = tone === "danger";

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[24px] max-w-[440px] w-full p-6 shadow-xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center gap-3 ${
            isDanger ? "text-rose-700" : "text-[#2a7797]"
          }`}
        >
          <Icon className="w-5 h-5" />
          <h4 className="text-lg font-bold">{title}</h4>
        </div>
        <div className="text-sm text-gray-500">{message}</div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 bg-gray-100 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`h-10 px-4 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-colors ${
              isDanger
                ? "bg-rose-700 hover:bg-rose-800 disabled:bg-rose-700/60"
                : "bg-[#2a7797] hover:bg-[#1f5f79] disabled:bg-[#2a7797]/60"
            }`}
          >
            {isConfirming ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
