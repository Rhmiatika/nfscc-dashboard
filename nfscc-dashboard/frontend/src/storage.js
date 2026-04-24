import { makeSeed as makeSeed2025 } from "./seed";

const ROOT_KEY = "nfscc_dashboard_root_v3";
const LEGACY_KEY = "nfscc_dashboard_state";
const SESSION_KEY = "nfscc_runtime_session";

function domainForPeriod(periodId) {
  const year = Number(periodId);
  if (Number.isFinite(year) && year >= 2026) return "nfcc";
  return "nfscc";
}

function nowISO() {
  return new Date().toISOString();
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function normalizeDomain(value, periodId = "") {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return raw || domainForPeriod(periodId);
}

function extractLocalLogin(loginId) {
  const raw = String(loginId || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.includes("@") ? raw.split("@")[0] : raw;
}

function replaceLoginDomain(loginId, domain, fallbackLocal = "") {
  const local =
    extractLocalLogin(loginId) ||
    String(fallbackLocal || "").trim().toLowerCase();
  if (!local) return "";
  return `${local}@${normalizeDomain(domain)}`;
}

function normalizeMember(member, periodId = "") {
  const resolvedPeriodId = String(member?.periodId || periodId || "").trim();
  return {
    ...member,
    periodId: resolvedPeriodId,
    tahunAngkatan: String(member?.tahunAngkatan || "").trim(),
    isActive:
      typeof member?.isActive === "boolean" ? member.isActive : true,
  };
}

function normalizeMemberArchive(member, periodId = "") {
  const normalized = normalizeMember(member, periodId);
  return {
    ...normalized,
    archivedAt: normalized?.archivedAt || nowISO(),
    archiveReason: String(
      normalized?.archiveReason || normalized?.reason || "manual"
    ).trim(),
    source: String(normalized?.source || "anggota").trim(),
    isActive: false,
  };
}

function appendMemberArchives(
  existingArchives = [],
  incomingMembers = [],
  periodId = "",
  reason = "manual"
) {
  const baseArchives = Array.isArray(existingArchives)
    ? existingArchives.map((item) => normalizeMemberArchive(item, periodId))
    : [];

  const archiveKeySet = new Set(
    baseArchives.map(
      (item) =>
        `${String(item?.loginId || "").toLowerCase()}::${String(
          item?.periodId || periodId || ""
        )}`
    )
  );

  for (const member of Array.isArray(incomingMembers) ? incomingMembers : []) {
    const archiveItem = normalizeMemberArchive(
      {
        ...member,
        archivedAt: nowISO(),
        archiveReason: reason,
        source: "anggota",
      },
      periodId
    );

    const key = `${String(archiveItem?.loginId || "").toLowerCase()}::${String(
      archiveItem?.periodId || periodId || ""
    )}`;

    if (!archiveKeySet.has(key)) {
      archiveKeySet.add(key);
      baseArchives.push(archiveItem);
    }
  }

  return baseArchives;
}

function makeEmptySeed(periodId) {
  const id = String(periodId);
  const domain = domainForPeriod(id);

  return {
    meta: {
      periodId: id,
      periodLabel: `Periode ${id}`,
      domain,
    },
    session: {
      isAuthed: false,
      isAdmin: false,
      isEC: false,
      role: "",
      loginId: "",
      name: "",
      divisi: "",
      apiUser: null,
      periodId: id,
      period: id,
    },
    settings: {
      period: id,
    },
    members: [],
    memberArchives: [],
    keuangan: { pemasukan: [], pengeluaran: [], saldoAwal: 0 },
    proker: [],
    kegiatan: [],
    presensi: [],
    templateSurat: {
      kop: "",
      ttd: "",
      footer: "",
    },
  };
}

function getEnabledPeriodsMetaMap(root) {
  const metaMap = root?.periodsMeta || {};
  const entries = Object.entries(metaMap);
  if (entries.length === 0) return {};

  const normalized = {};
  for (const [id, meta] of entries) {
    normalized[id] = {
      id: String(id),
      label: meta?.label || `Periode ${id}`,
      domain: normalizeDomain(meta?.domain, id),
      createdAt: meta?.createdAt || nowISO(),
      isEnabled:
        typeof meta?.isEnabled === "boolean" ? meta.isEnabled : true,
    };
  }
  return normalized;
}

function getEnabledPeriodIds(root) {
  const metaMap = getEnabledPeriodsMetaMap(root);
  return Object.values(metaMap)
    .filter((x) => x.isEnabled)
    .map((x) => String(x.id))
    .sort((a, b) => Number(a) - Number(b));
}

function ensureAtLeastOneEnabled(root) {
  const enabledIds = getEnabledPeriodIds(root);
  if (enabledIds.length > 0) return root;

  const allIds = Object.keys(root?.periodsMeta || {}).sort(
    (a, b) => Number(a) - Number(b)
  );
  const fallbackId = allIds[allIds.length - 1] || "2025";

  if (!root.periodsMeta) root.periodsMeta = {};
  if (!root.periodsMeta[fallbackId]) {
    root.periodsMeta[fallbackId] = {
      id: fallbackId,
      label: `Periode ${fallbackId}`,
      domain: domainForPeriod(fallbackId),
      createdAt: nowISO(),
      isEnabled: true,
    };
  } else {
    root.periodsMeta[fallbackId] = {
      ...root.periodsMeta[fallbackId],
      isEnabled: true,
    };
  }

  root.activePeriodId = fallbackId;
  return root;
}

function saveRoot(root) {
  localStorage.setItem(ROOT_KEY, JSON.stringify(root));
}

function ensurePeriodMeta(root, periodId) {
  const id = String(periodId || "").trim();
  if (!id) return root;

  if (!root.periodsMeta) root.periodsMeta = {};

  if (!root.periodsMeta[id]) {
    root.periodsMeta[id] = {
      id,
      label: `Periode ${id}`,
      domain: domainForPeriod(id),
      createdAt: nowISO(),
      isEnabled: true,
    };
  } else {
    root.periodsMeta[id] = {
      ...root.periodsMeta[id],
      id,
      label: root.periodsMeta[id]?.label || `Periode ${id}`,
      domain: normalizeDomain(root.periodsMeta[id]?.domain, id),
      createdAt: root.periodsMeta[id]?.createdAt || nowISO(),
      isEnabled:
        typeof root.periodsMeta[id]?.isEnabled === "boolean"
          ? root.periodsMeta[id].isEnabled
          : true,
    };
  }

  return root;
}

function ensurePeriodData(root, periodId) {
  const id = String(periodId || "").trim();
  if (!id) return root;

  if (!root.periodsData) root.periodsData = {};

  if (!root.periodsData[id]) {
    root.periodsData[id] = id === "2025" ? makeSeed2025(id) : makeEmptySeed(id);
  }

  if (id === "2025") {
    const existing = root.periodsData[id] || {};
    const existingMembers = Array.isArray(existing.members) ? existing.members : [];
    if (existingMembers.length === 0) {
      const seed = makeSeed2025(id);
      root.periodsData[id] = {
        ...seed,
        ...existing,
        members: seed.members,
        memberArchives: Array.isArray(existing.memberArchives)
          ? existing.memberArchives
          : Array.isArray(seed.memberArchives)
          ? seed.memberArchives
          : [],
        meta: { ...seed.meta, ...(existing.meta || {}), periodId: id },
        session: {
          ...seed.session,
          ...(existing.session || {}),
          periodId: id,
          period: id,
        },
      };
    }
  }

  const nextState = root.periodsData[id] || {};
  root.periodsData[id] = {
    ...nextState,
    members: Array.isArray(nextState.members)
      ? nextState.members.map((member) => normalizeMember(member, id))
      : [],
    memberArchives: Array.isArray(nextState.memberArchives)
      ? nextState.memberArchives.map((member) => normalizeMemberArchive(member, id))
      : [],
  };

  return root;
}

function ensureRoot() {
  const raw = localStorage.getItem(ROOT_KEY);
  if (raw) {
    const root = safeParse(raw, null);
    if (root && root.periodsData && root.periodsMeta) {
      root.version = 3;

      const nextMeta = getEnabledPeriodsMetaMap(root);
      root.periodsMeta = nextMeta;

      if (!root.activePeriodId || !root.periodsMeta[root.activePeriodId]) {
        const ids = Object.keys(root.periodsMeta).sort((a, b) => Number(a) - Number(b));
        root.activePeriodId = ids[ids.length - 1] || "2025";
      }

      ensureAtLeastOneEnabled(root);
      saveRoot(root);
      return root;
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    const legacy = safeParse(legacyRaw, null);
    if (legacy && typeof legacy === "object") {
      const periodId =
        String(
          legacy?.session?.periodId ||
            legacy?.meta?.periodId ||
            legacy?.settings?.period ||
            "2025"
        ).trim() || "2025";

      const domain = normalizeDomain(
        legacy?.meta?.domain || domainForPeriod(periodId),
        periodId
      );

      const migrated = {
        version: 3,
        activePeriodId: periodId,
        periodsMeta: {
          [periodId]: {
            id: periodId,
            label: `Periode ${periodId}`,
            domain,
            createdAt: nowISO(),
            isEnabled: true,
          },
        },
        periodsData: {
          [periodId]: {
            ...legacy,
            meta: {
              ...(legacy.meta || {}),
              periodId,
              periodLabel: legacy?.meta?.periodLabel || `Periode ${periodId}`,
              domain,
            },
            session: {
              ...(legacy.session || {}),
              periodId,
              period: periodId,
            },
            settings: {
              ...(legacy.settings || {}),
              period: periodId,
            },
          },
        },
      };

      localStorage.setItem(ROOT_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }

  const periodId = "2025";
  const seed2025 = makeSeed2025(periodId);

  const root = {
    version: 3,
    activePeriodId: periodId,
    periodsMeta: {
      [periodId]: {
        id: periodId,
        label: `Periode ${periodId}`,
        domain: "nfscc",
        createdAt: nowISO(),
        isEnabled: true,
      },
      "2026": {
        id: "2026",
        label: "Periode 2026",
        domain: "nfcc",
        createdAt: nowISO(),
        isEnabled: true,
      },
    },
    periodsData: {
      [periodId]: seed2025,
      "2026": makeEmptySeed("2026"),
    },
  };

  localStorage.setItem(ROOT_KEY, JSON.stringify(root));
  return root;
}

  function loadRuntimeSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveRuntimeSession(session) {
    try {
      const safeSession = {
        loginId: session?.loginId || "",
        isAuthed: !!session?.isAuthed,
        isAdmin: !!session?.isAdmin,
        isEC: !!session?.isEC,
        role: session?.role || "",
        name: session?.name || "",
        divisi: session?.divisi || "",
        apiUser: session?.apiUser || null,
        period: session?.period || "",
        periodId: session?.periodId || "",
      };

      if (!safeSession.isAuthed) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(safeSession));
    } catch {
      // ignore
    }
  }

export function getCurrentPeriodId() {
  const root = ensureRoot();
  return String(root.activePeriodId || "2025");
}

export function setCurrentPeriodId(periodId) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  if (!id) return;

  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  if (root.periodsMeta?.[id]) {
    root.periodsMeta[id] = {
      ...root.periodsMeta[id],
      isEnabled: true,
    };
  }

  root.activePeriodId = id;
  ensureAtLeastOneEnabled(root);
  saveRoot(root);
}

export function setActivePeriodId(periodId) {
  setCurrentPeriodId(periodId);
}

export function getActivePeriodMeta() {
  const root = ensureRoot();
  const id = String(root.activePeriodId || "2025");
  ensurePeriodMeta(root, id);
  saveRoot(root);
  return root.periodsMeta[id];
}

export function getPeriodMeta(periodId) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  if (!id) return null;
  ensurePeriodMeta(root, id);
  saveRoot(root);
  return root.periodsMeta[id] || null;
}

export function getPeriods() {
  const root = ensureRoot();

  const ids = new Set([
    ...Object.keys(root.periodsMeta || {}),
    ...Object.keys(root.periodsData || {}),
  ]);

  return Array.from(ids)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => {
      const meta = root.periodsMeta?.[id] || {};
      const periodId = String(id);
      return {
        id: periodId,
        label: String(meta.label || `Periode ${id}`),
        domain: String(meta.domain || domainForPeriod(id)),
        createdAt: meta.createdAt || "",
        isEnabled:
          typeof meta.isEnabled === "boolean" ? meta.isEnabled : true,
        isActive: String(root.activePeriodId || "") === periodId,
      };
    });
}

export function createPeriod(labelOrYear, customDomain = "") {
  const root = ensureRoot();
  const raw = String(labelOrYear || "").trim();
  if (!raw) return null;

  const yearMatch = raw.match(/(19|20)\d{2}/);
  const id = yearMatch ? yearMatch[0] : raw;
  const domain = normalizeDomain(customDomain || domainForPeriod(id), id);

  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  root.periodsMeta[id] = {
    ...(root.periodsMeta[id] || {}),
    id,
    label: `Periode ${id}`,
    domain,
    createdAt: root.periodsMeta?.[id]?.createdAt || nowISO(),
    isEnabled: true,
  };

  root.periodsData[id] = {
    ...(root.periodsData[id] || makeEmptySeed(id)),
    meta: {
      ...((root.periodsData[id] || {}).meta || {}),
      periodId: id,
      periodLabel: `Periode ${id}`,
      domain,
    },
    session: {
      ...((root.periodsData[id] || {}).session || {}),
      periodId: id,
      period: id,
    },
    settings: {
      ...((root.periodsData[id] || {}).settings || {}),
      period: id,
    },
  };

  root.activePeriodId = id;
  saveRoot(root);
  return root.periodsMeta[id];
}

export function setPeriodEnabled(periodId, enabled) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  if (!id) return false;

  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  const nextEnabled = !!enabled;
  const currentMeta = root.periodsMeta[id] || {};
  const previouslyEnabled =
    typeof currentMeta.isEnabled === "boolean" ? currentMeta.isEnabled : true;

  if (!nextEnabled && previouslyEnabled) {
    const enabledIds = getEnabledPeriodIds(root);
    if (enabledIds.length <= 1 && enabledIds.includes(id)) {
      return false;
    }
  }

  root.periodsMeta[id] = {
    ...currentMeta,
    id,
    label: currentMeta?.label || `Periode ${id}`,
    domain: normalizeDomain(currentMeta?.domain, id),
    createdAt: currentMeta?.createdAt || nowISO(),
    isEnabled: nextEnabled,
  };

  if (nextEnabled) {
    root.activePeriodId = id;
  } else if (String(root.activePeriodId || "") === id) {
    const fallbackIds = getEnabledPeriodIds(root).filter((x) => x !== id);
    const fallbackId = fallbackIds[fallbackIds.length - 1] || "2025";
    ensurePeriodMeta(root, fallbackId);
    ensurePeriodData(root, fallbackId);
    root.activePeriodId = fallbackId;
  }

  ensureAtLeastOneEnabled(root);
  saveRoot(root);
  return true;
}

