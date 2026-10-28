-- Add the "Dashboard experience" section to the end of the stored
-- post-activity evaluation form. Learners rate the dashboard itself in the same
-- submission; staff see those answers apart from the activity ratings.
-- Idempotent: skips rows that already have the section, and rows that don't
-- hold the canonical form (ensureProgramEvaluation rewrites those in full).

DO $$
DECLARE
  dashboard jsonb := $dash$[
    {"type":"rating_group","id":"eval_dash_usability","question":"Using the Dashboard","required":true,"allowNA":true,"section":"Dashboard experience","sectionIntro":"Tell us how it was to use this dashboard during the program. Your answers will help us make it easier to use in future programs. Rate each statement, or select N/A if you did not use that part.","statements":[{"id":"eval_dash_navigation","statement":"Ease of signing in and finding your way around the dashboard"},{"id":"eval_dash_modules","statement":"Ease of accessing modules, presentations, and program files"},{"id":"eval_dash_assessments","statement":"Ease of taking the pre/post tests and this evaluation"},{"id":"eval_dash_progress","statement":"Clarity of your progress and what to do next"},{"id":"eval_dash_chat","statement":"Usefulness of the program chat for questions and updates"},{"id":"eval_dash_reliability","statement":"Speed and reliability (pages load, nothing breaks)"}]},
    {"type":"rating_group","id":"eval_dash_overall","question":"Overall Dashboard Evaluation","required":true,"allowNA":true,"statements":[{"id":"eval_dash_overall_experience","statement":"Overall experience using the dashboard"}]},
    {"type":"choice","id":"eval_dash_device","question":"Which device did you mostly use to access the dashboard?","options":["Laptop / Desktop","Tablet","Phone"],"required":true},
    {"type":"text","id":"eval_dash_issues","question":"Did you run into any problems with the dashboard (e.g., errors, broken links, pages that were hard to find)?","required":false,"multiline":true,"placeholder":"Describe any problems here..."},
    {"type":"text","id":"eval_dash_suggestions","question":"What can we do to improve the dashboard for future programs?","required":false,"multiline":true,"placeholder":"Type your suggestions here..."}
  ]$dash$::jsonb;
BEGIN
  UPDATE public.assessment
  SET questions = questions || dashboard
  WHERE type = 'evaluation'
    AND jsonb_typeof(questions) = 'array'
    AND questions @> '[{"id":"eval_full_name"}]'::jsonb
    AND NOT questions @> '[{"id":"eval_dash_usability"}]'::jsonb;
END $$;
