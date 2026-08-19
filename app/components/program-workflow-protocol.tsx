import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Info,
  Lightbulb,
  Users,
} from "lucide-react";
import ProtocolPageNav from "@/app/components/protocol-page-nav";
import { routes } from "@/lib/routes";

type ProgramKind = "training" | "internship";

type ProgramCopy = {
  code: string;
  title: string;
  category: "Training" | "Internship";
  summary: string;
  moduleTitle: "Training" | "Internship";
  learner: "trainee" | "intern";
  learnerTitle: "Trainee" | "Intern";
  learners: "trainees" | "interns";
  leader: "Instructor" | "Mentor";
  addButton: string;
  listHref: string;
  previewLabel: string;
  brand: string;
  titleExample: string;
  hasTrainingCode: boolean;
  evaluationTitle: string;
  evaluationSubmit: string;
  hasInternNameField: boolean;
};

const COPY: Record<ProgramKind, ProgramCopy> = {
  training: {
    code: "SOP-BIOINFO-TR-001",
    title: "Training Programs",
    category: "Training",
    summary:
      "Set up a training cohort, enroll trainees, deliver modules and tests, collect the evaluation, and issue certificates.",
    moduleTitle: "Training",
    learner: "trainee",
    learnerTitle: "Trainee",
    learners: "trainees",
    leader: "Instructor",
    addButton: "Add Training",
    listHref: routes.training.list,
    previewLabel: "Preview as trainee",
    brand:
      "Philippine Genome Center Visayas - Bioinformatics Training Program",
    titleExample: "e.g., DNA Barcoding Short Course",
    hasTrainingCode: true,
    evaluationTitle: "Post-Activity Evaluation Form",
    evaluationSubmit: "Submit Evaluation & Generate Award Certificate",
    hasInternNameField: true,
  },
  internship: {
    code: "SOP-BIOINFO-IN-001",
    title: "Internship Programs",
    category: "Internship",
    summary:
      "Set up an internship cohort, enroll interns, deliver modules and tests, collect the evaluation, and issue certificates.",
    moduleTitle: "Internship",
    learner: "intern",
    learnerTitle: "Intern",
    learners: "interns",
    leader: "Mentor",
    addButton: "Add Internship",
    listHref: routes.internship.list,
    previewLabel: "Preview as intern",
    brand:
      "Philippine Genome Center Visayas - Bioinformatics Internship Program",
    titleExample: "e.g., Summer Bioinformatics Internship",
    hasTrainingCode: false,
    evaluationTitle: "Post-Activity Evaluation Form",
    evaluationSubmit: "Submit Evaluation & Generate Internship Certificate",
    hasInternNameField: true,
  },
};

const WORKFLOW_STAGES = [
  "Create",
  "Onboarding",
  "Modules",
  "Enroll",
  "Pre/Post tests",
  "Evaluate",
  "Certificate",
] as const;

