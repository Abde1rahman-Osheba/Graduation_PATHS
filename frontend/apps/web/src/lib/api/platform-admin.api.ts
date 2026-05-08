/**
 * PATHS — Platform admin API client.
 *
 * Wraps the /api/v1/admin/* endpoints. Every call requires the user to have
 * account_type='platform_admin' on the backend; the backend enforces this
 * server-side so a non-admin caller will receive 403 even with a valid JWT.
 */

import { api } from "./client";

// ── Backend response types ───────────────────────────────────────────────

export interface AdminOrgRequestRow {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  contact_role: string | null;
  contact_phone: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface AdminOrgRequestDetail extends AdminOrgRequestRow {
  organization_industry: string | null;
  organization_contact_email: string | null;
  additional_info: string | null;
}

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  status: "pending_approval" | "active" | "rejected" | "suspended";
  is_active: boolean;
  industry: string | null;
  contact_email: string | null;
  member_count: number;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminAuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface AdminDashboardStats {
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_organizations: number;
  active_organizations: number;
  suspended_organizations: number;
  total_users: number;
  candidates: number;
  organization_members: number;
  platform_admins: number;
}

// ── API surface ──────────────────────────────────────────────────────────

export const platformAdminApi = {
  // Dashboard
  dashboardStats: () =>
    api.get<AdminDashboardStats>("/api/v1/admin/dashboard-stats"),

  // Organisation access requests
  listRequests: (params?: { status?: string; q?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<AdminOrgRequestRow[]>(`/api/v1/admin/organization-requests${suffix}`);
  },
  getRequest: (id: string) =>
    api.get<AdminOrgRequestDetail>(`/api/v1/admin/organization-requests/${id}`),
  approveRequest: (id: string) =>
    api.post<AdminOrgRequestDetail>(`/api/v1/admin/organization-requests/${id}/approve`),
  rejectRequest: (id: string, reason: string) =>
    api.post<AdminOrgRequestDetail>(
      `/api/v1/admin/organization-requests/${id}/reject`,
      { reason },
    ),

  // Organisations
  listOrganizations: (params?: { status?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<AdminOrgRow[]>(`/api/v1/admin/organizations${suffix}`);
  },
  suspendOrganization: (id: string, reason: string) =>
    api.post<AdminOrgRow>(`/api/v1/admin/organizations/${id}/suspend`, { reason }),
  unsuspendOrganization: (id: string) =>
    api.post<AdminOrgRow>(`/api/v1/admin/organizations/${id}/unsuspend`),

  // Users
  listUsers: (params?: { account_type?: string; q?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.account_type) qs.set("account_type", params.account_type);
    if (params?.q) qs.set("q", params.q);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<AdminUserRow[]>(`/api/v1/admin/users${suffix}`);
  },

  // Audit feed
  listAudit: (params?: { action_prefix?: string; entity_type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.action_prefix) qs.set("action_prefix", params.action_prefix);
    if (params?.entity_type) qs.set("entity_type", params.entity_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<AdminAuditRow[]>(`/api/v1/admin/audit${suffix}`);
  },
};
