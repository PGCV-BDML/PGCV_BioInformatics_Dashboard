-- ============================================================
-- 20260903120000_web_push_subscriptions.sql
-- Device Web Push subscriptions for the PWA (Android Chrome and
-- iOS 16.4+ Home Screen apps). Rows are per-browser-endpoint.
--
-- Delivery path:
--   INSERT into notifications
--     → trigger posts the row to /api/push/dispatch (pg_net)
--     → Next.js sends Web Push with the VAPID private key
--
-- The dispatch URL is registered the first time a signed-in user
-- hits POST /api/push/bootstrap on the production host.
-- ============================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net is not available; web push dispatch will no-op until it is enabled: %', SQLERRM;
END;
$$;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint         text        NOT NULL,
  p256dh           text        NOT NULL,
  auth             text        NOT NULL,
  expiration_time  timestamptz NULL,
  user_agent       text        NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions select own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions select own"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions insert own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions insert own"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions update own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions update own"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions delete own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions delete own"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Singleton: URL + shared secret used by the INSERT trigger.
-- No client policies; only SECURITY DEFINER functions touch it.
CREATE TABLE IF NOT EXISTS public.push_dispatch_settings (
  id               smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dispatch_url     text        NOT NULL,
  dispatch_secret  text        NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_dispatch_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.upsert_my_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time timestamptz DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_endpoint IS NULL OR length(trim(p_endpoint)) = 0 THEN
    RAISE EXCEPTION 'endpoint required';
  END IF;
  IF p_p256dh IS NULL OR p_auth IS NULL THEN
    RAISE EXCEPTION 'subscription keys required';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, endpoint, p256dh, auth, expiration_time, user_agent
  )
  VALUES (
    v_uid, trim(p_endpoint), p_p256dh, p_auth, p_expiration_time, p_user_agent
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = v_uid,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    expiration_time = excluded.expiration_time,
    user_agent = excluded.user_agent,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_push_subscription(text, text, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_push_subscription(text, text, text, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.push_subscriptions
  WHERE user_id = v_uid AND endpoint = trim(p_endpoint);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_push_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_push_subscription(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_push_dispatch_settings(
  p_url text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.push_dispatch_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_secret IS NULL OR length(trim(p_secret)) < 16 THEN
    RAISE EXCEPTION 'invalid secret';
  END IF;
  IF p_url IS NULL OR (
    p_url NOT LIKE 'https://%/api/push/dispatch'
    AND p_url NOT LIKE 'http://localhost:%/api/push/dispatch'
    AND p_url NOT LIKE 'http://127.0.0.1:%/api/push/dispatch'
  ) THEN
    RAISE EXCEPTION 'invalid dispatch url';
  END IF;

  SELECT * INTO existing FROM public.push_dispatch_settings WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.push_dispatch_settings (id, dispatch_url, dispatch_secret)
    VALUES (1, p_url, p_secret);
    RETURN;
  END IF;

  -- Do not let local/dev overwrite a live HTTPS endpoint.
  IF existing.dispatch_url LIKE 'https://%' AND p_url LIKE 'http://%' THEN
    RETURN;
  END IF;

  IF existing.dispatch_secret = p_secret THEN
    UPDATE public.push_dispatch_settings
    SET dispatch_url = p_url, updated_at = now()
    WHERE id = 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_push_dispatch_settings(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_push_dispatch_settings(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_push_subscriptions_for_dispatch(
  p_user_id uuid,
  p_secret text
)
RETURNS TABLE (
  endpoint text,
  p256dh text,
  auth text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.push_dispatch_settings
    WHERE id = 1 AND dispatch_secret = p_secret
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT s.endpoint, s.p256dh, s.auth
  FROM public.push_subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_push_subscriptions_for_dispatch(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_push_subscriptions_for_dispatch(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_push_subscription_endpoint(
  p_endpoint text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.push_dispatch_settings
    WHERE id = 1 AND dispatch_secret = p_secret
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_push_subscription_endpoint(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription_endpoint(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dispatch_notification_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings public.push_dispatch_settings%ROWTYPE;
  req_headers jsonb;
  req_body jsonb;
BEGIN
  SELECT * INTO settings FROM public.push_dispatch_settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || settings.dispatch_secret
  );
  req_body := jsonb_build_object(
    'id', NEW.id,
    'type', NEW.type,
    'payload', NEW.payload,
    'target_user_id', NEW.target_user_id
  );

  -- pg_net is async; a missing extension must not roll back the notification.
  EXECUTE
    'SELECT net.http_post(url := $1, body := $2::jsonb, headers := $3::jsonb, timeout_milliseconds := $4)'
    USING settings.dispatch_url, req_body, req_headers, 5000;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'web push dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_dispatch_web_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_web_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_notification_web_push();