export function deletePeriod(periodId) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  if (!id) return false;

  if (id === "2025" || id === "2026") {
    return false;
  }

  if (root.periodsMeta?.[id]) {
    delete root.periodsMeta[id];
  }

  if (root.periodsData?.[id]) {
    delete root.periodsData[id];
  }

  const remaining = Object.keys(root.periodsMeta || {}).sort(
    (a, b) => Number(a) - Number(b)
  );

  if (String(root.activePeriodId || "") === id) {
    const enabledRemaining = getEnabledPeriodIds(root).filter((x) => x !== id);
    root.activePeriodId =
      enabledRemaining[enabledRemaining.length - 1] ||
      remaining[remaining.length - 1] ||
      "2025";
  }

  ensureAtLeastOneEnabled(root);
  saveRoot(root);
  return true;
}

export function loadStateForPeriod(periodId) {
  const root = ensureRoot();
  const id = String(periodId || root.activePeriodId || "2025").trim() || "2025";
  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);
  saveRoot(root);
  return root.periodsData[id];
}

export function saveStateForPeriod(periodId, state) {
  const root = ensureRoot();
  const id = String(periodId || root.activePeriodId || "2025").trim() || "2025";
  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  const meta = root.periodsMeta[id];

  root.periodsData[id] = {
    ...state,
    members: Array.isArray(state?.members)
      ? state.members.map((member) => normalizeMember(member, id))
      : [],
    memberArchives: Array.isArray(state?.memberArchives)
      ? state.memberArchives.map((member) => normalizeMemberArchive(member, id))
      : [],
    meta: {
      ...(state?.meta || {}),
      periodId: id,
      periodLabel: state?.meta?.periodLabel || meta?.label || `Periode ${id}`,
      domain: state?.meta?.domain || meta?.domain || domainForPeriod(id),
    },
    session: {
      ...(state?.session || {}),
      periodId: id,
      period: id,
    },
    settings: {
      ...(state?.settings || {}),
      period: id,
    },
  };

  saveRoot(root);
}

