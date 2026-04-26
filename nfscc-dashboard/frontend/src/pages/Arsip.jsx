import React, { useEffect, useMemo, useState } from "react";
import {
  listArchivedMembersApi,
  restoreMemberApi,
  deleteMemberApi,
} from "../Services/memberService";

import {
  listArchivedKegiatanApi,
  restoreKegiatanApi,
  deleteKegiatanApi,
} from "../Services/kegiatanService";

import {
  listArchivedProkerApi,
  restoreProkerApi,
  deleteProkerApi,
} from "../Services/prokerService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

function FolderTile({ active, label, count, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group flex min-w-[180px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        active
          ? theme === "dark"
            ? "border-white/20 bg-white/10"
            : "border-gray-300 bg-gray-50"
          : theme === "dark"
          ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
          : "border-gray-200 bg-white hover:bg-gray-50"
      )}
    >
      <div className="text-[28px] leading-none">📁</div>
      <div className="min-w-0 flex-1">
        <div
          className={cx(
            "truncate text-sm font-semibold",
            theme === "dark" ? "text-slate-100" : "text-gray-900"
          )}
        >
          {label}
        </div>
        <div
          className={cx(
            "mt-0.5 text-xs",
            theme === "dark" ? "text-slate-400" : "text-gray-500"
          )}
        >
          {count} item
        </div>
      </div>
    </button>
  );
}

function LinkChip({ label, url, theme }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cx(
        "rounded-xl px-3 py-1.5 text-xs font-medium border",
        theme === "dark"
          ? "border-white/10 bg-white/5 hover:bg-white/10"
          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
      )}
    >
      {label}
    </a>
  );
}

