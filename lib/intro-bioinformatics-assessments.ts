import type {
  ChoiceQuestion,
  McqQuestion,
  Question,
  RatingQuestion,
  TextQuestion,
} from "@/types/database";

const DONT_KNOW = "I don't know yet";

const KNOWLEDGE_INTRO =
  'Choose the one best answer. Select "I don\'t know yet" instead of guessing if you are unsure.';

const CONFIDENCE_SCALE =
  "1 = Not at all confident; 2 = Slightly confident; 3 = Moderately confident; 4 = Very confident; 5 = Extremely confident";

const SUGGESTED_TIME = "Suggested time: 10 minutes.";

const KNOWLEDGE_ITEMS: Omit<McqQuestion, "id">[] = [
  {
    type: "mcq",
    question:
      "Why is the command line especially useful for data analysis and bioinformatics?",
    options: [
      "It only works with small files that can be opened manually",
      "It makes every task graphical and mouse-driven",
      "It supports fast, reproducible, and scalable workflows",
      "It automatically corrects every command before running it",
      DONT_KNOW,
    ],
    correct: 2,
  },
  {
    type: "mcq",
    question: 'In the command `grep -i "error" results.txt`, what is `-i`?',
    options: [
      "An option that makes the search case-insensitive",
      "The file that will be searched",
      "The terminal prompt",
      "A command that changes directories",
      DONT_KNOW,
    ],
    correct: 0,
  },
  {
    type: "mcq",
    question: "Which command displays the full path of the current working directory?",
    options: ["`ls`", "`pwd`", "`cd`", "`tree`", DONT_KNOW],
    correct: 1,
  },
  {
    type: "mcq",
    question:
      "If you are in `/home/trainee/Documents` and run `cd ..`, where will you be?",
    options: [
      "`/home`",
      "`/home/trainee/Documents/..`",
      "`/`",
      "`/home/trainee`",
      DONT_KNOW,
    ],
    correct: 3,
  },
  {
    type: "mcq",
    question: "Which command renames `old.txt` to `new.txt`?",
    options: [
      "`cp old.txt new.txt`",
      "`touch new.txt old.txt`",
      "`mv old.txt new.txt`",
      "`mkdir old.txt new.txt`",
      DONT_KNOW,
    ],
    correct: 2,
  },
  {
    type: "mcq",
    question: "Which command shows the first five lines of `sample.txt`?",
    options: [
      "`head -n 5 sample.txt`",
      "`tail -n 5 sample.txt`",
      "`wc -l sample.txt`",
      "`grep -n 5 sample.txt`",
      DONT_KNOW,
    ],
    correct: 0,
  },
  {
    type: "mcq",
    question: "What does the pipe symbol (`|`) do in a command line?",
    options: [
      "Saves output directly to a new file",
      "Sends the output of one command to the input of another command",
      "Runs the command with administrator permission",
      "Deletes duplicate lines automatically",
      DONT_KNOW,
    ],
    correct: 1,
  },
  {
    type: "mcq",
    question: "Which command counts the lines containing `PASS` in `results.txt`?",
    options: [
      '`wc "PASS" results.txt`',
      '`grep "PASS" > results.txt`',
      "`sort results.txt | PASS`",
      '`grep "PASS" results.txt | wc -l`',
      DONT_KNOW,
    ],
    correct: 3,
  },
  {
    type: "mcq",
    question:
      "What is the difference between `>` and `>>` when redirecting command output?",
    options: [
      "`>` overwrites the destination file, while `>>` appends to it",
      "`>` searches a file, while `>>` sorts it",
      "`>` copies a file, while `>>` moves it",
      "There is no difference between them",
      DONT_KNOW,
    ],
    correct: 0,
  },
  {
    type: "mcq",
    question: "What does `chmod +x script.sh` do?",
    options: [
      "Deletes `script.sh` after it runs",
      "Displays the contents of `script.sh`",
      "Makes `script.sh` executable",
      "Copies `script.sh` to the home directory",
      DONT_KNOW,
    ],
    correct: 2,
  },
];

const CONFIDENCE_ITEMS = [
  "I can explain what a terminal is and identify the command, options, and arguments in a command.",
  "I can navigate the Linux file system using paths and basic commands.",
  "I can create, copy, move, rename, and safely delete files and directories.",
  "I can view, edit, search, sort, and count information in text files.",
  "I can use pipes, redirection, wildcards, and file permissions in command-line tasks.",
] as const;

const TRAINING_AREAS = [
  "Terminal concepts and command structure",
  "File-system navigation and paths",
  "Creating and managing files and directories",
  "Viewing and editing text files",
  "Searching and processing text",
  "Pipes, redirection, wildcards, and permissions",
] as const;

