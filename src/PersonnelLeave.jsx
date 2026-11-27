import React, { useEffect, useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import {
  austrianHoliday, LEAVE_DEPARTMENTS, LEAVE_TYPES, leaveDaysBetween,
  leaveIdentity, leaveMonthDays, readLeaveWorkbook,
} from "./personnel-leave.js";

const table = "personnel_leave_days";
const sortNames = (a, b) => a.employee_name.localeCompare(b.employee_name, "de-AT");
const control = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
const action = "rounded-md bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const weekday = new Intl.DateTimeFormat("de-AT", { weekday: "short", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("de-AT", { month: "long", timeZone: "UTC" });
const emptyRows = [];

export function useLeaveAccess(client, enabled) {
  const [userId, setUserId] = useState(undefined);
  const [permission, setPermission] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => data.subscription.unsubscribe();
  }, [client, enabled]);
  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    client.from("personnel_leave_editors").select("user_id").eq("user_id", userId).maybeSingle()
      .then(({ data, error }) => {
        if (active) setPermission({ userId, state: error ? "setup" : data ? "allowed" : "denied" });
      });
    return () => { active = false; };
  }, [client, enabled, userId]);
  if (!enabled || userId === null) return { state: "signedOut" };
  return userId && permission?.userId === userId ? permission : { state: "loading" };
}

export function useLeaveRows(client, userId, from, to, revision) {
  const [snapshot, setSnapshot] = useState(null);
  const key = userId && from && to ? JSON.stringify([userId, from, to, revision]) : null;
  useEffect(() => {
    if (!key) {
      setSnapshot(null);
      return;
    }
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      const rows = [];
      try {
        for (let offset = 0; active; offset += 500) {
          const { data, error } = await client.from(table).select("day,department,employee_name,status")
            .gte("day", from).lte("day", to).order("day").order("department").order("employee_name")
            .range(offset, offset + 499);
          if (error) throw error;
          rows.push(...data);
          if (data.length < 500) break;
        }
        if (active) setSnapshot({ key, rows, state: "ready" });
      } catch {
        if (active) setSnapshot({ key, rows: [], state: "error" });
      } finally {
        loading = false;
      }
    };
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [client, key, from, to]);
  return snapshot?.key === key && key ? snapshot : { rows: emptyRows, state: key ? "loading" : "idle" };
}

