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

const OTHER = "Other (please specify)";

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

const POST_CONFIDENCE_ITEMS = [
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

// The post-test's knowledge check. The pre-test has no knowledge items.
function knowledgeQuestions(): McqQuestion[] {
  return KNOWLEDGE_ITEMS.map((item, index) => ({
    ...item,
    id: `intro_post_k${index + 1}`,
    ...(index === 0
      ? {
          section: "Knowledge check",
          sectionIntro: `${KNOWLEDGE_INTRO} ${SUGGESTED_TIME}`,
        }
      : {}),
  }));
}

function confidenceQuestions(
  idPrefix: "intro_pre" | "intro_post",
  items: readonly string[],
  section: string,
  sectionIntro: string,
): RatingQuestion[] {
  return items.map((question, index) => ({
    type: "rating" as const,
    id: `${idPrefix}_conf${index + 1}`,
    question,
    scale: 5,
    ...(index === 0 ? { section, sectionIntro } : {}),
  }));
}

// Pre-test: a survey of background, experience, and confidence. It has no
// knowledge-check items, so it is not scored.

const PRE_INTRO =
  "This pretest is not graded, and there are no right or wrong answers. It tells us who you are, what you have already worked with, and how confident you feel about each training topic, so we can adjust the sessions. Please answer honestly. Suggested time: about 10 minutes.";

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
      OTHER,
    ],
    otherOption: OTHER,
    section: "Getting to know you",
    sectionIntro: PRE_INTRO,
  },
  {
    type: "choice",
    id: "intro_pre_field",
    question: "Which field best describes your main area of work or study?",
    options: [
      "Molecular biology or genetics",
      "Microbiology",
      "Ecology, biodiversity, or environmental science",
      "Health, medical, or public-health sciences",
      "Agriculture, fisheries, or food science",
      "Computer science, IT, or statistics",
      OTHER,
    ],
    otherOption: OTHER,
  },
  {
    type: "choice",
    id: "intro_pre_prior_training",
    question:
      "What bioinformatics training have you had before this one? Select the most extensive one.",
    options: [
      "None. This is my first.",
      "A lecture or seminar",
      "A short hands-on workshop",
      "A full course (for example, a semester-long subject)",
      "Training on the job or in a research lab",
    ],
  },
  {
    type: "choice",
    id: "intro_pre_has_data",
    question: "Do you have sequence data that you want to analyze?",
    options: [
      "Yes, I have data now",
      "Not yet, but I expect to within the next year",
      "No",
      "Not sure",
    ],
  },
  {
    type: "choice",
    id: "intro_pre_plans",
    question:
      "How do you plan to use what you learn in this training? Select all that apply.",
    options: [
      "For my thesis or dissertation",
      "For my own research project",
      "For teaching",
      "For laboratory or institutional work",
      "To analyze data I already have",
      "General interest",
      OTHER,
    ],
    multiple: true,
    otherOption: OTHER,
  },
];

const EXPERIENCE_LEVELS = [
  "None. This is new to me.",
  "I have heard about it",
  "I have read about it or attended a lecture on it",
  "I have done it with guidance (for example, in a class or workshop)",
  "I do it independently in my work or studies",
] as const;

const EXPERIENCE_TOPICS = [
  "Molecular biology techniques for DNA sequencing (for example, DNA extraction, PCR, and sequencing)",
  "Bioinformatics concepts and applications in life science research",
  "Biological data and databases (for example, NCBI GenBank)",
  "DNA barcoding, including primer design",
  "Sequence quality assessment",
  "Sequence similarity search using BLAST",
  "Sequence alignment and phylogenetic tree construction",
  "The Linux command line",
  "Running bioinformatics pipelines or scripts in the terminal",
  "R and RStudio for data analysis and visualization",
  "Designing a bioinformatics workflow",
] as const;

const PRE_EXPERIENCE: ChoiceQuestion[] = [
  ...EXPERIENCE_TOPICS.map((topic, index) => ({
    type: "choice" as const,
    id: `intro_pre_exp${index + 1}`,
    question: topic,
    options: [...EXPERIENCE_LEVELS],
    ...(index === 0
      ? {
          section: "Your experience with the training topics",
          sectionIntro:
            "How much experience do you have with each topic below? Choose the one option that fits best.",
        }
      : {}),
  })),
  {
    type: "choice",
    id: "intro_pre_tools",
    question:
      "Which of these tools or programming languages have you used before? Select all that apply.",
    options: [
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
      OTHER,
    ],
    multiple: true,
    otherOption: OTHER,
  },
];

const PRE_CONFIDENCE_ITEMS = [
  "I can explain the basic molecular biology techniques used to generate DNA sequence data.",
  "I can explain what bioinformatics is and how it is applied in biological and life science research.",
  "I can identify common types of biological data (DNA, RNA, and protein sequences) and retrieve sequences from biological databases.",
  "I can explain the steps of DNA barcoding, including primer design.",
  "I can assess the quality of DNA sequence data.",
  "I can run a BLAST search and interpret the results.",
  "I can align sequences and construct a phylogenetic tree.",
  "I can navigate and run basic commands in the Linux command line.",
  "I can run simple scripts to automate bioinformatics tasks.",
  "I can use R and RStudio to import, manipulate, analyze, and visualize data.",
  "I can design a basic bioinformatics workflow, from raw data to interpreted results.",
] as const;

const PRE_OPEN: TextQuestion[] = [
  {
    type: "text",
    id: "intro_pre_open",
    question:
      "In one sentence, what is your biggest question about bioinformatics?",
    multiline: true,
    section: "Starting point",
  },
  {
    type: "text",
    id: "intro_pre_focus",
    question:
      "Is there a specific organism, gene, or type of data you hope to work with? (Optional)",
  },
];

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
  ...PRE_EXPERIENCE,
  ...confidenceQuestions(
    "intro_pre",
    PRE_CONFIDENCE_ITEMS,
    "Current confidence",
    `Rate your confidence before the training using this scale: ${CONFIDENCE_SCALE}`,
  ),
  ...PRE_OPEN,
];

export const INTRO_BIOINFORMATICS_POST_QUESTIONS: Question[] = [
  ...knowledgeQuestions(),
  ...confidenceQuestions(
    "intro_post",
    POST_CONFIDENCE_ITEMS,
    "Confidence after training",
    `Rate your confidence after training using this scale: ${CONFIDENCE_SCALE}`,
  ),
  ...POST_REFLECTION,
];

export const INTRO_BIOINFORMATICS_KNOWLEDGE_ANSWER_KEY = KNOWLEDGE_ITEMS.map(
  (item) => item.correct,
);
