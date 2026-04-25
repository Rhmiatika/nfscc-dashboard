import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getCurrentPeriodId, getPeriods, loadState, saveState } from "./storage";
import { loadBackendState, saveBackendState } from "./Services/appStateService";
import { listMembersApi } from "./Services/memberService";
import { makeSeed } from "./seed";
import { getApiToken, clearApiToken } from "./lib/authStorage";

import NavbarLayout from "./components/Navbar";

import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import KeuanganPage from "./pages/Keuangan";
import ProkerPage from "./pages/Proker";
import KegiatanPage from "./pages/Kegiatan";
import PresensiPage from "./pages/Presensi";
import AnggotaPage from "./pages/Anggota";
import TemplateSuratPage from "./pages/TemplateSurat";
import PeriodePage from "./pages/Periode";
import ArsipPage from "./pages/Arsip";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function normalizeForId(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function divisiToLoginPart(divisiRaw) {
  const div = normalizeForId(divisiRaw).replace(/\s+/g, "");
  if (div === "sekretaris") return "secre";
  if (div === "treasurer") return "treas";
  return div;
}

function makeLoginId(nameRaw, divisiRaw) {
  const name = normalizeForId(nameRaw);
  const div = divisiToLoginPart(divisiRaw);
  if (!name || !div) return "";
  const first = name.split(" ")[0];
  return `${first}.${div}@nfscc`;
}

const LOGIN_ID_ALIASES = {
  "amarsya.sekretaris@nfscc": "amarsya.secre@nfscc",
  "faisal.treasurer@nfscc": "faisal.treas@nfscc",
  "amarsya.sekretaris@nfcc": "amarsya.secre@nfcc",
  "faisal.treasurer@nfcc": "faisal.treas@nfcc",
};

function normalizeLoginIdAlias(value) {
  const key = String(value || "").trim().toLowerCase();
  return LOGIN_ID_ALIASES[key] || value;
}

function deepReplaceLoginIdAliases(value) {
  if (typeof value === "string") {
    return normalizeLoginIdAlias(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepReplaceLoginIdAliases(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, deepReplaceLoginIdAliases(val)])
    );
  }

  return value;
}

const EC_LOGIN_IDS = new Set([
  "rahmi.pr@nfscc",
  "dzakwan.lead@nfscc",
  "mila.hrd@nfscc",
  "faiz.pdd@nfscc",
  "ferdi.rnd@nfscc",
  "amarsya.secre@nfscc",
  "faisal.treas@nfscc",
  "rahmi.pr@nfcc",
  "dzakwan.lead@nfcc",
  "mila.hrd@nfcc",
  "faiz.pdd@nfcc",
  "ferdi.rnd@nfcc",
  "amarsya.secre@nfcc",
  "faisal.treas@nfcc",
]);

const NAME_BY_LOGIN_ID = {
  "rahmi.pr@nfscc": "Rahmi Atika",
  "dzakwan.lead@nfscc": "Firmansyah Dzakwan Arifien",
  "mila.hrd@nfscc": "Jamilatun Khoerunnisa",
  "faiz.pdd@nfscc": "Faiz Abdullah Hanif Firmansyah",
  "amarsya.secre@nfscc": "Amarsya",
  "faisal.treas@nfscc": "Faisal",
  "rahmi.pr@nfcc": "Rahmi Atika",
  "dzakwan.lead@nfcc": "Firmansyah Dzakwan Arifien",
  "mila.hrd@nfcc": "Jamilatun Khoerunnisa",
  "faiz.pdd@nfcc": "Faiz Abdullah Hanif Firmansyah",
  "amarsya.secre@nfcc": "Amarsya",
  "faisal.treas@nfcc": "Faisal",
};

function makeLoggedOutSession(prev = {}) {
  return {
    ...prev,
    isAuthed: false,
    isAdmin: false,
    isEC: false,
    role: "",
    loginId: "",
    name: "",
    divisi: "",
    jabatan: "",
    tahunAngkatan: "",
    photo: "",
    apiUser: null,
  };
}

