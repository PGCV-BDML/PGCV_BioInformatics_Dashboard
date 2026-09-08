-- Replace Introduction to Bioinformatics pre/post tests with the
-- Linux command-line instrument. Skips participant code (pairing uses the
-- signed-in account). Idempotent: updates existing rows and inserts
-- if the program exists without assessments. Prefers a program titled
-- "Introduction to Bioinformatics", then "Bioinformatics Training".
-- Creates "Introduction to Bioinformatics" if neither exists.

DO $body$
DECLARE
  target_program_id uuid;
  staff_id uuid;
  any_user_id uuid;
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
      "Other"
    ],
    "section": "Getting to know you",
    "sectionIntro": "Suggested time: 10 minutes."
  },
  {
    "type": "choice",
    "id": "intro_pre_exposure",
    "question": "Before this training, how much experience had you had with the Linux terminal or command line?",
    "options": [
      "None - I am new to the command line",
      "I have seen someone use it or heard about it",
      "I have read about it or attended a lecture",
      "I have completed guided command-line exercises",
      "I regularly use the command line independently"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_frequency",
    "question": "How often did you use a terminal or command-line interface before this training?",
    "options": [
      "Never",
      "Less than once a month",
      "One to three times a month",
      "One or more times a week",
      "Almost every day"
    ]
  },
  {
    "type": "choice",
    "id": "intro_pre_skills",
    "question": "Which command-line skills have you used before? Select all that apply.",
    "options": [
      "Navigating directories with `pwd`, `ls`, or `cd`",
      "Creating, copying, moving, or deleting files and directories",
      "Viewing or editing text files",
      "Searching or processing text with commands such as `grep`, `sort`, or `wc`",
      "Combining commands with pipes or redirection",
      "Viewing or changing file permissions",
      "None of these"
    ],
    "multiple": true
  },
  {
    "type": "choice",
    "id": "intro_pre_priority",
    "question": "Which skill would you most like to develop during this training? Select one.",
    "options": [
      "Understanding the terminal and command structure",
      "Navigating the Linux file system",
      "Creating and managing files and directories",
      "Viewing, editing, and searching text files",
      "Combining commands with pipes and redirection",
      "Understanding wildcards and file permissions"
    ]
  },
  {
    "type": "rating",
    "id": "intro_pre_conf1",
    "question": "I can explain what a terminal is and identify the command, options, and arguments in a command.",
    "scale": 5,
    "section": "Current confidence",
    "sectionIntro": "Rate your confidence before training using this scale: 1 = Not at all confident; 2 = Slightly confident; 3 = Moderately confident; 4 = Very confident; 5 = Extremely confident"
  },
  {
    "type": "rating",
    "id": "intro_pre_conf2",
    "question": "I can navigate the Linux file system using paths and basic commands.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf3",
    "question": "I can create, copy, move, rename, and safely delete files and directories.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf4",
    "question": "I can view, edit, search, sort, and count information in text files.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_pre_conf5",
    "question": "I can use pipes, redirection, wildcards, and file permissions in command-line tasks.",
    "scale": 5
  },
  {
    "type": "mcq",
    "question": "Why is the command line especially useful for data analysis and bioinformatics?",
    "options": [
      "It only works with small files that can be opened manually",
      "It makes every task graphical and mouse-driven",
      "It supports fast, reproducible, and scalable workflows",
      "It automatically corrects every command before running it",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_pre_k1",
    "section": "Knowledge check",
    "sectionIntro": "Choose the one best answer. Select \"I don't know yet\" instead of guessing if you are unsure."
  },
  {
    "type": "mcq",
    "question": "In the command `grep -i \"error\" results.txt`, what is `-i`?",
    "options": [
      "An option that makes the search case-insensitive",
      "The file that will be searched",
      "The terminal prompt",
      "A command that changes directories",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_pre_k2"
  },
  {
    "type": "mcq",
    "question": "Which command displays the full path of the current working directory?",
    "options": [
      "`ls`",
      "`pwd`",
      "`cd`",
      "`tree`",
      "I don't know yet"
    ],
    "correct": 1,
    "id": "intro_pre_k3"
  },
  {
    "type": "mcq",
    "question": "If you are in `/home/trainee/Documents` and run `cd ..`, where will you be?",
    "options": [
      "`/home`",
      "`/home/trainee/Documents/..`",
      "`/`",
      "`/home/trainee`",
      "I don't know yet"
    ],
    "correct": 3,
    "id": "intro_pre_k4"
  },
  {
    "type": "mcq",
    "question": "Which command renames `old.txt` to `new.txt`?",
    "options": [
      "`cp old.txt new.txt`",
      "`touch new.txt old.txt`",
      "`mv old.txt new.txt`",
      "`mkdir old.txt new.txt`",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_pre_k5"
  },
  {
    "type": "mcq",
    "question": "Which command shows the first five lines of `sample.txt`?",
    "options": [
      "`head -n 5 sample.txt`",
      "`tail -n 5 sample.txt`",
      "`wc -l sample.txt`",
      "`grep -n 5 sample.txt`",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_pre_k6"
  },
  {
    "type": "mcq",
    "question": "What does the pipe symbol (`|`) do in a command line?",
    "options": [
      "Saves output directly to a new file",
      "Sends the output of one command to the input of another command",
      "Runs the command with administrator permission",
      "Deletes duplicate lines automatically",
      "I don't know yet"
    ],
    "correct": 1,
    "id": "intro_pre_k7"
  },
  {
    "type": "mcq",
    "question": "Which command counts the lines containing `PASS` in `results.txt`?",
    "options": [
      "`wc \"PASS\" results.txt`",
      "`grep \"PASS\" > results.txt`",
      "`sort results.txt | PASS`",
      "`grep \"PASS\" results.txt | wc -l`",
      "I don't know yet"
    ],
    "correct": 3,
    "id": "intro_pre_k8"
  },
  {
    "type": "mcq",
    "question": "What is the difference between `>` and `>>` when redirecting command output?",
    "options": [
      "`>` overwrites the destination file, while `>>` appends to it",
      "`>` searches a file, while `>>` sorts it",
      "`>` copies a file, while `>>` moves it",
      "There is no difference between them",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_pre_k9"
  },
  {
    "type": "mcq",
    "question": "What does `chmod +x script.sh` do?",
    "options": [
      "Deletes `script.sh` after it runs",
      "Displays the contents of `script.sh`",
      "Makes `script.sh` executable",
      "Copies `script.sh` to the home directory",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_pre_k10"
  },
  {
    "type": "text",
    "id": "intro_pre_open",
    "question": "In one sentence, what is your biggest question about using the Linux command line?",
    "multiline": true,
    "section": "Starting point"
  }
]
$pre$::jsonb;
  post_form jsonb := $post$
[
  {
    "type": "mcq",
    "question": "Why is the command line especially useful for data analysis and bioinformatics?",
    "options": [
      "It only works with small files that can be opened manually",
      "It makes every task graphical and mouse-driven",
      "It supports fast, reproducible, and scalable workflows",
      "It automatically corrects every command before running it",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_post_k1",
    "section": "Knowledge check",
    "sectionIntro": "Choose the one best answer. Select \"I don't know yet\" instead of guessing if you are unsure. Suggested time: 10 minutes."
  },
  {
    "type": "mcq",
    "question": "In the command `grep -i \"error\" results.txt`, what is `-i`?",
    "options": [
      "An option that makes the search case-insensitive",
      "The file that will be searched",
      "The terminal prompt",
      "A command that changes directories",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_post_k2"
  },
  {
    "type": "mcq",
    "question": "Which command displays the full path of the current working directory?",
    "options": [
      "`ls`",
      "`pwd`",
      "`cd`",
      "`tree`",
      "I don't know yet"
    ],
    "correct": 1,
    "id": "intro_post_k3"
  },
  {
    "type": "mcq",
    "question": "If you are in `/home/trainee/Documents` and run `cd ..`, where will you be?",
    "options": [
      "`/home`",
      "`/home/trainee/Documents/..`",
      "`/`",
      "`/home/trainee`",
      "I don't know yet"
    ],
    "correct": 3,
    "id": "intro_post_k4"
  },
  {
    "type": "mcq",
    "question": "Which command renames `old.txt` to `new.txt`?",
    "options": [
      "`cp old.txt new.txt`",
      "`touch new.txt old.txt`",
      "`mv old.txt new.txt`",
      "`mkdir old.txt new.txt`",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_post_k5"
  },
  {
    "type": "mcq",
    "question": "Which command shows the first five lines of `sample.txt`?",
    "options": [
      "`head -n 5 sample.txt`",
      "`tail -n 5 sample.txt`",
      "`wc -l sample.txt`",
      "`grep -n 5 sample.txt`",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_post_k6"
  },
  {
    "type": "mcq",
    "question": "What does the pipe symbol (`|`) do in a command line?",
    "options": [
      "Saves output directly to a new file",
      "Sends the output of one command to the input of another command",
      "Runs the command with administrator permission",
      "Deletes duplicate lines automatically",
      "I don't know yet"
    ],
    "correct": 1,
    "id": "intro_post_k7"
  },
  {
    "type": "mcq",
    "question": "Which command counts the lines containing `PASS` in `results.txt`?",
    "options": [
      "`wc \"PASS\" results.txt`",
      "`grep \"PASS\" > results.txt`",
      "`sort results.txt | PASS`",
      "`grep \"PASS\" results.txt | wc -l`",
      "I don't know yet"
    ],
    "correct": 3,
    "id": "intro_post_k8"
  },
  {
    "type": "mcq",
    "question": "What is the difference between `>` and `>>` when redirecting command output?",
    "options": [
      "`>` overwrites the destination file, while `>>` appends to it",
      "`>` searches a file, while `>>` sorts it",
      "`>` copies a file, while `>>` moves it",
      "There is no difference between them",
      "I don't know yet"
    ],
    "correct": 0,
    "id": "intro_post_k9"
  },
  {
    "type": "mcq",
    "question": "What does `chmod +x script.sh` do?",
    "options": [
      "Deletes `script.sh` after it runs",
      "Displays the contents of `script.sh`",
      "Makes `script.sh` executable",
      "Copies `script.sh` to the home directory",
      "I don't know yet"
    ],
    "correct": 2,
    "id": "intro_post_k10"
  },
  {
    "type": "rating",
    "id": "intro_post_conf1",
    "question": "I can explain what a terminal is and identify the command, options, and arguments in a command.",
    "scale": 5,
    "section": "Confidence after training",
    "sectionIntro": "Rate your confidence after training using this scale: 1 = Not at all confident; 2 = Slightly confident; 3 = Moderately confident; 4 = Very confident; 5 = Extremely confident"
  },
  {
    "type": "rating",
    "id": "intro_post_conf2",
    "question": "I can navigate the Linux file system using paths and basic commands.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_post_conf3",
    "question": "I can create, copy, move, rename, and safely delete files and directories.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_post_conf4",
    "question": "I can view, edit, search, sort, and count information in text files.",
    "scale": 5
  },
  {
    "type": "rating",
    "id": "intro_post_conf5",
    "question": "I can use pipes, redirection, wildcards, and file permissions in command-line tasks.",
    "scale": 5
  },
  {
    "type": "choice",
    "id": "intro_post_clearest",
    "question": "Which part of the training is now clearest to you?",
    "options": [
      "Terminal concepts and command structure",
      "File-system navigation and paths",
      "Creating and managing files and directories",
      "Viewing and editing text files",
      "Searching and processing text",
      "Pipes, redirection, wildcards, and permissions"
    ],
    "section": "Brief reflection"
  },
  {
    "type": "choice",
    "id": "intro_post_support",
    "question": "Which part do you still need the most support with?",
    "options": [
      "Terminal concepts and command structure",
      "File-system navigation and paths",
      "Creating and managing files and directories",
      "Viewing and editing text files",
      "Searching and processing text",
      "Pipes, redirection, wildcards, and permissions",
      "None at this time"
    ]
  },
  {
    "type": "text",
    "id": "intro_post_ready",
    "question": "What is one command-line task you now feel ready to do?",
    "multiline": true
  }
]
$post$::jsonb;
BEGIN
  SELECT id INTO target_program_id
  FROM public.training_program
  WHERE type = 'training'
    AND title ILIKE '%Introduction to Bioinformatics%'
  ORDER BY
    CASE
      WHEN title ILIKE 'Introduction to Bioinformatics' THEN 0
      ELSE 1
    END,
    created_at DESC
  LIMIT 1;

  IF target_program_id IS NULL THEN
    SELECT id INTO target_program_id
    FROM public.training_program
    WHERE type = 'training'
      AND title ILIKE 'Bioinformatics Training'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF target_program_id IS NULL THEN
    SELECT id INTO staff_id
    FROM public.users
    WHERE role IN ('team_lead', 'team_member')
    ORDER BY created_at
    LIMIT 1;

    SELECT id INTO any_user_id FROM public.users ORDER BY created_at LIMIT 1;
    staff_id := COALESCE(staff_id, any_user_id);

    IF staff_id IS NULL THEN
      RAISE NOTICE 'Introduction to Bioinformatics assessments: no users found; skipping.';
      RETURN;
    END IF;

    INSERT INTO public.training_program (
      title,
      type,
      start_date,
      end_date,
      instructor_id,
      description,
      status
    )
    VALUES (
      'Introduction to Bioinformatics',
      'training',
      NULL,
      NULL,
      staff_id,
      'Introductory Linux command-line training for bioinformatics workflows.',
      'draft'
    )
    RETURNING id INTO target_program_id;
  END IF;

  UPDATE public.assessment
  SET questions = pre_form
  WHERE program_id = target_program_id AND type = 'pre_test';

  UPDATE public.assessment
  SET questions = post_form
  WHERE program_id = target_program_id AND type = 'post_test';

  INSERT INTO public.assessment (program_id, type, questions)
  SELECT target_program_id, 'pre_test', pre_form
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment a
    WHERE a.program_id = target_program_id AND a.type = 'pre_test'
  );

  INSERT INTO public.assessment (program_id, type, questions)
  SELECT target_program_id, 'post_test', post_form
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment a
    WHERE a.program_id = target_program_id AND a.type = 'post_test'
  );

  RAISE NOTICE 'Introduction to Bioinformatics assessments replaced for program %', target_program_id;
END $body$;
