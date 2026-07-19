-- ============================================================
-- 20260720000000_seed_demo_data.sql
-- Seed demo data for July 20, 2026 demo
-- analysis, module, training_session, onboarding_document,
-- certificate, assessment_response, sample
-- ============================================================

DO $$
DECLARE
  -- Resolved user IDs
  team_lead_id    uuid;
  team_member_1   uuid;
  team_member_2   uuid;
  trainee_1       uuid;
  trainee_2       uuid;
  intern_1        uuid;
  intern_2        uuid;
  any_user        uuid;

  -- Project IDs
  p1 uuid; p2 uuid; p3 uuid;

  -- Training program IDs
  bt_id uuid;  -- Bioinformatics Training
  asw_id uuid; -- Advanced Sequencing Workshop
  bip_id uuid; -- Bioinformatics Internship Program
  sri_id uuid; -- Summer Research Internship

  -- Assessment IDs
  bt_pre_id    uuid;
  bt_post_id   uuid;
  bip_pre_id   uuid;
  bip_post_id  uuid;

BEGIN
  -- ============================================================
  -- 1. Resolve reference IDs
  -- ============================================================

  -- Users by role (fall back to any user)
  SELECT id INTO team_lead_id  FROM public.users WHERE role = 'team_lead'  ORDER BY created_at LIMIT 1;
  SELECT id INTO team_member_1 FROM public.users WHERE role = 'team_member' ORDER BY created_at LIMIT 1;
  SELECT id INTO team_member_2 FROM public.users WHERE role = 'team_member' ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO trainee_1     FROM public.users WHERE role = 'trainee'    ORDER BY created_at LIMIT 1;
  SELECT id INTO trainee_2     FROM public.users WHERE role = 'trainee'    ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO intern_1      FROM public.users WHERE role = 'intern'     ORDER BY created_at LIMIT 1;
  SELECT id INTO intern_2      FROM public.users WHERE role = 'intern'     ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO any_user      FROM public.users ORDER BY created_at LIMIT 1;

  team_lead_id  := COALESCE(team_lead_id, any_user);
  team_member_1 := COALESCE(team_member_1, any_user);
  team_member_2 := COALESCE(team_member_2, team_member_1);
  trainee_1     := COALESCE(trainee_1, any_user);
  trainee_2     := COALESCE(trainee_2, trainee_1);
  intern_1      := COALESCE(intern_1, any_user);
  intern_2      := COALESCE(intern_2, intern_1);

  -- Existing projects
  SELECT id INTO p1 FROM public.project ORDER BY created_at LIMIT 1;
  SELECT id INTO p2 FROM public.project ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO p3 FROM public.project ORDER BY created_at OFFSET 2 LIMIT 1;

  -- Training programs (seeded by 20260717 migration)
  SELECT id INTO bt_id FROM public.training_program WHERE title = 'Bioinformatics Training'             AND type = 'training'   LIMIT 1;
  SELECT id INTO asw_id FROM public.training_program WHERE title = 'Advanced Sequencing Workshop'       AND type = 'training'   LIMIT 1;
  SELECT id INTO bip_id FROM public.training_program WHERE title = 'Bioinformatics Internship Program'  AND type = 'internship' LIMIT 1;
  SELECT id INTO sri_id FROM public.training_program WHERE title = 'Summer Research Internship'         AND type = 'internship' LIMIT 1;

  -- Assessments (seeded by 20260717 migration)
  SELECT id INTO bt_pre_id  FROM public.assessment ap WHERE ap.program_id = bt_id AND ap.type = 'pre_test'  LIMIT 1;
  SELECT id INTO bt_post_id FROM public.assessment ap WHERE ap.program_id = bt_id AND ap.type = 'post_test' LIMIT 1;
  SELECT id INTO bip_pre_id FROM public.assessment ap WHERE ap.program_id = bip_id AND ap.type = 'pre_test'  LIMIT 1;
  SELECT id INTO bip_post_id FROM public.assessment ap WHERE ap.program_id = bip_id AND ap.type = 'post_test' LIMIT 1;

  -- ============================================================
  -- 2. analysis (8+ rows, spread across 3 existing projects)
  -- ============================================================

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p1, 'fastp', 'v0.23.4', 'completed', team_member_1, '2026-06-15 09:00:00+08', '2026-06-16 14:30:00+08', '/output/project1/fastp_qc_report.html'
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p1 AND a.pipeline = 'fastp' AND a.status = 'completed');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p1, 'SPAdes', 'v3.15.5', 'ongoing', team_member_2, '2026-06-20 10:00:00+08', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p1 AND a.pipeline = 'SPAdes' AND a.status = 'ongoing');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p1, 'GATK', 'v4.4.0.0', 'for_approval', team_lead_id, '2026-07-01 08:00:00+08', '2026-07-10 17:00:00+08', '/output/project1/gatk_variants.vcf'
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p1 AND a.pipeline = 'GATK' AND a.status = 'for_approval');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p2, 'QIIME2', '2024.10', 'ongoing', team_member_1, '2026-06-25 09:30:00+08', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p2 AND a.pipeline = 'QIIME2' AND a.status = 'ongoing');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p2, 'VSEARCH', 'v2.28.1', 'completed', team_member_2, '2026-06-28 11:00:00+08', '2026-07-02 16:00:00+08', '/output/project2/otu_table.biom'
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p2 AND a.pipeline = 'VSEARCH' AND a.status = 'completed');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p2, 'phyloseq', 'v1.48.0', 'on_hold', team_lead_id, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p2 AND a.pipeline = 'phyloseq' AND a.status = 'on_hold');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p3, 'DESeq2', 'v1.44.0', 'ongoing', team_member_2, '2026-07-05 10:00:00+08', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p3 AND a.pipeline = 'DESeq2' AND a.status = 'ongoing');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p3, 'BUSCO', 'v5.7.1', 'completed', team_member_1, '2026-07-02 09:00:00+08', '2026-07-04 12:00:00+08', '/output/project3/busco_report.txt'
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p3 AND a.pipeline = 'BUSCO' AND a.status = 'completed');

  INSERT INTO public.analysis (project_id, pipeline, pipeline_version, status, assignee_id, started_at, completed_at, output_link)
  SELECT p3, 'topGO', 'v2.56.0', 'submitted', team_lead_id, '2026-07-08 08:00:00+08', '2026-07-12 15:00:00+08', '/output/project3/go_enrichment_results.tsv'
  WHERE NOT EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id = p3 AND a.pipeline = 'topGO' AND a.status = 'submitted');

  -- ============================================================
  -- 3. module (4+ rows, for training programs)
  -- ============================================================

  INSERT INTO public.module (program_id, title, html_content_link, "order", save_log_enabled)
  SELECT bt_id, 'Introduction to Linux for Bioinformatics', '/modules/linux_intro.html', 1, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.module m WHERE m.program_id = bt_id AND m.title = 'Introduction to Linux for Bioinformatics');

  INSERT INTO public.module (program_id, title, html_content_link, "order", save_log_enabled)
  SELECT bt_id, 'NGS Data Quality Control', '/modules/ngs_qc.html', 2, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.module m WHERE m.program_id = bt_id AND m.title = 'NGS Data Quality Control');

  INSERT INTO public.module (program_id, title, html_content_link, "order", save_log_enabled)
  SELECT asw_id, 'Advanced Sequencing Technologies', '/modules/adv_sequencing.html', 1, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.module m WHERE m.program_id = asw_id AND m.title = 'Advanced Sequencing Technologies');

  INSERT INTO public.module (program_id, title, html_content_link, "order", save_log_enabled)
  SELECT bip_id, 'Phylogenetic Inference Methods', '/modules/phylogenetics.html', 1, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.module m WHERE m.program_id = bip_id AND m.title = 'Phylogenetic Inference Methods');

  INSERT INTO public.module (program_id, title, html_content_link, "order", save_log_enabled)
  SELECT bip_id, 'Metagenomic Assembly and Analysis', '/modules/metagenomics.html', 2, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.module m WHERE m.program_id = bip_id AND m.title = 'Metagenomic Assembly and Analysis');

  -- ============================================================
  -- 4. training_session (4+ rows, 1 per program)
  -- ============================================================

  INSERT INTO public.training_session (program_id, date, title, module_link, attendance_required)
  SELECT bt_id, '2026-07-01', 'Session 1: Linux Fundamentals and Setup', '/modules/linux_intro.html', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.training_session s WHERE s.program_id = bt_id AND s.title = 'Session 1: Linux Fundamentals and Setup');

  INSERT INTO public.training_session (program_id, date, title, module_link, attendance_required)
  SELECT asw_id, '2026-07-06', 'Session 1: Illumina vs Nanopore Technologies', '/modules/adv_sequencing.html', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.training_session s WHERE s.program_id = asw_id AND s.title = 'Session 1: Illumina vs Nanopore Technologies');

  INSERT INTO public.training_session (program_id, date, title, module_link, attendance_required)
  SELECT bip_id, '2026-06-29', 'Week 1: Orientation and Development Setup', '/modules/phylogenetics.html', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.training_session s WHERE s.program_id = bip_id AND s.title = 'Week 1: Orientation and Development Setup');

  INSERT INTO public.training_session (program_id, date, title, module_link, attendance_required)
  SELECT sri_id, '2026-07-07', 'Kickoff Meeting and Research Overview', NULL, TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.training_session s WHERE s.program_id = sri_id AND s.title = 'Kickoff Meeting and Research Overview');

  -- ============================================================
  -- 5. onboarding_document (3+ rows, spread across programs)
  -- ============================================================

  INSERT INTO public.onboarding_document (program_id, title, link, is_required)
  SELECT bt_id, 'Bioinformatics Training Syllabus', '/documents/training_syllabus.pdf', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_document d WHERE d.program_id = bt_id AND d.title = 'Bioinformatics Training Syllabus');

  INSERT INTO public.onboarding_document (program_id, title, link, is_required)
  SELECT bip_id, 'Internship Handbook', '/documents/internship_handbook.pdf', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_document d WHERE d.program_id = bip_id AND d.title = 'Internship Handbook');

  INSERT INTO public.onboarding_document (program_id, title, link, is_required)
  SELECT bip_id, 'Code of Conduct Agreement', '/documents/code_of_conduct.pdf', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_document d WHERE d.program_id = bip_id AND d.title = 'Code of Conduct Agreement');

  INSERT INTO public.onboarding_document (program_id, title, link, is_required)
  SELECT sri_id, 'Summer Research Guidelines', '/documents/research_guidelines.pdf', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_document d WHERE d.program_id = sri_id AND d.title = 'Summer Research Guidelines');

  -- ============================================================
  -- 6. certificate (2+ rows, for completed training programs)
  -- ============================================================

  INSERT INTO public.certificate (program_id, participant_id, issued_at, pdf_link)
  SELECT bt_id, trainee_1, '2026-07-03 17:00:00+08', '/certificates/bioinformatics_training_trainee1.pdf'
  WHERE NOT EXISTS (SELECT 1 FROM public.certificate c WHERE c.program_id = bt_id AND c.participant_id = trainee_1);

  INSERT INTO public.certificate (program_id, participant_id, issued_at, pdf_link)
  SELECT asw_id, trainee_2, '2026-07-10 17:00:00+08', '/certificates/adv_sequencing_trainee2.pdf'
  WHERE NOT EXISTS (SELECT 1 FROM public.certificate c WHERE c.program_id = asw_id AND c.participant_id = trainee_2);

  -- ============================================================
  -- 7. assessment_response (4+ rows, mix of pre/post for training programs)
  -- ============================================================

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bt_pre_id, trainee_1,
    '[
      {"id":"pt1","selected":2},{"id":"pt2","selected":1},
      {"id":"pt3","selected":1},{"id":"pt4","selected":1},
      {"id":"pt5","selected":1},{"id":"pt6","selected":2},
      {"id":"pt7","selected":2}
    ]'::jsonb,
    78, '2026-07-01 10:30:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bt_pre_id AND r.participant_id = trainee_1
  );

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bt_pre_id, trainee_2,
    '[
      {"id":"pt1","selected":2},{"id":"pt2","selected":1},
      {"id":"pt3","selected":1},{"id":"pt4","selected":2},
      {"id":"pt5","selected":1},{"id":"pt6","selected":2},
      {"id":"pt7","selected":2}
    ]'::jsonb,
    85, '2026-07-01 11:00:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bt_pre_id AND r.participant_id = trainee_2
  );

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bt_post_id, trainee_1,
    '[
      {"id":"pot1","selected":1},{"id":"pot2","selected":2},
      {"id":"pot3","selected":1},{"id":"pot4","selected":1},
      {"id":"pot5","selected":2},{"id":"pot6","selected":2},
      {"id":"pot7","text":"Bioinformatics is the application of computational methods to analyze biological data, particularly DNA and protein sequences."}
    ]'::jsonb,
    82, '2026-07-03 15:00:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bt_post_id AND r.participant_id = trainee_1
  );

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bt_post_id, trainee_2,
    '[
      {"id":"pot1","selected":1},{"id":"pot2","selected":2},
      {"id":"pot3","selected":1},{"id":"pot4","selected":1},
      {"id":"pot5","selected":2},{"id":"pot6","selected":2},
      {"id":"pot7","text":"Bioinformatics uses computer science and statistics to understand biological data."}
    ]'::jsonb,
    91, '2026-07-03 15:30:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bt_post_id AND r.participant_id = trainee_2
  );

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bip_pre_id, intern_1,
    '{
      "ipt1":"Python, R, JavaScript",
      "ipt2":"VS Code",
      "ipt3":"4",
      "ipt4":"Yes, for personal projects",
      "ipt5":"No",
      "ipt6":"Yes, Ubuntu",
      "ipt7":3,"ipt8":2,
      "ipt9":"No",
      "ipt10":2,
      "ipt11":"Used BLAST for sequence alignment in a class project.",
      "ipt12":1,"ipt13":2,"ipt14":1,"ipt15":3,"ipt16":1,"ipt17":1,"ipt18":1,"ipt19":1,"ipt20":1,"ipt21":1,"ipt22":1,
      "ipt23":"To gain hands-on experience in bioinformatics.",
      "ipt24":"The intersection of biology and computer science fascinates me.",
      "ipt25":"I hope to learn practical bioinformatics workflows."
    }'::jsonb,
    65, '2026-06-30 09:00:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bip_pre_id AND r.participant_id = intern_1
  );

  INSERT INTO public.assessment_response (assessment_id, participant_id, answers, score, submitted_at)
  SELECT bip_post_id, intern_2,
    '{
      "ipo1":4,"ipo2":5,"ipo3":4,"ipo4":3,"ipo5":4,
      "ipo6":4,"ipo7":4,"ipo8":3,"ipo9":4,"ipo10":3,
      "ipo11":3,"ipo12":3,"ipo13":2,"ipo14":3,"ipo15":3,"ipo16":3
    }'::jsonb,
    88, '2026-07-17 16:00:00+08'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = bip_post_id AND r.participant_id = intern_2
  );

  -- ============================================================
  -- 8. sample (2+ rows, spread across projects)
  -- ============================================================

  INSERT INTO public.sample (project_id, identifier, metadata)
  SELECT p1, 'S-001', '{"organism":"Escherichia coli","tissue":"blood","strain":"K-12","collection_date":"2026-06-01"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.sample s WHERE s.project_id = p1 AND s.identifier = 'S-001');

  INSERT INTO public.sample (project_id, identifier, metadata)
  SELECT p2, 'S-002', '{"organism":"Staphylococcus aureus","tissue":"skin swab","strain":"MRSA","collection_date":"2026-06-10"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.sample s WHERE s.project_id = p2 AND s.identifier = 'S-002');

  INSERT INTO public.sample (project_id, identifier, metadata)
  SELECT p3, 'S-003', '{"organism":"Homo sapiens","tissue":"peripheral blood","cell_type":"PBMC","collection_date":"2026-06-15"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.sample s WHERE s.project_id = p3 AND s.identifier = 'S-003');

END $$;
