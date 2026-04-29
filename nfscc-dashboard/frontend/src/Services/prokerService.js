import { apiClient } from "../lib/apiClient";

function mapProkerApiToFrontend(item) {
  return {
    id: item.id,
    periodId: String(item.periodId ?? item.periode ?? ""),
    title: item.title ?? item.nama ?? "",
    divisi: item.divisi ?? "",
    date: item.date ?? item.tanggal_mulai ?? "",
    endDate: item.endDate ?? item.tanggal_selesai ?? "",
    pic: item.pic ?? "",
    budget: item.budget ?? item.anggaran ?? "",
    note: item.note ?? item.deskripsi ?? "",
    status: item.status ?? "Perencanaan",
    proposalLink: item.proposalLink ?? item.proposal_link ?? "",
    docLink: item.docLink ?? item.doc_link ?? "",
    notulensiLink: item.notulensiLink ?? item.notulensi_link ?? "",
    hiddenFromProkerPage:
      typeof item.hiddenFromProkerPage === "boolean"
        ? item.hiddenFromProkerPage
        : !!item.hidden_from_proker_page,
    archived:
      typeof item.archived === "boolean" ? item.archived : false,
    pageRemovedAt: item.pageRemovedAt ?? item.page_removed_at ?? null,
    pageRemovedBy: item.pageRemovedBy ?? item.page_removed_by ?? "",
    createdAt: item.createdAt ?? item.created_at ?? null,
    updatedAt: item.updatedAt ?? item.updated_at ?? null,
  };
}

function mapProkerFrontendToApi(item, periodId) {
  return {
    nama: item.title || "",
    divisi: item.divisi || "",
    deskripsi: item.note || "",
    tanggal_mulai: item.date || "",
    tanggal_selesai: item.endDate || null,
    pic: item.pic || "",
    anggaran: item.budget || "",
    status: item.status || "Perencanaan",
    proposal_link: item.proposalLink || "",
    doc_link: item.docLink || "",
    notulensi_link: item.notulensiLink || "",
    hidden_from_proker_page: !!item.hiddenFromProkerPage,
    archived: typeof item.archived === "boolean" ? item.archived : false,
    page_removed_at: item.pageRemovedAt || null,
    page_removed_by: item.pageRemovedBy || "",
    periode: String(periodId || item.periodId || ""),
  };
}

export async function listProkerApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/proker${query}`);
  return Array.isArray(data) ? data.map(mapProkerApiToFrontend) : [];
}

export async function createProkerApi(frontendItem, periodId) {
  const payload = mapProkerFrontendToApi(frontendItem, periodId);
  const data = await apiClient.post("/proker", payload);
  return mapProkerApiToFrontend(data);
}

export async function updateProkerApi(id, frontendItem, periodId) {
  const payload = mapProkerFrontendToApi(frontendItem, periodId);
  const data = await apiClient.put(`/proker/${id}`, payload);
  return mapProkerApiToFrontend(data);
}

export async function listArchivedProkerApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/proker-archived${query}`);
  return Array.isArray(data) ? data.map(mapProkerApiToFrontend) : [];
}

export async function archiveProkerApi(id, reason = "periode_dinonaktifkan") {
  return apiFetch(`/proker/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function restoreProkerApi(id) {
  const data = await apiClient.post(`/proker/${id}/restore`, {});
  return mapProkerApiToFrontend(data);
}

export async function deleteProkerApi(id) {
  return apiClient.delete(`/proker/${id}`);
}