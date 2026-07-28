export interface UserOption {
  id: string;
  name: string;
}

export interface CollaborationRow {
  id: string; // UUID string from db
  partner_org: string;
  lead_user_id: string;
  start_date: string | null;
  status: "for_approval" | "ongoing" | "finished"; // Matches your database public.collab_status enum
  documents: string[] | null;
  notes: string | null;
  repository_link: string | null;
  created_at: string;
  updated_at: string;
  // Included via joins
  user?: {
    name: string;
  };
}

// Mirrors the DB row shape
export type Project = {
  id: string; // uuid
  name: string;
  client_id: string;
  service_id: string;
  status: ProjectStatus;
  lead_user_id: string;
  start_date: string;
  target_delivery_date: string;
  actual_delivery_date?: string | null;
  repository_link?: string | null;
  /** Sequencer run ID; links to Service Report Tracker `analysis.run_id`. */
  run_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectStatus =
  | "ongoing"
  | "for_approval"
  | "submitted"
  | "on_hold"
  | "completed";

export const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "ongoing", label: "On-going" },
  { value: "for_approval", label: "For approval" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

// Shape the form works with (no id — generated on submit)
export type ProjectFormData = Omit<
  Project,
  "id" | "created_at" | "updated_at" | "repository_link" | "run_id" | "target_delivery_date"
> & {
  repository_link: string; // always a string in the form, "" means empty
  run_id: string; // always a string in the form, "" means empty
  target_delivery_date: string; // same reasoning applies here (see below)
};

//For Tasks ===========================================================================
export type TaskStatus = "pending" | "in_progress" | "completed" | "on_hold";
export type TaskPriority = "low" | "medium" | "high";

export type TaskCategory =
  | "client_communication"
  | "code_workflow_optimization"
  | "sequence_analysis"
  | "tour"
  | "meeting"
  | "internship"
  | "collaboration"
  | "engagements"
  | "projects"
  | "professional_development"
  | "future_planning"
  | "skill_development";

export type Task = {
  id: string;
  title: string;
  assignee_id: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  linked_project_id: string | null;
  linked_analysis_id?: string | null;
  /** Client-enriched from task_tag; not a column on task. */
  categories?: TaskCategory[];
  updated_at?: string;
};

export type TaskTag = {
  task_id: string;
  category: TaskCategory;
  created_at?: string;
};

/** Persistable task fields (excludes client-only `categories`). */
export type TaskRecord = Omit<Task, "categories">;

// ============================================================
// Client Sequence Analysis types
// ============================================================

export type AnalysisStatus =
  | "on_hold"
  | "ongoing"
  | "submitted"
  | "for_approval"
  | "completed";

export const ANALYSIS_STATUS_OPTIONS: { value: AnalysisStatus; label: string }[] = [
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "on_hold", label: "On Hold" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
];

export interface Analysis {
  id: string;
  /** Optional link to an internal project; Tracker records may be unlinked. */
  project_id: string | null;
  pipeline: string | null;
  pipeline_version: string | null;
  /** Legacy single status; kept in sync from status_of_completion when possible. */
  status: AnalysisStatus;
  assignee_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  output_link: string | null;
  // Service Report Tracker fields (Excel parity)
  service_report_number: string | null;
  service_report_date: string | null;
  application: string | null;
  client_name: string | null;
  client_type: string | null;
  external_client_id: string | null;
  external_project_id: string | null;
  sample_type: string | null;
  run_id: string | null;
  status_of_analysis: string | null;
  status_of_completion: string | null;
  status_of_submission: string | null;
  service_report_link: string | null;
  client_sequences_link: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sample {
  id: string;
  project_id: string;
  identifier: string;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceReport {
  id: string;
  analysis_id: string;
  report_link: string | null;
  delivered_at: string | null;
  delivered_by: string;
  client_acknowledged_at: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// Training & Internship types
// ============================================================

export type TrainingType = "training" | "internship";

export type TrainingProgramStatus =
  | "draft"
  | "ongoing"
  | "completed"
  | "archived";

export const TRAINING_PROGRAM_STATUS_OPTIONS: {
  value: TrainingProgramStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "ongoing", label: "On-going" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export interface TrainingProgram {
  id: string;
  title: string;
  type: TrainingType | null;
  status: TrainingProgramStatus;
  start_date: string | null;
  end_date: string | null;
  instructor_id: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Form shape for add/edit program modal (dates always strings). */
export type TrainingProgramFormData = {
  title: string;
  description: string;
  instructor_id: string;
  start_date: string;
  end_date: string;
  status: TrainingProgramStatus;
};

export interface Module {
  id: string;
  program_id: string;
  title: string | null;
  html_content_link: string | null;
  order: number | null;
  save_log_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingDocument {
  id: string;
  program_id: string;
  title: string | null;
  link: string | null;
  is_required: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AssessmentType = "pre_test" | "post_test" | "evaluation";

export type McqQuestion = {
  type: "mcq";
  id: string;
  question: string;
  options: string[];
  correct: number; // index into options
};

export type RatingQuestion = {
  type: "rating";
  id: string;
  question: string;
  scale: number; // e.g. 5 for 1-5 scale
};

export type TextQuestion = {
  type: "text";
  id: string;
  question: string;
  multiline?: boolean;
};

export type Question = McqQuestion | RatingQuestion | TextQuestion;

export interface Assessment {
  id: string;
  program_id: string;
  type: AssessmentType;
  questions: Question[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  participant_id: string;
  answers: Record<string, unknown> | null;
  score: number | null;
  submitted_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Certificate {
  id: string;
  program_id: string;
  participant_id: string;
  issued_at: string | null;
  pdf_link: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingSession {
  id: string;
  program_id: string;
  date: string | null;
  title: string | null;
  module_link: string | null;
  attendance_required: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// 3.5 Core table types (Client, Service, User, AuditLog)
// ============================================================

export type UserRole =
  | "team_lead"
  | "team_member"
  | "trainee"
  | "intern"
  | "none";

export interface Client {
  id: string;
  name: string;
  affiliation: string;
  contact_info: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export type ServiceCategory =
  | "WGS"
  | "amplicon"
  | "metabarcoding"
  | "transcriptomics"
  | "shotgun_metag"
  | "phylogenetics"
  | "custom";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  pipeline_default: string | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface User {
  id: string;
  created_at: string;
  name: string;
  email: string;
  role: UserRole;
  track_assignment: string | null;
  updated_at: string | null;
  institution: string | null;
}

export type AuditLogAction =
  | "state_change"
  | "data_deletion"
  | "role_change"
  | "data_export"
  | "data_modification"
  | "user_login"
  | "user_logout";

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  action: AuditLogAction | null;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
}
