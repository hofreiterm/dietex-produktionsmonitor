import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { LEAVE_DEPARTMENTS, LEAVE_TYPES } from "./personnel-leave.js";

const partsInVienna = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" });
const displayDate = new Intl.DateTimeFormat("de-AT", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const displayDay = new Intl.DateTimeFormat("de-AT", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const reportStatuses = ["urlaub", "za", "krank", "sonstiges"];

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

function groupAbsences(rows) {
  const groups = new Map();
  for (const { department, employee_name, status, day } of rows) {
    if (!reportStatuses.includes(status) || !Object.hasOwn(LEAVE_DEPARTMENTS, department)) continue;
    const key = JSON.stringify([department, employee_name, status]);
    if (!groups.has(key)) groups.set(key, { key, department, employee_name, status, dates: new Set() });
    groups.get(key).dates.add(day);
  }
  return [...groups.values()].sort((a, b) =>
    b.department.localeCompare(a.department) || a.employee_name.localeCompare(b.employee_name, "de-AT")
    || reportStatuses.indexOf(a.status) - reportStatuses.indexOf(b.status)
  ).map(({ dates, ...row }) => ({
    ...row,
    days: [...dates].sort().map((day) => displayDay.format(new Date(day))).join(", "),
  }));
}

function downloadReport(week, period, rows) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const canvas = document.createElement("canvas");
  canvas.width = 1120;
  canvas.height = 1584;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const columns = [{ label: "Bereich", x: 66, width: 131 }, { label: "Mitarbeiter", x: 210, width: 244 },
    { label: "Status", x: 468, width: 226 }, { label: "Tage", x: 707, width: 350 }];
  const rowsPerPage = 32;
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  for (let page = 0; page < pageCount; page++) {
    if (page) pdf.addPage();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillText("DieTex Wochenbericht", 58, 86);
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText(period, 58, 122);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(58, 153, 1004, 40);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 19px Arial, sans-serif";
    columns.forEach(({ label, x }) => ctx.fillText(label, x, 180));
    ctx.font = "19px Arial, sans-serif";
    if (!rows.length) ctx.fillText("Keine bestätigten Abwesenheiten in dieser Woche.", 66, 228);
    rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).forEach((row, i) => {
      const y = 193 + i * 40;
      ctx.fillStyle = i % 2 ? "#f8fafc" : "#ffffff";
      ctx.fillRect(58, y, 1004, 40);
      ctx.fillStyle = "#0f172a";
      const values = [LEAVE_DEPARTMENTS[row.department], row.employee_name, LEAVE_TYPES[row.status].label, row.days];
      columns.forEach(({ x, width }, col) => ctx.fillText(values[col], x, y + 26, width));
    });
    ctx.fillStyle = "#475569";
    ctx.font = "18px Arial, sans-serif";
    ctx.fillText(`Seite ${page + 1} von ${pageCount}`, 58, 1532);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  }
  pdf.save(`dietex-wochenbericht-${week.from}.pdf`);
}

export default function PersonnelLeaveReport({ week, data, onClose }) {
  const dialog = useRef(null);
  const [exportError, setExportError] = useState(false);
  const absences = useMemo(() => groupAbsences(data.rows), [data.rows]);
  const period = `${displayDate.format(new Date(week.from))} - ${displayDate.format(new Date(week.to))}`;
  useEffect(() => { dialog.current?.showModal(); }, []);

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="leave-report-title"
      className="max-h-[88dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-lg border border-slate-300 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-white p-3">
        <div className="mr-auto">
          <h2 id="leave-report-title" className="text-lg font-black">Wochenbericht</h2>
          <p className="text-sm text-slate-600">{period}</p>
        </div>
        <button type="button" disabled={data.state !== "ready"} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-bold disabled:opacity-50"
          onClick={() => {
            try { downloadReport(week, period, absences); setExportError(false); }
            catch { setExportError(true); }
          }}>
          <Download size={16} aria-hidden="true" /> PDF herunterladen
        </button>
        <button type="button" aria-label="Wochenbericht schließen" title="Schließen" className="grid size-8 place-items-center rounded-md border border-slate-300"
          onClick={() => dialog.current?.close()}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      {exportError && <p role="alert" className="px-3 pt-3 text-sm text-red-700">PDF konnte nicht erstellt werden.</p>}
      {data.state !== "ready" ? (
        <p role="status" className="p-3 text-sm">{data.state === "error" ? "Bericht konnte nicht geladen werden." : "Bericht wird geladen…"}</p>
      ) : !absences.length ? (
        <p className="p-3 text-sm">Keine bestätigten Abwesenheiten in dieser Woche.</p>
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
                  <td className="px-3 py-2 tabular-nums">{row.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </dialog>
  );
}
