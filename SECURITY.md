# Security

## User Management is Out of Scope for MVP

User management features (admin UI, user deletion, role changes via app) are explicitly **out of scope** for this internship's MVP. User creation, role assignment, and user removal are manual DB-admin operations performed via the Supabase SQL Editor. No application-level UI exists for these actions.

---

## Row Level Security (RLS)

All 18 tables in the `public` schema enforce RLS. Policies are split by role:

- **Team Lead** — full read/write on all tables.
- **Team Member** — full read/write on all tables.
- **Trainee / Intern** — read-only on `project`, `task`, `service`; participant-scoped read on `assessment`, `training_program`, `training_session`, `module`, `assessment_response`, `certificate`, `onboarding_document`.
- **Authenticated (no role)** — read own `users` profile only.

The `audit_log` table is readable by **team_lead only**.

## Authorization (Privilege Escalation Prevention)

A `BEFORE UPDATE` trigger (`protect_user_role`) on the `users` table prevents non-`team_lead` users from changing the `role` column. This blocks a `team_member` from:

- Promoting themselves to `team_lead`
- Demoting other users
- Assigning arbitrary roles via direct API calls

Only `team_lead` (or direct DB superuser access) can change roles. This is a defense-in-depth security control; it does not require or depend on any app-level user management UI.

```sql
-- Migration 12: protect_user_role_column
-- BEFORE UPDATE trigger raises exception if non-team_lead changes users.role
```

**No DELETE policy** exists on the `users` table — API-level user deletion is blocked by RLS. Hard deletes require direct database superuser access (Supabase SQL Editor as `postgres`).

## Audit Logging

The `audit_log` table records:
- Table-level changes (`INSERT`, `UPDATE`, `DELETE`) on `projects`, `analyses`, `service_reports`, `users`, `collaborations`, `training_programs`.
- Authentication events (`user_login`, `user_logout`).
- Role changes (`role_change`).
- Bulk data exports (`data_export`).

**Enum values** (database convention): `state_change`, `data_deletion`, `role_change`, `data_export`, `data_modification`, `user_login`, `user_logout`.

Sensitive fields (`email`, `contact_info`) are excluded from `details` JSON to prevent PII leakage.

## Hard Delete Procedure (Reference for In-House Team, Post-MVP)

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
