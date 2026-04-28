import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPeriod,
  deletePeriod,
  getPeriods,
  getCurrentPeriodId,
  setActivePeriodId,
  setPeriodEnabled,
  loadStateForPeriod,
  replaceLoginDomain,
  normalizeDomain,
  saveState,
} from "../storage";
import { saveBackendState } from "../Services/appStateService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function getExpectedDomainByYear(year) {
  return Number(year) >= 2026 ? "nfcc" : "nfscc";
}

export default function PeriodePage({ state, setState, theme, ui }) {
  const nav = useNavigate();
  const isAdmin = !!state?.session?.isAdmin;

  const [year, setYear] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");

  const periods = useMemo(() => {
    try {
      return getPeriods() || [];
    } catch {
      return [];
    }
  }, [state?.session?.period, state?.activePeriod, state?.periods]);

  const normalizedPeriods = useMemo(() => {
    const list = periods || [];

    // cari yang aktif
    const active = list.find((p) => p.isActive);

    // kalau ga ada yang aktif, ambil enabled pertama
    const fallback = list.find((p) => p.isEnabled);

    const activeId = active?.id || fallback?.id;

    return list.map((p) => ({
      ...p,
      isEnabled: String(p.id) === String(activeId),
    }));
  }, [periods]);

  const btnPrimary =
    theme === "dark"
      ? "bg-white text-slate-900 hover:bg-white/90"
      : "bg-gray-900 text-white hover:bg-gray-800";

  const btnDanger =
    theme === "dark"
      ? "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-500/30"
      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200";

  const btnGhost =
    theme === "dark"
      ? "bg-white/5 text-slate-100 hover:bg-white/10 border border-white/10"
      : "bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200";

  function applyLoadedPeriod(periodId) {
    const nextPeriodId = String(periodId || getCurrentPeriodId() || "2025");
    const periodState = loadStateForPeriod(nextPeriodId);
    const nextPeriods = (getPeriods() || []).map((p) => ({
      ...p,
      isActive: String(p.id) === String(nextPeriodId),
    }));
    const nextPeriodMeta =
      nextPeriods.find((p) => String(p.id) === nextPeriodId) || null;
    const nextDomain = normalizeDomain(nextPeriodMeta?.domain, nextPeriodId);

    const nextState = {
      ...state,
      ...periodState,
      session: {
        ...(periodState?.session || {}),
        ...(state.session || {}),
        period: nextPeriodId,
        periodId: nextPeriodId,
        currentPeriodId: nextPeriodId,
        activePeriodId: nextPeriodId,
        isAuthed: state?.session?.isAuthed,
        isAdmin: state?.session?.isAdmin,
        isEC: state?.session?.isEC,
        role: state?.session?.role || "",
        name: state?.session?.name || "",
        divisi: state?.session?.divisi || "",
        apiUser: state?.session?.apiUser || null,
        loginId: replaceLoginDomain(state?.session?.loginId || "", nextDomain),
      },
      activePeriodId: nextPeriodId,
      activePeriod: nextPeriodId,
      periods: nextPeriods,
    };

    setState(nextState);
    saveState(nextState);
  }

  async function syncPeriodsToBackend(targetIds, activeId) {
    const ids = Array.from(new Set((targetIds || []).map((x) => String(x || "").trim()).filter(Boolean)));
    if (ids.length === 0) return;

    const payload = {
      periods: getPeriods(),
      activePeriodId: String(activeId || getCurrentPeriodId() || "2025"),
      activePeriod: String(activeId || getCurrentPeriodId() || "2025"),
      session: {
        period: String(activeId || getCurrentPeriodId() || "2025"),
        periodId: String(activeId || getCurrentPeriodId() || "2025"),
        currentPeriodId: String(activeId || getCurrentPeriodId() || "2025"),
        activePeriodId: String(activeId || getCurrentPeriodId() || "2025"),
      },
    };

    await Promise.all(ids.map((id) => saveBackendState(id, payload)));
  }

  if (!isAdmin) {
    return (
      <div className="w-full">
        <div className={ui.card}>
          <div className="text-lg font-semibold">Akses ditolak</div>
          <div className="mt-2 text-sm opacity-70">
            Halaman ini hanya untuk Admin.
          </div>
          <button
            className={cx(
              "mt-4 rounded-2xl px-4 py-2 text-sm font-semibold",
              btnPrimary
            )}
            onClick={() => nav("/dashboard")}
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  async function onAddPeriod(e) {
    e.preventDefault();
    setError("");

    const y = String(year || "").trim();
    if (!/^(19|20)\d{2}$/.test(y)) {
      setError("Masukkan tahun 4 digit (contoh: 2027).");
      return;
    }

    const dRaw = String(domain || "").trim().toLowerCase().replace(/^@/, "");
    const d = dRaw || getExpectedDomainByYear(y);

    if (!/^[a-z0-9-]{2,30}$/.test(d)) {
      setError("Domain tidak valid. Contoh: nfscc atau nfcc (tanpa @).");
      return;
    }

    createPeriod(y, d);
    setActivePeriodId(y);
    applyLoadedPeriod(y);
    await syncPeriodsToBackend([y], y);

    setYear("");
    setDomain("");
  }

  function getEnabledPeriodsExcept(currentId) {
    return (getPeriods() || [])
      .filter((p) => !!p.isEnabled && String(p.id) !== String(currentId))
      .map((p) => String(p.id));
  }

  async function onTogglePeriod(p) {
    const pid = String(p?.id || "");
    const isEnabled = !!p?.isEnabled;

    if (!pid) return;

    // Kalau mau dinonaktifkan
    if (isEnabled) {
      const ok = setPeriodEnabled(pid, false);
      if (!ok) {
        alert("Minimal harus ada 1 periode aktif.");
        return;
      }

      const nextActiveId = getCurrentPeriodId();
      setActivePeriodId(nextActiveId);
      applyLoadedPeriod(nextActiveId);

      await syncPeriodsToBackend([pid, nextActiveId], nextActiveId);
      return;
    }

    // Kalau mau diaktifkan:
    // aktifkan pid, lalu nonaktifkan periode aktif lain
    const previouslyEnabledIds = getEnabledPeriodsExcept(pid);

    const ok = setPeriodEnabled(pid, true);
    if (!ok) {
      alert("Gagal mengaktifkan periode.");
      return;
    }

    for (const otherId of previouslyEnabledIds) {
      setPeriodEnabled(otherId, false);
    }

    setActivePeriodId(pid);
    applyLoadedPeriod(pid);

    await syncPeriodsToBackend([pid, ...previouslyEnabledIds], pid);
  }

  async function onDeletePeriod(id) {
    const pid = String(id);

    if (pid === "2025" || pid === "2026") {
      alert(`Periode ${pid} tidak boleh dihapus.`);
      return;
    }

    const ok = confirm(`Hapus periode ${pid}? Data periode ini akan hilang.`);
    if (!ok) return;

    const success = deletePeriod(pid);

    if (!success) {
      alert(`Periode ${pid} gagal dihapus.`);
      return;
    }

    const fallback = getCurrentPeriodId();
    applyLoadedPeriod(fallback);
    await syncPeriodsToBackend([fallback], fallback);
  }

  return (
    <div className="w-full">
      <div className={ui.card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Kelola Periode</h1>
            <p className={cx("mt-2 text-sm", ui.textMuted)}>
              {/* Tambah/hapus periode hanya bisa dilakukan oleh Admin. */}
            </p>
            <p className={cx("mt-1 text-sm", ui.textMuted)}>
              Periode yang <b>aktif</b> akan menjadi acuan domain login.
            </p>
          </div>
        </div>

        <form
          onSubmit={onAddPeriod}
          className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start"
        >
          <div className="xl:col-span-4">
            <label className="mb-2 block text-sm font-medium">
              Tahun Periode Baru
            </label>
            <input
              className={ui.input}
              value={year}
              onChange={(e) => {
                const v = e.target.value;
                setYear(v);

                const yy = String(v || "").trim();
                if (/^(19|20)\d{2}$/.test(yy) && !String(domain || "").trim()) {
                  setDomain(getExpectedDomainByYear(yy));
                }
              }}
              placeholder="contoh: 2027"
            />
          </div>

          <div className="xl:col-span-4">
            <label className="mb-2 block text-sm font-medium">Domain</label>
            <input
              className={ui.input}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="contoh: nfcc (tanpa @)"
            />
            <div className={cx("mt-2 text-xs", ui.textMuted2)}>
              Kosongkan untuk mengisi otomatis mengikuti periiode yang aktif
            </div>
          </div>

          <div className="xl:col-span-2">
            <button
              className={cx(
                "mt-8 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                btnPrimary
              )}
              type="submit"
            >
              Tambah Periode
            </button>
          </div>

          {error ? (
            <div className="xl:col-span-12 rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          ) : null}
        </form>

        <div className="mt-10">
          <div className="mb-3 text-lg font-semibold">Daftar Periode</div>

        <div className="mt-4">

            {/* DESKTOP */}
          <div className="hidden md:block">
            <div className={ui.tableWrap}>
              <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>ID</th>
                  <th className={ui.th}>Label</th>
                  <th className={ui.th}>Domain</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const pid = String(p.id);
                  const locked = pid === "2025" || pid === "2026";

                  return (
                    <tr key={pid}>
                      <td className={ui.td}>{pid}</td>
                      <td className={ui.td}>{p.label}</td>
                      <td className={ui.td}>@{p.domain}</td>
                      <td className={ui.td}>
                        <div className="flex flex-wrap gap-2">
                          <span className={p.isEnabled ? ui.badgeGreen : ui.badge}>
                            {p.isEnabled ? "Enabled" : "Nonaktif"}
                          </span>
                          {p.isActive ? (
                            <span className={ui.badge}>
                              Aktif Dashboard
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={ui.td}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={cx(
                              "rounded-xl px-3 py-1.5 text-xs font-semibold",
                              p.isActive ? btnGhost : btnPrimary
                            )}
                            onClick={() => onTogglePeriod(p)}
                          >
                            {p.isActive ? "Sedang Aktif" : "Aktifkan"}
                          </button>

                          {locked ? (
                            <span className={cx("text-xs", ui.textMuted2, "self-center")}>
                              Tidak bisa dihapus
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={cx(
                                "rounded-xl px-3 py-1.5 text-xs font-semibold",
                                btnDanger
                              )}
                              onClick={() => onDeletePeriod(pid)}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {periods.length === 0 ? (
                  <tr>
                    <td className={ui.td} colSpan={5}>
                      <span className={ui.textMuted}>Belum ada data periode.</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </div>

        {/* MOBILE */}
          <div className="md:hidden space-y-3">
            {periods.map((p) => {
              const pid = String(p.id);
              const locked = pid === "2025" || pid === "2026";

              return (
                <div key={pid} className="border rounded-2xl p-4 space-y-3">
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{pid}</div>
                      <div className="text-sm text-gray-500">{p.label}</div>
                    </div>

                    <div className="text-sm">@{p.domain}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={p.isEnabled ? ui.badgeGreen : ui.badge}>
                      {p.isEnabled ? "Enabled" : "Nonaktif"}
                    </span>

                    {p.isActive && (
                      <span className={ui.badge}>
                        Aktif Dashboard
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className={cx(
                        "rounded-xl px-3 py-1.5 text-xs font-semibold",
                        p.isActive ? btnGhost : btnPrimary
                      )}
                      onClick={() => onTogglePeriod(p)}
                    >
                      {p.isActive ? "Sedang Aktif" : "Aktifkan"}
                    </button>

                    {locked ? (
                      <span className="text-xs text-gray-400 self-center">
                        Tidak bisa dihapus
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={cx(
                          "rounded-xl px-3 py-1.5 text-xs font-semibold",
                          btnDanger
                        )}
                        onClick={() => onDeletePeriod(pid)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>


          <div className={cx("mt-4 text-xs", ui.textMuted2)}>
            Note:
            <br />
              Kosongkan untuk membuat domain otomatis mengikuti periode yang aktif.
            <br />
            - Minimal harus ada satu periode aktif.
          </div>
        </div>
        </div>
        </div>
      </div>
  );
}