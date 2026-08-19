import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  ClipboardList,
  FileUp,
  Info,
  Lightbulb,
  PenLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import ProtocolPageNav from "@/app/components/protocol-page-nav";
import { routes } from "@/lib/routes";

const WORKFLOW_STAGES = [
  "Create",
  "Complete",
  "Upload PDF",
  "Peer review",
  "E-sign",
  "Approve",
  "Submit",
] as const;

const TOC = [
  { id: "purpose", label: "Purpose" },
  { id: "roles", label: "Roles" },
  { id: "before-you-start", label: "Before you start" },
  { id: "create", label: "1. Create the record" },
  { id: "work", label: "2. Work the record" },
  { id: "upload", label: "3. Upload the PDF" },
  { id: "review", label: "4. Peer review" },
  { id: "signing", label: "5. Electronic signatures" },
  { id: "approval", label: "6. Approval" },
  { id: "submit", label: "7. Submit and acknowledge" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-[#333333] font-aileron mb-3">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-[#65706f] font-quicksand leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  const isWarning = tone === "warning";
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-3.5 ${
        isWarning
          ? "border-amber-200 bg-amber-50/70"
          : "border-[#b7d7e4] bg-[#e6f4f8]/70"
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      ) : (
        <Lightbulb className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
      )}
      <div className={isWarning ? "text-amber-900" : "text-[#236584]"}>
        <p className="font-bold text-[13px] font-aileron">{title}</p>
        <div className="mt-1 text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function StatusChip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${className}`}
    >
      {label}
    </span>
  );
}

