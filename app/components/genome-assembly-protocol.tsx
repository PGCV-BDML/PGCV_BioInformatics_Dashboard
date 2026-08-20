import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Dna,
  FileText,
  Info,
  Lightbulb,
  Terminal,
} from "lucide-react";
import ProtocolPageNav from "@/app/components/protocol-page-nav";
import { routes } from "@/lib/routes";

const WORKFLOW_STAGES = [
  "Setup",
  "QC",
  "Trim",
  "Downsample",
  "Assemble",
  "Map / BLAST",
  "Deliver",
] as const;

const TOC = [
  { id: "purpose", label: "Purpose" },
  { id: "roles", label: "Roles" },
  { id: "before-you-start", label: "Before you start" },
  { id: "setup", label: "1. Install environments" },
  { id: "naming", label: "2. Prepare reads" },
  { id: "run", label: "3. Launch the script" },
  { id: "qc-trim", label: "4. QC and trim" },
  { id: "downsample", label: "5. Downsample" },
  { id: "assemble", label: "6. Assemble" },
  { id: "map", label: "7. Map and inspect" },
  { id: "id", label: "8. Identify and special cases" },
  { id: "pipes", label: "9. pipe1 and pipe2" },
  { id: "deliver", label: "10. Package and deliver" },
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[12px] bg-slate-100 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

export default function GenomeAssemblyProtocol() {
  return (
    <article className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-7 shadow-xl shadow-slate-400/20 space-y-8">
      <header className="space-y-4 border-b border-slate-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            label="SOP-BIOINFO-GA-001"
            className="bg-slate-100 text-slate-600 border-slate-200"
          />
          <StatusChip
            label="Sequence Analysis"
            className="bg-[#e6f4f8] text-[#2a7797] border-[#b7d7e4]"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[#2a7797] tracking-tight leading-tight">
            Short-read Genome Assembly
          </h1>
          <p className="mt-2 text-sm text-[#65706f] font-quicksand leading-relaxed">
            Use the PGCV utility script to quality-check, trim, downsample,
            assemble, map, and identify Illumina short paired-end reads
            (2×150 bp). Task names are case-sensitive.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={routes.services.tracker}
            className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Open Service Report Tracker
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

      <ProtocolPageNav items={TOC} />

      <Section id="purpose" title="Purpose">
        <p>
          Use this protocol for client or in-house{" "}
          <strong className="text-[#172126]">whole-genome assembly</strong> of
          short paired-end NGS reads. The PGCV utility script is an interactive
          bash menu that wraps FastQC, Trimmomatic, seqkit, Velvet, SPAdes,
          MEGAHIT, minimap2, SAMtools, BLAST, Cutadapt, and GetOrganelle.
        </p>
        <p>
          After analysis, record the job on the{" "}
          <Link
            href={routes.services.tracker}
            className="text-[#2a7797] hover:underline font-semibold"
          >
            Service Report Tracker
          </Link>{" "}
          and deliver the FASTA, BAM, and README package described in step 10.
        </p>
        <Callout tone="warning" title="This is not a dashboard workflow">
          The script runs on a Linux or WSL workstation with conda. The
          dashboard only tracks the service record. Do not wait for an in-app
          assembler.
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
                  Analyst / team member
                </td>
                <td className="px-4 py-3">
                  Prepare reads, run the utility script, inspect assemblies in
                  Tablet or IGV, and stage the delivery folder.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Team lead / reviewing officer
                </td>
                <td className="px-4 py-3">
                  Confirm coverage, mapping rate, and contig choice before
                  client release. Sign the service report after the PDF is
                  uploaded.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Trainee or intern
                </td>
                <td className="px-4 py-3">
                  Run QC and trim under supervision. Do not deliver FASTA or
                  BAM files without a staff review of{" "}
                  <Code>summary.xls</Code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="before-you-start" title="Before you start">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Linux or WSL with conda initialized in bash. On a new WSL machine,
            install the calculator used for 30× downsampling:{" "}
            <Code>sudo apt install bc</Code>.
          </li>
          <li>
            Absolute paths for the reads folder and the output folder. Prefer
            one project directory for both so trim and{" "}
            <Code>pipe1</Code> write to the same place (see step 2).
          </li>
          <li>
            Paired FASTQ files named with <Code>_R1</Code> and{" "}
            <Code>_R2</Code> in the filename. The script pairs samples with{" "}
            <Code>*_R1*</Code> / <Code>*_R2*</Code>.
          </li>
          <li>
            Expected insert / genome length if you will downsample to 30×.
          </li>
        </ul>
      </Section>

      <Section id="setup" title="1. Install environments">
        <p>
          Launch the script. It checks for the <Code>PGCV_*</Code> conda
          environments and offers to install any that are missing. First-time
          users can also type <Code>scriptcheck</Code> at the task prompt.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Environment</th>
                <th className="px-4 py-2.5 font-bold">Tool</th>
                <th className="px-4 py-2.5 font-bold">Pin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  PGCV_spades
                </td>
                <td className="px-4 py-3">SPAdes</td>
                <td className="px-4 py-3">
                  version 4 (<Code>spades=4</Code>)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  PGCV_samtools
                </td>
                <td className="px-4 py-3">SAMtools</td>
                <td className="px-4 py-3">
                  version 1.20. Confirm with{" "}
                  <Code>conda list -n PGCV_samtools samtools</Code>. If the
                  pin is missing, recreate:{" "}
                  <Code>
                    conda create -n PGCV_samtools -c bioconda samtools=1.20
                  </Code>
                  .
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  PGCV_megahit, PGCV_velvet, PGCV_seqkit, PGCV_trimmomatic,
                  PGCV_seqtk, PGCV_minimap2, PGCV_fastqc, PGCV_blast,
                  PGCV_getorganelle, PGCV_figlet
                </td>
                <td className="px-4 py-3">Matching Bioconda (or tsnyder for figlet) packages</td>
                <td className="px-4 py-3">Created by scriptcheck</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126]">
                  PGCV_cutadapt
                </td>
                <td className="px-4 py-3">Cutadapt</td>
                <td className="px-4 py-3">
                  Not created by scriptcheck. Install before primer trimming:{" "}
                  <Code>
                    conda create -n PGCV_cutadapt -c bioconda cutadapt
                  </Code>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout title="Activate the PGCV_ prefix">
          Every tool call uses <Code>conda activate PGCV_…</Code>, not a
          generic <Code>samtools</Code> environment. Do not reuse older env
          names.
        </Callout>
      </Section>

      <Section id="naming" title="2. Prepare reads">
        <p>
          Put all paired FASTQ files for this job in one reads directory. The
          sample name is everything before <Code>_R1</Code>.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Accepted names
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Code>SampleA_R1.fastq.gz</Code> /{" "}
                <Code>SampleA_R2.fastq.gz</Code>
              </li>
              <li>
                <Code>SampleA_R1_001.fastq.gz</Code> /{" "}
                <Code>SampleA_R2_001.fastq.gz</Code>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Will not pair
            </p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Code>_1.fastq</Code> / <Code>_2.fastq</Code> (no{" "}
                <Code>_R1</Code> / <Code>_R2</Code>)
              </li>
              <li>
                Unpaired files, or R1/R2 counts that do not match
              </li>
            </ul>
          </div>
        </div>
        <Callout tone="warning" title="Use one project folder for trim and pipes">
          <Code>trim</Code> creates <Code>$OUT_DIR/trimmed</Code> but writes
          FASTQ into <Code>$SRC_DIR/trimmed</Code>. For <Code>pipe1</Code> /{" "}
          <Code>pipe2</Code>, set Reads Directory and Output Directory to the{" "}
          <strong>same project folder</strong> so those paths are identical.
        </Callout>
      </Section>

      <Section id="run" title="3. Launch the script">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Open a bash shell with conda initialized (WSL or Linux).
          </li>
          <li>
            Run the utility script. The banner is printed with figlet, then
            the environment check runs.
          </li>
          <li>
            At the prompt, type a task name exactly as listed (for example{" "}
            <Code>trim</Code>, <Code>Megahit</Code>, <Code>BLASTn</Code>,{" "}
            <Code>pipe1</Code>).
          </li>
          <li>
            Enter absolute paths when asked. Mapping also asks for an Assembly
            Directory of <Code>*.fasta</Code> files.
          </li>
        </ol>
        <p>
          After each standalone task the menu returns.{" "}
          <Code>pipe1</Code> and <Code>pipe2</Code> chain several tasks, then
          return to the menu.
        </p>
        <Callout title="Task names are case-sensitive">
          Type <Code>Megahit</Code>, not megahit. Type <Code>BLASTn</Code>,
          not blastn. An unrecognized name returns you to the interface after
          five seconds.
        </Callout>
      </Section>

      <Section id="qc-trim" title="4. QC and trim">
        <p>
          <strong className="text-[#172126]">qualitycheck</strong> runs FastQC
          (<Code>-t 12</Code>) on every <Code>*fastq*</Code> file in the reads
          directory. HTML and ZIP reports land in{" "}
          <Code>$OUT_DIR/qualitycheck</Code> with{" "}
          <Code>qualitycheck_log.txt</Code>. Open the HTML files and confirm
          adapter content, quality drop at ends, and unexpected length
          distributions before trimming.
        </p>
        <p>
          <strong className="text-[#172126]">trim</strong> runs Trimmomatic PE
          (8 threads, Phred+33) with a script-generated{" "}
          <Code>Nextera_adapters.fa</Code> (Nextera transposase PrefixNX,
          Trans1 / Trans2 and reverse complements, and poly-G). Settings:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <Code>ILLUMINACLIP:Nextera_adapters.fa:2:30:10</Code>
          </li>
          <li>
            <Code>SLIDINGWINDOW:4:20 LEADING:20 TRAILING:20 MINLEN:36</Code>
          </li>
        </ul>
        <p>
          Paired outputs are kept; unpaired FASTQ files are deleted. Check{" "}
          <Code>trim_log.txt</Code> for surviving-read counts.
        </p>
        <p>
          For amplicon reads, use primer tasks instead of (or after) Nextera
          trim:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">trimprimer2</strong> — Cutadapt
            on paired FASTQ. You supply forward and reverse primer sequences.
            Flags: <Code>-e 0.2 -m 36:36 --times 5 --rc --discard-trimmed</Code>
            . Reads that still contain primer are discarded.
          </li>
          <li>
            <strong className="text-[#172126]">trimprimer</strong> — Cutadapt
            on assembled <Code>*.fasta</Code> files (error rate 0.15),
            including reverse complements of both primers. Output:{" "}
            <Code>$OUT_DIR/trimmed_fasta</Code>.
          </li>
        </ul>
      </Section>

      <Section id="downsample" title="5. Downsample">
        <p>
          <strong className="text-[#172126]">downsample</strong> uses seqkit{" "}
          <Code>sample -s 100</Code> (fixed seed) so reruns of the same input
          are comparable. Choose a method when prompted:
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Parameter 1 — proportion
            </p>
            <p className="text-xs">
              Enter a fraction such as <Code>0.10</Code>. Each FASTQ is sampled
              to that proportion of reads.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b] mb-2">
              Parameter 2 — 30× coverage
            </p>
            <p className="text-xs">
              Enter expected length in bp. Read count is{" "}
              <Code>length × 30 / 150</Code> (assumes 150 bp reads after trim).
              Requires <Code>bc</Code>. This is what <Code>pipe1</Code> /{" "}
              <Code>pipe2</Code> use.
            </p>
          </div>
        </div>
        <p>
          Outputs go to <Code>$OUT_DIR/downsample</Code> with{" "}
          <Code>downsample_log.txt</Code>. Point later assemblers at that
          folder unless you intentionally assemble unsampled reads.
        </p>
      </Section>

      <Section id="assemble" title="6. Assemble">
        <p>
          Each assembler writes a per-sample folder plus a{" "}
          <Code>fasta/</Code> directory of representative sequences with the
          header rewritten to <Code>&gt;sample_name</Code>. Always keep the
          full contig file in the sample folder; the <Code>fasta/</Code> copy
          is a single-contig summary for mapping and BLAST.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#7a8e9b]">
              <tr>
                <th className="px-4 py-2.5 font-bold">Task</th>
                <th className="px-4 py-2.5 font-bold">Settings</th>
                <th className="px-4 py-2.5 font-bold">Representative contig</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Megahit
                </td>
                <td className="px-4 py-3">
                  12 threads; paired <Code>-1 / -2</Code>. Log:{" "}
                  <Code>MEGAHIT_log.txt</Code>.
                </td>
                <td className="px-4 py-3">
                  Longest contig (seqkit sort by length, then head).
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  spades
                </td>
                <td className="px-4 py-3">
                  <Code>--careful -k 21,33,55,77,99,127 --phred-offset 33
                  --cov-cutoff auto -t 12</Code>. SPAdes 4. Log:{" "}
                  <Code>spades_log.txt</Code>.
                </td>
                <td className="px-4 py-3">
                  First contig in the SPAdes contig file (usually the longest).
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  spades_krefined
                </td>
                <td className="px-4 py-3">
                  Odd k-mers 21–77; Phred 33; auto coverage cutoff; 12 threads.
                  No <Code>--careful</Code>.
                </td>
                <td className="px-4 py-3">First contig, as with spades.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  velvet
                </td>
                <td className="px-4 py-3">
                  <Code>velveth</Code> k-mers 21–141 step 2;{" "}
                  <Code>velvetg -scaffolding no -cov_cutoff auto</Code>. Empty
                  contig folders are dropped. Best k-mer is chosen from seqkit
                  stats (highest N50-style column). Logs:{" "}
                  <Code>velveth_log.txt</Code>, <Code>velvetg_log.txt</Code>.
                  Per-sample k-mer tables go to <Code>kmer_stats/</Code>.
                </td>
                <td className="px-4 py-3">Longest contig from the winning k-mer.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Compare the three assemblers on length, coverage after mapping, and
          BLAST identity. Do not deliver a contig just because it is the
          longest.
        </p>
      </Section>

      <Section id="map" title="7. Map and inspect">
        <p>
          <strong className="text-[#172126]">mapping</strong> maps the sample’s
          R1/R2 reads back to each <Code>*.fasta</Code> in the Assembly
          Directory. The FASTA prefix must match the read prefix before{" "}
          <Code>_R1</Code> / <Code>_R2</Code>.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            minimap2 short-read preset: <Code>-ax sr -t 46</Code>.
          </li>
          <li>
            SAMtools 1.20: sort (12 threads), index, and{" "}
            <Code>samtools coverage</Code>.
          </li>
          <li>
            SAM files are deleted. Each sample folder keeps FASTA,{" "}
            <Code>.sorted.bam</Code>, <Code>.sorted.bam.bai</Code>, coverage
            table, logs, and a client README for Tablet.
          </li>
        </ol>
        <p>
          A job-level <Code>$OUT_DIR/summary.xls</Code> concatenates coverage
          plus raw read count, mapped read count, and percent mapped
          (flagstat). Review mean depth, coverage fraction, and percent mapped
          before release.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a8e9b]">
            View in Tablet
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs">
            <li>
              Install Tablet from{" "}
              <a
                href="https://ics.hutton.ac.uk/tablet/"
                className="text-[#2a7797] hover:underline font-semibold"
              >
                ics.hutton.ac.uk/tablet
              </a>
              . IGV is also acceptable.
            </li>
            <li>
              Open Assembly: primary file = <Code>*.sorted.bam</Code>;
              reference = <Code>*.fasta</Code>.
            </li>
            <li>
              Click the contig. Check even coverage, clipped ends, and whether
              a second contig would have been a better choice.
            </li>
          </ol>
        </div>
        <p>
          <strong className="text-[#172126]">mapassembly</strong> maps reads to
          a supplied reference FASTA (12 threads), then writes a SAMtools
          consensus into <Code>mapassembly/consensus/</Code>. Use this when a
          close reference exists and de novo assembly is not required.
        </p>
      </Section>

      <Section id="id" title="8. Identify and special cases">
        <p>
          <strong className="text-[#172126]">BLASTn</strong> queries each{" "}
          <Code>*.fasta</Code> against NCBI <Code>nt</Code> remotely (
          <Code>-max_target_seqs 5</Code>, tabular fields: qseqid, qlen, qcovs,
          evalue, pident, sacc, stitle). Needs outbound network access. Combined
          table: <Code>$OUT_DIR/BLASTn/blast_summary.xls</Code>.
        </p>
        <p>
          <strong className="text-[#172126]">mtDNA</strong> runs GetOrganelle
          on paired reads: 8 threads, 10 rounds, k-mers{" "}
          <Code>21,45,65,85,105</Code>, <Code>-F animal_mt</Code>. FASTA copies
          go to <Code>$OUT_DIR/mtDNA/fasta</Code>. Use only for animal
          mitochondrial targets.
        </p>
      </Section>

      <Section id="pipes" title="9. pipe1 and pipe2">
        <p>
          Use a pipe when the job is a standard de novo assembly of trimmed,
          30×-sampled Illumina PE reads and you want all three assemblers in
          one pass.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-[#172126]">pipe1</strong> — qualitycheck →
            trim → downsample at 30× → velvet → spades → Megahit.
          </li>
          <li>
            <strong className="text-[#172126]">pipe2</strong> — same as pipe1,
            then <Code>spades_krefined</Code>.
          </li>
        </ul>
        <p>
          You still enter Reads Directory, Output Directory, and expected
          length (bp) because downsampling is locked to parameter 2. After the
          pipe, run <Code>mapping</Code> yourself against the assembler you
          choose to deliver, then BLAST if identification is in the service
          scope.
        </p>
        <Callout tone="warning" title="Pipes skip mapping, BLAST, and primers">
          <Code>pipe1</Code> / <Code>pipe2</Code> do not map reads, do not
          BLAST, and do not trim custom primers. Finish those as separate
          tasks.
        </Callout>
      </Section>

      <Section id="deliver" title="10. Package and deliver">
        <p>
          Each mapping sample folder already contains a README for the client.
          Confirm the folder has:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <Code>*.fasta</Code> — assembled (or consensus) sequence
          </li>
          <li>
            <Code>*.sorted.bam</Code> — reads mapped to that sequence
          </li>
          <li>
            <Code>*.sorted.bam.bai</Code> — BAM index
          </li>
        </ol>
        <p>
          Attach or archive <Code>summary.xls</Code>, the chosen assembler log,
          and BLAST results if they were requested. Then create or complete the
          client row on the{" "}
          <Link
            href={routes.protocols.detail("service-report-tracker")}
            className="text-[#2a7797] hover:underline font-semibold"
          >
            Service Report Tracker
          </Link>{" "}
          (PDF, peer review, e-sign, approve, submit).
        </p>
        <Callout title="Tools to cite in the report">
          Assembler: Velvet, SPAdes 4, and/or MEGAHIT as used. Read mapping:
          minimap2. BAM sort, index, coverage, and consensus: SAMtools 1.20.
          QC: FastQC. Trim: Trimmomatic (Nextera clip, Q20 window, min length
          36). Optional: Cutadapt, BLAST+ remote nt, GetOrganelle.
        </Callout>
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
                  No R1/R2 files found, or pairs mismatch
                </td>
                <td className="px-4 py-3">
                  Filenames lack <Code>_R1</Code> / <Code>_R2</Code>, or R1 and
                  R2 counts differ. Rename to the Illumina pattern; do not use{" "}
                  <Code>_1/_2</Code> only.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  <Code>bc: command not found</Code> during downsample
                </td>
                <td className="px-4 py-3">
                  WSL/Linux missing bc. Run <Code>sudo apt install bc</Code>.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  conda activate fails / command not found
                </td>
                <td className="px-4 py-3">
                  conda is not initialized in this shell, or the{" "}
                  <Code>PGCV_*</Code> env was never created. Source conda,
                  then rerun <Code>scriptcheck</Code>.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Cutadapt environment missing
                </td>
                <td className="px-4 py-3">
                  <Code>scriptcheck</Code> does not install{" "}
                  <Code>PGCV_cutadapt</Code>. Create it before{" "}
                  <Code>trimprimer</Code> or <Code>trimprimer2</Code>.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  pipe1 downsample finds no trimmed FASTQ
                </td>
                <td className="px-4 py-3">
                  Reads Directory and Output Directory were different, so trim
                  wrote under the source path. Use the same project folder for
                  both, or copy paired files into{" "}
                  <Code>$OUT_DIR/trimmed</Code> before continuing.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  mapping finds no reads for a FASTA
                </td>
                <td className="px-4 py-3">
                  FASTA basename does not match the read prefix. Rename{" "}
                  <Code>sample.fasta</Code> so it matches{" "}
                  <Code>sample_R1…</Code>.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  BLAST hangs or fails
                </td>
                <td className="px-4 py-3">
                  <Code>-remote</Code> needs NCBI access. Retry later, or run
                  BLAST against a local <Code>nt</Code> outside this script.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#172126] align-top">
                  Input unrecognized
                </td>
                <td className="px-4 py-3">
                  Task name was mistyped. Use the exact menu strings, including
                  capital M on <Code>Megahit</Code> and capital N on{" "}
                  <Code>BLASTn</Code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Terminal className="w-3.5 h-3.5" />
          PGCV utility script
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Dna className="w-3.5 h-3.5" />
          Velvet / SPAdes 4 / MEGAHIT
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <FileText className="w-3.5 h-3.5" />
          FASTA + BAM delivery
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7a8e9b] font-quicksand">
          <Info className="w-3.5 h-3.5" />
          SAMtools 1.20
        </span>
      </div>
    </article>
  );
}
