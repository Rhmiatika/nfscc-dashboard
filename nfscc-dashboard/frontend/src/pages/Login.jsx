import React, { useMemo, useState } from "react";
import { loginApi, createPasswordApi } from "../Services/authService";
import { useNavigate } from "react-router-dom";
import {
  getCurrentPeriodId,
  getPeriods,
  loadStateForPeriod,
  setCurrentPeriodId,
  saveState,
} from "../storage";
import { Eye, EyeOff } from "lucide-react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function SunIcon({ className }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 13.2A8.5 8.5 0 0 1 10.8 3a7 7 0 1 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeButton({ theme, onToggleTheme }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      className={cx(
        "h-12 w-12 rounded-2xl grid place-items-center border transition active:scale-[0.98]",
        theme === "dark"
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-black/5 border-black/10 hover:bg-black/10"
      )}
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <MoonIcon
          className={theme === "dark" ? "text-slate-200" : "text-slate-700"}
        />
      ) : (
        <SunIcon
          className={theme === "dark" ? "text-slate-200" : "text-slate-700"}
        />
      )}
    </button>
  );
}

function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase();
}

export default function LoginPage({
  state,
  setState,
  ui,
  theme,
  onToggleTheme,
}) {
  const nav = useNavigate();

  const [tab, setTab] = useState("login");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showNewPass2, setShowNewPass2] = useState(false);

  const [newPassLoginId, setNewPassLoginId] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const [forgotLoginId, setForgotLoginId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const periods = useMemo(() => {
    try {
      return getPeriods();
    } catch {
      return [
        { id: "2025", label: "Periode 2025", domain: "nfscc" },
        { id: "2026", label: "Periode 2026", domain: "nfcc" },
      ];
    }
  }, [state?.periods]);

  const currentActivePeriodId = String(
    state?.activePeriodId ||
    state?.activePeriod ||
    "2026"
  );
  const currentActivePeriod =
    periods.find((item) => String(item.id) === currentActivePeriodId) ||
    periods[0] || {
      id: currentActivePeriodId,
      label: `Periode ${currentActivePeriodId}`,
      domain: Number(currentActivePeriodId) >= 2026 ? "nfcc" : "nfscc",
    };

  const pageBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-gray-50 text-gray-900";

  const cardCls =
    theme === "dark"
      ? "bg-slate-900 border border-slate-800 text-slate-100"
      : "bg-white ring-1 ring-gray-200 text-gray-900";

  const inputCls =
    ui?.input ||
    cx(
      "w-full rounded-2xl border px-4 py-2.5 text-sm outline-none",
      theme === "dark"
        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-white/10"
        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/5"
    );

  const tabBase =
    "h-11 flex-1 rounded-2xl text-sm font-semibold transition border";
  const tabActive =
    theme === "dark"
      ? "bg-white text-slate-900 border-white hover:bg-white/90"
      : "bg-gray-900 text-white border-gray-900 hover:bg-gray-800";
  const tabIdle =
    theme === "dark"
      ? "bg-transparent border-slate-800 hover:bg-slate-800"
      : "bg-transparent border-gray-200 hover:bg-gray-100";

  const primaryBtn =
    theme === "dark"
      ? "bg-white text-slate-900 hover:bg-white/90"
      : "bg-gray-900 text-white hover:bg-gray-800";

  const disabledBtn = "opacity-50 cursor-not-allowed pointer-events-none";

  const isLoginValid = !!loginId.trim() && !!password.trim();
  const isCreatePassValid =
    !!newPassLoginId.trim() &&
    newPass.trim().length >= 3 &&
    newPass2.trim().length >= 3 &&
    newPass.trim() === newPass2.trim();

  const isForgotValid = !!forgotLoginId.trim();

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function applyLoggedInState(periodId, periodState, nextSession) {
    const pid = String(periodId || "2025");
    const freshPeriods = getPeriods();

    setCurrentPeriodId(pid);

    const nextState = {
      ...(periodState || {}),
      session: {
        ...((periodState && periodState.session) || {}),
        ...nextSession,
        isAuthed: true,
        period: pid,
        periodId: pid,
      },
      activePeriodId: pid,
      activePeriod: pid,
      periods: freshPeriods,
    };

    setState(nextState);
    saveState(nextState);
  }

  async function handleLogin(e) {
  e.preventDefault();
  clearMessages();

  try {
    const normalizedLoginId = normalizeLoginId(loginId);

    const result = await loginApi({
      email: normalizedLoginId,
      password,
    });

    const user = result?.user;

    if (!user) {
      setError("User tidak ditemukan dari backend.");
      return;
    }

    const role = String(user?.role || "staff").toLowerCase();
    const isAdmin = role === "admin";
    const isEC = role === "ec";

    const activePeriodNow = String(getCurrentPeriodId() || "2026");

    const userPeriod = isAdmin
      ? activePeriodNow
      : String(user?.periode || activePeriodNow);

    const periodState = loadStateForPeriod(userPeriod);

    applyLoggedInState(userPeriod, periodState, {
      isAuthed: true,
      role,
      isAdmin,
      isEC,
      loginId: user.email || normalizedLoginId,
      name: user?.nama || user?.name || "",
      divisi: user?.divisi || "",
      jabatan: user?.jabatan || "",
      tahunAngkatan: user?.tahun_angkatan || "",
      photo: user?.foto || "",
      apiUser: user,
    });

    nav("/dashboard", { replace: true });
  } catch (err) {
    const msg = String(err?.message || "").toLowerCase();

    if (msg.includes("password belum dibuat")) {
      setError("Password akun ini belum dibuat. Silakan masuk ke tab Buat Password.");
    } else if (msg.includes("password salah")) {
      setError("Password yang kamu masukkan salah.");
    } else if (msg.includes("user tidak ditemukan")) {
      setError("Login ID tidak ditemukan.");
    } else {
      setError(err.message || "Login gagal.");
    }
  }
}

  async function handleCreatePassword(e) {
    e.preventDefault();
    clearMessages();

    if (!isCreatePassValid) return;

    try {
      const normalizedLoginId = normalizeLoginId(newPassLoginId);

      await createPasswordApi({
        email: normalizedLoginId,
        password: newPass.trim(),
        password_confirmation: newPass2.trim(),
      });

      setNewPass("");
      setNewPass2("");
      setNewPassLoginId("");
      setSuccess("Password berhasil dibuat. Silakan login.");
      setTab("login");
    } catch (err) {
      const msg = String(err?.message || "").toLowerCase();

      if (msg.includes("user tidak ditemukan")) {
        setError("Login ID tidak ditemukan.");
      } else if (msg.includes("password sudah dibuat")) {
        setError("Password akun ini sudah pernah dibuat. Silakan login atau hubungi admin untuk reset password.");
      } else {
        setError(err?.message || "Gagal membuat password.");
      }
    }
  }

  function handleForgotPassword(e) {
    e.preventDefault();
    clearMessages();

    if (!isForgotValid) return;

    setSuccess(
      "Hubungi admin untuk reset password. Setelah admin reset, gunakan tab Buat Password untuk membuat password baru."
    );
  }

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <div className="min-h-screen flex items-center justify-center px-4 py-4">
        <div
          className={cx(
            "w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-sm",
            cardCls
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="logo"
                className="h-11 w-11 rounded-2xl object-contain"
              />
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  Login NFSCC
                </div>
                <div
                  className={cx(
                    "mt-1 text-sm",
                    theme === "dark" ? "text-slate-400" : "text-gray-600"
                  )}
                >
                  {/* Login tanpa pilih periode. Sistem akan membaca periode akun secara otomatis. */}
                </div>
              </div>
            </div>
            <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
          </div>

          <div
            className={cx(
              "mt-4 rounded-2xl border px-4 py-3 text-sm",
              theme === "dark"
                ? "border-white/10 bg-white/5 text-slate-300"
                : "border-gray-200 bg-gray-50 text-gray-600"
            )}
          >
            Periode aktif: <b>{currentActivePeriod.label}</b>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setTab("login");
              }}
              className={cx(tabBase, tab === "login" ? tabActive : tabIdle)}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                clearMessages();
                setTab("buat");
              }}
              className={cx(tabBase, tab === "buat" ? tabActive : tabIdle)}
            >
              Buat Password
            </button>
          </div>

          <div className="mt-4">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Login ID
                  </div>
                  <input
                    className={inputCls}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="contoh: rahmi.pr@nfcc"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Password
                  </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={cx(inputCls, "pr-12")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    className={cx(
                      "text-sm font-medium underline-offset-2 hover:underline",
                      theme === "dark" ? "text-slate-300" : "text-gray-600"
                    )}
                    onClick={() => {
                      clearMessages();
                      setForgotLoginId(loginId);
                      setTab("lupa");
                    }}
                  >
                    Lupa password?
                  </button>
                </div>

                {error ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 ring-1 ring-red-200">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-green-50 text-green-700 ring-1 ring-green-200">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className={cx(
                    "w-full rounded-2xl py-3 text-sm font-semibold",
                    primaryBtn,
                    !isLoginValid ? disabledBtn : ""
                  )}
                  disabled={!isLoginValid}
                >
                  Login
                </button>
              </form>
            ) : null}

            {tab === "buat" ? (
              <form onSubmit={handleCreatePassword} className="space-y-4">
                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Login ID
                  </div>
                  <input
                    className={inputCls}
                    value={newPassLoginId}
                    onChange={(e) => setNewPassLoginId(e.target.value)}
                    placeholder="contoh: rahmi.pr@nfscc"
                    autoComplete="username"
                  />
                  <div
                    className={cx(
                      "mt-2 text-xs",
                      theme === "dark" ? "text-slate-400" : "text-gray-500"
                    )}
                  >
                    Menu ini hanya bisa dipakai jika password akun masih kosong, misalnya akun baru atau sudah di-reset admin.
                  </div>
                </div>

                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Password Baru
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      className={cx(inputCls, "pr-12")}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Minimal 3 karakter"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPass((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Ulangi Password
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPass2 ? "text" : "password"}
                      className={cx(inputCls, "pr-12")}
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                      placeholder="Ulangi password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPass2((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 ring-1 ring-red-200">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-green-50 text-green-700 ring-1 ring-green-200">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className={cx(
                    "w-full rounded-2xl py-3 text-sm font-semibold",
                    primaryBtn,
                    !isCreatePassValid ? disabledBtn : ""
                  )}
                  disabled={!isCreatePassValid}
                >
                  Buat Password
                </button>
              </form>
            ) : null}

            {tab === "lupa" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <div
                    className={cx(
                      "mb-1 text-sm font-medium",
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    )}
                  >
                    Login ID
                  </div>
                  <input
                    className={inputCls}
                    value={forgotLoginId}
                    onChange={(e) => setForgotLoginId(e.target.value)}
                    placeholder="contoh: rahmi.pr@nfcc"
                    autoComplete="username"
                  />
                </div>

                <div
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm",
                    theme === "dark"
                      ? "border-white/10 bg-white/5 text-slate-300"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  )}
                >
                  Jika akun ditemukan dan masih memiliki password lama, hubungi admin untuk reset password. Setelah admin reset, baru buat password baru lewat tab <b>Buat Password</b>.
                </div>

                {error ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 ring-1 ring-red-200">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl px-4 py-3 text-sm bg-green-50 text-green-700 ring-1 ring-green-200">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className={cx(
                    "w-full rounded-2xl py-3 text-sm font-semibold",
                    primaryBtn,
                    !isForgotValid ? disabledBtn : ""
                  )}
                  disabled={!isForgotValid}
                >
                  Cek Akun
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}