export default function ServiceReportTrackerProtocol() {
  return (
    <article className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-7 shadow-xl shadow-slate-400/20 space-y-8">
      <header className="space-y-4 border-b border-slate-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            label="SOP-BIOINFO-SR-001"
            className="bg-slate-100 text-slate-600 border-slate-200"
          />
          <StatusChip
            label="Sequence Analysis"
            className="bg-[#e6f4f8] text-[#2a7797] border-[#b7d7e4]"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[#2a7797] tracking-tight leading-tight">
            Tracking Service Reports
          </h1>
          <p className="mt-2 text-sm text-[#65706f] font-quicksand leading-relaxed">
            How to record a client sequence analysis from intake to delivery,
            including peer review of the PDF and approving-officer sign-off.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={routes.services.tracker}
            className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Open Service Report Tracker
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={routes.protocols.detail("covid-sample-tracker")}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#2a7797] text-sm font-medium transition-colors"
          >
            See also: Tracking COVID-19 Samples
          </Link>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Workflow stages"
      >
        {WORKFLOW_STAGES.map((stage, index) => (
          <div key={stage} className="flex items-center gap-2">
            {index > 0 ? (
              <ArrowRight
                className="w-3.5 h-3.5 text-slate-300 hidden sm:block"
                aria-hidden="true"
              />
            ) : null}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f5f5f4] border border-slate-200 text-[11px] font-bold text-slate-600">
              {stage}
            </span>
          </div>
        ))}
      </div>

      <ProtocolPageNav items={TOC} />

      <Section id="purpose" title="Purpose">
        <p>
          Use this protocol whenever a client sequence analysis needs a service
          report in the dashboard. The tracker is the system of record for the
          report number, analysis work, PDF, review, e-signature, approval, and
          client delivery.
        </p>
        <p>
          Location: sidebar → <strong className="text-[#172126]">Sequence Analysis → Service Report Tracker</strong>{" "}
          (<code className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded">
            /dashboard/services/tracker
          </code>
          ).
        </p>
      </Section>

      <Section id="roles" title="Roles">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">You are…</th>
                <th className="px-4 py-2.5 font-bold">You do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Bioinformatician / analyst
                </td>
                <td className="px-4 py-3">
                  Create the record, run the analysis, upload the PDF, assign
                  officers, address revision or change comments, and resubmit.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Reviewing officer
                </td>
                <td className="px-4 py-3">
                  Peer-review the PDF from <strong>Notifications</strong> only.
                  Complete review (e-sign) or request a revision with comments.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Approving officer
                </td>
                <td className="px-4 py-3">
                  Approve the report after peer review from{" "}
                  <strong>Notifications</strong>, or send it back with comments.
                  Approve stamps the e-signature for release.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Either staff role
                </td>
                <td className="px-4 py-3">
                  Mark the report <strong>Submitted</strong> once it has gone out
                  to the client.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout title="External officers stay in Notifications">
          Reviewing and approving officers who are not bioinformatics staff only
          see the Notifications tab after sign-in. They open the PDF, e-sign, and
          act from the notification card — they cannot open the Service Report
          Tracker.
        </Callout>
      </Section>

      <Section id="before-you-start" title="Before you start">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            A <strong className="text-[#172126]">PDF is required</strong> going
            forward. An optional Drive or share link can sit alongside it.
          </li>
          <li>
            The <strong className="text-[#172126]">Reviewing Officer</strong> can
            be a <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">reviewing_officer</code>{" "}
            or staff member <strong>except the assignee</strong>, and must be
            different from the Approving Officer.
          </li>
          <li>
            The <strong className="text-[#172126]">Approving Officer</strong> can
            be an <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">approving_officer</code>{" "}
            or a team lead.
          </li>
          <li>
            The approving officer is notified{" "}
            <strong className="text-[#172126]">only after Status of Review is Reviewed</strong>
            .
          </li>
          <li>
            Officers must upload a PNG of their handwritten signature under the
            profile menu → <strong className="text-[#172126]">My signature</strong>{" "}
            before they can complete review or approve.
          </li>
        </ul>
      </Section>

      <Section id="create" title="1. Create the service report record">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Open the{" "}
            <Link
              href={routes.services.tracker}
              className="text-[#2a7797] hover:underline font-semibold"
            >
              Service Report Tracker
            </Link>{" "}
            and click <strong className="text-[#172126]">Add Analysis</strong>.
          </li>
          <li>
            Fill in what you know. Every field is optional except the “Others”
            specify box, so a record can start as a stub and be completed later.
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Service Report
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <strong className="text-[#172126]">Service Report Number</strong>{" "}
                is prefilled as{" "}
                <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
                  PGCV-BIOINFO-SR-YYYY-NNN
                </code>
                . The sequence is global and does not restart in January. You
                can overwrite it to backfill an old report.
              </li>
              <li>
                <strong className="text-[#172126]">Date</strong> defaults to today.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Personnel
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <strong className="text-[#172126]">Assignee</strong> is required
                for the record to appear on the Tasks board.
              </li>
              <li>
                <strong className="text-[#172126]">Reviewing Officer</strong>{" "}
                reads the PDF before approval. Not the assignee.
              </li>
              <li>
                <strong className="text-[#172126]">Approving Officer</strong> is
                notified only after peer review is done.
              </li>
            </ul>
          </div>
        </div>
        <p>
          New records default Status of Completion to{" "}
          <strong className="text-[#172126]">On-going</strong>. Leave Status of
          Submission blank. Status of Review is read-only until the reviewing
          officer acts. Click <strong className="text-[#172126]">Save Record</strong>.
        </p>
      </Section>

      <Section id="work" title="2. Work the record">
        <p>
          Change Status of Completion and Status of Submission inline in the
          table, or open the pencil icon in the Actions column. Status of Review
          stays a read-only chip.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Status of Completion</th>
                <th className="px-4 py-2.5 font-bold">Effect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">On-going</td>
                <td className="px-4 py-3">Active work; appears on the Tasks board.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  On hold (for payment)
                </td>
                <td className="px-4 py-3">Paused; stays visible under the On Hold filter.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Completed</td>
                <td className="px-4 py-3">
                  Stamps <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">completed_at</code>{" "}
                  and unlocks PDF upload.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Cancelled</td>
                <td className="px-4 py-3">Removes the linked task from the Tasks board.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="upload" title="3. Upload the service report PDF">
        <p>
          Once Status of Completion is <strong className="text-[#172126]">Completed</strong>:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Click <strong className="text-[#172126]">Upload</strong> in the
            Service Report column, or attach the PDF in the edit panel.
          </li>
          <li>Drop or browse for a PDF (max 25 MB). Optionally add a Drive or share URL.</li>
          <li>Saving stores the file in private storage and writes the delivery row.</li>
        </ol>
        <p>
          The PDF is the artifact that goes through review. Legacy rows that
          only have a link still work, but new reports should upload a file.
        </p>
      </Section>

      <Section id="review" title="4. Peer review (Status of Review)">
        <p>
          When the record is Completed, has a report (PDF or legacy link), and
          has a Reviewing Officer, Status of Review opens as{" "}
          <strong className="text-[#172126]">For review</strong> and that person
          is notified.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Status of Review</th>
                <th className="px-4 py-2.5 font-bold">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">For review</td>
                <td className="px-4 py-3">Waiting on the reviewing officer.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">In review</td>
                <td className="px-4 py-3">Reviewer opened the PDF.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  Revision requested
                </td>
                <td className="px-4 py-3">Sent back to the assignee with comments.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Reviewed</td>
                <td className="px-4 py-3">Signed off — approval can open.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="flex items-center gap-2 text-[13px] font-bold text-[#172126] font-aileron">
            <Bell className="w-4 h-4 text-[#2a7797]" />
            Reviewer actions (bell / Notifications)
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong className="text-[#172126]">Open Report</strong> marks In
              review and opens the PDF (signed URL) or legacy link.
            </li>
            <li>
              <strong className="text-[#172126]">Complete review</strong> sets
              Reviewed, stamps the e-signature, and notifies the approving
              officer if assigned.
            </li>
            <li>
              <strong className="text-[#172126]">Request revision</strong>{" "}
              requires a comment and notifies the assignee.
            </li>
          </ul>
        </div>
        <p>
          If a revision comes back: fix the PDF or content, then on the detail
          page click <strong className="text-[#172126]">Resubmit for review</strong>.
          The reviewing officer is notified again.
        </p>
      </Section>

      <Section id="signing" title="5. Electronic signatures">
        <p>
          Reviewing and approving officers must have a PNG of their handwritten
          signature on file before they can complete review or approve a report.
          The stamp is placed on the last page of the PDF; printed names are not
          changed.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Open the sidebar profile menu and choose{" "}
            <strong className="text-[#172126]">My signature</strong>.
          </li>
          <li>
            Upload a PNG of the handwritten signature (max 2 MB). Use a
            transparent or light background so it sits cleanly under the label.
          </li>
          <li>
            On <strong className="text-[#172126]">Complete review</strong>, the
            reviewer’s signature is stamped under <em>Reviewed by</em>.
          </li>
          <li>
            On <strong className="text-[#172126]">Approve</strong>, the approving
            officer’s signature is stamped under <em>Approved for Release</em>.
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#172126] font-aileron">
              <PenLine className="w-4 h-4 text-[#2a7797]" />
              Reviewed by
            </p>
            <p className="text-xs">
              Applied when the reviewing officer completes review. If no
              signature is on file, the action is blocked and an upload prompt
              appears.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#172126] font-aileron">
              <ShieldCheck className="w-4 h-4 text-[#2a7797]" />
              Approved for Release
            </p>
            <p className="text-xs">
              Applied when the approving officer approves. Same rule: a
              signature PNG must already be uploaded.
            </p>
          </div>
        </div>
        <Callout tone="warning" title="Replacing the PDF after review voids the reviewer stamp">
          If you replace the PDF after Status of Review is Reviewed, the
          reviewer stamp on the old file no longer applies. Status of Review
          returns to For review and the reviewing officer must Complete review
          again on the new file. The approving officer is only notified after
          that second review.
        </Callout>
      </Section>

      <Section id="approval" title="6. Approval (Status of Submission)">
        <p>
          Only after Status of Review is <strong className="text-[#172126]">Reviewed</strong>{" "}
          does Status of Submission open as{" "}
          <strong className="text-[#172126]">For approval</strong> (when an
          Approving Officer is assigned). That officer is notified then — not
          earlier.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Status of Submission</th>
                <th className="px-4 py-2.5 font-bold">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">For approval</td>
                <td className="px-4 py-3">Waiting on the approving officer.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Under review</td>
                <td className="px-4 py-3">Officer opened the report.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  Changes requested
                </td>
                <td className="px-4 py-3">Sent back to the assignee with comments.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Approved</td>
                <td className="px-4 py-3">Signed off.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">Submitted</td>
                <td className="px-4 py-3">Delivered to the client.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">Open Report</strong> → Under
            review and opens the PDF or link.
          </li>
          <li>
            <strong className="text-[#172126]">Approve</strong> → Approved;
            stamps the signature; notifies the assignee when one is set.
          </li>
          <li>
            <strong className="text-[#172126]">Request changes</strong> →
            requires a comment; notifies the assignee.
          </li>
        </ul>
        <p>
          If comments come back and the PDF itself does not change, click{" "}
          <strong className="text-[#172126]">Resubmit for approval</strong>. If
          you replace the PDF, it goes back through peer review first.
        </p>
      </Section>

      <Section id="submit" title="7. Submit and acknowledge">
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            After approval, the assignee receives a{" "}
            <strong className="text-[#172126]">Report approved</strong>{" "}
            notification with the signed PDF.
          </li>
          <li>
            Set Status of Submission to{" "}
            <strong className="text-[#172126]">Submitted</strong> once the client
            has the report.
          </li>
          <li>
            On the detail page, mark{" "}
            <strong className="text-[#172126]">Client Acknowledged</strong> when
            they confirm receipt.
          </li>
        </ol>
      </Section>

      <Section id="troubleshooting" title="Troubleshooting">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Symptom</th>
                <th className="px-4 py-2.5 font-bold">Likely cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Reviewer never notified
                </td>
                <td className="px-4 py-3">
                  Record is not Completed, has no PDF or link, or has no
                  Reviewing Officer.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Approving officer never notified
                </td>
                <td className="px-4 py-3">Status of Review is not Reviewed yet.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Can’t pick someone as reviewer
                </td>
                <td className="px-4 py-3">
                  They are the assignee, or they are already the approving
                  officer.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Can’t complete review or approve
                </td>
                <td className="px-4 py-3">
                  No e-signature uploaded yet (profile menu → My signature).
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Signature looks misplaced
                </td>
                <td className="px-4 py-3">
                  Template margins differ from the usual A4 service-report
                  layout. Ask a maintainer to check signature placement.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Can’t open PDF
                </td>
                <td className="px-4 py-3">
                  Storage signed URL failed; try again or re-upload.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Revision or change comments missing
                </td>
                <td className="px-4 py-3">
                  Comments live on the detail page under Review Comments and in
                  the notification payload.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Info className="w-3.5 h-3.5" />
          Staff workflow
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <UserRound className="w-3.5 h-3.5" />
          Officer sign-off from Notifications
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <FileUp className="w-3.5 h-3.5" />
          PDF required
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <BadgeCheck className="w-3.5 h-3.5" />
          E-sign then approve
        </span>
      </div>
    </article>
  );
}
