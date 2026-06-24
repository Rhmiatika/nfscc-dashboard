import React, { useEffect, useMemo, useState } from "react";
import { getPeriods, getPeriodMeta } from "../storage";
import {
  listMembersApi,
  createMemberApi,
  updateMemberApi,
  deleteMemberApi,
  resetMemberPasswordApi,
} from "../Services/memberService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function displayPosition(position) {
  const p = String(position || "").toLowerCase();

  if (p === "lead" || p === "vice lead") {
    return "Executive Committee";
  }

  return position;
}

function displayDivision(divisi) {
  const found = DIVISIONS.find(
    (d) => d.code === String(divisi || "").toLowerCase()
  );

  return found ? found.label : divisi;
}

const DIVISIONS = [
  { label: "Public Relation", code: "pr" },
  { label: "Human Resource Development", code: "hrd" },
  { label: "Research and Education", code: "rne" },
  { label: "Creative Media & Documentation", code: "cmd" },
  { label: "Treasurer", code: "treas" },
  { label: "Secretary", code: "secre" },
  { label: "Lead", code: "lead" },
  { label: "Vice Lead", code: "vicelead" },
];

function generateLoginId(name, divisi, domain) {
  if (!name || !divisi) return "";

  const firstName = name
    .trim()
    .split(" ")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return `${firstName}.${divisi}@${domain}`;
}

