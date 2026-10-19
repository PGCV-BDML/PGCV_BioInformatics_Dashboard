-- Live answers for a training presentation. One open question per program
-- and deck. Each signed-in user has one vote per question. The browser
-- talks to these functions through /api/training-presentations/poll;
-- the tables themselves are not readable with the anon key.

CREATE TABLE IF NOT EXISTS public.poll_question (
  program_id uuid NOT NULL REFERENCES public.training_program(id) ON DELETE CASCADE,
  deck_id text NOT NULL,
  question_id text,
  prompt text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_opinion boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_question_pkey PRIMARY KEY (program_id, deck_id),
  CONSTRAINT poll_question_deck_chk CHECK (deck_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')
);

CREATE TABLE IF NOT EXISTS public.poll_vote (
  program_id uuid NOT NULL REFERENCES public.training_program(id) ON DELETE CASCADE,
  deck_id text NOT NULL,
  question_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_vote_pkey PRIMARY KEY (program_id, deck_id, question_id, user_id),
  CONSTRAINT poll_vote_deck_chk CHECK (deck_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  CONSTRAINT poll_vote_option_chk CHECK (option_index >= 0 AND option_index < 24)
);

ALTER TABLE public.poll_question ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_vote ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.poll_can_access(p_program uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_user_role() = ANY (ARRAY['team_lead'::public.user_roles, 'team_member'::public.user_roles])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::public.user_roles, 'intern'::public.user_roles])
      AND is_enrolled_in_program(p_program)
    );
$$;

CREATE OR REPLACE FUNCTION public.poll_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role() = ANY (ARRAY['team_lead'::public.user_roles, 'team_member'::public.user_roles]);
$$;

CREATE OR REPLACE FUNCTION public.poll_state(p_program uuid, p_deck text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.poll_question%ROWTYPE;
  has_question boolean := false;
  counts jsonb := '[]'::jsonb;
  total integer := 0;
  people integer := 0;
  mine integer := NULL;
  display_name text := NULL;
BEGIN
  IF auth.uid() IS NULL OR NOT public.poll_can_access(p_program) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_deck !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$' THEN
    RAISE EXCEPTION 'bad deck' USING ERRCODE = '22023';
  END IF;

  SELECT name INTO display_name FROM public.users WHERE id = auth.uid();

  SELECT count(DISTINCT user_id)::integer INTO people
  FROM public.poll_vote
  WHERE program_id = p_program AND deck_id = p_deck;

  SELECT * INTO q
  FROM public.poll_question
  WHERE program_id = p_program AND deck_id = p_deck;
  has_question := FOUND AND q.question_id IS NOT NULL;

  IF has_question THEN
    SELECT coalesce(jsonb_agg(n ORDER BY ord), '[]'::jsonb), coalesce(sum(n), 0)::integer
    INTO counts, total
    FROM (
      SELECT opt.ord, count(v.user_id)::integer AS n
      FROM generate_series(0, jsonb_array_length(q.options) - 1) AS opt(ord)
      LEFT JOIN public.poll_vote v
        ON v.program_id = p_program
       AND v.deck_id = p_deck
       AND v.question_id = q.question_id
       AND v.option_index = opt.ord
      GROUP BY opt.ord
    ) tallies;

    SELECT option_index INTO mine
    FROM public.poll_vote
    WHERE program_id = p_program
      AND deck_id = p_deck
      AND question_id = q.question_id
      AND user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object(
    'staff', public.poll_is_staff(),
    'name', display_name,
    'people', people,
    'total', total,
    'counts', counts,
    'mine', mine,
    'question', CASE
      WHEN NOT has_question THEN NULL
      ELSE jsonb_build_object(
        'id', q.question_id,
        'prompt', q.prompt,
        'options', q.options,
        'poll', q.is_opinion
      )
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.poll_set_question(
  p_program uuid,
  p_deck text,
  p_question jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qid text;
  prompt text;
  opts jsonb := '[]'::jsonb;
  item jsonb;
  clean text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.poll_is_staff() OR NOT public.poll_can_access(p_program) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_deck !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$' THEN
    RAISE EXCEPTION 'bad deck' USING ERRCODE = '22023';
  END IF;

  IF p_question IS NULL OR p_question = 'null'::jsonb OR nullif(p_question->>'id', '') IS NULL THEN
    DELETE FROM public.poll_question
    WHERE program_id = p_program AND deck_id = p_deck;
    RETURN public.poll_state(p_program, p_deck);
  END IF;

  qid := left(btrim(p_question->>'id'), 80);
  prompt := left(btrim(coalesce(p_question->>'prompt', '')), 500);
  IF qid !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$' OR prompt = '' THEN
    RAISE EXCEPTION 'bad question' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_question->'options') <> 'array'
     OR jsonb_array_length(p_question->'options') < 1
     OR jsonb_array_length(p_question->'options') > 24 THEN
    RAISE EXCEPTION 'bad question' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_question->'options')
  LOOP
    IF jsonb_typeof(item) <> 'string' THEN
      RAISE EXCEPTION 'bad question' USING ERRCODE = '22023';
    END IF;
    clean := left(btrim(item #>> '{}'), 200);
    IF clean = '' THEN
      RAISE EXCEPTION 'bad question' USING ERRCODE = '22023';
    END IF;
    opts := opts || jsonb_build_array(clean);
  END LOOP;

  INSERT INTO public.poll_question (
    program_id, deck_id, question_id, prompt, options, is_opinion, updated_at
  )
  VALUES (
    p_program, p_deck, qid, prompt, opts, coalesce((p_question->>'poll')::boolean, false), now()
  )
  ON CONFLICT (program_id, deck_id) DO UPDATE
  SET question_id = EXCLUDED.question_id,
      prompt = EXCLUDED.prompt,
      options = EXCLUDED.options,
      is_opinion = EXCLUDED.is_opinion,
      updated_at = now();

  RETURN public.poll_state(p_program, p_deck);
END;
$$;

CREATE OR REPLACE FUNCTION public.poll_vote(
  p_program uuid,
  p_deck text,
  p_option integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.poll_question%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.poll_can_access(p_program) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO q
  FROM public.poll_question
  WHERE program_id = p_program AND deck_id = p_deck;

  IF NOT FOUND OR q.question_id IS NULL THEN
    RAISE EXCEPTION 'no question' USING ERRCODE = 'P0001';
  END IF;
  IF p_option IS NULL OR p_option < 0 OR p_option >= jsonb_array_length(q.options) THEN
    RAISE EXCEPTION 'bad option' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.poll_vote (
    program_id, deck_id, question_id, user_id, option_index, updated_at
  )
  VALUES (p_program, p_deck, q.question_id, auth.uid(), p_option, now())
  ON CONFLICT (program_id, deck_id, question_id, user_id) DO UPDATE
  SET option_index = EXCLUDED.option_index,
      updated_at = now();

  RETURN public.poll_state(p_program, p_deck);
END;
$$;

CREATE OR REPLACE FUNCTION public.poll_clear(p_program uuid, p_deck text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.poll_is_staff() OR NOT public.poll_can_access(p_program) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.poll_vote
  WHERE program_id = p_program AND deck_id = p_deck;

  RETURN public.poll_state(p_program, p_deck);
END;
$$;

REVOKE ALL ON FUNCTION public.poll_can_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.poll_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.poll_state(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.poll_set_question(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.poll_vote(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.poll_clear(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.poll_state(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_set_question(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_vote(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_clear(uuid, text) TO authenticated;
