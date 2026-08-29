-- Staff-only logistics checklist for training programs (projectors, letters, etc.).
-- Internship programs are not seeded. Rows cascade when a program is deleted.

CREATE TABLE IF NOT EXISTS public.training_prep_item (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  item_key text NULL,
  category text NOT NULL,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  notes text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT training_prep_item_pkey PRIMARY KEY (id),
  CONSTRAINT training_prep_item_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.training_program (id) ON DELETE CASCADE,
  CONSTRAINT training_prep_item_label_chk
    CHECK (char_length(btrim(label)) > 0),
  CONSTRAINT training_prep_item_category_chk
    CHECK (category = ANY (ARRAY[
      'venue'::text,
      'documents'::text,
      'hospitality'::text,
      'day_of'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_training_prep_item_program_id
  ON public.training_prep_item USING btree (program_id);

CREATE UNIQUE INDEX IF NOT EXISTS training_prep_item_program_key_uidx
  ON public.training_prep_item (program_id, item_key)
  WHERE item_key IS NOT NULL;

ALTER TABLE public.training_prep_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_prep_item is fully accessible to staff"
  ON public.training_prep_item;
CREATE POLICY "training_prep_item is fully accessible to staff"
  ON public.training_prep_item FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.training_prep_item TO authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.training_prep_item;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.training_prep_item
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill existing training cohorts. Skip internship programs and
-- skip default keys that are already present so the migration is idempotent.
INSERT INTO public.training_prep_item (
  program_id, item_key, category, label, sort_order
)
SELECT
  tp.id,
  d.item_key,
  d.category,
  d.label,
  d.sort_order
FROM public.training_program tp
CROSS JOIN (
  VALUES
    ('venue_reserved', 'venue', 'Venue reserved and confirmed', 10),
    ('projector', 'venue', 'Projector / LCD', 20),
    ('cables', 'venue', 'HDMI cable and adapters', 30),
    ('extension_cords', 'venue', 'Extension cords / power strips', 40),
    ('presenter_laptop', 'venue', 'Presenter laptop charged (plus backup)', 50),
    ('audio', 'venue', 'Speakers / microphone', 60),
    ('wifi', 'venue', 'Internet / Wi-Fi access', 70),
    ('workstations', 'venue', 'Workstations ready (hands-on sessions)', 80),
    ('invitation_letter', 'documents', 'Invitation / request letter to the institution', 90),
    ('confirmation_letters', 'documents', 'Confirmation letters or emails to participants', 100),
    ('attendance_sheet', 'documents', 'Attendance sheet', 110),
    ('agenda', 'documents', 'Printed program / agenda', 120),
    ('name_tags', 'documents', 'Name tags', 130),
    ('consent_forms', 'documents', 'Consent / waiver forms (if needed)', 140),
    ('meals', 'hospitality', 'Snacks / meals arranged', 150),
    ('water', 'hospitality', 'Drinking water', 160),
    ('kits', 'hospitality', 'Participant kits / tokens', 170),
    ('handouts', 'hospitality', 'Printed handouts or USB with materials', 180),
    ('banner', 'hospitality', 'Tarpaulin / banner', 190),
    ('registration_table', 'day_of', 'Registration table set up', 200),
    ('documentation', 'day_of', 'Photo / video documentation', 210),
    ('certificates_ready', 'day_of', 'Certificates ready to issue', 220)
) AS d(item_key, category, label, sort_order)
WHERE tp.type = 'training'::public.training_type
  AND NOT EXISTS (
    SELECT 1
    FROM public.training_prep_item existing
    WHERE existing.program_id = tp.id
      AND existing.item_key = d.item_key
  );