export default function AnggotaPage({ state, setState, theme, ui }) {
  const activePeriod = String(
    state?.activePeriod ??
    state?.session?.periodId ??
    state?.session?.period ??
    "2026"
  );

  const activeDomain =
    getPeriodMeta(activePeriod)?.domain || "nfcc";

  const role = String(state?.session?.role || "staff").toLowerCase();
  const canManage = role === "admin" || role === "ec";
  const periods = useMemo(() => {
    return getPeriods() || [
      { id: "2025", label: "Periode 2025" },
      { id: "2026", label: "Periode 2026" },
    ];
  }, [state?.periods]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    loginId: "",
    divisi: "",
    position: "Staff",
    tahunAngkatan: "",
    periodId: activePeriod,
    isEC: false,
  });

  const members = Array.isArray(state?.members) ? state.members : [];

  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase();

    return members.filter((m) => {
      if (
        String(m.periodId || "") !== String(activePeriod) ||
        m.archived
      ) return false;

      if (!q) return true;

      const text = [
        m.name,
        m.loginId,
        m.divisi,
        m.position,
        m.tahunAngkatan,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [members, activePeriod, query]);

  async function loadMembers() {
    setLoading(true);
    setError("");

    try {
      const data = await listMembersApi(activePeriod);
      setState((prev) => ({
        ...prev,
        members: data,
      }));
    } catch (err) {
      setError(err.message || "Gagal memuat anggota.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) return;
    loadMembers();
  }, [activePeriod, canManage]);

  useEffect(() => {
    const loginId = generateLoginId(
      form.name,
      form.divisi,
      activeDomain
    );

    setForm((prev) => ({
      ...prev,
      loginId,
    }));
  }, [form.name, form.divisi, activeDomain]);

  function resetForm() {
    setEditingId(null);

    setForm({
      name: "",
      loginId: "",
      divisi: "",
      position: "Staff",
      tahunAngkatan: "",
      periodId: activePeriod,
      isEC: false,
    });

    setTimeout(() => {
      document.querySelector("input")?.focus();
    }, 0);
  }

  function onChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function detectIsEC(position) {
    const lower = String(position || "").trim().toLowerCase();
    return lower === "executive committee";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Nama wajib diisi.");
    if (!form.loginId.trim()) return setError("Login ID wajib diisi.");
    if (!form.divisi.trim()) return setError("Divisi wajib diisi.");
    if (!form.position.trim()) return setError("Posisi/Jabatan wajib diisi.");

    if (form.position === "Admin") {
      return setError(
        "Role Admin tidak dapat dibuat dari halaman anggota."
      );
    }

    if (form.position === "Executive Committee") {
      const existingEC = members.find(
        (m) =>
          !m.archived &&
          m.id !== editingId &&
          m.divisi === form.divisi &&
          String(m.periodId) === String(form.periodId) &&
          (
            String(m.position).toLowerCase() === "executive committee" ||
            m.isEC
          )
      );

      if (existingEC) {
        return setError(
          `Divisi ${form.divisi} sudah memiliki Executive Committee (${existingEC.name}).`
        );
      }
    }

    const payload = {
      ...form,
      loginId: form.loginId.trim().toLowerCase(),
      isEC: detectIsEC(form.position),
      periodId: form.periodId || activePeriod,
    };

    if (payload.position === "Executive Committee") {
      const existingEC = members.find((m) => {
        if (editingId && m.id === editingId) return false;

        return (
          String(m.periodId) === String(payload.periodId) &&
          String(m.divisi).toLowerCase() ===
            String(payload.divisi).toLowerCase() &&
          String(m.position).toLowerCase() ===
            "executive committee"
        );
      });

      if (existingEC) {
        setError(
          `Divisi ${payload.divisi} sudah memiliki Executive Committee (${existingEC.name})`
        );
        return;
      }
    }

    const ok = window.confirm(
      `${editingId ? "Update" : "Tambah"} anggota dengan data berikut?

    Nama      : ${payload.name}
    Login ID  : ${payload.loginId}
    Divisi    : ${payload.divisi}
    Jabatan   : ${payload.position}
    Angkatan  : ${payload.tahunAngkatan || "-"}
    Periode   : ${payload.periodId}

    Apakah data sudah sesuai?`
    );

    if (!ok) return;

    try {
      if (editingId) {
        const updated = await updateMemberApi(editingId, payload);

        setState((prev) => ({
          ...prev,
          members: (prev.members || []).map((m) =>
            m.id === updated.id ? updated : m
          ),
        }));
      } else {
        const created = await createMemberApi(payload);

        setState((prev) => ({
          ...prev,
          members: [...(prev.members || []), created],
        }));
      }

      await loadMembers();

      alert(editingId ? "Berhasil update anggota" : "Berhasil tambah anggota");

      resetForm();
    } catch (err) {
      setError(err.message || "Gagal menyimpan anggota.");
    }
  }

  function onEdit(member) {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      loginId: member.loginId || "",
      divisi: member.divisi || "",
      position: member.position || "Staff",
      tahunAngkatan: member.tahunAngkatan || "",
      periodId: member.periodId || activePeriod,
      isEC: !!member.isEC,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDelete(member) {
    const ok = window.confirm(`Hapus anggota ${member.name}?`);
    if (!ok) return;

    try {
      await deleteMemberApi(member.id);

      setState((prev) => ({
        ...prev,
        members: (prev.members || []).filter((m) => m.id !== member.id),
      }));
    } catch (err) {
      alert(err.message || "Gagal menghapus anggota.");
    }
  }

  async function onResetPassword(member) {
    const ok = window.confirm(
      `Reset password ${member.name}? Setelah reset, user harus membuat password lagi dari halaman login.`
    );
    if (!ok) return;

    try {
      const result = await resetMemberPasswordApi(member.id);
      alert(result?.message || "Password berhasil di-reset.");
    } catch (err) {
      alert(err.message || "Gagal reset password.");
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        Kamu tidak punya akses ke halaman ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h1 className="text-2xl font-semibold">Manajemen Anggota</h1>
        <p className={cx("mt-1 text-sm", ui.textMuted)}>
          Periode aktif: <b>{activePeriod}</b>
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={ui.label}>Nama Lengkap *</label>
          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Nama lengkap"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
          />

          <label className={ui.label}>Divisi *</label>
          <select
            className={cx(
              ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm",
              theme === "dark"
                ? "bg-slate-900 text-slate-100"
                : "bg-white text-slate-900"
            )}
            value={form.divisi}
            onChange={(e) => onChange("divisi", e.target.value)}
          >
            <option value="">Pilih Divisi</option>

            {DIVISIONS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.label}
              </option>
            ))}
          </select>

          <label className={ui.label}>Login ID</label>
          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Login ID"
            value={form.loginId}
            readOnly
          />

          <label className={ui.label}>Jabatan/Role</label>
          <select
            className={cx(
              ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm",
              theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
            )}
            value={form.position}
            onChange={(e) => onChange("position", e.target.value)}
          >
            <option className={theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>
              Staff
            </option>
            <option className={theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>
              Executive Committee
            </option>
          </select>

          <label className={ui.label}>Tahun Angkatan</label>
          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Tahun Angkatan"
            value={form.tahunAngkatan}
            onChange={(e) => onChange("tahunAngkatan", e.target.value)}
          />

          <label className={ui.label}>Periode</label>
          <select
            className={cx(
              ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm",
              theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
            )}
            value={form.periodId}
            onChange={(e) => onChange("periodId", e.target.value)}
          >
            {periods.map((p) => (
              <option
                key={p.id}
                value={String(p.id)}
                className={theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}
              >
                {p.label || `Periode ${p.id}`}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className={cx(
                ui.btnBase,
                ui.btnPrimary,
                "px-5 py-3 text-sm font-semibold"
              )}
            >
              {editingId ? "Update Anggota" : "Tambah Anggota"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className={cx(
                ui.btnBase,
                ui.btnGhost,
                "px-5 py-3 text-sm font-semibold"
              )}
            >
              Reset Form
            </button>

            <button
              type="button"
              onClick={loadMembers}
              className={cx(
                ui.btnBase,
                ui.btnGhost,
                "px-5 py-3 text-sm font-semibold"
              )}
            >
              Reload
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className={ui.card}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Daftar Anggota</h2>
          <div className={cx("text-sm", ui.textMuted)}>
            {loading ? "Memuat..." : `${filteredMembers.length} anggota`}
          </div>
        </div>

        <div className="mt-4">

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
          <div className="mt-4 flex items-center justify-between">
            <div className={cx("text-sm", ui.textMuted)}>
              Cari anggota
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari anggota..."
              className={cx(ui.input, "w-full md:w-[300px]")}
            />
          </div>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Login ID</th>
                  <th className="px-3 py-2 text-left">Divisi</th>
                  <th className="px-3 py-2 text-left">Jabatan</th>
                  <th className="px-3 py-2 text-left">Angkatan</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "User")}`}
                          className="h-8 w-8 rounded-full border"
                        />
                        {member.name}
                      </div>
                    </td>
                    <td className="px-3 py-2">{member.loginId}</td>
                    <td className="px-3 py-2">{displayDivision(member.divisi)}</td>
                    <td className="px-3 py-2">{displayPosition(member.position)}</td>
                    <td className="px-3 py-2">{member.tahunAngkatan || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(member)} className="rounded-xl border border-gray-300 px-3 py-1">Edit</button>
                        <button onClick={() => onResetPassword(member)} className="rounded-xl border border-amber-300 px-3 py-1 text-amber-700">Reset</button>
                        <button onClick={() => onDelete(member)} className="rounded-xl border border-red-300 px-3 py-1 text-red-700">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className={cx(
                  "rounded-2xl border p-4 space-y-2",
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "User")}`}
                    className="h-10 w-10 rounded-full border"
                  />
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className={cx("text-xs", ui.textMuted)}>{member.loginId}</div>
                  </div>
                </div>

                <div className="text-sm">
                  <div><b>Divisi:</b> {displayDivision(member.divisi)}</div>
                  <div><b>Jabatan:</b> {displayPosition(member.position)}</div>
                  <div><b>Angkatan:</b> {member.tahunAngkatan || "-"}</div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => onEdit(member)} className="px-3 py-1 border rounded-xl">Edit</button>
                  <button onClick={() => onResetPassword(member)} className="px-3 py-1 border rounded-xl text-amber-600">Reset</button>
                  <button onClick={() => onDelete(member)} className="px-3 py-1 border rounded-xl text-red-600">Hapus</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}