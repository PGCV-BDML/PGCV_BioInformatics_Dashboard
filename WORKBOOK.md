# PGCV Bioinformatics Dashboard — Intern Workbook

> **Status:** Working draft (last refresh 2026-07-19). This workbook is the team-handoff companion to `README.md`, `ARCHITECTURE.md`, and `SECURITY.md`. It is built directly from the CompSci and Biology activity sheets in the **"Bioinformatics Activity Sheets"** Google Doc (owner: `mtmisola`, doc id `1NL6dGKCZvVvw8zCZn6_RMme9mPXcHDjrdn4rsMCtrWw`) and from the implementation in this repository.
>
> **Purpose:** Everything a new intern or the next cohort needs to know on day 1 — team, stack, data model, sprint plan, training/internship content, service catalog, and the items still flagged as pending.

---

## 0. Document map

| Source | Where it lives in this workbook |
|---|---|
| CompSci tab → §I The Team | §1 Team & contacts |
| CompSci tab → §II Tech Stack Decision | §2 Tech stack & rationale |
| CompSci tab → §III Data Model | §3 Data model (17 active + 3 descoped) |
| CompSci tab → §IV Architecture | §4 Architecture & repo layout |
| CompSci tab → §V Component Status | §5 Component status (delivered vs. planned) |
| CompSci tab → §VI Implementation Log | §6 Sprint plan & ongoing tasks |
| CompSci tab → §VII Privacy & Security Sign-Off | §7 Privacy & security checklist |
| CompSci tab → §VIII Repository & Deployment | §8 Deployment & live URLs |
| CompSci tab → §IX–X Sprint retros & final reflection | §12 Retrospectives (pending) |
| Biology tab → Workflow Vocabulary / Pipeline mappings | §9 Biology domain content |
| Biology tab → Service Report Tracker — Field Definitions | §10 Service Report Tracker fields |
| Biology tab → Landing Page Metrics | §11 Landing page metrics spec |
| Biology tab → Training Module — Content | §13 Training content (pre-test, post-test, evaluation) |
| Biology tab → Internship Module — Content | §14 Internship content (pre, post, evaluation, certificate) |
| Biology tab → Services List | §15 Service catalog (WGS, Amplicon, Metabarcoding, Transcriptomics, Shotgun Metagenomics) |
| Biology tab → Collaboration & Accomplishments | §16 Collaboration tracker notes & accomplishment summary |
| Biology tab → Validation Log | §17 Validation log (pending) |

---

## 1. Team & contacts

| Track | Name | School | Year | Email |
|---|---|---|---|---|
| CompSci | Mark Leonel Misola | UP Visayas | 3rd Year | mtmisola@up.edu.ph |
| CompSci | Chakinzo Sombito | UP Visayas | 3rd Year | cnsombito@up.edu.ph |
| CompSci | Angelique Margaret Ardeña | UP Visayas | 3rd Year | amardena@up.edu.ph |
| Biology | Kirsten Ashley Macadaeg | UP Los Baños | 3rd Year | mkirstenashley@gmail.com |
| Biology | Jan Jorenz Nemenzo | Visayas State University | 3rd Year | nemenzojanjorenz@gmail.com |
| Biology | John Mar Lavilla | Pamantasan ng Lungsod ng Maynila | 3rd Year | lavillajohnmar@gmail.com |

**Comms channel:** Facebook Messenger group chats (CompSci + Biology + Supervisors).

**Biology visual ownership (color tags in figures/diagrams):**
- Pink → Kirsten
- Blue → John
- Green → Jorenz

---

## 2. Tech stack & rationale

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Hosting | Vercel |
| Auth | Supabase Auth (Google login only) |
| Database | Supabase (PostgreSQL) |
| Storage | Google Drive (linked via URL fields) |
| VCS | GitHub |
| Libraries | Supabase JS Client, React, recharts, lucide-react |

**Why this stack (verbatim rationale from the CompSci activity sheet):**
> The lab's data model is highly relational, making Supabase's PostgreSQL ideal. The strict "No Credit Card" rule eliminated Firebase because secure backend logic requires paid Cloud Functions. By pairing Next.js Server Actions (free on Vercel) with Supabase Row Level Security (RLS, free), we can securely handle Audit Logs and Role-Based Access Control without ever triggering a billing requirement.

**Rejected:** Firebase (Firestore + Firebase Auth) — Cloud Functions needed for secure backend logic require the paid Blaze plan.

**Pinned versions (from `package.json`):** Next.js 16.2.10, React 19.2.4, TypeScript ^5, Tailwind v4, `@supabase/supabase-js ^2.110.0`, `recharts ^3.9.2`, `lucide-react ^1.23.0`.

> **Heads-up — Next.js 16:** The repo's own `AGENTS.md` warns that Next.js 16 has breaking changes versus older training data. Read `node_modules/next/dist/docs/` before editing routing or data-fetching patterns.

---

## 3. Data model — 17 active + 3 descoped

