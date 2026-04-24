import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { updatePasswordApi, logoutApi } from "../Services/authService";
import { updateMemberApi, listMembersApi } from "../Services/memberService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function actionTileClass(theme) {
  const base =
    "h-12 w-12 rounded-2xl grid place-items-center backdrop-blur-md border transition-all duration-200 active:scale-[0.98]";
  const dark = "bg-white/5 border-white/10 hover:bg-white/10";
  const light = "bg-black/5 border-black/10 hover:bg-black/10";
  return cx(base, theme === "dark" ? dark : light);
}

function panelClass(theme) {
  return theme === "dark"
    ? "bg-slate-900 border border-slate-800 text-slate-100"
    : "bg-white ring-1 ring-gray-200 text-gray-900";
}

function mutedText(theme) {
  return theme === "dark" ? "text-slate-400" : "text-gray-500";
}

function strongText(theme) {
  return theme === "dark" ? "text-slate-100" : "text-gray-900";
}

function iconColorClass(theme) {
  return theme === "dark" ? "text-slate-200" : "text-slate-700";
}

function MoonIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M21 13.2A8.5 8.5 0 0 1 10.8 3a7 7 0 1 0 10.2 10.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ThemeToggleButton({ theme, onToggleTheme }) {
  const isDark = theme === "dark";
  const iconCls = iconColorClass(theme);

  return (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={actionTileClass(theme)}
    >
      {isDark ? <MoonIcon className={iconCls} /> : <SunIcon className={iconCls} />}
    </button>
  );
}

function Modal({ open, onClose, theme, children }) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close modal overlay" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cx("w-full max-w-3xl rounded-3xl shadow-2xl", panelClass(theme))}>
          {children}
        </div>
      </div>
    </div>
  );
}

function normalizePhotoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  const driveFileMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveFileMatch?.[1]) {
    return `https://drive.google.com/uc?id=${driveFileMatch[1]}`;
  }

  const openMatch = raw.match(/[?&]id=([^&]+)/i);
  if (/drive\.google\.com/i.test(raw) && openMatch?.[1]) {
    return `https://drive.google.com/uc?id=${openMatch[1]}`;
  }

  if (/drive\.google\.com\/uc\?id=/i.test(raw)) {
    return raw;
  }

  return raw;
}