export default function PersonnelLeave({ client, access, employeesByDept, today, revision, onChange, portalHref }) {
  const [year, setYear] = useState(() => String(Math.max(2026, Math.min(2027, Number(today.slice(0, 4))))));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [department, setDepartment] = useState("all");
  const [onlyWithLeave, setOnlyWithLeave] = useState(false);
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const days = useMemo(() => leaveMonthDays(Number(year), month), [year, month]);
  const data = useLeaveRows(client, access.state === "allowed" ? access.userId : null, days[0], days.at(-1), revision);
  const directory = useMemo(() => Object.entries(LEAVE_DEPARTMENTS).flatMap(([dept]) => (employeesByDept[dept] || [])
    .map(({ name }) => ({ department: dept, employee_name: name }))), [employeesByDept]);
  const identities = useMemo(() => new Set(directory.map((row) => leaveIdentity(row.department, row.employee_name))), [directory]);
  const grid = useMemo(() => {
    const employees = new Map();
    const statuses = new Map();
    for (const row of [...directory, ...data.rows]) {
      const id = leaveIdentity(row.department, row.employee_name);
      employees.set(id, { department: row.department, employee_name: row.employee_name });
      if (row.day) {
        if (!statuses.has(id)) statuses.set(id, new Map());
        statuses.get(id).set(row.day, row.status);
      }
    }
    return {
      employees: [...employees.entries()].filter(([id, row]) =>
        (department === "all" || department === row.department) && (!onlyWithLeave || statuses.has(id))),
      statuses,
    };
  }, [directory, data.rows, department, onlyWithLeave]);

  const result = (message, error = false) => setNotice({ message, error });
  const saveRange = async (event) => {
    event.preventDefault();
    const range = leaveDaysBetween(edit.from, edit.to);
    if (!range.length) return result("Bitte einen gültigen Zeitraum von höchstens 366 Tagen wählen.", true);
    if (!edit.status && !window.confirm("Abwesenheiten für diesen Zeitraum entfernen?")) return;
    setBusy(true);
    try {
      const { error } = edit.status
        ? await client.from(table).upsert(range.map((day) => ({
          department: edit.department, employee_name: edit.employee_name, day, status: edit.status,
        })), { onConflict: "day,department,employee_name" })
        : await client.from(table).delete().eq("department", edit.department).eq("employee_name", edit.employee_name)
          .gte("day", edit.from).lte("day", edit.to);
      if (error) throw error;
      onChange();
      setEdit(null);
      result("Gespeichert.");
    } catch {
      result("Nicht gespeichert. Bitte Zugriff oder Verbindung prüfen.", true);
    } finally {
      setBusy(false);
    }
  };

  const openImport = async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    if (!files.length) return;
    setPreview(null);
    setNotice(null);
    setBusy(true);
    try {
      const parsed = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Die Excel-Datei ist größer als 5 MB.");
        parsed.push(readLeaveWorkbook(await file.arrayBuffer()));
      }
      const rows = parsed.flatMap((entry) => entry.rows);
      const unresolved = new Map();
      for (const row of rows) {
        const id = leaveIdentity(row.department, row.employee_name);
        if (!identities.has(id)) unresolved.set(id, row);
      }
      setPreview({
        rows, unresolved, mapped: {},
        years: [...new Set(parsed.flatMap((file) => file.years))].sort(),
        ambiguous: parsed.reduce((sum, file) => sum + file.ambiguous, 0),
      });
    } catch (error) {
      result(error.message || "Excel-Datei konnte nicht gelesen werden.", true);
    } finally {
      setBusy(false);
    }
  };

  const saveImport = async () => {
    const entries = new Map();
    for (const row of preview.rows) {
      const id = leaveIdentity(row.department, row.employee_name);
      const mapping = preview.mapped[id];
      if (preview.unresolved.has(id) && !mapping) return result("Bitte alle offenen Mitarbeiterzuordnungen prüfen.", true);
      const entry = { ...row, employee_name: mapping && mapping !== "original" ? JSON.parse(mapping)[1] : row.employee_name };
      const key = JSON.stringify([entry.day, entry.department, entry.employee_name]);
      if (entries.has(key) && entries.get(key).status !== entry.status) {
        return result("Für einen Mitarbeiter und Tag wurden unterschiedliche Einträge erkannt. Bitte die Zuordnung prüfen.", true);
      }
      entries.set(key, entry);
    }
    setBusy(true);
    try {
      const { count, error } = await client.from(table).upsert([...entries.values()], {
        onConflict: "day,department,employee_name", ignoreDuplicates: true, count: "exact",
      });
      if (error) throw error;
      onChange();
      setPreview(null);
      result(count == null ? "Import abgeschlossen. Vorhandene Einträge blieben unverändert."
        : `${count} neue Tagesmarkierungen übernommen. Vorhandene Einträge blieben unverändert.`);
    } catch {
      result("Import fehlgeschlagen. Bitte Zugriff oder Verbindung prüfen.", true);
    } finally {
      setBusy(false);
    }
  };

  if (access.state !== "allowed") return (
    <section className="border-b bg-white p-4">
      <h2 className="text-xl font-black">Urlaubsliste</h2>
      {access.state === "signedOut" ? <a className="text-sm font-bold text-blue-700 underline" href={portalHref}>Zur Personalplanung anmelden</a>
        : <p className="mt-1 text-sm">{{
          loading: "Zugriff wird geprüft…", denied: "Für dieses Konto ist die Urlaubsliste nicht freigegeben.",
          setup: "Die Urlaubsliste ist in Supabase noch nicht verfügbar.",
        }[access.state]}</p>}
    </section>
  );

  return (
    <section aria-label="Urlaubsliste" className="space-y-3">
      <header className="flex flex-wrap items-center gap-2 border-b bg-white p-3">
        <h2 className="mr-auto text-xl font-black">Urlaubsliste</h2>
        <select aria-label="Jahr" className={control} value={year} onChange={(event) => { setYear(event.target.value); setEdit(null); }}>
          <option>2026</option><option>2027</option>
        </select>
        <select aria-label="Monat" className={control} value={month} onChange={(event) => { setMonth(Number(event.target.value)); setEdit(null); }}>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index} value={index}>{monthLabel.format(new Date(Date.UTC(2026, index, 1)))}</option>
          ))}
        </select>
        <select aria-label="Bereich" className={control} value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="all">Beide Bereiche</option>
          {Object.entries(LEAVE_DEPARTMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={onlyWithLeave} onChange={(event) => setOnlyWithLeave(event.target.checked)} />
          Nur mit Eintrag
        </label>
        <label className={`relative inline-flex cursor-pointer items-center gap-2 ${control}`}>
          <FileUp size={16} aria-hidden="true" /> Excel importieren
          <input disabled={busy} type="file" accept=".xlsx" multiple className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={openImport} />
        </label>
      </header>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {Object.entries(LEAVE_TYPES).map(([key, type]) => (
          <span className={`rounded px-2 py-1 font-bold ${type.classes}`} key={key}>{type.short} · {type.label}</span>
        ))}
        <span className="rounded bg-yellow-200 px-2 py-1 font-bold">Feiertag</span>
      </div>
      {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm font-bold text-red-700" : "text-sm font-bold text-emerald-800"}>{notice.message}</p>}
      {edit && (
        <form className="flex flex-wrap items-end gap-2 border-y bg-white p-3" onSubmit={saveRange}>
          <strong className="mr-auto self-center text-sm">{edit.employee_name} · {LEAVE_DEPARTMENTS[edit.department]}</strong>
          <label className="grid gap-1 text-xs">Von<input className={control} required type="date" value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value })} /></label>
          <label className="grid gap-1 text-xs">Bis<input className={control} required type="date" value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })} /></label>
          <label className="grid gap-1 text-xs">Status<select aria-label="Status" className={control} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
            <option value="">Kein Eintrag</option>
            {Object.entries(LEAVE_TYPES).map(([key, type]) => <option value={key} key={key}>{type.label}</option>)}
          </select></label>
          <button type="submit" className={action} disabled={busy}>Speichern</button>
          <button type="button" className={control} disabled={busy} onClick={() => setEdit(null)}>Abbrechen</button>
        </form>
      )}
      {preview && (
        <section aria-label="Importvorschau" className="space-y-2 border-y bg-white p-3">
          <h3 className="font-black">Importvorschau</h3>
          <p className="text-sm">{preview.years.map((y) => `${y}: ${preview.rows.filter((row) => row.day.startsWith(y)).length} Tagesmarkierungen`).join(" · ")}</p>
          {preview.ambiguous > 0 && <p className="text-sm font-bold text-amber-800">{preview.ambiguous} nicht eindeutige Zellen werden nicht übernommen.</p>}
          {preview.unresolved.size > 0 && (
            <div className="grid max-h-64 gap-1 overflow-y-auto">
              {[...preview.unresolved].map(([id, row]) => (
                <label key={id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-1 text-sm">
                  {row.employee_name} · {LEAVE_DEPARTMENTS[row.department]}
                  <select disabled={busy} className={control} value={preview.mapped[id] || ""} onChange={(event) => {
                    const value = event.target.value;
                    setPreview((prev) => ({ ...prev, mapped: { ...prev.mapped, [id]: value } }));
                  }}>
                    <option value="">Zuordnung wählen</option>
                    <option value="original">Als separaten Namen behalten</option>
                    {directory.filter((entry) => entry.department === row.department).sort(sortNames).map((entry) => {
                      const value = leaveIdentity(entry.department, entry.employee_name);
                      return <option key={value} value={value}>{entry.employee_name}</option>;
                    })}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={busy || !preview.rows.length} className={action} onClick={saveImport}>Einträge übernehmen</button>
            <button type="button" disabled={busy} className={control} onClick={() => setPreview(null)}>Schließen</button>
          </div>
        </section>
      )}
      {data.state !== "ready" ? <p role="status" className="p-3 text-sm">{data.state === "error" ? "Monatsliste konnte nicht geladen werden." : "Monatsliste wird geladen…"}</p> : (
        <div className="max-h-[70vh] overflow-auto border border-slate-300 bg-white">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-10 min-w-44 border-b border-r bg-slate-100 px-2 py-2 text-left" scope="col">Mitarbeiter</th>
                {days.map((day) => {
                  const value = new Date(day);
                  const holiday = austrianHoliday(day);
                  const weekend = [0, 6].includes(value.getUTCDay());
                  return <th key={day} title={holiday} scope="col" className={`min-w-8 border-b border-r px-1 py-1 text-center ${holiday ? "bg-yellow-200" : weekend ? "bg-slate-200" : "bg-slate-100"}`}>
                    <div>{day.slice(8)}</div><div className="text-[10px] font-medium">{weekday.format(value)}</div>
                  </th>;
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(LEAVE_DEPARTMENTS).filter(([key]) => department === "all" || department === key).map(([key, label]) => (
                <React.Fragment key={key}>
                  <tr><th scope="rowgroup" className="sticky left-0 border-b bg-slate-200 px-2 py-1.5 text-left">{label}</th>
                    <td colSpan={days.length} className="border-b bg-slate-200" /></tr>
                  {grid.employees.filter(([, row]) => row.department === key).sort((a, b) => sortNames(a[1], b[1])).map(([id, row]) => (
                    <tr key={id}>
                      <th scope="row" className="sticky left-0 z-10 border-b border-r bg-white px-2 py-1 text-left">{row.employee_name}</th>
                      {days.map((day) => {
                        const status = grid.statuses.get(id)?.get(day);
                        const type = LEAVE_TYPES[status];
                        const holiday = austrianHoliday(day);
                        const weekend = [0, 6].includes(new Date(day).getUTCDay());
                        const labelText = `${row.employee_name} · ${day} · ${type?.label || holiday || "Kein Eintrag"}`;
                        return <td className="border-b border-r p-0" key={day}>
                          <button type="button" disabled={busy} aria-label={labelText} title={labelText}
                            className={`h-7 w-full min-w-8 font-black hover:ring-2 hover:ring-inset hover:ring-blue-500 ${type?.classes || (holiday ? "bg-yellow-50" : weekend ? "bg-slate-50" : "")}`}
                            onClick={() => { setNotice(null); setEdit({ ...row, from: day, to: day, status: status || "urlaub" }); }}
                          >{type?.short ?? ""}</button>
                        </td>;
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {!grid.employees.length && <tr><td colSpan={days.length + 1} className="p-3 text-slate-500">Keine Einträge in dieser Auswahl.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