export function getAllPeriodsData() {
  const root = ensureRoot();
  const ids = Array.from(
    new Set([
      ...Object.keys(root.periodsMeta || {}),
      ...Object.keys(root.periodsData || {}),
    ])
  ).sort((a, b) => Number(b) - Number(a));

  return ids.map((id) => {
    ensurePeriodMeta(root, id);
    ensurePeriodData(root, id);
    return {
      id: String(id),
      meta: root.periodsMeta?.[id] || {},
      state: root.periodsData?.[id] || makeEmptySeed(id),
    };
  });
}

export function findMemberAcrossPeriods(loginId) {
  const needle = String(loginId || "").trim().toLowerCase();
  if (!needle) return null;

  const root = ensureRoot();
  const activeId = String(root.activePeriodId || "2025");
  const activeDomain = normalizeDomain(
    root?.periodsMeta?.[activeId]?.domain || domainForPeriod(activeId),
    activeId
  );

  const needleLocal = extractLocalLogin(needle);

  const allPeriods = getAllPeriodsData();
  const enabledIds = new Set(
    getPeriods()
      .filter((p) => p.isEnabled)
      .map((p) => String(p.id))
  );

  const sortedPeriods = [...allPeriods].sort((a, b) => {
    const aId = String(a.id);
    const bId = String(b.id);

    if (aId === activeId && bId !== activeId) return -1;
    if (bId === activeId && aId !== activeId) return 1;

    const aEnabled = enabledIds.has(aId);
    const bEnabled = enabledIds.has(bId);

    if (aEnabled && !bEnabled) return -1;
    if (bEnabled && !aEnabled) return 1;

    return Number(bId) - Number(aId);
  });

  for (const item of sortedPeriods) {
    const members = Array.isArray(item?.state?.members) ? item.state.members : [];
    const periodId = String(item.id);
    const periodEnabled = enabledIds.has(periodId);

    if (!periodEnabled) continue;

    const member = members.find((m) => {
      const memberLogin = String(m?.loginId || "").trim().toLowerCase();
      const memberLocal = extractLocalLogin(memberLogin);
      const expectedActiveDomainLogin = memberLocal
        ? `${memberLocal}@${activeDomain}`
        : "";

      return (
        memberLogin === needle ||
        memberLocal === needleLocal ||
        expectedActiveDomainLogin === needle
      );
    });

    if (member) {
      return {
        periodId: item.id,
        periodMeta: item.meta || {},
        periodState: item.state || null,
        member,
      };
    }
  }

  return null;
}

