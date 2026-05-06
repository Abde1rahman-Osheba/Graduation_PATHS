export type Id = string;

export type JobRow = {
  id: Id;
  title: string;
  company_name: string | null;
  status: string;
  location_mode: string | null;
  location_text: string | null;
  role_family: string | null;
  is_active: boolean;
};

export type IngestionJob = {
  job_id: Id;
  candidate_id: Id | null;
  document_id: Id | null;
  stage: string;
  status: string;
  error_message: string | null;
};

export type ScoreItem = {
  job_id: Id;
  job_title: string | null;
  company_name: string | null;
  final_score: number;
  recommendation: string | null;
  match_classification: string | null;
};

export type ScoreList = { items: ScoreItem[] };

export type MatchRunResponse = {
  matching_run_id: Id;
  job_id: Id;
  top_k: number;
};

export type InterviewAvailabilityResponse = {
  organization_id: Id;
  slots: { start: string; end: string; timezone: string }[];
};

export type InterviewSummaryResponse = {
  id: Id;
  summary_json: unknown;
  created_at: string;
};

export type DecisionSupportGenerateResponse = {
  packet_id: Id;
  recommendation: string | null;
  final_journey_score: number | null;
};

export type DecisionSupportLatestResponse = {
  packet_id: Id;
  final_journey_score: number | null;
  recommendation: string | null;
  packet_json: unknown;
};