All entities live in `supabase/migrations/19_initial_schema.sql` (plus `20260721000000_add_institution_to_users.sql`). RLS is enabled on every table in `21_enable_rls.sql`; policies live in `22_rls_policies.sql`; audit triggers attach via `23_audit_triggers.sql`; `set_updated_at` via `24_updated_at_triggers.sql`.

> **⚠️ Production drift (as of 2026-07-19):** The local `supabase/migrations/` folder contains **11 SQL files**. The Supabase project's migration history contains **22 applied migrations** (see §19 for the full list). 15 production hot-fixes (RLS policy consolidations, `audit_log.action` enum fix, `users` table rename, `repository_link` columns, etc.) are intentionally not in the local repo — they are retroactive fixes of the 19-24 base migrations, not part of the canonical migration path (removed in commit `362bb5d`). Next migration should reconcile: export the production schema into a fresh `supabase/migrations/25_reconcile_production.sql` that captures the current production state, so a fresh `supabase db reset` will reproduce it byte-for-byte.

### 3.1 Active entities (17)

| Entity | Fields |
|---|---|
| `users` | `id`, `name`, `email`, `role`, `track_assignment` (if internship participant), `institution` (added later), `created_at` |
| `client` | `id`, `name`, `affiliation`, `contact_info`, `notes`, `created_at` |
| `service` | `id`, `name`, `description`, `category` (WGS / amplicon / metabarcoding / transcriptomics / shotgun / phylogenetics / custom), `pipeline_default`, `active` |
| `project` | `id`, `name`, `client_id`, `service_id`, `status`, `lead_user_id`, `start_date`, `target_delivery_date`, `actual_delivery_date`, `repository_link` (added to replace the descoped Repositories module) |
| `sample` | `id`, `project_id`, `identifier`, `metadata` (flexible JSONB; structure varies by service) |
| `analysis` | `id`, `project_id`, `pipeline`, `pipeline_version`, `status`, `assignee_id`, `started_at`, `completed_at`, `output_link` |
| `service_report` | `id`, `analysis_id`, `report_link`, `delivered_at`, `delivered_by`, `client_acknowledged_at` |
| `collaboration` | `id`, `partner_org`, `lead_user_id`, `start_date`, `status`, `documents` (array of links), `notes`, `repository_link` |
| `training_program` | `id`, `title`, `type` (training \| internship), `start_date`, `end_date`, `instructor_id`, `description` |
| `training_session` | `id`, `program_id`, `date`, `title`, `module_link`, `attendance_required` |
| `module` | `id`, `program_id`, `title`, `html_content_link`, `order`, `save_log_enabled` |
| `assessment` | `id`, `program_id`, `type` (pre_test \| post_test \| evaluation), `questions` (array) |
| `assessment_response` | `id`, `assessment_id`, `participant_id`, `answers`, `score`, `submitted_at` |
| `certificate` | `id`, `program_id`, `participant_id`, `issued_at`, `pdf_link` |
| `audit_log` | `id`, `user_id`, `action`, `target_type`, `target_id`, `timestamp`, `details` |
| `onboarding_document` | `id`, `program_id`, `title`, `link`, `is_required` |
| `task` | `id`, `title`, `assignee_id`, `due_date`, `status`, `priority`, `linked_project_id` (nullable) |

> **Note:** The implementation adds one extra table, `document_template`, beyond the 17 listed above. It exists in `19_initial_schema.sql` for document-template management. Not in the original spec; harmless to keep.

### 3.2 Descoped / excluded entities

These were intentionally removed from the original starter file:

| Entity | Fields (retained for reference only) |
|---|---|
| `accomplishment` | `id`, `type` (activity, publication, project, public_engagement, extension_work), `title`, `date`, `participants`, `link`, `description` |
| `calendar_event` | `id`, `title`, `event_type` (tour, training, lab_event, deadline, other), `start_datetime`, `end_datetime`, `linked_program_id` (nullable), `linked_project_id` (nullable), `created_by` |
| `repository` | `id`, `kind` (github \| drive), `title`, `url`, `description`, `category` (pipelines, datasets, client_sequences, etc.) |

The `repository_link` URL fields on `project` and `collaboration` replace the need for a dedicated `repository` table. Accomplishments and calendar events are stubbed in the UI as "Coming Soon" pages.

### 3.3 Open domain question (Biology to confirm)

> "What exact workflow states and metadata fields does the Biology track need for the Service Report tracker?"
> — CompSci activity sheet §III, open questions

This is the one outstanding data-model question. The current `analysis.status` and `project.status` enums are placeholders; the biology track must finalize the exact state machine.

### 3.4 Archiving strategy (verbatim)

> The strict AuditLog requirement (tracking all state changes and deletions) will be implemented entirely via free PostgreSQL Triggers in Supabase, bypassing the need for paid cloud functions.
> The `backup-audit` Supabase Edge Function is scheduled to run periodically to transfer audit logs over a month old (28 days) directly to the in-house team's Google Sheets, deleting them from the Supabase database afterward.
> — CompSci activity sheet §III

Implemented: `audit_session_event` and `audit_data_modification` RPCs (`supabase/migrations/20260718…` and `20260720…`), called from `app/components/sessionauditor.tsx` and `app/dashboard/services/page.tsx`.

