import { apiClient } from "../lib/apiClient";

export async function listPresensiApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/presensi${query}`);
  return Array.isArray(data) ? data : [];
}

export async function createPresensiApi(payload) {
  return apiClient.post("/presensi", payload);
}

export async function updatePresensiApi(id, payload) {
  return apiClient.put(`/presensi/${id}`, payload);
}

export async function deletePresensiApi(id) {
  return apiClient.delete(`/presensi/${id}`);
}