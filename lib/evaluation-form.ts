import type {
  ChoiceQuestion,
  DateQuestion,
  EvaluationRatingValue,
  Question,
  RatingGroupQuestion,
  TextQuestion,
} from "@/types/database";

export const EVALUATION_FORM_TITLE = "Post-Activity Evaluation Form";

export const EVALUATION_FORM_INTRO =
  "Thank you for joining the activity! To help us improve future programs, we kindly ask you to complete this evaluation form. Your honest feedback is valuable and will guide us in enhancing the quality and relevance of our sessions.";

export const EVALUATION_RATINGS_INTRO =
  "Please fill out this evaluation form for today's session. Your feedback is important and will help us improve future activities. Indicate your rating by selecting the number that best represents your assessment. If the statement does not apply, select N/A.";

export const EVALUATION_DATA_PRIVACY =
  "All entries in this form are guaranteed to be used only for appropriate purposes.";

export const EVALUATION_RATING_SCALE: {
  value: EvaluationRatingValue;
  label: string;
}[] = [
  { value: 5, label: "Outstanding" },
  { value: 4, label: "Very Satisfactory" },
  { value: 3, label: "Satisfactory" },
  { value: 2, label: "Fair" },
  { value: 1, label: "Poor" },
  { value: "N/A", label: "Not applicable" },
];

const RATING_VALUES = new Set<EvaluationRatingValue>(
  EVALUATION_RATING_SCALE.map((option) => option.value),
);

type EvaluationQuestion = Question & {
  required?: boolean;
  section?: string;
  sectionIntro?: string;
};

export type PostActivityQuestion = (
  | TextQuestion
  | DateQuestion
  | ChoiceQuestion
  | RatingGroupQuestion
) & {
  required?: boolean;
  section?: string;
  sectionIntro?: string;
};

export type EvaluationAnswerValue =
  | string
  | number
  | Record<string, string | number>;

export type EvaluationAnswers = Record<string, EvaluationAnswerValue>;

export const POST_ACTIVITY_EVALUATION_QUESTIONS: PostActivityQuestion[] = [
  {
    type: "text",
    id: "eval_full_name",
    question: "Full Name",
    required: true,
    section: "Participant and activity details",
  },
  {
    type: "text",
    id: "eval_email",
    question: "Email Address",
    required: true,
    input: "email",
  },
  {
    type: "text",
    id: "eval_activity_title",
    question: "Title of Activity",
    required: true,
  },
  {
    type: "date",
    id: "eval_start_date",
    question: "Start Date",
    required: true,
  },
  {
    type: "date",
    id: "eval_end_date",
    question: "End Date",
    required: true,
  },
  {
    type: "text",
    id: "eval_venue",
    question: "Venue",
    required: true,
  },
  {
    type: "text",
    id: "eval_designation",
    question: "Designation",
    required: false,
  },
  {
    type: "text",
    id: "eval_institution",
    question: "Institution",
    required: true,
  },
  {
    type: "choice",
    id: "eval_sex",
    question: "Sex (upon birth)",
    options: ["Male", "Female"],
    required: true,
  },
  {
    type: "rating_group",
    id: "eval_topics",
    question: "Topics / Content and Methods",
    required: true,
    allowNA: true,
    section: "Evaluation ratings",
    sectionIntro: EVALUATION_RATINGS_INTRO,
    statements: [
      { id: "eval_topics_usefulness", statement: "Usefulness and relevance" },
      {
        id: "eval_topics_objectives",
        statement: "Activity objectives were met",
      },
      {
        id: "eval_topics_pacing",
        statement:
          "Course length, pacing, and time for questions were appropriate",
      },
      {
        id: "eval_topics_exercises",
        statement:
          "Suitability and helpfulness of activities/exercises (if applicable)",
      },
    ],
  },
  {
    type: "rating_group",
    id: "eval_speaker",
    question: "Resource Speaker/s",
    required: true,
    allowNA: true,
    statements: [
      {
        id: "eval_speaker_knowledge",
        statement:
          "Knowledgeable, effective, engaging, and able to answer questions",
      },
      {
        id: "eval_speaker_preparedness",
        statement: "Preparedness and punctuality",
      },
    ],
  },
  {
    type: "rating_group",
    id: "eval_materials",
    question: "Materials, Handouts, and Instructional Aids",
    required: true,
    allowNA: true,
    statements: [
      {
        id: "eval_materials_presentation",
        statement:
          "Presentation materials (slides, videos, etc.) were clear and organized",
      },
      {
        id: "eval_materials_handouts",
        statement: "Handouts were useful, appropriate, and easy to understand",
      },
      {
        id: "eval_materials_exercises",
        statement:
          "Materials for activities/exercises were provided (if applicable)",
      },
    ],
  },
  {
    type: "rating_group",
    id: "eval_organizers",
    question: "Activity Organizers / Facilitators / Secretariat",
    required: true,
    allowNA: true,
    statements: [
      {
        id: "eval_organizers_helpfulness",
        statement: "Helpfulness, courtesy, and availability",
      },
    ],
  },
  {
    type: "rating_group",
    id: "eval_venue_facilities",
    question: "Venue and Facilities (If Applicable)",
    required: true,
    allowNA: true,
    statements: [
      {
        id: "eval_venue_space",
        statement: "Spaciousness, lighting, sound system, cleanliness",
      },
      {
        id: "eval_venue_safety",
        statement: "Observance of health and safety protocols",
      },
    ],
  },
  {
    type: "rating_group",
    id: "eval_food",
    question: "Food (If Applicable)",
    required: true,
    allowNA: true,
    statements: [
      { id: "eval_food_taste", statement: "Taste and serving portions" },
    ],
  },
  {
    type: "rating_group",
    id: "eval_overall",
    question: "Overall Activity Evaluation",
    required: true,
    allowNA: true,
    statements: [
      { id: "eval_overall_quality", statement: "Quality & Relevance" },
    ],
  },
  {
    type: "choice",
    id: "eval_attendance_reason",
    question: "Why did you attend this activity?",
    options: ["Required", "Voluntary/Interested in the Topic", "Invited"],
    required: true,
    section: "Attendance and comments",
  },
  {
    type: "text",
    id: "eval_suggestions",
    question: "What suggestions would you like to recommend for future activities?",
    required: false,
    multiline: true,
    placeholder: "Type your suggestions here...",
  },
  {
    type: "text",
    id: "eval_comments",
    question: "Overall comments on the activity:",
    required: false,
    multiline: true,
    placeholder: "Type your comments here...",
  },
];