---

## 4. Architecture & repo layout

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router — all page routes |
| `components/` | Reusable React UI components using Tailwind |
| `lib/supabase.ts` | Supabase client and CRUD helpers (`getRowsFromDB`, `saveDataToDB`, `deleteDataFromDB`) |
| `types/database.ts` | TypeScript types for rows and enums |
| `supabase/migrations/` | 11 local SQL migration files (schema, RLS, audit, triggers, seed data). **22 applied to production** — see §19 for the drift list. |

**Naming:** kebab-case for routes, PascalCase for components, all files `.tsx`. **No plain `.ts` business logic in the app** — the spec notes "there is no TypeScript dependency" (i.e., no TS-only code path) so all app code lives in `.tsx`. (`lib/supabase.ts` and `types/database.ts` are the legitimate exceptions.)

**Auth flow:**
1. User clicks "Login with Google" on `/login`.
2. Supabase Auth runs the OAuth 2.0 handshake.
3. Supabase returns a JWT; Next.js stores the session and redirects to `/dashboard`.
4. JWT is attached to every Supabase request via the JS client's `Authorization: Bearer` header.

**DB access:** Direct from frontend and Server Components, protected entirely by Supabase RLS. No custom API layer. This is how the data-privacy enforcement happens at the database level.

**Out of scope (MVP):** User management features (admin UI, user deletion, role changes via app). Role assignment and user removal are manual DB-admin operations via the Supabase SQL Editor. The `protect_user_role` trigger prevents non-`team_lead` from changing the `role` column — defense-in-depth.

**Deployment:** Push to `main` branch on GitHub → Vercel auto-detects the push, applies `.env` variables, and deploys to a secure HTTPS domain. Fully automated CI/CD.

---

## 5. Component status (as of 2026-07-19)

| # | Component | Route | Status |
|---|---|---|---|
| 3.1 | Landing Page | `/dashboard` | ✅ Functional. KPI cards, real `task` fetch, recharts bar+pie, year filter. "Upcoming Events" is a "Coming Soon" stub. |
| 3.2 | Projects | `/dashboard/projects` | ✅ Functional. Full CRUD, filters, sort, pagination, `repository_link`, status dropdown. |
| 3.3 | Bioinformatics Services | `/dashboard/services` | ✅ Functional. Tabs for Sequence Analysis, Training, Internship. Status tracker, fallback report generator, audit logging on report delivery. |
| 3.3.1 | Client Sequence Analysis | `/dashboard/services` (tab 1) | ✅ Functional. |
| 3.3.2 | Training | `/dashboard/services/training` + `/[id]/{page,assessment,participants,evaluation,onboarding,certificate}` | ✅ Functional. |
| 3.3.3 | Internship | `/dashboard/services/internship` + `/[id]/{page,participants,evaluation,onboarding,certificate,assessment}` | ✅ Functional. |
| 3.4 | Collaborations | `/dashboard/collaborations` | ✅ Functional. Full CRUD, `repository_link`, documents[] as chips. |
| 3.5 | Calendar | `/dashboard/calendar` | 🚧 "Coming Soon" stub. |
| 3.6 | Accomplishments | `/dashboard/accomplishments` | 🚧 "Coming Soon" stub. |
| 3.7 | Services List | `/dashboard/services-list` | 🚧 Stub with the 7 hardcoded service categories from the spec. |
| 3.8 | Repositories | `/dashboard/repositories` | 🚧 "Coming Soon" stub. (URLs live in `project.repository_link` and `collaboration.repository_link`.) |
| — | Tasks | `/dashboard/tasks` | ✅ Functional (extra route; not in the 8-component count). Full CRUD, status/priority, linked project, assignee. |

> **README drift:** The repo's `README.md` still describes Bioinformatics Services as a "Coming Soon" stub and says audit logging is "not yet implemented." Both are false on `main` as of the recent merges — see §17.

---

## 6. Sprint plan & ongoing tasks

### 6.1 Sprint allocation

| Sprint | Dates | Focus |
|---|---|---|
| 1 | Jun 29 – Jul 5 | Architecture & DB setup, auth & data privacy (RLS configuration) |
| 2 | Jul 6 – Jul 12 | Projects & Collaborations trackers, Landing page analytics, stub pages, task CRUD |
| 3 | Jul 13 – Jul 17 | Bioinformatics Services tracker (core engine), cross-track QA & testing |
| 4 | Jul 18 – Jul 20 | Code polish & bug fixes, final documentation, handover & demo prep |

### 6.2 Ongoing tasks (named in the CompSci sheet)

**(a) Biology Activity Sheet Population** — owner: Bio + CS coordination, ongoing across all sprints. The biology track must keep `biology_activity_sheet.html` up to date with sprint notes, content drafts, module URLs, assessment questions, and validation feedback. Required by Deliverable 3.

