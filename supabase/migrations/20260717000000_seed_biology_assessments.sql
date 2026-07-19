-- NOTE: This file was applied manually via the Supabase SQL editor on
-- 2026-07-17 and is NOT tracked in `supabase_migrations` (`list_migrations`).
-- It is idempotent (every INSERT uses `WHERE NOT EXISTS` guards) and can be
-- re-applied safely if a fresh database is being rebuilt. After running the
-- upstream migrations 1-15, run this file as a one-shot seed step.

-- ============================================================
-- 20260717000000_seed_biology_assessments.sql
-- Seed biology activity sheet content: programs + assessments
-- ============================================================

-- Use a subquery to pick the first staff user, falling back to any user
DO $$
DECLARE
  staff_id uuid;
  any_user_id uuid;
  bioinformatics_training_id uuid;
  advanced_sequencing_id uuid;
  internship_program_id uuid;
  summer_internship_id uuid;
BEGIN
  -- Resolve instructor IDs
  SELECT id INTO staff_id FROM public.users WHERE role IN ('team_lead', 'team_member') ORDER BY created_at LIMIT 1;
  SELECT id INTO any_user_id FROM public.users ORDER BY created_at LIMIT 1;
  staff_id := COALESCE(staff_id, any_user_id);

  -- ============================================================
  -- a) Insert training programs
  -- ============================================================
  INSERT INTO public.training_program (title, type, start_date, end_date, instructor_id, description)
  SELECT 'Bioinformatics Training', 'training', '2026-07-01', '2026-07-03', staff_id, 'Introduction to bioinformatics concepts and tools.'
  WHERE NOT EXISTS (SELECT 1 FROM public.training_program WHERE title = 'Bioinformatics Training' AND type = 'training');

  INSERT INTO public.training_program (title, type, start_date, end_date, instructor_id, description)
  SELECT 'Advanced Sequencing Workshop', 'training', NULL, NULL, staff_id, 'Workshop on advanced sequencing analysis.'
  WHERE NOT EXISTS (SELECT 1 FROM public.training_program WHERE title = 'Advanced Sequencing Workshop' AND type = 'training');

  -- ============================================================
  -- b) Insert internship programs
  -- ============================================================
  INSERT INTO public.training_program (title, type, start_date, end_date, instructor_id, description)
  SELECT 'Bioinformatics Internship Program', 'internship', '2026-06-29', '2026-07-20', staff_id, 'Hands-on internship covering wet lab to dry lab bioinformatics.'
  WHERE NOT EXISTS (SELECT 1 FROM public.training_program WHERE title = 'Bioinformatics Internship Program' AND type = 'internship');

  INSERT INTO public.training_program (title, type, start_date, end_date, instructor_id, description)
  SELECT 'Summer Research Internship', 'internship', NULL, NULL, staff_id, 'Research-focused internship.'
  WHERE NOT EXISTS (SELECT 1 FROM public.training_program WHERE title = 'Summer Research Internship' AND type = 'internship');

  -- ============================================================
  -- c) Insert assessment rows (linked to the programs above)
  -- ============================================================

  -- Fetch program IDs
  SELECT id INTO bioinformatics_training_id FROM public.training_program WHERE title = 'Bioinformatics Training' AND type = 'training' LIMIT 1;
  SELECT id INTO internship_program_id FROM public.training_program WHERE title = 'Bioinformatics Internship Program' AND type = 'internship' LIMIT 1;

  -- Training Pre-Test
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT bioinformatics_training_id, 'pre_test', '[
    {"type": "mcq", "id": "pt1", "question": "The National Human Genome Research Institute defines this as the ''scientific subdiscipline that involves using computer technology to collect, store, analyze, and disseminate biological data and information, such as DNA and amino acid sequences or annotations about those sequences.''", "options": ["Biostatistics", "Biotechnology", "Bioinformatics", "Biocomputing"], "correct": 2},
    {"type": "mcq", "id": "pt2", "question": "Which of the following statements is correct?", "options": ["Transcriptomics is the study of an organism''s DNA, while genomics studies the RNA molecules.", "Transcriptomics is the study of RNA molecules, while genomics studies an organism''s DNA."], "correct": 1},
    {"type": "mcq", "id": "pt3", "question": "In Linux, what happens when you type `pwd` into a terminal?", "options": ["Nothing happens.", "It prints the current working directory.", "It powers off the machine.", "It pastes your previous command."], "correct": 1},
    {"type": "mcq", "id": "pt4", "question": "In DNA barcoding and whole-genome sequencing, which tool is commonly used to perform quality control on sequencing reads?", "options": ["BLAST", "FastQC", "fastp", "DeepSeek"], "correct": 1},
    {"type": "mcq", "id": "pt5", "question": "In transcriptomics, how is a transcriptome defined?", "options": ["It is the study of all the genes in an organism.", "It is the entire collection of RNA transcripts in an organism.", "It refers to the unique regions in an organism''s DNA."], "correct": 1},
    {"type": "mcq", "id": "pt6", "question": "In DNA barcoding, which biomarker is predominantly used to identify fungi?", "options": ["COI (mitochondrial DNA)", "rbcL, matK (chloroplast DNA)", "ITS (nuclear ribosomal DNA)", "16S rRNA (ribosomal RNA gene)"], "correct": 2},
    {"type": "mcq", "id": "pt7", "question": "What does the acronym HPC stand for?", "options": ["High-Performance Chromatography", "High-Power Computing", "High-Performance Computing", "Highly Powerful Computer"], "correct": 2}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = bioinformatics_training_id AND type = 'pre_test');

  -- Training Post-Test
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT bioinformatics_training_id, 'post_test', '[
    {"type": "mcq", "id": "pot1", "question": "If you have just installed a Linux virtual machine and opened the terminal, which directory are you currently in by default?", "options": ["The root directory (/)", "The home directory (~)", "The tmp directory (/tmp)", "The etc directory (/etc)"], "correct": 1},
    {"type": "mcq", "id": "pot2", "question": "You have been tasked with identifying a mold species that is damaging crops. Which appropriate biomarker would you sequence?", "options": ["COI", "rbcL, matK", "ITS", "16S rRNA"], "correct": 2},
    {"type": "mcq", "id": "pot3", "question": "Which of the following analogies correctly matches the field to its molecule of study?", "options": ["Transcriptomics: DNA, Genomics: RNA", "Transcriptomics: RNA, Genomics: DNA", "Transcriptomics: Metabolites, Genomics: RNA", "Transcriptomics: DNA, Genomics: Metabolites"], "correct": 1},
    {"type": "mcq", "id": "pot4", "question": "What is the main difference between a genome and a transcriptome?", "options": ["The transcriptome encompasses all genes in an organism, while the genome refers to the collection of RNA.", "The genome encompasses the complete set of DNA in an organism, while the transcriptome refers to the entire collection of RNA transcripts produced by that genome.", "The transcriptome is only a unique region in an organism''s DNA, while the genome encompasses the entire DNA sequence."], "correct": 1},
    {"type": "mcq", "id": "pot5", "question": "What does HPC mean, and why is it needed in bioinformatics?", "options": ["High-Performance Chromatography – Used for the separation of DNA and contaminants.", "High-Precision Computers – Computers designed specifically to perform calculations with zero rounding errors.", "High-Performance Computing – Systems capable of aggregating computing power to analyze large volumes of biological data efficiently."], "correct": 2},
    {"type": "mcq", "id": "pot6", "question": "In DNA barcoding and whole-genome sequencing, which tool is commonly used to trim adapter sequences and low-quality reads?", "options": ["BLAST", "FastQC", "fastp", "DeepSeek"], "correct": 2},
    {"type": "text", "id": "pot7", "question": "Based on what you have learned in this training, define ''bioinformatics'' in your own words.", "multiline": true}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = bioinformatics_training_id AND type = 'post_test');

  -- Training Evaluation
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT bioinformatics_training_id, 'evaluation', '[
    {"type": "rating", "id": "ev1", "question": "Was the staff understanding and friendly?", "scale": 5},
    {"type": "rating", "id": "ev2", "question": "Were you able to clearly understand what the staff was teaching?", "scale": 5},
    {"type": "rating", "id": "ev3", "question": "Was the staff open to questions and suggestions?", "scale": 5},
    {"type": "rating", "id": "ev4", "question": "Were the presented training materials interactive?", "scale": 5},
    {"type": "rating", "id": "ev5", "question": "Were the training materials easy to understand and navigate?", "scale": 5},
    {"type": "rating", "id": "ev6", "question": "Did the visuals in the training materials have a readable font size and style?", "scale": 5},
    {"type": "rating", "id": "ev7", "question": "Did you experience any technical bugs or encounter incorrect information while using the learning materials?", "scale": 5},
    {"type": "rating", "id": "ev8", "question": "Was the mode of training convenient and appropriate?", "scale": 5},
    {"type": "rating", "id": "ev9", "question": "Were the specific topics covered in this training relevant to your job or education?", "scale": 5},
    {"type": "rating", "id": "ev10", "question": "Were the topics difficult to understand?", "scale": 5},
    {"type": "rating", "id": "ev11", "question": "Was the training conducted at a comfortable pace (neither too fast nor too slow)?", "scale": 5},
    {"type": "rating", "id": "ev12", "question": "Was the number of other trainees in the cohort comfortable for a learning environment?", "scale": 5},
    {"type": "rating", "id": "ev13", "question": "Overall, did you learn a lot about bioinformatics during this training?", "scale": 5},
    {"type": "rating", "id": "ev14", "question": "Did this training meet your expectations?", "scale": 5},
    {"type": "rating", "id": "ev15", "question": "How likely are you to recommend this training to your colleagues?", "scale": 5},
    {"type": "text", "id": "ev_comments", "question": "Suggestions/Comments", "multiline": true}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = bioinformatics_training_id AND type = 'evaluation');

  -- Internship Pre-Test
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT internship_program_id, 'pre_test', '[
    {"type": "text", "id": "ipt1", "question": "Which programming languages are you fluent in? Please list them.", "multiline": true},
    {"type": "text", "id": "ipt2", "question": "Which text editor do you use for coding?"},
    {"type": "text", "id": "ipt3", "question": "How fluently can you navigate and use VS Code or VSCodium?"},
    {"type": "text", "id": "ipt4", "question": "Have you ever used GitHub or other version control software?"},
    {"type": "text", "id": "ipt5", "question": "Have you contributed to any open-source projects? If so, please provide your GitHub profile link."},
    {"type": "text", "id": "ipt6", "question": "Are you familiar with Linux or Unix? Which specific operating systems have you used?"},
    {"type": "rating", "id": "ipt7", "question": "How fluent are you in R? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt8", "question": "How familiar are you with Bash or other Unix shells, such as FISH or ZSH? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "text", "id": "ipt9", "question": "Have you worked in a server environment before?"},
    {"type": "rating", "id": "ipt10", "question": "Have you used Conda before? How familiar are you with using Conda? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "text", "id": "ipt11", "question": "Have you ever used any bioinformatics tools? If so, what did you use them for?", "multiline": true},
    {"type": "rating", "id": "ipt12", "question": "How familiar are you with fastp? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt13", "question": "How familiar are you with MultiQC and FastQC? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt14", "question": "How familiar are you with SPAdes? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt15", "question": "How familiar are you with BLAST? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt16", "question": "How familiar are you with Trinity? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt17", "question": "How familiar are you with QIIME 2? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt18", "question": "How familiar are you with DESeq2? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt19", "question": "How familiar are you with Salmon? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt20", "question": "How familiar are you with BUSCO? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt21", "question": "How familiar are you with QUAST? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipt22", "question": "How familiar are you with Prokka? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "text", "id": "ipt23", "question": "Why did you decide to do your internship at PGC Visayas?", "multiline": true},
    {"type": "text", "id": "ipt24", "question": "What sparked your interest in bioinformatics?", "multiline": true},
    {"type": "text", "id": "ipt25", "question": "What are your expectations for this internship?", "multiline": true}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = internship_program_id AND type = 'pre_test');

  -- Internship Post-Test
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT internship_program_id, 'post_test', '[
    {"type": "rating", "id": "ipo1", "question": "How confident are you in using R and RStudio? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo2", "question": "How confident are you in using VS Code? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo3", "question": "How confident are you in using GitHub? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo4", "question": "How confident are you in Bash scripting? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo5", "question": "How confident are you in using Conda? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo6", "question": "How confident are you in using fastp? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo7", "question": "How confident are you in using MultiQC and FastQC? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo8", "question": "How confident are you in using SPAdes? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo9", "question": "How confident are you in using BLAST? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo10", "question": "How confident are you in using Trinity? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo11", "question": "How confident are you in using QIIME 2? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo12", "question": "How confident are you in using DESeq2? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo13", "question": "How confident are you in using Salmon? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo14", "question": "How confident are you in using BUSCO? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo15", "question": "How confident are you in using QUAST? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ipo16", "question": "How confident are you in using Prokka? (Rate on a scale of 1–5)", "scale": 5}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = internship_program_id AND type = 'post_test');

  -- Internship Evaluation
  INSERT INTO public.assessment (program_id, type, questions)
  SELECT internship_program_id, 'evaluation', '[
    {"type": "text", "id": "ie1", "question": "What challenges did you face, and how did you overcome them?", "multiline": true},
    {"type": "rating", "id": "ie2", "question": "Did the internship meet your expectations? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ie3", "question": "How would you rate the training and guidance you received from your supervisor? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ie4", "question": "How would you rate your cooperation with the other interns? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "text", "id": "ie5", "question": "How has this internship influenced your future career plans, and do you see a potential future at PGC Visayas?", "multiline": true},
    {"type": "rating", "id": "ie6", "question": "Overall, how would you rate your internship experience? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "rating", "id": "ie7", "question": "How likely are you to recommend an internship at PGC Visayas to underclassmen? (Rate on a scale of 1–5)", "scale": 5},
    {"type": "text", "id": "ie8", "question": "Do you have any additional comments or suggestions?", "multiline": true}
  ]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.assessment WHERE program_id = internship_program_id AND type = 'evaluation');

END $$;
