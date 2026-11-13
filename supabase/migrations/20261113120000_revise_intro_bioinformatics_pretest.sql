-- Revise the Introduction to Bioinformatics pre-test (November 2026 run)
-- into an ungraded survey of background, topic experience, and confidence.
-- Canonical copy: lib/intro-bioinformatics-assessments.ts
--
-- Only the pre-test changes; the post-test is left as it is. The new
-- pre-test has no knowledge-check items, so submissions are saved with no
-- score. Targets every program whose title starts with "Introduction to
-- Bioinformatics" (for example "Introduction to Bioinformatics: Basic
-- Concepts, Sequence Data Handling, and Analysis"). A pre-test that already
-- has submissions is skipped, so no one's answers lose their questions.
-- Safe to run more than once.

DO $body$
DECLARE
  pre_form jsonb := $pre$
[
  {
    "type": "choice",
    "id": "intro_pre_role",
    "question": "Which best describes your current role?",
    "options": [
      "Undergraduate student",
      "Graduate student",
      "Faculty member or instructor",
      "Researcher or laboratory staff",
      "Healthcare or public-health professional",
      "Other (please specify)"
    ],
    "otherOption": "Other (please specify)",
    "section": "Getting to know you",
    "sectionIntro": "This pretest is not graded, and there are no right or wrong answers. It tells us who you are, what you have already worked with, and how confident you feel about each training topic, so we can adjust the sessions. Please answer honestly. Suggested time: about 10 minutes."
  },
  {
    "type": "choice",
    "id": "intro_pre_field",
    "question": "Which field best describes your main area of work or study?",
    "options": [
      "Molecular biology or genetics",
      "Microbiology",
      "Ecology, biodiversity, or environmental science",
      "Health, medical, or public-health sciences",
      "Agriculture, fisheries, or food science",
      "Computer science, IT, or statistics",
      "Other (please specify)"
    ],
    "otherOption": "Other (please specify)"
  },
  {
    "type": "choice",
    "id": "intro_pre_prior_training",
    "question": "What bioinformatics training have you had before this one? Select the most extensive one.",
    "options": [
      "None. This is my first.",
      "A lecture or seminar",
      "A short hands-on workshop",
      "A full course (for example, a semester-long subject)",
      "Training on the job or in a research lab"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_has_data",
    "question": "Do you have sequence data that you want to analyze?",
    "options": [
      "Yes, I have data now",
      "Not yet, but I expect to within the next year",
      "No",
      "Not sure"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_plans",
    "question": "How do you plan to use what you learn in this training? Select all that apply.",
    "options": [
      "For my thesis or dissertation",
      "For my own research project",
      "For teaching",
      "For laboratory or institutional work",
      "To analyze data I already have",
      "General interest",
      "Other (please specify)"
    ],
    "multiple": true,
    "otherOption": "Other (please specify)"
  },
  {
    "type": "choice",
    "id": "intro_pre_exp1",
    "question": "Molecular biology techniques for DNA sequencing (for example, DNA extraction, PCR, and sequencing)",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ],
    "section": "Your experience with the training topics",
    "sectionIntro": "How much experience do you have with each topic below? Choose the one option that fits best."
  },
  {
    "type": "choice",
    "id": "intro_pre_exp2",
    "question": "Bioinformatics concepts and applications in life science research",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp3",
    "question": "Biological data and databases (for example, NCBI GenBank)",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp4",
    "question": "DNA barcoding, including primer design",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp5",
    "question": "Sequence quality assessment",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp6",
    "question": "Sequence similarity search using BLAST",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp7",
    "question": "Sequence alignment and phylogenetic tree construction",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp8",
    "question": "The Linux command line",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp9",
    "question": "Running bioinformatics pipelines or scripts in the terminal",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp10",
    "question": "R and RStudio for data analysis and visualization",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_exp11",
    "question": "Designing a bioinformatics workflow",
    "options": [
      "None. This is new to me.",
      "I have heard about it",
      "I have read about it or attended a lecture on it",
      "I have done it with guidance (for example, in a class or workshop)",
      "I do it independently in my work or studies"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_tools",
    "question": "Which of these tools or programming languages have you used before? Select all that apply.",
    "options": [
      "NCBI databases (for example, GenBank)",
      "BLAST",
      "BOLD Systems",
      "Clustal Omega or another sequence alignment tool",
      "MEGA or another phylogenetics program",
      "Genome browsers or genome databases",
      "Protein structure tools (for example, AlphaFold)",
      "Other specialized tools (for example, TargetScan or promoter analysis software)",
      "Linux or Mac terminal",
      "R or RStudio",
      "Python",
      "None of these",
      "Other (please specify)"
    ],
    "multiple": true,
    "otherOption": "Other (please specify)"
  },
  {
    "type": "rating",
    "id": "intro_pre_conf1",
    "question": "I can explain the basic molecular biology techniques used to generate DNA sequence data.",
    "scale": 5,
    "section": "Current confidence",
    "sectionIntro": "Rate your confidence before the training using this scale: 1 = Not at all confident; 2 = Slightly confident; 3 = Moderately confident; 4 = Very confident; 5 = Extremely confident"
  },
  {
    "type": "rating",
    "id": "intro_pre_conf2",
    "question": "I can explain what bioinformatics is and how it is applied in biological and life science research.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf3",
    "question": "I can identify common types of biological data (DNA, RNA, and protein sequences) and retrieve sequences from biological databases.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf4",
    "question": "I can explain the steps of DNA barcoding, including primer design.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf5",
    "question": "I can assess the quality of DNA sequence data.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf6",
    "question": "I can run a BLAST search and interpret the results.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf7",
    "question": "I can align sequences and construct a phylogenetic tree.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf8",
    "question": "I can navigate and run basic commands in the Linux command line.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf9",
    "question": "I can run simple scripts to automate bioinformatics tasks.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf10",
    "question": "I can use R and RStudio to import, manipulate, analyze, and visualize data.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf11",
    "question": "I can design a basic bioinformatics workflow, from raw data to interpreted results.",
    "scale": 5
  },
  {
    "type": "text",
    "id": "intro_pre_open",
    "question": "In one sentence, what is your biggest question about bioinformatics?",
    "multiline": true,
    "section": "Starting point"
  },
  {
    "type": "text",
    "id": "intro_pre_focus",
    "question": "Is there a specific organism, gene, or type of data you hope to work with? (Optional)"
  }
]
$pre$;
  target record;
BEGIN
  FOR target IN
    SELECT a.id, p.title,
      EXISTS (
        SELECT 1 FROM public.assessment_response r WHERE r.assessment_id = a.id
      ) AS has_responses
    FROM public.assessment a
    JOIN public.training_program p ON p.id = a.program_id
    WHERE a.type = 'pre_test'
      AND p.title ILIKE 'Introduction to Bioinformatics%'
  LOOP
    IF target.has_responses THEN
      RAISE NOTICE 'Skipped pre-test for "%": it already has submissions.', target.title;
    ELSE
      UPDATE public.assessment SET questions = pre_form WHERE id = target.id;
      RAISE NOTICE 'Revised pre-test for "%".', target.title;
    END IF;
  END LOOP;
END $body$;