Checklist:
- [ ] Sprint 1 notes and data-model feedback captured
- [ ] Sprint 2 content drafts (assessments, modules) added
- [ ] Sprint 3 QA feedback and HTML module links added
- [ ] Final reflection completed before handover
- [ ] Verified by reviewer

**(b) Task CRUD UI** — owner: CompSci, Sprint 2. Build `app/tasks/page.tsx`, `app/tasks/new/page.tsx`, `app/tasks/[id]/page.tsx`. **Status (as of 2026-07-19):** implemented at `app/dashboard/tasks/page.tsx` (not `app/tasks/*` as originally scoped; the route was moved under the dashboard layout during integration).

Checklist:
- [x] Task list view built
- [x] New task form built
- [x] Edit/delete task form built
- [ ] Verified by reviewer

---

## 7. Privacy & security checklist

From CompSci §VII. Each item is annotated with where the requirement is met.

| # | Item | Where it's met |
|---|---|---|
| 1 | HTTPS everywhere | Vercel auto-HTTPS for `pgcv-bioinformatics-dashboard.vercel.app` |
| 2 | Google login only | `app/login/page.tsx` — single OAuth provider, no password UI |
| 3 | Sign-out clears session | `app/components/sidebar.tsx` — `supabase.auth.signOut()` → redirect to `/login` |
| 4 | DB rules require auth | `app/dashboard/layout.tsx` — `supabase.auth.getSession` + `onAuthStateChange` redirect to `/login` if no session; RLS policies require `auth.uid()` |
| 5 | Role-based access | `22_rls_policies.sql` — staff/team_lead/trainee/intern policies per table |
| 6 | Encryption at rest | ⚠️ **Verify in Supabase dashboard** (Sprint 1 follow-up; default is on for free tier) |
| 7 | No secrets in repo | `.env.example` ships placeholders only; `.env.local` not committed |
| 8 | Audit log | `23_audit_triggers.sql` covers insert/update/delete on `projects`, `analyses`, `service_reports`, `users`, `collaborations`, `training_programs`. `sessionauditor.tsx` covers `user_login`/`user_logout`. **`role_change` and `data_export` not yet covered** (Sprint 1–2 follow-up). |
| 9 | Privacy notice | Full Data Privacy Notice in `app/login/page.tsx` footer (data collected, purpose, retention, access, deletion contact `bdml@pgcvisayas.upv.edu.ph`) |
| 10 | RA 10173 considered | `SECURITY.md` §7 covers compliance |
| 11 | Test walkthroughs | Sprint 3 — to be documented in a separate test-script file (not yet created) |

---

## 8. Deployment & live URLs

