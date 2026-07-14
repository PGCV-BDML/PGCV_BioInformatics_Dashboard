-- ============================================================
-- 20_security_functions.sql
-- Custom functions used by RLS policies and triggers.
-- These must be created BEFORE policies/triggers reference them.
-- ============================================================

-- Returns the role of the currently-authenticated user.
-- Reads from public.users keyed by auth.uid(). Returns NULL if
-- the user has no row yet (e.g. first login before profile insert).
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_roles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Generic per-row audit trigger. Writes an audit_log entry for
-- INSERT/UPDATE/DELETE. UPDATE entries are split: a "data_modification"
-- entry plus, when applicable, a dedicated "state_change" or
-- "role_change" entry. Updated to mirror the live DB definition.
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_old_option text;
  v_new_option text;
  v_old_diff jsonb;
  v_new_diff jsonb;
  v_changed_columns text;
  v_tables_with_status text[] := array['analysis', 'collaboration', 'project', 'task'];
  v_tables_with_roles text[] := array['users'];
  v_ignore_columns      text[] := array['status', 'updated_at', 'role'];
begin

  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      'data_modification',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object(
        'operation_made', TG_OP,
        'old_data', null,
        'new_data', to_jsonb(NEW),
        'detail_as_text', format('In table %I, new row %s was created', TG_TABLE_NAME, NEW.id::text)
      )
    );

  elsif TG_OP = 'UPDATE' then
    -- whole row audit for UPDATE
    if (to_jsonb(OLD) - v_ignore_columns) is distinct from (to_jsonb(NEW) - v_ignore_columns) then
      select
        jsonb_object_agg(o.key, o.value) filter (where o.value is distinct from n.value),
        jsonb_object_agg(n.key, n.value) filter (where o.value is distinct from n.value)
      into v_old_diff, v_new_diff
      from jsonb_each(to_jsonb(OLD) - v_ignore_columns) o
      join jsonb_each(to_jsonb(NEW) - v_ignore_columns) n on o.key = n.key;

      select string_agg(key, ', ')
      into v_changed_columns
      from jsonb_object_keys(v_new_diff) as key;

      insert into public.audit_log (user_id, action, target_type, target_id, details)
      values (
        auth.uid(),
        'data_modification',
        TG_TABLE_NAME,
        NEW.id::text,
        jsonb_build_object(
          'operation_made', TG_OP,
          'old_data', v_old_diff,
          'new_data', v_new_diff,
          'detail_as_text', format('In table %I, column/s %s was modified in the specified row', TG_TABLE_NAME, v_changed_columns)
        )
      );
    end if;

    -- status column audit for UPDATE
    if TG_TABLE_NAME = any(v_tables_with_status) then
      v_old_option := to_jsonb(OLD)->>'status';
      v_new_option := to_jsonb(NEW)->>'status';

      if v_old_option is distinct from v_new_option then
        insert into public.audit_log (user_id, action, target_type, target_id, details)
        values (
          auth.uid(),
          'state_change',
          TG_TABLE_NAME,
          NEW.id::text,
          jsonb_build_object(
            'operation_made', TG_OP,
            'column_name', 'status',
            'old_data', v_old_option,
            'new_data', v_new_option,
            'detail_as_text', format(
              'In table %I, status is changed from %s to %s',
              TG_TABLE_NAME,
              coalesce(v_old_option, 'NULL'),
              coalesce(v_new_option, 'NULL')
            )
          )
        );
      end if;
    end if;

    if TG_TABLE_NAME = any(v_tables_with_roles) then
      v_old_option := to_jsonb(OLD)->>'role';
      v_new_option := to_jsonb(NEW)->>'role';

      if v_old_option is distinct from v_new_option then
        insert into public.audit_log (user_id, action, target_type, target_id, details)
        values (
          auth.uid(),
          'role_change',
          TG_TABLE_NAME,
          NEW.id::text,
          jsonb_build_object(
            'operation_made', TG_OP,
            'column_name', 'role',
            'old_data', v_old_option,
            'new_data', v_new_option,
            'detail_as_text', format(
              'In table %I, role is changed from %s to %s',
              TG_TABLE_NAME,
              coalesce(v_old_option, 'NULL'),
              coalesce(v_new_option, 'NULL')
            )
          )
        );
      end if;
    end if;

  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      'data_deletion',
      TG_TABLE_NAME,
      OLD.id::text,
      jsonb_build_object(
        'operation_made', TG_OP,
        'old_data', to_jsonb(OLD),
        'new_data', null,
        'detail_as_text', format('In table %I, row %s was deleted', TG_TABLE_NAME, OLD.id::text)
      )
    );
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- Prevents non-team_lead from changing the role column on users.
-- Pairs with the protect_user_role trigger on public.users.
CREATE OR REPLACE FUNCTION public.protect_user_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND get_user_role() != 'team_lead' THEN
    RAISE EXCEPTION 'Only team_lead can modify the role column';
  END IF;
  RETURN NEW;
END;
$$;
