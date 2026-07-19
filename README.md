# PGCV Bioinformatics Workflow Dashboard

**Live URL:** [https://pgcv-bioinformatics-dashboard.vercel.app/](https://pgcv-bioinformatics-dashboard.vercel.app/)

**Repository:** `PGCV-BDML/PGCV_BioInformatics_Dashboard`

*Last updated: 2026-07-19 · Refreshed README, [ARCHITECTURE.md](./ARCHITECTURE.md), and [SECURITY.md](./SECURITY.md) to reflect post-Sprint-3 state (Services module + audit logging shipped). New [WORKBOOK.md](./WORKBOOK.md) added.*

---

The **Bioinformatics Workflow Dashboard** is an internal, centralized platform for the **Philippine Genome Center Visayas — Bioinformatics & Data Management Laboratory (PGCV-BDML)**. It replaces the team's scattered workflow across Notion, Google Drive, and Google Sheets with a single dashboard that tracks lab operations end-to-end: projects, collaborations, services, training, and internships. The dashboard lives *alongside* the existing client-facing Omics Solutions Portal and handles everything internal.

This is a **proof-of-concept MVP** built during the June–July 2026 Internship Program. Per [`Dashboard_Requirements.md:9-15`](https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard/blob/main/Dashboard_Requirements.md), the goal is "one feature working end-to-end [rather] than eight broken features."

---

## Features

| Status | Component | Description |
|--------|-----------|-------------|
| ✅ | **Landing Page** | Analytics dashboard (project counts, tasks for the week, upcoming events) at `/dashboard`. Recharts-based bar/donut charts with year filtering. |
| ✅ | **Projects Tracker** | DB-integrated table with add/edit/delete modals at `/dashboard/projects`. Backed by Supabase via `lib/supabase.ts` helpers (commit `a5a0d68`). |
| ✅ | **Collaborations Tracker** | DB-integrated table with add/edit/delete at `/dashboard/collaborations`. Same helper pattern as Projects. |
| ✅ | **Bioinformatics Services Tracker** | Service-report master table at `/dashboard/services` with three tabs: **3.3.1 Client Sequence Analysis**, **3.3.2 Training**, **3.3.3 Internship**. The Sequence Analysis tab has a status filter, color-coded status dropdown, and a "Generate Report" fallback that writes a `service_report` row and audits the delivery via the `audit_data_modification` RPC. Tabs 3.3.2 and 3.3.3 link to the dedicated training/internship sub-routes. |
| ✅ | **Training & Internship Modules** | Program lists at `/dashboard/services/training` and `/dashboard/services/internship` render DB `training_program` rows filtered by `type`. Per-program sub-routes cover page, assessment, participants, evaluation, onboarding, and certificate views (`/dashboard/services/{training,internship}/[id]/...`). |
| ✅ | **Stub Pages** | Calendar, Accomplishments, Services List, and Repositories render functional stub pages with "Coming Soon" messages per [`11_deliverables_checklist.md`](https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard/blob/main/11_deliverables_checklist.md) §1 (all 8 components present). |
| ✅ | **Google OAuth Login** | Authentication via Supabase Auth with Google OAuth. Session managed in `app/dashboard/layout.tsx:16-40`; redirects to `/login` when unauthenticated. |
| ✅ | **Real-time Audit Logging** | Two secured RPCs in `supabase/migrations/`: `audit_session_event` (called from `app/components/sessionauditor.tsx` on `SIGNED_IN` / `SIGNED_OUT`) and `audit_data_modification` (called from `app/dashboard/services/page.tsx` on report delivery). Both `REVOKE … FROM PUBLIC; GRANT … TO authenticated`. PostgreSQL triggers via `23_audit_triggers.sql` plus the `protect_user_role` defense-in-depth trigger. See [`SECURITY.md`](./SECURITY.md) §5. |

---

## Tech Stack

| Layer | Technology | Version (from `package.json`) |
|-------|-----------|-------------------------------|
| **Framework** | Next.js (App Router) | `16.2.10` |
| **UI Library** | React | `19.2.4` |
| **Language** | TypeScript | `^5` |
| **Styling** | Tailwind CSS | `^4` |
| **Hosting** | Vercel | (auto-deployed from `main`) |
| **Database** | Supabase (PostgreSQL) | Managed |
| **Auth** | Supabase Auth (Google OAuth) | `@supabase/supabase-js ^2.110.0` |
| **Charts** | Recharts | `^3.9.2` |
| **Icons** | Lucide React | `^1.23.0` |

---

## Prerequisites

- **Node.js** (version compatible with Next.js 16 — see `package.json` `"engines"` or `nvm`)
- **npm** (ships with Node.js)
- **Supabase free-tier project** — [supabase.com](https://supabase.com)
- **Vercel account** — [vercel.com](https://vercel.com)
- **Google Cloud Console project** with OAuth 2.0 credentials (Client ID + Client Secret) for the OAuth flow

---

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard.git
cd PGCV_BioInformatics_Dashboard

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Fill in your Supabase credentials
#    NEXT_PUBLIC_SUPABASE_URL   = https://<project-ref>.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY = <your-anon-key>

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/login` when unauthenticated — sign in with a Google account that has a corresponding row in the `users` table.

> **Note:** Your local checkout may be behind `origin/main`. The Supabase integration code (`lib/supabase.ts` helpers, `types/database.ts` Project types, DB-wired Projects and Collaborations pages) was merged in PR #22 (commit `a5a0d68`). Run `git pull origin main` to bring in the latest code.

---

## Deployment

The app deploys automatically on Vercel when changes are pushed to the `main` branch:

1. Import the GitHub repo into Vercel.
2. Set the following environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Push to `main` — Vercel builds and deploys automatically.

HTTPS is enforced by Vercel for the production domain.

---

## Project Structure

```
PGCV_BioInformatics_Dashboard/
├── app/
│   ├── layout.tsx                # Root layout (redirects / → /dashboard)
│   ├── globals.css               # Tailwind v4 @theme tokens + custom fonts
│   ├── components/               # Reusable UI components
│   │   ├── collaborationmodal.tsx
│   │   ├── datatable.tsx
│   │   ├── deletemodal.tsx
│   │   ├── pagination.tsx
│   │   ├── projectmodal.tsx
│   │   ├── sidebar.tsx           # Navigation + sign-out + user profile
│   │   └── taskmodal.tsx
│   ├── dashboard/
│   │   ├── layout.tsx            # Auth guard (redirects to /login if no session)
│   │   ├── page.tsx              # Landing / analytics
│   │   ├── accomplishments/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── collaborations/page.tsx  # DB-integrated
│   │   ├── projects/page.tsx        # DB-integrated
│   │   ├── repositories/page.tsx
│   │   ├── services/
│   │   │   ├── page.tsx              # Sequence Analysis tracker (tabbed)
│   │   │   ├── services-list/page.tsx# Hardcoded service catalog
│   │   │   ├── training/
│   │   │   │   ├── page.tsx          # Training program list (DB-driven)
│   │   │   │   └── [id]/{page,assessment,participants,evaluation,onboarding,certificate}
│   │   │   └── internship/
│   │   │       ├── page.tsx          # Internship program list (DB-driven)
│   │   │       └── [id]/{page,assessment,participants,evaluation,onboarding,certificate}
│   │   └── tasks/page.tsx            # DB-integrated CRUD
│   ├── fonts/                    # Aileron, Optima, Quicksand
│   └── login/page.tsx            # Google OAuth sign-in
├── lib/
│   └── supabase.ts               # Supabase client + DB helpers (typed TableNames)
├── supabase/
│   └── migrations/               # 11 SQL migration files (22 applied to production — see ARCHITECTURE §11 / WORKBOOK §19)
│       ├── 19_initial_schema.sql          # 18 tables + 9 enums + indexes
│       ├── 20_security_functions.sql      # get_user_role(), protect_user_role_column()
│       ├── 21_enable_rls.sql              # RLS enabled on all 18 tables
│       ├── 22_rls_policies.sql            # Per-table policies (30+)
│       ├── 23_audit_triggers.sql          # Audit + protect_user_role triggers
│       ├── 24_updated_at_triggers.sql     # Auto-updated_at on UPDATE
│       ├── 20260717000000_seed_biology_assessments.sql
│       ├── 20260718000000_audit_session_rpc.sql
│       ├── 20260720000000_audit_data_modification_rpc.sql
│       ├── 20260720000000_seed_demo_data.sql
│       └── 20260721000000_add_institution_to_users.sql
├── types/
│   └── database.ts               # Shared TypeScript types
├── .env.example                  # Required env vars documented
├── package.json
└── next.config.ts
```

---

## Documentation

- **Architecture overview:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system diagram, auth flow, data model, RLS summary, deployment architecture.
- **Security + privacy:** [`SECURITY.md`](./SECURITY.md) — RLS policies, audit logging, RA 10173 compliance, known issues.
- **Intern / team handoff workbook:** [`WORKBOOK.md`](./WORKBOOK.md) — team contacts, full data model, sprint plan, training/internship question banks, service catalog, gap tracker. Built from the "Bioinformatics Activity Sheets" Google Doc.

---

## Known Limitations

These items are tracked as honest gaps in the planning documents and the WORKBOOK gap tracker:

1. **Landing-page KPI tiles use a `yearlyMockDB`** — the headline counts (Active Projects, Pending Tasks, Total Services) are hardcoded for demo. Charts use real Supabase queries. Real counts will replace the mock when the bio track confirms the exact metric definitions.
2. **`audit_log` does not yet cover `role_change` and `data_export`** — the enum values exist but no trigger / RPC writes them. See `WORKBOOK.md` §17.2 row 3 and `SECURITY.md` §5.
3. **Encryption-at-rest needs explicit confirmation in the Supabase dashboard** — the free-tier project should have this on by default, but it has not been verified. See `WORKBOOK.md` §17.2 row 4 and `SECURITY.md` §6.
4. **Sprint retrospectives + final reflection are placeholders** — to be filled in before handover. See `WORKBOOK.md` §12.
5. **Supabase `disable_signup` is currently `false`** — anyone with the URL can attempt to sign up. The app only renders the Google button, but a non-Google user can hit the auth API directly. Fix: set `disable_signup: true` or restrict to the lab's Google Workspace domain.
6. **Auto-`updated_at` trigger may not be applied to live Supabase** — `24_updated_at_triggers.sql` is in the repo; verify it has been applied to the live DB. Until then, the client sends `updated_at` in payloads as a workaround.
7. **5-vs-3 `project_status` enum mismatch** — `types/database.ts` declares 5 values (`ongoing`, `for_approval`, `submitted`, `on_hold`, `completed`), but the live DB `project_status` enum has only 3 (`ongoing`, `for_approval`, `submitted`). Submitting a project with `completed` will hit a Postgres check-constraint violation. **Resolution:** run the migration to align the enum with the bio track's Status of Completion spec (5 values).
8. **Omics Portal data import (P3 follow-up)** — the BDML in-house team shared two Firestore exports from the external **Omics Solutions Portal** for reference: `admins.json` (28 staff) and `clients.json` (80+ clients), both at the repo root. These are **one-time exports, not a live feed**. They could seed the Dashboard's `users` and `client` tables (currently 9 and 2 rows respectively) but require a schema-mapping migration because the Omics Portal uses different role vocabulary (`admin | viewer | superadmin` vs. the Dashboard's `team_lead | team_member | intern | trainee | none`) and carries extra fields (`photoURL`, `lastLogin`, `sex`, `year`, `designation`, `haveSubmitted`, `cid`, `pid[]`) that don't exist in the Dashboard schema. Out of scope for this internship; file as a GitHub Issue for the in-house team.
9. **Intern pre/mid/final scores share a single column.** `assessment_response.score` is one smallint used by all stages. Cannot tell which stage produced a given value without joining to `assessment.type`. Schema change (separate columns or `score_meta jsonb`) is deferred to the next cohort.
10. **RLS untested through the app with all four roles** — policies are correct on paper; no end-to-end test with team_lead / team_member / trainee / intern accounts has been performed. Tracking: Task 9.2 (see `SECURITY.md` §10).

---

## License

To be determined; consult the PGCV-BDML supervisor before using or distributing this code outside the lab.

