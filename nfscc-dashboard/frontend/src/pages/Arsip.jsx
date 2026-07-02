import React, { useEffect, useMemo, useState } from "react";
import { getPeriods } from "../storage";
import {
  listArchivedMembersApi,
  restoreMemberApi,
  deleteMemberApi,
  updateMemberApi,
} from "../Services/memberService";

import {
  listArchivedKegiatanApi,
  restoreKegiatanApi,
  deleteKegiatanApi,
  updateKegiatanApi,
} from "../Services/kegiatanService";

import {
  listArchivedProkerApi,
  restoreProkerApi,
  deleteProkerApi,
  updateProkerApi,
} from "../Services/prokerService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

function getPicDisplayName(loginId, memberMap) {
  const key = String(loginId || "").toLowerCase();
  return memberMap.get(key) || loginId || "-";
}

const DIVISI_ALIASES = {
  "r&e": "research and education",
  "research and education": "research and education",

  "pr": "public relation",
  "public relation": "public relation",
  "public relations": "public relation",

  "hrd": "human resource development",
  "human resource development": "human resource development",

  "cmd": "creative media & documentation",
  "creative media & documentation": "creative media & documentation",
  "creative media and documentation": "creative media & documentation",

  "lead": "lead",
  "secretary": "secretary",
  "treasurer": "treasurer",
};

function normalizeDivisiName(value) {
  const v = String(value || "").trim().toLowerCase();
  return DIVISI_ALIASES[v] || v;
}

function normalizeDivisiForSelect(value) {
  const v = String(value || "").trim().toLowerCase();

  if (
    v === "research and education" ||
    v === "r&e"
  ) {
    return "R&E";
  }

  if (v === "public relation") {
    return "PR";
  }

  if (v === "human resource development") {
    return "HRD";
  }

  if (
    v === "creative media & documentation" ||
    v === "creative media and documentation"
  ) {
    return "CMD";
  }

  return value;
}

