# PGCV Bioinformatics Dashboard — Security & Privacy

> **Applies to:** `origin/main` as of 2026-07-20. Refreshed alongside `README.md` and `ARCHITECTURE.md` after the Sprint 3 Bioinformatics Services + audit-logging merges and the 8-phase code organization refactoring.
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
| **Sign-out** | `app/components/sidebar.tsx:138-141` — calls `supabase.auth.signOut()` and redirects to `/login` |

**Session lifecycle:**
- On mount, `app/dashboard/layout.tsx:18-44` calls `supabase.auth.getSession()`. If no session exists, `router.push("/login")`.
- `app/dashboard/layout.tsx:33-39` subscribes to `supabase.auth.onAuthStateChange()` to handle token expiry and cross-tab sign-out events. If the session becomes invalid, the listener redirects to `/login`.

**Audit on auth events:** OAuth success and sign-out **do** write `user_login` / `user_logout` entries to `audit_log` via the `audit_session_event` RPC, called from `app/components/sessionauditor.tsx` (mounted by `app/dashboard/layout.tsx`). The RPC is `REVOKE … FROM PUBLIC; GRANT … TO authenticated`. See §5.

**Server component auth:** Server components (6 pages: 4 stubs + training + internship) use `createServerSupabaseClient()` from `lib/supabase-server.ts` for cookie-based auth — a separate pattern from the browser-side JS client.

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

**Type safety as defense-in-depth:** TypeScript `noUncheckedIndexedAccess: true` (Phase 8) prevents undefined-property access at compile time. The `no-explicit-any` ESLint rule (Phase 8) ensures all DB operations have typed payloads. All 18 DB tables have TypeScript interfaces in `types/database.ts`.

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
| `user_login` | User signs in (✅ Implemented via `app/components/sessionauditor.tsx` — mounted in layout. On SIGNED_IN → `audit_session_event('user_login')`) |
| `user_logout` | User signs out (✅ Implemented via `app/components/sessionauditor.tsx` — mounted in layout. On SIGNED_OUT → `audit_session_event('user_logout')`) |

### Currently Implemented

- **`user_login` / `user_logout` from the frontend** — `app/components/sessionauditor.tsx` subscribes to `supabase.auth.onAuthStateChange` and calls the `audit_session_event` RPC (`supabase/migrations/20260718000000_audit_session_rpc.sql`) on `SIGNED_IN` and `SIGNED_OUT`. Filters out `INITIAL_SESSION`, `TOKEN_REFRESHED`, `USER_UPDATED`.
- **`data_modification` from app write paths** — `app/components/service-report-modal.tsx` (extracted in Phase 5) calls the `audit_data_modification` RPC (`supabase/migrations/20260720000000_audit_data_modification_rpc.sql`) on report delivery. Both RPCs are `REVOKE … FROM PUBLIC; GRANT … TO authenticated`.
- **PostgreSQL triggers on tracked tables** — [`supabase/migrations/23_audit_triggers.sql`](./supabase/migrations/23_audit_triggers.sql) attaches `audit_table_change` triggers to `projects`, `analyses`, `service_reports`, `users`, `collaborations`, and `training_programs`. Changes to those tables produce audit-log entries.
- **`role_change` is covered** — the `protect_user_role` trigger (migration 20) fires on `users.role` changes.
- **Sensitive fields excluded** — `email`, `contact_info` are explicitly excluded from the `details` JSON to prevent PII leakage.

### Still Open (honest gaps)

| Gap | Detail | Tracking |
|-----|--------|----------|
| ❌ `data_export` event logging | No code anywhere in the repo writes `data_export` entries. | Sprint 1 follow-up (Task 3.3) |
| ⚠️ Audit-trigger coverage on the remaining tables | Triggers attach to the 6 spec'd tables (projects, analyses, service_reports, users, collaborations, training_programs). Other tracked tables (e.g., `client`, `sample`, `assessment_response`) do not yet emit audit rows. | Sprint 1–2 |

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
| **Audit trail** | `audit_session_event` RPC for `user_login` / `user_logout`; `audit_data_modification` RPC for app-level write paths; PostgreSQL triggers on 6 spec'd tables; `protect_user_role` trigger for role changes. Remaining gaps (`data_export`, additional-table coverage) are tracked in §5. |
| **Data subject rights** | Deletion requests are handled by `team_lead` via Supabase SQL Editor. No admin UI exists for self-service deletion (P4 item). The Hard Delete Procedure (§9) documents the manual process. |
| **Transparency** | A data privacy notice is displayed on the login screen footer (`app/login/page.tsx:185-198`): *"This dashboard stores internal operations records and limited participant data needed for training and internship administration. Access is restricted by role and activity may be logged for accountability."* The notice has not been formally reviewed by the supervisor (Task 10.4, Sprint 4). |