| | |
|---|---|
| **Repo** | https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard |
| **Live app** | https://pgcv-bioinformatics-dashboard.vercel.app/ |
| **Docs in this repo** | `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, this `WORKBOOK.md` |
| **CI/CD** | Push to `main` → Vercel auto-deploys |
| **Supabase project** | (configured via `.env.local`; URL + anon key only — both free-tier compatible) |

---

## 9. Biology domain content

### 9.1 Workflow vocabulary (Bio track)

| Term | Definition |
|---|---|
| QC (Quality Control) | Checking sequencing reads for quality before downstream analysis. |
| Pipeline | A defined sequence of bioinformatics steps from raw reads to results. |
| Intake | When a new project or sample is received and logged. |
| Review | Internal check of analysis output before delivery. |
| Delivery | When the client receives the final report. |

### 9.2 Pipeline mappings (the three project routes)

| Project class | Primary pipeline | Downstream / final analysis |
|---|---|---|
| Environmental / Microbiome | Metabarcoding / Metagenomics | Phylogenetic Analysis |
| Evolutionary / Taxonomic Discovery | Whole Genome Assembly | Phylogenetic Analysis |
| Functional Genomics / Physiology | Whole Genome Assembly | Transcriptomics |

### 9.3 Reference figures (placeholders in the Bio tab)

- **Figure 1** — 16S METAGENOMICS ANALYSIS WORKFLOW (to be attached)
- **Figure 2** — Transcriptomics workflow (to be attached)

> **Action item:** Drop the actual workflow figures (PNG/Draw.io export) into `app/components/figures/` and reference them from the Training module viewer.

---

## 10. Service Report Tracker — field definitions

### 10.1 Core fields (every service)

`Project ID` · `Client` · `Assignee` · `Service Type` · `Status` · `Dates`

| Field | Purpose |
|---|---|
| Service Report Number | Labeling of the report. |
| Project ID | Unique identifier per project. |
| Client ID | Unique identifier for the requesting client. |
| Intake Date | When the project was accepted. |
| Assigned | Point-person / bioinformatician on the project. |
| Analysis Classification | Which service to apply (see options below). |
| Run ID | Sequencer run identifier. |
| Client Sequence | Directory/folder of client sequences in the database. |
| Service Report * | **Required** file link to the generated report. |
| Notes | Remarks on applications of the service. |
| Delivery Date | Date the service report was delivered to the client. |

### 10.2 Analysis Classification options (12)

WGS Analyses · Amplicon · 16S Metabarcoding · eDNA Analysis · Transcriptomics · CapSeq · Shotgun Metagenomics · Phylogenetics · mtDNA · cpDNA · Population Genetics · Others (specify).

### 10.3 Status — Status of Completion (5)

`Completed` · `On-going` · `On hold (for payment)` · `Submitted` · `For approval`

### 10.4 Status — Status of Submission (3)

`Submitted` · `For approval` · `On-going`

### 10.5 Open domain question (Biology to confirm)

The bio track must finalize the exact state machine and per-service metadata fields. The current `analysis.status` enum is a placeholder; wire it up to the 5-value completion status and the 3-value submission status above.

---

## 11. Landing page metrics spec

The dashboard home view has three mandatory sections: (a) **Analytics tracker** (counts/trends by year), (b) **Tasks for the week**, (c) **Upcoming events for the month**.

### 11.1 Client Type (count of clients by affiliation, sorted by year)

UPV · Private · SUCs · Projects · Others · PGCV · Government

### 11.2 Analysis Count (count by service type, sorted by year)

WGS Analyses · Amplicon · 16S Metabarcoding · eDNA Analysis · Transcriptomics · CapSeq · Shotgun Metagenomics · Phylogenetics · mtDNA · cpDNA · Population Genetics

### 11.3 Other landing metrics

- **Ongoing tasks** — list general details of ongoing task and count — sorted by week.
- **Upcoming Events** — list of upcoming events with general details — sorted by month.
- **Current Events** — current projects, trainings, and internships with general details — sorted by month.
- **Infrastructure Utilization** — shows compute capabilities and available storage.

> **Status:** The landing page in the MVP uses hardcoded `yearlyMockDB` for KPI tiles and a real `task` fetch for "tasks for the week." The "Upcoming Events" section is a "Coming Soon" stub. Charts use real Supabase queries (recharts bar for service reports by year; pie for project status distribution).

---

## 12. Retrospectives (pending)

Sprint retrospectives and the final reflection in the CompSci tab are placeholders. Fill these in as the sprints close:

| | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|---|---|---|---|---|
| What worked well | _pending_ | _pending_ | _pending_ | _pending_ |
| What could be improved | _pending_ | _pending_ | _pending_ | _pending_ |
| How will it be improved | _pending_ | _pending_ | _pending_ | _pending_ |

**Final reflection prompts:** Shipped · Would do differently · Open issues · Advice.

The Biology tab has its own (also pending) sprint retrospectives and final reflection; the bio track should fill them in the doc directly.

---

## 13. Training content

### 13.1 Pre-test questions (7, multiple choice)

| # | Question | Correct answer |
|---|---|---|
| 1 | NHGRI definition of the "scientific subdiscipline … using computer technology to collect, store, analyze, and disseminate biological data…" | C — Bioinformatics |
| 2 | Which statement is correct? | B — Transcriptomics studies RNA, genomics studies DNA. |
| 3 | In Linux, what does `pwd` do? | B — Prints the current working directory. |
| 4 | In DNA barcoding/WGS, which tool is commonly used for QC? | B — FastQC (Note: fastp also does QC, but FastQC is strictly a QC tool.) |
| 5 | How is a transcriptome defined? | B — The entire collection of RNA transcripts in an organism. |
| 6 | Which biomarker is predominantly used to identify fungi in DNA barcoding? | C — ITS (nuclear ribosomal DNA). |
| 7 | What does HPC stand for? | C — High-Performance Computing. |

### 13.2 Post-test questions (6, multiple choice + 1 free response)

| # | Question | Correct answer |
|---|---|---|
| 1 | After installing a Linux VM and opening the terminal, which directory are you in by default? | The home directory (`~`). |
| 2 | You have been tasked with identifying a mold species damaging crops. Which biomarker would you sequence? | C — ITS. |
| 3 | Which analogy correctly matches the field to its molecule of study? | B — Transcriptomics: RNA, Genomics: DNA. |
| 4 | What is the main difference between a genome and a transcriptome? | B — Genome = complete DNA set; transcriptome = RNA transcripts produced by that genome. |
| 5 | What does HPC mean, and why is it needed in bioinformatics? | C — High-Performance Computing; aggregates computing power to analyze large biological datasets efficiently. |
| 6 | Which tool is commonly used to trim adapter sequences and low-quality reads? | C — fastp. |
| 7 | _(free response)_ Define "bioinformatics" in your own words. | (graded manually) |

### 13.3 Training evaluation form (15 questions, 1–5 scale where 5 is highest)

1. Was the staff understanding and friendly?
2. Were you able to clearly understand what the staff was teaching?
3. Was the staff open to questions and suggestions?
4. Were the presented training materials interactive?
5. Were the training materials easy to understand and navigate?
6. Did the visuals in the training materials have a readable font size and style?
7. Did you experience any technical bugs or encounter incorrect information while using the learning materials? (Score lower if issues; please specify in comments.)
8. Was the mode of training convenient and appropriate?
9. Were the specific topics covered in this training relevant to your job or education?
10. Were the topics difficult to understand? (Note: Consider rewording to "Were the topics presented at an appropriate difficulty level?" so a '5' uniformly means a positive experience.)
11. Was the training conducted at a comfortable pace (neither too fast nor too slow)?
12. Was the number of other trainees in the cohort comfortable for a learning environment?
13. Overall, did you learn a lot about bioinformatics during this training?
14. Did this training meet your expectations?
15. How likely are you to recommend this training to your colleagues?

Plus an open **Suggestions/Comments** field.

> **Status:** Seed data for these questions lives in `supabase/migrations/20260717000000_seed_biology_assessments.sql`. The exact question wording in the seed may differ slightly from the Google Doc version — confirm with the bio track whether to sync.

---

## 14. Internship content

### 14.1 Pre-internship — Coding Skills (free response + 1–5 scale)

- Which programming languages are you fluent in? Please list them.
- Which text editor do you use for coding?
- How fluently can you navigate and use VS Code or VSCodium? (1–5)
- Have you ever used GitHub or other version control software?
- Have you contributed to any open-source projects? If so, please provide your GitHub profile link.
- Are you familiar with Linux or Unix? Which specific operating systems have you used?
- How fluent are you in R? (1–5)
- How familiar are you with Bash or other Unix shells, such as FISH or ZSH? (1–5)
- Have you worked in a server environment before?
- Have you used Conda before? How familiar are you with using Conda? (1–5)

### 14.2 Pre-internship — Prior Experience in Bioinformatics

- Have you ever used any bioinformatics tools? If so, what did you use them for?
- How familiar are you with the following tools? (rate each 1–5): **fastp, MultiQC, FastQC, SPAdes, BLAST, Trinity, QIIME 2, DESeq2, Salmon, BUSCO, QUAST, Prokka**.

### 14.3 Pre-internship — General Questions

- Why did you decide to do your internship at PGC Visayas?
- What sparked your interest in bioinformatics?
- What are your expectations for this internship?

### 14.4 Post-internship confidence (rate each 1–5)

R and RStudio · VS Code · GitHub · Bash scripting · Conda · fastp · MultiQC · FastQC · SPAdes · BLAST · Trinity · QIIME 2 · DESeq2 · Salmon · BUSCO · QUAST · Prokka.

### 14.5 Internship evaluation form

- What challenges did you face, and how did you overcome them?
- Did the internship meet your expectations? (1–5)
- How would you rate the training and guidance you received from your supervisor? (1–5)
- On a scale of 1–5, how would you rate your cooperation with the other interns?
- How has this internship influenced your future career plans, and do you see a potential future at PGC Visayas?
- Overall, on a scale of 1–5, how would you rate your internship experience?
- How likely are you to recommend an internship at PGC Visayas to underclassmen? (1–5)
- Do you have any additional comments or suggestions?

### 14.6 Digital certificate text — Template 1 (Completion)

> The Philippine Genome Center awards this certificate of completion to **[Name]** for completing **[Number]** hours of **[Training Type]** from **[Start Date]** to **[End Date]** at PGC Visayas, Miagao, Iloilo.

**Signatories:**
- **Victor Marco Emmanuel N. Ferriols, Ph.D.** — Assistant to the Executive Director, Visayas, Philippine Genome Center
- **Albert Noblezada** — Science Research Specialist II, Bioinformatics

> **Action item:** Wire the certificate text into the certificate generator at `/dashboard/services/{training,internship}/[id]/certificate`. Current implementation only stores `pdf_link`; templating is still manual.

---

## 15. Service catalog (5 detailed entries from the Bio tab)

| Service | Description | Prerequisites | Deliverables |
|---|---|---|---|
| **Whole Genome Sequencing (WGS)** | Determine the entire DNA sequence of an organism. | DNA sample must pass the ideal purification threshold before submission to the genomics lab, **or** provide fastq files of the sequencing results. | FASTA file of the sample's DNA sequence + service report (genome annotation, methods used, read quality from sequencing). |
| **Amplicon Sequencing** | Amplify and sequence specific targeted DNA regions. | DNA sample + required sequence primers submitted to the genomics lab, **or** provide fastq files. | Service report (analytical methods, feature table, taxonomy table, phylogenetic tree). |
| **Metabarcoding** | Determine the specific identity of singular or multiple species using biomarkers. | eDNA sample submitted to the genomics lab, **or** provide fastq files. | Service report (analytical methods, BLAST/BOLD species identity + interpretations, phylogenetic tree) + FASTA file from the assembly. |
| **Transcriptomics** | Analyze an organism's transcriptome to determine which genes are present and their expression levels. | RNA sample submitted to the genomics lab, **or** provide fastq files. | Service report (analytical methods, PCA plots, heat maps, volcano plots, TPM gene bar plots, KEGG pathway enrichment charts — each with interpretations). |
| **Shotgun Metagenomics** | Identify multiple species from a single environmental sample. | eDNA sample submitted to the genomics lab, **or** provide fastq files. | Service report (analytical methods, species identities, frequency of appearance, sequence diversity, alpha + beta diversity indices, functional predictions — each with interpretations). |

> **Note on service categories in `service.category`:** The data-model enum is `WGS, amplicon, metabarcoding, transcriptomics, shotgun, phylogenetics, custom` (7 categories). The biology tab covers 5 in detail above (WGS, Amplicon, Metabarcoding, Transcriptomics, Shotgun). **Phylogenetics** and **Custom** are placeholders in the spec; bio track to fill in if needed.

---

## 16. Collaboration tracker notes & accomplishments

### 16.1 Sample collaboration rows (from the Bio tab)

- Collaboration with **Silliman University** to conduct the first genome assembly of the **Visayas spotted deer**.
- Next-generation sequencing for **galunggong** populations in partnership with **BFAR-NFRDI** and the **USAID Fish Right Program**.
- Genetic sequencing of stranded marine mammals in partnership with **BFAR** and **DENR**.

### 16.2 Accomplishments summary (Bio track)

> "Trained a total of **53 undergraduate interns**, **3 graduate interns**, and **7 high school students**."

Categories: Activities · Publications · Projects · Public engagements · Extension works.

> **PNA reference example (activity):** "Covid testing and strain monitoring" — https://www.pna.gov.ph/articles/1123596

> **Status:** The Accomplishments module is a "Coming Soon" stub at `/dashboard/accomplishments`. The bio track owns populating actual accomplishment records.

---

## 17. Validation log & open follow-ups

### 17.1 Validation log (Bio track) — to be populated

> Format: Date · Item reviewed · Verdict · What changed.

### 17.2 Known gaps inherited from the source documents

| # | Gap | Source | Action |
|---|---|---|---|
| 1 | `WORKBOOK.md` (this file) is the new deliverable | 11_deliverables_checklist §2 | ✅ Created from the activity sheets. |
| 2 | `README.md` claims Bioinformatics Services is a "Coming Soon" stub and audit logging is "not yet implemented" | README.md lines 24, 28 | Refresh the feature table to reflect current state. |
| 3 | `audit_log` does not yet cover `role_change` and `data_export` actions | CompSci §VII | Add RPCs in Sprint 1–2 follow-up. |
| 4 | Encryption-at-rest needs explicit confirmation in the Supabase dashboard | CompSci §VII | Verify in Supabase project settings. |
| 5 | Sprint retrospectives + final reflection are placeholders | CompSci §IX–X; Bio tab retrospectives | Fill in before handover. |
| 6 | Bio tab asks for the **exact workflow states and metadata fields** for the Service Report tracker | CompSci §III open question | Bio track to confirm. |
| 7 | Test walkthroughs (Sprint 3) not yet documented | CompSci §VII item 11 | Write a separate test-script file. |
| 8 | `analysis.status` enum needs alignment with the 5-value Completion status and 3-value Submission status | §10.3, §10.4 | Add a migration to formalize. |
| 9 | `protect_user_role` trigger already in place, but role_change still has no audit row | CompSci §VII item 8 | Add the audit action once the trigger fires. |
| 10 | Bio tab asks for the actual workflow figures (16S Metagenomics, Transcriptomics) | §9.3 | Drop PNG/Draw.io files into `app/components/figures/`. |
| 11 | Certificate text template is not yet wired into the certificate generator | §14.6 | Add a `template_text` column or generate at runtime. |

---

## 18. References

- **Google Doc (canonical source):** "Bioinformatics Activity Sheets" — owner `mtmisola`, doc id `1NL6dGKCZvVvw8zCZn6_RMme9mPXcHDjrdn4rsMCtrWw`. Tabs: Computer Science Activity Sheet · Biology Activity Sheet · PM Plan · Features list · Implementation Plan · Data Access · Dashboard Requirements.
- **Local docs (this repo):** `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `AGENTS.md` (Next.js 16 conventions), `CLAUDE.md` (assistant notes).
- **Migrations:** Local repo has 11 files (`supabase/migrations/19_initial_schema.sql` → `20260721000000_add_institution_to_users.sql`). **22 are applied to production** (see §19).
- **Live app:** https://pgcv-bioinformatics-dashboard.vercel.app/
- **Repo:** https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard

---

## 19. Supabase production state (as of 2026-07-19)

The local repo and the live Supabase project have drifted. This section is the canonical map of what is actually running in production.

### 19.1 Migration drift — 11 local vs 22 applied

The local `supabase/migrations/` folder ships 11 files. The Supabase project has **22 applied migrations** in its history. The local 19-24 base files (`19_initial_schema.sql`, `20_security_functions.sql`, `21_enable_rls.sql`, `22_rls_policies.sql`, `23_audit_triggers.sql`, `24_updated_at_triggers.sql`) are **not** in the production migration list — they were applied via raw SQL before the migration-tracking system was configured. Of the 16 timestamped production migrations, 7 are mirrored in the local repo; the other 15 are production-only retroactive fixes, intentionally not in the local repo (removed in commit `362bb5d`).

| # | Production migration | Purpose | In local repo? |
|---|---|---|---|
| 1 | 20260706081922 `fix_schema_issues` | Early schema hot-fixes | ❌ |
| 2 | 20260707070837 `rls_fixes` | RLS policy repairs | ❌ |
| 3 | 20260707072002 `advisor_fixes` | Linter-driven fixes | ❌ |
| 4 | 20260708014021 `rename_user_table_to_users` | Renamed `user` → `users` | ❌ |
| 5 | 20260708014133 `fix_audit_log_action_enum` | Constrained `audit_log.action` | ❌ |
| 6 | 20260708014250 `add_repository_link_columns` | `repository_link` on project + collaboration | ❌ (covered in initial schema) |
| 7 | 20260708014455 `change_assessment_questions_to_jsonb` | `questions` → JSONB | ❌ |
| 8 | 20260708015219 `rls_policy_corrections` | RLS repair pass | ❌ |
| 9 | 20260708015339 `updated_at_auto_update_trigger` | `set_updated_at` trigger | ✅ (local 24) |
| 10 | 20260708015612 `consolidate_overlapping_policies` | RLS deduplication | ❌ |
| 11 | 20260708015735 `check_constraints` | CHECK constraints | ❌ |
| 12 | 20260708020052 `remove_remaining_policy_overlaps` | RLS deduplication pass 2 | ❌ |
| 13 | 20260708022008 `add_is_active_to_users` | Soft-delete flag (added) | ❌ |
| 14 | 20260708024929 `drop_is_active_column` | …then removed in next migration | ❌ |
| 15 | 20260708024934 `protect_user_role_column` | Trigger + function | ✅ (local 20 + 23) |
| 16 | 20260717000000 `seed_biology_assessments` | Bio assessment seed data | ✅ |
| 17 | 20260718000000 `audit_session_rpc` | `audit_session_event()` | ✅ |
| 18 | 20260719132846 `apply_updated_at_triggers` | Apply triggers to tables | ✅ (local 24) |
| 19 | 20260720000000 `audit_data_modification_rpc` | `audit_data_modification()` | ✅ |
| 20 | 20260720000000 `seed_demo_data` | Demo seed | ✅ |
| 21 | 20260719144134 `add_institution_to_users` | `users.institution` column | ✅ |

