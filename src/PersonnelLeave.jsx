import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ClipboardPaste, Copy, FileText, FileUp, Maximize, Minimize, Trash2 } from "lucide-react";
import PersonnelLeaveReport, { previousLeaveWeek } from "./PersonnelLeaveReport.jsx";
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
const shortMonth = new Intl.DateTimeFormat("de-AT", { month: "short", timeZone: "UTC" });
const emptyRows = [];
const rowDivider = "border-b border-b-slate-400/70";
const selectionOutline = { boxShadow: "inset 0 0 0 2px #0f172a, inset 0 0 0 3px #fff" };
const datesForEdit = (edit) => edit ? edit.dates ?? leaveDaysBetween(edit.from, edit.to) : emptyRows;
const calendarYears = [2026, 2027];
const nameWidth = 160;
const dateOverscan = 6;
const calendarDays = calendarYears.flatMap((year) =>
  Array.from({ length: 12 }, (_, month) => leaveMonthDays(year, month)).flat()
).map((day) => {
  const date = new Date(day);
  const dayOfWeek = date.getUTCDay();
  const startsMonth = date.getUTCDate() === 1;
  return {
    day,
    monthKey: day.slice(0, 7),
    label: startsMonth ? shortMonth.format(date) : weekday.format(date),
    holiday: austrianHoliday(day),
    weekend: dayOfWeek === 0 || dayOfWeek === 6,
    divider: (dayOfWeek === 0 ? "border-r-2 border-r-slate-500" : "border-r border-r-slate-300")
      + (startsMonth ? " border-l-2 border-l-blue-500" : ""),
  };
});
const calendarDayIndex = new Map(calendarDays.map(({ day }, index) => [day, index]));
const firstDayOfMonth = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}-01`;

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

export function useLeaveRows(client, userId, from, to, revision, autoRefresh = true) {
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
    const interval = autoRefresh ? window.setInterval(refresh, 15000) : null;
    if (autoRefresh) window.addEventListener("focus", refresh);
    return () => {
      active = false;
      if (interval !== null) window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [client, key, from, to, autoRefresh]);
  return snapshot?.key === key && key ? snapshot : { rows: emptyRows, state: key ? "loading" : "idle" };
}

export default function PersonnelLeave({
  client, access, employeesByDept, removedEmployees = emptyRows, directoryReady = true, onRemoveEmployee,
  today, revision, onChange, portalHref,
}) {
  const [firstVisible, setFirstVisible] = useState(() => {
    const year = Math.max(calendarYears[0], Math.min(calendarYears.at(-1), Number(today.slice(0, 4))));
    return calendarDayIndex.get(`${year}-${today.slice(5, 7)}-01`) ?? 0;
  });
  const monthKey = calendarDays[firstVisible].monthKey;
  const year = monthKey.slice(0, 4);
  const month = Number(monthKey.slice(5)) - 1;
  const [frameDays, setFrameDays] = useState(() => leaveMonthDays(Number(year), month).length);
  const scrollAnchor = useRef(firstVisible);
  const columnWidth = useRef(22);
  const [department, setDepartment] = useState("all");
  const [onlyWithLeave, setOnlyWithLeave] = useState(false);
  const [edit, setEdit] = useState(null);
  const [copiedSelection, setCopiedSelection] = useState(null);
  const [dragRange, setDragRange] = useState(null);
  const dragRef = useRef(null);
  const scrollFrame = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reportRange, setReportRange] = useState(null);
  const [calendarHeight, setCalendarHeight] = useState(null);
  const [calendarWidth, setCalendarWidth] = useState(0);
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const calendarSection = useRef(null);
  const calendar = useRef(null);
  const dayWidth = Math.max(22, Math.floor((calendarWidth - nameWidth) / frameDays));
  const visibleCount = calendarWidth > nameWidth ? Math.max(1, Math.floor((calendarWidth - nameWidth) / dayWidth)) : frameDays;
  const lastVisible = Math.min(calendarDays.length - 1, firstVisible + visibleCount - 1);
  const lastMonthKey = calendarDays[lastVisible].monthKey;
  const renderStart = Math.max(0, firstVisible - dateOverscan);
  const renderEnd = Math.min(calendarDays.length, lastVisible + dateOverscan + 1);
  const days = calendarDays.slice(renderStart, renderEnd);
  const userId = access.state === "allowed" ? access.userId : null;
  const copiedDays = copiedSelection && copiedSelection.userId === userId ? copiedSelection.days : null;
  const data = useLeaveRows(client, userId, calendarDays[0].day, calendarDays.at(-1).day, revision);
  const reportData = useLeaveRows(client, reportRange ? userId : null, reportRange?.from, reportRange?.to,
    `${revision}:${reportRange?.request ?? 0}`, false);
  const loadReportRange = (range) => setReportRange((prev) => ({ ...range, request: (prev?.request ?? 0) + 1 }));
  useLayoutEffect(() => {
    const container = calendar.current;
    if (!container) return;
    const measure = () => {
      const gridTop = container.getBoundingClientRect().top + (document.fullscreenElement ? 0 : window.scrollY);
      setCalendarHeight(Math.max(180, Math.floor(window.innerHeight - gridTop - 20)));
      setCalendarWidth(container.clientWidth);
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(container.parentElement);
    observer?.observe(container);
    window.addEventListener("resize", measure);
    document.addEventListener("fullscreenchange", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", measure);
    };
  }, [data.state, access.state]);
  const syncScroll = (container) => {
    const position = Math.max(0, container.scrollLeft / columnWidth.current);
    scrollAnchor.current = position;
    setFirstVisible(Math.min(calendarDays.length - 1, Math.floor(position + 0.0001)));
  };
  useLayoutEffect(() => {
    const container = calendar.current;
    if (!container) return;
    columnWidth.current = dayWidth;
    container.scrollLeft = Math.round(scrollAnchor.current * dayWidth);
    syncScroll(container);
  }, [data.state, dayWidth, frameDays]);
  useEffect(() => () => {
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
  }, []);
  const jumpToMonth = (nextYear, nextMonth) => {
    const anchor = calendarDayIndex.get(firstDayOfMonth(nextYear, nextMonth));
    if (anchor === undefined) return;
    const frame = leaveMonthDays(Number(nextYear), nextMonth).length;
    scrollAnchor.current = anchor;
    setFirstVisible(anchor);
    setEdit(null);
    if (frame !== frameDays) setFrameDays(frame);
    else if (calendar.current) {
      calendar.current.scrollLeft = anchor * columnWidth.current;
      syncScroll(calendar.current);
    }
  };
  useEffect(() => {
    const updateFullscreen = () => setCalendarFullscreen(document.fullscreenElement === calendarSection.current && !!calendarSection.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);
  const directory = useMemo(() => Object.entries(LEAVE_DEPARTMENTS).flatMap(([dept]) => (employeesByDept[dept] || [])
    .map(({ name }) => ({ department: dept, employee_name: name }))), [employeesByDept]);
  const identities = useMemo(() => new Set(directory.map((row) => leaveIdentity(row.department, row.employee_name))), [directory]);
  const removedIdentities = useMemo(() => new Set(removedEmployees.map((row) => leaveIdentity(row.department, row.employee_name))), [removedEmployees]);
  const grid = useMemo(() => {
    const employees = new Map();
    const statuses = new Map();
    for (const row of [...directory, ...removedEmployees, ...data.rows]) {
      const id = leaveIdentity(row.department, row.employee_name);
      employees.set(id, { department: row.department, employee_name: row.employee_name });
      if (row.day) {
        if (!statuses.has(id)) statuses.set(id, new Map());
        statuses.get(id).set(row.day, row.status);
      }
    }
    return { employees, statuses };
  }, [directory, removedEmployees, data.rows]);
  const visibleEmployees = useMemo(() => [...grid.employees.entries()].filter(([id, person]) => {
    if (department !== "all" && department !== person.department) return false;
    if (id === edit?.id || id === dragRange?.id || (!onlyWithLeave && (identities.has(id) || removedIdentities.has(id)))) return true;
    for (const day of grid.statuses.get(id)?.keys() || []) {
      const key = day.slice(0, 7);
      if (key >= monthKey && key <= lastMonthKey) return true;
    }
    return false;
  }), [grid, identities, removedIdentities, department, onlyWithLeave, monthKey, lastMonthKey, edit?.id, dragRange?.id]);
  const groupCount = department === "all" ? 2 : 1;
  const rowHeight = calendarHeight === null ? 16
    : Math.max(12, Math.min(18, Math.floor((calendarHeight - 34) / (visibleEmployees.length + groupCount))));

  const selectedDates = useMemo(() => new Set(datesForEdit(edit)), [edit]);
  const nonContiguous = edit?.dates && selectedDates.size !== leaveDaysBetween(edit.from, edit.to).length;
  const result = (message, error = false) => setNotice({ message, error });
  const toggleCalendarFullscreen = async () => {
    try {
      if (calendarFullscreen) await document.exitFullscreen();
      else await calendarSection.current.requestFullscreen();
    } catch {
      result("Vollbild konnte nicht geöffnet werden.", true);
    }
  };
  const selectDays = (personId, from, to, toggleSingle = false) => {
    const person = grid.employees.get(personId);
    if (!person) return;
    const firstDay = from < to ? from : to;
    const lastDay = from < to ? to : from;
    setNotice(null);
    setEdit((prev) => {
      const samePerson = prev?.id === personId;
      const dates = new Set(samePerson ? datesForEdit(prev) : []);
      if (toggleSingle && dates.has(from)) dates.delete(from);
      else leaveDaysBetween(firstDay, lastDay).forEach((day) => dates.add(day));
      if (!dates.size) return null;
      const sorted = [...dates].sort();
      return {
        ...person,
        id: personId,
        dates: sorted,
        from: sorted[0],
        to: sorted.at(-1),
        status: samePerson ? prev.status : grid.statuses.get(personId)?.get(from) || "urlaub",
      };
    });
  };

  const startDayDrag = (event) => {
    if (busy || event.button !== 0 || !event.isPrimary || event.pointerType === "touch") return;
    const cell = event.target.closest("button[data-leave-day]");
    if (!cell || cell.disabled) return;
    const { leavePerson: id, leaveDay: from } = cell.dataset;
    dragRef.current = {
      id, from, to: from, pointerId: event.pointerId, moved: false,
      x: event.clientX, startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollFrame.current = window.requestAnimationFrame(autoScrollDrag);
  };

  const dragBounds = (container) => {
    const firstColumn = container.getBoundingClientRect().left + container.clientLeft;
    return { left: firstColumn + nameWidth, right: firstColumn + container.clientWidth };
  };

  const updateDragTarget = (drag, container) => {
    const { left, right } = dragBounds(container);
    if (right <= left) return;
    const offset = Math.max(0, Math.min(drag.x - left, right - left - 1));
    const index = Math.floor((container.scrollLeft + offset) / columnWidth.current);
    const origin = calendarDayIndex.get(drag.from);
    const bounded = Math.max(0, origin - 365, Math.min(index, origin + 365, calendarDays.length - 1));
    const day = calendarDays[bounded].day;
    if (drag.to === day) return;
    drag.to = day;
    drag.moved = true;
    setDragRange({ id: drag.id, from: drag.from < day ? drag.from : day, to: drag.from < day ? day : drag.from });
  };

  function autoScrollDrag() {
    const drag = dragRef.current;
    const container = calendar.current;
    if (!drag || !container) {
      scrollFrame.current = null;
      return;
    }
    if (Math.abs(drag.x - drag.startX) > 3 || drag.moved) {
      const { left, right } = dragBounds(container);
      const edge = Math.min(40, (right - left) / 4);
      const rightPressure = drag.x - (right - edge);
      const leftPressure = left + edge - drag.x;
      if (rightPressure > 0 || leftPressure > 0) {
        const pressure = rightPressure > 0 ? rightPressure : leftPressure;
        container.scrollLeft += (rightPressure > 0 ? 1 : -1) * Math.min(16, Math.ceil(pressure / 3));
        updateDragTarget(drag, container);
      }
    }
    scrollFrame.current = window.requestAnimationFrame(autoScrollDrag);
  }

  const moveDayDrag = (event) => {
    const drag = dragRef.current;
    const container = calendar.current;
    if (!drag || drag.pointerId !== event.pointerId || !container) return;
    drag.x = event.clientX;
    updateDragTarget(drag, container);
  };

  const finishDayDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    setDragRange(null);
    if (event.type === "pointerup" && !busy) {
      calendar.current?.focus({ preventScroll: true });
      selectDays(drag.id, drag.from, drag.to, !drag.moved);
    }
  };

  const persistRange = async (status) => {
    if (!edit || busy || data.state !== "ready") return;
    const range = datesForEdit(edit);
    if (!range.length || range.length > 366) return result("Bitte höchstens 366 gültige Tage auswählen.", true);
    if (!status && !window.confirm(`Abwesenheitseinträge für ${edit.employee_name} an den ausgewählten Tagen entfernen?`)) return;
    setBusy(true);
    try {
      const { error } = status
        ? await client.from(table).upsert(range.map((day) => ({
          department: edit.department, employee_name: edit.employee_name, day, status,
        })), { onConflict: "day,department,employee_name" })
        : await client.from(table).delete().eq("department", edit.department).eq("employee_name", edit.employee_name)
          .in("day", range);
      if (error) throw error;
      onChange();
      setEdit(null);
      result(status ? "Gespeichert." : "Markierte Einträge entfernt.");
    } catch {
      result("Nicht gespeichert. Bitte Zugriff oder Verbindung prüfen.", true);
    } finally {
      setBusy(false);
    }
  };

  const saveRange = (event) => {
    event.preventDefault();
    persistRange(edit?.status);
  };

  const copyDays = () => {
    if (!edit || busy || data.state !== "ready") return;
    const start = calendarDayIndex.get(edit.from);
    const end = calendarDayIndex.get(edit.to);
    if (start === undefined || end === undefined || end < start || end - start >= 366) {
      return result("Bitte einen gültigen Zeitraum zum Kopieren wählen.", true);
    }
    const statuses = grid.statuses.get(edit.id);
    const pattern = calendarDays.slice(start, end + 1)
      .map(({ day }) => selectedDates.has(day) ? statuses?.get(day) || null : null);
    const count = pattern.filter(Boolean).length;
    if (!count) return result("In der Auswahl sind keine Einträge zum Kopieren.", true);
    setCopiedSelection({ userId, days: pattern });
    calendar.current?.focus({ preventScroll: true });
    setEdit(null);
    result(count === 1 ? "1 Eintrag kopiert." : `${count} Einträge kopiert.`);
  };

  const pasteDays = async () => {
    if (!edit || busy || data.state !== "ready") return;
    if (!copiedDays) return result("Bitte zuerst Einträge in der Urlaubsliste kopieren.", true);
    const start = calendarDayIndex.get(edit.from);
    const end = start + copiedDays.length - 1;
    if (start === undefined || end >= calendarDays.length) return result("Die kopierten Tage passen nicht in den Kalender.", true);
    if (selectedDates.size > 1 && (nonContiguous || selectedDates.size < copiedDays.length)) {
      return result("Bitte den ersten Zieltag oder einen ausreichend langen Zeitraum auswählen.", true);
    }
    const destination = calendarDays.slice(start, end + 1);
    const entries = destination.flatMap(({ day }, index) => copiedDays[index]
      ? [{ day, status: copiedDays[index], department: edit.department, employee_name: edit.employee_name }] : []);
    setBusy(true);
    try {
      const { data: occupied, error: checkError } = await client.from(table).select("day")
        .eq("department", edit.department).eq("employee_name", edit.employee_name)
        .gte("day", destination[0].day).lte("day", destination.at(-1).day)
        .order("day").range(0, 0);
      if (checkError) throw checkError;
      if (occupied.length) return result("Der Zielzeitraum ist nicht leer. Bestehende Einträge bleiben unverändert.", true);
      const { count, error } = await client.from(table).upsert(entries, {
        onConflict: "day,department,employee_name", ignoreDuplicates: true, count: "exact",
      });
      if (error) throw error;
      onChange();
      setEdit(null);
      if (count != null && count !== entries.length) {
        result(`${count} von ${entries.length} Einträgen eingefügt. Inzwischen belegte Tage blieben unverändert.`, true);
      } else {
        result(entries.length === 1 ? "1 Eintrag eingefügt." : `${entries.length} Einträge eingefügt.`);
      }
    } catch {
      result("Einträge konnten nicht eingefügt werden. Bitte Zugriff oder Verbindung prüfen.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleCalendarShortcut = (event) => {
    if (!edit || event.defaultPrevented || event.altKey || event.shiftKey
      || event.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
    const key = event.key.toLowerCase();
    const command = event.ctrlKey || event.metaKey;
    const remove = key === "delete" && !command;
    if (!remove && !(command && (key === "c" || key === "v"))) return;
    event.preventDefault();
    if (event.repeat) return;
    if (remove) persistRange("");
    else if (key === "c") copyDays();
    else pasteDays();
  };

  const removeEmployee = async (id, person) => {
    if (busy || !directoryReady || identities.has(id) || !onRemoveEmployee) return;
    if (!window.confirm(`${person.employee_name} aus der Urlaubsliste löschen? Alle Abwesenheitseinträge dieser Person in ${LEAVE_DEPARTMENTS[person.department]} werden dauerhaft gelöscht.`)) return;
    setBusy(true);
    try {
      const { error } = await client.from(table).delete()
        .eq("department", person.department).eq("employee_name", person.employee_name);
      if (error) throw error;
      onRemoveEmployee(person);
      onChange();
      if (edit?.id === id) setEdit(null);
      result("Mitarbeiter aus der Urlaubsliste gelöscht.");
    } catch {
      result("Mitarbeiter konnte nicht gelöscht werden. Bitte Zugriff oder Verbindung prüfen.", true);
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
    <section ref={calendarSection} aria-label="Urlaubsliste" className={`space-y-2 ${calendarFullscreen ? "overflow-auto bg-slate-50 p-2" : ""}`}>
      <header className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
        <h2 className="mr-auto text-xl font-black">Urlaubsliste</h2>
        <select aria-label="Jahr" className={control} disabled={busy} value={year} onChange={(event) => jumpToMonth(event.target.value, month)}>
          {calendarYears.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Monat" className={control} disabled={busy} value={month} onChange={(event) => jumpToMonth(year, Number(event.target.value))}>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index} value={index}>{monthLabel.format(new Date(Date.UTC(2026, index, 1)))}</option>
          ))}
        </select>
        <select aria-label="Bereich" className={control} disabled={busy} value={department} onChange={(event) => { setDepartment(event.target.value); setEdit(null); }}>
          <option value="all">Beide Bereiche</option>
          {Object.entries(LEAVE_DEPARTMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" disabled={busy} checked={onlyWithLeave} onChange={(event) => { setOnlyWithLeave(event.target.checked); setEdit(null); }} />
          Nur mit Eintrag
        </label>
        <label className={`relative inline-flex cursor-pointer items-center gap-2 ${control}`}>
          <FileUp size={16} aria-hidden="true" /> Excel importieren
          <input disabled={busy} type="file" accept=".xlsx" multiple className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={openImport} />
        </label>
        <button type="button" disabled={busy} className={`inline-flex items-center gap-2 font-bold ${control}`}
          onClick={() => loadReportRange(previousLeaveWeek())}>
          <FileText size={16} aria-hidden="true" /> Wochenbericht
        </button>
        {document.fullscreenEnabled && (
          <button type="button" className="grid size-8 place-items-center rounded-md border border-slate-300 bg-white"
            aria-label={calendarFullscreen ? "Vollbild verlassen" : "Urlaubsliste im Vollbild"}
            title={calendarFullscreen ? "Vollbild verlassen" : "Urlaubsliste im Vollbild"}
            onClick={toggleCalendarFullscreen}>
            {calendarFullscreen ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
          </button>
        )}
      </header>
      {reportRange && <PersonnelLeaveReport range={reportRange} data={reportData} directory={directory}
        onChangeRange={loadReportRange} onClose={() => setReportRange(null)} />}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {Object.entries(LEAVE_TYPES).map(([key, type]) => (
          <span className={`rounded px-2 py-1 font-bold ${type.classes}`} key={key}>{type.short} · {type.label}</span>
        ))}
        <span className="rounded bg-yellow-300 px-2 py-1 font-bold text-yellow-950">Feiertag</span>
      </div>
      {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm font-bold text-red-700" : "text-sm font-bold text-emerald-800"}>{notice.message}</p>}
      {edit && (
        <form className="flex flex-wrap items-end gap-2 border-y bg-white p-3" onSubmit={saveRange} onKeyDown={handleCalendarShortcut}>
          <strong className="mr-auto self-center text-sm">
            {edit.employee_name} · {LEAVE_DEPARTMENTS[edit.department]} · {selectedDates.size} {selectedDates.size === 1 ? "Tag" : "Tage"}
          </strong>
          <label className="grid gap-1 text-xs">Von<input className={control} disabled={busy || nonContiguous} required type="date" value={nonContiguous ? "" : edit.from} onChange={(e) => setEdit({ ...edit, dates: null, from: e.target.value })} /></label>
          <label className="grid gap-1 text-xs">Bis<input className={control} disabled={busy || nonContiguous} required type="date" value={nonContiguous ? "" : edit.to} onChange={(e) => setEdit({ ...edit, dates: null, to: e.target.value })} /></label>
          <label className="grid gap-1 text-xs">Status<select aria-label="Status" className={control} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
            <option value="">Kein Eintrag</option>
            {Object.entries(LEAVE_TYPES).map(([key, type]) => <option value={key} key={key}>{type.label}</option>)}
          </select></label>
          <button type="button" className={`inline-flex items-center gap-1.5 disabled:opacity-50 ${control}`}
            onClick={copyDays} disabled={busy || data.state !== "ready"} aria-keyshortcuts="Control+C Meta+C">
            <Copy size={15} aria-hidden="true" /> Kopieren
          </button>
          <button type="button" className={`inline-flex items-center gap-1.5 disabled:opacity-50 ${control}`}
            onClick={pasteDays} disabled={busy || data.state !== "ready" || !copiedDays} aria-keyshortcuts="Control+V Meta+V">
            <ClipboardPaste size={15} aria-hidden="true" /> Einfügen
          </button>
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
        <div ref={calendar} className="overflow-auto border border-slate-300 bg-white" tabIndex={0} aria-label="Kalenderraster" aria-keyshortcuts="Delete"
          onKeyDown={handleCalendarShortcut}
          onScroll={(event) => {
            syncScroll(event.currentTarget);
            if (dragRef.current) updateDragTarget(dragRef.current, event.currentTarget);
          }}
          style={{ maxHeight: calendarHeight ?? "70vh", "--leave-row-height": `${rowHeight}px`, "--leave-cell-height": `${rowHeight - 1}px` }}>
          <table
            className="table-fixed select-none border-separate border-spacing-0 text-[11px] leading-none"
            style={{ width: nameWidth + calendarDays.length * dayWidth }}
            onPointerDown={startDayDrag}
            onPointerMove={moveDayDrag}
            onPointerUp={finishDayDrag}
            onPointerCancel={finishDayDrag}
            onLostPointerCapture={finishDayDrag}
          >
            <colgroup>
              <col style={{ width: nameWidth }} />
              {renderStart > 0 && <col style={{ width: renderStart * dayWidth }} />}
              {days.map(({ day }) => <col key={day} style={{ width: dayWidth }} />)}
              {renderEnd < calendarDays.length && <col style={{ width: (calendarDays.length - renderEnd) * dayWidth }} />}
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr>
                <th className={`sticky left-0 z-10 border-r bg-slate-100 px-2 py-1 text-left ${rowDivider}`} scope="col">Mitarbeiter</th>
                {renderStart > 0 && <th aria-hidden="true" className={`bg-slate-100 ${rowDivider}`} />}
                {days.map(({ day, label, holiday, weekend, divider }) => (
                  <th key={day} title={holiday || day} scope="col" data-calendar-day={day} className={`py-1 text-center ${rowDivider} ${divider} ${holiday ? "bg-yellow-300 text-yellow-950" : weekend ? "bg-slate-200" : "bg-slate-100"}`}>
                    <div>{day.slice(8)}</div><div className="text-[10px] font-medium">{label}</div>
                  </th>
                ))}
                {renderEnd < calendarDays.length && <th aria-hidden="true" className={`bg-slate-100 ${rowDivider}`} />}
              </tr>
            </thead>
            <tbody>
              {Object.entries(LEAVE_DEPARTMENTS).filter(([key]) => department === "all" || department === key).map(([key, label]) => (
                <React.Fragment key={key}>
                  <tr className="h-6 md:h-[var(--leave-row-height)]"><th scope="rowgroup" className={`sticky left-0 bg-slate-200 px-2 py-0 text-left ${rowDivider}`}>{label}</th>
                    {renderStart > 0 && <td aria-hidden="true" className={`bg-slate-200 p-0 ${rowDivider}`} />}
                    {days.map(({ day, holiday, divider }) => (
                      <td key={day} className={`p-0 ${rowDivider} ${divider} ${holiday ? "bg-yellow-200" : "bg-slate-200"}`} />
                    ))}
                    {renderEnd < calendarDays.length && <td aria-hidden="true" className={`bg-slate-200 p-0 ${rowDivider}`} />}
                  </tr>
                  {visibleEmployees.filter(([, row]) => row.department === key).sort((a, b) => sortNames(a[1], b[1])).map(([id, row]) => {
                    const inactive = directoryReady && !identities.has(id);
                    return <tr key={id} className="h-6 md:h-[var(--leave-row-height)]">
                      <th scope="row" aria-label={row.employee_name} className={`sticky left-0 z-10 border-r bg-white px-2 py-0 text-left ${rowDivider}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span title={inactive ? `${row.employee_name} (nicht im Mitarbeiterstamm)` : row.employee_name}
                            className={`truncate ${inactive ? "text-slate-600 line-through" : ""}`}>{row.employee_name}</span>
                          {inactive && onRemoveEmployee && (
                            <button type="button" disabled={busy} className="grid h-6 w-5 shrink-0 place-items-center text-slate-600 hover:bg-red-50 hover:text-red-700 md:h-[var(--leave-cell-height)]"
                              aria-label={`${row.employee_name} aus der Urlaubsliste löschen`} title="Aus Urlaubsliste löschen"
                              onClick={() => removeEmployee(id, row)}>
                              <Trash2 size={11} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </th>
                      {renderStart > 0 && <td aria-hidden="true" className={`p-0 ${rowDivider}`} />}
                      {days.map(({ day, holiday, weekend, divider }) => {
                        const status = grid.statuses.get(id)?.get(day);
                        const type = LEAVE_TYPES[status];
                        const selected = (edit?.id === id && selectedDates.has(day))
                          || (dragRange?.id === id && day >= dragRange.from && day <= dragRange.to);
                        const labelText = `${row.employee_name} · ${day} · ${type?.label || holiday || "Kein Eintrag"}`;
                        return <td className={`p-0 ${rowDivider} ${divider}`} key={day}>
                          <button type="button" disabled={busy} aria-label={labelText} aria-pressed={selected} title={labelText}
                            data-leave-day={day} data-leave-person={id}
                            style={selected ? selectionOutline : undefined}
                            className={`block h-[23px] w-full font-black hover:ring-2 hover:ring-inset hover:ring-blue-500 md:h-[var(--leave-cell-height)] ${type?.classes || (holiday ? "bg-yellow-100" : weekend ? "bg-slate-50" : "")}`}
                            onClick={(event) => {
                              if (event.detail === 0 || event.nativeEvent.pointerType === "touch") selectDays(id, day, day, true);
                            }}
                          >{type?.short ?? ""}</button>
                        </td>;
                      })}
                      {renderEnd < calendarDays.length && <td aria-hidden="true" className={`p-0 ${rowDivider}`} />}
                    </tr>;
                  })}
                </React.Fragment>
              ))}
              {!visibleEmployees.length && <tr><td colSpan={days.length + 1 + Number(renderStart > 0) + Number(renderEnd < calendarDays.length)} className="p-3 text-slate-500">
                <span className="sticky left-3">Keine Einträge in dieser Auswahl.</span>
              </td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
