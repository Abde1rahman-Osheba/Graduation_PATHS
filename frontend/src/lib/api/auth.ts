import { apiFetch } from "@/lib/api";
import type { LoginResponse, MeResponse } from "@/types/auth";

export type CandidateRegisterPayload = {
  full_name: string;
  email: string;
  password: string;
};

export type OrganizationRegisterPayload = {
  organization_name: string;
  organization_slug: string;
  first_admin_full_name: string;
  first_admin_email: string;
  first_admin_password: string;
};

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export function registerCandidate(payload: CandidateRegisterPayload) {
  return apiFetch("/api/v1/auth/register/candidate", {
    method: "POST",
    json: payload,
  });
}

export function registerOrganization(payload: OrganizationRegisterPayload) {
  return apiFetch("/api/v1/auth/register/organization", {
    method: "POST",
    json: payload,
  });
}

export function getMe() {
  return apiFetch<MeResponse>("/api/v1/auth/me");
}
