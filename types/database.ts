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
export type ProjectFormData = Omit<Project, "id" | "created_at" | "updated_at" | "repository_link" | "target_delivery_date"
> & {
  repository_link: string;          // always a string in the form, "" means empty
  target_delivery_date: string;     // same reasoning applies here (see below)
};

//For Tasks ===========================================================================
export type TaskStatus = "pending" | "in_progress" | "completed" | "on_hold";
export type TaskPriority = "low" | "medium" | "high";
export type Task = {
  id: string;
  title: string;
  assignee_id: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  linked_project_id: string;
  updated_at?: string;
};

// ============================================================
// 3.1 Client Sequence Analysis types
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
  project_id: string;
  pipeline: string | null;
  pipeline_version: string | null;
  status: AnalysisStatus;
  assignee_id: string;
  started_at: string | null;
  completed_at: string | null;
  output_link: string | null;
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
// 3.2 Training & 3.3 Internship types
// ============================================================

export type TrainingType = "training" | "internship";

export interface TrainingProgram {
  id: string;
  title: string;
  type: TrainingType | null;
  start_date: string | null;
  end_date: string | null;
  instructor_id: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

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