export function reactivateMember(periodId, loginId) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  const needle = String(loginId || "").trim().toLowerCase();

  if (!id || !needle) return false;

  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  const periodState = root.periodsData?.[id];
  if (!periodState) return false;

  const members = Array.isArray(periodState.members)
    ? periodState.members.map((member) => normalizeMember(member, id))
    : [];

  let found = false;

  const nextMembers = members.map((member) => {
    const memberLogin = String(member?.loginId || "").trim().toLowerCase();
    if (memberLogin !== needle) return member;

    found = true;
    return {
      ...member,
      isActive: true,
      periodId: id,
      tahunAngkatan: String(member?.tahunAngkatan || "").trim(),
    };
  });

  if (!found) return false;

  root.periodsData[id] = {
    ...periodState,
    members: nextMembers,
    memberArchives: Array.isArray(periodState.memberArchives)
      ? periodState.memberArchives.map((item) => normalizeMemberArchive(item, id))
      : [],
  };

  saveRoot(root);
  return true;
}

export function restoreMemberFromArchive(periodId, loginId) {
  const root = ensureRoot();
  const id = String(periodId || "").trim();
  const needle = String(loginId || "").trim().toLowerCase();

  if (!id || !needle) return false;

  ensurePeriodMeta(root, id);
  ensurePeriodData(root, id);

  const periodState = root.periodsData?.[id];
  if (!periodState) return false;

  const archives = Array.isArray(periodState.memberArchives)
    ? periodState.memberArchives.map((item) => normalizeMemberArchive(item, id))
    : [];

  const members = Array.isArray(periodState.members)
    ? periodState.members.map((member) => normalizeMember(member, id))
    : [];

  const archivedMember = archives.find(
    (item) => String(item?.loginId || "").trim().toLowerCase() === needle
  );

  if (!archivedMember) return false;

  const nextArchives = archives.filter(
    (item) => String(item?.loginId || "").trim().toLowerCase() !== needle
  );

  const cleanedMember = normalizeMember(
    {
      ...archivedMember,
      isActive: true,
      archivedAt: undefined,
      archiveReason: undefined,
      source: undefined,
    },
    id
  );

  const existingIndex = members.findIndex(
    (member) => String(member?.loginId || "").trim().toLowerCase() === needle
  );

  let nextMembers = [...members];

  if (existingIndex >= 0) {
    nextMembers[existingIndex] = {
      ...nextMembers[existingIndex],
      ...cleanedMember,
      isActive: true,
      periodId: id,
    };
  } else {
    nextMembers.push({
      ...cleanedMember,
      isActive: true,
      periodId: id,
    });
  }

  root.periodsData[id] = {
    ...periodState,
    members: nextMembers,
    memberArchives: nextArchives,
  };

  if (root.periodsMeta?.[id]) {
    root.periodsMeta[id] = {
      ...root.periodsMeta[id],
      isEnabled: true,
    };
  }

  saveRoot(root);
  return true;
}

export function loadState() {
  const state = loadStateForPeriod(getCurrentPeriodId());
  if (!state) return state;

  const runtimeSession = loadRuntimeSession();

  return {
    ...state,
    session: runtimeSession
      ? {
          ...(state.session || {}),
          ...runtimeSession,
        }
      : {
          ...(state.session || {}),
          loginId: "",
          isAuthed: false,
          isAdmin: false,
          isEC: false,
          role: "",
          name: "",
          divisi: "",
          apiUser: null,
        },
  };
}

export function saveState(state) {
  saveRuntimeSession(state?.session || {});

  const safeState = {
    ...state,
    session: {
      ...(state?.session || {}),
      loginId: "",
      isAuthed: false,
      isAdmin: false,
      isEC: false,
      role: "",
      name: "",
      divisi: "",
      apiUser: null,
    },
  };

  return saveStateForPeriod(getCurrentPeriodId(), safeState);
}

export function clearState() {
  localStorage.removeItem(ROOT_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export { replaceLoginDomain, extractLocalLogin, normalizeDomain };