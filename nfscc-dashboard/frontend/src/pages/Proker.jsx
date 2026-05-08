import React, { useEffect, useMemo, useState } from "react";
import {
  listProkerApi,
  createProkerApi,
  updateProkerApi,
  archiveProkerApi,
} from "../Services/prokerService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function getSafeId(utils) {
  if (typeof utils?.safeId === "function") {
    return utils.safeId(String(Date.now()));
  }
  return String(Date.now());
}

function Modal({ open, title, onClose, children, ui, theme }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "w-full max-w-4xl rounded-3xl border p-6 shadow-2xl",
            theme === "dark"
              ? "border-white/10 bg-slate-950"
              : "border-gray-200 bg-white"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={ui.sectionTitle}>{title}</h2>
            <button
              type="button"
              className={`${ui.btnBase} ${ui.btnGhost}`}
              onClick={onClose}
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status, ui) {
  const s = String(status || "").toLowerCase();

  if (s === "selesai") return ui.badgeGreen;
  if (s === "perencanaan") return ui.badge;

  return ui.badge;
}

function isPastDate(dateString) {
  const value = String(dateString || "").trim();
  if (!value) return false;

  const picked = new Date(`${value}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return picked < today;
}

function normalizeDivisiName(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ");

  const map = {
    pr: "public relation",
    "public relations": "public relation",

    hrd: "human resource development",
    hr: "human resource development",

    cmd: "creative media and documentation",
    "creative media documentation": "creative media and documentation",

    pdd: "public design and documentation",
    "public design documentation": "public design and documentation",

    "r e": "research and education",
    "r and e": "research and education",
    "research education": "research and education",

    "r d": "research and development",
    "r and d": "research and development",
    "research development": "research and development",
  };

  return map[v] || v;
}

function getDisplayDivisi(value) {
  const normalized = normalizeDivisiName(value);

  const map = {
    "public relation": "PR",
    "human resource development": "HRD",
    "creative media and documentation": "CMD",
    "research and education": "R&E",
    "research and development": "R&D",
    "public design and documentation": "PDD",
  };

  return map[normalized] || value || "-";
}

export default function ProkerPage({ state, setState, theme, ui, utils }) {
  const members = Array.isArray(state?.members) ? state.members : [];
  const prokerList = Array.isArray(state?.proker) ? state.proker : [];
  const sessionLoginId = state?.session?.loginId || "";
  const isAdmin = !!state?.session?.isAdmin;

  const activePeriodId = String(
    state?.session?.currentPeriodId ||
      state?.session?.activePeriodId ||
      state?.session?.periodId ||
      state?.session?.period ||
      "2026"
  );

  const [loadingProker, setLoadingProker] = useState(false);

  async function loadProker() {
    try {
      setLoadingProker(true);
      const data = await listProkerApi(activePeriodId);

      setState((prev) => ({
        ...prev,
        proker: data,
      }));
    } catch (err) {
      console.error("Gagal memuat proker:", err);
    } finally {
      setLoadingProker(false);
    }
  }

  const is2026Plus = Number(activePeriodId) >= 2026;

  const me = isAdmin
    ? {
        loginId: sessionLoginId,
        name: "Admin",
        divisi: "Admin",
        position: "Executive Committee",
        isEC: true,
      }
    : members.find((m) => m.loginId === sessionLoginId) || null;

  const myDivisi = String(me?.divisi || "").trim();
  const myPosition = String(
    me?.position || (me?.isEC ? "Executive Committee" : "Staff")
  ).trim();

  const isEC = !!me?.isEC || myPosition === "Executive Committee";
  const isLeadOrVice = myPosition === "Lead" || myPosition === "Vice Lead";

  const normalizedDivisi = String(myDivisi || "")
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
  ].includes(normalizedDivisi);

  const isAuthed = !!state?.session?.isAuthed;

  const canViewPage = true;
  const canManagePage =
    isAuthed && (isAdmin || isLeadOrVice || isEC || isAllowedDivision);
  const canClearPage =
    isAuthed && (isAdmin || isEC || isAllowedDivision);

  const canChooseDivisi = isAuthed && (isAdmin || isLeadOrVice);
  const canChoosePic = isAuthed && (isAdmin || isLeadOrVice || isEC);

  const DIVISI_OPTIONS = [
    "Lead",
    "PR",
    "HRD",
    ...(is2026Plus ? ["CMD", "R&E"] : ["PDD", "R&D"]),
    "Secretary",
    "Treasurer",
  ];

  const STATUS_OPTIONS = ["Perencanaan", "Selesai"];

  const [title, setTitle] = useState("");
  const [divisi, setDivisi] = useState(
    canChooseDivisi ? "Lead" : myDivisi || "Lead"
  );
  const [date, setDate] = useState("");
  const [pic, setPic] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("Perencanaan");
  const [proposalLink, setProposalLink] = useState("");
  const [docLink, setDocLink] = useState("");
  const [notulensiLink, setNotulensiLink] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!canChooseDivisi) {
      setDivisi(myDivisi || "Lead");
    }
  }, [canChooseDivisi, myDivisi]);

  useEffect(() => {
    if (!activePeriodId) return;
    loadProker();
  }, [activePeriodId]);

  useEffect(() => {
    if (!date) return;

    if (isPastDate(date)) {
      setStatus("Selesai");
    } else {
      setStatus("Perencanaan");
    }
  }, [date]);

  const thClass = "whitespace-nowrap px-4 py-2 text-left";
  const tdClass = "px-3 py-3 text-[14px] font-normal leading-6 align-top";
  const titleClass = "text-[14px] font-semibold leading-6";
  const sectionHeadingClass =
    "text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight";

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

  function isSameActivePeriod(item) {
    return String(item?.periodId || "") === activePeriodId;
  }

  async function clearProkerPage() {
    if (!canClearPage) return;

    const visibleItems = prokerList.filter((item) => {
      if (!isSameActivePeriod(item)) return false;
      if (item?.hiddenFromProkerPage) return false;
      return true;
    });

    if (visibleItems.length === 0) {
      alert("Daftar proker pada halaman ini sudah kosong.");
      return;
    }

    const ok = confirm(
      "Clear daftar proker di halaman ini? Data akan masuk ke Arsip."
    );
    if (!ok) return;

    try {
      const updatedItems = await Promise.all(
        visibleItems.map((item) =>
          archiveProkerApi(item.id, {
            page_removed_by: sessionLoginId || "admin",
          })
        )
      );

      const updatedMap = new Map(updatedItems.map((i) => [String(i.id), i]));

      setState((prev) => ({
        ...prev,
        proker: prev.proker.map((item) =>
          updatedMap.get(String(item.id)) || item
        ),
      }));
    } catch (err) {
      alert(err.message || "Gagal clear proker.");
    }
  }

  const picOptions = useMemo(() => {
    const selectedDiv = normalizeDivisiName(divisi);

    const base = members.filter((m) => {
      const memberDiv = normalizeDivisiName(m?.divisi);
      return memberDiv === selectedDiv;
    });

    return base.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [members, divisi]);

  useEffect(() => {
    if (!picOptions.length) {
      setPic("");
      return;
    }
    const exists = picOptions.some((m) => m.loginId === pic);
    if (!exists) {
      setPic(picOptions[0].loginId);
    }
  }, [picOptions, pic]);

  function resetForm() {
    setTitle("");
    setDivisi(canChooseDivisi ? "Lead" : myDivisi || "Lead");
    setDate("");
    setPic("");
    setBudget("");
    setNote("");
    setStatus("Perencanaan");
    setProposalLink("");
    setDocLink("");
    setNotulensiLink("");
  }

  async function addProker(e) {
    e.preventDefault();
    if (!canManagePage) return;

    const finalTitle = String(title || "").trim();
    const finalDivisi = String(divisi || "").trim();
    const finalDate = String(date || "").trim();
    const finalPic = String(pic || "").trim();
    const autoStatus = isPastDate(finalDate) ? "Selesai" : "Perencanaan";

    if (!finalTitle) return alert("Nama proker wajib diisi.");
    if (!finalDivisi) return alert("Divisi wajib dipilih.");
    if (!finalDate) return alert("Tanggal wajib diisi.");
    if (!finalPic) return alert("PIC wajib dipilih.");

    const selectedPicMember = members.find(
      (m) => String(m.loginId || m.email) === finalPic
    );

    const nextItem = {
      periodId: activePeriodId,
      title: finalTitle,
      divisi: finalDivisi,
      date: finalDate,
      pic: finalPic,
      budget: String(budget || "").trim(),
      note: String(note || "").trim(),
      status: autoStatus,
      proposalLink: String(proposalLink || "").trim(),
      docLink: String(docLink || "").trim(),
      notulensiLink: String(notulensiLink || "").trim(),
      hiddenFromProkerPage: false,
      archived: false,
      picName: selectedPicMember?.name || selectedPicMember?.nama || finalPic,
      divisiLabel: getDisplayDivisi(finalDivisi),
    };

    try {
      const created = await createProkerApi(nextItem, activePeriodId);

      setState((prev) => ({
        ...prev,
        proker: [
          ...(Array.isArray(prev.proker) ? prev.proker : []).filter(
            (p) => String(p.id) !== String(created.id)
          ),
          created,
        ],
      }));

      resetForm();
    } catch (err) {
      alert(err.message || "Gagal menambah proker.");
    }
  }

  const filteredList = useMemo(() => {
    const ql = String(q || "").trim().toLowerCase();

    const periodRows = [...prokerList].filter((item) => {
      if (!isSameActivePeriod(item)) return false;
      if (item?.hiddenFromProkerPage) return false;
      return true;
    });

    if (!ql) return periodRows.reverse();

    return periodRows
      .filter((p) => {
        const picName =
          members.find((m) => m.loginId === p.pic)?.name || p.pic || "";
        return (
          String(p?.title || "").toLowerCase().includes(ql) ||
          String(p?.divisi || "").toLowerCase().includes(ql) ||
          String(p?.status || "").toLowerCase().includes(ql) ||
          String(picName || "").toLowerCase().includes(ql)
        );
      })
      .reverse();
  }, [prokerList, q, members, activePeriodId]);

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [active, setActive] = useState(null);

  const editingItem =
    prokerList.find((item) => String(item.id) === String(editingId)) || null;

  const [eTitle, setETitle] = useState("");
  const [eDivisi, setEDivisi] = useState("Lead");
  const [eDate, setEDate] = useState("");
  const [ePic, setEPic] = useState("");
  const [eBudget, setEBudget] = useState("");
  const [eNote, setENote] = useState("");
  const [eStatus, setEStatus] = useState("Perencanaan");
  const [eProposalLink, setEProposalLink] = useState("");
  const [eDocLink, setEDocLink] = useState("");
  const [eNotulensiLink, setENotulensiLink] = useState("");

  const editPicOptions = useMemo(() => {
    const selectedDiv = normalizeDivisiName(eDivisi);

    return members
      .filter((m) => normalizeDivisiName(m?.divisi) === selectedDiv)
      .sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      );
  }, [members, eDivisi]);

  useEffect(() => {
    if (!editingItem) return;
    setETitle(String(editingItem.title || ""));
    setEDivisi(String(editingItem.divisi || "Lead"));
    setEDate(String(editingItem.date || ""));
    setEPic(String(editingItem.pic || ""));
    setEBudget(String(editingItem.budget || ""));
    setENote(String(editingItem.note || ""));
    setEStatus(String(editingItem.status || "Perencanaan"));
    setEProposalLink(String(editingItem.proposalLink || ""));
    setEDocLink(String(editingItem.docLink || ""));
    setENotulensiLink(String(editingItem.notulensiLink || ""));
  }, [editingItem]);

  useEffect(() => {
    if (!editOpen) return;
    if (!editPicOptions.length) {
      setEPic("");
      return;
    }
    const exists = editPicOptions.some((m) => m.loginId === ePic);
    if (!exists) {
      setEPic(editPicOptions[0].loginId);
    }
  }, [editPicOptions, ePic, editOpen]);

  useEffect(() => {
    if (!editOpen) return;
    if (!canChooseDivisi) {
      setEDivisi(myDivisi || "Lead");
    }
  }, [editOpen, canChooseDivisi, myDivisi]);

  useEffect(() => {
    if (!editOpen) return;
    if (!eDate) return;

    if (isPastDate(eDate)) {
      setEStatus("Selesai");
    } else {
      setEStatus("Perencanaan");
    }
  }, [eDate, editOpen]);

  function openView(item) {
    setActive(item);
    setViewOpen(true);
  }

  function openEdit(item) {
    if (!canManagePage) return;
    setEditingId(item.id);
    setActive(item);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingId("");
  }

  function closeAll() {
    setViewOpen(false);
    setEditOpen(false);
    setEditingId("");
    setActive(null);
  }

  function openEditFromView() {
    if (!active) return;
    if (!canManagePage) return;

    setEditingId(active.id);
    setViewOpen(false);
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!canManagePage) return;
    if (!editingItem) return;

    const finalTitle = String(eTitle || "").trim();
    const finalDivisi = String(eDivisi || "").trim();
    const finalDate = String(eDate || "").trim();
    const finalPic = String(ePic || "").trim();
    const autoStatus = isPastDate(finalDate) ? "Selesai" : "Perencanaan";

    if (!finalTitle) return alert("Nama proker wajib diisi.");
    if (!finalDivisi) return alert("Divisi wajib dipilih.");
    if (!finalDate) return alert("Tanggal wajib diisi.");
    if (!finalPic) return alert("PIC wajib dipilih.");

    const selectedPicMember = members.find(
      (m) => String(m.loginId || m.email) === finalPic
    );

    const payload = {
      ...editingItem,
      periodId: editingItem.periodId || activePeriodId,
      title: finalTitle,
      divisi: finalDivisi,
      date: finalDate,
      pic: finalPic,
      budget: String(eBudget || "").trim(),
      note: String(eNote || "").trim(),
      status: autoStatus,
      proposalLink: String(eProposalLink || "").trim(),
      docLink: String(eDocLink || "").trim(),
      notulensiLink: String(eNotulensiLink || "").trim(),
      archived: editingItem.archived ?? false,
      picName: selectedPicMember?.name || selectedPicMember?.nama || finalPic,
      divisiLabel: getDisplayDivisi(finalDivisi),
    };

    try {
      const updated = await updateProkerApi(editingItem.id, payload, activePeriodId);

      setState((prev) => ({
        ...prev,
        proker: (Array.isArray(prev.proker) ? prev.proker : []).map((item) =>
          String(item.id) !== String(editingItem.id) ? item : updated
        ),
      }));

      closeEdit();
    } catch (err) {
      alert(err.message || "Gagal mengubah proker.");
    }
  }

  async function removeProkerFromPage(id) {
    if (!canManagePage) return;

    const ok = confirm(
      "Hapus proker dari halaman? Data tetap tersimpan di Arsip."
    );
    if (!ok) return;

    try {
      const updated = await archiveProkerApi(id, {
        page_removed_by: sessionLoginId || "admin",
      });

      setState((prev) => ({
        ...prev,
        proker: prev.proker.map((item) =>
          String(item.id) === String(id) ? updated : item
        ),
      }));

      closeAll();
    } catch (err) {
      alert(err.message || "Gagal menghapus proker.");
    }
  }

  function getPicName(loginId, item = null) {
    if (item?.picName) return item.picName;
    if (item?.pic_name) return item.pic_name;
    if (item?.picNama) return item.picNama;

    const key = String(loginId || "").trim().toLowerCase();

    const found = members.find((m) => {
      const mLogin = String(m.loginId || m.email || "").trim().toLowerCase();
      return mLogin === key;
    });

    return found?.name || found?.nama || loginId || "-";
  }

  return (
    <div className="space-y-6">
      {canManagePage ? (
        <div className={ui.card}>
          <h2 className={sectionHeadingClass}>Tambah Proker</h2>

          <form onSubmit={addProker} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <label className={ui.label}>Nama proker *</label>
                <input
                  className={ui.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nama proker"
                />
              </div>

              <div className="xl:col-span-3">
                <label className={ui.label}>Divisi</label>
                <select
                  className={ui.select || ui.input}
                  value={divisi}
                  onChange={(e) => setDivisi(e.target.value)}
                  disabled={!canChooseDivisi}
                >
                  {canChooseDivisi ? (
                    DIVISI_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))
                  ) : (
                    <option value={myDivisi}>{myDivisi}</option>
                  )}
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className={ui.label}>Tanggal Event *</label>
                <input
                  type="date"
                  className={cx(
                    ui.input,
                    theme === "dark" ? "dark-date-input" : ""
                  )}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="xl:col-span-3">
                <label className={ui.label}>PIC</label>
                <select
                  className={ui.select || ui.input}
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                >
                  {picOptions.length === 0 ? (
                    <option value="">Belum ada anggota di divisi ini</option>
                  ) : (
                    picOptions.map((m) => (
                      <option key={m.loginId} value={m.loginId}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className={ui.label}>Anggaran (Rp)</label>
                <input
                  className={ui.input}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Anggaran (Rp)"
                />
              </div>

              <div className="xl:col-span-5">
                <label className={ui.label}>Catatan</label>
                <input
                  className={ui.input}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan"
                />
              </div>

              <div className="xl:col-span-3">
                <label className={ui.label}>Status Proker *</label>
                <select
                  className={ui.select || ui.input}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-6">
                <label className={ui.label}>Link Proposal (optional)</label>
                <input
                  className={ui.input}
                  value={proposalLink}
                  onChange={(e) => setProposalLink(e.target.value)}
                  placeholder="Link Proposal (GDocs/GDrive) - opsional"
                />
              </div>

              <div className="xl:col-span-6">
                <label className={ui.label}>Link Dokumentasi (optional)</label>
                <input
                  className={ui.input}
                  value={docLink}
                  onChange={(e) => setDocLink(e.target.value)}
                  placeholder="Link Dokumentasi (Drive/Folder) - opsional"
                />
              </div>

              <div className="xl:col-span-6">
                <label className={ui.label}>Link Catatan & Evaluasi (optional)</label>
                <input
                  className={ui.input}
                  value={notulensiLink}
                  onChange={(e) => setNotulensiLink(e.target.value)}
                  placeholder="Link Catatan & Evaluasi (Docs/GDrive) - opsional"
                />
              </div>
            </div>

            <button
              type="submit"
              className={cx(ui.btnBase, ui.btnPrimary, "w-full")}
            >
              Tambah
            </button>
          </form>
        </div>
      ) : null}

      <div className={ui.card}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className={sectionHeadingClass}>Daftar Proker</h2>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <input
              className={ui.input}
              style={{ maxWidth: 350 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama proker / divisi / PIC / status..."
            />

            {canClearPage ? (
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost, "whitespace-nowrap")}
                onClick={clearProkerPage}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {/* DESKTOP */}
          <div className="hidden md:block mt-4 w-full overflow-x-auto max-h-[320px] overflow-y-auto pr-1">
            <table className="w-full min-w-[1420px] text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Divisi</th>
                  <th className={thClass}>Tanggal Event</th>
                  <th className={thClass}>PIC</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Anggaran</th>
                  <th className={thClass}>Proposal</th>
                  <th className={thClass}>Dokumentasi</th>
                  <th className={thClass}>Catatan &amp; Evaluasi</th>
                  <th className={thClass}>Aksi</th>
                </tr>
              </thead>

              <tbody>
                  {loadingProker ? (
                    <tr className={tableRowClass}>
                      <td className={cx(tdClass, ui.textMuted)} colSpan={10}>
                        Memuat data proker...
                      </td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                  <tr className={tableRowClass}>
                    <td className={cx(tdClass, ui.textMuted)} colSpan={10}>
                      Belum ada data proker.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item.id} className={tableRowClass}>
                      <td className={tdClass}>
                        <div className={titleClass}>{item.title}</div>
                        {item.note ? (
                          <div className={cx("mt-1", ui.helperText)}>
                            {item.note}
                          </div>
                        ) : null}
                      </td>

                      <td className={tdClass}>{item.divisiLabel || getDisplayDivisi(item.divisi)}</td>
                      <td className={tdClass}>{item.date || "-"}</td>
                      <td className={tdClass}>{getPicName(item.pic, item)}</td>

                      <td className={tdClass}>
                        <span className={getStatusBadge(item.status, ui)}>
                          {item.status || "-"}
                        </span>
                      </td>

                      <td className={tdClass}>
                        {item.budget
                          ? `Rp ${Number(item.budget || 0).toLocaleString("id-ID")}`
                          : "-"}
                      </td>

                      <td className={tdClass}>
                        {item.proposalLink ? (
                          <a
                            href={item.proposalLink}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClass}
                          >
                            Lihat proposal
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className={tdClass}>
                        {item.docLink ? (
                          <a
                            href={item.docLink}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClass}
                          >
                            Lihat dokumentasi
                          </a>
                        ) : (
                          <span className={ui.textMuted}>-</span>
                        )}
                      </td>

                      <td className={tdClass}>
                        {item.notulensiLink ? (
                          <a
                            href={item.notulensiLink}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClass}
                          >
                            Lihat catatan & evaluasi
                          </a>
                        ) : (
                          <span className={ui.textMuted}>-</span>
                        )}
                      </td>

                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className={`${ui.btnBase} ${ui.btnGhost}`}
                            onClick={() => openView(item)}
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

          {/* MOBILE */}
          <div className="md:hidden space-y-3 mt-4">
            {loadingProker ? (
              <div className="text-sm text-gray-500">Memuat data proker...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-sm text-gray-500">Belum ada data proker.</div>
            ) : (
              filteredList.map((item) => (
                <div key={item.id} className={ui.card}>
                  {/* HEADER */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className={ui.textMuted}>
                        {item.divisiLabel || getDisplayDivisi(item.divisi)} • {item.date}
                      </div>
                    </div>

                    <span className={getStatusBadge(item.status, ui)}>
                      {item.status}
                    </span>
                  </div>

                  {/* BODY */}
                  <div className="mt-2 text-sm space-y-1">
                    <div>PIC: {getPicName(item.pic, item)}</div>
                    <div>
                      Anggaran:{" "}
                      {item.budget
                        ? `Rp ${Number(item.budget).toLocaleString("id-ID")}`
                        : "-"}
                    </div>

                    {item.note && (
                      <div className="text-xs text-gray-500">{item.note}</div>
                    )}
                  </div>

                  {/* LINKS */}
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    {item.proposalLink && (
                      <a href={item.proposalLink} target="_blank" className={linkClass}>
                        Proposal
                      </a>
                    )}
                    {item.docLink && (
                      <a href={item.docLink} target="_blank" className={linkClass}>
                        Dokumentasi
                      </a>
                    )}
                    {item.notulensiLink && (
                      <a href={item.notulensiLink} target="_blank" className={linkClass}>
                        Evaluasi
                      </a>
                    )}
                  </div>

                  {/* ACTION */}
                  <div className="mt-3">
                    <button
                      className={`${ui.btnBase} ${ui.btnGhost}`}
                      onClick={() => openView(item)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {viewOpen && active ? (
        <Modal
          open={viewOpen}
          title="Detail Proker"
          onClose={closeAll}
          ui={ui}
          theme={theme}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className={ui.textMuted2}>Nama</div>
                <div className="font-semibold">{active.title || "-"}</div>
              </div>

              <div>
                <div className={ui.textMuted2}>Divisi</div>
                <div className="font-semibold">
                  {active.divisiLabel || getDisplayDivisi(active.divisi)}
                </div>
              </div>

              <div>
                <div className={ui.textMuted2}>Tanggal Event</div>
                <div className="font-semibold">{active.date || "-"}</div>
              </div>

              <div>
                <div className={ui.textMuted2}>PIC</div>
                <div className="font-semibold">{getPicName(active.pic, active)}</div>
              </div>

              <div>
                <div className={ui.textMuted2}>Status</div>
                <div>
                  <span className={getStatusBadge(active.status, ui)}>
                    {active.status || "-"}
                  </span>
                </div>
              </div>

              <div>
                <div className={ui.textMuted2}>Anggaran</div>
                <div className="font-semibold">
                  {active.budget
                    ? `Rp ${Number(active.budget || 0).toLocaleString("id-ID")}`
                    : "-"}
                </div>
              </div>

              <div>
                <div className={ui.textMuted2}>Proposal</div>
                {active.proposalLink ? (
                  <a
                    href={active.proposalLink}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    Lihat proposal
                  </a>
                ) : (
                  <div className="font-semibold">-</div>
                )}
              </div>

              <div>
                <div className={ui.textMuted2}>Dokumentasi</div>
                {active.docLink ? (
                  <a
                    href={active.docLink}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    Lihat dokumentasi
                  </a>
                ) : (
                  <div className="font-semibold">-</div>
                )}
              </div>

              <div>
                <div className={ui.textMuted2}>Catatan & Evaluasi</div>
                {active.notulensiLink ? (
                  <a
                    href={active.notulensiLink}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    Lihat catatan & evaluasi
                  </a>
                ) : (
                  <div className="font-semibold">-</div>
                )}
              </div>
            </div>

            {active.note ? (
              <div>
                <div className={ui.textMuted2}>Catatan</div>
                <div className="font-semibold">{active.note}</div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              {canManagePage ? (
                <>
                  <button
                    type="button"
                    className={`${ui.btnBase} ${ui.btnPrimary}`}
                    onClick={openEditFromView}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${ui.btnBase} ${ui.btnGhost}`}
                    onClick={() => removeProkerFromPage(active.id)}
                  >
                    Hapus dari Page
                  </button>
                </>
              ) : null}

              <button
                type="button"
                className={`${ui.btnBase} ${ui.btnGhost}`}
                onClick={closeAll}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

    {canManagePage ? (
      <Modal
        open={editOpen}
        title="Edit Proker"
        onClose={closeEdit}
        ui={ui}
        theme={theme}
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <label className={ui.label}>Nama proker *</label>
              <input
                className={ui.input}
                value={eTitle}
                onChange={(e) => setETitle(e.target.value)}
                placeholder="Nama proker"
              />
            </div>

            <div className="xl:col-span-2">
              <label className={ui.label}>Divisi</label>
              <select
                className={ui.select || ui.input}
                value={eDivisi}
                onChange={(e) => setEDivisi(e.target.value)}
                disabled={!canChooseDivisi}
              >
                {canChooseDivisi ? (
                  DIVISI_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))
                ) : (
                  <option value={myDivisi}>{myDivisi}</option>
                )}
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className={ui.label}>Tanggal Event *</label>
              <input
                type="date"
                className={cx(
                  ui.input,
                  theme === "dark" ? "dark-date-input" : ""
                )}
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
              />
            </div>

            <div className="xl:col-span-3">
              <label className={ui.label}>PIC</label>
              <select
                className={ui.select || ui.input}
                value={ePic}
                onChange={(e) => setEPic(e.target.value)}
              >
                {editPicOptions.length === 0 ? (
                  <option value="">Belum ada anggota di divisi ini</option>
                ) : (
                  editPicOptions.map((m) => (
                    <option key={m.loginId} value={m.loginId}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className={ui.label}>Anggaran (Rp)</label>
              <input
                className={ui.input}
                value={eBudget}
                onChange={(e) => setEBudget(e.target.value)}
                placeholder="Anggaran (Rp)"
              />
            </div>

            <div className="xl:col-span-5">
              <label className={ui.label}>Catatan</label>
              <input
                className={ui.input}
                value={eNote}
                onChange={(e) => setENote(e.target.value)}
                placeholder="Catatan"
              />
            </div>

            <div className="xl:col-span-3">
              <label className={ui.label}>Status Proker *</label>
              <select
                className={ui.select || ui.input}
                value={eStatus}
                onChange={(e) => setEStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-6">
              <label className={ui.label}>Link proposal (optional)</label>
              <input
                className={ui.input}
                value={eProposalLink}
                onChange={(e) => setEProposalLink(e.target.value)}
                placeholder="Link proposal (GDocs/GDrive) - opsional"
              />
            </div>

            <div className="xl:col-span-6">
              <label className={ui.label}>Link dokumentasi (optional)</label>
              <input
                className={ui.input}
                value={eDocLink}
                onChange={(e) => setEDocLink(e.target.value)}
                placeholder="Link dokumentasi (Drive/Folder) - opsional"
              />
            </div>

            <div className="xl:col-span-6">
              <label className={ui.label}>Link Catatan & Evaluasi (optional)</label>
              <input
                className={ui.input}
                value={eNotulensiLink}
                onChange={(e) => setENotulensiLink(e.target.value)}
                placeholder="Link Catatan & Evaluasi (Docs/GDrive) - opsional"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className={`${ui.btnBase} ${ui.btnPrimary}`}
            >
              Simpan
            </button>
            <button
              type="button"
              className={`${ui.btnBase} ${ui.btnGhost}`}
              onClick={closeEdit}
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    ) : null}
    </div>
  );
}