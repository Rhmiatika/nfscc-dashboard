import React, { useEffect, useMemo, useState } from "react";
import {
  listTemplateSuratApi,
  createTemplateSuratApi,
  updateTemplateSuratApi,
  deleteTemplateSuratApi,
} from "../Services/templateSuratService";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function safeId(utils, prefix = "doc") {
  if (typeof utils?.safeId === "function") {
    return utils.safeId(`${prefix}-${Date.now()}`);
  }
  return `${prefix}-${Date.now()}`;
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

function detectDocType(url) {
  const s = String(url || "").toLowerCase();

  if (s.includes("docs.google.com/document")) return "gdoc";
  if (s.includes("docs.google.com/spreadsheets")) return "gsheet";
  if (s.endsWith(".xlsx") || s.endsWith(".xls") || s.includes("spreadsheet")) {
    return "sheet";
  }
  if (s.endsWith(".docx") || s.endsWith(".doc")) return "doc";
  if (s.endsWith(".pdf")) return "pdf";
  return "link";
}

function extractTitleFromUrl(url) {
  try {
    const u = new URL(url);
    const raw = decodeURIComponent(
      u.pathname.split("/").filter(Boolean).pop() || ""
    );
    if (!raw) return "";
    return raw.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function formatCreatedAt(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function getTypeLabel(type) {
  if (type === "gdoc") return "Google Docs";
  if (type === "gsheet") return "Google Sheets";
  if (type === "sheet") return "Spreadsheet";
  if (type === "doc") return "Document";
  if (type === "pdf") return "PDF";
  return "Link";
}

function getTypeAccent(type) {
  if (type === "gdoc" || type === "doc") {
    return {
      badge: "bg-blue-50 text-blue-700 ring-blue-200",
      chip: "DOC",
    };
  }
  if (type === "gsheet" || type === "sheet") {
    return {
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      chip: "SHEET",
    };
  }
  if (type === "pdf") {
    return {
      badge: "bg-rose-50 text-rose-700 ring-rose-200",
      chip: "PDF",
    };
  }
  return {
    badge: "bg-gray-50 text-gray-700 ring-gray-200",
    chip: "LINK",
  };
}

function makePreviewLines(title, type) {
  const base = String(title || "Dokumen").trim();
  const words = base.split(/\s+/).filter(Boolean);

  const heading = words.slice(0, 5).join(" ");
  const sub1 = words.slice(0, 3).join(" ");
  const sub2 = words.slice(2, 6).join(" ");
  const sub3 = words.slice(1, 4).join(" ");

  if (type === "gsheet" || type === "sheet") {
    return {
      heading: heading || "Laporan Data",
      lines: [
        "Kolom A    Kolom B    Kolom C",
        "Data 01    Data 02    Data 03",
        "Data 11    Data 12    Data 13",
        "Data 21    Data 22    Data 23",
      ],
      footer: sub1 || "Spreadsheet",
    };
  }

  if (type === "pdf") {
    return {
      heading: heading || "Dokumen PDF",
      lines: [
        "Nomor      : ....................",
        "Lampiran   : ....................",
        "Perihal    : ....................",
        "Dengan hormat, ..................",
      ],
      footer: sub2 || "Preview PDF",
    };
  }

  return {
    heading: heading || "Surat / Dokumen",
    lines: [
      "Nomor      : ....................",
      "Lampiran   : ....................",
      "Hal        : ....................",
      "Dengan hormat, ..................",
    ],
    footer: sub3 || "Dokumen",
  };
}

function PreviewThumbnail({ item, theme }) {
  const accent = getTypeAccent(item.type);
  const preview = makePreviewLines(item.title, item.type);

  return (
    <div
      className={cx(
        "relative h-40 w-full overflow-hidden border-b",
        theme === "dark"
          ? "border-white/10 bg-slate-900"
          : "border-gray-200 bg-gray-50"
      )}
    >
      <div className="absolute inset-0 p-6">
        <div
          className={cx(
            "mx-auto h-full max-w-[78%] rounded-md border shadow-sm",
            theme === "dark"
              ? "border-white/10 bg-slate-950"
              : "border-gray-200 bg-white"
          )}
        >
          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div
                className={cx(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                  accent.badge
                )}
              >
                {accent.chip}
              </div>

              <div
                className={cx(
                  "h-6 w-5 rounded-sm",
                  theme === "dark" ? "bg-white/10" : "bg-gray-100"
                )}
              />
            </div>

            <div
              className={cx(
                "mt-4 truncate text-[10px] font-semibold uppercase tracking-wide",
                theme === "dark" ? "text-slate-300" : "text-gray-500"
              )}
            >
              {preview.heading}
            </div>

            <div className="mt-1.5 space-y-1">
              {preview.lines.slice(0, 2).map((line, idx) => (
                <div key={idx} className="space-y-1">
                  <div
                    className={cx(
                      "h-1 rounded-full",
                      idx === 0 ? "w-[78%]" : idx === 1 ? "w-[86%]" : idx === 2 ? "w-[70%]" : "w-[82%]",
                      theme === "dark" ? "bg-white/10" : "bg-gray-200"
                    )}
                  />
                  <div
                    className={cx(
                      "h-1 rounded-full",
                      idx === 0 ? "w-[55%]" : idx === 1 ? "w-[60%]" : idx === 2 ? "w-[48%]" : "w-[57%]",
                      theme === "dark" ? "bg-white/5" : "bg-gray-100"
                    )}
                  />
                </div>
              ))}
            </div>

            {(item.type === "gsheet" || item.type === "sheet") && (
              <div className="mt-4 overflow-hidden rounded-md border">
                <div className="grid grid-cols-3 text-[9px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className={cx(
                        "h-5 border-r border-b",
                        theme === "dark"
                          ? "border-white/10 bg-white/5"
                          : "border-gray-200 bg-gray-50"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function DocModal({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
  ui,
  theme,
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [error, setError] = useState("");

  React.useEffect(() => {
    setTitle(initialData?.title || "");
    setUrl(initialData?.url || "");
    setError("");
  }, [initialData, open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const finalUrl = normalizeUrl(url);
    const finalTitle = String(title || "").trim();

    if (!finalUrl) {
      setError("Link dokumen wajib diisi.");
      return;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError("Format link tidak valid.");
      return;
    }

    onSubmit({
      title: finalTitle,
      url: finalUrl,
    });
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "w-full max-w-2xl rounded-3xl border p-6 shadow-2xl",
            theme === "dark"
              ? "border-white/10 bg-slate-950"
              : "border-gray-200 bg-white"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[18px] md:text-[19px] font-semibold leading-tight tracking-tight">
              {mode === "edit" ? "Edit Dokumen" : "Tambah Dokumen"}
            </h3>
            <button
              type="button"
              className={cx(ui.btnBase, ui.btnGhost)}
              onClick={onClose}
            >
              Tutup
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={ui.label}>Judul dokumen</label>
              <input
                className={ui.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Opsional, kalau kosong akan diambil dari link"
              />
            </div>

            <div>
              <label className={ui.label}>Link dokumen *</label>
              <input
                className={ui.input}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/... atau link spreadsheet / pdf / dokumen lainnya"
              />
            </div>

            <div className={cx("text-sm", ui.textMuted)}>
              Boleh dari Google Docs, Google Sheets, spreadsheet, PDF, atau link dokumen lain.
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={cx(ui.btnBase, ui.btnPrimary)}>
                {mode === "edit" ? "Simpan Perubahan" : "Simpan"}
              </button>
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnGhost)}
                onClick={onClose}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TemplateSuratPage({
  state,
  setState,
  theme,
  ui,
  utils,
}) {

  const activePeriodId = String(
    state?.session?.currentPeriodId ||
      state?.session?.activePeriodId ||
      state?.session?.periodId ||
      state?.session?.period ||
      "2025"
  );

  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docError, setDocError] = useState("");

  useEffect(() => {
    async function loadDocs() {
      try {
        setLoadingDocs(true);
        setDocError("");

        const data = await listTemplateSuratApi();

        setState((prev) => ({
          ...prev,
          templateSuratDocs: data,
        }));
      } catch (err) {
        const message = String(err?.message || "");
        const status = err?.response?.status || err?.status;

        if (status === 401 || message.toLowerCase().includes("unauthenticated")) {
          setDocError("");
          setState((prev) => ({
            ...prev,
            templateSuratDocs: Array.isArray(prev?.templateSuratDocs)
              ? prev.templateSuratDocs
              : [],
          }));
        } else {
          setDocError(err.message || "Gagal memuat dokumen.");
        }
      } finally {
        setLoadingDocs(false);
      }
    }

    loadDocs();
  }, [setState]);

  const members = Array.isArray(state?.members) ? state.members : [];
  const me =
    members.find((m) => m.loginId === state?.session?.loginId) || null;

  const myDivision = String(me?.divisi || me?.division || "")
    .trim()
    .toLowerCase();
  const isAdmin = !!state?.session?.isAdmin;
  const myPosition = String(me?.jabatan || me?.position || "")
    .trim()
    .toLowerCase();

  const isLeadOrVice =
    myPosition === "lead" ||
    myPosition === "vice lead" ||
    myPosition === "vicelead";

  const canManageDocs =
    isAdmin ||
    isLeadOrVice ||
    myDivision === "treasurer" ||
    myDivision === "secretary";

  const docs = Array.isArray(state?.templateSuratDocs)
    ? state.templateSuratDocs
    : Array.isArray(state?.docsLibrary)
    ? state.docsLibrary
    : [];

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingItem, setEditingItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDoc, setPendingDoc] = useState(null);

  const filteredDocs = useMemo(() => {
    const ql = String(q || "").trim().toLowerCase();
    if (!ql) return [...docs].reverse();

    return [...docs]
      .filter((item) => {
        const text = [
          item?.title,
          item?.url,
          item?.type,
          item?.createdByName,
          item?.createdBy,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(ql);
      })
      .reverse();
  }, [docs, q]);

  function openAddModal() {
    setEditingItem(null);
    setModalMode("add");
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function confirmSaveDoc() {
    if (!pendingDoc) return;

    setConfirmOpen(false);

    await handleSubmitDoc(pendingDoc);

    setPendingDoc(null);
  } 

  async function handleSubmitDoc({ title, url }) {
    const finalUrl = normalizeUrl(url);
    const detectedType = detectDocType(finalUrl);
    const fallbackTitle = extractTitleFromUrl(finalUrl);
    const finalTitle =
      String(title || "").trim() ||
      fallbackTitle ||
      `Dokumen ${docs.length + 1}`;

    try {
      if (modalMode === "edit" && editingItem) {
        const updated = await updateTemplateSuratApi(
          editingItem.id,
          {
            title: finalTitle,
            url: finalUrl,
            type: detectedType,
            periodId: activePeriodId,
          },
          activePeriodId
        );

        setState((prev) => ({
          ...prev,
          templateSuratDocs: (
            Array.isArray(prev.templateSuratDocs)
              ? prev.templateSuratDocs
              : []
          ).map((item) => (item.id !== editingItem.id ? item : updated)),
        }));
      } else {
        const created = await createTemplateSuratApi(
          {
            title: finalTitle,
            url: finalUrl,
            type: detectedType,
            periodId: activePeriodId,
          },
          activePeriodId
        );

        setState((prev) => ({
          ...prev,
          templateSuratDocs: [
            ...(Array.isArray(prev.templateSuratDocs)
              ? prev.templateSuratDocs
              : []),
            created,
          ],
        }));
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert(err.message || "Gagal menyimpan dokumen.");
    }
  }

  async function deleteDoc(id) {
    const ok = confirm("Hapus dokumen ini?");
    if (!ok) return;

    try {
      await deleteTemplateSuratApi(id);

      setState((prev) => ({
        ...prev,
        templateSuratDocs: (
          Array.isArray(prev.templateSuratDocs)
            ? prev.templateSuratDocs
            : []
        ).filter((item) => item.id !== id),
      }));
    } catch (err) {
      alert(err.message || "Gagal menghapus dokumen.");
    }
  }

  return (
    <div className="space-y-6">
      <div className={ui.card}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[18px] md:text-[16px] font-semibold leading-tight tracking-tight">
              Laporan dan Surat
            </h2>
            {/* <div className={cx("mt-2 text-sm", ui.textMuted)}>
              Model tampilan seperti library dokumen. Nanti bisa kamu ubah namanya menjadi Laporan dan Surat.
            </div> */}
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <input
              className={cx(ui.input, "w-full md:w-[340px]")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari laporan / surat / jenis dokumen..."
            />

            {canManageDocs ? (
              <button
                type="button"
                className={cx(ui.btnBase, ui.btnPrimary)}
                onClick={openAddModal}
              >
                Tambah Dokumen
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!canManageDocs ? (
        <div
          className={cx(
            "rounded-2xl px-4 py-3 text-sm ring-1",
            theme === "dark"
              ? "bg-amber-950/30 text-amber-200 ring-amber-900"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          )}
        >
          Yang bisa menambahkan dokumen hanya divisi <b>Treasurer</b>, <b>Secretary</b>, dan <b>Admin</b>.
        </div>
      ) : null}

      {docError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {docError}
        </div>
      ) : null}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {loadingDocs ? (
        <div className={cx(ui.card, "sm:col-span-2 xl:col-span-4")}>
          <div className="text-base font-semibold">Memuat dokumen...</div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className={cx(ui.card, "sm:col-span-2 xl:col-span-4")}>
          <div className="text-base font-semibold">Belum ada dokumen</div>
          <div className={cx("mt-2 text-sm", ui.textMuted)}>
            Tambahkan link Google Docs, Google Sheets, spreadsheet, PDF, atau dokumen lain.
          </div>
        </div>
      ) : (
        filteredDocs.map((item) => {
          const accent = getTypeAccent(item.type);

          return (
            <div
              key={item.id}
              className={cx(
                "overflow-hidden rounded-2xl border shadow-sm",
                theme === "dark"
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white"
              )}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block cursor-pointer"
                title={`Buka ${item.title}`}
              >
                <PreviewThumbnail item={item} theme={theme} />
              </a>

              <div className="p-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[14px] font-semibold leading-5 hover:underline"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                    <div className={cx("mt-1 text-sm", ui.textMuted)}>
                      {getTypeLabel(item.type)}
                    </div>
                  </div>

                  <div
                    className={cx(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                      accent.badge
                    )}
                  >
                    {accent.chip}
                  </div>
                </div>

                <div className={cx("mt-1 text-xs", ui.textMuted2)}>
                  Ditambahkan {formatCreatedAt(item.createdAt)}
                  {item.periodId ? ` • Periode ${item.periodId}` : ""}
                </div>

                {canManageDocs ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={cx(ui.btnBase, ui.btnGhost)}
                      onClick={() => openEditModal(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={cx(ui.btnBase, ui.btnGhost)}
                      onClick={() => deleteDoc(item.id)}
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>

    {confirmOpen && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
        <div
          className={cx(
            "w-full max-w-md rounded-2xl p-6",
            theme === "dark"
              ? "bg-slate-900 border border-white/10"
              : "bg-white border border-gray-200"
          )}
        >
          <h3 className="text-lg font-semibold">
            {modalMode === "edit"
              ? "Simpan Perubahan?"
              : "Tambah Dokumen?"}
          </h3>

          <p className={cx("mt-2 text-sm", ui.textMuted)}>
            {modalMode === "edit"
              ? "Perubahan dokumen akan disimpan."
              : "Dokumen baru akan ditambahkan."}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmOpen(false);
                setPendingDoc(null);
              }}
              className={cx(ui.btnBase, ui.btnGhost)}
            >
              Batal
            </button>

            <button
              onClick={confirmSaveDoc}
              className={cx(ui.btnBase, ui.btnPrimary)}
            >
              Ya, Simpan
            </button>
          </div>
        </div>
      </div>
    )}

      <DocModal
        open={modalOpen}
        mode={modalMode}
        initialData={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={(data) => {
          setPendingDoc(data);
          setConfirmOpen(true);
        }}
        ui={ui}
        theme={theme}
      />
    </div>
  );
}