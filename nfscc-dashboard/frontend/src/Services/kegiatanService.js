import { apiClient } from "../lib/apiClient";

function mapKegiatanApiToFrontend(item) {
  return {
    id: item.id,
    periodId: String(item.periodId ?? item.periode ?? ""),
    title: item.title ?? item.nama_kegiatan ?? "",
    tanggal: item.tanggal ?? "",
    lokasi: item.lokasi ?? "",
    pic: item.pic ?? "",
    dokLink: item.dokLink ?? item.foto_kegiatan ?? "",
    notulensiLink: item.notulensiLink ?? item.notulensi_link ?? "",
    eventId: item.eventId ?? item.event_id ?? null,
    deskripsi: item.deskripsi ?? "",
    hiddenFromKegiatanPage:
      typeof item.hiddenFromKegiatanPage === "boolean"
        ? item.hiddenFromKegiatanPage
        : !!item.hidden_from_kegiatan_page,
    pageRemovedAt: item.pageRemovedAt ?? item.page_removed_at ?? null,
    pageRemovedBy: item.pageRemovedBy ?? item.page_removed_by ?? "",
    createdAt: item.createdAt ?? item.created_at ?? null,
    updatedAt: item.updatedAt ?? item.updated_at ?? null,
  };
}

function mapKegiatanFrontendToApi(item, periodId) {
  return {
    nama_kegiatan: item.title || "",
    deskripsi: item.deskripsi || "",
    tanggal: item.tanggal || "",
    lokasi: item.lokasi || "",
    event_id: item.eventId || null,
    foto_kegiatan: item.dokLink || "",
    pic: item.pic || "",
    notulensi_link: item.notulensiLink || "",
    hidden_from_kegiatan_page: !!item.hiddenFromKegiatanPage,
    page_removed_at: item.pageRemovedAt || null,
    page_removed_by: item.pageRemovedBy || "",
    periode: String(periodId || item.periodId || ""),
  };
}

export async function listKegiatanApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/kegiatan${query}`);
  return Array.isArray(data) ? data.map(mapKegiatanApiToFrontend) : [];
}

export async function createKegiatanApi(frontendItem, periodId) {
  const payload = mapKegiatanFrontendToApi(frontendItem, periodId);
  const data = await apiClient.post("/kegiatan", payload);
  return mapKegiatanApiToFrontend(data);
}

export async function updateKegiatanApi(id, frontendItem, periodId) {
  const payload = mapKegiatanFrontendToApi(frontendItem, periodId);
  const data = await apiClient.put(`/kegiatan/${id}`, payload);
  return mapKegiatanApiToFrontend(data);
}

export async function listArchivedKegiatanApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/kegiatan-archived${query}`);
  return Array.isArray(data) ? data.map(mapKegiatanApiToFrontend) : [];
}

export async function archiveKegiatanApi(id, payload = {}) {
  const data = await apiClient.post(`/kegiatan/${id}/archive`, payload);
  return mapKegiatanApiToFrontend(data);
}

export async function restoreKegiatanApi(id) {
  const data = await apiClient.post(`/kegiatan/${id}/restore`, {});
  return mapKegiatanApiToFrontend(data);
}

export async function deleteKegiatanApi(id) {
  return apiClient.delete(`/kegiatan/${id}`);
}