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
export type TaskStatus = "pending" | "in_progress" | "completed" | "on_hold" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export type TaskCategory =
  | "client_communication"
  | "code_workflow_optimization"
  | "sequence_analysis"
  | "tour"
  | "meeting"
  | "internship"
  | "training"
  | "collaboration"
  | "engagements"
  | "projects"
  | "professional_development"
  | "future_planning"
  | "skill_development"
  | "events";

export type Task = {
  id: string;
  title: string;
  /** Denormalized primary assignee (first selected). Null when unassigned. */
  assignee_id: string | null;
  /** Legacy mirror of end_date; kept for older queries and reports. */
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Optional clock time (HH:MM or HH:MM:SS); independent of the date range. */
  task_time?: string | null;
  /** Optional location, venue, or other notes. */
  details: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  linked_project_id: string | null;
  linked_analysis_id?: string | null;
  /** Client-enriched from task_tag; not a column on task. */
  categories?: TaskCategory[];
  /** Client-enriched from task_assignee; not a column on task. */
  assignee_ids?: string[];
  updated_at?: string;
};

export type TaskTag = {
  task_id: string;
  category: TaskCategory;
  created_at?: string;
};

export type TaskAssignee = {
  task_id: string;
  user_id: string;
  created_at?: string;
};

/** Persistable task fields (excludes client-only lists). */
export type TaskRecord = Omit<Task, "categories" | "assignee_ids">;

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
  status_of_completion: string | null;
  /** Peer review stage, ahead of submission. See STATUS_OF_REVIEW_OPTIONS. */
  status_of_review: string | null;
  status_of_submission: string | null;
  /** Kept for records that predate PDF uploads, and for externally hosted reports. */
  service_report_link: string | null;
  /** Object key in the private `service-reports` storage bucket. */
  service_report_file_path: string | null;
  service_report_file_name: string | null;
  service_report_file_size: number | null;
  service_report_uploaded_at: string | null;
  service_report_uploaded_by: string | null;
  client_sequences_link: string | null;
  notes: string | null;
  /** Lab peer who reviews the report before it reaches the approving officer. */
  reviewer_user_id: string | null;
  /** Team lead who signs off on the service report. */
  approver_user_id: string | null;
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

/** Which pass of the workflow a comment belongs to. */
export type ReviewCommentStage = "review" | "approval";

