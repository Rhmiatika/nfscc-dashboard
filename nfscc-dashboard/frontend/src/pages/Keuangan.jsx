import React, { useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "../config/sheets";
import {
  listKeuanganApi,
  createKasApi,
  createNonKasApi,
  updateKasApi,
  updateNonKasApi,
  deleteKeuanganApi,
} from "../Services/keuanganService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function formatRupiah(n) {
  const val = Number(n || 0);
  return `Rp ${val.toLocaleString("id-ID")}`;
}

function safeDateValue(s) {
  const d = new Date(s);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function fmtMonthYear(date) {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function monthDiffInclusive(start, end) {
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  const diff =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return diff + 1;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseMonthYearLabelToDate(label) {
  if (!label) return null;
  const raw = String(label).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/januari/i, "January")
    .replace(/februari/i, "February")
    .replace(/maret/i, "March")
    .replace(/april/i, "April")
    .replace(/mei/i, "May")
    .replace(/juni/i, "June")
    .replace(/juli/i, "July")
    .replace(/agustus/i, "August")
    .replace(/oktober/i, "October")
    .replace(/desember/i, "December");

  const direct = new Date(`${normalized} 1`);
  if (Number.isFinite(direct.getTime())) {
    return new Date(direct.getFullYear(), direct.getMonth(), 1);
  }

  const match = normalized.match(/([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;

  const monthMap = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

  const monthIndex = monthMap[match[1].toLowerCase()];
  const year = Number(match[2]);
  if (!Number.isFinite(monthIndex) || !Number.isFinite(year)) return null;

  return new Date(year, monthIndex, 1);
}

function iterateMonthsInclusive(start, end) {
  if (!start || !end) return [];
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  if (e < s) return [];

  const months = [];
  const cursor = new Date(s);
  while (cursor <= e) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function CalendarIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 3V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 3V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserLockIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 20C5.8 16.9 8.4 15 12 15C13.2 15 14.3 15.2 15.2 15.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="15"
        y="14"
        width="5"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16 14V13.2C16 11.98 16.98 11 18.2 11C19.42 11 20.4 11.98 20.4 13.2V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DateField({ label, type = "date", value, onChange, ui, theme }) {
  return (
    <div>
      <label className={cx("mb-1 block text-sm", ui.textMuted)}>{label}</label>
      <div className="relative mt-2">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className={cx(
            ui.input,
            "pr-12 dark-date-input no-native-calendar-icon"
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <CalendarIcon
            className={theme === "dark" ? "text-white" : "text-gray-700"}
          />
        </div>
      </div>
    </div>
  );
}

function EditModal({ open, title, onClose, children, theme, ui }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/40"
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
            <h3 className="text-xl font-semibold">{title}</h3>
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnGhost)}
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDownloadDate(value = new Date()) {
  return value.toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KeuanganPage({ state, setState, ui, theme }) {
  const FINANCE_SHEET_WEBHOOK = APP_CONFIG.financeSheetWebhook;
  const FINANCE_SHEET_URL = APP_CONFIG.financeSheetUrl;

    function getActivePeriodId(source) {
      return String(
        source?.activePeriodId ||
          source?.activePeriod ||
          source?.session?.periodId ||
          source?.session?.period ||
          "2026"
      );
    }

    function readFinanceSlice(source) {
      return source?.finance || {};
    }

    function writeFinanceSlice(prevState, nextFinance) {
      return {
        ...prevState,
        finance: {
          ...(prevState?.finance || {}),
          ...(nextFinance || {}),
        },
      };
    }

    function getDefaultDateByPeriod() {
      return new Date().toISOString().slice(0, 10);
    }

    function getDefaultMonthByPeriod(periodId) {
      const year = Number(periodId);
      if (Number.isFinite(year)) {
        return `${year}-01`;
      }
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

  const [loadingFinance, setLoadingFinance] = useState(false);
  
  async function loadFinance() {
    try {
      setLoadingFinance(true);

      const rows = await listKeuanganApi(periodKey);

      const filteredRows = rows.filter(
        (x) => String(x.periodId || x.periode) === String(periodKey)
      );

      const kasRows = filteredRows.filter((x) => x.kind === "kas");
      const nonKasRows = filteredRows.filter((x) => x.kind !== "kas");

      setState((prev) => {
        const prevFinance = readFinanceSlice(prev);

        return writeFinanceSlice(prev, {
          ...prevFinance,
          saldoAwal: 0,
          kasPayments: kasRows || [],
          transaksi: nonKasRows || [],
        });
      });

    } catch (err) {
      console.error("Gagal load keuangan:", err);
      setSyncError(err.message || "Gagal memuat data keuangan.");
    } finally {
      setLoadingFinance(false);
    }
  }

  const sessionLoginId = state?.session?.loginId || "";
  const periodKey = getActivePeriodId(state);
  const periodData = state || {};

  const members = Array.isArray(state?.members) ? state.members : [];

  const me = useMemo(() => {
    if (!sessionLoginId) return null;
    return members.find((m) => m.loginId === sessionLoginId) || null;
  }, [members, sessionLoginId]);

  const myDivisionRaw = String(me?.divisi || me?.division || "");
  const isAuthed = !!state?.session?.isAuthed;
  const isFinanceManager =
    !!state?.session?.isAdmin || /treasurer|bendahara/i.test(myDivisionRaw);

  const canViewFinance = true;
  const canViewFinanceDetail = isAuthed;
  const canManageFinance = isFinanceManager;

  const myMemberId = me?.loginId ? String(me.loginId) : "";
  const myMemberName = me?.name || sessionLoginId || "-";
  const myMemberDivisi = me?.divisi || me?.division || "-";

  function canViewProof(row) {
    if (!isAuthed) return false;
    if (!row?.proof?.url) return false;

    return !!state?.session?.isAdmin || isFinanceManager;
  }

  const finance = periodData.finance || {};
  const transaksi = Array.isArray(finance.transaksi) ? finance.transaksi : [];
  const kasPayments = Array.isArray(finance.kasPayments)
    ? finance.kasPayments
    : [];

  const saldoAwal = 0;

  const proofInputRef = useRef(null);
  const nonKasProofInputRef = useRef(null);

  const selectClass = cx("mt-2", ui.select || ui.input);
  const linkClass =
    theme === "dark"
      ? "text-blue-300 hover:text-blue-200 underline"
      : "text-blue-600 hover:text-blue-700 underline";
  const tableHeadClass =
    theme === "dark"
      ? "border-b border-white/10 text-slate-300"
      : "border-b border-gray-200 text-gray-600";
  const tableRowClass =
    theme === "dark"
      ? "border-b border-white/10 last:border-0"
      : "border-b border-gray-200 last:border-0";
  const cardInnerClass = cx(
    "rounded-3xl border p-5 shadow-sm",
    theme === "dark"
      ? "border-white/10 bg-white/5"
      : "border-gray-200 bg-white"
  );
  const sectionTitleClass =
    "text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight";

  const totalMasukNonKas = useMemo(() => {
    return transaksi
      .filter((t) => String(t.tipe).toLowerCase() === "masuk")
      .reduce((sum, t) => sum + Number(t.nominal || 0), 0);
  }, [transaksi]);

  const totalKeluarNonKas = useMemo(() => {
    return transaksi
      .filter((t) => String(t.tipe).toLowerCase() === "keluar")
      .reduce((sum, t) => sum + Number(t.nominal || 0), 0);
  }, [transaksi]);

  const totalKasMasuk = useMemo(() => {
    return kasPayments.reduce((sum, p) => sum + Number(p.total || 0), 0);
  }, [kasPayments]);

  const totalMasuk = totalMasukNonKas + totalKasMasuk;
  const totalKeluar = totalKeluarNonKas;
  const saldoSaatIni = saldoAwal + totalMasuk - totalKeluar;

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );
  const nextMonthStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 1),
    [now]
  );

  const isInThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const t = safeDateValue(dateStr);
    if (!t) return false;
    return t >= monthStart.getTime() && t < nextMonthStart.getTime();
  };

  const pemasukanBulanIni = useMemo(() => {
    const nonKasMasuk = transaksi
      .filter(
        (t) =>
          String(t.tipe).toLowerCase() === "masuk" && isInThisMonth(t.tanggal)
      )
      .reduce((sum, t) => sum + Number(t.nominal || 0), 0);

    const kasMasuk = kasPayments
      .filter((p) => isInThisMonth(p.tanggal))
      .reduce((sum, p) => sum + Number(p.total || 0), 0);

    return nonKasMasuk + kasMasuk;
  }, [transaksi, kasPayments, monthStart, nextMonthStart]);

  const pengeluaranBulanIni = useMemo(() => {
    return transaksi
      .filter(
        (t) =>
          String(t.tipe).toLowerCase() === "keluar" && isInThisMonth(t.tanggal)
      )
      .reduce((sum, t) => sum + Number(t.nominal || 0), 0);
  }, [transaksi, monthStart, nextMonthStart]);

  const [kasTanggal, setKasTanggal] = useState(() =>
    getDefaultDateByPeriod(periodKey)
  );
  const [kasMemberId, setKasMemberId] = useState("");
  const [kasStartMonth, setKasStartMonth] = useState(() =>
    getDefaultMonthByPeriod(periodKey)
  );
  const [kasEndMonth, setKasEndMonth] = useState(() =>
    getDefaultMonthByPeriod(periodKey)
  );
  const [kasProof, setKasProof] = useState(null);
  const [kasCatatan, setKasCatatan] = useState("");
  const [kasError, setKasError] = useState("");
  const [syncError, setSyncError] = useState("");

  const kasNominalPerBulan = 15000;

  useEffect(() => {
    if (!periodKey) return;
    loadFinance();
  }, [periodKey]);

  useEffect(() => {
    if (isFinanceManager) {
      setKasMemberId((prev) => {
        if (prev) return prev;
        return members[0]?.loginId ? String(members[0].loginId) : "";
      });
    } else {
      setKasMemberId(myMemberId || "");
    }
  }, [isFinanceManager, myMemberId, members]);

  const effectiveKasMemberId = isFinanceManager
    ? kasMemberId || (members[0]?.loginId ? String(members[0].loginId) : "")
    : myMemberId;

  const effectiveKasMember =
    members.find((m) => String(m.loginId) === String(effectiveKasMemberId)) ||
    (me
      ? {
          loginId: myMemberId,
          name: myMemberName,
          divisi: myMemberDivisi,
        }
      : null);

  const startMonthDate = useMemo(() => {
    if (!kasStartMonth) return null;
    const [y, m] = kasStartMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [kasStartMonth]);

  const endMonthDate = useMemo(() => {
    if (!kasEndMonth) return null;
    const [y, m] = kasEndMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [kasEndMonth]);

  const monthsCount = useMemo(() => {
    if (!startMonthDate || !endMonthDate) return 0;
    const s = startOfMonth(startMonthDate);
    const e = startOfMonth(endMonthDate);
    if (e < s) return 0;
    return monthDiffInclusive(s, e);
  }, [startMonthDate, endMonthDate]);

  const kasTotalBayar = monthsCount * kasNominalPerBulan;

  const isKasFormValid =
    !!sessionLoginId &&
    !!effectiveKasMemberId &&
    !!kasTanggal &&
    !!kasStartMonth &&
    !!kasEndMonth &&
    monthsCount > 0;

  async function handleProofChange(file) {
    setKasError("");
    if (!file) {
      setKasProof(null);
      return;
    }

    const maxMB = 4;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      setKasProof(null);
      setKasError(`Ukuran file terlalu besar. Maksimal ${maxMB}MB.`);
      if (proofInputRef.current) proofInputRef.current.value = "";
      return;
    }

    setKasProof({
      name: file.name,
      type: file.type || "application/octet-stream",
      file, //
    });
  }

  async function handleNonKasProofChange(file) {
    setTError("");

    if (!file) {
      setTProof(null);
      return;
    }

    const maxMB = 4;
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > maxMB) {
      setTProof(null);
      setTError(`Ukuran file terlalu besar. Maksimal ${maxMB}MB.`);
      if (nonKasProofInputRef.current) nonKasProofInputRef.current.value = "";
      return;
    }

    setTProof({
      name: file.name,
      type: file.type || "application/octet-stream",
      file,
    });
  }

  async function sendFinanceRequest(body) {
    if (
      !FINANCE_SHEET_WEBHOOK ||
      FINANCE_SHEET_WEBHOOK.includes("PASTE_URL")
    ) {
      return;
    }

    const res = await fetch(FINANCE_SHEET_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (json && json.success === false) {
      throw new Error(json.error || "Gagal sinkron ke spreadsheet.");
    }
  }

  function removeFinanceItemFromState(prevState, row) {
    const prevFinance = readFinanceSlice(prevState);

    const prevKas = Array.isArray(prevFinance.kasPayments)
      ? prevFinance.kasPayments
      : [];
    const prevNonKas = Array.isArray(prevFinance.transaksi)
      ? prevFinance.transaksi
      : [];

    const nextKas =
      row.kind === "kas"
        ? prevKas.filter((x) => String(x?.id) !== String(row?.id))
        : prevKas;

    const nextNonKas =
      row.kind === "nonkas"
        ? prevNonKas.filter((x) => String(x?.id) !== String(row?.id))
        : prevNonKas;

    return writeFinanceSlice(prevState, {
      ...prevFinance,
      kasPayments: nextKas,
      transaksi: nextNonKas,
    });
  }

  function makeFinanceIdentityKey(item, kind = "nonkas") {
    if (kind === "kas") {
      return [
        "kas",
        String(item?.memberId || item?.member_id || "").trim().toLowerCase(),
        String(item?.tanggal || "").trim(),
        String(item?.startMonth || item?.start_month || "").trim(),
        String(item?.endMonth || item?.end_month || "").trim(),
        Number(item?.total ?? item?.jumlah ?? 0),
      ].join("|");
    }

    return [
      "nonkas",
      String(item?.tanggal || "").trim(),
      String(item?.divisi || "").trim().toLowerCase(),
      String(item?.tipe || "").trim().toLowerCase(),
      String(item?.kategori || item?.keterangan || "").trim().toLowerCase(),
      Number(item?.nominal ?? item?.jumlah ?? 0),
    ].join("|");
  }

  async function syncFinanceFromSheet() {
    if (
      !FINANCE_SHEET_WEBHOOK ||
      FINANCE_SHEET_WEBHOOK.includes("PASTE_URL")
    ) {
      return;
    }

    setSyncError("");

    try {
      const url = `${FINANCE_SHEET_WEBHOOK}?periodId=${encodeURIComponent(
        periodKey
      )}`;

      const res = await fetch(url, {
        method: "GET",
      });

      const json = await res.json();

      if (!json?.success) {
        throw new Error(json?.error || "Gagal membaca data spreadsheet.");
      }

      const kasFromSheet = Array.isArray(json.kas) ? json.kas : [];
      const nonKasFromSheet = Array.isArray(json.nonkas) ? json.nonkas : [];

      setState((prev) => {
        const prevFinance = readFinanceSlice(prev);

        const prevKas = Array.isArray(prevFinance.kasPayments)
          ? prevFinance.kasPayments
          : [];

        const prevNonKas = Array.isArray(prevFinance.transaksi)
          ? prevFinance.transaksi
          : [];

        const prevKasMap = new Map(
          prevKas.map((x) => [makeFinanceIdentityKey(x, "kas"), x])
        );

        const prevNonKasMap = new Map(
          prevNonKas.map((x) => [makeFinanceIdentityKey(x, "nonkas"), x])
        );

        const mergedKas = kasFromSheet.map((item) => {
          const oldItem = prevKasMap.get(makeFinanceIdentityKey(item, "kas"));

          return {
            ...item,
            id: item.id,
            backendId: oldItem?.backendId ?? oldItem?.id ?? item.backendId ?? null,
            proof: oldItem?.proof?.url ? oldItem.proof : item.proof || null,
          };
        });

        const mergedNonKas = nonKasFromSheet.map((item) => {
          const oldItem = prevNonKasMap.get(makeFinanceIdentityKey(item, "nonkas"));

          return {
            ...item,
            id: item.id,
            backendId: oldItem?.backendId ?? oldItem?.id ?? item.backendId ?? null,
            proof: oldItem?.proof?.url ? oldItem.proof : item.proof || null,
          };
        });

        return writeFinanceSlice(prev, {
          ...prevFinance,
          saldoAwal: 0,
          kasPayments: mergedKas,
          transaksi: mergedNonKas,
        });
      });

    } catch (err) {
      console.error("Gagal sinkron finance dari spreadsheet:", err);
      setSyncError(err?.message || "Gagal sinkron dari spreadsheet.");
    }
  }

  useEffect(() => {
    setKasTanggal(getDefaultDateByPeriod(periodKey));
    setKasStartMonth(getDefaultMonthByPeriod(periodKey));
    setKasEndMonth(getDefaultMonthByPeriod(periodKey));
    setTTanggal(getDefaultDateByPeriod(periodKey));
  }, [periodKey]);

  async function addKasPayment(e) {
    e.preventDefault();
    setKasError("");

    if (!isFinanceManager) return setKasError("Form kas hanya untuk Admin dan Treasurer.");
    if (!sessionLoginId) return setKasError("Kamu belum login.");
    if (!effectiveKasMemberId) return setKasError("Anggota tidak valid.");
    if (!kasTanggal) return setKasError("Tanggal pembayaran wajib diisi.");
    if (!kasStartMonth || !kasEndMonth || monthsCount <= 0) {
      return setKasError("Periode kas tidak valid.");
    }

    const payload = {
      periodId: periodKey,
      tanggal: kasTanggal,
      memberId: String(effectiveKasMemberId),
      memberName: effectiveKasMember?.name || "Unknown",
      memberDivisi: effectiveKasMember?.divisi || effectiveKasMember?.division || "-",
      startMonth: fmtMonthYear(startOfMonth(startMonthDate)),
      endMonth: fmtMonthYear(endOfMonth(endMonthDate)),
      monthsCount,
      nominalPerBulan: kasNominalPerBulan,
      total: kasTotalBayar,
      proof: kasProof,
      catatan: kasCatatan,
      dibuatOleh: sessionLoginId,
    };

    try {
      const created = await createKasApi(payload, periodKey);

      setState((prev) => {
        const prevFinance = readFinanceSlice(prev);

        return writeFinanceSlice(prev, {
          ...prevFinance,
          kasPayments: [
            ...(Array.isArray(prevFinance.kasPayments) ? prevFinance.kasPayments : []),
            created,
          ],
        });
      });

    setKasTanggal(getDefaultDateByPeriod(periodKey));
    setKasMemberId(members[0]?.loginId ? String(members[0].loginId) : "");
    setKasStartMonth(getDefaultMonthByPeriod(periodKey));
    setKasEndMonth(getDefaultMonthByPeriod(periodKey));
    setKasCatatan("");
    setKasProof(null);
    setKasError("");

    if (proofInputRef.current) proofInputRef.current.value = "";
    } catch (err) {
      setKasError(err.message || "Gagal menyimpan pembayaran kas.");
    }
  }

  const [tTanggal, setTTanggal] = useState(() =>
    getDefaultDateByPeriod(periodKey)
  );
  const [tDivisi, setTDivisi] = useState(
    String(me?.divisi || me?.division || "Treasurer")
  );
  const [tTipe, setTTipe] = useState("Masuk");
  const [tKategori, setTKategori] = useState("");
  const [tNominal, setTNominal] = useState("");
  const [tCatatan, setTCatatan] = useState("");
  const [tProof, setTProof] = useState(null);
  const [tError, setTError] = useState("");

  const isNonKasFormValid =
    isFinanceManager &&
    !!tTanggal &&
    !!String(tKategori || "").trim() &&
    (Number(String(tNominal || "").replace(/[^\d]/g, "")) || 0) > 0;  

  async function addTransaksiNonKas(e) {
    e.preventDefault();
    setTError("");

    if (!isFinanceManager) return;
    if (!tTanggal || !tKategori || !tNominal) return;

    const payload = {
      periodId: periodKey,
      tanggal: tTanggal,
      divisi: tDivisi,
      tipe: tTipe,
      kategori: tKategori,
      nominal: Number(String(tNominal).replace(/[^\d]/g, "")) || 0,
      catatan: tCatatan,
      proof: tProof,
      dibuatOleh: sessionLoginId,
    };

    try {
      const created = await createNonKasApi(payload, periodKey);

      setState((prev) => {
        const prevFinance = readFinanceSlice(prev);

        return writeFinanceSlice(prev, {
          ...prevFinance,
          transaksi: [
            ...(Array.isArray(prevFinance.transaksi) ? prevFinance.transaksi : []),
            created,
          ],
        });
      });

      setTTanggal(getDefaultDateByPeriod(periodKey));
      setTDivisi(String(me?.divisi || me?.division || "Treasurer"));
      setTTipe("Masuk");
      setTKategori("");
      setTNominal("");
      setTCatatan("");
      setTProof(null);
      setTError("");

      if (nonKasProofInputRef.current) nonKasProofInputRef.current.value = "";
    } catch (err) {
      setSyncError(err.message || "Gagal menyimpan transaksi non-kas.");
    }
  }

  const [historyFilter, setHistoryFilter] = useState("all");
  const [downloadFilter, setDownloadFilter] = useState("all");
  const [divisiFilter, setDivisiFilter] = useState("");

  const combinedHistory = useMemo(() => {
  const kasRows = kasPayments.map((p) => ({
      kind: "kas",
      id: p.id,
      tanggal: p.tanggal,
      label: "Kas",
      tipe: "Masuk",
      divisi: p.memberDivisi || "-",
      pihak: p.memberName || "-",
      kategori: `Kas Bulanan (${p.startMonth} s/d ${p.endMonth})`,
      nominal: Number(p.total || 0),
      catatan: p.catatan || "-",
      dibuatOleh: p.dibuatOleh || "-",
      proof: p.proof || null,
      raw: p,
    }));

    const nonKasRows = transaksi.map((t) => ({
      kind: "nonkas",
      id: t.id,
      tanggal: t.tanggal,
      label: "Transaksi Lain",
      tipe: t.tipe,
      divisi: t.divisi,
      pihak: "-",
      kategori: t.kategori,
      nominal: Number(t.nominal || 0),
      catatan: t.catatan || "-",
      dibuatOleh: t.dibuatOleh || "-",
      proof: t.proof || null,
      raw: t,
    }));

    const all = [...kasRows, ...nonKasRows];
    all.sort((a, b) => safeDateValue(b.tanggal) - safeDateValue(a.tanggal));
    return all;
  }, [kasPayments, transaksi]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "kas")
      return combinedHistory.filter((x) => x.kind === "kas");
    if (historyFilter === "nonkas")
      return combinedHistory.filter((x) => x.kind === "nonkas");
    return combinedHistory;
  }, [combinedHistory, historyFilter]);

  const publicHistory = useMemo(() => {
    return filteredHistory.map((row) => ({
      kind: row.kind,
      id: row.id,
      label: row.label,
      tanggal: row.tanggal,
      divisi: row.divisi,
      tipe: row.tipe,
      nominal: row.nominal,
    }));
  }, [filteredHistory]);

  const downloadRows = useMemo(() => {
    if (downloadFilter === "kas") {
      return combinedHistory.filter((x) => x.kind === "kas");
    }
    if (downloadFilter === "nonkas") {
      return combinedHistory.filter((x) => x.kind === "nonkas");
    }
    return combinedHistory;
  }, [combinedHistory, downloadFilter]);

  function downloadFinanceReport() {
    const downloadedAt = formatDownloadDate(new Date());
    const filterLabel =
      downloadFilter === "kas"
        ? "Kas saja"
        : downloadFilter === "nonkas"
        ? "Transaksi lain saja"
        : "Semua tipe";

    if (downloadFilter === "kas") {
      const recapRows = financeMembers.map((member) => {
        const memberId = String(member?.loginId || "").trim().toLowerCase();
        const memberName = String(member?.name || "").trim().toLowerCase();

        const paidMonths = new Set();

        kasPayments.forEach((payment) => {
          const payerId = String(payment?.memberId || "").trim().toLowerCase();
          const payerName = String(payment?.memberName || "").trim().toLowerCase();

          const isSameMember =
            (memberId && payerId && memberId === payerId) ||
            (memberName && payerName && memberName === payerName);

          if (!isSameMember) return;

          let rangeStart = parseMonthYearLabelToDate(payment?.startMonth);
          let rangeEnd = parseMonthYearLabelToDate(payment?.endMonth);

          if (!rangeStart || !rangeEnd) {
            const categoryText = String(payment?.kategori || payment?.category || "");
            const rangeMatch = categoryText.match(/\(([^)]+?)\s+s\/d\s+([^)]+?)\)/i);
            if (rangeMatch) {
              rangeStart = rangeStart || parseMonthYearLabelToDate(rangeMatch[1]);
              rangeEnd = rangeEnd || parseMonthYearLabelToDate(rangeMatch[2]);
            }
          }

          if (!rangeStart || !rangeEnd) return;

          const months = iterateMonthsInclusive(rangeStart, rangeEnd);
          months.forEach((monthDate) => {
            if (monthDate.getFullYear() !== kasCalendarYear) return;
            const key = `${monthDate.getFullYear()}-${String(
              monthDate.getMonth() + 1
            ).padStart(2, "0")}`;
            paidMonths.add(key);
          });
        });

        const monthCells = MONTH_NAMES_ID.map((_, index) => {
          const key = `${kasCalendarYear}-${String(index + 1).padStart(2, "0")}`;
          return paidMonths.has(key) ? "Lunas" : "Belum";
        });

        return {
          name: member?.name || "-",
          divisi: member?.divisi || member?.division || "-",
          monthCells,
          totalPaid: monthCells.filter((x) => x === "Lunas").length,
        };
      });

      if (!recapRows.length) {
        alert("Belum ada data kas untuk diunduh.");
        return;
      }

      const headerMonths = MONTH_NAMES_ID.map((m) => `<th>${escapeHtml(m)}</th>`).join("");

      const bodyRows = recapRows
        .map((row, index) => {
          const monthTds = row.monthCells
            .map((cell) => {
              const isPaid = cell === "Lunas";
              return `
                <td style="
                  text-align:center;
                  font-weight:600;
                  background:${isPaid ? "#dcfce7" : "#f3f4f6"};
                  color:${isPaid ? "#166534" : "#374151"};
                ">
                  ${cell}
                </td>
              `;
            })
            .join("");

          return `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.divisi)}</td>
              ${monthTds}
              <td style="text-align:center; font-weight:700;">${row.totalPaid}/12</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <meta name="ProgId" content="Excel.Sheet" />
            <meta name="Generator" content="ChatGPT" />
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #111827;
              }
              h1 {
                font-size: 22px;
                margin: 0 0 12px 0;
              }
              .meta {
                margin-bottom: 18px;
              }
              .meta-row {
                margin: 4px 0;
                font-size: 13px;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                font-size: 12px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 8px 10px;
                vertical-align: middle;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
              }
              .left {
                text-align: left;
              }
            </style>
          </head>
          <body>
            <h1>Rekap Kalender Kas</h1>

            <div class="meta">
              <div class="meta-row"><strong>Periode aktif:</strong> ${escapeHtml(periodKey)}</div>
              <div class="meta-row"><strong>Filter unduhan:</strong> ${escapeHtml(filterLabel)}</div>
              <div class="meta-row"><strong>Tahun kalender:</strong> ${escapeHtml(kasCalendarYear)}</div>
              <div class="meta-row"><strong>Tanggal diunduh:</strong> ${escapeHtml(downloadedAt)}</div>
              <div class="meta-row"><strong>Total pengurus:</strong> ${recapRows.length}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th class="left">Nama</th>
                  <th class="left">Divisi</th>
                  ${headerMonths}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-kalender-kas-${periodKey}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (!downloadRows.length) {
      alert("Belum ada data untuk diunduh.");
      return;
    }

    const totalNominal = downloadRows.reduce(
      (sum, row) => sum + Number(row.nominal || 0),
      0
    );

    const tableRowsHtml = downloadRows
      .map((row, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.label || "-")}</td>
            <td>${escapeHtml(row.tanggal || "-")}</td>
            <td>${escapeHtml(row.pihak || "-")}</td>
            <td>${escapeHtml(row.divisi || "-")}</td>
            <td>${escapeHtml(row.tipe || "-")}</td>
            <td>${escapeHtml(row.kategori || "-")}</td>
            <td style="mso-number-format:'\\#\\,##0'; text-align:right;">${Number(
              row.nominal || 0
            )}</td>
            <td>${escapeHtml(row.catatan || "-")}</td>
            <td>${escapeHtml(row.dibuatOleh || "-")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <meta name="ProgId" content="Excel.Sheet" />
          <meta name="Generator" content="ChatGPT" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1 {
              font-size: 22px;
              margin: 0 0 12px 0;
            }
            .meta {
              margin-bottom: 18px;
            }
            .meta-row {
              margin: 4px 0;
              font-size: 13px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              vertical-align: top;
            }
            th {
              background: #e5e7eb;
              font-weight: 700;
              text-align: left;
            }
            .summary {
              margin-top: 18px;
              width: 420px;
            }
            .summary td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
            }
            .summary-label {
              background: #f3f4f6;
              font-weight: 700;
              width: 180px;
            }
          </style>
        </head>
        <body>
          <h1>Rekap Keuangan</h1>

          <div class="meta">
            <div class="meta-row"><strong>Periode aktif:</strong> ${escapeHtml(periodKey)}</div>
            <div class="meta-row"><strong>Filter unduhan:</strong> ${escapeHtml(filterLabel)}</div>
            <div class="meta-row"><strong>Tanggal diunduh:</strong> ${escapeHtml(downloadedAt)}</div>
            <div class="meta-row"><strong>Total baris:</strong> ${downloadRows.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Anggota</th>
                <th>Divisi</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Nominal</th>
                <th>Catatan</th>
                <th>Dibuat Oleh</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <table class="summary">
            <tr>
              <td class="summary-label">Total nominal</td>
              <td>${escapeHtml(formatRupiah(totalNominal))}</td>
            </tr>
            <tr>
              <td class="summary-label">Saldo saat ini</td>
              <td>${escapeHtml(formatRupiah(saldoSaatIni))}</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileSuffix =
      downloadFilter === "nonkas" ? "transaksi-lain" : "semua";
    a.href = url;
    a.download = `rekap-keuangan-${periodKey}-${fileSuffix}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const kasCalendarYear = useMemo(() => {
    const parsed = Number(periodKey);
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [periodKey]);

  const myPaidKasMonths = useMemo(() => {
    const paid = new Set();
    const currentId = String(myMemberId || "").trim().toLowerCase();
    const currentName = String(myMemberName || "").trim().toLowerCase();
    if (!currentId && !currentName) return paid;

    kasPayments.forEach((payment) => {
      const payerId = String(payment?.memberId || "").trim().toLowerCase();
      const payerName = String(payment?.memberName || "").trim().toLowerCase();
      const matchesCurrentUser =
        (currentId && payerId && payerId === currentId) ||
        (!payerId && currentName && payerName && payerName === currentName) ||
        (currentName && payerName && payerName === currentName);

      if (!matchesCurrentUser) return;

      let rangeStart = parseMonthYearLabelToDate(payment?.startMonth);
      let rangeEnd = parseMonthYearLabelToDate(payment?.endMonth);

      if (!rangeStart || !rangeEnd) {
        const categoryText = String(payment?.kategori || payment?.category || "");
        const rangeMatch = categoryText.match(/\(([^)]+?)\s+s\/d\s+([^)]+?)\)/i);
        if (rangeMatch) {
          rangeStart = rangeStart || parseMonthYearLabelToDate(rangeMatch[1]);
          rangeEnd = rangeEnd || parseMonthYearLabelToDate(rangeMatch[2]);
        }
      }

      if (!rangeStart || !rangeEnd) return;

      const months = iterateMonthsInclusive(rangeStart, rangeEnd);
      months.forEach((monthDate) => {
        if (monthDate.getFullYear() !== kasCalendarYear) return;
        paid.add(
          `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
        );
      });
    });

    return paid;
  }, [kasPayments, kasCalendarYear, myMemberId, myMemberName]);

  const kasCalendarItems = useMemo(() => {
    return MONTH_NAMES_ID.map((label, index) => {
      const key = `${kasCalendarYear}-${String(index + 1).padStart(2, "0")}`;
      return {
        key,
        label,
        isPaid: myPaidKasMonths.has(key),
      };
    });
  }, [kasCalendarYear, myPaidKasMonths]);

  const financeMembers = useMemo(() => {
    return members
      .filter((m) => {
        const name = String(m?.name || "").trim();
        return !!name;
      })
      .sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""), "id")
      );
  }, [members]);

  const allMembersKasRecap = useMemo(() => {
    return financeMembers.map((member) => {
      const memberId = String(member?.loginId || "").trim().toLowerCase();
      const memberName = String(member?.name || "").trim().toLowerCase();
      const paidMonths = new Set();

      kasPayments.forEach((payment) => {
        const payerId = String(payment?.memberId || "").trim().toLowerCase();
        const payerName = String(payment?.memberName || "").trim().toLowerCase();

        const isSameMember =
          (memberId && payerId && memberId === payerId) ||
          (memberName && payerName && memberName === payerName);

        if (!isSameMember) return;

        let rangeStart = parseMonthYearLabelToDate(payment?.startMonth);
        let rangeEnd = parseMonthYearLabelToDate(payment?.endMonth);

        if (!rangeStart || !rangeEnd) {
          const categoryText = String(payment?.kategori || payment?.category || "");
          const rangeMatch = categoryText.match(
            /\(([^)]+?)\s+s\/d\s+([^)]+?)\)/i
          );
          if (rangeMatch) {
            rangeStart = rangeStart || parseMonthYearLabelToDate(rangeMatch[1]);
            rangeEnd = rangeEnd || parseMonthYearLabelToDate(rangeMatch[2]);
          }
        }

        if (!rangeStart || !rangeEnd) return;

        const months = iterateMonthsInclusive(rangeStart, rangeEnd);
        months.forEach((monthDate) => {
          if (monthDate.getFullYear() !== kasCalendarYear) return;
          const key = `${monthDate.getFullYear()}-${String(
            monthDate.getMonth() + 1
          ).padStart(2, "0")}`;
          paidMonths.add(key);
        });
      });

      const monthStatuses = MONTH_NAMES_ID.map((label, index) => {
        const key = `${kasCalendarYear}-${String(index + 1).padStart(2, "0")}`;
        return {
          key,
          label,
          isPaid: paidMonths.has(key),
        };
      });

      return {
        loginId: member?.loginId || "",
        name: member?.name || "-",
        divisi: member?.divisi || member?.division || "-",
        monthStatuses,
        paidCount: monthStatuses.filter((m) => m.isPaid).length,
      };
    });
  }, [financeMembers, kasPayments, kasCalendarYear]);

  const divisiOptions = useMemo(() => {
    const mapped = financeMembers.map((m) => {
      const raw = m?.divisi || m?.division || "";
      const div = String(raw).trim().toLowerCase().replace(/\s/g, "");

      if (div === "lead" || div === "vicelead") {
        return "LEAD";
      }

      return raw.trim();
    });

    const unique = [...new Set(mapped.filter((v) => v && v.trim()))];

    return unique.sort((a, b) => a.localeCompare(b, "id"));
  }, [financeMembers]);

  const normalize = (v) => v?.toLowerCase().replace(/\s/g, "");

  const filteredKasRecap = useMemo(() => {
    if (!divisiFilter) return [];

    return allMembersKasRecap.filter((member) => {
      const div = normalize(member?.divisi);

      if (divisiFilter === "LEAD") {
        return ["lead", "vicelead"].includes(div);
      }

      return div === normalize(divisiFilter);
    });
  }, [allMembersKasRecap, divisiFilter]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const [ekTanggal, setEkTanggal] = useState("");
  const [ekMemberId, setEkMemberId] = useState("");
  const [ekStartMonth, setEkStartMonth] = useState("");
  const [ekEndMonth, setEkEndMonth] = useState("");
  const [ekCatatan, setEkCatatan] = useState("");

  const [enTanggal, setEnTanggal] = useState("");
  const [enDivisi, setEnDivisi] = useState("");
  const [enTipe, setEnTipe] = useState("Masuk");
  const [enKategori, setEnKategori] = useState("");
  const [enNominal, setEnNominal] = useState("");
  const [enCatatan, setEnCatatan] = useState("");

  const ekStartMonthDate = useMemo(() => {
    if (!ekStartMonth) return null;
    const [y, m] = ekStartMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [ekStartMonth]);

  const ekEndMonthDate = useMemo(() => {
    if (!ekEndMonth) return null;
    const [y, m] = ekEndMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [ekEndMonth]);

  const ekMonthsCount = useMemo(() => {
    if (!ekStartMonthDate || !ekEndMonthDate) return 0;
    const s = startOfMonth(ekStartMonthDate);
    const e = startOfMonth(ekEndMonthDate);
    if (e < s) return 0;
    return monthDiffInclusive(s, e);
  }, [ekStartMonthDate, ekEndMonthDate]);

  const ekTotalBayar = ekMonthsCount * kasNominalPerBulan;

  function monthYearTextToInputValue(label) {
    const d = parseMonthYearLabelToDate(label);
    if (!d) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function openEdit(row) {
    if (!isFinanceManager) return;
    setEditingRow(row);

    if (row.kind === "kas") {
      const member = members.find(
        (m) =>
          String(m.name || "").trim() ===
          String(row.raw?.memberName || "").trim()
      );

      setEkTanggal(row.raw?.tanggal || "");
      setEkMemberId(
        isFinanceManager
          ? member?.loginId
            ? String(member.loginId)
            : ""
          : myMemberId
      );
      setEkStartMonth(monthYearTextToInputValue(row.raw?.startMonth || ""));
      setEkEndMonth(monthYearTextToInputValue(row.raw?.endMonth || ""));
      setEkCatatan(row.raw?.catatan || "");
    } else {
      setEnTanggal(row.raw?.tanggal || "");
      setEnDivisi(row.raw?.divisi || "");
      setEnTipe(row.raw?.tipe || "Masuk");
      setEnKategori(row.raw?.kategori || "");
      setEnNominal(String(row.raw?.nominal || ""));
      setEnCatatan(row.raw?.catatan || "");
    }

    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingRow(null);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingRow || !isFinanceManager) return;

    if (editingRow.kind === "kas") {
      const member = members.find((m) => String(m.loginId) === String(ekMemberId));
      if (!member) {
        alert("Anggota tidak valid.");
        return;
      }

      if (!ekTanggal || !ekStartMonth || !ekEndMonth || ekMonthsCount <= 0) {
        alert("Data kas tidak valid.");
        return;
      }

      const updatedItem = {
        ...editingRow.raw,
        periodId: periodKey,
        tanggal: ekTanggal,
        memberId: String(member.loginId),
        memberName: member.name || "-",
        memberDivisi: member.divisi || member.division || "-",
        startMonth: fmtMonthYear(startOfMonth(ekStartMonthDate)),
        endMonth: fmtMonthYear(endOfMonth(ekEndMonthDate)),
        monthsCount: ekMonthsCount,
        nominalPerBulan: kasNominalPerBulan,
        total: ekTotalBayar,
        catatan: ekCatatan,
        updatedAt: new Date().toISOString(),
      };

      try {
        const updated = await updateKasApi(
          editingRow.backendId || editingRow.id,
          updatedItem,
          periodKey
        );

        setState((prev) => {
          const prevFinance = readFinanceSlice(prev);

          return writeFinanceSlice(prev, {
            ...prevFinance,
            kasPayments: (Array.isArray(prevFinance.kasPayments)
              ? prevFinance.kasPayments
              : []
            ).map((x) =>
              String(x?.id) === String(updated.id) ? updated : x
            ),
          });
        });

      } catch (err) {
        alert(err.message || "Gagal update pembayaran kas.");
        return;
      }

      closeEdit();
      return;
    }

    if (
      !enTanggal ||
      !enKategori ||
      !(Number(String(enNominal).replace(/[^\d]/g, "")) > 0)
    ) {
      alert("Data non-kas tidak valid.");
      return;
    }

    const updatedItem = {
      ...editingRow.raw,
      periodId: periodKey,
      tanggal: enTanggal,
      divisi: enDivisi,
      tipe: enTipe,
      kategori: enKategori,
      nominal: Number(String(enNominal).replace(/[^\d]/g, "")) || 0,
      catatan: enCatatan,
      updatedAt: new Date().toISOString(),
    };

    try {
      const updated = await updateNonKasApi(
        editingRow.backendId || editingRow.id,
        updatedItem,
        periodKey
      );

      setState((prev) => {
        const prevFinance = readFinanceSlice(prev);

        return writeFinanceSlice(prev, {
          ...prevFinance,
          transaksi: (Array.isArray(prevFinance.transaksi)
            ? prevFinance.transaksi
            : []
          ).map((x) =>
            String(x?.id) === String(updated.id) ? updated : x
          ),
        });
      });

    } catch (err) {
      alert(err.message || "Gagal update transaksi non-kas.");
      return;
    }

    try {
      await sendFinanceRequest({
        action: "update",
        sheetType: "nonkas",
        id: updatedItem.id,
        periodId: updatedItem.periodId,
        tanggal: updatedItem.tanggal,
        divisi: updatedItem.divisi,
        tipe: updatedItem.tipe,
        kategori: updatedItem.kategori,
        nominal: updatedItem.nominal,
        catatan: updatedItem.catatan,
        dibuatOleh: updatedItem.dibuatOleh,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
      });
    } catch (err) {
      console.error("Gagal update non-kas ke spreadsheet:", err);
    }

    closeEdit();
  }

  async function deleteFinanceItem(row) {
    if (!isFinanceManager) return;

    const ok = window.confirm("Yakin ingin menghapus transaksi ini?");
    if (!ok) return;

    const snapshot = state;
    setState((prev) => removeFinanceItemFromState(prev, row));

    try {
      const backendId = row.backendId || row.raw?.backendId || row.raw?.id;

      if (!backendId) {
        throw new Error("ID backend tidak ditemukan. Data ini belum sinkron dengan backend.");
      }

      console.log("HAPUS ROW:", row);

      const id = row.backendId || row.id;

      if (!id) {
        alert("ID tidak valid, data belum sinkron backend");
        return;
      }

      await deleteKeuanganApi(row.backendId || row.id);

      try {
        await sendFinanceRequest({
          action: "delete",
          sheetType: row.kind === "kas" ? "kas" : "nonkas",
          id: row.id,
        });
      } catch (err) {
        console.error("Gagal hapus dari spreadsheet:", err);
      }
    } catch (err) {
      console.error("Gagal hapus dari backend:", err);
      setState(snapshot);
      alert(err.message || "Gagal menghapus transaksi.");
    }
  }

  return (
    <div className="space-y-6">
      <div className={ui.card}>
        <h2 className={cx("mb-6", sectionTitleClass)}>Keuangan</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={cardInnerClass}>
            <div className={cx("text-sm", ui.textMuted)}>Saldo Saat ini</div>
            <div className="mt-1 text-1xl font-semibold tracking-tight md:text-2xl">
              {formatRupiah(saldoSaatIni)}
            </div>
          </div>

          <div className={cardInnerClass}>
            <div className={cx("text-sm", ui.textMuted)}>Pemasukan Bulan Ini</div>
            <div className="mt-1 text-1xl font-semibold tracking-tight md:text-2xl">
              {formatRupiah(pemasukanBulanIni)}
            </div>
          </div>

          <div className={cardInnerClass}>
            <div className={cx("text-sm", ui.textMuted)}>Pengeluaran Bulan Ini</div>
            <div className="mt-1 text-1xl font-semibold tracking-tight md:text-2xl">
              {formatRupiah(pengeluaranBulanIni)}
            </div>
          </div>
        </div>
      </div>

      {isFinanceManager ? (
        <div className={ui.card}>
          <h2 className={cx("mb-4", sectionTitleClass)}>Input Pembayaran Kas</h2>

          {kasError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {kasError}
            </div>
          ) : null}

          {syncError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {syncError}
            </div>
          ) : null}

          <form onSubmit={addKasPayment} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DateField
                label="Tanggal bayar"
                type="date"
                value={kasTanggal}
                onChange={(e) => setKasTanggal(e.target.value)}
                ui={ui}
                theme={theme}
              />

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Anggota
                </label>

                {isFinanceManager ? (
                  <div className="relative mt-2">
                    <select
                      className={cx(selectClass, "appearance-none pr-12")}
                      value={kasMemberId}
                      onChange={(e) => setKasMemberId(e.target.value)}
                    >
                      {members.length === 0 ? (
                        <option value="">Belum ada anggota</option>
                      ) : (
                        members.map((m) => (
                          <option key={m.loginId} value={String(m.loginId)}>
                            {m.name} ({m.divisi || m.division || "-"})
                          </option>
                        ))
                      )}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <ChevronDownIcon
                        className={theme === "dark" ? "text-white" : "text-gray-700"}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <input
                      className={cx(ui.input, "pr-12")}
                      value={`${myMemberName} (${myMemberDivisi})`}
                      readOnly
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <UserLockIcon
                        className={theme === "dark" ? "text-white" : "text-gray-700"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DateField
                label="Periode mulai"
                type="month"
                value={kasStartMonth}
                onChange={(e) => setKasStartMonth(e.target.value)}
                ui={ui}
                theme={theme}
              />

              <DateField
                label="Periode sampai"
                type="month"
                value={kasEndMonth}
                onChange={(e) => setKasEndMonth(e.target.value)}
                ui={ui}
                theme={theme}
              />
            </div>

            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Nominal (Rp)
                </label>
                <input
                  className={cx("mt-2", ui.input)}
                  value={String(kasTotalBayar || "")}
                  readOnly
                />
                <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                  {monthsCount} bulan × Rp {kasNominalPerBulan.toLocaleString("id-ID")}
                </div>
              </div>

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Bukti transaksi (Opsional)
                </label>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className={cx("mt-2", ui.input)}
                  onChange={(e) => handleProofChange(e.target.files?.[0])}
                />
                {kasProof?.name ? (
                  <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                    File: {kasProof.name}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className={cx("mb-1 block text-sm", ui.textMuted)}>Catatan</label>
              <input
                className={cx("mt-2", ui.input)}
                value={kasCatatan}
                onChange={(e) => setKasCatatan(e.target.value)}
                placeholder="Opsional"
              />
            </div>

            <button
              className={cx(
                ui.button,
                !isKasFormValid
                  ? "cursor-not-allowed opacity-50 pointer-events-none"
                  : ""
              )}
              type="submit"
              disabled={!isKasFormValid}
            >
              Tambah
            </button>
          </form>
        </div>
      ) : null}

      {isFinanceManager ? (
        <div className={ui.card}>
          <h2 className={cx("mb-4", sectionTitleClass)}>Input Transaksi Lain</h2>

          {tError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {tError}
            </div>
          ) : null}

          <form onSubmit={addTransaksiNonKas} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <DateField
                label="Tanggal"
                type="date"
                value={tTanggal}
                onChange={(e) => setTTanggal(e.target.value)}
                ui={ui}
                theme={theme}
              />

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Divisi
                </label>
                <input
                  className={cx("mt-2", ui.input)}
                  value={tDivisi}
                  onChange={(e) => setTDivisi(e.target.value)}
                />
              </div>

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Tipe
                </label>
                <select
                  className={selectClass}
                  value={tTipe}
                  onChange={(e) => setTTipe(e.target.value)}
                >
                  <option value="Masuk">Masuk</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Nominal
                </label>
                <input
                  className={cx("mt-2", ui.input)}
                  value={tNominal}
                  onChange={(e) => setTNominal(e.target.value)}
                  inputMode="numeric"
                  placeholder="Contoh: 50000"
                />
              </div>
            </div>

            <div>
              <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                Kategori
              </label>
              <input
                className={cx("mt-2", ui.input)}
                value={tKategori}
                onChange={(e) => setTKategori(e.target.value)}
                placeholder="Contoh: Dana Hibah / Konsumsi / Sponsor"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Bukti transaksi (Opsional)
                </label>
                <input
                  ref={nonKasProofInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className={cx("mt-2", ui.input)}
                  onChange={(e) => handleNonKasProofChange(e.target.files?.[0])}
                />
                {tProof?.name ? (
                  <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                    File: {tProof.name}
                  </div>
                ) : null}
              </div>

              <div>
                <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                  Catatan
                </label>
                <input
                  className={cx("mt-2", ui.input)}
                  value={tCatatan}
                  onChange={(e) => setTCatatan(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
            </div>

            <button
              className={cx(
                ui.button,
                !isNonKasFormValid
                  ? "cursor-not-allowed opacity-50 pointer-events-none"
                  : ""
              )}
              type="submit"
              disabled={!isNonKasFormValid}
            >
              Tambah
            </button>
          </form>
        </div>
      ) : null}

    {isAuthed && !isFinanceManager ? (
      <div className={ui.card}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className={cx("mb-2", sectionTitleClass)}>
              Kalender Kas {myMemberName} {kasCalendarYear} 
            </h2>
          </div>

          <div className={cx("text-sm", ui.textMuted)}>
            Hijau = sudah bayar, abu-abu = belum bayar
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kasCalendarItems.map((item) => (
            <div
              key={item.key}
              className={cx(
                "rounded-3xl border p-5 shadow-sm",
                theme === "dark"
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-1xl font-semibold">{item.label}</div>
                  <div className={cx("mt-3 text-sm", ui.textMuted)}>
                    {item.isPaid ? "Sudah dibayar" : "Belum ada pembayaran"}
                  </div>
                </div>

                <span
                  className={cx(
                    "inline-flex rounded-full px-4 py-2 text-sm font-semibold",
                    item.isPaid
                      ? theme === "dark"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-emerald-100 text-emerald-700"
                      : theme === "dark"
                      ? "bg-white/10 text-slate-300"
                      : "bg-gray-200 text-gray-700"
                  )}
                >
                  {item.isPaid ? "Lunas" : "Belum"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null}

    {!isAuthed || isFinanceManager ? (
        <div className={ui.card}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className={cx("mb-2", sectionTitleClass)}>
                Rekap Kas {kasCalendarYear}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={cx("text-sm whitespace-nowrap", ui.textMuted)}>
                Filter divisi
              </span>
              <select
                className={cx(ui.select || ui.input, "!mt-0 min-w-[220px]")}
                value={divisiFilter}
                onChange={(e) => setDivisiFilter(e.target.value)}
              >
                <option value="">Pilih Divisi</option>
                {divisiOptions.map((divisi) => (
                  <option key={divisi} value={divisi}>
                    {divisi}
                  </option>
                ))}
              </select>
            </div>
          </div>
              
            {/* DEKSTOP */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Nama</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Divisi</th>
                  {MONTH_NAMES_ID.map((month) => (
                    <th
                      key={month}
                      className="py-2 px-4 text-center whitespace-nowrap"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="py-2 px-4 text-center whitespace-nowrap">Total</th>
                </tr>
              </thead>

              <tbody>
                {filteredKasRecap.length === 0 ? (
                  <tr className={tableRowClass}>
                    <td colSpan={15} className={cx("py-6 text-center px-4", ui.textMuted)}>
                      Belum ada data anggota.
                    </td>
                  </tr>
                ) : (
                  filteredKasRecap.map((member) => (
                    <tr
                      key={member.loginId || member.name}
                      className={tableRowClass}
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {member.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {member.divisi}
                      </td>

                      {member.monthStatuses.map((month) => (
                        <td
                          key={month.key}
                          className="py-3 px-4 text-center whitespace-nowrap"
                        >
                          <span
                            className={cx(
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                              month.isPaid
                                ? theme === "dark"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-emerald-100 text-emerald-700"
                                : theme === "dark"
                                ? "bg-white/10 text-slate-300"
                                : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {month.isPaid ? "Lunas" : "Belum"}
                          </span>
                        </td>
                      ))}

                      <td className="py-3 px-4 text-center whitespace-nowrap font-semibold">
                        {member.paidCount}/12
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="md:hidden space-y-3">
            {filteredKasRecap.map((member) => (
              <div key={member.loginId || member.name} className={ui.card}>
                <div className="font-medium">{member.name}</div>
                <div className={ui.textMuted}>{member.divisi}</div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  {member.monthStatuses.map((month) => (
                    <div
                      key={month.key}
                      className={cx(
                        "text-xs text-center rounded-lg py-2",
                        month.isPaid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {month.label.slice(0, 3)}
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-sm font-semibold">
                  {member.paidCount}/12 bulan
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : null}

      <div className={ui.card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className={ui.textMuted}>
            Riwayat Transaksi
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="flex items-center gap-2">
              <span className={cx("text-sm whitespace-nowrap", ui.textMuted)}>
                Lihat
              </span>
              <select
                className={cx(ui.select || ui.input, "!mt-0 min-w-[140px]")}
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="kas">Kas</option>
                <option value="nonkas">Non-Kas</option>
              </select>
            </div>

            {isAuthed ? (
              <div className="flex items-center gap-2">
                <span className={cx("text-sm whitespace-nowrap", ui.textMuted)}>
                  Unduh
                </span>
                <select
                  className={cx(ui.select || ui.input, "!mt-0 min-w-[170px]")}
                  value={downloadFilter}
                  onChange={(e) => setDownloadFilter(e.target.value)}
                >
                  <option value="all">Semua</option>
                  <option value="kas">Kas saja</option>
                  <option value="nonkas">Transaksi lain saja</option>
                </select>
              </div>
            ) : null}

          {canViewFinanceDetail ? (
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnPrimary, "h-[46px] px-5 whitespace-nowrap")}
              onClick={downloadFinanceReport}
            >
              Unduh Rekap
            </button>
          ) : null}
          </div>
        </div>

          {/* DEKSTOP */}
        <div className="mt-4 hidden md:block overflow-x-auto">
          {canViewFinanceDetail ? (
            <table className="w-full min-w-[1280px] text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Jenis</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Tanggal</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Anggota</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Divisi</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Tipe</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Kategori</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Nominal</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Bukti</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Catatan</th>
                  {isFinanceManager && (
                    <th className="py-2 px-4 text-left whitespace-nowrap">Aksi</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr className={tableRowClass}>
                    <td
                      colSpan={isFinanceManager ? 10 : 9}
                      className={cx("py-6 text-center px-4", ui.textMuted)}
                    >
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className={tableRowClass}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <a
                          className={linkClass}
                          href={
                            FINANCE_SHEET_URL && !FINANCE_SHEET_URL.includes("PASTE_URL")
                              ? FINANCE_SHEET_URL
                              : "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (
                              !FINANCE_SHEET_URL ||
                              FINANCE_SHEET_URL.includes("PASTE_URL")
                            ) {
                              e.preventDefault();
                              alert("URL spreadsheet keuangan belum diisi di config.");
                            }
                          }}
                        >
                          {row.label}
                        </a>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.tanggal || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.pihak || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.divisi || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.tipe || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.kategori || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatRupiah(row.nominal || 0)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.proof?.url ? (
                          canViewProof(row) ? (
                            <a
                              className={linkClass}
                              href={row.proof.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Lihat
                            </a>
                          ) : (
                            <span className={ui.textMuted}>Terkunci</span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.catatan || "-"}</td>

                      {isFinanceManager && (
                        <td className="py-3 px-4 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className={cx(ui.btnBase, ui.btnGhost, "!px-4 !py-2")}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFinanceItem(row)}
                              className={cx(ui.btnBase, ui.btnGhost, "!px-4 !py-2")}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Jenis</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Tanggal</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Divisi</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Tipe</th>
                  <th className="py-2 px-4 text-left whitespace-nowrap">Nominal</th>
                </tr>
              </thead>

              <tbody>
                {publicHistory.length === 0 ? (
                  <tr className={tableRowClass}>
                    <td
                      colSpan={5}
                      className={cx("py-6 text-center px-4", ui.textMuted)}
                    >
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  publicHistory.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className={tableRowClass}>
                      <td className="py-3 px-4 whitespace-nowrap">{row.label || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.tanggal || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.divisi || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.tipe || "-"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatRupiah(row.nominal || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE */}
        <div className="mt-4 md:hidden space-y-3">
          {filteredHistory.map((row) => (
            <div key={`${row.kind}-${row.id}`} className={ui.card}>
              <div className="flex justify-between items-center">
                <div className="font-medium">{row.label}</div>
                <div className="text-sm">
                  {formatRupiah(row.nominal || 0)}
                </div>
              </div>

              <div className={cx("text-sm mt-1", ui.textMuted)}>
                {row.tanggal} • {row.divisi}
              </div>

              <div className="mt-2 text-xs space-y-1">
                <div>Tipe: {row.tipe || "-"}</div>
                <div>Kategori: {row.kategori || "-"}</div>
                {row.catatan && <div>Catatan: {row.catatan}</div>}
              </div>

              {row.proof?.url ? (
                canViewProof(row) ? (
                  <a
                    className={linkClass}
                    href={row.proof.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat bukti
                  </a>
                ) : (
                  <span className={ui.textMuted}>Bukti terkunci</span>
                )
              ) : null}
            </div>
          ))}
        </div>

      </div>

    {canManageFinance ? (
      <EditModal
        open={editOpen}
        title={
          editingRow?.kind === "kas"
            ? "Edit Pembayaran Kas"
            : "Edit Transaksi Non-Kas"
        }
        onClose={closeEdit}
        theme={theme}
        ui={ui}
      >
        {!editingRow ? null : (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editingRow.kind === "kas" ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DateField
                    label="Tanggal bayar"
                    type="date"
                    value={ekTanggal}
                    onChange={(e) => setEkTanggal(e.target.value)}
                    ui={ui}
                    theme={theme}
                  />

                  <div>
                    <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                      Anggota
                    </label>

                    {isFinanceManager ? (
                      <div className="relative mt-2">
                        <select
                          className={cx(selectClass, "appearance-none pr-12")}
                          value={ekMemberId}
                          onChange={(e) => setEkMemberId(e.target.value)}
                        >
                          {members.map((m) => (
                            <option key={m.loginId} value={String(m.loginId)}>
                              {m.name} ({m.divisi || m.division || "-"})
                            </option>
                          ))}
                        </select>

                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                          <ChevronDownIcon
                            className={
                              theme === "dark" ? "text-white" : "text-gray-700"
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-2">
                        <input
                          className={cx(ui.input, "pr-12")}
                          value={`${myMemberName} (${myMemberDivisi})`}
                          readOnly
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                          <UserLockIcon
                            className={
                              theme === "dark" ? "text-white" : "text-gray-700"
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DateField
                    label="Periode mulai"
                    type="month"
                    value={ekStartMonth}
                    onChange={(e) => setEkStartMonth(e.target.value)}
                    ui={ui}
                    theme={theme}
                  />

                  <DateField
                    label="Periode sampai"
                    type="month"
                    value={ekEndMonth}
                    onChange={(e) => setEkEndMonth(e.target.value)}
                    ui={ui}
                    theme={theme}
                  />
                </div>

                <div>
                  <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                    Nominal (Rp)
                  </label>
                  <input
                    className={cx("mt-2", ui.input)}
                    value={String(ekTotalBayar || "")}
                    readOnly
                  />
                  <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                    {ekMonthsCount} bulan × Rp {kasNominalPerBulan.toLocaleString("id-ID")}
                  </div>
                </div>

                <div>
                  <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                    Catatan
                  </label>
                  <input
                    className={cx("mt-2", ui.input)}
                    value={ekCatatan}
                    onChange={(e) => setEkCatatan(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <DateField
                    label="Tanggal"
                    type="date"
                    value={enTanggal}
                    onChange={(e) => setEnTanggal(e.target.value)}
                    ui={ui}
                    theme={theme}
                  />

                  <div>
                    <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                      Divisi
                    </label>
                    <input
                      className={cx("mt-2", ui.input)}
                      value={enDivisi}
                      onChange={(e) => setEnDivisi(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                      Tipe
                    </label>
                    <select
                      className={selectClass}
                      value={enTipe}
                      onChange={(e) => setEnTipe(e.target.value)}
                    >
                      <option value="Masuk">Masuk</option>
                      <option value="Keluar">Keluar</option>
                    </select>
                  </div>

                  <div>
                    <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                      Nominal
                    </label>
                    <input
                      className={cx("mt-2", ui.input)}
                      value={enNominal}
                      onChange={(e) => setEnNominal(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                    Kategori
                  </label>
                  <input
                    className={cx("mt-2", ui.input)}
                    value={enKategori}
                    onChange={(e) => setEnKategori(e.target.value)}
                  />
                </div>

                <div>
                  <label className={cx("mb-1 block text-sm", ui.textMuted)}>
                    Catatan
                  </label>
                  <input
                    className={cx("mt-2", ui.input)}
                    value={enCatatan}
                    onChange={(e) => setEnCatatan(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" className={cx(ui.btnBase, ui.btnPrimary)}>
                Simpan
              </button>
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost)}
                onClick={closeEdit}
              >
                Batal
              </button>
            </div>
          </form>
          )}
        </EditModal>
      ) : null}
    </div>
  );
}