function normalizeState(raw) {
  if (!raw) return raw;

  const migratedRaw = deepReplaceLoginIdAliases(raw);
  const session = migratedRaw.session || {};
  const token = getApiToken();

  const isAuthed =
    typeof session.isAuthed === "boolean"
      ? session.isAuthed && !!token
      : !!session.isLoggedIn && !!token;

  const loginId = session.loginId || session.email || "";

  const members = Array.isArray(migratedRaw.members) ? migratedRaw.members : [];
  const nextMembers = members.map((m) => {
    const lid = String(m.loginId || "").trim().toLowerCase();
    const inferredIsEC = typeof m.isEC === "boolean" ? m.isEC : EC_LOGIN_IDS.has(lid);
    return {
      ...m,
      isEC: inferredIsEC,
      isActive: typeof m.isActive === "boolean" ? m.isActive : true,
      loginId: normalizeLoginIdAlias(m.loginId || ""),
    };
  });

  const repairedMembers = nextMembers.map((m) => {
    const lid = String(m.loginId || "").trim().toLowerCase();
    const target = NAME_BY_LOGIN_ID[lid];
    if (!target) return m;

    const current = String(m.name || "").trim();
    if (!current) return { ...m, name: target };

    if (current.toLowerCase() === target.split(" ")[0].toLowerCase()) {
      return { ...m, name: target };
    }

    return m;
  });

  return {
    ...migratedRaw,
    session: { ...session, loginId, isAuthed },
    members: repairedMembers,
  };
}

const DEFAULT_PUBLIC_PERIOD_ID = "2026";

function buildStateForBackend(state) {
  if (!state) return state;

  const { members, ...rest } = state;
  const freshPeriods = getPeriods();
  const freshActivePeriodId = String(
    state?.session?.periodId || 
    state?.activePeriodId || 
    DEFAULT_PUBLIC_PERIOD_ID
  );

  return {
    ...rest,
    activePeriodId: freshActivePeriodId,
    activePeriod: freshActivePeriodId,
    periods: freshPeriods,
    session: {
      period: state?.session?.period || freshActivePeriodId,
      periodId: state?.session?.periodId || freshActivePeriodId,
    },
  };
}

function mergeBackendWithLocalState(localState, backendState) {
  const normalizedLocal = normalizeState(localState);
  const normalizedBackend = normalizeState(backendState);

  if (!normalizedBackend) return normalizedLocal;

  return normalizeState({
    ...normalizedLocal,
    ...normalizedBackend,
    session: normalizedLocal?.session?.isAuthed
      ? {
          ...(normalizedBackend?.session || {}),
          ...(normalizedLocal?.session || {}),
        }
      : makeLoggedOutSession(normalizedBackend?.session),

    members: Array.isArray(normalizedLocal?.members) ? normalizedLocal.members : [],
    activePeriodId: String(
      normalizedLocal?.session?.isAuthed
        ? normalizedLocal?.session?.periodId ||
            normalizedLocal?.session?.period ||
            normalizedBackend?.activePeriodId ||
            DEFAULT_PUBLIC_PERIOD_ID
        : DEFAULT_PUBLIC_PERIOD_ID
    ),
    activePeriod: String(
      normalizedLocal?.session?.isAuthed
        ? normalizedLocal?.session?.periodId ||
            normalizedLocal?.session?.period ||
            normalizedBackend?.activePeriod ||
            DEFAULT_PUBLIC_PERIOD_ID
        : DEFAULT_PUBLIC_PERIOD_ID
    ),
    periods: getPeriods(),
  });
}