const TOC = [
  { id: "purpose", label: "Purpose" },
  { id: "roles", label: "Roles" },
  { id: "before-you-start", label: "Before you start" },
  { id: "create", label: "1. Create the program" },
  { id: "workspace", label: "2. Open the workspace" },
  { id: "onboarding", label: "3. Onboarding documents" },
  { id: "modules", label: "4. Modules" },
  { id: "enroll", label: "5. Enroll participants" },
  { id: "assessments", label: "6. Pre/Post tests" },
  { id: "evaluation", label: "7. Evaluation and certificates" },
  { id: "closeout", label: "8. Close out the cohort" },
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

export default function ProgramWorkflowProtocol({
  kind,
}: {
  kind: ProgramKind;
}) {
  const copy = COPY[kind];
  const otherKind: ProgramKind = kind === "training" ? "internship" : "training";
  const other = COPY[otherKind];

  return (
    <article className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-7 shadow-xl shadow-slate-400/20 space-y-8">
      <header className="space-y-4 border-b border-slate-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            label={copy.code}
            className="bg-slate-100 text-slate-600 border-slate-200"
          />
          <StatusChip
            label={copy.category}
            className="bg-[#e6f4f8] text-[#2a7797] border-[#b7d7e4]"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[#2a7797] tracking-tight leading-tight">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-[#65706f] font-quicksand leading-relaxed">
            {copy.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={copy.listHref}
            className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Open {copy.moduleTitle}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={routes.protocols.detail(
              otherKind === "training"
                ? "training-programs"
                : "internship-programs",
            )}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#2a7797] text-sm font-medium transition-colors"
          >
            See also: {other.title}
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
          Use this protocol whenever the lab runs a{" "}
          <strong className="text-[#172126]">{copy.moduleTitle.toLowerCase()}</strong>{" "}
          cohort in the dashboard. The program record is the system of record
          for the syllabus, onboarding files, modules, enrollments, tests,
          evaluation, and certificates.
        </p>
        <p>
          Location: sidebar →{" "}
          <strong className="text-[#172126]">{copy.moduleTitle}</strong> (
          <code className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded">
            {copy.listHref}
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
                  Team lead
                </td>
                <td className="px-4 py-3">
                  Create and edit programs, add documents and modules, and{" "}
                  <strong>enroll or remove {copy.learners}</strong>. Only a
                  team lead can change the participant list.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Team member / {copy.leader.toLowerCase()}
                </td>
                <td className="px-4 py-3">
                  Create and edit programs, upload onboarding files, and build
                  the module list. Assigned as {copy.leader} on the program
                  card. Cannot enroll {copy.learners}.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  {copy.learnerTitle}
                </td>
                <td className="px-4 py-3">
                  After sign-in, only sees {copy.moduleTitle}. Opens enrolled
                  courses, reads onboarding docs, works modules, takes
                  pre/post tests, submits the evaluation, and views{" "}
                  <strong>My Certificate</strong>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout title="Staff can preview the learner portal">
          From the sidebar profile menu, choose{" "}
          <strong>{copy.previewLabel}</strong> to see the same tabs a{" "}
          {copy.learner} sees. Participants stays hidden in that view. Exit
          preview from the same menu.
        </Callout>
      </Section>

      <Section id="before-you-start" title="Before you start">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            A new Google sign-in starts as role{" "}
            <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">
              none
            </code>{" "}
            and lands on Account pending access. A team lead must assign the{" "}
            <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">
              {copy.learner}
            </code>{" "}
            role before that person appears in the enroll list.
          </li>
          <li>
            Pre/post tests and the evaluation are stored as assessment rows for
            the program. There is no in-app question editor. Pre/post tests still
            need to be seeded per cohort. The post-activity evaluation form is
            attached automatically when a program is created.
          </li>
          <li>
            Printed names on the certificate are the lab signatories — this is
            not the service-report PNG e-signature. After evaluation, check
            Participants: if Certificate stays Pending, a team lead still needs
            to issue the record.
          </li>
        </ul>
      </Section>

      <Section id="create" title="1. Create the program">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Open{" "}
            <Link
              href={copy.listHref}
              className="text-[#2a7797] hover:underline font-semibold"
            >
              {copy.moduleTitle}
            </Link>{" "}
            and click{" "}
            <strong className="text-[#172126]">{copy.addButton}</strong>.
          </li>
          <li>
            Fill in <strong className="text-[#172126]">Program Details</strong>.
            Title, {copy.leader.toLowerCase()}, and start date are required.
          </li>
          <li>
            Click <strong className="text-[#172126]">Save</strong>.
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Fields
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <strong className="text-[#172126]">Title</strong> —{" "}
                {copy.titleExample}
              </li>
              <li>
                <strong className="text-[#172126]">Description</strong> —
                syllabus and goals (optional).
              </li>
              <li>
                <strong className="text-[#172126]">Requesting Institution</strong>{" "}
                — sending school or office (optional).
              </li>
              {copy.hasTrainingCode ? (
                <li>
                  <strong className="text-[#172126]">Training Code</strong> —
                  optional short code for the cohort. Internship programs do
                  not use this field.
                </li>
              ) : (
                <li>
                  Internship programs do not have a Training Code field.
                </li>
              )}
              <li>
                <strong className="text-[#172126]">{copy.leader}</strong> —
                pick a team lead or team member.
              </li>
              <li>
                <strong className="text-[#172126]">Start / End date</strong> —
                end date cannot be before start date.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Status
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <strong className="text-[#172126]">Draft</strong> — still being
                prepared.
              </li>
              <li>
                <strong className="text-[#172126]">On-going</strong> — default
                for new programs; active in the directory.
              </li>
              <li>
                <strong className="text-[#172126]">Completed</strong> — use{" "}
                <strong>Mark as done</strong> on the program card.
              </li>
              <li>
                <strong className="text-[#172126]">Archived</strong> — hidden
                from the active directory; restore later from the Archived
                filter.
              </li>
            </ul>
          </div>
        </div>
        <p>
          On a program card, the ⋯ menu also has{" "}
          <strong className="text-[#172126]">Edit</strong>,{" "}
          <strong className="text-[#172126]">Delete permanently</strong>, and
          the status actions above.
        </p>
      </Section>

      <Section id="workspace" title="2. Open the program workspace">
        <p>
          On the directory card, click{" "}
          <strong className="text-[#172126]">See Details</strong>. The
          workspace header shows the {copy.leader.toLowerCase()}, timeline, and
          status. Tabs along the top:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">Modules</strong>
          </li>
          <li>
            <strong className="text-[#172126]">Onboarding Docs</strong>
          </li>
          <li>
            <strong className="text-[#172126]">Participants</strong> — staff
            only; hidden from {copy.learners}
          </li>
          <li>
            <strong className="text-[#172126]">Pre/Post Tests</strong>
          </li>
          <li>
            <strong className="text-[#172126]">Evaluation</strong>
          </li>
          <li>
            <strong className="text-[#172126]">Certificate</strong> (shown as{" "}
            <strong>My Certificate</strong> to {copy.learners})
          </li>
        </ul>
        <p>
          {copy.learnerTitle}s only
          see courses they are enrolled in. If the directory is empty, they
          should ask a team lead to enroll them.
        </p>
      </Section>

      <Section id="onboarding" title="3. Onboarding documents">
        <p>
          Staff click <strong className="text-[#172126]">Add document</strong>.
          Give it a title and choose a source:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">Upload a file</strong> — PDF,
            Word, image, or text, up to 25 MB.
          </li>
          <li>
            <strong className="text-[#172126]">Paste a link</strong> — Drive or
            other share URL.
          </li>
        </ul>
        <p>
          Check <strong className="text-[#172126]">Required for participants</strong>{" "}
          when the file must be read (for example a code of conduct). Required
          docs show a red Required chip. {copy.learnerTitle}s open them with the
          download or external-link button.
        </p>
        <Callout tone="warning" title="Required is a label, not a lock">
          Marking a document Required does not currently block later tabs. Walk
          {copy.learners} through onboarding before tests if the lab needs that
          order.
        </Callout>
      </Section>

      <Section id="modules" title="4. Modules">
        <p>Staff can add materials two ways:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="text-[#172126]">Add from library</strong> —
            prepared HTML modules and packs (Foundations, Core methods,
            Metagenomics, Whole Genome Assembly). Select items, then Add.
          </li>
          <li>
            <strong className="text-[#172126]">Upload file</strong> — your own
            HTML, PDF, slides, docs, sheets, images, or ZIP, up to 50 MB.
          </li>
        </ol>
        <p>
          Reorder with the up/down arrows. {copy.learnerTitle}s click{" "}
          <strong className="text-[#172126]">View Materials</strong>, then{" "}
          <strong className="text-[#172126]">Mark as Read</strong> when
          finished. Completed modules stay highlighted on that browser.
        </p>
        <Callout title="Mark as Read is local to the browser">
          Progress is stored on the device, not in the participant table. A
          different computer will not show the same Completed ticks.
        </Callout>
      </Section>

      <Section id="enroll" title="5. Enroll participants">
        <p>
          Open the <strong className="text-[#172126]">Participants</strong>{" "}
          tab. Only a team lead sees the enroll form.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Under <strong className="text-[#172126]">Add {copy.learner}</strong>,
            select someone with the {copy.learner} role who is not already on
            this program.
          </li>
          <li>
            Click <strong className="text-[#172126]">Enroll</strong>. They can
            open the course immediately.
          </li>
        </ol>
        <p>
          The table shows name, email, institution, pre-test score, post-test
          score, and whether a certificate is Issued or Pending.{" "}
          <strong className="text-[#172126]">Remove</strong> drops the
          enrollment and they lose access.
        </p>
        <Callout tone="warning" title="Enrollment is the access key">
          A Google account with the {copy.learner} role is not enough. If they
          see “No enrolled courses yet,” they are not on this program’s
          participant list.
        </Callout>
      </Section>

      <Section id="assessments" title="6. Pre/Post tests">
        <p>
          On <strong className="text-[#172126]">Pre/Post Tests</strong>, each
          card shows the question count. {copy.learnerTitle}s click{" "}
          <strong className="text-[#172126]">Start Pre-Test</strong> (or
          Post-Test), answer, then{" "}
          <strong className="text-[#172126]">Submit Answers &amp; Calculate Score</strong>.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Multiple-choice items are scored as a percentage.</li>
          <li>Rating and free-text answers are saved but not scored.</li>
          <li>
            After submit, the button becomes{" "}
            <strong className="text-[#172126]">Review Pre-Test</strong> /{" "}
            <strong>Review Post-Test</strong>. Staff see the scores on
            Participants.
          </li>
        </ul>
      </Section>

      <Section id="evaluation" title="7. Evaluation and certificates">
        <p>
          After the cohort, the {copy.learner} opens{" "}
          <strong className="text-[#172126]">Evaluation</strong> and completes
          the{" "}
          <strong className="text-[#172126]">{copy.evaluationTitle}</strong>{" "}
          (participant details, 5–1 + N/A ratings, and comments)
          {copy.hasInternNameField
            ? ", including full name, email, and institution,"
            : ""}{" "}
          then clicks{" "}
          <strong className="text-[#172126]">{copy.evaluationSubmit}</strong>.
        </p>
        <p>
          Staff open <strong className="text-[#172126]">Certificate</strong>{" "}
          (Certificates Database Log Registry) and use{" "}
          <strong className="text-[#172126]">View Certificate</strong> then{" "}
          <strong className="text-[#172126]">Print / Save PDF</strong>.{" "}
          {copy.learnerTitle}s use{" "}
          <strong className="text-[#172126]">My Certificate</strong>. Hours on
          the template currently print as a dash until that field is stored on
          the program.
        </p>
        <Callout tone="warning" title="Confirm Issued after evaluation">
          Evaluation submit tries to create a certificate row, but learners
          cannot always write that record. If Participants still shows Pending,
          a team lead needs to issue the certificate before close-out.
        </Callout>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
          <p className="flex items-center gap-2 text-[13px] font-bold text-[#172126] font-aileron">
            <Award className="w-4 h-4 text-[#2a7797]" />
            Certificate sign-off
          </p>
          <p className="text-xs">
            The printed certificate names the {copy.learner} and the cohort
            dates, with two lab signatories:
          </p>
          <ul className="text-xs list-disc pl-5 space-y-1">
            <li>
              Victor Marco Emmanuel N. Ferriols, Ph.D. — Assistant to the
              Executive Director, Visayas, Philippine Genome Center
            </li>
            <li>
              Albert Noblezada — Science Research Specialist II, Bioinformatics
            </li>
          </ul>
          <p className="text-xs">
            These are printed names on the template. They are not the PNG
            e-signature used on service reports.
          </p>
        </div>
      </Section>

      <Section id="closeout" title="8. Close out the cohort">
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Confirm every {copy.learner} who should be certified shows{" "}
            <strong className="text-[#172126]">Issued</strong> on Participants.
          </li>
          <li>
            Open each row with{" "}
            <strong className="text-[#172126]">View Certificate</strong> and{" "}
            <strong className="text-[#172126]">Print / Save PDF</strong> as
            needed.
          </li>
          <li>
            On the {copy.moduleTitle} directory, use{" "}
            <strong className="text-[#172126]">Mark as done</strong>, then{" "}
            <strong className="text-[#172126]">Archive</strong> when you no
            longer need it in the active list.
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
                  Account pending access
                </td>
                <td className="px-4 py-3">
                  Their role is still none. Assign {copy.learner} before they
                  can appear in Add {copy.learner}.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  {copy.learnerTitle} sees no courses
                </td>
                <td className="px-4 py-3">
                  Not enrolled, or signed in with the wrong role. A team lead
                  must Enroll them on Participants.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Can’t find someone to enroll
                </td>
                <td className="px-4 py-3">
                  Their user role is not {copy.learner}, or they are already
                  enrolled. Team members cannot enroll — only a team lead can.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  No pre-test / post-test questions
                </td>
                <td className="px-4 py-3">
                  Pre/post tests are not created in this screen. The program
                  still needs seeded question sets. The post-activity evaluation
                  form is attached automatically when the program is created.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Certificate stays Pending
                </td>
                <td className="px-4 py-3">
                  They have not submitted the {copy.evaluationTitle}, or the
                  certificate row was not created after submit. A team lead
                  should issue it before close-out.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Completed ticks disappeared
                </td>
                <td className="px-4 py-3">
                  Mark as Read is stored in that browser only.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <BookOpen className="w-3.5 h-3.5" />
          Modules + library
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <FileText className="w-3.5 h-3.5" />
          Onboarding files
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Users className="w-3.5 h-3.5" />
          Team lead enrolls
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <ClipboardCheck className="w-3.5 h-3.5" />
          Tests then evaluation
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Info className="w-3.5 h-3.5" />
          Print / Save PDF
        </span>
      </div>
    </article>
  );
}
