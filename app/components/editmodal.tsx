"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function EditModal({
  isOpen,
  onClose,
  title = "Update Record Parameters",
  subtitle = "Configuration Form",
  children,
}: EditModalProps) {
  // Close modal when hitting the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#fffdf8] rounded-[28px] max-w-[640px] w-full p-8 shadow-xl border border-gray-100 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <p className="text-[11px] font-bold text-[#7b7979] tracking-widest uppercase mb-1">
            {subtitle}
          </p>
          <h3 className="text-2xl font-bold text-[#333333]">{title}</h3>
        </div>

        {/* Dynamic Form Content */}
        {children}
      </div>
    </div>
  );
}
