import { apiClient } from "../lib/apiClient";

function sanitizePeriodId(periodId) {
  return String(periodId || "").trim();
}

function sanitizeStateBeforeSave(state) {
  const { finance, ...rest } = state || {};
  return rest;
}

export async function loadBackendState(periodId) {
  const safePeriodId = sanitizePeriodId(periodId);
  if (!safePeriodId) {
    throw new Error("Period ID wajib diisi.");
  }

  const result = await apiClient.get(`/state/${safePeriodId}`);
  return result?.data ?? null;
}

export async function saveBackendState(periodId, state) {
  const safePeriodId = sanitizePeriodId(periodId);
  if (!safePeriodId) {
    throw new Error("Period ID wajib diisi.");
  }

  const cleanState = sanitizeStateBeforeSave(state);

  const result = await apiClient.put(`/state/${safePeriodId}`, {
    data: cleanState,
  });

  return result?.data ?? result;
}