import React, { useEffect, useMemo, useState } from "react";
import { getPeriods } from "../storage";
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

export default function AnggotaPage({ state, setState, theme, ui }) {
  const activePeriod = String(
    state?.activePeriod ??
    state?.session?.periodId ??
    state?.session?.period ??
    "2026"
  );

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
    return ["lead", "vice lead", "executive committee"].includes(lower);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Nama wajib diisi.");
    if (!form.loginId.trim()) return setError("Login ID wajib diisi.");
    if (!form.divisi.trim()) return setError("Divisi wajib diisi.");
    if (!form.position.trim()) return setError("Posisi/Jabatan wajib diisi.");

    const payload = {
      ...form,
      loginId: form.loginId.trim().toLowerCase(),
      isEC: detectIsEC(form.position),
      periodId: form.periodId || activePeriod,
    };

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
      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Manajemen Anggota</h1>
        <p className="mt-1 text-sm text-gray-500">
          Periode aktif: <b>{activePeriod}</b>
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Nama lengkap"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
          />

          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Login ID / Email"
            value={form.loginId}
            onChange={(e) => onChange("loginId", e.target.value)}
          />

          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Divisi"
            value={form.divisi}
            onChange={(e) => onChange("divisi", e.target.value)}
          />

          <select
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            value={form.position}
            onChange={(e) => onChange("position", e.target.value)}
          >
            <option>Staff</option>
            <option>Executive Committee</option>
            <option>Vice Lead</option>
            <option>Lead</option>
            <option>Admin</option>
          </select>

          <input
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            placeholder="Tahun Angkatan"
            value={form.tahunAngkatan}
            onChange={(e) => onChange("tahunAngkatan", e.target.value)}
          />

          <select
            className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
            value={form.periodId}
            onChange={(e) => onChange("periodId", e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.label || `Periode ${p.id}`}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
            >
              {editingId ? "Update Anggota" : "Tambah Anggota"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold"
            >
              Reset Form
            </button>

            <button
              type="button"
              onClick={loadMembers}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold"
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

      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Daftar Anggota</h2>
          <div className="text-sm text-gray-500">
            {loading ? "Memuat..." : `${filteredMembers.length} anggota`}
          </div>
        </div>

        <div className="mt-4">

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
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
                    <td className="px-3 py-2">{member.divisi}</td>
                    <td className="px-3 py-2">{member.position}</td>
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
              <div key={member.id} className="border rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "User")}`}
                    className="h-10 w-10 rounded-full border"
                  />
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.loginId}</div>
                  </div>
                </div>

                <div className="text-sm">
                  <div><b>Divisi:</b> {member.divisi}</div>
                  <div><b>Jabatan:</b> {member.position}</div>
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