function GuardAuthed({ state, children }) {
  if (!state.session?.isAuthed || !getApiToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function GuardEC({ state, children }) {
  if (!state.session?.isAuthed || !getApiToken()) {
    return <Navigate to="/login" replace />;
  }

  const role = String(state.session?.role || "staff").toLowerCase();

  if (role !== "admin" && role !== "ec") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function GuardAdmin({ state, children }) {
  if (!state.session?.isAuthed || !getApiToken()) {
    return <Navigate to="/login" replace />;
  }

  const role = String(state.session?.role || "staff").toLowerCase();

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [state, setState] = useState(() => {
    const saved = loadState() ?? makeSeed();
    const token = getApiToken();

    return normalizeState({
      ...saved,
      periods: getPeriods(),
      activePeriodId: DEFAULT_PUBLIC_PERIOD_ID,
      activePeriod: DEFAULT_PUBLIC_PERIOD_ID,
      session: token
        ? {
            ...(saved?.session || {}),
            isAuthed: true,
          }
        : makeLoggedOutSession(saved?.session),
    });
  });

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("nfscc_theme") || "light"
  );

  const forceLogout = useCallback(() => {
    clearApiToken();

    const local = normalizeState(loadState() ?? stateRef.current ?? makeSeed());
    const nextState = normalizeState({
      ...local,
      periods: getPeriods(),
      activePeriodId: DEFAULT_PUBLIC_PERIOD_ID,
      activePeriod: DEFAULT_PUBLIC_PERIOD_ID,
      session: makeLoggedOutSession(local?.session),
    });

    setState(nextState);
    saveState(nextState);

    window.location.href = "/login";
  }, []);

  const fetchLatestState = useCallback(async () => {
    const token = getApiToken();
    const localState = normalizeState(loadState() ?? stateRef.current ?? makeSeed());

    if (!token || !localState?.session?.isAuthed) {
    const activePeriodId = DEFAULT_PUBLIC_PERIOD_ID;

      try {
        const backendData = await loadBackendState(activePeriodId);

        const nextState = normalizeState({
          ...(backendData ? mergeBackendWithLocalState(localState, backendData) : localState),
          activePeriodId,
          activePeriod: activePeriodId,
          periods: getPeriods(),
          session: makeLoggedOutSession(localState?.session),
        });

        setState(nextState);
        saveState(nextState);
      } catch (err) {
        console.error("Gagal load state public:", err);

        const safeLocal = normalizeState({
          ...localState,
          activePeriodId,
          activePeriod: activePeriodId,
          periods: getPeriods(),
          session: makeLoggedOutSession(localState?.session),
        });

        setState(safeLocal);
        saveState(safeLocal);
      }

      return;
    }

    const activePeriodId = String(
      localState?.session?.periodId ||
        localState?.session?.period ||
        localState?.activePeriodId ||
        localState?.activePeriod ||
        getCurrentPeriodId() ||
        DEFAULT_PUBLIC_PERIOD_ID
    );

    try {
      const [backendData, freshMembers] = await Promise.all([
        loadBackendState(activePeriodId),
        listMembersApi(activePeriodId),
      ]);

      let nextState = backendData
        ? mergeBackendWithLocalState(localState, backendData)
        : localState;

      nextState = normalizeState({
        ...nextState,
        activePeriodId,
        activePeriod: activePeriodId,
        periods: getPeriods(),
        members: Array.isArray(freshMembers) ? freshMembers : [],
      });

      setState(nextState);
      saveState(nextState);
    } catch (err) {
      console.error("Gagal load state backend:", err);

      const status = err?.response?.status || err?.status;
      const message = String(err?.message || "").toLowerCase();

      if (
        status === 401 ||
        message.includes("unauthenticated") ||
        message.includes("unauthorized")
      ) {
        forceLogout();
        return;
      }

      const safeLocal = normalizeState({
        ...localState,
        activePeriodId,
        activePeriod: activePeriodId,
        periods: getPeriods(),
      });

      setState(safeLocal);
      saveState(safeLocal);
    }
  }, [forceLogout]);

  useEffect(() => {
    async function bootstrap() {
      await fetchLatestState();
      setIsBootstrapping(false);
    }

    bootstrap();
  }, [fetchLatestState]);

  useEffect(() => {
    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        fetchLatestState();
      }
    }

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [fetchLatestState]);

  useEffect(() => {
    if (isBootstrapping) return;

    saveState(state);

    const token = getApiToken();
    if (!token || !state?.session?.isAuthed) return;

    const periodId = String(
      state?.session?.periodId ||
        state?.session?.period ||
        state?.activePeriodId ||
        state?.activePeriod ||
        DEFAULT_PUBLIC_PERIOD_ID
    );

    const timeout = setTimeout(() => {
      const payload = buildStateForBackend(state);

      saveBackendState(periodId, payload).catch((err) => {
        const status = err?.response?.status || err?.status;
        const message = String(err?.message || "").toLowerCase();

        if (
          status === 401 ||
          message.includes("unauthenticated") ||
          message.includes("unauthorized")
        ) {
          forceLogout();
          return;
        }

        console.error("Gagal sync ke backend:", err);
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [state, isBootstrapping, forceLogout]);

  useEffect(() => {
    localStorage.setItem("nfscc_theme", theme);
  }, [theme]);

  const ui = useMemo(() => {
    const isDark = theme === "dark";

    return {
      page: cx(
        "min-h-screen",
        isDark ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"
      ),
      card: cx(
        "rounded-3xl border p-6 shadow-sm",
        isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
      ),
      card2: cx(
        "rounded-3xl border p-5 shadow-sm",
        isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
      ),
      cardInner: cx(
        "rounded-3xl border p-5 shadow-sm",
        isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
      ),
      input: cx(
        "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
        isDark
          ? "border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:border-white/20"
          : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-300"
      ),
      select: cx(
        "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition appearance-none",
        isDark
          ? "border-white/10 bg-slate-900 text-white focus:border-white/20"
          : "border-gray-200 bg-white text-gray-900 focus:border-gray-300"
      ),
      textarea: cx(
        "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
        isDark
          ? "border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:border-white/20"
          : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-300"
      ),
      label: cx("mb-1 block text-sm", isDark ? "text-slate-300" : "text-gray-600"),
      btnBase:
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm transition active:scale-[0.99]",
      btnPrimary: isDark
        ? "bg-white text-slate-900 hover:bg-white/90"
        : "bg-gray-900 text-white hover:bg-gray-800",
      btnGhost: isDark
        ? "bg-white/5 hover:bg-white/10 border border-white/10"
        : "bg-gray-50 hover:bg-gray-100 border border-gray-200",
      button: cx(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.99]",
        isDark
          ? "bg-white text-slate-900 hover:bg-white/90"
          : "bg-gray-900 text-white hover:bg-gray-800"
      ),
      textMuted: isDark ? "text-slate-300" : "text-gray-600",
      textMuted2: isDark ? "text-slate-400" : "text-gray-500",
      textFaint: isDark ? "text-slate-500" : "text-gray-400",
      badge: cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1",
        isDark ? "ring-white/10 bg-white/5" : "ring-gray-200 bg-gray-50"
      ),
      badgeGreen: cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1",
        isDark
          ? "ring-emerald-900 text-emerald-200 bg-emerald-950/30"
          : "ring-emerald-200 text-emerald-700 bg-emerald-50"
      ),
      badgeRed: cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1",
        isDark
          ? "ring-rose-900 text-rose-200 bg-rose-950/30"
          : "ring-rose-200 text-rose-700 bg-rose-50"
      ),
      tableWrap: cx(
        "overflow-x-auto rounded-2xl border",
        isDark ? "border-white/10" : "border-gray-200"
      ),
      table: "w-full text-sm",
      th: cx(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide",
        isDark ? "bg-white/5 text-slate-200" : "bg-gray-50 text-gray-700"
      ),
      td: cx(
        "px-4 py-3 align-top",
        isDark ? "border-t border-white/10" : "border-t border-gray-200"
      ),
      tableHead: cx(
        isDark
          ? "border-b border-white/10 text-slate-300"
          : "border-b border-gray-200 text-gray-600"
      ),
    };
  }, [theme]);

  if (isBootstrapping) {
    return (
      <div
        className={cx(
          "min-h-screen flex items-center justify-center",
          theme === "dark" ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"
        )}
      >
        <div className="text-sm opacity-70">Memuat data terbaru...</div>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              state={state}
              setState={setState}
              ui={ui}
              theme={theme}
              onToggleTheme={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            />
          }
        />

        <Route
          element={
            <NavbarLayout
              state={state}
              setState={setState}
              theme={theme}
              ui={ui}
              onToggleTheme={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
            />
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<DashboardPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/keuangan"
            element={<KeuanganPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/proker"
            element={<ProkerPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/kegiatan"
            element={<KegiatanPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/presensi"
            element={<PresensiPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/template-surat"
            element={<TemplateSuratPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
          <Route
            path="/arsip"
            element={<ArsipPage state={state} setState={setState} ui={ui} theme={theme} />}
          />
        </Route>

        <Route
          element={
            <GuardAuthed state={state}>
              <NavbarLayout
                state={state}
                setState={setState}
                theme={theme}
                ui={ui}
                onToggleTheme={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
              />
            </GuardAuthed>
          }
        >
          <Route
            path="/anggota"
            element={
              <GuardEC state={state}>
                <AnggotaPage state={state} setState={setState} ui={ui} theme={theme} />
              </GuardEC>
            }
          />
          <Route
            path="/periode"
            element={
              <GuardAdmin state={state}>
                <PeriodePage state={state} setState={setState} ui={ui} theme={theme} />
              </GuardAdmin>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}