/** A comment left while a service report was being reviewed or approved. */
export interface AnalysisReviewComment {
  id: string;
  analysis_id: string;
  author_id: string;
  body: string;
  stage: ReviewCommentStage;
  /** Storage key of the PDF that was current when this comment was written. */
  file_path: string | null;
  file_name: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

/** One stored PDF that has been current on an analysis. */
export type ServiceReportVersionKind =
  | "upload"
  | "revision"
  | "reviewed"
  | "signed";

export interface AnalysisServiceReportVersion {
  id: string;
  analysis_id: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  kind: ServiceReportVersionKind;
  uploaded_by: string | null;
  uploaded_at: string;
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
  requesting_institution: string | null;
  training_code: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Form shape for add/edit program modal (dates always strings). */
export type TrainingProgramFormData = {
  title: string;
  description: string;
  requesting_institution: string;
  training_code: string;
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
  /** Object key in the private `module-files` bucket when a file was uploaded. */
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
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
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  is_required: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AssessmentType = "pre_test" | "post_test" | "evaluation";

export type EvaluationRatingValue = 5 | 4 | 3 | 2 | 1 | "N/A";

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
  allowNA?: boolean;
  required?: boolean;
};

export type TextQuestion = {
  type: "text";
  id: string;
  question: string;
  multiline?: boolean;
  required?: boolean;
  input?: "text" | "email";
  placeholder?: string;
};

export type ChoiceQuestion = {
  type: "choice";
  id: string;
  question: string;
  options: string[];
  required?: boolean;
};

export type DateQuestion = {
  type: "date";
  id: string;
  question: string;
  required?: boolean;
};

export type RatingStatement = {
  id: string;
  statement: string;
};

export type RatingGroupQuestion = {
  type: "rating_group";
  id: string;
  question: string;
  statements: RatingStatement[];
  required?: boolean;
  allowNA?: boolean;
};

export type Question =
  | McqQuestion
  | RatingQuestion
  | TextQuestion
  | ChoiceQuestion
  | DateQuestion
  | RatingGroupQuestion;

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

export type EnrollmentStatus = "enrolled" | "completed" | "dropped";

export interface ProgramEnrollment {
  id: string;
  program_id: string;
  user_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  enrolled_by: string | null;
  created_at?: string;
  updated_at?: string | null;
}

// ============================================================
// 3.5 Core table types (Client, Service, User, AuditLog)
// ============================================================

export type UserRole =
  | "team_lead"
  | "team_member"
  | "trainee"
  | "intern"
  | "reviewing_officer"
  | "approving_officer"
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
  avatar_url: string | null;
  avatar_path: string | null;
  avatar_uploaded_at: string | null;
  designation: string | null;
  /** Object key in user-signatures bucket for this user's e-signature PNG. */
  signature_path: string | null;
  signature_uploaded_at: string | null;
  /** Bioinformatics Team page + calendar absences roster. */
  in_team_directory: boolean;
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

// ============================================================
// Repository (standalone source links)
// ============================================================

export type RepositoryKind = "github" | "drive" | "other";
export type RepositoryCategory =
  | "training"
  | "research"
  | "collaborator"
  | "client"
  | "quotation"
  | "services"
  | "records"
  | "analysis"
  | "template"
  | "automated_pipeline"
  | "form"
  | "internship"
  | "covid_19"
  | "project"
  | "pipelines"
  | "datasets"
  | "client_sequences"
  | "turnover_forms"
  | "other";

export const REPOSITORY_KIND_OPTIONS: {
  value: RepositoryKind;
  label: string;
}[] = [
  { value: "github", label: "GitHub" },
  { value: "drive", label: "Google Drive" },
  { value: "other", label: "Other" },
];

export type Repository = {
  id: string;
  kind: RepositoryKind;
  title: string;
  url: string;
  description: string | null;
  /** Legacy primary tag; mirrored from the first selected category. */
  category: RepositoryCategory;
  /** Client-enriched from repository_tag; not a column on repository. */
  categories?: RepositoryCategory[];
  /** Sequencer run ID; deep-links to Service Report Tracker RUN ID. */
  run_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RepositoryTag = {
  repository_id: string;
  category: RepositoryCategory;
  created_at?: string;
};

/** Persistable repository fields (excludes client-only `categories`). */
export type RepositoryRecord = Omit<Repository, "categories">;

export type RepositoryFormData = {
  kind: RepositoryKind;
  title: string;
  url: string;
  description: string;
  categories: RepositoryCategory[];
  run_id: string;
};

// ============================================================
// COVID-19 Sample Tracker (genomic surveillance)
// (Separate from client sequence analysis / Service Report Tracker.)
// ============================================================

export type CovidSequencer = "NextSeq1000" | "iSeq100";

export const COVID_SEQUENCER_OPTIONS: {
  value: CovidSequencer;
  label: string;
}[] = [
  { value: "NextSeq1000", label: "NextSeq1000" },
  { value: "iSeq100", label: "iSeq100" },
];

/** One sequencing run from the COVID-19 Sample Tracker (Run_Summary sheet). */
export type CovidSequencingRun = {
  id: string;
  run_number: number;
  run_id: string | null;
  sequencer: string | null;
  extraction_number: string | null;
  date_received: string | null;
  date_loaded: string | null;
  samples_sequenced: number;
  lineage_assigned: number | null;
  uploaded_gisaid: boolean;
  uploaded_islap: boolean;
  comments: string | null;
  review_flag: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Form shape for add/edit COVID-19 Sample Tracker modal. */
export type CovidSequencingRunFormData = {
  run_number: string;
  run_id: string;
  sequencer: string;
  extraction_number: string;
  date_received: string;
  date_loaded: string;
  samples_sequenced: string;
  lineage_assigned: string;
  uploaded_gisaid: boolean;
  uploaded_islap: boolean;
  comments: string;
  review_flag: string;
};

// ============================================================
// Team presence / availability
// ============================================================

export type PresenceStatus =
  | "in_office"
  | "in_lab"
  | "remote"
  | "on_leave"
  | "on_travel"
  | "in_meeting"
  | "unavailable";

export const PRESENCE_STATUS_OPTIONS: {
  value: PresenceStatus;
  label: string;
}[] = [
  { value: "in_office", label: "In office" },
  { value: "in_lab", label: "In lab" },
  { value: "remote", label: "Remote / WFH" },
  { value: "on_leave", label: "On leave" },
  { value: "on_travel", label: "On travel" },
  { value: "in_meeting", label: "In meeting" },
  { value: "unavailable", label: "Unavailable" },
];

export type UserPresence = {
  user_id: string;
  status: PresenceStatus;
  note: string | null;
  until_date: string | null;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * One scheduled absence with its own note, e.g. a single stretch of leave.
 * Expanded into one `UserAbsence` row per day on save; `id` is client-only.
 */
export type AbsenceBlock = {
  id: string;
  start_date: string;
  end_date: string;
  note: string;
};

export type UserPresenceFormData = {
  status: PresenceStatus;
  note: string;
  until_date: string;
  designation: string;
  /** Separate stretches of leave / travel, each with its own note. */
  absence_blocks: AbsenceBlock[];
  /** Team lead only: include on bioinformatics Team + calendar. */
  in_team_directory: boolean;
};

export type UserPresenceAvatarChanges = {
  file?: File;
  remove?: boolean;
};

/** Per-day scheduled absence for Team + Calendar. */
export type UserAbsence = {
  id: string;
  user_id: string;
  absence_date: string;
  status: PresenceStatus;
  note: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Statuses that support picking multiple calendar dates. */
export const SCHEDULED_ABSENCE_STATUSES: PresenceStatus[] = [
  "on_leave",
  "on_travel",
];

//For Chat ============================================================================
export type ConversationKind = "channel" | "direct";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  joined_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  /** Client-enriched from users; not a column on message. */
  sender_name?: string | null;
};

// ============================================================
// Incident reports (staff-only lab / ops log)
// ============================================================

export type IncidentCategory =
  | "sample_data_handling"
  | "equipment"
  | "computational"
  | "biosafety"
  | "data_privacy"
  | "facility"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export type IncidentLocation =
  | "lab"
  | "sequencer_room"
  | "office"
  | "server"
  | "remote"
  | "other";

export const INCIDENT_CATEGORY_OPTIONS: {
  value: IncidentCategory;
  label: string;
}[] = [
  { value: "sample_data_handling", label: "Sample / data handling" },
  { value: "equipment", label: "Equipment / instrument" },
  { value: "computational", label: "Computational / pipeline" },
  { value: "biosafety", label: "Biosafety / lab safety" },
  { value: "data_privacy", label: "Data privacy / client data" },
  { value: "facility", label: "Facility (power, access, flooding)" },
  { value: "other", label: "Other" },
];

export const INCIDENT_SEVERITY_OPTIONS: {
  value: IncidentSeverity;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const INCIDENT_STATUS_OPTIONS: {
  value: IncidentStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const INCIDENT_LOCATION_OPTIONS: {
  value: IncidentLocation;
  label: string;
}[] = [
  { value: "lab", label: "Lab" },
  { value: "sequencer_room", label: "Sequencer room" },
  { value: "office", label: "Office" },
  { value: "server", label: "Server / compute" },
  { value: "remote", label: "Remote" },
  { value: "other", label: "Other" },
];

/** Live launchpad address for one Service Report Generator card. */
export type ServiceReportGeneratorRow = {
  id: string;
  href: string;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type IncidentReport = {
  id: string;
  title: string;
  incident_date: string;
  incident_time: string | null;
  location: IncidentLocation;
  location_detail: string | null;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  immediate_action: string | null;
  people_involved: string | null;
  related_run_id: string | null;
  follow_up: string | null;
  reporter_id: string;
  point_person_id: string | null;
  status: IncidentStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type IncidentStatusEvent = {
  id: string;
  incident_id: string;
  from_status: IncidentStatus | null;
  to_status: IncidentStatus;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
};

export type IncidentReportFormData = {
  title: string;
  incident_date: string;
  incident_time: string;
  location: IncidentLocation;
  location_detail: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  immediate_action: string;
  people_involved: string;
  related_run_id: string;
  follow_up: string;
  point_person_id: string;
  status: IncidentStatus;
};
