function domainForPeriod(periodId = "2025") {
  const year = Number(periodId);
  return Number.isFinite(year) && year >= 2026 ? "nfcc" : "nfscc";
}

function makeMember({ name, divisi, localId, position = "Staff", tahunAngkatan = "", password = "" }, periodId) {
  const domain = domainForPeriod(periodId);
  const normalizedDivisi = String(divisi || "").trim();
  let divPart = normalizedDivisi.toLowerCase().replace(/\s+/g, "");
  if (divPart === "sekretaris") divPart = "secre";
  if (divPart === "treasurer") divPart = "treas";
  if (divPart === "r&d") divPart = "rnd";
  if (divPart === "r&e") divPart = "re";

  return {
    name,
    divisi: normalizedDivisi,
    loginId: `${localId}.${divPart}@${domain}`,
    password,
    position,
    isEC: ["Lead", "Vice Lead", "Executive Committee"].includes(position),
    isActive: true,
    tahunAngkatan: String(tahunAngkatan || "").trim(),
    periodId: String(periodId),
  };
}

export function makeSeed(periodId = "2025") {
  const id = String(periodId || "2025");
  const domain = domainForPeriod(id);
  const is2026Plus = Number(id) >= 2026;

  const ecMembers = is2026Plus
    ? [
        makeMember({ name: "Firmansyah Dzakwan Arifien", divisi: "Lead", localId: "dzakwan", position: "Lead", tahunAngkatan: "2023" }, id),
        makeMember({ name: "Jamilatun Khoerunnisa", divisi: "HRD", localId: "mila", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Rahmi Atika", divisi: "PR", localId: "rahmi", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Amarsya", divisi: "Sekretaris", localId: "amarsya", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Faisal", divisi: "Treasurer", localId: "faisal", position: "Executive Committee", tahunAngkatan: "2022" }, id),
      ]
    : [
        makeMember({ name: "Firmansyah Dzakwan Arifien", divisi: "Lead", localId: "dzakwan", position: "Lead", tahunAngkatan: "2023" }, id),
        makeMember({ name: "Jamilatun Khoerunnisa", divisi: "HRD", localId: "mila", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Rahmi Atika", divisi: "PR", localId: "rahmi", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Faiz Abdullah Hanif Firmansyah", divisi: "PDD", localId: "faiz", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Ferdi", divisi: "R&D", localId: "ferdi", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Amarsya", divisi: "Sekretaris", localId: "amarsya", position: "Executive Committee", tahunAngkatan: "2022" }, id),
        makeMember({ name: "Faisal", divisi: "Treasurer", localId: "faisal", position: "Executive Committee", tahunAngkatan: "2022" }, id),
      ];

  return {
    meta: {
      periodId: id,
      periodLabel: `Periode ${id}`,
      domain,
    },
    session: {
      isAuthed: false,
      isAdmin: false,
      loginId: "",
      periodId: id,
      period: id,
    },
    settings: {
      period: id,
    },
    members: ecMembers,
    memberArchives: [],
    keuangan: {
      pemasukan: [],
      pengeluaran: [],
      saldoAwal: 0,
    },
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

export default makeSeed;