function knowledgeQuestions(
  idPrefix: "intro_pre" | "intro_post",
  includeTime = false,
): McqQuestion[] {
  return KNOWLEDGE_ITEMS.map((item, index) => ({
    ...item,
    id: `${idPrefix}_k${index + 1}`,
    ...(index === 0
      ? {
          section: "Knowledge check",
          sectionIntro: includeTime
            ? `${KNOWLEDGE_INTRO} ${SUGGESTED_TIME}`
            : KNOWLEDGE_INTRO,
        }
      : {}),
  }));
}

function confidenceQuestions(
  idPrefix: "intro_pre" | "intro_post",
  section: string,
  sectionIntro: string,
): RatingQuestion[] {
  return CONFIDENCE_ITEMS.map((question, index) => ({
    type: "rating" as const,
    id: `${idPrefix}_conf${index + 1}`,
    question,
    scale: 5,
    ...(index === 0 ? { section, sectionIntro } : {}),
  }));
}

const PRE_BACKGROUND: ChoiceQuestion[] = [
  {
    type: "choice",
    id: "intro_pre_role",
    question: "Which best describes your current role?",
    options: [
      "Undergraduate student",
      "Graduate student",
      "Faculty member or instructor",
      "Researcher or laboratory staff",
      "Healthcare or public-health professional",
      "Other",
    ],
    section: "Getting to know you",
    sectionIntro: SUGGESTED_TIME,
  },
  {
    type: "choice",
    id: "intro_pre_exposure",
    question:
      "Before this training, how much experience had you had with the Linux terminal or command line?",
    options: [
      "None - I am new to the command line",
      "I have seen someone use it or heard about it",
      "I have read about it or attended a lecture",
      "I have completed guided command-line exercises",
      "I regularly use the command line independently",
    ],
  },
  {
    type: "choice",
    id: "intro_pre_frequency",
    question:
      "How often did you use a terminal or command-line interface before this training?",
    options: [
      "Never",
      "Less than once a month",
      "One to three times a month",
      "One or more times a week",
      "Almost every day",
    ],
  },
  {
    type: "choice",
    id: "intro_pre_skills",
    question: "Which command-line skills have you used before? Select all that apply.",
    options: [
      "Navigating directories with `pwd`, `ls`, or `cd`",
      "Creating, copying, moving, or deleting files and directories",
      "Viewing or editing text files",
      "Searching or processing text with commands such as `grep`, `sort`, or `wc`",
      "Combining commands with pipes or redirection",
      "Viewing or changing file permissions",
      "None of these",
    ],
    multiple: true,
  },
  {
    type: "choice",
    id: "intro_pre_priority",
    question:
      "Which skill would you most like to develop during this training? Select one.",
    options: [
      "Understanding the terminal and command structure",
      "Navigating the Linux file system",
      "Creating and managing files and directories",
      "Viewing, editing, and searching text files",
      "Combining commands with pipes and redirection",
      "Understanding wildcards and file permissions",
    ],
  },
];

const PRE_OPEN: TextQuestion = {
  type: "text",
  id: "intro_pre_open",
  question:
    "In one sentence, what is your biggest question about using the Linux command line?",
  multiline: true,
  section: "Starting point",
};

const POST_REFLECTION: Question[] = [
  {
    type: "choice",
    id: "intro_post_clearest",
    question: "Which part of the training is now clearest to you?",
    options: [...TRAINING_AREAS],
    section: "Brief reflection",
  },
  {
    type: "choice",
    id: "intro_post_support",
    question: "Which part do you still need the most support with?",
    options: [...TRAINING_AREAS, "None at this time"],
  },
  {
    type: "text",
    id: "intro_post_ready",
    question: "What is one command-line task you now feel ready to do?",
    multiline: true,
  },
];

export const INTRO_BIOINFORMATICS_PRE_QUESTIONS: Question[] = [
  ...PRE_BACKGROUND,
  ...confidenceQuestions(
    "intro_pre",
    "Current confidence",
    `Rate your confidence before training using this scale: ${CONFIDENCE_SCALE}`,
  ),
  ...knowledgeQuestions("intro_pre"),
  PRE_OPEN,
];

export const INTRO_BIOINFORMATICS_POST_QUESTIONS: Question[] = [
  ...knowledgeQuestions("intro_post", true),
  ...confidenceQuestions(
    "intro_post",
    "Confidence after training",
    `Rate your confidence after training using this scale: ${CONFIDENCE_SCALE}`,
  ),
  ...POST_REFLECTION,
];

export const INTRO_BIOINFORMATICS_KNOWLEDGE_ANSWER_KEY = KNOWLEDGE_ITEMS.map(
  (item) => item.correct,
);