> **Action item (P0):** Generate a `supabase/migrations/25_reconcile_production.sql` that captures the current production state. A fresh `supabase db reset` should reproduce the live project byte-for-byte.

### 19.2 Functions in production

| Function | In local repo? | Notes |
|---|---|---|
| `protect_user_role_column()` | ✅ (local 20) | `SECURITY DEFINER` — linter warns it is callable by `anon` and `authenticated`. |
| `audit_table_change()` | ✅ (local 20) | Generic trigger function for insert/update/delete audit. |
| `get_user_role()` | ✅ (local 20) | Helper used by RLS policies. |
| `audit_session_event(text, jsonb)` | ✅ (local 18) | Called from `app/components/sessionauditor.tsx` on SIGNED_IN / SIGNED_OUT. |
| `audit_data_modification(text, text, jsonb)` | ✅ (local 20) | Called from `app/dashboard/services/page.tsx` on report delivery. |
| `audit_sessions()` | ❌ | **NEW in production, not in local.** Likely a trigger function variant. |
| `handle_new_user()` | ❌ | **NEW in production, not in local.** Likely an auth-hook function that auto-creates a `users` row on OAuth signup. |

> **Action item (P0):** Export the definitions of `audit_sessions()` and `handle_new_user()` from production and commit them to a new `supabase/migrations/26_*.sql` file. Without this, a fresh `supabase db reset` will not match production.

