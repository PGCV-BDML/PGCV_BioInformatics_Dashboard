# Feature Roadmap: From MVP → Fully-Complete Web Application

> **Tracking issue.** This is the master list of work remaining to transform the current MVP into the fully-complete Web Application desired by the PGCV-BDML in-house team. Each checkbox is a discrete, mergeable unit of work. Sections are ordered by **priority (P0 first)**, then by **dependency order within each priority**.
>
> **Source documents:** `WORKBOOK.md` §17.2 (gap tracker), `README.md` Known Limitations, `ARCHITECTURE.md` §5/§6/§8, `SECURITY.md` §5/§7/§10, the CompSci and Biology activity sheets in the "Bioinformatics Activity Sheets" Google Doc (mtmisola, id `1NL6dGKCZvVvw8zCZn6_RMme9mPXcHDjrdn4rsMCtrWw`), and the original `05_data_model_starter.md` from the intern kickoff package.

---

## 0. Summary

The MVP (commit `a5a0d68` family, deployed at <https://pgcv-bioinformatics-dashboard.vercel.app/>) is feature-complete for 4 of 8 dashboard components — Landing, Projects, Bioinformatics Services (with Training and Internship sub-modules), and Collaborations — plus an extra Tasks tracker. The other 4 components (Calendar, Accomplishments, Services List, Repositories) are intentionally stubbed. The data model descoped 3 entities (Accomplishment, CalendarEvent, Repository) and replaced them with URL fields on `project` and `collaboration`.

To go from MVP to the fully-complete Web Application, the team needs to: (1) close the **9 known MVP gaps**, (2) **promote the 4 stubs to real modules**, (3) **restore the 3 descoped entities** as first-class tables, (4) **wire in the bio-track content** (training/internship materials, workflow figures, service catalog), (5) **integrate with the client-facing Omics Solutions Portal**, and (6) reach **production readiness** (monitoring, accessibility, disaster recovery, real-time updates).

Estimated total: **~110–140 tasks across 7 phases** over multiple sprints. Phases are sequenced so each one is shippable on its own — no "big bang" required.

---

## 1. Goals

1. Replace every "Coming Soon" page with a working module.
2. Restore the three descoped data-model entities (`accomplishment`, `calendar_event`, `repository`) as proper PostgreSQL tables, then rewire the URLs currently on `project.repository_link` and `collaboration.repository_link` to be first-class records.
3. Wire the bio-track content (training pre/post tests, internship forms, certificate text, workflow figures) into the dashboard.
4. Add user-management UI that the MVP explicitly descoped.
5. Integrate with the existing client-facing Omics Solutions Portal and Service Report Generator.
6. Take the app to production-grade quality (monitoring, accessibility, performance, disaster recovery).
7. Keep the **no-credit-card, free-tier-only** constraint intact (Vercel free + Supabase free + Google Drive URLs + GitHub-only ops).

## 2. Non-Goals

- **Not** building a brand-new client portal from scratch — we integrate with the existing Omics Solutions Portal.
- **Not** building a payment / invoicing system — out of scope for the lab dashboard.
- **Not** migrating away from Supabase + Vercel — the stack is locked by the compsci activity sheet §II.
- **Not** building mobile native apps — the dashboard is web-first (responsive later).
- **Not** re-platforming the GitHub repo or CI/CD.

## 3. Success Criteria

- All 8 dashboard components (3.1–3.8) are functional, not stubbed.
- The 3 descoped entities exist as first-class tables with RLS, audit triggers, and UI.
- The landing page KPIs come from real Supabase aggregations, not `yearlyMockDB`.
- The audit log covers `user_login`, `user_logout`, `role_change`, `data_export`, and insert/update/delete on the 6 spec'd tables.
- Encryption-at-rest is explicitly verified and documented.
- A test-script file documents role-by-role RLS walkthroughs for `team_lead`, `team_member`, `trainee`, `intern`.
- Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
- Sentry / log drain is wired; downtime is monitored.
- Disaster recovery: documented RTO ≤ 4h, RPO ≤ 24h, with a tested restore procedure.

---

## Phase 0 — Pre-launch essentials · **P0 · ship within 1 sprint**

These are the items the MVP currently lies about, or that block a safe production demo. All are small, well-defined, and unblock other work.

### 0.1 Schema and security confirmations

- [ ] **Confirm encryption-at-rest in Supabase dashboard.** The MVP inherits the Supabase free-tier default; an admin must verify it's on. Capture a screenshot for `SECURITY.md` §6.
- [ ] **Verify migration 24 (`set_updated_at` triggers) is applied to live Supabase.** If not, apply it. The migration exists locally at `supabase/migrations/24_updated_at_triggers.sql`; the live DB needs to match.
- [ ] **Audit Supabase project's `disable_signup` setting.** Per `README.md` Known Limitations, signups should be disabled so only the Google OAuth allow-list can authenticate. Verify and document.
- [ ] **Confirm 24h session expiry** is enforced (Supabase Auth default; document the JWT expiry in `SECURITY.md` §2).

### 0.2 Audit coverage gaps (P0 because they are listed in the security checklist)

- [ ] **Add `role_change` audit coverage (users already covered; extend to 5 spec'd tables).** The `audit_table_change()` function in `20_security_functions.sql` already writes a `role_change` row when `users.role` changes. The gap is the other 5 spec'd tables (`project`, `analysis`, `service_report`, `collaboration`, `training_program`) that have status columns but no triggers attached yet. Add triggers and verify `state_change` rows fire.
- [ ] **Add `data_export` audit coverage.** Every export of project / collaboration / analysis data should write an `audit_log` row with `action='data_export'`, `target_type`, and the user. Centralize the export button in a helper so we can't forget.
- [ ] **Extend `audit_log` triggers to all 18 tables** (currently 1: `users`). The remaining 17 (`project`, `analysis`, `service_report`, `collaboration`, `training_program`, `client`, `service`, `sample`, `module`, `assessment`, `assessment_response`, `certificate`, `task`, `onboarding_document`, `document_template`, `accomplishment`, `calendar_event`) should each get insert/update/delete audit triggers. Per the compsci activity sheet §III, the original trigger design was already done — this is the rollout.

### 0.3 Test walkthroughs (P0 because the privacy checklist calls them out)

- [ ] **Write `docs/test-walkthroughs.md`** documenting role-by-role RLS tests for `team_lead`, `team_member`, `trainee`, `intern`. Each walkthrough is a checklist: "as `<role>`, attempt to read / insert / update / delete from `<table>`, expect `<result>`." Covers all 18 tables × 4 roles × 4 actions = 288 test cells minimum. Wire into CI as a smoke test.

### 0.4 Sync bio content with seed data

- [ ] **Confirm with bio track** whether the question text in `supabase/migrations/20260717000000_seed_biology_assessments.sql` should be the canonical version or replaced with the exact wording in the Biology activity sheet (Google Doc tab `t.p5m6bi3w4wgo`). The differences are minor (a "Note: fastp also performs QC" annotation; a free-response prompt at the end of the post-test) but they matter for the training experience. Capture the decision in `WORKBOOK.md` §17.2.

---

## Phase 1 — MVP polish · **P1 · ship within 2 sprints**

Polish the 4 functional components. Most of these are "make the truth match what the docs already claim."

### 1.1 Landing page (3.1)

- [ ] **Replace `yearlyMockDB` with real Supabase aggregations** in `app/dashboard/page.tsx`. KPI tiles should read from `project`, `service_report`, `task`, and (post-Phase 2) `accomplishment`. The current mock data is documented in `README.md` Known Limitations.
- [ ] **Implement "Upcoming Events for the month" section.** Stub today; should query `calendar_event` (post-restoration in Phase 2) and fall back to a "no events scheduled" empty state. The "Calendar preview" is a hard requirement per the biology activity sheet §11.
- [ ] **Add year filter granularity** — currently 2024/2025/2026 are hardcoded; expose "Last 12 months" and "YTD" as additional filter options.
- [ ] **Add download-CSV button for service reports chart.** Goes through the `data_export` audit hook (§0.2).

### 1.2 Projects (3.2)

- [ ] **Add a "Project Pipeline" detail view** that shows the linked `sample` → `analysis` → `service_report` chain for the selected project. The bio tab calls this out (§10) and the data model already supports it.
- [ ] **Surface the `service_report_number`, `run_id`, and `client_sequence` fields** (currently absent from `project`). Add them as nullable columns on `project` via a new migration, then render them in the edit modal.
- [ ] **Add `documents[]` array** on `project` mirroring `collaboration.documents[]`. Currently only `collaboration` has this; the bio tab §10.1 lists it under "Project Details" too.
- [ ] **Add bulk actions** (mark complete, archive) with confirmation modal and audit hook.

### 1.3 Bioinformatics Services (3.3.1)

- [ ] **Formalize the `analysis.status` enum** to match the 5-value Status of Completion (Completed / On-going / On hold (for payment) / Submitted / For approval) and 3-value Status of Submission (Submitted / For approval / On-going) from the biology activity sheet §10.3–§10.4. Today the implementation uses a placeholder; this is the migration.
- [ ] **Wire the "Generate Report" fallback modal** to also accept `run_id`, `client_sequence`, and a copy-paste from the existing Service Report Generator. The bio tab §3.3.1 says the Generator "already exists; needs an integration path into the Dashboard" — this is that path.
- [ ] **Add per-row "Send to client" action** that flips `service_report.delivered_at` + writes an audit row. Today delivery is recorded; explicit client-send is implicit.
- [ ] **Add a "Service Type" filter** alongside the existing status filter.

### 1.4 Collaborations (3.4)

- [ ] **Add partnership start-date / end-date fields** if not already on `collaboration`. Bio tab §16 calls out 3 named collaborations (Silliman, BFAR-NFRDI, BFAR-DENR) as seed examples.
- [ ] **Add per-collaboration task list** view (linked via `task.linked_project_id` is the existing pattern, but collaborations don't yet have an analog).

### 1.5 Tasks (extra, not in the 8-component count)

- [ ] **Move the Tasks route to the originally specified path** `app/tasks/page.tsx` (or document the deviation in the activity sheet retro). The route was implemented at `app/dashboard/tasks/page.tsx`.
- [ ] **Add task templates** for common bio-track workflows (e.g., "Run FastQC on samples", "Submit IRB documents").

---

## Phase 2 — Promote stubs to real modules · **P1–P2 · ship within 3 sprints**

Each subsection restores one stub + one descoped entity as a real first-class module. These are scoped as separate sub-phases because each is a sizable body of work on its own.

### 2.1 Calendar (3.5) — restores `calendar_event` entity

- [ ] **Migration: restore `calendar_event` table** per the original 05_data_model_starter.md spec: `id`, `title`, `event_type` (tour / training / lab_event / deadline / other), `start_datetime`, `end_datetime`, `linked_program_id` (nullable), `linked_project_id` (nullable), `created_by`. Enable RLS and add the audit trigger.
- [ ] **Build `app/dashboard/calendar/page.tsx`** as a month-view grid (use `recharts` or a lightweight grid library — no heavy date-picker dependency). Click a day → modal to create an event.
- [ ] **Build event detail view** at `app/dashboard/calendar/[id]/page.tsx` with title, type, time range, linked program/project, owner.
- [ ] **Add a "Calendar of Events" section to the Internship module viewer** (biology tab §11). The internship sub-page already has the layout; just add the calendar widget.
- [ ] **Add to landing page "Upcoming events for the month"** (cross-ref §1.1).
- [ ] **Seed data: import the existing events from the team's Google Calendar** via a one-time script (manual CSV import is fine for the MVP+1).

### 2.2 Accomplishments (3.6) — restores `accomplishment` entity

- [ ] **Migration: restore `accomplishment` table** per 05_data_model_starter.md: `id`, `type` (activity / publication / project / public_engagement / extension_work), `title`, `date`, `participants`, `link`, `description`. Enable RLS and audit trigger.
- [ ] **Build `app/dashboard/accomplishments/page.tsx`** as a filterable list (by type, year, participant). Add a "New accomplishment" modal.
- [ ] **Build a public-facing read-only view** at `app/accomplishments/page.tsx` (no auth required) that the lab can link to from external communications. Stays inside the no-credit-card constraint (Vercel free tier supports unauthenticated pages).
- [ ] **Seed the existing accomplishments** from the bio tab §16.2: "Trained a total of 53 undergraduate interns, 3 graduate interns, and 7 high school students", plus the PNA Covid testing reference and any post-event publications.
- [ ] **Add an accomplishments widget to the landing page** ("Recent accomplishments" carousel, last 5).

### 2.3 Repositories (3.8) — restores `repository` entity

- [ ] **Migration: restore `repository` table** per 05_data_model_starter.md: `id`, `kind` (github | drive), `title`, `url`, `description`, `category` (pipelines / datasets / client_sequences / etc.). Enable RLS and audit trigger.
- [ ] **Build `app/dashboard/repositories/page.tsx`** as a category-grouped card grid. Click a card → opens the URL in a new tab.
- [ ] **Add a `repository_id` foreign key to `project` and `collaboration`** alongside the existing `repository_link` text field. Migrate the existing URLs into `repository` rows so the relationship is first-class.
- [ ] **Add GitHub / Drive link auto-fetch** for the title and description (use the GitHub REST API for GitHub repos; for Drive, store the title manually). This stays free via the GitHub public API.

### 2.4 Services List (3.7) — promote from hardcoded to DB-driven

- [ ] **Replace the hardcoded service catalog in `app/dashboard/services-list/page.tsx`** with a query against the `service` table. Add filters by `category` and `active`.
- [ ] **Populate the `service` table** with all 7 categories from the data model (WGS, Amplicon, Metabarcoding, Transcriptomics, Shotgun, Phylogenetics, Custom) using the descriptions and deliverables from the biology tab §15. The current seed only has 5 detailed; **fill in Phylogenetics and Custom** with bio-track input.
- [ ] **Add a "Service Detail" page** at `app/dashboard/services-list/[id]/page.tsx` that shows full description, prerequisites, deliverables, sample reports, and a "Request this service" CTA that emails the lab.
- [ ] **Add a "Service Pipeline Default" editor** — currently `service.pipeline_default` is a text field; turn it into a structured editor (step 1, step 2, …) for the bio track to use.

---

## Phase 3 — User management · **P1–P2 · ship within 2 sprints**

The MVP explicitly descoped user management. Restore it now that the core works.

### 3.1 User listing

- [ ] **Build `app/dashboard/users/page.tsx`** as a team_lead-only view listing every row in `users` with name, email, role, track_assignment, last login, last action. Add filter by role and search by name/email.
- [ ] **Add the route to the sidebar** (team_lead role only) in `app/components/sidebar.tsx`.
- [ ] **Add an audit_log tab on the user detail page** showing the last 50 audit rows for that user.

### 3.2 Role assignment

- [ ] **Build a "Change role" modal** that calls the `audit_role_change` RPC (added in §0.2). Server-side check: only `team_lead` can call; the `protect_user_role` trigger on `users` is the second line of defense.
- [ ] **Add bulk role assignment** (e.g., promote a cohort of interns to "trainee" status in one go).

### 3.3 User onboarding

- [ ] **Add a "Send invite" flow** that emails a new user an OAuth-allow-list link. Stay free: use the existing Supabase Auth admin API (free tier allows up to 50,000 MAU).
- [ ] **Add a "First-login wizard"** that walks new users through the privacy notice, the role-specific dashboard tour, and the data-deletion contact.

### 3.4 User deletion

- [ ] **Build a "Deactivate user" action** that soft-deletes (sets a `deleted_at` column on `users`) rather than hard-deletes. The `protect_user_role` trigger needs to be augmented to also prevent reactivating a soft-deleted user without team_lead.
- [ ] **Audit log entry on deactivation** with `action='user_deactivated'`.

---

## Phase 4 — Bio content + workflow · **P2 · ship within 2 sprints**

The biology track owns the content; the comp-sci track owns the wiring. This phase is the handover between them.

### 4.1 Training content (biology activity sheet §13)

- [ ] **Sync the 7 pre-test + 6 post-test questions + 1 free response + 15-question evaluation** into the seed data. The Google Doc has the canonical wording (`WORKBOOK.md` §13.3); confirm with bio track whether to overwrite the existing seed.
- [ ] **Build a "Take Assessment" flow** at `app/dashboard/services/training/[id]/assessment/take/[assessment_id]/page.tsx` with one-question-per-page navigation, autosave, and submission.
- [ ] **Build an "Assessment Results" view** for instructors showing per-participant scores and free-text responses.
- [ ] **Build an "Evaluation Form" flow** for trainees to fill out the 15-question Likert form. Aggregate results in a per-program view for instructors.

### 4.2 Internship content (biology activity sheet §14)

- [ ] **Build a "Pre-Internship Form"** capturing the 10-item Coding Skills + 12-item Tool Familiarity + 3-item General Questions from §14.1–§14.3. Submit on first login.
- [ ] **Build a "Post-Internship Form"** with the 16-item confidence ratings from §14.4.
- [ ] **Build an "Internship Evaluation Form"** with the 8 questions from §14.5.
- [ ] **Wire the certificate text template** (biology tab §14.6) into the certificate generator at `app/dashboard/services/internship/[id]/certificate/`. Store `template_text` on `certificate`; render with `[Name]`, `[Number]`, `[Training Type]`, `[Start Date]`, `[End Date]` substituted. Generate PDF via a free-tier-compatible library (e.g., `react-pdf` or server-side `pdf-lib`).

### 4.3 Workflow figures

- [ ] **Add Figure 1 (16S Metagenomics workflow) and Figure 2 (Transcriptomics workflow)** to `app/components/figures/`. Wire them into the Training module viewer at `app/dashboard/services/training/[id]/module/[module_id]/page.tsx`.
- [ ] **Add a "Workflow Mapping" page** at `app/dashboard/services/workflow-mapping/page.tsx` that visualizes the 3 pipeline routes (Environmental / Evolutionary / Functional) from biology tab §9.2 as a flow diagram.

### 4.4 Service catalog depth

- [ ] **Populate Phylogenetics and Custom service categories** in the `service` table with descriptions, prerequisites, and deliverables (bio track input).
- [ ] **Add per-service pipeline default config** editor in the service detail view.
- [ ] **Add a "Sample reports" gallery** to each service detail page so new clients can see what a finished report looks like.

---

## Phase 5 — Client-facing integration · **P2 · ship within 3 sprints**

The README says the dashboard "lives alongside the existing client-facing Omics Solutions Portal." This phase makes that real.

### 5.1 Service Report Generator integration

- [ ] **Build a webhook endpoint** at `app/api/webhooks/service-report/route.ts` that the existing Service Report Generator can POST to when a report is finalized. Creates or updates a `service_report` row.
- [ ] **Add a "Generate via Dashboard" deep link** that pre-fills the Generator with the current analysis context.
- [ ] **Build a "Report Queue" view** at `app/dashboard/reports/page.tsx` showing pending, in-review, delivered, and acknowledged reports across all projects.

### 5.2 Client Sequences Repository

- [ ] **Add a `client_sequence` table** to the schema: `id`, `project_id`, `drive_folder_url`, `created_at`. RLS, audit trigger, etc.
- [ ] **Add a "Client Sequences" sub-page** at `app/dashboard/projects/[id]/sequences/page.tsx` listing every drive folder per project.
- [ ] **Add to landing page** a "Client Sequences by Service Type" chart.

### 5.3 Public client portal (read-only mirror)

- [ ] **Add an unauthenticated `app/portal/page.tsx`** that shows a client's own projects + reports (matched by email). Stays free (Vercel free + Supabase RLS policy that allows `email = auth.jwt() ->> 'email'` even when unauthenticated, scoped via signed-link).
- [ ] **Generate a signed link** the team can send to clients by email. Link expires in 7 days.

### 5.4 Bio content licensing

- [ ] **Confirm with the lab** that the Omics Solutions Portal can consume the bio content (training questions, evaluation forms, certificate templates) via a public API. If yes, add a `/api/public/training/:id` and `/api/public/assessment/:id` endpoint that returns JSON.

---

## Phase 6 — Advanced features · **P3 · ship opportunistically**

These are the features that make the app feel "finished." They're deferred because they don't block the in-house team from using the dashboard day-to-day.

### 6.1 Real-time updates

- [ ] **Wire Supabase Realtime** on `project`, `analysis`, `service_report`, `task`, and `collaboration` so changes appear live across browser tabs. Use the `supabase.channel('public:project').on('postgres_changes', ...)` pattern. Free tier supports up to 200 concurrent Realtime connections.
- [ ] **Add a "Who's online" indicator** on the sidebar using Realtime presence.

### 6.2 Search

- [ ] **Add a global search bar** in the sidebar that hits `project`, `collaboration`, `client`, `task`, and `service_report` in parallel and shows a unified result list. Use Postgres full-text search (free) instead of an external search service.
- [ ] **Add per-page quick filters** (e.g., on Projects: filter by client name substring).

### 6.3 Notifications

- [ ] **Add an in-app notification center** (bell icon in the sidebar) showing unread items: tasks due, reports pending review, collaborations with no recent activity.
- [ ] **Add email digests** (weekly summary of activity) using the existing Supabase SMTP. Free tier: 4 emails/hour per user.

### 6.4 File uploads

- [ ] **Replace Google Drive URL workaround** with Supabase Storage for small files (certificates, sample reports). Use the existing free tier (1 GB included). Larger files stay on Drive.
- [ ] **Add drag-and-drop upload** in the project edit modal.

### 6.5 Audit log dashboard

- [ ] **Build `app/dashboard/audit/page.tsx`** (team_lead only) showing recent `audit_log` rows with filters by user, action, target_type, and date range.
- [ ] **Add a "My activity" tab** to the user profile page showing the user's own recent audit rows.

### 6.6 Analytics expansion

- [ ] **Add a "Compute Utilization" widget** on the landing page (placeholder data; the HPC utilization feed is out of scope for this dashboard).
- [ ] **Add a "Client Type" breakdown chart** (UPV, Private, SUCs, Projects, Others, PGCV, Government per biology tab §11.1).
- [ ] **Add a "Service Mix" trend chart** showing the 12 service types over time.

### 6.7 Mobile responsive

- [ ] **Audit every page on viewports 360px, 768px, 1024px** and fix overflow / table-collapse issues.
- [ ] **Convert the data tables on Projects / Collaborations / Tasks / Services into card views** below 768px.

### 6.8 Internationalization

- [ ] **Add English + Filipino** translation files. The biology tab uses Filipino asides (`lagay kayo`, `nasa gdrive ung statuses`); some of that should be in the UI.
- [ ] **Add a language switcher** in the sidebar.

---

## Phase 7 — Production readiness · **P3 · ship before scaling**

The last-mile work. None of this is user-visible; all of it is operator-visible.

### 7.1 Monitoring and observability

- [ ] **Wire Sentry** (free tier: 5K events/month) for both client and server errors. Capture `auth.uid()` in the Sentry context.
- [ ] **Wire a Vercel log drain** to a free log sink (Logflare free tier, or a Supabase `log` table).
- [ ] **Add uptime monitoring** (UptimeRobot free tier) for the live URL and the Supabase REST endpoint.

### 7.2 Performance

- [ ] **Run Lighthouse** on every page; capture baseline. Target: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
- [ ] **Add image optimization** (`next/image`) for the workflow figures and any uploaded files.
- [ ] **Add bundle analysis** (`@next/bundle-analyzer`); split the recharts and date utilities into lazy-loaded chunks.

### 7.3 Disaster recovery

- [ ] **Document the backup procedure.** Supabase free tier includes daily backups retained 7 days; document the restore-from-backup drill.
- [ ] **Export the schema as a one-click script** (`pg_dump` + a `restore.sh`) checked into `supabase/backups/README.md`.
- [ ] **Document RTO / RPO targets** in `SECURITY.md` §12.
- [ ] **Test the restore** end-to-end at least once per quarter.

### 7.4 Accessibility

- [ ] **Add `aria-*` attributes** to all interactive components (modals, dropdowns, data tables).
- [ ] **Add keyboard shortcuts** for common actions (n=new, / =search, esc=close modal).
- [ ] **Add a "Skip to main content" link** at the top of every page.
- [ ] **Verify color contrast** for the status color-codes (Completed/Ongoing/On-hold/Submitted/For Approval). Currently uses a colored dot per status; the contrast ratio must hit WCAG AA.

### 7.5 Security hardening

- [ ] **Add CSP headers** in `next.config.js` (default-src 'self', script-src 'self' 'unsafe-inline' for Vercel, etc.).
- [ ] **Add rate limiting** on the OAuth callback and the webhook endpoint.
- [ ] **Add a secret rotation procedure** for the Supabase anon key. Documented in `SECURITY.md` §13.
- [ ] **Run a third-party security review** (free options: OWASP ZAP baseline scan; Snyk free tier for the Node deps).

### 7.6 Documentation and onboarding

- [ ] **Refresh `README.md` screenshots** to reflect the post-Phase-2 UI (real calendar, real accomplishments, real repositories).
- [ ] **Add a "Day 1 onboarding" video** (5 min Loom) walking a new team member through logging in, navigating the dashboard, and finding a project. Link from `WORKBOOK.md` §1.
- [ ] **Add a CHANGELOG.md** with the conventional-commits format. Backfill entries for the MVP commits.
- [ ] **Add a CONTRIBUTING.md** explaining the sprint workflow, code style, PR template, and review process.

---

## 4. Effort estimates (rough)

| Phase | Estimate | Confidence |
|---|---|---|
| Phase 0 — Pre-launch essentials | 1 sprint · ~10 tasks | High (well-defined) |
| Phase 1 — MVP polish | 2 sprints · ~25 tasks | High |
| Phase 2 — Stubs to real modules | 3 sprints · ~25 tasks | Medium (each module has unknowns) |
| Phase 3 — User management | 2 sprints · ~12 tasks | High |
| Phase 4 — Bio content + workflow | 2 sprints · ~15 tasks | Medium (depends on bio-track turnaround) |
| Phase 5 — Client-facing integration | 3 sprints · ~15 tasks | Low (depends on Omics Solutions Portal team's availability) |
| Phase 6 — Advanced features | ongoing · ~25 tasks | Low (opportunistic) |
| Phase 7 — Production readiness | 2 sprints · ~20 tasks | Medium |
| **Total** | **~145 tasks · ~12–15 sprints** | |

## 5. Dependency graph (high level)

```
Phase 0 ── blocks ──► Phases 1, 3 (security gaps must close first)
Phase 1 ── blocks ──► Phase 6.5 (audit log dashboard needs real audit data)
Phase 2.1 (Calendar) ── blocks ──► Phase 1.1 (landing page "Upcoming events")
Phase 2.2 (Accomplishments) ── blocks ──► Phase 6.6 (analytics expansion)
Phase 2.3 (Repositories) ── blocks ──► Phase 5.2 (Client Sequences depends on the repository model)
Phase 3 (User management) ── blocks ──► Phase 5.3 (public client portal needs user-email linkage)
Phase 4.2 (Internship content) ── blocks ──► Phase 5.4 (bio content licensing)
Phase 6.1 (Realtime) ── blocks ──► Phase 6.2 (search needs consistent indexes)
Phase 7.1 (Monitoring) ── should run during ──► all other phases
```

## 6. Out of scope (intentionally not in this roadmap)

- Replacing Supabase with another BaaS.
- A native iOS / Android app.
- A full rebrand of the dashboard.
- Migration of historical data from the existing Google Sheets service report database (one-time import, separate ticket).
- LIMS / ELN integration (would be a separate project).
- AI-assisted pipeline recommendations (defer until after the rest is shipped).
- Anything that requires a credit card on the hosting / DB layer.

## 7. Related issues to link

Once this tracking issue is filed, file the following blockers / siblings:

- `chore: confirm encryption-at-rest in Supabase dashboard` (Phase 0.1)
- `chore: apply migration 24 to live Supabase` (Phase 0.1)
- `feat(audit): cover role_change and data_export` (Phase 0.2)
- `feat(audit): extend audit triggers to remaining 12 tables` (Phase 0.2)
- `test: RLS test walkthroughs for 4 roles × 18 tables` (Phase 0.3)
- `feat(landing): replace yearlyMockDB with real aggregations` (Phase 1.1)
- `feat(calendar): restore calendar_event entity + month view` (Phase 2.1)
- `feat(accomplishments): restore accomplishment entity + public read-only view` (Phase 2.2)
- `feat(repositories): restore repository entity + migrate URL fields` (Phase 2.3)
- `feat(services-list): DB-driven catalog with all 7 categories` (Phase 2.4)
- `feat(users): admin UI for role assignment` (Phase 3.2)
- `feat(certificate): wire bio-tab text template into generator` (Phase 4.2)
- `feat(figures): add 16S Metagenomics + Transcriptomics workflow figures` (Phase 4.3)
- `chore(monitoring): wire Sentry + log drain + uptime monitor` (Phase 7.1)
- `chore(a11y): Lighthouse pass to AA contrast + keyboard shortcuts` (Phase 7.4)
- `docs: refresh README screenshots + add CHANGELOG + CONTRIBUTING` (Phase 7.6)

## 8. References

- **This repo:** `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `WORKBOOK.md`, `AGENTS.md`, `CLAUDE.md`
- **Activity sheets (Google Doc):** "Bioinformatics Activity Sheets" — owner `mtmisola`, doc id `1NL6dGKCZvVvw8zCZn6_RMme9mPXcHDjrdn4rsMCtrWw`. Tabs: Computer Science Activity Sheet · Biology Activity Sheet · PM Plan · Features list · Implementation Plan · Data Access · Dashboard Requirements.
- **Intern kickoff package:** `intern_kickoff_package (intern copy)/` — `00_README.md`, `01_project_brief.md`, `05_data_model_starter.md`, `06_privacy_security_checklist.md`, `11_deliverables_checklist.md`.
- **Live app:** <https://pgcv-bioinformatics-dashboard.vercel.app/>
- **Repo:** <https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard>