export default function NavbarLayout({ state, setState, theme, ui, onToggleTheme, children }) {
  const nav = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileRef = useRef(null);

  const sessionLoginId = state?.session?.loginId || "";
  const isAuthed = !!state?.session?.isAuthed;

  const periodLabel = state?.activePeriodId
    ? `Periode ${state.activePeriodId}`
    : state?.meta?.periodLabel || state?.session?.period || state?.settings?.period || "";

  const members = Array.isArray(state?.members) ? state.members : [];
  const me = useMemo(() => {
    if (!isAuthed) return null;
    return members.find((m) => String(m.loginId) === String(sessionLoginId)) || null;
  }, [isAuthed, members, sessionLoginId]);

  const role = String(state?.session?.role || "staff").toLowerCase();
  const isAdmin = role === "admin";
  const isEC = role === "ec" || isAdmin;

  const divisionLabel = useMemo(() => {
    const raw = String(me?.divisi || "").trim();
    if (!raw) return isAdmin ? "Admin" : "-";
    return raw;
  }, [me?.divisi, isAdmin]);

  const positionLabel = isAdmin ? "Admin" : isEC ? "Executive Committee" : "Staff";

  const links = useMemo(() => {
    if (!isAuthed) {
      return [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/keuangan", label: "Keuangan" },
        { to: "/proker", label: "Proker" },
        { to: "/kegiatan", label: "Kegiatan" },
        { to: "/presensi", label: "Presensi" },
        { to: "/template-surat", label: "Laporan dan Surat" },
        { to: "/arsip", label: "Arsip" },
      ];
    }

    const base = [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/keuangan", label: "Keuangan" },
      { to: "/proker", label: "Proker" },
      { to: "/kegiatan", label: "Kegiatan" },
      { to: "/presensi", label: "Presensi" },
      { to: "/template-surat", label: "Laporan dan Surat" },
      { to: "/arsip", label: "Arsip" },
    ];

    if (role === "ec" || role === "admin") {
      base.push({ to: "/anggota", label: "Anggota" });
    }

    if (role === "admin") {
      base.push({ to: "/periode", label: "Periode" });
    }

    return base;
  }, [isAuthed, role]);

  async function logout() {
    try {
      await logoutApi();
    } catch {
      // tetap lanjut bersihkan session lokal
    }

    setState((s) => ({
      ...s,
      session: {
        loginId: "",
        isAuthed: false,
        isAdmin: false,
        isEC: false,
        role: "",
        period: "",
        periodId: "",
      },
    }));

    setProfileOpen(false);
    nav("/dashboard", { replace: true });
  }

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [formName, setFormName] = useState("");
  const [formDivisi, setFormDivisi] = useState("");
  const [formLoginId, setFormLoginId] = useState("");
  const [formNewPass, setFormNewPass] = useState("");
  const [formPhoto, setFormPhoto] = useState("");

  function openProfileModal() {
    if (isAdmin) {
      setProfileOpen(false);
      return;
    }
    if (!me) return;

    setFormName(me.name || "");
    setFormDivisi(me.divisi || "");
    setFormLoginId(me.loginId || "");
    setFormNewPass("");
    setFormPhoto(me.photo || "");
    setProfileOpen(false);
    setProfileModalOpen(true);
  }

  function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function onCancelProfile() {
    setProfileModalOpen(false);
  }

  async function onSaveProfile() {
    if (!me?.id) return;

    const nextName = (formName || "").trim();
    const nextDiv = (formDivisi || "").trim();
    const nextLoginId = (formLoginId || "").trim();

    if (!nextName) return alert("Nama tidak boleh kosong.");
    if (!nextDiv) return alert("Divisi tidak boleh kosong.");
    if (!nextLoginId) return alert("ID tidak boleh kosong.");

    try {
      // update password (opsional)
      if (formNewPass && formNewPass.trim().length >= 3) {
        await updatePasswordApi({
          password: formNewPass.trim(),
          password_confirmation: formNewPass.trim(),
        });
      }

      // update profile
      await updateMemberApi(me.id, {
        ...me,
        name: nextName,
        divisi: nextDiv,
        loginId: nextLoginId,
        photo: formPhoto || me.photo || "",
      });

      const refreshedMembers = await listMembersApi(
        String(state?.session?.periodId || state?.session?.period || "2026")
      );

      setState((prev) => ({
        ...prev,
        members: refreshedMembers,
        session:
          prev.session?.loginId === me.loginId
            ? { ...prev.session, loginId: nextLoginId }
            : prev.session,
      }));

      setProfileModalOpen(false);
      alert("Profil berhasil diperbarui.");
    } catch (err) {
      alert(err.message || "Gagal menyimpan profil.");
    }
  }

  const greetingText = theme === "dark" ? "text-slate-200" : "text-gray-700";

  const avatarSrc =
    normalizePhotoUrl(me?.photo) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      (isAdmin ? "Admin" : me?.name) || "User"
    )}`;

  const headerCls = cx(
    "rounded-3xl p-6 shadow-sm",
    theme === "dark" ? "border border-white/10 bg-white/5" : "border border-gray-200 bg-white"
  );

  const navWrapCls = cx(
    "mt-5 rounded-2xl p-2 ring-1",
    theme === "dark" ? "bg-white/5 ring-white/10" : "bg-gray-50 ring-gray-200"
  );

  const navBase = "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition";
  const navActive = theme === "dark" ? "bg-slate-800 text-white" : "bg-gray-900 text-white";
  const navIdle =
    theme === "dark" ? "text-slate-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-100";

  return (
    <div className={ui?.page || ""}>
      <div className="flex min-h-screen flex-col">
        <div className="w-full px-4 py-5 sm:px-6 lg:px-10">
          <div className={headerCls}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left md:gap-3">
                <img src="/logo.png" alt="NFSCC" className="h-12 w-12 rounded-xl object-contain" />
                <div className="text-xl font-semibold tracking-tight mt-2 md:mt-0">NFSCC HUB</div>
              </div>

              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                <div className={cx("text-sm", greetingText)}>
                  {isAuthed ? (
                    <>
                      Hi,{" "}
                      <span className="font-semibold">
                        {isAdmin ? "Admin" : me?.name || "User"}
                      </span>
                    </>
                  ) : (
                    ""
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />

                  {isAuthed ? (
                    <div className="relative" ref={profileRef}>
                      <button
                        type="button"
                        onClick={() => setProfileOpen((v) => !v)}
                        className={cx(
                          "h-12 w-12 rounded-2xl overflow-hidden",
                          theme === "dark"
                            ? "bg-white/5 border border-white/10 hover:bg-white/10"
                            : "bg-black/5 border border-black/10 hover:bg-black/10",
                          "backdrop-blur-md transition-all duration-200 active:scale-[0.98]"
                        )}
                        aria-label="Profile"
                        title="Profile"
                      >
                        <img
                          src={avatarSrc}
                          alt="profile"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              (isAdmin ? "Admin" : me?.name) || "User"
                            )}`;
                          }}
                        />
                      </button>

                      {profileOpen ? (
                        <div
                          className={cx(
                            "absolute right-0 mt-3 w-80 rounded-3xl p-4 shadow-2xl z-50",
                            panelClass(theme)
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 rounded-2xl overflow-hidden flex-none">
                              <img
                                src={avatarSrc}
                                alt="profile"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    (isAdmin ? "Admin" : me?.name) || "User"
                                  )}`;
                                }}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className={cx("text-xl font-semibold", strongText(theme))}>
                                {isAdmin ? "Admin" : me?.name || "-"}
                              </div>

                              <div className={cx("mt-1 text-sm", mutedText(theme))}>
                                {divisionLabel} - {positionLabel} - {periodLabel || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 space-y-2">
                            {!isAdmin ? (
                              <button
                                type="button"
                                onClick={openProfileModal}
                                className={cx(
                                  "w-full text-left text-base font-semibold py-3 px-2 rounded-2xl",
                                  theme === "dark" ? "hover:bg-slate-800" : "hover:bg-gray-100"
                                )}
                              >
                                Lihat Profil
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={logout}
                              className={cx(
                                "w-full text-left text-base font-semibold py-3 px-2 rounded-2xl",
                                theme === "dark" ? "hover:bg-slate-800" : "hover:bg-gray-100"
                              )}
                            >
                              Logout
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nav("/login")}
                      className={cx(
                        "rounded-2xl px-4 py-3 text-sm font-semibold border transition",
                        theme === "dark"
                          ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      Login
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={navWrapCls}>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => cx(navBase, isActive ? navActive : navIdle)}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-10 sm:px-6 lg:px-10">
          <div className="w-full">{children ?? <Outlet />}</div>
        </main>
      </div>

      <Modal open={profileModalOpen} onClose={onCancelProfile} theme={theme}>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className={cx("text-3xl font-semibold", strongText(theme))}>Update Profil</div>
            <button
              type="button"
              className={cx(
                "h-10 w-10 rounded-2xl grid place-items-center border",
                theme === "dark"
                  ? "border-slate-800 hover:bg-slate-800"
                  : "border-gray-200 hover:bg-gray-100"
              )}
              onClick={onCancelProfile}
              aria-label="Close"
            >
              <CloseIcon className={iconColorClass(theme)} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div
                className={cx(
                  "w-full aspect-square rounded-3xl overflow-hidden border",
                  theme === "dark" ? "border-slate-800" : "border-gray-200"
                )}
              >
                <img
                  src={
                    normalizePhotoUrl(formPhoto || me?.photo) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(me?.name || "User")}`
                  }
                  alt="foto profil"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(me?.name || "User")}`;
                  }}
                />
              </div>

              <label
                className={cx(
                  "mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold border",
                  theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-100"
                )}
              >
                Ganti Foto Profil
                <input type="file" accept="image/*" hidden onChange={onPickPhoto} />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <div className={cx("mb-1 text-sm font-medium", mutedText(theme))}>Nama</div>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
                  placeholder="Nama"
                />
              </div>

              <div>
                <div className={cx("mb-1 text-sm font-medium", mutedText(theme))}>Divisi</div>
                <input
                  value={formDivisi}
                  disabled
                  className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
                  placeholder="Divisi"
                />
              </div>

              <div>
                <div className={cx("mb-1 text-sm font-medium", mutedText(theme))}>Login ID</div>
                <input
                  value={formLoginId}
                  disabled
                  className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
                  placeholder="loginId"
                />
              </div>

              <div>
                <div className={cx("mb-1 text-sm font-medium", mutedText(theme))}>
                  Password Baru (opsional)
                </div>
                <input
                  type="password"
                  value={formNewPass}
                  onChange={(e) => setFormNewPass(e.target.value)}
                  className={ui?.input || "w-full rounded-2xl border px-4 py-3 text-sm"}
                  placeholder="Minimal 3 karakter"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onCancelProfile}
                  className={cx(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border",
                    theme === "dark" ? "border-slate-800 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-100"
                  )}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onSaveProfile}
                  className={cx(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                    theme === "dark" ? "bg-white text-slate-900 hover:bg-white/90" : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  Simpan
                </button>
              </div>

              <div className={cx("text-xs", mutedText(theme))}>
                * Password hanya diubah jika kamu isi minimal 3 karakter.
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}