const POST_ACTIVITY_QUESTION_ID = "eval_full_name";

export function isPostActivityEvaluation(
  questions: Question[] | null | undefined,
): boolean {
  return Boolean(
    questions?.some((question) => question.id === POST_ACTIVITY_QUESTION_ID),
  );
}

export function isEvaluationQuestionRequired(question: Question): boolean {
  if ("required" in question && typeof question.required === "boolean") {
    return question.required;
  }
  return false;
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function isEvaluationRatingValue(
  value: unknown,
): value is EvaluationRatingValue {
  if (value === "N/A") return true;
  if (typeof value === "number") {
    return RATING_VALUES.has(value as EvaluationRatingValue);
  }
  if (typeof value === "string" && value !== "") {
    const numeric = Number(value);
    return RATING_VALUES.has(numeric as EvaluationRatingValue);
  }
  return false;
}

function groupAnswers(
  value: EvaluationAnswerValue | undefined,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function missingRequiredAnswers(
  questions: Question[],
  answers: EvaluationAnswers,
): string[] {
  const missing: string[] = [];

  for (const question of questions) {
    if (!isEvaluationQuestionRequired(question)) continue;

    if (question.type === "rating_group") {
      const nested = groupAnswers(answers[question.id]);
      for (const statement of question.statements) {
        if (!isEvaluationRatingValue(nested[statement.id])) {
          missing.push(statement.id);
        }
      }
      continue;
    }

    if (question.type === "rating") {
      if (!isEvaluationRatingValue(answers[question.id])) {
        missing.push(question.id);
      }
      continue;
    }

    if (question.type === "choice") {
      const value = answers[question.id];
      if (typeof value !== "string" || !question.options.includes(value)) {
        missing.push(question.id);
      }
      continue;
    }

    if (isBlank(answers[question.id])) {
      missing.push(question.id);
    }
  }

  return missing;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function prefillEvaluationAnswers(input: {
  name?: string | null;
  email?: string | null;
  activityTitle?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  venue?: string | null;
  institution?: string | null;
  designation?: string | null;
}): EvaluationAnswers {
  const answers: EvaluationAnswers = {};
  if (input.name?.trim()) answers.eval_full_name = input.name.trim();
  if (input.email?.trim()) answers.eval_email = input.email.trim();
  if (input.activityTitle?.trim()) {
    answers.eval_activity_title = input.activityTitle.trim();
  }
  const startDate = toDateInputValue(input.startDate);
  if (startDate) answers.eval_start_date = startDate;
  const endDate = toDateInputValue(input.endDate);
  if (endDate) answers.eval_end_date = endDate;
  if (input.venue?.trim()) answers.eval_venue = input.venue.trim();
  if (input.institution?.trim()) {
    answers.eval_institution = input.institution.trim();
  }
  if (input.designation?.trim()) {
    answers.eval_designation = input.designation.trim();
  }
  return answers;
}

export function asStoredEvaluationQuestions(
  questions: PostActivityQuestion[] = POST_ACTIVITY_EVALUATION_QUESTIONS,
): Question[] {
  return questions as EvaluationQuestion[];
}
