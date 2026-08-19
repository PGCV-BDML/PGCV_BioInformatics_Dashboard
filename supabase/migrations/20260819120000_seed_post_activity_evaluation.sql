-- Seed the official post-activity evaluation form onto every
-- training and internship program. Idempotent: updates existing
-- evaluation rows and inserts one where missing.

DO $$
DECLARE
  form jsonb := $eval$[
    {"type":"text","id":"eval_full_name","question":"Full Name","required":true,"section":"Participant and activity details"},
    {"type":"text","id":"eval_email","question":"Email Address","required":true,"input":"email"},
    {"type":"text","id":"eval_activity_title","question":"Title of Activity","required":true},
    {"type":"date","id":"eval_start_date","question":"Start Date","required":true},
    {"type":"date","id":"eval_end_date","question":"End Date","required":true},
    {"type":"text","id":"eval_venue","question":"Venue","required":true},
    {"type":"text","id":"eval_designation","question":"Designation","required":false},
    {"type":"text","id":"eval_institution","question":"Institution","required":true},
    {"type":"choice","id":"eval_sex","question":"Sex (upon birth)","options":["Male","Female"],"required":true},
    {"type":"rating_group","id":"eval_topics","question":"Topics / Content and Methods","required":true,"allowNA":true,"section":"Evaluation ratings","sectionIntro":"Please fill out this evaluation form for today's session. Your feedback is important and will help us improve future activities. Indicate your rating by selecting the number that best represents your assessment. If the statement does not apply, select N/A.","statements":[{"id":"eval_topics_usefulness","statement":"Usefulness and relevance"},{"id":"eval_topics_objectives","statement":"Activity objectives were met"},{"id":"eval_topics_pacing","statement":"Course length, pacing, and time for questions were appropriate"},{"id":"eval_topics_exercises","statement":"Suitability and helpfulness of activities/exercises (if applicable)"}]},
    {"type":"rating_group","id":"eval_speaker","question":"Resource Speaker/s","required":true,"allowNA":true,"statements":[{"id":"eval_speaker_knowledge","statement":"Knowledgeable, effective, engaging, and able to answer questions"},{"id":"eval_speaker_preparedness","statement":"Preparedness and punctuality"}]},
    {"type":"rating_group","id":"eval_materials","question":"Materials, Handouts, and Instructional Aids","required":true,"allowNA":true,"statements":[{"id":"eval_materials_presentation","statement":"Presentation materials (slides, videos, etc.) were clear and organized"},{"id":"eval_materials_handouts","statement":"Handouts were useful, appropriate, and easy to understand"},{"id":"eval_materials_exercises","statement":"Materials for activities/exercises were provided (if applicable)"}]},
    {"type":"rating_group","id":"eval_organizers","question":"Activity Organizers / Facilitators / Secretariat","required":true,"allowNA":true,"statements":[{"id":"eval_organizers_helpfulness","statement":"Helpfulness, courtesy, and availability"}]},
    {"type":"rating_group","id":"eval_venue_facilities","question":"Venue and Facilities (If Applicable)","required":true,"allowNA":true,"statements":[{"id":"eval_venue_space","statement":"Spaciousness, lighting, sound system, cleanliness"},{"id":"eval_venue_safety","statement":"Observance of health and safety protocols"}]},
    {"type":"rating_group","id":"eval_food","question":"Food (If Applicable)","required":true,"allowNA":true,"statements":[{"id":"eval_food_taste","statement":"Taste and serving portions"}]},
    {"type":"rating_group","id":"eval_overall","question":"Overall Activity Evaluation","required":true,"allowNA":true,"statements":[{"id":"eval_overall_quality","statement":"Quality & Relevance"}]},
    {"type":"choice","id":"eval_attendance_reason","question":"Why did you attend this activity?","options":["Required","Voluntary/Interested in the Topic","Invited"],"required":true,"section":"Attendance and comments"},
    {"type":"text","id":"eval_suggestions","question":"What suggestions would you like to recommend for future activities?","required":true,"multiline":true,"placeholder":"Type your suggestions here..."},
    {"type":"text","id":"eval_comments","question":"Overall comments on the activity:","required":true,"multiline":true,"placeholder":"Type your comments here..."}
  ]$eval$::jsonb;
BEGIN
  UPDATE public.assessment
  SET questions = form
  WHERE type = 'evaluation';

  INSERT INTO public.assessment (program_id, type, questions)
  SELECT tp.id, 'evaluation', form
  FROM public.training_program tp
  WHERE tp.type IN ('training', 'internship')
    AND NOT EXISTS (
      SELECT 1
      FROM public.assessment a
      WHERE a.program_id = tp.id
        AND a.type = 'evaluation'
    );
END $$;
