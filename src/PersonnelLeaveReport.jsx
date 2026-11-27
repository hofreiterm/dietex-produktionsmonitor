import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { LEAVE_DEPARTMENTS, LEAVE_TYPES, leaveDaysBetween, leaveIdentity } from "./personnel-leave.js";

const partsInVienna = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" });
const displayDate = new Intl.DateTimeFormat("de-AT", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const displayDay = new Intl.DateTimeFormat("de-AT", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const confirmedStatuses = ["urlaub", "za", "krank", "sonstiges"];
const countColumns = [
  { key: "urlaub", label: "Urlaub", x: 453, width: 85 },
  { key: "za", label: "ZA", x: 547, width: 52 },
  { key: "krank", label: "Krank", x: 608, width: 74 },
  { key: "sonstiges", label: "Sonstiges", x: 692, width: 95 },
  { key: "confirmed", label: "Bestätigt", x: 798, width: 98 },
  { key: "angefragt", label: "Wunschurlaub", x: 907, width: 150 },
];
const dayMillis = 86400000;
const emptyMessage = "Keine bestätigten Abwesenheiten in diesem Zeitraum.";
const emptyEmployees = "Keine Mitarbeiter in dieser Auswahl.";
const personKey = ({ department, employee_name }) => leaveIdentity(department, employee_name);
const sortPeople = (a, b) => b.department.localeCompare(a.department) || a.employee_name.localeCompare(b.employee_name, "de-AT");

export function previousLeaveWeek(now = new Date()) {
  const parts = Object.fromEntries(partsInVienna.formatToParts(now).map(({ type, value }) => [type, value]));
  const monday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const from = new Date(monday);
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date(monday);
  to.setUTCDate(to.getUTCDate() - 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function dateLabels(dates, includeYear) {
  const sorted = [...dates].sort();
  const labels = [];
  const format = (day) => (includeYear ? displayDate : displayDay).format(new Date(day));
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    while (Date.parse(sorted[i + 1]) - Date.parse(sorted[i]) === dayMillis) i++;
    labels.push(first === sorted[i] ? format(first) : `${format(first)} - ${format(sorted[i])}`);
  }
  return labels;
}

function groupAbsences(rows) {
  const groups = new Map();
  for (const { department, employee_name, status, day } of rows) {
    if (!Object.hasOwn(LEAVE_TYPES, status) || !Object.hasOwn(LEAVE_DEPARTMENTS, department)) continue;
    const key = JSON.stringify([department, employee_name, status]);
    if (!groups.has(key)) groups.set(key, { key, department, employee_name, status, dates: new Set() });
    groups.get(key).dates.add(day);
  }
  return [...groups.values()];
}

function countAbsences(people, groups) {
  const entries = new Map(people.map((person) => {
    const key = personKey(person);
    return [key, { ...person, key, counts: { urlaub: 0, za: 0, krank: 0, sonstiges: 0, angefragt: 0, confirmed: 0 } }];
  }));
  for (const group of groups) {
    const person = entries.get(personKey(group));
    if (!person) continue;
    person.counts[group.status] = group.dates.size;
    if (confirmedStatuses.includes(group.status)) person.counts.confirmed += group.dates.size;
  }
  return [...entries.values()];
}

function wrapDates(ctx, days, width) {
  const lines = [];
  let line = "";
  days.forEach((day, i) => {
    const token = i < days.length - 1 ? `${day},` : day;
    const next = line ? `${line} ${token}` : token;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = token;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function downloadReport(range, period, rows, countMode) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const canvas = document.createElement("canvas");
  canvas.width = 1120;
  canvas.height = 1584;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const columns = [{ label: "Bereich", x: 66, width: 131 }, { label: "Mitarbeiter", x: 210, width: countMode ? 230 : 244 },
    ...(countMode ? countColumns : [{ label: "Status", x: 468, width: 226 }, { label: "Tage", x: 707, width: 350 }])];
  const bodyHeight = 1280;
  const lineHeight = 24;
  const maxLines = Math.floor((bodyHeight - 16) / lineHeight);
  const pages = [[]];
  let used = 0;
  ctx.font = "19px Arial, sans-serif";
  rows.forEach((row) => {
    const lines = countMode ? [""] : wrapDates(ctx, row.days, columns[3].width);
    for (let i = 0; i < lines.length; i += maxLines) {
      const chunk = lines.slice(i, i + maxLines);
      const height = 16 + chunk.length * lineHeight;
      if (used + height > bodyHeight) {
        pages.push([]);
        used = 0;
      }
      pages.at(-1).push({ row, lines: chunk, height });
      used += height;
    }
  });
  for (let page = 0; page < pages.length; page++) {
    if (page) pdf.addPage();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillText(countMode ? "DieTex Tagesanzahl" : "DieTex Abwesenheitsbericht", 58, 86);
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText(period, 58, 122);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(58, 153, 1004, 40);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 19px Arial, sans-serif";
    columns.forEach(({ label, x }) => ctx.fillText(label, x, 180));
    ctx.font = "19px Arial, sans-serif";
    if (!rows.length) ctx.fillText(countMode ? emptyEmployees : emptyMessage, 66, 228);
    let y = 193;
    pages[page].forEach(({ row, lines, height }, i) => {
      ctx.fillStyle = i % 2 ? "#f8fafc" : "#ffffff";
      ctx.fillRect(58, y, 1004, height);
      ctx.fillStyle = "#0f172a";
      const values = [LEAVE_DEPARTMENTS[row.department], row.employee_name,
        ...(countMode ? countColumns.map(({ key }) => String(row.counts[key])) : [LEAVE_TYPES[row.status].label])];
      values.forEach((value, col) => ctx.fillText(value, columns[col].x, y + 26, columns[col].width));
      if (!countMode) lines.forEach((line, index) => ctx.fillText(line, columns[3].x, y + 26 + lineHeight * index, columns[3].width));
      y += height;
    });
    ctx.fillStyle = "#475569";
    ctx.font = "18px Arial, sans-serif";
    ctx.fillText(`Seite ${page + 1} von ${pages.length}`, 58, 1532);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  }
  pdf.save(`dietex-${countMode ? "tagesanzahl" : "abwesenheiten"}-${range.from}-bis-${range.to}.pdf`);
}

export default function PersonnelLeaveReport({ range, data, directory, onChangeRange, onClose }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(() => ({ from: range.from, to: range.to }));
  const [rangeError, setRangeError] = useState("");
  const [exportError, setExportError] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [countMode, setCountMode] = useState(false);
  const includeYear = range.from.slice(0, 4) !== range.to.slice(0, 4);
  const employees = useMemo(() => {
    const people = new Map();
    for (const person of [...directory, ...data.rows, ...(employee ? [employee] : [])]) {
      if (Object.hasOwn(LEAVE_DEPARTMENTS, person.department)) {
        people.set(personKey(person), { department: person.department, employee_name: person.employee_name });
      }
    }
    return people;
  }, [directory, data.rows, employee]);
  const sortedEmployees = useMemo(() => [...employees.values()].sort(sortPeople), [employees]);
  const groups = useMemo(() => groupAbsences(employee
    ? data.rows.filter((row) => row.department === employee.department && row.employee_name === employee.employee_name)
    : data.rows), [data.rows, employee]);
  const absences = useMemo(() => groups.filter((row) => confirmedStatuses.includes(row.status))
    .sort((a, b) => sortPeople(a, b) || confirmedStatuses.indexOf(a.status) - confirmedStatuses.indexOf(b.status))
    .map(({ dates, ...row }) => ({ ...row, days: dateLabels(dates, includeYear) })), [groups, includeYear]);
  const counts = useMemo(() => countAbsences(employee ? [employee] : sortedEmployees, groups), [employee, sortedEmployees, groups]);
  const period = `${displayDate.format(new Date(range.from))} - ${displayDate.format(new Date(range.to))}`;
  const draftChanged = draft.from !== range.from || draft.to !== range.to;
  useEffect(() => { dialog.current?.showModal(); }, []);
  const applyRange = (nextRange) => {
    if (!leaveDaysBetween(nextRange.from, nextRange.to).length) {
      setRangeError("Bitte einen gültigen Zeitraum von höchstens 366 Tagen eingeben.");
      return;
    }
    setDraft(nextRange);
    setRangeError("");
    setExportError(false);
    onChangeRange(nextRange);
  };

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="leave-report-title"
      className="max-h-[88dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-lg border border-slate-300 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-white p-3">
        <div className="mr-auto">
          <h2 id="leave-report-title" className="text-lg font-black">Wochenbericht</h2>
          <p className="text-sm text-slate-600">{period}</p>
        </div>
        <button type="button" disabled={data.state !== "ready" || draftChanged} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-bold disabled:opacity-50"
          onClick={() => {
            try { downloadReport(range, period, countMode ? counts : absences, countMode); setExportError(false); }
            catch { setExportError(true); }
          }}>
          <Download size={16} aria-hidden="true" /> PDF herunterladen
        </button>
        <button type="button" aria-label="Wochenbericht schließen" title="Schließen" className="grid size-8 place-items-center rounded-md border border-slate-300"
          onClick={() => dialog.current?.close()}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <form className="flex flex-wrap items-end gap-2 border-b bg-slate-50 px-3 py-2"
        onSubmit={(event) => { event.preventDefault(); applyRange(draft); }}>
        <label className="grid gap-1 text-xs font-bold">Von
          <input type="date" required className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={draft.from} onChange={(event) => { setDraft({ ...draft, from: event.target.value }); setRangeError(""); }} />
        </label>
        <label className="grid gap-1 text-xs font-bold">Bis
          <input type="date" required className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={draft.to} onChange={(event) => { setDraft({ ...draft, to: event.target.value }); setRangeError(""); }} />
        </label>
        <button type="submit" className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-bold text-white">Anzeigen</button>
        <button type="button" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold"
          onClick={() => applyRange(previousLeaveWeek())}>Vorwoche</button>
      </form>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b px-3 py-2">
        <label className="grid max-w-full gap-1 text-xs font-bold">Mitarbeiter
          <select aria-label="Mitarbeiter" className="min-w-40 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={employee ? personKey(employee) : ""}
            onChange={(event) => { setEmployee(employees.get(event.target.value) || null); setExportError(false); }}>
            <option value="">Alle Mitarbeiter</option>
            {Object.entries(LEAVE_DEPARTMENTS).map(([department, label]) => (
              <optgroup key={department} label={label}>
                {sortedEmployees.filter((person) => person.department === department).map((person) => (
                  <option key={personKey(person)} value={personKey(person)}>{person.employee_name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Berichtsansicht" className="inline-flex rounded-md border border-slate-300 p-0.5">
          {[[false, "Einträge"], [true, "Tagesanzahl"]].map(([value, label]) => (
            <button key={label} type="button" aria-pressed={countMode === value}
              className={`rounded px-3 py-1 text-sm font-bold ${countMode === value ? "bg-blue-700 text-white" : "hover:bg-slate-100"}`}
              onClick={() => { setCountMode(value); setExportError(false); }}>{label}</button>
          ))}
        </div>
      </div>
      {rangeError && <p role="alert" className="px-3 pt-3 text-sm text-red-700">{rangeError}</p>}
      {exportError && <p role="alert" className="px-3 pt-3 text-sm text-red-700">PDF konnte nicht erstellt werden.</p>}
      {data.state !== "ready" ? (
        <p role="status" className="p-3 text-sm">{data.state === "error" ? "Bericht konnte nicht geladen werden." : "Bericht wird geladen…"}</p>
      ) : countMode ? (
        !counts.length ? <p className="p-3 text-sm">{emptyEmployees}</p> : (
          <div className="overflow-x-auto">
            <table aria-label="Tagesanzahl je Mitarbeiter" className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className="px-2 py-2">Bereich</th>
                  <th scope="col" className="px-2 py-2">Mitarbeiter</th>
                  {countColumns.map(({ key, label }) => <th scope="col" key={key} className="px-2 py-2 text-right">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {counts.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <td className="px-2 py-2">{LEAVE_DEPARTMENTS[row.department]}</td>
                    <th scope="row" className="px-2 py-2">{row.employee_name}</th>
                    {countColumns.map(({ key }) => (
                      <td key={key} className={`px-2 py-2 text-right tabular-nums ${key === "confirmed" ? "bg-slate-50 font-black" : ""}`}>{row.counts[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : !absences.length ? (
        <p className="p-3 text-sm">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead className="bg-slate-100">
              <tr>{["Bereich", "Mitarbeiter", "Status", "Tage"].map((label) =>
                <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr>
            </thead>
            <tbody>
              {absences.map((row) => (
                <tr key={row.key} className="border-b border-slate-200">
                  <td className="px-3 py-2">{LEAVE_DEPARTMENTS[row.department]}</td>
                  <th scope="row" className="px-3 py-2">{row.employee_name}</th>
                  <td className="px-3 py-2">{LEAVE_TYPES[row.status].label}</td>
                  <td className="px-3 py-2 tabular-nums">{row.days.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </dialog>
  );
}
