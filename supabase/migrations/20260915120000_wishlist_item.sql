-- Shared bioinfo lab wish list. Staff add items; approving officers
-- may read the board and update notes only. No notifications.

CREATE TABLE IF NOT EXISTS public.wishlist_item (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  category text NOT NULL DEFAULT 'equipment',
  status text NOT NULL DEFAULT 'requested',
  quantity integer NOT NULL DEFAULT 1,
  estimated_cost numeric(12, 2) NULL,
  vendor_or_link text NULL,
  requester_id uuid NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT wishlist_item_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_item_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT wishlist_item_title_chk
    CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT wishlist_item_quantity_chk
    CHECK (quantity >= 1),
  CONSTRAINT wishlist_item_estimated_cost_chk
    CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT wishlist_item_category_chk
    CHECK (category = ANY (ARRAY[
      'equipment'::text,
      'furniture'::text,
      'consumables'::text,
      'software'::text,
      'subscription'::text,
      'other'::text
    ])),
  CONSTRAINT wishlist_item_status_chk
    CHECK (status = ANY (ARRAY[
      'requested'::text,
      'in_process'::text,
      'received'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_wishlist_item_status
  ON public.wishlist_item USING btree (status);

CREATE INDEX IF NOT EXISTS idx_wishlist_item_category
  ON public.wishlist_item USING btree (category);

CREATE INDEX IF NOT EXISTS idx_wishlist_item_requester_id
  ON public.wishlist_item USING btree (requester_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_item_created_at
  ON public.wishlist_item USING btree (created_at DESC);

ALTER TABLE public.wishlist_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_item select staff and approving officer"
  ON public.wishlist_item;
CREATE POLICY "wishlist_item select staff and approving officer"
  ON public.wishlist_item FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY[
      'team_lead'::text,
      'team_member'::text,
      'approving_officer'::text
    ])
  );

DROP POLICY IF EXISTS "wishlist_item insert staff own"
  ON public.wishlist_item;
CREATE POLICY "wishlist_item insert staff own"
  ON public.wishlist_item FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND requester_id = auth.uid()
  );

DROP POLICY IF EXISTS "wishlist_item update own or lead"
  ON public.wishlist_item;
CREATE POLICY "wishlist_item update own or lead"
  ON public.wishlist_item FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
    )
  );

DROP POLICY IF EXISTS "wishlist_item update notes approving officer"
  ON public.wishlist_item;
CREATE POLICY "wishlist_item update notes approving officer"
  ON public.wishlist_item FOR UPDATE TO authenticated
  USING (get_user_role() = 'approving_officer'::text)
  WITH CHECK (get_user_role() = 'approving_officer'::text);

DROP POLICY IF EXISTS "wishlist_item delete own or lead"
  ON public.wishlist_item;
CREATE POLICY "wishlist_item delete own or lead"
  ON public.wishlist_item FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND requester_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.wishlist_item_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.requester_id := OLD.requester_id;
    NEW.created_at := OLD.created_at;
  END IF;

  IF get_user_role() = 'approving_officer' THEN
    IF TG_OP <> 'UPDATE' THEN
      RAISE EXCEPTION 'Approving officers may only update notes on wish list items'
        USING ERRCODE = '42501';
    END IF;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.category := OLD.category;
    NEW.status := OLD.status;
    NEW.quantity := OLD.quantity;
    NEW.estimated_cost := OLD.estimated_cost;
    NEW.vendor_or_link := OLD.vendor_or_link;
  ELSIF get_user_role() = 'team_member'
    AND TG_OP = 'UPDATE'
    AND OLD.requester_id <> auth.uid() THEN
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.category := OLD.category;
    NEW.quantity := OLD.quantity;
    NEW.estimated_cost := OLD.estimated_cost;
    NEW.vendor_or_link := OLD.vendor_or_link;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wishlist_item_before_write ON public.wishlist_item;
CREATE TRIGGER wishlist_item_before_write
  BEFORE INSERT OR UPDATE ON public.wishlist_item
  FOR EACH ROW
  EXECUTE FUNCTION public.wishlist_item_before_write();

DROP TRIGGER IF EXISTS set_updated_at ON public.wishlist_item;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wishlist_item
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.wishlist_item TO authenticated;
