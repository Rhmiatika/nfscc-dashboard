import { apiClient } from "../lib/apiClient";
import {
  mapMemberApiToFrontend,
  mapMemberFrontendToApi,
} from "../lib/mappers";

export async function listMembersApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/members${query}`);
  return Array.isArray(data) ? data.map(mapMemberApiToFrontend) : [];
}

export async function createMemberApi(frontendMember) {
  const payload = mapMemberFrontendToApi(frontendMember);
  const data = await apiClient.post("/members", payload);
  return mapMemberApiToFrontend(data);
}

export async function updateMemberApi(id, frontendMember) {
  const payload = mapMemberFrontendToApi(frontendMember);
  const data = await apiClient.put(`/members/${id}`, payload);
  return mapMemberApiToFrontend(data);
}

export async function listArchivedMembersApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/members-archived${query}`);
  return Array.isArray(data) ? data.map(mapMemberApiToFrontend) : [];
}

export async function archiveMemberApi(id, payload = {}) {
  const data = await apiClient.post(`/members/${id}/archive`, payload);
  return mapMemberApiToFrontend(data);
}

export async function archiveMembersByPeriodApi(periodId, payload = {}) {
  return apiClient.post("/members/archive-by-period", {
    periode: String(periodId),
    ...payload,
  });
}

export async function restoreMemberApi(id) {
  const data = await apiClient.post(`/members/${id}/restore`, {});
  return mapMemberApiToFrontend(data);
}

export async function deleteMemberApi(id) {
  return apiClient.delete(`/members/${id}`);
}

export async function resetMemberPasswordApi(id) {
  return apiClient.post(`/members/${id}/reset-password`, {});
}