import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Flag,
  Info,
  Lightbulb,
  ListOrdered,
  Upload,
} from "lucide-react";
import { routes } from "@/lib/routes";

const WORKFLOW_STAGES = [
  "Add run",
  "Receive / load",
  "Sequence",
  "Assign lineages",
  "Upload GISAID / ISLAP",
  "Flag if needed",
] as const;

const TOC = [
  { id: "purpose", label: "Purpose" },
  { id: "roles", label: "Roles" },
  { id: "before-you-start", label: "Before you start" },
  { id: "create", label: "1. Add a sequencing run" },
  { id: "dates-counts", label: "2. Dates and counts" },
  { id: "lineages", label: "3. Assign lineages" },
  { id: "uploads", label: "4. GISAID and ISLAP" },
  { id: "review", label: "5. Review flags" },
  { id: "find", label: "6. Find and filter runs" },
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

export default function CovidSampleTrackerProtocol() {
  return (
    <article className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-7 shadow-xl shadow-slate-400/20 space-y-8">
      <header className="space-y-4 border-b border-slate-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            label="SOP-BIOINFO-CV-001"
            className="bg-slate-100 text-slate-600 border-slate-200"
          />
          <StatusChip
            label="COVID-19"
            className="bg-[#e6f4f8] text-[#2a7797] border-[#b7d7e4]"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[#2a7797] tracking-tight leading-tight">
            Tracking COVID-19 Samples
          </h1>
          <p className="mt-2 text-sm text-[#65706f] font-quicksand leading-relaxed">
            Record SARS-CoV-2 genomic surveillance sequencing runs from receipt
            through lineage assignment and public-database upload. This is not
            the client Service Report Tracker.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={routes.services.covidSampleTracker}
            className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
            Open COVID-19 Sample Tracker
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={routes.protocols.detail("service-report-tracker")}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#2a7797] text-sm font-medium transition-colors"
          >
            See also: Tracking Service Reports
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

      <nav
        aria-label="On this page"
        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      >
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand mb-2">
          On this page
        </p>
        <ol className="grid gap-1 sm:grid-cols-2 text-[13px]">
          {TOC.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-[#2a7797] hover:text-[#236584] hover:underline underline-offset-2"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="purpose" title="Purpose">
        <p>
          Use this protocol for PGCV SARS-CoV-2 genomic surveillance. Each row
          is one sequencing run (the old Run_Summary sheet): how many samples
          went on the instrument, how many got a lineage, and whether the run
          was uploaded to GISAID and ISLAP.
        </p>
        <p>
          Location: sidebar →{" "}
          <strong className="text-[#172126]">
            Sequence Analysis → COVID-19 Sample Tracker
          </strong>{" "}
          (
          <code className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded">
            /dashboard/services/covid-sample-tracker
          </code>
          ).
        </p>
        <Callout tone="warning" title="Not a client service report">
          Client sequence analysis, PDFs, peer review, and e-signatures live on
          the Service Report Tracker. Do not create a COVID run for a paying
          client job, and do not put a surveillance run on the Service Report
          Tracker.
        </Callout>
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
                  Team lead / team member
                </td>
                <td className="px-4 py-3">
                  Add, edit, and delete sequencing runs. Record receive/load
                  dates, sample and lineage counts, GISAID/ISLAP upload, and
                  review flags.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Trainee, intern, or officer
                </td>
                <td className="px-4 py-3">
                  This tracker is staff-only. Those roles cannot open or edit
                  COVID sequencing runs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          There is no reviewing-officer or approving-officer sign-off on this
          tracker. Public-database upload is recorded with the GISAID and ISLAP
          checkboxes, not an e-signature.
        </p>
      </Section>

      <Section id="before-you-start" title="Before you start">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Know the next unused{" "}
            <strong className="text-[#172126]">Run number</strong>. Numbers are
            unique lab-wide (they do not restart each year).
          </li>
          <li>
            Have the instrument Run ID if you use one (for example{" "}
            <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">
              NS_0061
            </code>{" "}
            or{" "}
            <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">
              IS_0048
            </code>
            ). Run IDs must also be unique when set.
          </li>
          <li>
            Sequencer is{" "}
            <strong className="text-[#172126]">NextSeq1000</strong> or{" "}
            <strong className="text-[#172126]">iSeq100</strong>, or leave as Not
            recorded.
          </li>
        </ul>
      </Section>

      <Section id="create" title="1. Add a sequencing run">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Open the{" "}
            <Link
              href={routes.services.covidSampleTracker}
              className="text-[#2a7797] hover:underline font-semibold"
            >
              COVID-19 Sample Tracker
            </Link>{" "}
            and click <strong className="text-[#172126]">Add Run</strong>.
          </li>
          <li>
            Fill <strong className="text-[#172126]">Run identity</strong>. Run
            number is required. Save even if some later fields are still blank.
          </li>
          <li>
            Click <strong className="text-[#172126]">Save</strong>.
          </li>
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Run identity
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <strong className="text-[#172126]">Run number</strong> —
                positive whole number. Cannot reuse an existing number.
              </li>
              <li>
                <strong className="text-[#172126]">Run ID</strong> — optional
                instrument or sheet ID. Cannot reuse an existing ID.
              </li>
              <li>
                <strong className="text-[#172126]">Sequencer</strong> —
                NextSeq1000, iSeq100, or Not recorded.
              </li>
              <li>
                <strong className="text-[#172126]">Extraction #</strong> —
                extraction batch(es), for example 56, 57.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              After save
            </p>
            <p className="text-xs">
              The run appears in Sequencing Runs, newest number first. Edit with
              the pencil; delete only if the row was entered in error.
            </p>
          </div>
        </div>
      </Section>

      <Section id="dates-counts" title="2. Dates and counts">
        <p>
          Open the run (pencil) and complete{" "}
          <strong className="text-[#172126]">Dates</strong> and{" "}
          <strong className="text-[#172126]">Counts</strong> as the wet-lab work
          happens.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">Date received</strong> — samples
            arrived for this run.
          </li>
          <li>
            <strong className="text-[#172126]">Date loaded</strong> — samples
            went on the sequencer. Year filters use loaded date, then received
            date if loaded is blank.
          </li>
          <li>
            <strong className="text-[#172126]">Samples sequenced</strong> —
            required, zero or more. The Samples tile at the top is the sum of
            this field.
          </li>
        </ul>
        <p>
          If load happened before receive, leave a{" "}
          <strong className="text-[#172126]">Review flag</strong> (for example
          “loaded before received”) so the row shows up under Review flag only.
        </p>
      </Section>

      <Section id="lineages" title="3. Assign lineages">
        <p>
          After bioinformatics, set{" "}
          <strong className="text-[#172126]">Lineage assigned</strong> to how
          many samples in the run received a lineage call. Leave it blank until
          assignment is done.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Must be a whole number, zero or more.</li>
          <li>Cannot be greater than Samples sequenced.</li>
          <li>
            The Assigned column shows the count and a percent of samples in that
            run. The header tile{" "}
            <strong className="text-[#172126]">% with assigned lineages</strong>{" "}
            is the same idea across all runs.
          </li>
        </ul>
      </Section>

      <Section id="uploads" title="4. GISAID and ISLAP">
        <p>
          When the run has been submitted to a public database, check the
          matching box under <strong className="text-[#172126]">Uploads</strong>
          :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">Uploaded GISAID</strong>
          </li>
          <li>
            <strong className="text-[#172126]">Uploaded ISLAP</strong>
          </li>
        </ul>
        <p>
          The table shows <strong className="text-[#172126]">Y</strong> or{" "}
          <strong className="text-[#172126]">N</strong>. Filter with GISAID yes,
          ISLAP yes, or Neither uploaded to find runs still waiting.
        </p>
        <Callout title="Checkboxes are the upload record">
          Checking a box does not upload sequences. Do the GISAID or ISLAP
          submission outside the dashboard, then mark the run here so the lab
          log stays current.
        </Callout>
      </Section>

      <Section id="review" title="5. Review flags">
        <p>
          Use <strong className="text-[#172126]">Review flag</strong> for
          anything a later reader should not miss (date order, wrong sequencer
          label, mixed iSeq IDs).{" "}
          <strong className="text-[#172126]">Comments</strong> hold longer
          notes.
        </p>
        <p>
          A non-empty review flag adds the run to the flagged count on
          Sequencing Runs. Turn on{" "}
          <strong className="text-[#172126]">Review flag only</strong> to work
          that list. Clear the flag once the issue is resolved.
        </p>
      </Section>

      <Section id="find" title="6. Find and filter runs">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Search by run number, Run ID, sequencer, extraction number,
            comments, or review flag.
          </li>
          <li>
            Filters: All years, All sequencers (including Not recorded), upload
            status, Review flag only.
          </li>
          <li>
            Deep-link a Run ID with{" "}
            <code className="text-[12px] bg-slate-100 px-1 py-0.5 rounded">
              /dashboard/services/covid-sample-tracker?run_id=NS_0061
            </code>
            .
          </li>
        </ul>
        <p>
          Repositories can be tagged COVID-19 and can store a matching Run ID.
          Incident reports that name a run ID currently open the Service Report
          Tracker, so for surveillance runs prefer this tracker’s search or
          deep-link.
        </p>
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
                  Couldn’t load COVID-19 Sample Tracker
                </td>
                <td className="px-4 py-3">
                  The covid_sequencing_run table is missing. Apply the latest
                  Supabase migration, then refresh.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Run number is already in use
                </td>
                <td className="px-4 py-3">
                  Run numbers are unique. Pick the next unused number.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Run ID is already in use
                </td>
                <td className="px-4 py-3">
                  That instrument ID is already on another row. Leave Run ID
                  blank or use a distinct value.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Cannot exceed samples sequenced
                </td>
                <td className="px-4 py-3">
                  Lineage assigned is higher than Samples sequenced. Fix the
                  count before saving.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Year filter hides a run
                </td>
                <td className="px-4 py-3">
                  Year comes from Date loaded, or Date received if loaded is
                  blank. Runs with neither date do not appear in a year list.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <ListOrdered className="w-3.5 h-3.5" />
          Genomic surveillance
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Upload className="w-3.5 h-3.5" />
          GISAID / ISLAP
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Flag className="w-3.5 h-3.5" />
          Review flags
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Info className="w-3.5 h-3.5" />
          Staff-only tracker
        </span>
      </div>
    </article>
  );
}
