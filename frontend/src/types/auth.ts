export type OrganizationContext = {
  organization_id: string;
  organization_name: string;
  role_code: string;
};

export type MeResponse = {
  id: string;
  email: string;
  full_name: string;
  account_type: "candidate" | "organization_member";
  is_active: boolean;
  candidate_profile: {
    id: string;
    phone: string | null;
    location: string | null;
    headline: string | null;
    years_experience: number | null;
    career_level: string | null;
    skills: string[];
    open_to_job_types: string[];
    open_to_workplace_settings: string[];
    desired_job_titles: string[];
    desired_job_categories: string[];
  } | null;
  organization: OrganizationContext | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    account_type: string;
    organization: OrganizationContext | null;
  };
};
