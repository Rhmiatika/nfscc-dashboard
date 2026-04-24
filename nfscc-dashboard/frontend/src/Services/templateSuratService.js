import { apiClient } from "../lib/apiClient";

function detectDocType(url) {
  const s = String(url || "").toLowerCase();

  if (s.includes("docs.google.com/document")) return "gdoc";
  if (s.includes("docs.google.com/spreadsheets")) return "gsheet";
  if (s.endsWith(".xlsx") || s.endsWith(".xls") || s.includes("spreadsheet")) {
    return "sheet";
  }
  if (s.endsWith(".docx") || s.endsWith(".doc")) return "doc";
  if (s.endsWith(".pdf")) return "pdf";
  return "link";
}

function mapTemplateApiToFrontend(item) {
  const url = item.isi || "";

  return {
    id: item.id,
    title: item.judul || "",
    url,
    type: detectDocType(url),
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
    periodId: String(item.periode || ""),
  };
}

function mapTemplateFrontendToApi(item, periodId) {
  return {
    judul: item.title || "",
    isi: item.url || "",
    periode: String(periodId || item.periodId || ""),
  };
}

// LOAD SEMUA DOKUMEN TANPA FILTER PERIODE
export async function listTemplateSuratApi() {
  const data = await apiClient.get("/template-surat");
  return Array.isArray(data) ? data.map(mapTemplateApiToFrontend) : [];
}

// SAAT CREATE TETAP SIMPAN PERIODE UNTUK HISTORI
export async function createTemplateSuratApi(item, periodId) {
  const payload = mapTemplateFrontendToApi(item, periodId);
  const data = await apiClient.post("/template-surat", payload);
  return mapTemplateApiToFrontend(data);
}

// SAAT UPDATE TETAP SIMPAN PERIODE YANG SUDAH ADA / AKTIF
export async function updateTemplateSuratApi(id, item, periodId) {
  const payload = mapTemplateFrontendToApi(item, periodId);
  const data = await apiClient.put(`/template-surat/${id}`, payload);
  return mapTemplateApiToFrontend(data);
}

export async function deleteTemplateSuratApi(id) {
  return apiClient.delete(`/template-surat/${id}`);
}