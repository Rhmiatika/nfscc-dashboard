import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Card({ title, right, children, ui }) {
  return (
    <div className={ui.card}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-base font-semibold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
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
            "w-full max-w-3xl rounded-3xl border p-6 shadow-2xl",
            theme === "dark"
              ? "border-white/10 bg-slate-950"
              : "border-gray-200 bg-white"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              className={`${ui.btnBase} ${ui.btnGhost}`}
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function parseAnyDate(input) {
  const s = (input || "").toString().trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    const d = new Date(iso + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yy] = s.split("/").map(Number);
    const d = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatTanggalID(dateObj) {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
  });
  return fmt.format(dateObj);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthYearID(dateObj) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(dateObj);
}

function getDistanceFromToday(input) {
  const d = parseAnyDate(input);
  if (!d) return Number.MAX_SAFE_INTEGER;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.abs(d.getTime() - today.getTime());
}

export default function DashboardPage({ state, setState, theme, ui }) {
  const isAdmin = !!state?.session?.isAdmin;

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const members = Array.isArray(state?.members) ? state.members : [];
  const periods = Array.isArray(state?.periods) ? state.periods : [];
  const activePeriodId = String(
    state?.activePeriodId || state?.activePeriod || "2025"
  );

const activePeriod = periods.find(
  (item) => String(item.id) === activePeriodId
);

const activePeriodLabel =
  activePeriod?.label || `Periode ${activePeriodId}`;

  const me =
    members.find((m) => m.loginId === state?.session?.loginId) || null;

  const displayName =
    (me?.name || "").trim().split(" ").filter(Boolean)[0] || "Kak";

  function getMemberName(loginId) {
    const member = members.find((m) => String(m.loginId) === String(loginId));
    return member?.name || loginId || "-";
  }

  const thClass = "whitespace-nowrap px-4 py-2 text-left";
  const tdClass = "px-4 py-3 align-top";
  const tableHeadClass =
    theme === "dark"
      ? "border-b border-white/10 text-slate-300"
      : "border-b border-gray-200 text-gray-600";
  const tableRowClass =
    theme === "dark"
      ? "border-b border-white/10 last:border-0"
      : "border-b border-gray-200 last:border-0";

  const kegiatanSource = Array.isArray(state?.kegiatans)
    ? state.kegiatans
    : Array.isArray(state?.kegiatan)
    ? state.kegiatan
    : [];

  const prokerSource = Array.isArray(state?.proker) ? state.proker : [];

  const lastKegiatan = useMemo(() => {
    return [...kegiatanSource]
      .sort((a, b) => {
        const aDist = getDistanceFromToday(a?.tanggal || a?.date);
        const bDist = getDistanceFromToday(b?.tanggal || b?.date);

        if (aDist !== bDist) return aDist - bDist;

        const aTime = parseAnyDate(a?.tanggal || a?.date)?.getTime() || 0;
        const bTime = parseAnyDate(b?.tanggal || b?.date)?.getTime() || 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [kegiatanSource]);

  const lastProker = useMemo(() => {
    return [...prokerSource]
      .sort((a, b) => {
        const aDist = getDistanceFromToday(a?.tanggal || a?.date || a?.periode);
        const bDist = getDistanceFromToday(b?.tanggal || b?.date || b?.periode);

        if (aDist !== bDist) return aDist - bDist;

        const aTime =
          parseAnyDate(a?.tanggal || a?.date || a?.periode)?.getTime() || 0;
        const bTime =
          parseAnyDate(b?.tanggal || b?.date || b?.periode)?.getTime() || 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [prokerSource]);

  const dashboardTitle = activePeriodLabel;

  const dashboardBanner =
    state?.dashboard?.banner ||
    state?.dashboardBanner ||
    "/keyteams.jpeg";

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(dashboardTitle);
  const [editBannerPreview, setEditBannerPreview] = useState(dashboardBanner);
  const [editBannerData, setEditBannerData] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!editOpen) return;
    setEditTitle(dashboardTitle);
    setEditBannerPreview(dashboardBanner);
    setEditBannerData("");
    setEditError("");
  }, [editOpen, dashboardTitle, dashboardBanner]);

  const calendarEvents = useMemo(() => {
    const items = [];

    kegiatanSource.forEach((k) => {
      const rawDate = k?.tanggal || k?.date || "";
      const d = parseAnyDate(rawDate);
      if (!d) return;
      items.push({
        id: `kegiatan-${k?.id || rawDate}-${k?.title || k?.nama || ""}`,
        date: d,
        title: k?.title || k?.nama || "Kegiatan",
        type: "Kegiatan",
        location: k?.lokasi || k?.location || "-",
        createdBy: getMemberName(k?.pic || k?.createdBy),
      });
    });

    prokerSource.forEach((p) => {
      const rawDate = p?.tanggal || p?.date || p?.periode || "";
      const d = parseAnyDate(rawDate);
      if (!d) return;
      items.push({
        id: `proker-${p?.id || rawDate}-${p?.title || p?.nama || ""}`,
        date: d,
        title: p?.title || p?.nama || "Proker",
        type: "Proker",
        location: p?.divisi || "-",
        createdBy: getMemberName(p?.pic),
        status: p?.status || "-",
      });
    });

    return items.sort((a, b) => a.date - b.date);
  }, [kegiatanSource, prokerSource]);

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const monthStartDay = monthStart.getDay();
  const leadingEmpty = (monthStartDay + 6) % 7;
  const daysInMonth = monthEnd.getDate();

  const calendarDays = useMemo(() => {
    const cells = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        day
      );
      const events = calendarEvents.filter((item) => isSameDay(item.date, dateObj));
      cells.push({ day, dateObj, events });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth, calendarEvents, leadingEmpty, daysInMonth]);

  const monthAgenda = useMemo(() => {
    return calendarEvents.filter(
      (item) => item.date >= monthStart && item.date <= monthEnd
    );
  }, [calendarEvents, monthStart, monthEnd]);

  const reminder = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const items = [];

    kegiatanSource.forEach((k) => {
      const rawDate = k.tanggal || k.date || "";
      const d = parseAnyDate(rawDate);
      if (!d) return;
      d.setHours(0, 0, 0, 0);

      if (d >= today && d <= in30) {
        items.push({
          when: d,
          type: "kegiatan",
          title: k.title || k.nama || "-",
        });
      }
    });

    prokerSource.forEach((p) => {
      const rawDate = p.tanggal || p.date || p.periode || "";
      const d = parseAnyDate(rawDate);
      if (!d) return;
      d.setHours(0, 0, 0, 0);

      if (d >= today && d <= in30) {
        items.push({
          when: d,
          type: "proker",
          title: p.title || p.nama || "-",
        });
      }
    });

    items.sort((a, b) => a.when - b.when);

    if (items.length === 0) {
      return {
        has: false,
        text: `Hai ${displayName}, belum ada jadwal kegiatan/proker 1 bulan ke depan.`,
      };
    }

    const x = items[0];
    const tanggalID = formatTanggalID(x.when);
    return {
      has: true,
      text: `Hai ${displayName}, jangan lupa ya tanggal ${tanggalID} kamu ada ${x.type} ${x.title}.`,
    };
  })();

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });
  }

  async function handleEditBannerChange(file) {
    if (!file || !isAdmin) return;

    const maxMB = 4;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      setEditError(`Ukuran gambar terlalu besar. Maksimal ${maxMB}MB.`);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setEditBannerData(dataUrl);
      setEditBannerPreview(dataUrl);
      setEditError("");
    } catch (err) {
      setEditError(err?.message || "Gagal membaca file gambar.");
    }
  }

  function openEditBanner() {
    if (!isAdmin) return;
    setEditOpen(true);
  }

  function closeEditBanner() {
    setEditOpen(false);
    setEditError("");
  }

  function saveBannerSettings(e) {
    e.preventDefault();
    if (!isAdmin) return;

    const finalTitle = String(editTitle || "").trim();
    if (!finalTitle) {
      setEditError("Judul banner tidak boleh kosong.");
      return;
    }

    setState((prev) => ({
      ...prev,
      dashboard: {
        ...(prev.dashboard || {}),
        title: finalTitle,
        banner: editBannerData || prev?.dashboard?.banner || "",
      },
    }));

    closeEditBanner();
  }

  function resetBanner() {
    if (!isAdmin) return;
    setState((prev) => ({
      ...prev,
      dashboard: {
        ...(prev.dashboard || {}),
        title: prev?.meta?.periodLabel || activePeriodLabel,
        banner: "",
      },
    }));
  }

  return (
    <div className="space-y-6">
      <div
        className={cx(
          "rounded-2xl p-5 ring-1",
          theme === "dark"
            ? reminder.has
              ? "bg-emerald-950/30 ring-emerald-900 text-emerald-100"
              : "bg-slate-950/40 ring-slate-800 text-slate-200"
            : reminder.has
            ? "bg-emerald-50 ring-emerald-200 text-emerald-900"
            : "bg-white ring-gray-200 text-gray-800"
        )}
      >
        <div className="text-sm font-semibold">Pengingat 1 Bulan ke Depan</div>
        <div
          className={cx(
            "mt-2 text-sm",
            theme === "dark" ? "text-slate-200" : "text-gray-700"
          )}
        >
          {reminder.text}
        </div>
      </div>

      <div className={ui.card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">{dashboardTitle}</div>
            <div className={cx("mt-2 text-sm", ui.textMuted2)} />
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost)}
                onClick={openEditBanner}
              >
                Edit
              </button>

              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost)}
                onClick={resetBanner}
              >
                Reset
              </button>
            </div>
          ) : null}
        </div>

        <div
          className={cx(
            "mt-4 overflow-hidden rounded-2xl ring-1",
            theme === "dark" ? "ring-slate-800" : "ring-gray-200"
          )}
        >
          <img
            src={dashboardBanner}
            alt="Banner kegiatan NFSCC"
            className="h-[500px] w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const next = e.currentTarget.nextSibling;
              if (next) next.style.display = "grid";
            }}
          />

          <div
            style={{ display: "none" }}
            className={cx(
              "h-[240px] w-full place-items-center",
              theme === "dark"
                ? "bg-slate-950/40 text-slate-300"
                : "bg-gray-50 text-gray-500"
            )}
          >
            <div className="text-center">
              <div className="text-sm font-semibold">Banner belum diatur</div>
              <div className="text-xs opacity-80">
                Atur judul dan gambar dari tombol Edit saat login sebagai admin.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card
        title="Kalender Jadwal Kegiatan"
        ui={ui}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnGhost, "px-3")}
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              ←
            </button>
            <div className={cx("min-w-[160px] text-center text-sm font-semibold", ui.textMuted)}>
              {formatMonthYearID(calendarMonth)}
            </div>
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnGhost, "px-3")}
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              →
            </button>
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] items-stretch">
          <div>
            <div className={cx("mb-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase", ui.textMuted)}>
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className={cx(
                        "min-h-[72px] rounded-xl border border-dashed",
                        theme === "dark"
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-gray-200 bg-gray-50/70"
                      )}
                    />
                  );
                }

                const isToday = isSameDay(cell.dateObj, new Date());
                const hasEvent = cell.events.length > 0;
                const hasKegiatan = cell.events.some((event) => event.type === "Kegiatan");
                const hasProker = cell.events.some((event) => event.type === "Proker");

                const calendarCellTone =
                  hasKegiatan && hasProker
                    ? theme === "dark"
                      ? "border-violet-700 bg-violet-950/20"
                      : "border-violet-200 bg-violet-50/70"
                    : hasKegiatan
                    ? theme === "dark"
                      ? "border-sky-700 bg-sky-950/20"
                      : "border-sky-200 bg-sky-50/70"
                    : hasProker
                    ? theme === "dark"
                      ? "border-violet-700 bg-violet-950/20"
                      : "border-violet-200 bg-violet-50/70"
                    : theme === "dark"
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-gray-200 bg-white";

                const badgeTone =
                  hasKegiatan && hasProker
                    ? theme === "dark"
                      ? "bg-violet-900/70 text-violet-100"
                      : "bg-violet-100 text-violet-700"
                    : hasKegiatan
                    ? theme === "dark"
                      ? "bg-sky-900/70 text-sky-100"
                      : "bg-sky-100 text-sky-700"
                    : hasProker
                    ? theme === "dark"
                      ? "bg-violet-900/70 text-violet-100"
                      : "bg-violet-100 text-violet-700"
                    : "";

                return (
                  <div
                    key={cell.day}
                    className={cx("min-h-[72px] rounded-xl border p-2", calendarCellTone)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cx(
                          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                          isToday
                            ? theme === "dark"
                              ? "bg-slate-100 text-slate-900"
                              : "bg-slate-900 text-white"
                            : ""
                        )}
                      >
                        {cell.day}
                      </div>
                      {hasEvent ? (
                        <span
                          className={cx(
                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                            badgeTone
                          )}
                        >
                          {cell.events.length} jadwal
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {cell.events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cx(
                            "truncate rounded-xl px-2 py-1 text-xs",
                            theme === "dark"
                              ? "bg-white/10 text-slate-100"
                              : "bg-white text-gray-700 ring-1 ring-gray-200"
                          )}
                          title={`${event.type}: ${event.title}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {cell.events.length > 2 ? (
                        <div className={cx("px-1 text-[11px]", ui.textMuted)}>
                          +{cell.events.length - 2} jadwal lain
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={cx(
             "rounded-2xl border p-4 h-full flex flex-col",
              theme === "dark"
                ? "border-white/10 bg-white/[0.03]"
                : "border-gray-200 bg-gray-50/70"
            )}
          >
            <div className="text-sm font-semibold">
              Agenda {formatMonthYearID(calendarMonth)}
            </div>
            <div className={cx("mt-1 text-xs", ui.textMuted)}>
              Menampilkan jadwal kegiatan dan proker pada bulan yang dipilih.
            </div>

            <div
              className={cx(
                "mt-4 max-h-[430px] overflow-y-auto pr-1",
                monthAgenda.length > 3 ? "space-y-3" : "space-y-3"
              )}
            >
              {monthAgenda.length === 0 ? (
                <div
                  className={cx(
                    "rounded-2xl border border-dashed p-4 text-sm",
                    theme === "dark"
                      ? "border-white/10 text-slate-300"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  Belum ada jadwal pada bulan ini.
                </div>
              ) : (
                monthAgenda.map((event) => (
                  <div
                    key={event.id}
                    className={cx(
                      "rounded-2xl border p-3",
                      theme === "dark"
                        ? "border-white/10 bg-slate-950/30"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{event.title}</div>
                        <div className={cx("mt-1 text-xs", ui.textMuted)}>
                          {event.type} • {formatTanggalID(event.date)}
                        </div>
                      </div>
                      <span
                        className={cx(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          event.type === "Kegiatan"
                            ? theme === "dark"
                              ? "bg-sky-900/60 text-sky-100"
                              : "bg-sky-100 text-sky-700"
                            : theme === "dark"
                            ? "bg-violet-900/60 text-violet-100"
                            : "bg-violet-100 text-violet-700"
                        )}
                      >
                        {event.type}
                      </span>
                    </div>

                    <div className={cx("mt-3 space-y-1 text-xs", ui.textMuted)}>
                      <div>Lokasi/Divisi: {event.location || "-"}</div>
                      <div>PIC: {event.createdBy || "-"}</div>
                      {event.status ? <div>Status: {event.status}</div> : null}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <NavLink
                        to={event.type === "Kegiatan" ? "/kegiatan" : "/proker"}
                        className={cx(
                          "text-xs font-medium",
                          ui.textMuted,
                          "hover:opacity-80"
                        )}
                      >
                        {event.type === "Kegiatan"
                          ? "Lihat Kegiatan →"
                          : "Lihat Proker →"}
                      </NavLink>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={`Daftar Proker ${activePeriodId}`}
        ui={ui}
        right={
          <NavLink
            to="/proker"
            className={cx("text-sm", ui.textMuted, "hover:opacity-80")}
          >
            Lihat semua →
          </NavLink>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Nama</th>
                <th className={thClass}>Divisi</th>
                <th className={thClass}>Tanggal</th>
                <th className={thClass}>PIC</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Anggaran</th>
              </tr>
            </thead>
            <tbody>
              {lastProker.map((p) => (
                <tr key={p.id} className={tableRowClass}>
                  <td className={cx(tdClass, "font-medium")}>
                    {p.title || p.nama || "-"}
                  </td>
                  <td className={tdClass}>{p.divisi || "-"}</td>
                  <td className={tdClass}>{p.tanggal || p.date || "-"}</td>
                  <td className={tdClass}>{getMemberName(p.pic)}</td>
                  <td className={tdClass}>{p.status || "-"}</td>
                  <td className={tdClass}>
                    Rp{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      Number(p.anggaran || p.budget || 0)
                    )}
                  </td>
                </tr>
              ))}
              {lastProker.length === 0 ? (
                <tr className={tableRowClass}>
                  <td className={cx(tdClass, ui.textMuted2)} colSpan={6}>
                    Belum ada proker.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={editOpen}
        title="Edit Banner Dashboard"
        onClose={closeEditBanner}
        ui={ui}
        theme={theme}
      >
        <form onSubmit={saveBannerSettings} className="space-y-4">
          <div>
            <label className={ui.label || "mb-1 block text-sm"}>Judul</label>
            <input
              className={ui.input}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={`Contoh: ${activePeriodLabel}`}
            />
          </div>

          <div>
            <label className={ui.label || "mb-1 block text-sm"}>Ganti Gambar</label>
            <input
              type="file"
              accept="image/*"
              className={ui.input}
              onChange={(e) => handleEditBannerChange(e.target.files?.[0])}
            />
            <div className={cx("mt-2 text-xs", ui.textMuted2 || ui.textMuted)}>
              Maksimal 4MB.
            </div>
          </div>

          <div>
            <div className={cx("mb-2 text-sm font-medium", ui.textMuted || "")}>
              Preview
            </div>
            <div
              className={cx(
                "overflow-hidden rounded-2xl ring-1",
                theme === "dark" ? "ring-slate-800" : "ring-gray-200"
              )}
            >
              <img
                src={editBannerPreview}
                alt="Preview banner dashboard"
                className="h-[260px] w-full object-cover"
              />
            </div>
          </div>

          {editError ? (
            <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 ring-1 ring-red-200">
              {editError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className={`${ui.btnBase} ${ui.btnPrimary}`}
            >
              Simpan
            </button>
            <button
              type="button"
              className={`${ui.btnBase} ${ui.btnGhost}`}
              onClick={closeEditBanner}
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}