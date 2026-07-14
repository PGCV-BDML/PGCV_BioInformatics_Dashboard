-- ============================================================
-- 23_audit_triggers.sql
-- Audit + role-protection triggers. Attaches audit_table_change()
-- to every auditable table and protect_user_role_column() to
-- public.users.
-- ============================================================

-- Audit trigger on public.users (currently the only attached one
-- in the live DB; other tables can be added in a later migration
-- if the team wants broader audit coverage.)
CREATE TRIGGER on_user_change_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_change();

-- Prevent non-team_lead from changing the role column.
CREATE TRIGGER protect_user_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_role_column();
