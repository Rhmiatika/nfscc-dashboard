import React, { useEffect, useMemo, useState } from "react";
import {
  listKegiatanApi,
  createKegiatanApi,
  updateKegiatanApi,
  archiveKegiatanApi,
} from "../Services/kegiatanService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function parseAnyDate(input) {
  const s = (input || "").toString().trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/").map(Number);
    const d = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getActivePeriodId(state) {
  return String(
    state?.session?.currentPeriodId ||
      state?.session?.activePeriodId ||
      state?.session?.periodId ||
      state?.session?.period ||
      "2026"
  );
}

function getPeriodRangeFromState(state, periodId) {
  const periods = state?.periods || {};
  const rawPeriod = periods?.[String(periodId)] || {};

  const startRaw =
    rawPeriod?.startDate ||
    rawPeriod?.mulai ||
    rawPeriod?.start ||
    rawPeriod?.periodeMulai ||
    rawPeriod?.from ||
    null;

  const endRaw =
    rawPeriod?.endDate ||
    rawPeriod?.selesai ||
    rawPeriod?.end ||
    rawPeriod?.periodeSampai ||
    rawPeriod?.to ||
    null;

  const start = startRaw ? parseAnyDate(startRaw) : null;
  const end = endRaw ? parseAnyDate(endRaw) : null;

  if (start && end) {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

function isDateInsideRange(dateValue, range) {
  if (!range) return true;
  const d = parseAnyDate(dateValue);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

export default function KegiatanPage({ state, setState, ui, utils, theme }) {
  const members = Array.isArray(state?.members) ? state.members : [];
  const sessionLoginId = state?.session?.loginId || "";
  const isAdmin = !!state?.session?.isAdmin;

  const activePeriodId = getActivePeriodId(state);
  const activePeriodRange = getPeriodRangeFromState(state, activePeriodId);

  const me = isAdmin
    ? {
        loginId: sessionLoginId,
        name: "Admin",
        divisi: "Admin",
        position: "Executive Committee",
        isEC: true,
      }
    : members.find((m) => m.loginId === sessionLoginId) || null;

  const myPosition = String(
    me?.position || (me?.isEC ? "Executive Committee" : "Staff")
  ).trim();

  const myDivisi = String(me?.divisi || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const isAllowedDivision = [
    "hrd",
    "r&d",
    "r&e",
    "research & development",
    "research and development",
    "research & education",
    "research and education",
    "human resource development",
  ].includes(myDivisi);

  const isEC = !!state?.session?.isAdmin || !!me?.isEC;

  const isAuthed = !!state?.session?.isAuthed;

  const isPrivilegedUser =
    isAdmin ||
    myPosition === "Lead" ||
    myPosition === "Vice Lead" ||
    myPosition === "Executive Committee" ||
    !!me?.isEC ||
    isAllowedDivision;

  const isCMDUser =
    myDivisi === "creative media & documentation" ||
    myDivisi === "creative media and documentation" ||
    myDivisi === "cmd";

  const isDokumentasiOnlyEdit = isCMDUser && !isAdmin && !isEC;

  const canViewPage = true;
  const canManagePage = isAuthed && (isPrivilegedUser || isCMDUser);
  const canUseForm = canManagePage && !isDokumentasiOnlyEdit;
  const canClearPage = isAuthed && isPrivilegedUser;

  const activeMemberOptions = useMemo(() => {
    const normalizedMyDivisi = String(myDivisi || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    const names = members
      .filter((m) => {
        const isActive =
          typeof m?.isActive === "boolean" ? m.isActive : true;

        const hasName = String(m?.name || "").trim();

        if (!isActive || !hasName) return false;

        if (isAdmin || isEC || myPosition === "Lead" || myPosition === "Vice Lead") {
          return true;
        }

        if (isAllowedDivision) {
          const memberDivisi = String(m?.divisi || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

          return memberDivisi === normalizedMyDivisi;
        }

        return false;
      })
      .map((m) => String(m.name).trim());

    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "id"));
  }, [members, isAdmin, isEC, myPosition, isAllowedDivision, myDivisi]);

  const kegiatanListRaw = Array.isArray(state?.kegiatans)
    ? state.kegiatans
    : Array.isArray(state?.kegiatan)
    ? state.kegiatan
    : [];

  const kegiatanList = useMemo(() => {
    return [...kegiatanListRaw].filter((item) => {
      if (item?.hiddenFromKegiatanPage) return false;

      if (item?.periodId) {
        return String(item.periodId) === activePeriodId;
      }

      const tanggal = item?.tanggal || item?.date || "";
      return isDateInsideRange(tanggal, activePeriodRange);
    });
  }, [kegiatanListRaw, activePeriodId, activePeriodRange]);

  const sectionHeadingClass =
    "text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight";

  const labelClass = cx("mb-1 block text-sm", ui.textMuted);
  const tableHeadClass =
    theme === "dark"
      ? "border-b border-white/10 text-slate-300"
      : "border-b border-gray-200 text-gray-600";
  const tableRowClass =
    theme === "dark"
      ? "border-b border-white/10 last:border-0"
      : "border-b border-gray-200 last:border-0";

  const linkClass =
    theme === "dark"
      ? "text-blue-300 hover:text-blue-200 underline"
      : "text-blue-600 hover:text-blue-700 underline";

  const thClass = "whitespace-nowrap px-4 py-2 text-left";
  const tdClass = "px-3 py-3 text-[14px] font-normal leading-6 align-top";
  const titleClass = "text-[14px] font-semibold leading-6";

  const canEdit = (k) => {
    if (!k) return false;
    return isAuthed && (isPrivilegedUser || isDokumentasiOnlyEdit);
  };

  const [title, setTitle] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pic, setPic] = useState("");
  const [dok, setDok] = useState("");
  const [not, setNot] = useState("");
  const [formError, setFormError] = useState("");
  const [q, setQ] = useState("");

  const [loadingKegiatan, setLoadingKegiatan] = useState(false);

  async function loadKegiatan() {
    try {
      setLoadingKegiatan(true);
      const data = await listKegiatanApi(activePeriodId);

      setState((prev) => ({
        ...prev,
        kegiatans: data,
        kegiatan: undefined,
      }));
    } catch (err) {
      console.error("Gagal memuat kegiatan:", err);
    } finally {
      setLoadingKegiatan(false);
    }
  }

  useEffect(() => {
    loadKegiatan();
  }, [activePeriodId]);

  const isFormValid = useMemo(() => {
    return (
      Boolean(String(title || "").trim()) &&
      Boolean(tanggal) &&
      Boolean(String(lokasi || "").trim()) &&
      Boolean(String(pic || "").trim())
    );
  }, [title, tanggal, lokasi, pic]);

  const disabledBtnClass = "opacity-50 cursor-not-allowed pointer-events-none";

  const resetForm = () => {
    setTitle("");
    setTanggal("");
    setLokasi("");
    setPic("");
    setDok("");
    setNot("");
    setFormError("");
  };

  const clearKegiatanPage = async () => {
    if (!canClearPage) return;

    const visibleItems = kegiatanListRaw.filter((item) => {
      if (item?.hiddenFromKegiatanPage) return false;

      if (item?.periodId) {
        return String(item.periodId) === activePeriodId;
      }

      const tanggal = item?.tanggal || item?.date || "";
      return isDateInsideRange(tanggal, activePeriodRange);
    });

    if (visibleItems.length === 0) {
      alert("Daftar kegiatan pada halaman ini sudah kosong.");
      return;
    }

    const ok = confirm(
      "Clear daftar kegiatan di halaman ini? Data akan hilang dari halaman Kegiatan, tetapi tetap tersimpan di Arsip."
    );
    if (!ok) return;

    try {
      const updatedItems = await Promise.all(
        visibleItems.map((item) =>
          archiveKegiatanApi(item.id, {
            page_removed_by: sessionLoginId || "admin",
          })
        )
      );

      const updatedMap = new Map(updatedItems.map((item) => [String(item.id), item]));

      setState((s) => ({
        ...s,
        kegiatans: (Array.isArray(s?.kegiatans) ? s.kegiatans : []).map((k) =>
          updatedMap.get(String(k.id)) || k
        ),
        kegiatan: undefined,
      }));
    } catch (err) {
      alert(err.message || "Gagal clear kegiatan.");
    }
  };

  const addKegiatan = async () => {
    if (!canUseForm) return;

    setFormError("");

    if (!isFormValid) {
      setFormError("Mohon isi Nama Kegiatan, Tanggal, Lokasi, dan PIC.");
      return;
    }

    const payload = {
      periodId: activePeriodId,
      title: String(title || "").trim(),
      tanggal,
      lokasi: String(lokasi || "").trim(),
      pic: String(pic || "").trim(),
      dokLink: String(dok || "").trim(),
      notulensiLink: String(not || "").trim(),
      deskripsi: "",
      hiddenFromKegiatanPage: false,
    };

    try {
      const created = await createKegiatanApi(payload, activePeriodId);

      setState((s) => ({
        ...s,
        kegiatans: [
          created,
          ...(Array.isArray(s?.kegiatans) ? s.kegiatans : []),
        ],
        kegiatan: undefined,
      }));

      resetForm();
    } catch (err) {
      setFormError(err.message || "Gagal menambah kegiatan.");
    }
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [active, setActive] = useState(null);

  const openView = (k) => {
    setActive(k);
    setViewOpen(true);
  };

  const closeAll = () => {
    setViewOpen(false);
    setEditOpen(false);
    setActive(null);
  };

  const [editTitle, setEditTitle] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editLokasi, setEditLokasi] = useState("");
  const [editPic, setEditPic] = useState("");
  const [editDok, setEditDok] = useState("");
  const [editNot, setEditNot] = useState("");
  const [editError, setEditError] = useState("");

  const openEditFromView = () => {
    if (!active) return;
    if (!canEdit(active)) return;

    setViewOpen(false);
    setEditOpen(true);

    setEditTitle(active.title || "");
    setEditTanggal(active.tanggal || "");
    setEditLokasi(active.lokasi || "");
    setEditPic(active.pic || "");
    setEditDok(active.dokLink || "");
    setEditNot(active.notulensiLink || "");
    setEditError("");
  };

  const isEditValid = useMemo(() => {
    return Boolean(String(editTitle || "").trim()) && Boolean(editTanggal);
  }, [editTitle, editTanggal]);

  const saveEdit = async () => {
    setEditError("");
    if (!active) return;

    if (!canEdit(active)) {
      setEditError("Hanya Admin dan EC yang dapat mengedit.");
      return;
    }

    if (isDokumentasiOnlyEdit) {
      const payload = {
        ...active,
        dokLink: String(editDok || "").trim(),
      };

      try {
        const updated = await updateKegiatanApi(active.id, payload, activePeriodId);

        setState((s) => ({
          ...s,
          kegiatans: (Array.isArray(s?.kegiatans) ? s.kegiatans : []).map((k) =>
            String(k.id) !== String(active.id) ? k : updated
          ),
          kegiatan: undefined,
        }));

        closeAll();
      } catch (err) {
        setEditError(err.message || "Gagal mengubah dokumentasi.");
      }

      return;
    }

    if (!isEditValid) {
      setEditError("Mohon isi minimal: Nama kegiatan dan Tanggal.");
      return;
    }

    const payload = {
      ...active,
      periodId: active.periodId || activePeriodId,
      title: String(editTitle || "").trim(),
      tanggal: editTanggal,
      lokasi: String(editLokasi || "").trim(),
      pic: String(editPic || "").trim(),
      dokLink: String(editDok || "").trim(),
      notulensiLink: String(editNot || "").trim(),
      deskripsi: active.deskripsi || "",
    };

    try {
      const updated = await updateKegiatanApi(active.id, payload, activePeriodId);

      setState((s) => {
        const prevList = Array.isArray(s?.kegiatans) ? s.kegiatans : [];
        const nextList = prevList.map((k) =>
          String(k.id) !== String(active.id) ? k : updated
        );

        return {
          ...s,
          kegiatans: nextList,
          kegiatan: undefined,
        };
      });

      setEditOpen(false);
      setActive(null);
    } catch (err) {
      setEditError(err.message || "Gagal mengubah kegiatan.");
    }
  };

  async function deleteKegiatan(id) {
    if (!canClearPage) return;

    const ok = confirm(
      "Hapus kegiatan ini dari halaman Kegiatan? Data tetap tersimpan di Arsip."
    );
    if (!ok) return;

    try {
      const updated = await archiveKegiatanApi(id, {
        page_removed_by: sessionLoginId || "admin",
      });

      setState((s) => ({
        ...s,
        kegiatans: (Array.isArray(s?.kegiatans) ? s.kegiatans : []).map((k) =>
          String(k.id) !== String(id) ? k : updated
        ),
        kegiatan: undefined,
      }));

      closeAll();
    } catch (err) {
      alert(err.message || "Gagal menghapus kegiatan.");
    }
  }

  const creatorLabel = (loginId) => {
    const m = members.find((x) => x.loginId === loginId);
    return m?.name || loginId || "-";
  };

  const filteredKegiatanList = useMemo(() => {
    const ql = String(q || "").trim().toLowerCase();
    if (!ql) return kegiatanList;

    return kegiatanList.filter((k) => {
      const creator = creatorLabel(k.createdBy);
      const text = [
        k?.title,
        k?.tanggal,
        k?.lokasi,
        k?.pic,
        k?.dokLink,
        k?.notulensiLink,
        creator,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(ql);
    });
  }, [kegiatanList, q, members]);

  return (
    <div className="space-y-6">
      {canUseForm ? (
        <div className={ui.card}>
          <h2 className={cx(sectionHeadingClass, "mb-4")}>Tambah Kegiatan</h2>

          {formError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {formError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className={labelClass}>Nama kegiatan *</label>
              <input
                className={ui.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nama kegiatan"
              />
            </div>

            <div>
              <label className={labelClass}>Tanggal *</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={cx(
                  ui.input,
                  theme === "dark" ? "dark-date-input" : ""
                )}
              />
            </div>

            <div>
              <label className={labelClass}>Lokasi *</label>
              <input
                className={ui.input}
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Lokasi"
              />
            </div>

            <div>
              <label className={labelClass}>PIC *</label>
              <select
                className={cx(
                  ui.input,
                  pic === "" ? "!text-gray-400" : "!text-gray-900"
                )}
                value={pic}
                onChange={(e) => setPic(e.target.value)}
              >
                <option value="" disabled className="text-gray-400">
                  Pilih PIC
                </option>
                {activeMemberOptions.map((memberName) => (
                  <option
                    key={memberName}
                    value={memberName}
                    className="text-gray-900"
                  >
                    {memberName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Link Dokumentasi</label>
              <input
                className={ui.input}
                value={dok}
                onChange={(e) => setDok(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div>
              <label className={labelClass}>Link Notulensi</label>
              <input
                className={ui.input}
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="https://docs.google.com/..."
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              className={cx(ui.button, !isFormValid ? disabledBtnClass : "")}
              onClick={addKegiatan}
              disabled={!isFormValid}
              title={!isFormValid ? "Isi minimal: Nama kegiatan dan Tanggal" : ""}
            >
              Tambah
            </button>
          </div>
        </div>
      ) : null}

      <div className={ui.card}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className={cx(sectionHeadingClass, "md:mb-0")}>Daftar Kegiatan</h2>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <input
              className={ui.input}
              style={{ maxWidth: 350 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama kegiatan / tanggal / lokasi / PIC..."
            />

            {canClearPage ? (
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost, "whitespace-nowrap")}
                onClick={clearKegiatanPage}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

         {/* DESKTOP */}
        <div className="hidden md:block mt-4 w-full overflow-x-auto max-h-[320px] overflow-y-auto pr-1">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Nama</th>
                <th className={thClass}>Tanggal</th>
                <th className={thClass}>Lokasi</th>
                <th className={thClass}>PIC</th>
                <th className={thClass}>Dokumentasi</th>
                <th className={thClass}>Notulensi</th>
                <th className={thClass}>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loadingKegiatan ? (
                <tr className={tableRowClass}>
                  <td colSpan={7} className={cx("px-4 py-6 text-center", ui.textMuted)}>
                    Memuat data kegiatan...
                  </td>
                </tr>
              ) : filteredKegiatanList.length === 0 ? (
                <tr className={tableRowClass}>
                  <td colSpan={7} className={cx("px-4 py-6 text-center", ui.textMuted)}>
                    Belum ada kegiatan.
                  </td>
                </tr>
              ) : (
                filteredKegiatanList.map((k) => (
                  <tr key={k.id} className={tableRowClass}>
                    <td className={tdClass}>
                      <div className={titleClass}>{k.title}</div>
                    </td>
                    <td className={tdClass}>{k.tanggal || "-"}</td>
                    <td className={tdClass}>{k.lokasi || "-"}</td>
                    <td className={tdClass}>
                      {k.pic || creatorLabel(k.createdBy)}
                    </td>
                    <td className={tdClass}>
                      {k.dokLink ? (
                        <a
                          href={k.dokLink}
                          target="_blank"
                          rel="noreferrer"
                          className={linkClass}
                        >
                          Lihat dokumentasi
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={tdClass}>
                      {k.notulensiLink ? (
                        <a
                          href={k.notulensiLink}
                          target="_blank"
                          rel="noreferrer"
                          className={linkClass}
                        >
                          Lihat notulensi
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                          onClick={() => openView(k)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD */}
        <div className="md:hidden mt-4 max-h-[430px] overflow-y-auto space-y-3 pr-1">
          {loadingKegiatan ? (
            <div className={cx("text-center py-6", ui.textMuted)}>
              Memuat data kegiatan...
            </div>
          ) : filteredKegiatanList.length === 0 ? (
            <div className={cx("text-center py-6", ui.textMuted)}>
              Belum ada kegiatan.
            </div>
          ) : (
            filteredKegiatanList.map((k) => (
              <div
                key={k.id}
                className={cx(
                  "rounded-2xl p-4 shadow-sm border",
                  theme === "dark"
                    ? "bg-white/5 border-white/10"
                    : "bg-white border-gray-200"
                )}
              >
                <div className="font-semibold text-base">
                  {k.title}
                </div>

                <div className="mt-2 text-sm space-y-1">
                  <div><span className={ui.textMuted}>Tanggal:</span> {k.tanggal || "-"}</div>
                  <div><span className={ui.textMuted}>Lokasi:</span> {k.lokasi || "-"}</div>
                  <div><span className={ui.textMuted}>PIC:</span> {k.pic || creatorLabel(k.createdBy)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {k.dokLink && (
                    <a href={k.dokLink} target="_blank" rel="noreferrer" className={linkClass}>
                      Dokumentasi
                    </a>
                  )}
                  {k.notulensiLink && (
                    <a href={k.notulensiLink} target="_blank" rel="noreferrer" className={linkClass}>
                      Notulensi
                    </a>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    className={cx(ui.btnBase, ui.btnGhost, "w-full")}
                    onClick={() => openView(k)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>

      {viewOpen && active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className={cx(
              "relative w-full max-w-3xl rounded-2xl p-6 shadow-xl",
              theme === "dark"
                ? "bg-slate-950 text-white"
                : "bg-white text-gray-900"
            )}
          >
            <button
              className={cx(
                "absolute right-5 top-5 rounded-xl px-3 py-2",
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-gray-100 hover:bg-gray-200"
              )}
              onClick={closeAll}
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="mb-4 text-xl font-bold">Detail Kegiatan</h3>

            <div
              className={cx(
                "rounded-2xl p-4 ring-1",
                theme === "dark"
                  ? "bg-white/5 ring-white/10"
                  : "bg-gray-50 ring-gray-200"
              )}
            >
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className={ui.textMuted2}>Nama</div>
                  <div className="font-semibold">{active.title || "-"}</div>
                </div>
                <div>
                  <div className={ui.textMuted2}>Tanggal</div>
                  <div className="font-semibold">{active.tanggal || "-"}</div>
                </div>
                <div>
                  <div className={ui.textMuted2}>Lokasi</div>
                  <div className="font-semibold">{active.lokasi || "-"}</div>
                </div>
                <div>
                  <div className={ui.textMuted2}>PIC</div>
                  <div className="font-semibold">
                    {active.pic || creatorLabel(active.createdBy)}
                  </div>
                </div>

                <div>
                  <div className={ui.textMuted2}>Dokumentasi</div>
                  {active.dokLink ? (
                    <a
                      className={linkClass}
                      href={active.dokLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat dokumentasi
                    </a>
                  ) : (
                    <div className="font-semibold">-</div>
                  )}
                </div>

                <div>
                  <div className={ui.textMuted2}>Notulensi</div>
                  {active.notulensiLink ? (
                    <a
                      className={linkClass}
                      href={active.notulensiLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat notulensi
                    </a>
                  ) : (
                    <div className="font-semibold">-</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {canEdit(active) ? (
                <>
                  <button
                    type="button"
                    className={cx(
                      ui.btnBase,
                      ui.btnPrimary,
                      "px-4 py-2 font-semibold"
                    )}
                    onClick={openEditFromView}
                  >
                    Edit
                  </button>

                {canClearPage && (
                  <button
                    type="button"
                    className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                    onClick={() => deleteKegiatan(active.id)}
                  >
                    Hapus
                  </button>
                )}
                </>
              ) : null}

              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                onClick={closeAll}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canEdit(active) && editOpen && active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className={cx(
              "relative w-full max-w-3xl rounded-2xl p-6 shadow-xl",
              theme === "dark"
                ? "bg-slate-950 text-white"
                : "bg-white text-gray-900"
            )}
          >
            <button
              className={cx(
                "absolute right-5 top-5 rounded-xl px-3 py-2",
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-gray-100 hover:bg-gray-200"
              )}
              onClick={closeAll}
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="mb-4 text-xl font-bold">Edit Kegiatan</h3>

            {editError ? (
              <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {editError}
              </div>
            ) : null}

          {isDokumentasiOnlyEdit ? (
            <div>
              <label className={labelClass}>Link Dokumentasi</label>
              <input
                className={ui.input}
                value={editDok}
                onChange={(e) => setEditDok(e.target.value)}
                placeholder="Link dokumentasi (Drive/Folder)"
              />
            </div>
          ) : (
            <>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className={labelClass}>Nama kegiatan *</label>
                <input
                  className={ui.input}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Tanggal *</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className={cx(
                    ui.input,
                    theme === "dark" ? "dark-date-input" : ""
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Lokasi</label>
                <input
                  className={ui.input}
                  value={editLokasi}
                  onChange={(e) => setEditLokasi(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>PIC</label>
                <select
                  className={cx(
                    ui.input,
                    editPic === "" ? "!text-gray-400" : "!text-gray-900"
                  )}
                  value={editPic}
                  onChange={(e) => setEditPic(e.target.value)}
                >
                  <option value="">Pilih PIC</option>
                  {editPic && !activeMemberOptions.includes(editPic) ? (
                    <option value={editPic}>{editPic}</option>
                  ) : null}
                  {activeMemberOptions.map((memberName) => (
                    <option key={memberName} value={memberName}>
                      {memberName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>Link Dokumentasi</label>
                <input
                  className={ui.input}
                  value={editDok}
                  onChange={(e) => setEditDok(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Link Notulensi</label>
                <input
                  className={ui.input}
                  value={editNot}
                  onChange={(e) => setEditNot(e.target.value)}
                />
              </div>
            </div>
            </>
          )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                onClick={closeAll}
              >
                Batal
              </button>

              <button
                type="button"
                className={cx(
                  ui.btnBase,
                  ui.btnPrimary,
                  "px-4 py-2 font-semibold",
                  !isEditValid ? disabledBtnClass : ""
                )}
                disabled={!isEditValid}
                onClick={saveEdit}
                title={
                  !isEditValid
                    ? "Isi minimal: Nama kegiatan dan Tanggal."
                    : ""
                }
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}