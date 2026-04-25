import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listPresensiApi,
  createPresensiApi,
  updatePresensiApi,
  deletePresensiApi,
} from "../Services/presensiService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Card({ title, right, children, ui }) {
  const sectionHeadingClass =
    "text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight";

  return (
    <div className={ui.card}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className={sectionHeadingClass}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children, footer, theme, ui }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl ring-1",
            theme === "dark"
              ? "bg-slate-950 ring-slate-800"
              : "bg-white ring-gray-200"
          )}
        >
          <div className="flex items-center justify-between gap-4 p-5 pb-3">
            <div className="text-base font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className={cx(ui.btnBase, ui.btnGhost, "h-10 w-10 !px-0 !py-0")}
              aria-label="Tutup"
              title="Tutup"
            >
              ×
            </button>
          </div>

          <div className="max-h-[calc(80vh-72px)] overflow-y-auto px-5 pb-5">
            {children}
            {footer ? (
              <div
                className={cx(
                  "sticky bottom-0 mt-4 flex items-center justify-end gap-2 pt-3",
                  theme === "dark" ? "bg-slate-950" : "bg-white"
                )}
              >
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberLine({ member, secondary, theme, ui }) {
  return (
    <div className="py-2">
      <div
        className={cx(
          "font-semibold",
          theme === "dark" ? "text-slate-100" : "text-slate-900"
        )}
      >
        {member?.name || "-"}
      </div>
      <div className={cx("text-sm", ui.textMuted2)}>
        {(member?.divisi || "-") + (secondary ? ` — ${secondary}` : "")}
      </div>
    </div>
  );
}

export default function PresensiPage({ state, setState, theme, ui, utils }) {
  const members = Array.isArray(state?.members) ? state.members : [];
  const kegiatanList = Array.isArray(state?.kegiatans)
  ? state.kegiatans
  : Array.isArray(state?.kegiatan)
  ? state.kegiatan
  : [];
  const prokerList = Array.isArray(state?.proker) ? state.proker : [];
  const presensiList = Array.isArray(state?.presensi) ? state.presensi : [];
  const activePeriod = String(
    state?.activePeriodId ||
      state?.activePeriod ||
      state?.session?.periodId ||
      state?.session?.period ||
      "2026"
  );

  async function loadPresensi() {
    try {
      const data = await listPresensiApi(activePeriod);

      const filtered = data.filter(
        (item) => String(item.periode || item.periodId || "") === String(activePeriod)
      );

      setState((prev) => ({
        ...prev,
        presensi: filtered,
      }));
    } catch (err) {
      console.error("Gagal memuat presensi:", err);
    }
  }

  useEffect(() => {
    if (!activePeriod) return;
    loadPresensi();
  }, [activePeriod]);

  const softBoxClass = cx(
    "rounded-2xl p-4 ring-1",
    theme === "dark"
      ? "bg-slate-950/40 ring-slate-800"
      : "bg-gray-50 ring-gray-200"
  );

  const memberRowClass = cx(
    "flex items-center gap-3 rounded-xl px-3 py-2 ring-1",
    theme === "dark"
      ? "bg-slate-900/60 ring-slate-800"
      : "bg-white ring-gray-200"
  );

  const checkboxClass = "h-4 w-4 accent-slate-900";

  const tableHeadClass =
    theme === "dark"
      ? "border-b border-white/10 text-slate-300"
      : "border-b border-gray-200 text-gray-600";

  const tableRowClass =
    theme === "dark"
      ? "border-b border-white/10 last:border-0"
      : "border-b border-gray-200 last:border-0";

  const makeSafeId =
    typeof utils?.safeId === "function"
      ? utils.safeId
      : () => String(Date.now());

  const me = state?.session?.isAdmin
    ? {
        loginId: state?.session?.loginId || "",
        name: "Admin",
        divisi: "Admin",
        position: "Executive Committee",
        isEC: true,
      }
    : members.find((m) => m.loginId === state?.session?.loginId) || null;

  const userDiv = (me?.divisi || "").trim().toLowerCase();
  const userPosition = String(
    me?.position || (me?.isEC ? "Executive Committee" : "")
  )
    .trim()
    .toLowerCase();

  const isAuthed = !!state?.session?.isAuthed;

  const canAddPresensi =
    isAuthed &&
    (
      !!state?.session?.isAdmin ||
      userDiv === "secretary" ||
      userDiv === "sekretaris" ||
      userDiv === "pr" ||
      userDiv === "public relation" ||
      userDiv === "public relations" ||
      userPosition === "lead" ||
      userPosition === "vice lead"
    );

  const getMember = (loginId) => members.find((m) => m.loginId === loginId);

  const toSortableDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }

    return raw;
  };

  const isNotArchivedItem = (item) => {
    if (!item || typeof item !== "object") return false;

    const archivedFlag =
      item.isArchived === true ||
      item.archived === true ||
      item.arsip === true ||
      item.isDeleted === true ||
      item.deleted === true;

    const archivedAt =
      String(item.archivedAt || item.deletedAt || item.removedAt || "").trim();

    const statusText = String(item.status || item.state || "")
      .trim()
      .toLowerCase();

    if (archivedFlag) return false;
    if (archivedAt) return false;
    if (
      statusText === "arsip" ||
      statusText === "archived" ||
      statusText === "deleted" ||
      statusText === "nonaktif"
    ) {
      return false;
    }

    return true;
  };

  const acaraOptions = useMemo(() => {
    const kegiatan = kegiatanList
      .filter((k) => String(k?.title || "").trim())
      .map((k) => {
        const title = String(k?.title || "").trim();
        const dateText = String(k?.tanggal || k?.date || "").trim();
        const lokasi = String(k?.lokasi || k?.location || "").trim();

        return {
          value: `kegiatan:${String(k?.id || title)}`,
          kind: "kegiatan",
          sourceId: String(k?.id || ""),
          title,
          date: dateText,
          location: lokasi,
          sortDate: toSortableDate(dateText),
          label: `[Kegiatan] ${title}${dateText ? ` • ${dateText}` : ""}`,
        };
      });

    const proker = prokerList
      .filter((p) => String(p?.title || "").trim())
      .map((p) => {
        const title = String(p?.title || "").trim();
        const dateText = String(p?.date || p?.tanggal || "").trim();
        const divisi = String(p?.divisi || "").trim();

        return {
          value: `proker:${String(p?.id || title)}`,
          kind: "proker",
          sourceId: String(p?.id || ""),
          title,
          date: dateText,
          location: divisi,
          sortDate: toSortableDate(dateText),
          label: `[Proker] ${title}${dateText ? ` • ${dateText}` : divisi ? ` • ${divisi}` : ""}`,
        };
      });

    const merged = [...kegiatan, ...proker];

    const map = new Map();
    merged.forEach((item) => {
      if (!item.value) return;
      if (!map.has(item.value)) {
        map.set(item.value, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return (
        String(b.sortDate || "").localeCompare(String(a.sortDate || "")) ||
        String(a.title || "").localeCompare(String(b.title || ""), "id")
      );
    });
  }, [kegiatanList, prokerList]);

  const membersSorted = useMemo(() => {
    return [...members].sort(
      (a, b) =>
        String(a.divisi || "").localeCompare(String(b.divisi || "")) ||
        String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [members]);

    const findExistingPresensiByAcaraValue = (value) => {
    if (!value) return null;

    const picked = acaraOptions.find((o) => o.value === value);
    if (!picked) return null;

    return presensiList.find((p) => {
      const isInternal = String(p?.type || "").toLowerCase() === "internal";

      const sameSource =
        String(p?.source_id || "") === String(picked.sourceId || "");

      return isInternal && sameSource;
    }) || null;
  };

  const [type, setType] = useState("Internal");
  const [acaraValue, setAcaraValue] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [hadirIds, setHadirIds] = useState([]);
  const [izinIds, setIzinIds] = useState([]);
  const [izinReasons, setIzinReasons] = useState({});
  const [searchRiwayat, setSearchRiwayat] = useState("");

  const [acaraMenuOpen, setAcaraMenuOpen] = useState(false);
  const [editAcaraMenuOpen, setEditAcaraMenuOpen] = useState(false);
  const [acaraKeyword, setAcaraKeyword] = useState("");
  const [editAcaraKeyword, setEditAcaraKeyword] = useState("");

  const acaraDropdownRef = useRef(null);
  const editAcaraDropdownRef = useRef(null);

  const isPresensiFormValid = useMemo(() => {
    const hasAttendance = hadirIds.length > 0 || izinIds.length > 0;

    const hasTitle =
      type === "Internal"
        ? Boolean(
            acaraValue &&
              acaraOptions.some(
                (o) => o.value === acaraValue && String(o.title || "").trim()
              )
          )
        : Boolean(String(externalTitle || "").trim());

    return Boolean(canAddPresensi) && hasTitle && hasAttendance;
  }, [canAddPresensi, type, acaraValue, acaraOptions, externalTitle, hadirIds, izinIds]);

  const disabledBtnClass = "opacity-50 cursor-not-allowed pointer-events-none";

  const selectedAcara = useMemo(() => {
  return acaraOptions.find((o) => o.value === acaraValue) || null;
  }, [acaraOptions, acaraValue]);

  const filteredAcaraOptions = useMemo(() => {
    const q = String(acaraKeyword || "").trim().toLowerCase();
    if (!q) return acaraOptions;

    return acaraOptions.filter((item) =>
      [item.label, item.title, item.date, item.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [acaraOptions, acaraKeyword]);

  const filteredEditAcaraOptions = useMemo(() => {
    const q = String(editAcaraKeyword || "").trim().toLowerCase();
    if (!q) return acaraOptions;

    return acaraOptions.filter((item) =>
      [item.label, item.title, item.date, item.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [acaraOptions, editAcaraKeyword]);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      acaraDropdownRef.current &&
      !acaraDropdownRef.current.contains(event.target)
    ) {
      setAcaraMenuOpen(false);
    }

    if (
      editAcaraDropdownRef.current &&
      !editAcaraDropdownRef.current.contains(event.target)
    ) {
      setEditAcaraMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  useEffect(() => {
    if (type === "Internal" && !acaraValue && acaraOptions.length > 0) {
      setAcaraValue(acaraOptions[0].value);
    }
  }, [type, acaraValue, acaraOptions]);

  useEffect(() => {
    if (type !== "Internal") return;
    if (!acaraValue) return;

    const picked = acaraOptions.find((o) => o.value === acaraValue);
    if (!picked) return;

    if (picked.date) setDate(picked.date);

    const nextLoc = String(picked.location || "").trim();
    setLocation(nextLoc && nextLoc !== "-" ? nextLoc : "");
  }, [type, acaraValue, acaraOptions]);

  useEffect(() => {
    setIzinReasons((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!izinIds.includes(id)) delete next[id];
      });
      izinIds.forEach((id) => {
        if (typeof next[id] !== "string") next[id] = "";
      });
      return next;
    });
  }, [izinIds]);

  const toggleHadir = (loginId, checked) => {
    if (checked) {
      setIzinIds((prev) => prev.filter((x) => x !== loginId));
      setIzinReasons((prev) => {
        const next = { ...prev };
        delete next[loginId];
        return next;
      });
      setHadirIds((prev) => (prev.includes(loginId) ? prev : [...prev, loginId]));
    } else {
      setHadirIds((prev) => prev.filter((x) => x !== loginId));
    }
  };

  const toggleIzin = (loginId, checked) => {
    if (checked) {
      setHadirIds((prev) => prev.filter((x) => x !== loginId));
      setIzinIds((prev) => (prev.includes(loginId) ? prev : [...prev, loginId]));
    } else {
      setIzinIds((prev) => prev.filter((x) => x !== loginId));
      setIzinReasons((prev) => {
        const next = { ...prev };
        delete next[loginId];
        return next;
      });
    }
  };

  async function addPresensi(e) {
    e.preventDefault();
    if (!canAddPresensi) return;
    if (hadirIds.length === 0 && izinIds.length === 0) return;

    let title = "";
    if (type === "Internal") {
      const picked = acaraOptions.find((o) => o.value === acaraValue);
      title = String(picked?.title || "").trim();
      if (!title) return;

      const existing = findExistingPresensiByAcaraValue(acaraValue);
      if (existing) {
        const ok = window.confirm(
          "Kegiatan sudah diberi presensi. Lanjutkan untuk mengedit?"
        );

        if (ok) {
          openEditByExistingPresensi(existing);
        }
        return;
      }
    } else {
      title = String(externalTitle || "").trim();
      if (!title) return;
    }

    const payload = {
      title,
      type,
      date,
      location: String(location || "").trim() || "-",
      hadir: hadirIds,
      izin: izinIds,
      izin_reasons: izinIds.reduce((acc, id) => {
        acc[id] = String(izinReasons[id] || "").trim();
        return acc;
      }, {}),
      created_by: me?.loginId || "admin",
      periode: activePeriod,
      source_id: selectedAcara?.sourceId || null,
    };

    try {
      const created = await createPresensiApi(payload);

      setState((s) => ({
        ...s,
        presensi: [...(Array.isArray(s.presensi) ? s.presensi : []), created],
      }));

      setType("Internal");
      setExternalTitle("");
      setDate(new Date().toISOString().slice(0, 10));
      setLocation("");
      setHadirIds([]);
      setIzinIds([]);
      setIzinReasons({});
    } catch (err) {
      alert(err.message || "Gagal menyimpan presensi.");
    }
  }

  const list = useMemo(() => {
  const q = String(searchRiwayat || "").trim().toLowerCase();

  const base = [...presensiList].reverse();

  if (!q) return base;

  return base.filter((p) => {
    const text = [
      p?.title,
      p?.type,
      p?.date,
      p?.location,
      getMember(p?.created_by)?.name || p?.created_by,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  });
}, [presensiList, searchRiwayat, members]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState(null);

  const viewed = useMemo(() => {
    if (!viewId) return null;
    return presensiList.find((p) => String(p.id) === String(viewId)) || null;
  }, [presensiList, viewId]);

  const openView = (p) => {
    setViewId(p.id);
    setViewOpen(true);
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eType, setEType] = useState("Internal");
  const [eAcaraValue, setEAcaraValue] = useState("");
  const [eExternalTitle, setEExternalTitle] = useState("");
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));
  const [eLocation, setELocation] = useState("");
  const [eHadirIds, setEHadirIds] = useState([]);
  const [eIzinIds, setEIzinIds] = useState([]);
  const [eIzinReasons, setEIzinReasons] = useState({});

  const selectedEditAcara = useMemo(() => {
    return acaraOptions.find((o) => o.value === eAcaraValue) || null;
  }, [acaraOptions, eAcaraValue]);

  const isEditPresensiFormValid = useMemo(() => {
    const hasAttendance = eHadirIds.length > 0 || eIzinIds.length > 0;
    const hasTitle =
      eType === "Internal"
        ? Boolean(
            eAcaraValue &&
              acaraOptions.some(
                (o) => o.value === eAcaraValue && String(o.title || "").trim()
              )
          )
        : Boolean(String(eExternalTitle || "").trim());

    return Boolean(canAddPresensi) && Boolean(editId) && hasTitle && hasAttendance;
  }, [canAddPresensi, editId, eType, eAcaraValue, acaraOptions, eExternalTitle, eHadirIds, eIzinIds]);

  const openEdit = (p) => {
    if (!canAddPresensi) return;
    setEditId(p.id);
    setEType(p.type || "Internal");
    setEDate(p.date || new Date().toISOString().slice(0, 10));
    setELocation(p.location || "");

    if ((p.type || "").toLowerCase() === "internal") {
      const found = acaraOptions.find((o) => o.title === p.title);
      setEAcaraValue(found?.value || acaraOptions[0]?.value || "");
      setEExternalTitle("");
    } else {
      setEExternalTitle(p.title || "");
      setEAcaraValue(acaraOptions[0]?.value || "");
    }

    setEHadirIds(Array.isArray(p.hadir) ? [...p.hadir] : []);
    setEIzinIds(Array.isArray(p.izin) ? [...p.izin] : []);
    setEIzinReasons({ ...(p.izin_reasons || {}) });

    setEditOpen(true);
  };

    const openEditByExistingPresensi = (presensiItem) => {
    if (!presensiItem || !canAddPresensi) return;

    setEditId(presensiItem.id);
    setEType(presensiItem.type || "Internal");
    setEDate(presensiItem.date || new Date().toISOString().slice(0, 10));
    setELocation(presensiItem.location || "");

    if ((presensiItem.type || "").toLowerCase() === "internal") {
      const found = acaraOptions.find((o) => o.title === presensiItem.title);
      setEAcaraValue(found?.value || acaraOptions[0]?.value || "");
      setEExternalTitle("");
    } else {
      setEExternalTitle(presensiItem.title || "");
      setEAcaraValue(acaraOptions[0]?.value || "");
    }

    setEHadirIds(Array.isArray(presensiItem.hadir) ? [...presensiItem.hadir] : []);
    setEIzinIds(Array.isArray(presensiItem.izin) ? [...presensiItem.izin] : []);
    setEIzinReasons({ ...(presensiItem.izin_reasons || {}) });

    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen) return;
    if (eType === "Internal" && !eAcaraValue && acaraOptions.length > 0) {
      setEAcaraValue(acaraOptions[0].value);
    }
  }, [editOpen, eType, eAcaraValue, acaraOptions]);

  useEffect(() => {
    if (!editOpen) return;
    setEIzinReasons((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!eIzinIds.includes(id)) delete next[id];
      });
      eIzinIds.forEach((id) => {
        if (typeof next[id] !== "string") next[id] = "";
      });
      return next;
    });
  }, [editOpen, eIzinIds]);

  const toggleEHadir = (loginId, checked) => {
    if (checked) {
      setEIzinIds((prev) => prev.filter((x) => x !== loginId));
      setEIzinReasons((prev) => {
        const next = { ...prev };
        delete next[loginId];
        return next;
      });
      setEHadirIds((prev) => (prev.includes(loginId) ? prev : [...prev, loginId]));
    } else {
      setEHadirIds((prev) => prev.filter((x) => x !== loginId));
    }
  };

  const toggleEIzin = (loginId, checked) => {
    if (checked) {
      setEHadirIds((prev) => prev.filter((x) => x !== loginId));
      setEIzinIds((prev) => (prev.includes(loginId) ? prev : [...prev, loginId]));
    } else {
      setEIzinIds((prev) => prev.filter((x) => x !== loginId));
      setEIzinReasons((prev) => {
        const next = { ...prev };
        delete next[loginId];
        return next;
      });
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!canAddPresensi) return;
    if (!editId) return;
    if (eHadirIds.length === 0 && eIzinIds.length === 0) return;

    let title = "";
    if (eType === "Internal") {
      const picked = acaraOptions.find((o) => o.value === eAcaraValue);
      title = String(picked?.title || "").trim();
      if (!title) return;
    } else {
      title = String(eExternalTitle || "").trim();
      if (!title) return;
    }

  const payload = {
    title,
    type: eType,
    date: eDate,
    location: String(eLocation || "").trim() || "-",
    hadir: eHadirIds,
    izin: eIzinIds,
    izin_reasons: eIzinIds.reduce((acc, id) => {
      acc[id] = String(eIzinReasons[id] || "").trim();
      return acc;
    }, {}),
    periode: activePeriod,
    source_id: selectedEditAcara?.sourceId || null,
  };

    try {
      const updated = await updatePresensiApi(editId, payload);

      setState((s) => ({
        ...s,
      presensi: (Array.isArray(s.presensi) ? s.presensi : []).map((p) =>
        String(p.id) === String(editId) ? updated : p
      ),
      }));

      setEditOpen(false);
      setEditId(null);
    } catch (err) {
      alert(err.message || "Gagal mengubah presensi.");
    }
  };

  async function deletePresensi(id) {
    const ok = window.confirm("Hapus presensi ini?");
    if (!ok) return;

    try {
      await deletePresensiApi(id);
      await loadPresensi();

      setViewOpen(false);
      setViewId(null);
      setEditOpen(false);
      setEditId(null);
    } catch (err) {
      alert(err.message || "Gagal menghapus presensi.");
    }
  }

  const [tipeFilter, setTipeFilter] = useState("Semua");
  const [anggotaFilter, setAnggotaFilter] = useState("Semua");

  const rekap = useMemo(() => {
    const counts = new Map();
    members.forEach((m) => counts.set(m.loginId, { internal: 0, eksternal: 0 }));

    presensiList.forEach((p) => {
      const isEksternal = String(p.type || "").toLowerCase() === "eksternal";
      const bucket = isEksternal ? "eksternal" : "internal";

      if (tipeFilter === "Internal" && isEksternal) return;
      if (tipeFilter === "Eksternal" && !isEksternal) return;

      (Array.isArray(p.hadir) ? p.hadir : []).forEach((id) => {
        if (!counts.has(id)) counts.set(id, { internal: 0, eksternal: 0 });
        counts.get(id)[bucket] += 1;
      });
    });

    let rows = members.map((m) => {
      const c = counts.get(m.loginId) || { internal: 0, eksternal: 0 };
      const total =
        tipeFilter === "Internal"
          ? c.internal
          : tipeFilter === "Eksternal"
          ? c.eksternal
          : c.internal + c.eksternal;

      return {
        name: m.name,
        divisi: m.divisi,
        loginId: m.loginId,
        internal: c.internal,
        eksternal: c.eksternal,
        total,
      };
    });

    if (anggotaFilter === "Sering Hadir") {
      rows = rows.filter((r) => r.total > 0);
    } else if (anggotaFilter === "Jarang Hadir") {
      rows = rows.filter((r) => r.total === 0);
    }

    rows.sort(
      (a, b) =>
        b.total - a.total ||
        String(a.name || "").localeCompare(String(b.name || ""))
    );

    return rows;
  }, [members, presensiList, tipeFilter, anggotaFilter]);

  return (
    <div className="space-y-6">
      <Card title="Tambah Presensi" ui={ui}>
        {!canAddPresensi ? (
          <div
            className={cx(
              "rounded-xl px-4 py-3 text-sm ring-1",
              theme === "dark"
                ? "bg-amber-950/30 ring-amber-900 text-amber-200"
                : "bg-amber-50 ring-amber-200 text-amber-800"
            )}
          >
            Akses tambah/edit presensi hanya untuk divisi <b>Secretary</b> dan <b>PR</b>.
          </div>
        ) : (
          <form onSubmit={addPresensi} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className={cx("text-sm", ui.textMuted)}>Nama Acara</label>

                {type === "Internal" ? (
                  <div className="mt-2 space-y-2 relative" ref={acaraDropdownRef}>

                    <button
                      type="button"
                      className={cx(
                        ui.input,
                        "flex w-full items-center justify-between text-left"
                      )}
                      onClick={() => setAcaraMenuOpen((v) => !v)}
                      disabled={acaraOptions.length === 0}
                    >
                      <span className="truncate">
                        {selectedAcara?.label || "Belum ada kegiatan/proker"}
                      </span>
                      <span>▾</span>
                    </button>

                    {acaraMenuOpen && acaraOptions.length > 0 ? (
                      <div
                        className={cx(
                          "rounded-2xl border p-1",
                          theme === "dark"
                            ? "border-white/10 bg-slate-950"
                            : "border-gray-200 bg-white"
                        )}
                      >
                        <div className="max-h-[220px] overflow-y-auto">
                          {filteredAcaraOptions.length === 0 ? (
                            <div className={cx("px-3 py-2 text-sm", ui.textMuted)}>
                              Tidak ada acara yang cocok.
                            </div>
                          ) : (
                            filteredAcaraOptions.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className={cx(
                                  "block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5",
                                  acaraValue === o.value
                                    ? theme === "dark"
                                      ? "bg-white/10"
                                      : "bg-gray-100"
                                    : ""
                                )}
                                onClick={() => {
                                  setAcaraValue(o.value);
                                  setAcaraKeyword("");
                                  setAcaraMenuOpen(false);

                                  const existing = findExistingPresensiByAcaraValue(o.value);
                                  if (!existing) return;

                                  const ok = window.confirm(
                                    "Kegiatan sudah diberi presensi. Lanjutkan untuk mengedit?"
                                  );

                                  if (!ok) return;
                                  openEditByExistingPresensi(existing);
                                }}
                              >
                                {o.label}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <input
                      value={externalTitle}
                      onChange={(e) => setExternalTitle(e.target.value)}
                      placeholder="contoh: Seminar Cybersecurity Kampus X"
                      className={cx("mt-2", ui.input)}
                    />
                  </>
                )}
              </div>

              <div>
                <label className={cx("text-sm", ui.textMuted)}>Tipe</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={cx("mt-2", ui.input)}
                >
                  <option value="Internal">Internal</option>
                  <option value="Eksternal">Eksternal</option>
                </select>
              </div>

              <div>
                <label className={cx("text-sm", ui.textMuted)}>Tanggal</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cx("mt-2", ui.input, theme === "dark" ? "dark-date-input" : "")}
                />
              </div>

              <div className="md:col-span-2">
                <label className={cx("text-sm", ui.textMuted)}>Lokasi</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lokasi (opsional)"
                  className={cx("mt-2", ui.input)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={softBoxClass}>
                <div className="text-sm font-semibold">Hadir</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {membersSorted.map((m) => (
                    <label
                      key={m.loginId}
                      className={cx("flex items-center gap-2 text-sm", ui.textMuted)}
                    >
                      <input
                        type="checkbox"
                        checked={hadirIds.includes(m.loginId)}
                        disabled={izinIds.includes(m.loginId)}
                        onChange={(e) => toggleHadir(m.loginId, e.target.checked)}
                      />
                      <span>
                        {m.name}{" "}
                        <span className={cx("text-xs", ui.textMuted2)}>({m.divisi})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={softBoxClass}>
                <div className="text-sm font-semibold">Izin</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {membersSorted.map((m) => (
                    <label
                      key={m.loginId}
                      className={cx("flex items-center gap-2 text-sm", ui.textMuted)}
                    >
                      <input
                        type="checkbox"
                        checked={izinIds.includes(m.loginId)}
                        disabled={hadirIds.includes(m.loginId)}
                        onChange={(e) => toggleIzin(m.loginId, e.target.checked)}
                      />
                      <span>
                        {m.name}{" "}
                        <span className={cx("text-xs", ui.textMuted2)}>({m.divisi})</span>
                      </span>
                    </label>
                  ))}
                </div>

                {izinIds.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className={cx("text-sm font-semibold", ui.textMuted)}>Alasan Izin</div>
                    {izinIds.map((id) => {
                      const mm = getMember(id);
                      const label = mm?.name || id;
                      return (
                        <div key={id}>
                          <label className={cx("text-xs font-semibold", ui.textMuted2)}>
                            {label}
                          </label>
                          <input
                            value={izinReasons[id] || ""}
                            onChange={(e) =>
                              setIzinReasons((prev) => ({
                                ...prev,
                                [id]: e.target.value,
                              }))
                            }
                            placeholder="contoh: sakit / bentrok kelas / dll"
                            className={cx("mt-2", ui.input)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              disabled={!isPresensiFormValid}
              className={cx(
                "w-full",
                ui.btnBase,
                ui.btnPrimary,
                "font-semibold",
                !isPresensiFormValid ? disabledBtnClass : ""
              )}
            >
              Simpan Presensi
            </button>
          </form>
        )}
      </Card>

      <Card
          title="Riwayat Presensi"
          ui={ui}
          right={
            <div className="flex items-center gap-3">
              <input
                value={searchRiwayat}
                onChange={(e) => setSearchRiwayat(e.target.value)}
                placeholder="Cari nama acara / tanggal / lokasi"
                className={cx(ui.input, "w-[260px] max-w-full")}
              />
              {canAddPresensi ? (
                <button
                  type="button"
                  className={cx(ui.btnBase, ui.btnGhost)}
                  onClick={async () => {
                    const ok = window.confirm(
                      "Hapus semua riwayat presensi? Tindakan ini tidak bisa dibatalkan."
                    );
                    if (!ok) return;

                    try {
                      const items = Array.isArray(presensiList) ? presensiList : [];
                      await Promise.all(items.map((item) => deletePresensiApi(item.id)));
                      await loadPresensi();

                      setSearchRiwayat("");
                      setAcaraMenuOpen(false);
                      setEditAcaraMenuOpen(false);
                      setViewOpen(false);
                      setViewId(null);
                      setEditOpen(false);
                      setEditId(null);
                    } catch (err) {
                      alert(err.message || "Gagal menghapus seluruh presensi.");
                    }
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          }
        >
        <div className="mt-4 w-full overflow-x-auto max-h-[320px] overflow-y-auto pr-1">
          <table className="w-full min-w-[900px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="whitespace-nowrap px-4 py-2 text-left">Nama</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Tipe</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Lokasi</th>
                <th className="whitespace-nowrap px-4 py-2 text-center">Hadir</th>
                <th className="whitespace-nowrap px-4 py-2 text-center">Izin</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Pembuat</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className={cx("px-4 py-4", ui.textMuted)}>
                    Belum ada presensi.
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className={tableRowClass}>
                    <td className="min-w-[220px] whitespace-normal break-words px-4 py-2 font-semibold">
                      {p.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">{p.type}</td>
                    <td className="whitespace-nowrap px-4 py-2">{p.date}</td>
                    <td className="min-w-[180px] whitespace-normal break-words px-4 py-2">
                      {p.location}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">
                      {(p.hadir || []).length}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">
                      {(p.izin || []).length}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                    {getMember(p.created_by)?.name || p.created_by}
                  </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                          onClick={() => openView(p)}
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
      </Card>

      <Card
        title="Rekap Kehadiran Internal vs Eksternal"
        ui={ui}
        right={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className={cx("text-sm", ui.textMuted)}>Tipe:</span>
              <select
                value={tipeFilter}
                onChange={(e) => setTipeFilter(e.target.value)}
                className={cx(ui.input, "!h-10 !py-0")}
              >
                <option value="Semua">Semua</option>
                <option value="Internal">Internal</option>
                <option value="Eksternal">Eksternal</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={cx("text-sm", ui.textMuted)}>Anggota:</span>
              <select
                value={anggotaFilter}
                onChange={(e) => setAnggotaFilter(e.target.value)}
                className={cx(ui.input, "!h-10 !py-0")}
              >
                <option value="Semua">Semua</option>
                <option value="Sering Hadir">Sering Hadir</option>
                <option value="Jarang Hadir">Jarang Hadir</option>
              </select>
            </div>
          </div>
        }
      >
        <div className={cx("mt-3 text-sm", ui.textMuted2)}>
          Total anggota ditampilkan: {rekap.length}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="whitespace-nowrap px-4 py-2 text-left">Nama</th>
                <th className="whitespace-nowrap px-4 py-2 text-left">Divisi</th>
                <th className="whitespace-nowrap px-4 py-2 text-center">Kehadiran Internal</th>
                <th className="whitespace-nowrap px-4 py-2 text-center">Kehadiran Eksternal</th>
              </tr>
            </thead>
            <tbody>
              {rekap.map((r) => (
                <tr key={r.loginId} className={tableRowClass}>
                  <td className="min-w-[220px] whitespace-normal break-words px-4 py-2 font-semibold">
                    {r.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{r.divisi}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-center">{r.internal}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-center">{r.eksternal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={viewOpen}
        title="Detail Presensi"
        onClose={() => {
          setViewOpen(false);
          setViewId(null);
        }}
        theme={theme}
        ui={ui}
        footer={
          <>
            {canAddPresensi ? (
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnPrimary, "px-4 py-2 font-semibold")}
                onClick={() => {
                  if (!viewed) return;
                  setViewOpen(false);
                  openEdit(viewed);
                }}
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
              onClick={() => {
                setViewOpen(false);
                setViewId(null);
              }}
            >
              Tutup
            </button>

            {canAddPresensi ? (
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
                onClick={() => {
                  if (!viewed) return;
                  deletePresensi(viewed.id);
                }}
              >
                Hapus
              </button>
            ) : null}
          </>
        }
      >
        {!viewed ? null : (
          <>
            <div
              className={cx(
                "rounded-2xl p-5 ring-1",
                theme === "dark" ? "ring-slate-800" : "ring-gray-200"
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className={cx("text-sm", ui.textMuted2)}>Nama</div>
                  <div className="text-xl font-bold">{viewed.title}</div>
                </div>
                <div>
                  <div className={cx("text-sm", ui.textMuted2)}>Tipe</div>
                  <div className="font-semibold">{viewed.type}</div>
                  <div className={cx("mt-3 text-sm", ui.textMuted2)}>Pembuat</div>
                  <div className="font-semibold">{viewed.created_by}</div>
                </div>
                <div>
                  <div className={cx("text-sm", ui.textMuted2)}>Tanggal</div>
                  <div className="font-semibold">{viewed.date}</div>
                  <div className={cx("mt-3 text-sm", ui.textMuted2)}>Lokasi</div>
                  <div className="font-semibold">{viewed.location}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={softBoxClass}>
                <div className="text-base font-semibold">Hadir</div>
                <div className="mt-2 divide-y">
                  {(viewed.hadir || []).length === 0 ? (
                    <div className={cx("py-4 text-sm", ui.textMuted2)}>
                      Belum ada yang hadir.
                    </div>
                  ) : (
                    (viewed.hadir || []).map((id) => (
                      <MemberLine key={id} member={getMember(id)} theme={theme} ui={ui} />
                    ))
                  )}
                </div>
              </div>

              <div className={softBoxClass}>
                <div className="text-base font-semibold">Izin</div>
                <div className="mt-2 divide-y">
                  {(viewed.izin || []).length === 0 ? (
                    <div className={cx("py-4 text-sm", ui.textMuted2)}>
                      Belum ada yang izin.
                    </div>
                  ) : (
                    (viewed.izin || []).map((id) => (
                      <MemberLine
                        key={id}
                        member={getMember(id)}
                        secondary={(viewed.izin_reasons || {})[id] || ""}
                        theme={theme}
                        ui={ui}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

    {canAddPresensi ? (
      <Modal
        open={editOpen}
        title="Edit Presensi"
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        theme={theme}
        ui={ui}
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className={cx("text-sm", ui.textMuted)}>Nama Acara</label>

              {eType === "Internal" ? (
                <div className="mt-2 space-y-2 relative" ref={editAcaraDropdownRef}>
                  <button
                    type="button"
                    className={cx(
                      ui.input,
                      "flex w-full items-center justify-between text-left"
                    )}
                    onClick={() => setEditAcaraMenuOpen((v) => !v)}
                    disabled={acaraOptions.length === 0}
                  >
                    <span className="truncate">
                      {selectedEditAcara?.label || "Belum ada kegiatan/proker"}
                    </span>
                    <span>▾</span>
                  </button>

                  {editAcaraMenuOpen && acaraOptions.length > 0 ? (
                    <div
                      className={cx(
                        "rounded-2xl border p-1",
                        theme === "dark"
                          ? "border-white/10 bg-slate-950"
                          : "border-gray-200 bg-white"
                      )}
                    >
                      <div className="max-h-[220px] overflow-y-auto">
                        {filteredEditAcaraOptions.length === 0 ? (
                          <div className={cx("px-3 py-2 text-sm", ui.textMuted)}>
                            Tidak ada acara yang cocok.
                          </div>
                        ) : (
                          filteredEditAcaraOptions.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              className={cx(
                                "block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5",
                                eAcaraValue === o.value
                                  ? theme === "dark"
                                    ? "bg-white/10"
                                    : "bg-gray-100"
                                  : ""
                              )}
                              onClick={() => {
                                setEAcaraValue(o.value);
                                setEditAcaraKeyword("");
                                setEditAcaraMenuOpen(false);
                              }}
                            >
                              {o.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <input
                    value={eExternalTitle}
                    onChange={(e) => setEExternalTitle(e.target.value)}
                    className={cx("mt-2", ui.input)}
                    placeholder="contoh: Seminar Cybersecurity Kampus X"
                  />
                  <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                    Presensi <b>eksternal</b>: nama acara bisa diketik.
                  </div>
                </>
              )}
            </div>

            <div>
              <label className={cx("text-sm", ui.textMuted)}>Tipe</label>
              <select
                value={eType}
                onChange={(e) => setEType(e.target.value)}
                className={cx("mt-2", ui.input)}
              >
                <option value="Internal">Internal</option>
                <option value="Eksternal">Eksternal</option>
              </select>
            </div>

            <div>
              <label className={cx("text-sm", ui.textMuted)}>Tanggal</label>
              <input
                type="date"
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className={cx("mt-2", ui.input, theme === "dark" ? "dark-date-input" : "")}
              />
            </div>

            <div className="md:col-span-2">
              <label className={cx("text-sm", ui.textMuted)}>Lokasi</label>
              <input
                value={eLocation}
                onChange={(e) => setELocation(e.target.value)}
                placeholder="Lokasi (opsional)"
                className={cx("mt-2", ui.input)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={softBoxClass}>
              <div className="text-sm font-semibold">Hadir</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {membersSorted.map((m) => (
                  <label
                    key={m.loginId}
                    className={cx(
                      memberRowClass,
                      eIzinIds.includes(m.loginId) ? "opacity-50" : "cursor-pointer"
                    )}
                  >
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={eHadirIds.includes(m.loginId)}
                      disabled={eIzinIds.includes(m.loginId)}
                      onChange={(e) => toggleEHadir(m.loginId, e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className={cx("text-xs", ui.textMuted2)}>{m.divisi}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={softBoxClass}>
              <div className="text-sm font-semibold">Izin</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {membersSorted.map((m) => (
                  <label
                    key={m.loginId}
                    className={cx(
                      memberRowClass,
                      eHadirIds.includes(m.loginId) ? "opacity-50" : "cursor-pointer"
                    )}
                  >
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={eIzinIds.includes(m.loginId)}
                      disabled={eHadirIds.includes(m.loginId)}
                      onChange={(e) => toggleEIzin(m.loginId, e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className={cx("text-xs", ui.textMuted2)}>{m.divisi}</div>
                    </div>
                  </label>
                ))}
              </div>

              {eIzinIds.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <div className={cx("text-sm font-semibold", ui.textMuted)}>Alasan Izin</div>

                  {eIzinIds.map((id) => {
                    const mm = getMember(id);
                    const label = mm?.name || id;

                    return (
                      <div key={id}>
                        <div className={cx("text-xs font-semibold", ui.textMuted2)}>
                          {label}
                        </div>
                        <input
                          value={eIzinReasons[id] || ""}
                          onChange={(ev) =>
                            setEIzinReasons((prev) => ({
                              ...prev,
                              [id]: ev.target.value,
                            }))
                          }
                          placeholder="contoh: sakit / bentrok kelas / dll"
                          className={cx("mt-2", ui.input)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cx(
              "sticky bottom-0 flex items-center justify-end gap-2 pt-3",
              theme === "dark" ? "bg-slate-950" : "bg-white"
            )}
          >
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditId(null);
              }}
              className={cx(ui.btnBase, ui.btnGhost, "px-4 py-2")}
            >
              Batal
            </button>
            <button
              disabled={!isEditPresensiFormValid}
              className={cx(
                ui.btnBase,
                ui.btnPrimary,
                "px-4 py-2 font-semibold",
                !isEditPresensiFormValid ? disabledBtnClass : ""
              )}
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
      ) : null}
    </div>
  );
}