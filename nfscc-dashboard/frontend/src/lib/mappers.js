export function mapMemberApiToFrontend(item) {
  return {
    id: item.id,
    name: item.name ?? item.nama ?? "",
    loginId: item.loginId ?? item.email ?? "",
    divisi: item.divisi ?? "",
    position: item.position ?? item.jabatan ?? "",
    tahunAngkatan: item.tahunAngkatan ?? item.tahun_angkatan ?? "",
    isEC: typeof item.isEC === "boolean" ? item.isEC : !!item.is_ec,
    periodId: String(item.periodId ?? item.periode ?? ""),
    photo: item.photo ?? item.foto ?? "",
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    archived: !!item.archived,
    archivedAt: item.archivedAt ?? item.archived_at ?? null,
    archivedBy: item.archivedBy ?? item.archived_by ?? "",
    archiveReason: item.archiveReason ?? item.archive_reason ?? "",
  };
}

export function mapMemberFrontendToApi(item) {
  const position = String(item.position || "").trim();
  const lower = position.toLowerCase();

  const isEC =
    item.isEC === true ||
    ["lead", "vice lead", "executive committee"].includes(lower);

  return {
    nama: String(item.name || "").trim(),
    email: String(item.loginId || "").trim().toLowerCase(),
    divisi: String(item.divisi || "").trim(),
    jabatan: position,
    tahun_angkatan: String(item.tahunAngkatan || "").trim(),
    foto: item.photo ?? "",
    is_ec: !!isEC,
    periode: String(item.periodId || "").trim(),
    password: item.password || "",
  };
}

export function mapKegiatanApiToFrontend(item) {
  return {
    id: item.id,
    title: item.nama_kegiatan || "",
    tanggal: item.tanggal || "",
    lokasi: item.lokasi || "",
    dok: item.foto_kegiatan || "",
    not: item.deskripsi || "",
    periodId: String(item.periode || ""),
  };
}

export function mapKegiatanFrontendToApi(item, periodId) {
  return {
    nama_kegiatan: item.title || "",
    deskripsi: item.not || "",
    tanggal: item.tanggal || "",
    lokasi: item.lokasi || "",
    foto_kegiatan: item.dok || "",
    periode: String(periodId || item.periodId || ""),
  };
}