export default function ArsipPage({ state, setState, theme, ui }) {
  const [activeFolder, setActiveFolder] = useState(null);
  const [activePeriod, setActivePeriod] = useState(null);
  const [query, setQuery] = useState("");

  const [archivedMembers, setArchivedMembers] = useState([]);
  const [allKegiatan, setAllKegiatan] = useState([]);
  const [allProker, setAllProker] = useState([]);
  const [loading, setLoading] = useState(false);
  const isAuthed = !!state?.session?.isAuthed;

  const role = String(state?.session?.role || "").toLowerCase();

  const canRestoreArchive = isAuthed;
  const canManageArchive = isAuthed && role === "admin";
  const canViewLoginId = isAuthed && (role === "admin" || role === "ec");
  const activePeriodId = String(
    state?.activePeriodId ||
      state?.activePeriod ||
      state?.session?.periodId ||
      state?.session?.period ||
      "2026"
  );

  const memberNameByLoginId = useMemo(() => {
    const map = new Map();

    const sources = [
      ...(Array.isArray(state?.members) ? state.members : []),
      ...(Array.isArray(archivedMembers) ? archivedMembers : []),
    ];

    sources.forEach((m) => {
      const loginId = String(m.loginId || m.email || "").trim().toLowerCase();
      const name = String(m.name || m.nama || "").trim();

      if (loginId && name) {
        map.set(loginId, name);
      }
    });

    return map;
  }, [state?.members, archivedMembers]);

  function getPicName(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";

    const key = raw.toLowerCase();
    return memberNameByLoginId.get(key) || raw;
  }

  async function loadAllArchiveData() {
    try {
      setLoading(true);
      const [members, kegiatan, proker] = await Promise.all([
        listArchivedMembersApi().catch((err) => {
          console.error("Archived members error:", err);
          return [];
        }),
        listArchivedKegiatanApi().catch((err) => {
          console.error("Archived kegiatan error:", err);
          return [];
        }),
        listArchivedProkerApi().catch((err) => {
          console.error("Archived proker error:", err);
          return [];
        }),
      ]);

      setArchivedMembers(Array.isArray(members) ? members : []);
      setAllKegiatan(Array.isArray(kegiatan) ? kegiatan : []);
      setAllProker(Array.isArray(proker) ? proker : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllArchiveData();
  }, [activePeriodId]);

  const anggotaItems = useMemo(() => {
    return archivedMembers.map((m) => ({
      id: String(m.id),
      category: "anggota",
      title: m.name || "-",
      periodId: String(m.periodId || ""),
      loginId: m.loginId || "",
      divisi: m.divisi || "",
      position: m.position || "",
      tahunAngkatan: m.tahunAngkatan || "",
      archivedAt: m.archivedAt || "",
      archiveReason: m.archiveReason || "",
      raw: m,
      links: [],
    }));
  }, [archivedMembers]);

  const kegiatanItems = useMemo(() => {
    return allKegiatan.map((k) => ({
      id: String(k.id),
      category: "kegiatan",
      title: k.title || "-",
      periodId: String(k.periodId || ""),
      tanggal: k.tanggal || "",
      lokasi: k.lokasi || "",
      pic: k.pic || "",
      hidden: !!k.hiddenFromKegiatanPage,
      raw: k,
      links: [
        { label: "Dokumentasi", url: normalizeUrl(k.dokLink) },
        { label: "Notulensi", url: normalizeUrl(k.notulensiLink) },
      ].filter((x) => x.url),
    }));
  }, [allKegiatan]);

  const prokerItems = useMemo(() => {
    return allProker.map((p) => ({
      id: String(p.id),
      category: "proker",
      title: p.title || "-",
      periodId: String(p.periodId || ""),
      tanggal: p.date || "",
      divisi: p.divisi || "",
      status: p.status || "",
      pic: getPicName(p.pic),
      hidden: !!p.hiddenFromProkerPage,
      raw: p,
      links: [
        { label: "Proposal", url: normalizeUrl(p.proposalLink) },
        { label: "Dokumentasi", url: normalizeUrl(p.docLink) },
        { label: "Catatan & Evaluasi", url: normalizeUrl(p.notulensiLink) },
      ].filter((x) => x.url),
    }));
  }, [allProker, memberNameByLoginId]);

  const kegiatanPeriods = useMemo(() => {
    return Array.from(new Set(kegiatanItems.map((x) => x.periodId).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  }, [kegiatanItems]);

  const prokerPeriods = useMemo(() => {
    return Array.from(new Set(prokerItems.map((x) => x.periodId).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  }, [prokerItems]);

  const anggotaPeriods = useMemo(() => {
    return Array.from(new Set(anggotaItems.map((x) => x.periodId).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  }, [anggotaItems]);

  const visibleItems = useMemo(() => {
    if (!activeFolder || !activePeriod) return [];

    const source =
      activeFolder === "anggota"
        ? anggotaItems
        : activeFolder === "kegiatan"
        ? kegiatanItems
        : prokerItems;

    const q = String(query || "").trim().toLowerCase();

    return source.filter((item) => {
      if (String(item.periodId) !== String(activePeriod)) return false;

      if (!q) return true;

      const haystack = [
        item.title,
        item.loginId,
        item.divisi,
        item.position,
        item.tahunAngkatan,
        item.tanggal,
        item.lokasi,
        item.pic,
        item.status,
        item.archiveReason,
        ...(item.links || []).map((x) => x.label),
        ...(item.links || []).map((x) => x.url),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [activeFolder, activePeriod, query, anggotaItems, kegiatanItems, prokerItems]);

  async function handleRestoreMember(item) {
    const ok = window.confirm(`Aktifkan kembali anggota "${item.title}"?`);
    if (!ok) return;

    try {
      await restoreMemberApi(item.id);
      await loadAllArchiveData();
      setState((prev) => ({
        ...prev,
        members: Array.isArray(prev?.members) ? prev.members : [],
      }));
      alert("Anggota berhasil dikembalikan.");
    } catch (err) {
      alert(err.message || "Gagal mengaktifkan kembali anggota.");
    }
  }

  async function handleRestoreKegiatan(item) {
    const ok = window.confirm(`Aktifkan kembali kegiatan "${item.title}"?`);
    if (!ok) return;

    try {
      await restoreKegiatanApi(item.id);
      await loadAllArchiveData();
      alert("Kegiatan berhasil dikembalikan.");
    } catch (err) {
      alert(err.message || "Gagal mengaktifkan kembali kegiatan.");
    }
  }

  async function handleRestoreProker(item) {
    const ok = window.confirm(`Aktifkan kembali proker "${item.title}"?`);
    if (!ok) return;

    try {
      await restoreProkerApi(item.id);
      await loadAllArchiveData();
      alert("Proker berhasil dikembalikan.");
    } catch (err) {
      alert(err.message || "Gagal mengaktifkan kembali proker.");
    }
  }

  async function handleDeleteArchive(item) {
    const ok = window.confirm(`Hapus permanen "${item.title}" dari arsip?`);
    if (!ok) return;

    try {
      if (item.category === "anggota") {
        await deleteMemberApi(item.id);
      } else if (item.category === "kegiatan") {
        await deleteKegiatanApi(item.id);
      } else if (item.category === "proker") {
        await deleteProkerApi(item.id);
      }

      await loadAllArchiveData();
      alert("Data berhasil dihapus permanen.");
    } catch (err) {
      alert(err.message || "Gagal menghapus data.");
    }
  }

  return (
    <div className="space-y-6">
      <div className={ui.card}>
        <div>
          <h1 className="text-2xl font-semibold">Arsip</h1>
          <p className={cx("mt-2 text-sm", ui.textMuted)}>
            Arsip digital untuk seluruh link kegiatan, proker, dan anggota.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <FolderTile
            theme={theme}
            active={activeFolder === "kegiatan"}
            label="Arsip Kegiatan"
            count={kegiatanItems.length}
            onClick={() => {
              setActiveFolder("kegiatan");
              setActivePeriod(kegiatanPeriods[0] || null);
            }}
          />
          <FolderTile
            theme={theme}
            active={activeFolder === "proker"}
            label="Arsip Proker"
            count={prokerItems.length}
            onClick={() => {
              setActiveFolder("proker");
              setActivePeriod(prokerPeriods[0] || null);
            }}
          />
          <FolderTile
            theme={theme}
            active={activeFolder === "anggota"}
            label="Arsip Anggota"
            count={anggotaItems.length}
            onClick={() => {
              setActiveFolder("anggota");
              setActivePeriod(anggotaPeriods[0] || null);
            }}
          />
        </div>
      </div>

      {activeFolder ? (
        <div className={ui.card}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-semibold">
                Folder Periode Arsip{" "}
                {activeFolder === "kegiatan"
                  ? "Kegiatan"
                  : activeFolder === "proker"
                  ? "Proker"
                  : "Anggota"}
              </div>
            </div>

            <input
              className={cx(ui.input, "w-full md:w-[320px]")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari arsip..."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {(activeFolder === "kegiatan"
              ? kegiatanPeriods
              : activeFolder === "proker"
              ? prokerPeriods
              : anggotaPeriods
            ).map((pid) => (
              <FolderTile
                key={pid}
                theme={theme}
                active={String(activePeriod) === String(pid)}
                label={`Periode ${pid}`}
                count={
                  (activeFolder === "kegiatan"
                    ? kegiatanItems
                    : activeFolder === "proker"
                    ? prokerItems
                    : anggotaItems
                  ).filter((x) => String(x.periodId) === String(pid)).length
                }
                onClick={() => setActivePeriod(pid)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeFolder && activePeriod ? (
        <div className={ui.card}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">
              Isi Folder Arsip {activeFolder} - Periode {activePeriod}
            </div>
            <div className={cx("text-sm", ui.textMuted)}>
              {visibleItems.length} item
            </div>
          </div>

          {loading ? (
            <div className={cx("text-sm", ui.textMuted)}>Memuat arsip...</div>
          ) : visibleItems.length === 0 ? (
            <div className={cx("text-sm", ui.textMuted)}>
              Belum ada arsip pada folder ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
              {visibleItems.map((item) => (
                <div
                  key={`${item.category}-${item.id}-${item.periodId}`}
                  className={cx(
                    "flex h-full flex-col rounded-2xl border p-5",
                    theme === "dark"
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div className="text-lg font-semibold">{item.title}</div>

                  <div className={cx("mt-3 space-y-1 text-sm", ui.textMuted, "flex-1")}>
                    {item.category === "anggota" ? (
                      <>
                        {canViewLoginId && (
                        <div>Login ID: {item.loginId || "-"}</div>
                        )}
                        <div>Divisi: {item.divisi || "-"}</div>
                        <div>Posisi: {item.position || "-"}</div>
                        <div>Tahun Angkatan: {item.tahunAngkatan || "-"}</div>
                        <div>Alasan: {item.archiveReason || "-"}</div>
                      </>
                    ) : item.category === "kegiatan" ? (
                      <>
                        <div>Tanggal: {item.tanggal || "-"}</div>
                        <div>Lokasi: {item.lokasi || "-"}</div>
                        <div>PIC: {item.pic || "-"}</div>
                        <div>
                          Status halaman: {item.hidden ? "Masuk arsip saja" : "Masih tampil di halaman"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>Tanggal: {item.tanggal || "-"}</div>
                        <div>Divisi: {item.divisi || "-"}</div>
                        <div>Status: {item.status || "-"}</div>
                        <div>PIC: {item.pic || "-"}</div>
                        <div>
                          Status halaman: {item.hidden ? "Masuk arsip saja" : "Masih tampil di halaman"}
                        </div>
                      </>
                    )}
                  </div>

                  {item.links?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.links.map((link) => (
                        <LinkChip
                          key={`${item.id}-${link.label}-${link.url}`}
                          label={link.label}
                          url={link.url}
                          theme={theme}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2 pt-2">
                    {canManageArchive && (
                      <>
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnGhost)}
                          onClick={() => {
                            if (item.category === "anggota") window.location.href = "/anggota";
                            if (item.category === "kegiatan") window.location.href = "/kegiatan";
                            if (item.category === "proker") window.location.href = "/proker";
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={cx(ui.btnBase, "border border-red-300 text-red-600 hover:bg-red-50")}
                          onClick={() => handleDeleteArchive(item)}
                        >
                          Hapus
                        </button>
                      </>
                    )}
                    {item.category === "anggota" ? (
                      canRestoreArchive ? (
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnPrimary)}
                          onClick={() => handleRestoreMember(item)}
                        >
                          Aktifkan Kembali
                        </button>
                      ) : (
                        <span className={cx("text-sm", ui.textMuted)}>
                          Hanya pengguna login yang dapat mengaktifkan kembali data.
                        </span>
                      )
                    ) : item.category === "kegiatan" ? (
                      item.hidden ? (
                        canRestoreArchive ? (
                          <button
                            type="button"
                            className={cx(ui.btnBase, ui.btnPrimary)}
                            onClick={() => handleRestoreKegiatan(item)}
                          >
                            Aktifkan Kembali
                          </button>
                        ) : (
                          <span className={cx("text-sm", ui.textMuted)}>
                            Tersimpan di arsip
                          </span>
                        )
                      ) : (
                        <span className={ui.badgeGreen}>Sudah tampil di halaman</span>
                      )
                    ) : item.hidden ? (
                      canRestoreArchive ? (
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnPrimary)}
                          onClick={() => handleRestoreProker(item)}
                        >
                          Aktifkan Kembali
                        </button>
                      ) : (
                        <span className={cx("text-sm", ui.textMuted)}>
                          Tersimpan di arsip
                        </span>
                      )
                    ) : (
                      <span className={ui.badgeGreen}>Sudah tampil di halaman</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}