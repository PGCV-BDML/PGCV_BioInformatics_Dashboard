"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CONTACT_EMAILS } from "@/lib/site-info";

interface DataPrivacyNoticeProps {
  defaultOpen?: boolean;
  className?: string;
}

export function DataPrivacyNotice({
  defaultOpen = false,
  className = "",
}: DataPrivacyNoticeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls="data-privacy-notice-content"
        className="flex items-center justify-between w-full cursor-pointer text-[12px] leading-5 font-quicksand font-bold text-[#172126]"
      >
        Data Privacy Notice
        <ChevronDown
          className="w-4 h-4 text-[#172126] transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        />
      </button>
      <div
        id="data-privacy-notice-content"
        className="grid transition-[grid-template-rows] duration-300 ease-out overflow-hidden"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-1 text-[12px] leading-5 font-quicksand">
            <p>
              <span className="font-bold text-[#172126]">Data collected: </span>
              <span className="text-[#65706f]">
                Internal lab operations records; training and internship
                participant data (name, email, assessment answers); and activity
                logs for accountability.
              </span>
            </p>
            <p>
              <span className="font-bold text-[#172126]">Purpose: </span>
              <span className="text-[#65706f]">
                Internal workflow management, training administration, and
                compliance with the Philippine Data Privacy Act (RA 10173).
              </span>
            </p>
            <p>
              <span className="font-bold text-[#172126]">Retention: </span>
              <span className="text-[#65706f]">
                Operations records retained per lab-defined policy; participant
                data deleted upon request or automatically at end of internship.
              </span>
            </p>
            <p>
              <span className="font-bold text-[#172126]">Access: </span>
              <span className="text-[#65706f]">
                PGCV-BDML team members only, with role-based access controls.
                All access is logged.
              </span>
            </p>
            <p>
              <span className="font-bold text-[#172126]">
                Deletion requests:{" "}
              </span>
              <span className="text-[#65706f]">
                Contact your supervisor or email{" "}
              </span>
              <a
                href={`mailto:${CONTACT_EMAILS.bioinformatics}`}
                className="text-[#65706f] underline underline-offset-2 decoration-dotted hover:text-[#2a7797] transition-colors"
              >
                {CONTACT_EMAILS.bioinformatics}
              </a>
              <span className="text-[#65706f]">
                . Data will be anonymized or deleted within 30 days.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
