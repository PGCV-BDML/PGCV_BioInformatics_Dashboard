"use client";

import type { ReactNode } from "react";
import { Archive } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  isConfirming = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[24px] max-w-[440px] w-full p-6 shadow-xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-[#2a7797]">
          <Archive className="w-5 h-5" />
          <h4 className="text-lg font-bold">{title}</h4>
        </div>
        <p className="text-sm text-gray-500">{message}</p>
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
            className="h-10 px-4 bg-[#2a7797] hover:bg-[#1f5f79] disabled:bg-[#2a7797]/60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-colors"
          >
            {isConfirming ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