**Open items:**
- Formal supervisor review of privacy notice text — Task 10.4, Sprint 4.
- Full audit coverage: `data_export` action + triggers on the remaining tables — Sprint 1 follow-up (Task 3.3).
- Security checklist walkthrough with screenshots — Task 9.2, Sprint 3.

---

## 8. Secrets Management

| Practice | Implementation |
|----------|---------------|
| **Environment variables** | All secrets are in environment variables — no hardcoded keys in source code. |
| **`.env.example`** | Documents required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (primary). `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present as a commented-out legacy fallback. |
| **`.gitignore`** | Excludes `.env*` (all `.env` files). |
| **Vercel production** | Environment variables set in Vercel dashboard — not in the repo. |
| **Key transition** | `lib/supabase.ts:2` reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` first, falling back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.env.example` was updated in commit `e16c90f` to reflect the publishable key as primary. |

**CI/CD security:** `.github/workflows/ci.yml` (Phase 8) runs `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm test` on every push and PR, preventing type and security regressions from merging.

**Development-time checks:** `reactStrictMode: true` in `next.config.ts` (Phase 8) double-renders components in dev to catch security bugs and side-effect issues earlier.

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

### ✅ Open signup on Supabase Auth — Resolved 2026-07-20

~~**`disable_signup` was previously `false`** (confirmed via GoTrue `/auth/v1/settings`). The app only renders the Google button, but a non-Google user could hit the Supabase Auth API directly to sign up.~~

**Status:** Resolved — `disable_signup` was toggled to `true` in the Supabase Dashboard on 2026-07-20. The `/auth/v1/signup` backdoor is now closed.

### 🟡 Auto-`updated_at` trigger not applied

Migration `24_updated_at_triggers.sql` is in the repo but **NOT applied to the live Supabase database** (the file's own header admits this). The client currently compensates by sending `updated_at` (`new Date().toISOString()`) in payloads (e.g., `app/dashboard/collaborations/page.tsx`). This is a fragile workaround — client clocks may drift, and inconsistent `updated_at` values break ordering assumptions.

- **Tracking:** Apply migration 24 to live Supabase, then remove client-side `updated_at` from all components.

### 🟡 Audit log `data_export` gap

The `data_export` enum value exists but no code anywhere in the repo writes it. No code in the MVP currently performs a bulk data export; this row is reserved for a future export feature. See §5.

- **Tracking:** Sprint 1 follow-up (Task 3.3).

### 🟠 RLS untested through the app with all four roles

The RLS policies defined in `22_rls_policies.sql` are correct on paper, and several real flows (Projects/Collaborations CRUD, Services filtering, landing analytics) are confirmed to work as a logged-in user. **No end-to-end test with test accounts for all four roles** (`team_lead`, `team_member`, `trainee`, `intern`) has been performed.

- **Tracking:** Task 9.2, Sprint 3 — create test accounts for all 4 roles, verify policies, document results.

### ✅ ~~5-vs-3 `project_status` enum mismatch~~ False alarm — Resolved

~~`types/database.ts` declares `ProjectStatus` as `"ongoing" | "for_approval" | "submitted" | "on_hold" | "completed"` (5 values). The live DB `project_status` enum (defined in `19_initial_schema.sql`) has only 3: `"ongoing"`, `"for_approval"`, `"submitted"`. Submitting a project with `"completed"` will hit a Postgres check-constraint violation.~~

**Status:** False alarm. Production DB already has all 5 enum values (`ongoing`, `for_approval`, `submitted`, `on_hold`, `completed`). The earlier report was based on a stale schema snapshot. No mismatch exists.

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
| 8 | ✅ Audit log | **Done (with two known gaps)** | `audit_session_event` RPC + `audit_data_modification` RPC; PostgreSQL triggers on 6 spec'd tables; `role_change` covered. **Gaps:** `data_export` not yet written (no bulk-export feature); trigger coverage on the remaining tables. See §5. |
| 9 | ⚠️ Privacy notice | **Partial** | Full Data Privacy Notice footer on `app/login/page.tsx` (data collected, purpose, retention, access, deletion contact `bdml@pgcvisayas.upv.edu.ph`). **Pending:** Supervisor formal sign-off (Task 10.4, Sprint 4). |
| 10 | ✅ RA 10173 considered | **Done** | This document addresses data minimization, purpose limitation, access control, audit trail, and data subject rights. See §7. |
| 11 | ❌ Test walkthroughs | **Pending** | Documented test accounts and role-based access verification — Task 9.2, Sprint 3. |

---

---

## 12. Cross-references

| Topic | Doc |
|---|---|
| Team contacts, data model, sprint plan, training/internship content, gap tracker | [`WORKBOOK.md`](./WORKBOOK.md) |
| System diagram, auth flow, repo layout, deployment | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Onboarding, local setup, deployment, known limitations | [`README.md`](./README.md) |

---

## 13. Supabase linter findings (as of 2026-07-19)

The Supabase project's static analysis linter reports 15 advisories. **All are warnings** (no errors); none are currently being exploited. They are listed here so the next maintainer can close them.

### 13.1 Security advisories (8 warnings)

| # | Lint | Affected object | Risk | Mitigation |
|---|---|---|---|---|
| S1 | `anon_security_definer_function_executable` | `public.protect_user_role_column()` | `SECURITY DEFINER` is callable by the `anon` role. An unauthenticated client could call it. | `REVOKE EXECUTE ON FUNCTION public.protect_user_role_column() FROM anon, authenticated;` — keep EXECUTE only for `team_lead` (or a dedicated `auth_admin` role). |
| S2 | `authenticated_security_definer_function_executable` | `public.audit_data_modification(text, text, jsonb)` | Callable by any signed-in user. | Add a `WHERE auth.uid() IS NOT NULL` and a role check inside the function. Already partially mitigated by `RAISE EXCEPTION 'must be called by an authenticated user'`. |
| S3 | `authenticated_security_definer_function_executable` | `public.audit_session_event(text, jsonb)` | Same as S2. | Same mitigation. |
| S4 | `authenticated_security_definer_function_executable` | `public.audit_sessions()` | Same as S2; not in local repo. | Audit and tighten. |
| S5 | `authenticated_security_definer_function_executable` | `public.audit_table_change()` | Same as S2. | Same mitigation. |
| S6 | `authenticated_security_definer_function_executable` | `public.get_user_role()` | Same as S2. | Same mitigation. |
| S7 | `authenticated_security_definer_function_executable` | `public.handle_new_user()` | Same as S2; not in local repo. | Audit and tighten. |
| S8 | `auth_leaked_password_protection` | Project config | Have-I-Been-Pwned password list is **disabled** in the Supabase Auth config. | Not relevant for Google-OAuth-only authentication (we never accept passwords). Can be safely ignored, or enabled for defense-in-depth. |

### 13.2 Performance advisories (7 warnings)

| # | Lint | Affected object | Risk | Mitigation |
|---|---|---|---|---|
| P1 | `auth_rls_initplan` | `assessment_response` (insert) | Policy calls `auth.<fn>()` instead of `(select auth.<fn>())`. Per-row re-evaluation breaks the Postgres initplan optimization. | Rewrite the policy: `USING ((select auth.uid()) = participant_id)`. |
| P2 | `auth_rls_initplan` | `assessment_response` (select) | Same. | Same. |
| P3 | `auth_rls_initplan` | `certificate` (select) | Same. | Same. |
| P4 | `auth_rls_initplan` | `users` (select) | Same. | Same. |
| P5 | `auth_rls_initplan` | `users` (update) | Same. | Same. |
| P6 | `unused_index` | `idx_project_service_id` | Index never used by query planner. | Drop it, or keep it if you anticipate heavy `WHERE service_id = ?` queries. |
| P7 | `unused_index` | `idx_service_report_analysis_id` | Same. | Same. |

### 13.3 Migration drift implications for security

Several of the RLS policy refinements in production (S1-S7 mitigations) live in **production-only** migrations that were never committed to the repo. The next maintainer should:

1. Export the current production schema: `supabase db dump --schema public`.
2. Save it as `supabase/migrations/25_reconcile_production.sql`.
3. Apply the S1-S7 mitigations inside that migration, so a fresh `supabase db reset` matches production AND closes the linter warnings.

---

*All Rights Reserved · Philippine Genome Center Visayas — Bioinformatics and Data Management Laboratory · June–July 2026 Internship Program*

