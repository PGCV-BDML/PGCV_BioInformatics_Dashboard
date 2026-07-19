# PGCV Bioinformatics Workflow Dashboard

**Live URL:** [https://pgcv-bioinformatics-dashboard.vercel.app/](https://pgcv-bioinformatics-dashboard.vercel.app/)

**Repository:** `PGCV-BDML/PGCV_BioInformatics_Dashboard`

*Last updated: 2026-07-17 · Commit `a5a0d68` (PR #22 merge — [database-integration](https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard/tree/main))*

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
| 🚧 | **Bioinformatics Services Tracker** | Planned as the core Sprint 3 deliverable — service-report master table with analysis detail, new-analysis form, and sample sub-view. Currently a 26-line "Coming Soon" stub at `/dashboard/services`. Full implementation exists on the unmerged `origin/service_report` branch. |
| 🚧 | **Training & Internship Modules** | Program list, module viewer, assessment/evaluation flow, certificate generation, and participant tracking. Code exists on the unmerged `origin/training_and_internship` branch. |
| ✅ | **Stub Pages** | Calendar, Accomplishments, Services List, and Repositories render functional stub pages with "Coming Soon" messages per [`11_deliverables_checklist.md`](https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard/blob/main/11_deliverables_checklist.md) §1 (all 8 components present). |
| ✅ | **Google OAuth Login** | Authentication via Supabase Auth with Google OAuth. Session managed in `app/dashboard/layout.tsx:16-40`; redirects to `/login` when unauthenticated. |
| 🚧 | **Real-time Audit Logging** | PostgreSQL trigger on `users` table records changes to `audit_log`. Login/logout event writes (`user_login` / `user_logout`) are **not yet implemented** from the frontend — pending Task 3.3, Sprint 1. See [`SECURITY.md`](./SECURITY.md) §5. |

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
│   │   ├── collaborations/page.tsx  # DB-integrated (origin/main)
│   │   ├── projects/page.tsx        # DB-integrated (origin/main)
│   │   ├── repositories/page.tsx
│   │   ├── services/page.tsx     # "Coming Soon" stub
│   │   ├── services-list/page.tsx
│   │   └── tasks/page.tsx        # Mock data (not yet DB-integrated)
│   ├── fonts/                    # Aileron, Optima, Quicksand
│   └── login/page.tsx            # Google OAuth sign-in
├── lib/
│   └── supabase.ts               # Supabase client + DB helpers (128 lines on origin/main)
├── scripts/                      # ⚠️ Stale pre-migration SQL — do NOT run
├── supabase/
│   └── migrations/               # Consolidated migrations (files 19–24)
│       ├── 19_initial_schema.sql
│       ├── 20_security_functions.sql
│       ├── 21_enable_rls.sql
│       ├── 22_rls_policies.sql
│       ├── 23_audit_triggers.sql
│       └── 24_updated_at_triggers.sql  # NOT yet applied to live DB
├── types/
│   └── database.ts               # Shared TypeScript types
├── .env.example                  # Required env vars documented
├── package.json
└── next.config.ts
```

---

## Documentation

- **Architecture overview:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system diagram, auth flow, data model, RLS summary.
- **Security + privacy:** [`SECURITY.md`](./SECURITY.md) — RLS policies, audit logging, RA 10173 compliance, known issues.

---

## Known Limitations

These items are tracked as known issues in the planning documents and are honest about unfinished or risky areas:

1. **Bioinformatics Services Tracker + Training/Internship modules** are on unmerged remote branches (`origin/service_report`, `origin/training_and_internship`). Not yet on `origin/main` or your local disk.
2. **`lib/supabase.ts` integration** code (5 DB helpers, Project types) is on `origin/main` (commit `a5a0d68`). A local checkout at `fa09083` (PR #20) is 5+ commits behind and does not have this code.
3. **Some pages use hardcoded mock data** — the Tasks page in particular has no DB integration. `lib/supabase.ts`'s `TableNames` helper type excludes `"task"`, `"users"`, `"analysis"`, and `"service_report"`.
4. **The `scripts/` SQL folder is stale** — it contains 18 pre-migration SQL files that do not reflect the 15+ applied migrations. Running `scripts/00_master_script.sql` on a fresh Supabase project will produce a broken schema. Use `supabase/migrations/` (files 19–24) instead.
5. **Supabase `disable_signup` is currently `false`** — anyone with the URL can attempt to sign up. The app only renders the Google button, but a non-Google user can hit the auth API directly. Fix planned under Task 3.1, Sprint 1.
6. **Audit log `user_login` / `user_logout` writes are not implemented** — the `audit_log_action` enum includes these values (added in migration `20260708014133`) but no frontend code writes them. Task 3.3, Sprint 1.
7. **Migration 24** (`update_updated_at` trigger) is in the repo but **not applied to live Supabase**. The client currently sends `updated_at` in payloads as a fragile workaround.
8. **5-vs-3 `project_status` enum mismatch** — `types/database.ts` declares 5 values (`ongoing`, `for_approval`, `submitted`, `on_hold`, `completed`), but the live DB `project_status` enum has only 3 (`ongoing`, `for_approval`, `submitted`). Submitting a project with `completed` will hit a Postgres check-constraint violation.
9. **Omics Portal data import (P3 follow-up)** — the BDML in-house team shared two Firestore exports from the external **Omics Solutions Portal** for reference: `admins.json` (28 staff) and `clients.json` (80+ clients), both at the repo root. These are **one-time exports, not a live feed**. They could seed the Dashboard's `users` and `client` tables (currently 9 and 2 rows respectively) but require a schema-mapping migration because the Omics Portal uses different role vocabulary (`admin | viewer | superadmin` vs. the Dashboard's `team_lead | team_member | intern | trainee | none`) and carries extra fields (`photoURL`, `lastLogin`, `sex`, `year`, `designation`, `haveSubmitted`, `cid`, `pid[]`) that don't exist in the Dashboard schema. Out of scope for this internship; file as a GitHub Issue for the in-house team.

---

## License

To be determined; consult the PGCV-BDML supervisor before using or distributing this code outside the lab.

