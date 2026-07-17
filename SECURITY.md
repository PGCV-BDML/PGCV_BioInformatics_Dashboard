# PGCV Bioinformatics Dashboard — Security & Privacy

> **Applies to:** commit `a5a0d68` (PR #22, `origin/main` as of 2026-07-17)
> **Reference:** Philippine Data Privacy Act of 2012 (RA 10173)

---

## 1. Overview

The Bioinformatics Workflow Dashboard is an **internal lab tool** for the PGCV-BDML team. It stores lab operations data — projects, collaborations, service reports, analyses, and training/internship participant records.

**Threat model:**
- **Primary users:** `team_lead` and `team_member` roles — lab staff who require full read/write access to operational data.
- **Secondary users:** `trainee` and `intern` roles — participants in training/internship programs who should see only their own assessment responses, certificates, and program-visible records (projects, services, tasks).
- **Unauthenticated users:** Blocked by the auth guard at `app/dashboard/layout.tsx:16-40` — redirects to `/login`.
- **External adversaries:** Mitigated by HTTPS, Supabase RLS, and Google OAuth (no password-based auth).

The dashboard is **not** designed to handle sensitive personal information beyond what is needed for lab operations and training administration (`email`, `name`, `contact_info`). See §7 for RA 10173 compliance.

---

## 2. Authentication

**Provider:** Google OAuth via Supabase Auth.

| Aspect | Detail |
|--------|--------|
| **OAuth provider** | Google Cloud Console (Client ID + Client Secret) |
| **Implementation** | `app/login/page.tsx:14-27` — calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })` |
| **Session expiry** | 24 hours (Supabase Auth default) |
| **Session storage** | HTTP-only cookies (Supabase JS client default) |
| **Sign-out** | `app/components/sidebar.tsx:149-152` — calls `supabase.auth.signOut()` and redirects to `/login` |

**Session lifecycle:**
- On mount, `app/dashboard/layout.tsx:16-40` calls `supabase.auth.getSession()`. If no session exists, `router.push("/login")`.
- `app/dashboard/layout.tsx:29-35` subscribes to `supabase.auth.onAuthStateChange()` to handle token expiry and cross-tab sign-out events. If the session becomes invalid, the listener redirects to `/login`.

**Known gap:** OAuth success and sign-out do **not** write `user_login` / `user_logout` entries to `audit_log`. See §5.

---

## 3. User Management is Out of Scope for MVP

User management features (admin UI, user deletion, role changes via app) are explicitly **out of scope** for this internship's MVP. User creation, role assignment, and user removal are manual DB-admin operations performed via the Supabase SQL Editor. No application-level UI exists for these actions.

---

## 4. Authorization (Row Level Security)

### 4.1 RLS Architecture

All 18 tables in the `public` schema enforce Row-Level Security. RLS is enabled via [`supabase/migrations/21_enable_rls.sql`](./supabase/migrations/21_enable_rls.sql). Policies are defined in [`supabase/migrations/22_rls_policies.sql`](./supabase/migrations/22_rls_policies.sql) (274 lines).

Every policy evaluates two context values:
- **`auth.uid()`** — the authenticated user's UUID (from the JWT)
- **`get_user_role()`** — a custom security function (defined in `migration 20`) that reads `public.users.role` for the current user. Returns one of: `team_lead`, `team_member`, `trainee`, `intern`.

### 4.2 Role Hierarchy

```
team_lead ⊃ team_member ⊃ trainee | intern
```

- **`team_lead`** — full read/write on all tables. The only role that can read `audit_log`.
- **`team_member`** — full read/write on all tables. Cannot read `audit_log`. Cannot change `users.role` (blocked by `protect_user_role` trigger).
- **`trainee` / `intern`** — read-only on team data (`project`, `service`, `task`). Participant-scoped read on `assessment`, `training_program`, `training_session`, `module`, `onboarding_document`. Can insert their own `assessment_response` rows. Can read own `certificate`.

### 4.3 Role × Table Access Matrix

"Staff" = `team_lead` OR `team_member`. "Authenticated" = any logged-in user.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Row owner or staff | — | Row owner or staff | — |
| `audit_log` | `team_lead` only | (trigger only) | (no policy) | (no policy) |
| `analysis` | Staff | Staff | Staff | Staff |
| `assessment` | Staff, or scoped participant | Staff | Staff | Staff |
| `assessment_response` | Staff, or row owner | Participant (own) | Staff | Staff |
| `certificate` | Staff, or row owner | Staff | Staff | Staff |
| `client` | Staff | Staff | Staff | Staff |
| `collaboration` | Staff | Staff | Staff | Staff |
| `document_template` | Staff | Staff | Staff | Staff |
| `module` | All authenticated | Staff | Staff | Staff |
| `onboarding_document` | All authenticated | Staff | Staff | Staff |
| `project` | All authenticated | Staff | Staff | Staff |
| `sample` | Staff | Staff | Staff | Staff |
| `service` | All authenticated | Staff | Staff | Staff |
| `service_report` | Staff | Staff | Staff | Staff |
| `task` | All authenticated | Staff | Staff | Staff |
| `training_program` | Staff, or scoped participant | Staff | Staff | Staff |
| `training_session` | Staff, or scoped participant | Staff | Staff | Staff |

### 4.4 Privilege Escalation Prevention

A `BEFORE UPDATE` trigger (`protect_user_role`) on the `users` table prevents non-`team_lead` users from changing the `role` column. This blocks a `team_member` from:

- Promoting themselves to `team_lead`
- Demoting other users
- Assigning arbitrary roles via direct API calls

Only `team_lead` (or direct DB superuser access) can change roles. This is a defense-in-depth security control; it does not require or depend on any app-level user management UI.

```sql
-- Migration 20: protect_user_role trigger
-- BEFORE UPDATE raises exception if non-team_lead changes users.role
```

**No DELETE policy** exists on the `users` table — API-level user deletion is blocked by RLS. Hard deletes require direct database superuser access (Supabase SQL Editor as `postgres`). See §9.

---

## 5. Audit Logging

The `audit_log` table records modifications to database records for accountability. Log entries are `team_lead`-only readable and server-side-only writable.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated |
| `timestamp` | `timestamptz` | Default `now()` |
| `user_id` | `uuid` → `users(id)` | Acting user (FK, `ON DELETE NO ACTION`) |
| `action` | `audit_log_action` (enum) | See below |
| `target_type` | `text` | Table name (e.g., `users`, `analysis`) |
| `target_id` | `text` | Row UUID |
| `details` | `jsonb` | Old/new values (sensitive fields excluded) |

### Enum Values

| Value | Meaning |
|-------|---------|
| `state_change` | INSERT / UPDATE / DELETE on tracked tables |
| `data_deletion` | Explicit DELETE event |
| `role_change` | `users.role` column updated |
| `data_export` | Bulk read-all operation (not yet implemented) |
| `data_modification` | Generic UPDATE event |
| `user_login` | User signs in (not yet implemented from frontend) |
| `user_logout` | User signs out (not yet implemented from frontend) |

### Currently Implemented

- **PostgreSQL trigger on `users` table only** — The file [`supabase/migrations/23_audit_triggers.sql`](./supabase/migrations/23_audit_triggers.sql) defines the `on_user_change_audit` trigger and notes in its own comment: *"currently the only attached one in the live DB; other tables can be added later."* Only changes to `public.users` produce audit log entries today.
- **`role_change` is covered** — the `protect_user_role` trigger fires on `users.role` changes.
- **Sensitive fields excluded** — `email`, `contact_info` are explicitly excluded from the `details` JSON to prevent PII leakage.

### NOT Yet Implemented (honest gaps)

| Gap | Detail | Tracking |
|-----|--------|----------|
| ❌ `user_login` / `user_logout` writes from frontend | `app/login/page.tsx` calls `signInWithOAuth` but does not write a `user_login` row. `app/components/sidebar.tsx:handleSignOut` calls `signOut()` but does not write `user_logout`. The enum values were added in migration `20260708014133` specifically for this purpose but are currently unused. | Task 3.3, Sprint 1 |
| ❌ Audit triggers on other tables | The existing `23_audit_triggers.sql` comment says only `users` is attached. Tables like `analysis`, `project`, `collaboration`, `service_report`, and `training_program` do **not** have audit triggers. The old SECURITY.md incorrectly claimed these were recorded. | Sprint 1–2 |
| ❌ `data_export` event logging | No code anywhere in the repo writes `data_export` entries. | Sprint 1 (Task 3.3) |

### Access Controls

- **Read access:** `team_lead` only (enforced by RLS policy: `get_user_role() = 'team_lead'`).
- **Write access:** Server-side only via the `audit_table_change()` trigger function (defined in `migration 20`). The `audit_log` table has **no INSERT/UPDATE/DELETE policies** for the `authenticated` role — client-side write attempts are blocked at the database level.

---

## 6. Data Protection

| Aspect | Implementation |
|--------|---------------|
| **In transit** | HTTPS enforced by Vercel (Edge TLS) and Supabase (managed TLS). No mixed-content warnings present at deployment. |
| **At rest** | Supabase managed PostgreSQL provides encryption at rest. **[TO CONFIRM IN SUPABASE DASHBOARD]** — the free-tier project should have this enabled by default but this has not been explicitly verified during this internship. |
| **Sensitive fields** | `client.contact_info`, `users.email` are classified as sensitive. Access is controlled by RLS (staff-only SELECT on `client`; row-owner-or-staff on `users`). These fields are excluded from audit log `details` JSON. |
| **No secrets in DB** | No passwords, API keys, or tokens are stored in the database. Authentication is delegated entirely to Supabase Auth. |

---

## 7. Privacy Compliance (RA 10173)

The dashboard is designed with the **Philippine Data Privacy Act of 2012 (RA 10173)** as a compliance baseline.

| Principle | How it is addressed |
|-----------|-------------------|
| **Data minimization** | Only fields needed for lab operations and training administration are collected. The data model (defined in `19_initial_schema.sql`) was reviewed by the Biology track during Sprint 1 per `implementation_plan.md` Task 2. |
| **Purpose limitation** | Data is used exclusively for internal lab operations: tracking projects, collaborations, service reports, training, and internships. No data is shared with third parties. |
| **Access control** | RLS-based (see §4). `team_lead` and `team_member` have full operational access. `trainee`/`intern` have participant-scoped read access only. |
| **Audit trail** | PostgreSQL trigger for `users` table changes. Full audit coverage (login/logout, all table changes) is pending (see §5). |
| **Data subject rights** | Deletion requests are handled by `team_lead` via Supabase SQL Editor. No admin UI exists for self-service deletion (P4 item). The Hard Delete Procedure (§9) documents the manual process. |
| **Transparency** | A data privacy notice is displayed on the login screen footer (`app/login/page.tsx:185-198`): *"This dashboard stores internal operations records and limited participant data needed for training and internship administration. Access is restricted by role and activity may be logged for accountability."* The notice has not been formally reviewed by the supervisor (Task 10.4, Sprint 4). |

**Open items:**
- Formal supervisor review of privacy notice text — Task 10.4, Sprint 4.
- Full audit coverage for login/logout and all table changes — Sprint 1–2.
- Security checklist walkthrough with screenshots — Task 9.2, Sprint 3.

---

## 8. Secrets Management

| Practice | Implementation |
|----------|---------------|
| **Environment variables** | All secrets are in environment variables — no hardcoded keys in source code. |
| **`.env.example`** | Documents required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| **`.gitignore`** | Excludes `.env*` (all `.env` files). |
| **Vercel production** | Environment variables set in Vercel dashboard — not in the repo. |
| **Missing variable** | `lib/supabase.ts:2` also reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as a fallback. This variable is **not documented** in `.env.example`. |

---

## 9. Hard Delete Procedure (Reference for In-House Team, Post-MVP)

> **This procedure is out of scope for the MVP.** It is documented here as a reference for the in-house PGCV-BDML team should they need to perform a hard delete after the interns' handover. The MVP does not support, test, or provide a UI for user deletion.

All foreign key constraints use `ON DELETE NO ACTION` (RESTRICT). Deleting a user will fail if they are still referenced. Follow this order:

1. **Reassign or delete dependent records:**
   - `projects` — set `lead_user_id` to another staff member or delete the project.
   - `analyses` — set `analyst_id` to another staff member or delete the analysis.
   - `service_reports` — set `owner_id` to another staff member or delete the report.
   - `collaborations` — set `lead_user_id` to another staff member or NULL.
   - `training_programs` — set `supervisor_id` to another staff member.
   - `tasks` — set `assignee_id` to another staff member or NULL.
   - `assessment_response` / `certificate` / `onboarding_document` — delete or reassign `participant_id`.

2. **Delete the user from `public.users`.**

3. **Delete the user from Supabase Auth** (Dashboard → Authentication → Users, or via `auth.admin.deleteUser()`).

> **Note:** If you want audit logs to survive user deletion, alter the FK on `audit_log.user_id` to `ON DELETE SET NULL` before step 2. This preserves historical audit entries without a linked user.

---

## 10. Known Issues

These are honest assessments of current risks and incomplete security controls, drawn from the Sprint 3 deep-dive analysis and the planning documents:

### 🔴 Open signup on Supabase Auth

**`disable_signup` is currently `false`** (confirmed via GoTrue `/auth/v1/settings`). The app only renders the Google button, but a non-Google user can hit the Supabase Auth API directly to sign up. This creates a real attack surface.

- **Planned fix:** Either set `disable_signup: true` or restrict to the lab's Google Workspace domain.
- **Tracking:** Task 3.1, Sprint 1.

### 🟡 Auto-`updated_at` trigger not applied

Migration `24_updated_at_triggers.sql` is in the repo but **NOT applied to the live Supabase database** (the file's own header admits this). The client currently compensates by sending `updated_at` (`new Date().toISOString()`) in payloads (e.g., `app/dashboard/collaborations/page.tsx`). This is a fragile workaround — client clocks may drift, and inconsistent `updated_at` values break ordering assumptions.

- **Tracking:** Apply migration 24 to live Supabase, then remove client-side `updated_at` from all components.

### 🟡 Audit log gap for login/logout

See §5. The `user_login` and `user_logout` enum values exist in the database (added in migration `20260708014133`) but no frontend code writes them. The privacy checklist item "Sensitive actions write to the AuditLog collection: login" is currently unchecked.

- **Tracking:** Task 3.3, Sprint 1.

### 🟡 Stale `scripts/` folder

The `scripts/` directory contains 18 SQL files (`00_master_script.sql` through `18_training_session.sql`) that reflect the **pre-migration schema**. They use the old `public.user` table name (pre-rename), trailing-space enum values (pre-fix), `questions text[]` instead of `jsonb`, and have no RLS policies, no `protect_user_role` trigger, no `repository_link` columns, and no CHECK constraints.

**Do NOT run `scripts/00_master_script.sql` on a fresh Supabase project.** Use `supabase/migrations/` (files 19–24) as the source of truth.

### 🟠 RLS untested through the app

The RLS policies defined in `22_rls_policies.sql` are correct on paper but **no `supabase.from()` call has exercised them end-to-end** with test accounts. The local checkout (commit `fa09083`) has zero `supabase.from()` calls — the post-merge integration (PR #22, commit `a5a0d68`) is the first code to hit Supabase from the frontend.

- **Tracking:** Task 9.2, Sprint 3 — create test accounts for all 4 roles, verify policies, document results.

### 🔴 5-vs-3 `project_status` enum mismatch

`types/database.ts` declares `ProjectStatus` as `"ongoing" | "for_approval" | "submitted" | "on_hold" | "completed"` (5 values). The live DB `project_status` enum (defined in `19_initial_schema.sql`) has only 3: `"ongoing"`, `"for_approval"`, `"submitted"`. Submitting a project with `"completed"` will hit a Postgres check-constraint violation.

---

## 11. Security Checklist

Source: [`06_privacy_security_checklist.md`](https://github.com/PGCV-BDML/PGCV_BioInformatics_Dashboard/blob/main/intern_kickoff_package/intern%20copy/06_privacy_security_checklist.md) and `implementation_plan.md` §VII.

| # | Item | Status | Evidence / Tracking |
|---|------|--------|-------------------|
| 1 | ✅ HTTPS everywhere | **Done** | Vercel Edge TLS; no mixed-content warnings after E2E test (Task 3.7) |
| 2 | ✅ Google login only | **Done** | `app/login/page.tsx:14-27` — single Google OAuth button |
| 3 | ✅ Sign-out clears session | **Done** | `app/components/sidebar.tsx:149-152` — `supabase.auth.signOut()` + `router.push("/login")` |
| 4 | ✅ DB rules require auth | **Done** | RLS on all 18 tables (`21_enable_rls.sql`); auth guard in `app/dashboard/layout.tsx:16-40` |
| 5 | ✅ Role-based access | **Done** | Policies in `22_rls_policies.sql`; `protect_user_role` trigger for escalation prevention |
| 6 | ❓ Encryption at rest | **Requires confirmation** | Supabase managed PostgreSQL should provide this by default. **Check in Supabase Dashboard → Database → Encryption settings during Sprint 1.** |
| 7 | ✅ No secrets in repo | **Done** | All secrets in env vars; `.env*` in `.gitignore` |
| 8 | ❌ Audit log | **Partial** | Trigger design done for `users` table. `role_change` covered. **Gaps:** `user_login`/`user_logout` frontend writes (Task 3.3); triggers on other tables; `data_export` logging. See §5. |
| 9 | ❌ Privacy notice | **Partial** | Short notice on login screen footer (`app/login/page.tsx:185-198`). **Pending:** Supervisor review and formal sign-off (Task 10.4, Sprint 4). |
| 10 | ✅ RA 10173 considered | **Done** | This document addresses data minimization, purpose limitation, access control, audit trail, and data subject rights. See §7. |
| 11 | ❌ Test walkthroughs | **Pending** | Documented test accounts and role-based access verification — Task 9.2, Sprint 3. |

---

*All Rights Reserved · Philippine Genome Center Visayas — Bioinformatics and Data Management Laboratory · June–July 2026 Internship Program*

