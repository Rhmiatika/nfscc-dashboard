import { apiClient } from "../lib/apiClient";

function mapKeuanganApiToFrontend(item) {
  return {
    id: item.id,
    backendId: item.id,
    kind: item.kind || "nonkas",
    tanggal: item.tanggal || "",
    memberId: item.member_id || "",
    memberName: item.member_name || "",
    memberDivisi: item.member_divisi || "",
    divisi: item.divisi || "",
    tipe: item.tipe || (item.jenis === "pengeluaran" ? "Keluar" : "Masuk"),
    kategori: item.kategori || item.keterangan || "",
    nominal: Number(item.jumlah || 0),
    catatan: item.catatan || "",
    proof: item.bukti_url
      ? {
          name: item.bukti_nama || "bukti",
          type: item.bukti_tipe || "application/octet-stream",
          url: item.bukti_url,
        }
      : null,
    dibuatOleh: item.dibuat_oleh || "",
    periode: item.periode || "",
    startMonth: item.start_month || "",
    endMonth: item.end_month || "",
    monthsCount: Number(item.months_count || 0),
    nominalPerBulan: Number(item.nominal_per_bulan || 0),
    total: Number(item.jumlah || 0),
    raw: item,
  };
}

function mapKasFrontendToApi(item, periodId) {
  return {
    kind: "kas",
    keterangan: `Kas Bulanan (${item.startMonth} s/d ${item.endMonth})`,
    jenis: "pemasukan",
    jumlah: Number(item.total || 0),
    tanggal: item.tanggal || "",
    periode: String(periodId ?? item.periodId ?? item.periode ?? "").trim(),
    member_id: item.memberId || "",
    member_name: item.memberName || "",
    member_divisi: item.memberDivisi || "",
    divisi: item.memberDivisi || "",
    tipe: "Masuk",
    kategori: "Kas",
    catatan: item.catatan || "",
    bukti_nama: item.proof?.name || "",
    bukti_tipe: item.proof?.type || "",
    dibuat_oleh: item.dibuatOleh || "",
    start_month: item.startMonth || "",
    end_month: item.endMonth || "",
    months_count: Number(item.monthsCount || 0),
    nominal_per_bulan: Number(item.nominalPerBulan || 0),
  };
}

function mapNonKasFrontendToApi(item, periodId) {
  return {
    kind: "nonkas",
    keterangan: item.kategori || "",
    jenis:
      String(item.tipe || "").toLowerCase() === "keluar"
        ? "pengeluaran"
        : "pemasukan",
    jumlah: Number(item.nominal || 0),
    tanggal: item.tanggal || "",
    periode: String(periodId ?? item.periodId ?? item.periode ?? "").trim(),
    member_id: "",
    member_name: "",
    member_divisi: "",
    divisi: item.divisi || "",
    tipe: item.tipe || "Masuk",
    kategori: item.kategori || "",
    catatan: item.catatan || "",
    bukti_nama: item.proof?.name || item.bukti?.name || "",
    bukti_tipe: item.proof?.type || item.bukti?.type || "",
    dibuat_oleh: item.dibuatOleh || "",
    start_month: "",
    end_month: "",
    months_count: 0,
    nominal_per_bulan: 0,
  };
}

function buildKeuanganFormData(payload, proofFile) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      formData.append(key, "");
      return;
    }
    formData.append(key, value);
  });

  if (proofFile) {
    formData.append("bukti", proofFile);
  }

  return formData;
}

export async function listKeuanganApi(periodId) {
  const query = periodId ? `?periode=${encodeURIComponent(periodId)}` : "";
  const data = await apiClient.get(`/keuangan${query}`);
  return Array.isArray(data) ? data.map(mapKeuanganApiToFrontend) : [];
}

export async function createKasApi(item, periodId) {
  const payload = mapKasFrontendToApi(item, periodId);
  const formData = buildKeuanganFormData(payload, item.proof?.file || null);
  const data = await apiClient.post("/keuangan", formData);
  return mapKeuanganApiToFrontend(data);
}

export async function createNonKasApi(item, periodId) {
  const payload = mapNonKasFrontendToApi(item, periodId);
  const formData = buildKeuanganFormData(payload, item.proof?.file || null);
  const data = await apiClient.post("/keuangan", formData);
  return mapKeuanganApiToFrontend(data);
}

export async function updateKasApi(id, item, periodId) {
  const payload = mapKasFrontendToApi(item, periodId);
  const formData = buildKeuanganFormData(payload, item.proof?.file || null);
  formData.append("_method", "PUT");
  const data = await apiClient.post(`/keuangan/${id}`, formData);
  return mapKeuanganApiToFrontend(data);
}

export async function updateNonKasApi(id, item, periodId) {
  const payload = mapNonKasFrontendToApi(item, periodId);
  const formData = buildKeuanganFormData(payload, item.proof?.file || null);
  formData.append("_method", "PUT");
  const data = await apiClient.post(`/keuangan/${id}`, formData);
  return mapKeuanganApiToFrontend(data);
}

export async function deleteKeuanganApi(id) {
  return apiClient.delete(`/keuangan/${id}`);
}