### 19.3 New enums in production

These enums exist in production but are not yet documented in the data model:

| Enum | Values |
|---|---|
| `user_roles` | `team_lead`, `team_member`, `trainee`, `intern`, `none` |
| `service_categories` | `WGS`, `amplicon`, `metabarcoding`, `transcriptomics`, `shotgun`, `phylogenetics`, `custom` |
| `template_categories` | (category set for `document_template`) |
| `training_type` | `training`, `internship` |
| `project_status` | (status set for `project`) |
| `analysis_status` | (status set for `analysis` — **needs alignment with §10.3/§10.4** which describe 5-value Completion + 3-value Submission) |
| `assessment_type` | `pre_test`, `post_test`, `evaluation` |
| `audit_log_action` | (action set for `audit_log` — `user_login`, `user_logout`, `role_change`, `data_export`, …) |

### 19.4 Schema additions in production

- `users.institution` (text, nullable) — added by `20260719144134`. Update the data model in §3.1 to list this column as production-current (already noted in §3.1 as "added later").

### 19.5 Edge functions

| Function | Active? | `verify_jwt` | Notes |
|---|---|---|---|
| `backup-audit` | ✅ | `false` | Version 18. Created 2026-07-06, updated 2026-07-06. Cron-rotates `audit_log` rows older than 28 days to Google Sheets, then deletes. Matches the spec in §3.4. |

### 19.6 Tables — all 18 have RLS enabled

Verified via `select relname, relrowsecurity from pg_class where relnamespace = 'public' and relkind = 'r'`. The implementation matches the local `21_enable_rls.sql` intent.
