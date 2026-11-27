import * as XLSX from "xlsx";

export const LEAVE_TYPES = {
  urlaub: { label: "Urlaub", short: "U", classes: "bg-red-700 text-white" },
  za: { label: "Zeitausgleich", short: "ZA", classes: "bg-green-700 text-white" },
  krank: { label: "Krankenstand", short: "K", classes: "bg-blue-700 text-white" },
  sonstiges: { label: "Büro/Tour/Sonstiges", short: "S", classes: "bg-gray-600 text-white" },
  angefragt: { label: "Gewünschter Urlaub", short: "W", classes: "bg-purple-700 text-white" },
};

export const LEAVE_DEPARTMENTS = { waescherei: "Wäscherei", putzerei: "Putzerei" };
export const leaveIdentity = (department, name) => JSON.stringify([department, name]);
const dayMillis = 86400000;
const isoDay = (date) => date.toISOString().slice(0, 10);
const normalizeExcelText = (text) => String(text ?? "").trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function leaveDaysBetween(from, to) {
  if (![from, to].every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))) return [];
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  if (isoDay(new Date(start)) !== from || isoDay(new Date(end)) !== to) return [];
  const count = (end - start) / dayMillis + 1;
  return count > 0 && count <= 366
    ? Array.from({ length: count }, (_, index) => isoDay(new Date(start + index * dayMillis)))
    : [];
}

export function leaveMonthDays(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return leaveDaysBetween(isoDay(first), isoDay(last));
}

const fixedHolidays = {
  "01-01": "Neujahr", "01-06": "Heilige Drei Könige", "05-01": "Staatsfeiertag",
  "08-15": "Mariä Himmelfahrt", "10-26": "Nationalfeiertag", "11-01": "Allerheiligen",
  "12-08": "Mariä Empfängnis", "12-25": "Christtag", "12-26": "Stefanitag",
};
const movableHolidays = {
  "2026-04-06": "Ostermontag", "2026-05-14": "Christi Himmelfahrt",
  "2026-05-25": "Pfingstmontag", "2026-06-04": "Fronleichnam",
  "2027-03-29": "Ostermontag", "2027-05-06": "Christi Himmelfahrt",
  "2027-05-17": "Pfingstmontag", "2027-05-27": "Fronleichnam",
};
export const austrianHoliday = (day) => movableHolidays[day] || fixedHolidays[day.slice(5)];

const excelColors = {
  FF0000: "urlaub",
  "31859C": "urlaub",
  "92D050": "za",
  "00B0F0": "krank",
  B3A2C7: "angefragt",
};
const excelMonths = [
  /^(jan|janner|januar)$/, /^(feb|februar)$/, /^(mar|marz|mrz)$/, /^(apr|april)$/,
  /^mai$/, /^(jun|juni)$/, /^(jul|juli)$/, /^(aug|august)$/,
  /^(sep|sept|september)$/, /^(okt|oktober)$/, /^(nov|november)$/, /^(dez|dezember)$/,
];

export function readLeaveWorkbook(bytes) {
  const workbook = XLSX.read(bytes, { cellStyles: true });
  const years = workbook.SheetNames.filter((name) => /^(2026|2027)$/.test(name)).sort().slice(-1);
  if (!years.length) throw new Error("Kein Jahresblatt 2026 oder 2027 gefunden.");
  const rows = [];
  let ambiguous = 0;
  let holidayMarkers = 0;
  for (const year of years) {
    const sheet = workbook.Sheets[year];
    const days = leaveDaysBetween(`${year}-01-01`, `${year}-12-31`);
    const cellAt = (row, column) => sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (!days.every((day, index) => (
      Number(cellAt(1, index + 4)?.v) === Number(day.slice(8))
      && excelMonths[Number(day.slice(5, 7)) - 1].test(normalizeExcelText(cellAt(0, index + 4)?.v).replace(/\./g, ""))
    ))) throw new Error(`Das Kalenderformat im Blatt ${year} stimmt nicht mit der Vorlage überein.`);

    const rowEnd = XLSX.utils.decode_range(sheet["!ref"]).e.r;
    let department = "";
    const checkedDepartments = new Set();
    for (let row = 2; row <= rowEnd; row++) {
      const name = String(cellAt(row, 0)?.v ?? "").trim();
      const label = normalizeExcelText(name);
      if (/^zusatzurlaubstag\b|^zeitausgleich$|^gewunschter urlaub$/.test(label)) break;
      if (/^(wascherei|waescherei|putzerei)\s*:?$/.test(label)) {
        department = label.startsWith("putzerei") ? "putzerei" : "waescherei";
        checkedDepartments.add(department);
        continue;
      }
      if (!department || !name) continue;
      days.forEach((day, index) => {
        const cell = cellAt(row, index + 4);
        if (cell?.v === undefined || cell.v === null || String(cell.v).trim() === "") return;
        const color = String(cell.s?.fgColor?.rgb ?? "").toUpperCase().slice(-6);
        if (!cell.f && Number(cell.v) === 1 && color === "FFFF00") {
          holidayMarkers++;
        } else if (!cell.f && Number(cell.v) === 1 && excelColors[color]) {
          rows.push({ day, department, employee_name: name, status: excelColors[color] });
        } else {
          ambiguous++;
        }
      });
    }
    if (checkedDepartments.size !== 2) throw new Error(`Die Bereichsüberschriften im Blatt ${year} konnten nicht erkannt werden.`);
  }
  return { years, rows, ambiguous, holidayMarkers };
}

export function mergeLeaveStatuses(plan, entries) {
  const blocking = entries.filter((entry) => entry.status !== "angefragt");
  if (!blocking.length) return plan;
  const names = new Set(blocking.map((entry) => entry.employee_name));
  const merged = { ...plan };
  for (const status of Object.keys(LEAVE_TYPES).filter((type) => type !== "angefragt")) {
    merged[status] = [
      ...(plan[status] || []).filter((name) => !names.has(name)),
      ...new Set(blocking.filter((entry) => entry.status === status).map((entry) => entry.employee_name)),
    ];
  }
  return merged;
}