const DIVISI_OPTIONS = [
  "Lead",
  "PR",
  "HRD",
  "CMD",
  "R&E",
  "Secretary",
  "Treasurer",
];

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
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [pendingEditForm, setPendingEditForm] = useState(null);
  const isAuthed = !!state?.session?.isAuthed;

  const role = String(state?.session?.role || "").toLowerCase();

  const canRestoreArchive =
    isAuthed && ["admin", "ec"].includes(role);

  const canManageArchive =
    isAuthed && ["admin", "ec"].includes(role);
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

      const periodIds = Array.from(
        new Set([
          "2025",
          "2026",
          ...(getPeriods() || []).map((p) => String(p.id)),
        ])
      );

      const [allMembers, membersByPeriod, kegiatan, proker] = await Promise.all([
        listArchivedMembersApi().catch((err) => {
          console.error("All archived members error:", err);
          return [];
        }),

        Promise.all(
          periodIds.map((pid) =>
            listArchivedMembersApi(pid).catch((err) => {
              console.error("Archived members error:", pid, err);
              return [];
            })
          )
        ),

        listArchivedKegiatanApi().catch((err) => {
          console.error("Archived kegiatan error:", err);
          return [];
        }),

        listArchivedProkerApi().catch((err) => {
          console.error("Archived proker error:", err);
          return [];
        }),
      ]);

      const mergedMembers = [...allMembers, ...membersByPeriod.flat()];
      const uniqueMembers = Array.from(
        new Map(mergedMembers.map((m) => [String(m.id), m])).values()
      );

      setArchivedMembers(uniqueMembers);
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
      pic: p.pic || "",
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

  async function handleSaveEdit(form) {
    try {
      if (!editingItem) return;

      if (editingItem.category === "anggota") {
        await updateMemberApi(editingItem.id, {
          ...editingItem.raw,
          name: form.title,
          loginId: form.loginId,
          divisi:
            normalizeDivisiName(form.divisi) ===
            "research and education"
              ? "R&E"
              : form.divisi,
          position: form.position,
          tahunAngkatan: form.tahunAngkatan,
          periodId: form.periodId,
          archiveReason: form.archiveReason,
        });
      }

      if (editingItem.category === "kegiatan") {
        await updateKegiatanApi(
          editingItem.id,
          {
            ...editingItem.raw,
            title: form.title,
            tanggal: form.tanggal,
            lokasi: form.lokasi,
            pic: form.pic,
            dokLink: form.dokLink,
            notulensiLink: form.notulensiLink,
          },
          editingItem.periodId
        );
      }

      if (editingItem.category === "proker") {
        await updateProkerApi(
          editingItem.id,
          {
            ...editingItem.raw,
            title: form.title,
            divisi:
              normalizeDivisiName(form.divisi) ===
              "research and education"
                ? "R&E"
                : form.divisi,
            date: form.tanggal,
            pic: form.pic,
            budget: form.budget,
            location: form.location,
            status: form.status,
            proposalLink: form.proposalLink,
            docLink: form.docLink,
            notulensiLink: form.notulensiLink,
          },
          editingItem.periodId
        );
      }

      setEditOpen(false);
      setEditingItem(null);

      await loadAllArchiveData();

      alert("Data berhasil diperbarui.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal update data");
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

  async function confirmSaveEdit() {
    if (!pendingEditForm) return;

    setConfirmEditOpen(false);

    await handleSaveEdit(pendingEditForm);

    setPendingEditForm(null);
  }

  function EditModal({
    open,
    item,
    onClose,
    onSave,
    ui,
    theme,
    state,
  }) {
    const [form, setForm] = useState({});
    const picOptions = useMemo(() => {
      const selectedDiv = normalizeDivisiName(form.divisi);

      const allMembers = [
        ...(state?.members || []),
        ...(archivedMembers || []),
      ];

    const currentPicMeta = useMemo(() => {
      if (!form.pic) return null;

      const allMembers = [
        ...(state?.members || []),
        ...(archivedMembers || []),
      ];

      const selectedDiv = normalizeDivisiName(form.divisi);
      const currentPeriod = String(form.periodId || item?.periodId || "");

      const member = allMembers.find(
        (m) => String(m?.loginId || "") === String(form.pic || "")
      );

      if (!member) {
        return {
          exists: false,
          label: "anggota tidak ditemukan",
        };
      }

      const samePeriod =
        String(member?.periodId || "") === currentPeriod;

      const sameDivision =
        normalizeDivisiName(member?.divisi) === selectedDiv;

      if (samePeriod && sameDivision) {
        return {
          exists: true,
          label: "",
        };
      }

      if (samePeriod && !sameDivision) {
        return {
          exists: true,
          label: "divisi lain",
        };
      }

      if (!samePeriod && sameDivision) {
        return {
          exists: true,
          label: "periode lain",
        };
      }

      return {
        exists: true,
        label: "divisi & periode lain",
      };
    }, [
      form.pic,
      form.divisi,
      form.periodId,
      item?.periodId,
      state?.members,
      archivedMembers,
    ]);

      console.log("=== DEBUG PIC ===");
      console.log("Divisi Proker :", form.divisi);
      console.log("Divisi Normal :", selectedDiv);
      console.table(
        allMembers.map((m) => ({
          nama: m.name,
          divisi: m.divisi,
          loginId: m.loginId,
        }))
      );

      const currentPeriod = String(form.periodId || item?.periodId || "");

      const filtered = allMembers.filter(
        (m) =>
          normalizeDivisiName(m?.divisi) === selectedDiv &&
          String(m?.periodId || "") === currentPeriod
      );

      console.table(
        filtered.map((m) => ({
          nama: m.name,
          divisi: m.divisi,
        }))
      );

      return filtered.sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      );
    }, [
      state?.members,
      archivedMembers,
      form.divisi,
      form.periodId,
      item?.periodId,
    ]);

    useEffect(() => {
      if (item) {
        setForm({
          title: item.title || "",
          tanggal: item.tanggal || "",
          lokasi: item.lokasi || "",
          location: item.raw?.location || "",
          divisi: normalizeDivisiForSelect(item.divisi),
          status: item.status || "",
          pic: item.raw?.pic || item.pic || "",

          budget: item.raw?.budget || "",

          proposalLink: item.raw?.proposalLink || "",
          dokLink: item.raw?.dokLink || "",
          notulensiLink: item.raw?.notulensiLink || "",

          loginId: item.loginId || "",
          position: item.position || "",
          tahunAngkatan: item.tahunAngkatan || "",

          periodId: item.periodId || "",

          archiveReason: item.archiveReason || "",
        });
      }
    }, [item]);

    if (!open || !item) return null;

    function handleChange(key, value) {
      setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e) {
      e.preventDefault();

      if (item.category === "kegiatan") {
        if (
          !form.title?.trim() ||
          !form.tanggal?.trim() ||
          !form.lokasi?.trim() ||
          !form.pic?.trim()
        ) {
          alert("Semua field bertanda * wajib diisi.");
          return;
        }
      }

      if (item.category === "proker") {
        if (
          !form.title?.trim() ||
          !form.divisi?.trim() ||
          !form.tanggal?.trim() ||
          !form.pic?.trim() ||
          !form.status?.trim()
        ) {
          alert("Semua field bertanda * wajib diisi.");
          return;
        }
      }

      if (item.category === "anggota") {
        if (
          !form.title?.trim() ||
          !form.loginId?.trim() ||
          !form.divisi?.trim() ||
          !form.position?.trim() ||
          !form.tahunAngkatan?.trim()
        ) {
          alert("Semua field wajib diisi.");
          return;
        }
      }

      setPendingEditForm(form);
      setConfirmEditOpen(true);
    }

    return (
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className={cx(
             "w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border p-8 space-y-5",
              theme === "dark"
                ? "bg-slate-900 border-white/10"
                : "bg-white border-gray-200"
            )}
          >
            <div className="text-lg font-semibold">Edit Data</div>

            {/* FIELD DINAMIS */}

            {item.category === "kegiatan" && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className={ui.label}>Nama kegiatan *</label>
                    <input
                      className={ui.input}
                      value={form.title || ""}
                      onChange={(e) => handleChange("title", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={ui.label}>Tanggal *</label>
                    <input
                      type="date"
                      className={ui.input}
                      value={form.tanggal || ""}
                      onChange={(e) => handleChange("tanggal", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={ui.label}>Lokasi *</label>
                    <input
                      className={ui.input}
                      value={form.lokasi || ""}
                      onChange={(e) => handleChange("lokasi", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={ui.label}>PIC *</label>
                    <select
                      className={ui.select || ui.input}
                      value={form.pic || ""}
                      onChange={(e) => handleChange("pic", e.target.value)}
                    >
                      <option value="">Pilih PIC</option>

                      {form.pic &&
                      ![...(state?.members || []), ...(archivedMembers || [])]
                        .some((m) => m.loginId === form.pic) && (
                        <option value={form.pic}>
                          {getPicName(form.pic)}
                        </option>
                      )}

                    {[...(state?.members || []), ...(archivedMembers || [])]
                      .filter(
                        (m) =>
                          String(m.periodId || "") ===
                          String(form.periodId || item.periodId)
                      )
                      .filter(
                        (m, i, arr) =>
                          arr.findIndex(
                            (x) => x.loginId === m.loginId
                          ) === i
                      )
                      .sort((a, b) =>
                        String(a.name || "").localeCompare(String(b.name || ""))
                      )
                      .map((member) => (
                        <option
                          key={member.id || member.loginId}
                          value={member.loginId}
                        >
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={ui.label}>Link Dokumentasi</label>
                    <input
                      className={ui.input}
                      value={form.dokLink || ""}
                      onChange={(e) => handleChange("dokLink", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={ui.label}>Link Notulensi</label>
                    <input
                      className={ui.input}
                      value={form.notulensiLink || ""}
                      onChange={(e) => handleChange("notulensiLink", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {item.category === "proker" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

                <div className="xl:col-span-4">
                  <label className={ui.label}>Nama Proker *</label>
                  <input
                    className={ui.input}
                    value={form.title || ""}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-2">
                  <label className={ui.label}>Divisi *</label>
                  <select
                    className={ui.select || ui.input}
                    value={form.divisi || ""}
                    onChange={(e) => handleChange("divisi", e.target.value)}
                  >
                    {DIVISI_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-2">
                  <label className={ui.label}>Tanggal Event *</label>
                  <input
                    type="date"
                    className={ui.input}
                    value={form.tanggal || ""}
                    onChange={(e) => handleChange("tanggal", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-4">
                  <label className={ui.label}>PIC *</label>

                  <select
                    className={ui.select || ui.input}
                    value={form.pic || ""}
                    onChange={(e) => handleChange("pic", e.target.value)}
                  >
                    <option value="">Pilih PIC</option>

                    {form.pic &&
                      !picOptions.some((m) => m.loginId === form.pic) && (
                        <option value={form.pic}>
                          {getPicName(form.pic)}
                          {currentPicMeta?.label ? ` (${currentPicMeta.label})` : ""}
                        </option>
                      )}

                    {picOptions.map((m) => (
                      <option
                        key={m.loginId}
                        value={m.loginId}
                      >
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-3">
                  <label className={ui.label}>Anggaran (Rp)</label>
                  <input
                    className={ui.input}
                    value={form.budget || ""}
                    onChange={(e) => handleChange("budget", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-5">
                  <label className={ui.label}>Lokasi</label>
                  <input
                    className={ui.input}
                    value={form.location || ""}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-4">
                  <label className={ui.label}>Status Proker *</label>

                  <select
                    className={ui.select || ui.input}
                    value={form.status || ""}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="Perencanaan">Perencanaan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                <div className="xl:col-span-4">
                  <label className={ui.label}>Link Proposal</label>
                  <input
                    className={ui.input}
                    value={form.proposalLink || ""}
                    onChange={(e) => handleChange("proposalLink", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-4">
                  <label className={ui.label}>Link Dokumentasi</label>
                  <input
                    className={ui.input}
                    value={form.docLink || ""}
                    onChange={(e) => handleChange("docLink", e.target.value)}
                  />
                </div>

                <div className="xl:col-span-4">
                  <label className={ui.label}>Link Catatan & Evaluasi</label>
                  <input
                    className={ui.input}
                    value={form.notulensiLink || ""}
                    onChange={(e) => handleChange("notulensiLink", e.target.value)}
                  />
                </div>

              </div>
            )}

            {item.category === "anggota" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className={ui.label}>Nama Lengkap *</label>
                  <input
                    className={ui.input}
                    value={form.title || ""}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />
                </div>

                <div>
                  <label className={ui.label}>Login ID *</label>
                  <input
                    className={ui.input}
                    value={form.loginId || ""}
                    onChange={(e) => handleChange("loginId", e.target.value)}
                  />
                </div>

                <div>
                  <label className={ui.label}>Divisi *</label>

                  <select
                    className={ui.select || ui.input}
                    value={form.divisi || ""}
                    onChange={(e) => handleChange("divisi", e.target.value)}
                  >
                    {DIVISI_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={ui.label}>Jabatan *</label>
                  <select
                    className={ui.select || ui.input}
                    value={form.position || ""}
                    onChange={(e) => handleChange("position", e.target.value)}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Executive Committee">Executive Committee</option>
                    <option value="Vice Lead">Vice Lead</option>
                    <option value="Lead">Lead</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className={ui.label}>Tahun Angkatan *</label>
                  <input
                    className={ui.input}
                    value={form.tahunAngkatan || ""}
                    onChange={(e) => handleChange("tahunAngkatan", e.target.value)}
                  />
                </div>

                <div>
                  <label className={ui.label}>Periode *</label>
                  <select
                    className={ui.select || ui.input}
                    value={form.periodId || ""}
                    onChange={(e) => handleChange("periodId", e.target.value)}
                  >
                    {getPeriods().map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.label || `Periode ${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={ui.label}>Alasan Arsip</label>
                  <input
                    className={ui.input}
                    value={form.archiveReason || ""}
                    onChange={(e) => handleChange("archiveReason", e.target.value)}
                  />
                </div>

              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className={cx(ui.btnBase, ui.btnPrimary)}>
                Simpan
              </button>
              <button type="button" onClick={onClose} className={cx(ui.btnBase, ui.btnGhost)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className={ui.card}>
        <div>
          <h1 className="text-2xl font-semibold">Arsip</h1>
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
                Folder Arsip{" "}
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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
              {visibleItems.map((item) => (
                <div
                  key={`${item.category}-${item.id}-${item.periodId}`}
                  className={cx(
                    "flex h-full flex-col rounded-xl border p-3",
                    theme === "dark"
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div className="text-sm font-semibold leading-snug">{item.title}</div>

                  <div className={cx("mt-2 space-y-0.5 text-xs", ui.textMuted, "flex-1")}>
                    {item.category === "anggota" ? (
                      <>
                        {canViewLoginId && (
                        <div>Login ID: {item.loginId || "-"}</div>
                        )}
                        <div>Divisi: {item.divisi || "-"}</div>
                        <div>Posisi: {item.position || "-"}</div>
                        <div>Tahun Angkatan: {item.tahunAngkatan || "-"}</div>
                        <div>{item.archiveReason || "-"}</div>
                      </>
                    ) : item.category === "kegiatan" ? (
                      <>
                        <div>Tanggal: {item.tanggal || "-"}</div>
                        <div>Lokasi: {item.lokasi || "-"}</div>
                        <div>PIC: {getPicDisplayName(item.pic, memberNameByLoginId)}</div>
                        <div>
                          Status halaman: {item.hidden ? "Masuk arsip saja" : "Masih tampil di halaman"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>Tanggal: {item.tanggal || "-"}</div>
                        <div>Divisi: {item.divisi || "-"}</div>
                        <div>Status: {item.status || "-"}</div>
                        <div>PIC: {getPicDisplayName(item.pic, memberNameByLoginId)}</div>
                        <div>
                          Status halaman: {item.hidden ? "Masuk arsip saja" : "Masih tampil di halaman"}
                        </div>
                      </>
                    )}
                  </div>

                  {item.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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

                  <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                    {canManageArchive && (
                      <>
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnGhost)}
                          onClick={() => {
                            setEditingItem(item);
                            setEditOpen(true);
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
                        <span className={cx("text-xs", ui.textMuted)}>
                          Hanya Admin yang dapat mengaktifkan kembali.
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

    {confirmEditOpen && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
        <div
          className={cx(
            "w-full max-w-md rounded-2xl p-6",
            theme === "dark"
              ? "bg-slate-900 border border-white/10"
              : "bg-white border border-gray-200"
          )}
        >
          <h3 className="text-lg font-semibold">
            Simpan Perubahan?
          </h3>

          <p className={cx("mt-2 text-sm", ui.textMuted)}>
            Data arsip yang diedit akan diperbarui.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmEditOpen(false);
                setPendingEditForm(null);
              }}
              className={cx(ui.btnBase, ui.btnGhost)}
            >
              Batal
            </button>

            <button
              onClick={confirmSaveEdit}
              className={cx(ui.btnBase, ui.btnPrimary)}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    )}

    <EditModal
      open={editOpen}
      item={editingItem}
      onClose={() => {
        setEditOpen(false);
        setEditingItem(null);
      }}
      onSave={handleSaveEdit}
      ui={ui}
      theme={theme}
      state={state}
    />
  </>
  );
}