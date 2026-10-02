import "./index.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import personnelFloorPlanUrl from "./assets/plan-waescherei-putzerei.jpg";

const supabase = createClient(
  "https://dkdusyigghttjxdpbofy.supabase.co",
  "sb_publishable_Mr55Ge_ud02QSvXwWj0hTg_EQa19pPs"
);

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "";
const PROTECTED_VIEWS = new Set(["stammdaten", "leitung", "personalplanung"]);

function isProtectedView(view) {
  return PROTECTED_VIEWS.has(view);
}

function isAdminSessionUnlocked() {
  try {
    return sessionStorage.getItem("dietexAdminUnlocked") === "1";
  } catch {
    return false;
  }
}

const CATEGORIES = {
  Bettwäsche: ["Deckenbezüge + Leintücher", "Polsterbezüge"],
  Frottee: ["Frottee", "Spannleintücher", "Bademäntel"],
  Tischwäsche: ["Tischtücher + Deckservietten", "Mundservietten"],
  Putzerei: ["Putzerei"],
};

const WASH_CATEGORIES = ["Bettwäsche", "Frottee", "Tischwäsche"];

const WASH_STREETS = [
  {
    key: "ws-1",
    name: "Waschstrasse 1",
    capacity: "25 kg",
    description: "Frottee, Spannleintuecher, Bademaentel",
    categories: ["Frottee"],
    className: "border-emerald-400 bg-emerald-50 text-emerald-950",
  },
  {
    key: "ws-2",
    name: "Waschstrasse 2",
    capacity: "50 kg",
    description: "Alles andere",
    categories: ["Bettwäsche", "Tischwäsche"],
    className: "border-blue-400 bg-blue-50 text-blue-950",
  },
];

const ALL_SUBCATEGORIES = [
  "Deckenbezüge + Leintücher",
  "Polsterbezüge",
  "Frottee",
  "Spannleintücher",
  "Bademäntel",
  "Tischtücher + Deckservietten",
  "Tischtücher + Deckservietten",
  "Mundservietten",
  "Putzerei",
];

const CAT_ICON = {
  Bettwäsche: "🛏️",
  Frottee: "🥋",
  Tischwäsche: "🍽️",
  Putzerei: "P",
};

const STATIONS = [
  { key: "jenway-kleinteile", name: "Jenway Kleinteile", items: ["Polsterbezüge", "Mundservietten", "Tischtücher", "Deckservietten", "Tischtücher + Deckservietten"] },
  { key: "jenway-grossteile", name: "Jenway Großteile", items: ["Deckenbezüge + Leintücher"] },
  { key: "jenway-frottee", name: "Jenway Frottee", items: ["Frottee"] },
  { key: "frottee-splt-bm", name: "Frottee SPLT + BM", items: ["Bademäntel", "Spannleintücher"] },
];

const ROWS = [1, 2, 3, 4, 5];
const PLACES = 10;

const PERSONNEL_SHIFTS = [
  { key: "07-12", label: "07:00–12:00" },
  { key: "12-15", label: "12:00–15:00" },
  { key: "15-schluss", label: "15:00–Schluss" },
];

const PERSONNEL_DAY_STRENGTHS = [
  { key: "schwach", label: "Schwach" },
  { key: "mittel", label: "Mittel" },
  { key: "stark", label: "Stark" },
];

const PERSONNEL_SECTIONS = [
  { name: "Übernahme", target: { default: 4 } },
  { name: "Waschstraßen", target: { default: 1 } },
  { name: "Waschmaschinen", target: { "07-12": 1, default: 0 } },
  { name: "Absortierung", target: { default: 2 } },
  { name: "Mangel 1", target: { default: 4 } },
  { name: "Mangel 2", target: { default: 4 } },
  { name: "Frottee 1", target: { default: 1 } },
  { name: "Frottee 2", target: { default: 1 } },
  { name: "BM + SPLT", target: { default: 1 } },
  { name: "Jenway Großteile", target: { default: 1 } },
  { name: "Jenway Kleinteile", target: { default: 1 } },
  { name: "Jenway Frottee", target: { default: 1 } },
  { name: "Poolwäsche", target: { default: 2 } },
  { name: "Expedit", target: { default: 1 } },
  { name: "Wäsche auspacken", target: { flexible: true } },
];


const PERSONNEL_GROUPS = [
  {
    name: "Schmutzwäsche",
    sections: ["Übernahme", "Waschstraßen", "Waschmaschinen"],
  },
  {
    name: "Finishbereich",
    sections: ["Absortierung", "Mangel 1", "Mangel 2", "Frottee 1", "Frottee 2", "BM + SPLT"],
  },
  {
    name: "Verpackung",
    sections: ["Jenway Großteile", "Jenway Kleinteile", "Jenway Frottee", "Poolwäsche", "Expedit"],
  },
];

const PERSONNEL_EMPLOYEES = [
  { name: "Janos", hours: 40 }, { name: "Arpi", hours: 40 }, { name: "Dida", hours: 40 },
  { name: "Laszlo", hours: 40 }, { name: "Mate", hours: 40 }, { name: "Milena", hours: 40 },
  { name: "Manu K.", hours: 40 }, { name: "Ibolya", hours: 30 }, { name: "Gabriella", hours: 20 },
  { name: "Olga", hours: 40 }, { name: "Attila", hours: 40 }, { name: "Ahmed", hours: 40 },
  { name: "Norbert", hours: 40 }, { name: "Carina", hours: 24 }, { name: "Krisztian", hours: 40 },
  { name: "Petra", hours: 40 }, { name: "Peter K.", hours: 40 }, { name: "Gabi", hours: 24 },
  { name: "Walid", hours: 40 }, { name: "Edina N.", hours: 30 }, { name: "Laszlo Chef", hours: "" },
  { name: "Edina", hours: 40 }, { name: "Kinga", hours: 20 }, { name: "Lumi", hours: 30 },
  { name: "Martina", hours: 30 }, { name: "Anita", hours: 40 }, { name: "Katalin", hours: 40 },
  { name: "Mari H.", hours: 12 }, { name: "Csaba", hours: 20 }, { name: "Barbara", hours: 20 },
  { name: "Renate", hours: 40 }, { name: "Margret", hours: 40 }, { name: "Nicole", hours: 20 },
  { name: "Brigitte", hours: 27 },
];


const PUTZEREI_SECTIONS = [
  { name: "Übernahme", target: { default: 1 } },
  { name: "Expedit", target: { default: 1 } },
  { name: "Kleinteile", target: { default: 3 } },
  { name: "Verpackung", target: { default: 1 } },
  { name: "Waschmaschinen", target: { default: 1 } },
  { name: "Reinigungsmaschinen", target: { default: 1 } },
  { name: "Tunnelfinisher", target: { default: 1 } },
  { name: "Hemden", target: { default: 2 } },
  { name: "Bügeln", target: { default: 5 } },
];

const PUTZEREI_GROUPS = [
  {
    name: "Putzerei",
    sections: PUTZEREI_SECTIONS.map((section) => section.name),
  },
];

function normalizePersonnelSections(sections, fallback) {
  const source = Array.isArray(sections) && sections.length ? sections : fallback;
  return source.map((section, index) => {
    const baseTarget = Object.fromEntries(PERSONNEL_SHIFTS.map((shift) => [
      shift.key,
      section.target?.[shift.key] ?? section.target?.default ?? (section.target?.flexible ? null : 0),
    ]));

    return {
      ...section,
      id: section.id || `section-${index}-${String(section.name || "abteilung").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      target: baseTarget,
      targetsByStrength: Object.fromEntries(PERSONNEL_DAY_STRENGTHS.map((strength) => [
        strength.key,
        Object.fromEntries(PERSONNEL_SHIFTS.map((shift) => [
          shift.key,
          section.targetsByStrength?.[strength.key]?.[shift.key] ?? baseTarget[shift.key],
        ])),
      ])),
    };
  });
}

const PUTZEREI_SECTION_ALIASES = {
  Putzmaschinen: "Reinigungsmaschinen",
  Kleinwäscheabteilung: "Kleinteile",
  Hemdenabteilung: "Hemden",
  Bügeltische: "Bügeln",
};

function normalizePersonnelPlan(plan) {
  if (!plan || typeof plan !== "object") return {};

  const normalized = {};
  Object.entries(plan).forEach(([key, dayPlan]) => {
    if (!dayPlan || typeof dayPlan !== "object") {
      normalized[key] = dayPlan;
      return;
    }

    const nextDayPlan = { ...dayPlan };
    const previousAutoZa = new Set(Array.isArray(nextDayPlan.autoZa) ? nextDayPlan.autoZa : []);
    if (previousAutoZa.size && Array.isArray(nextDayPlan.za)) {
      nextDayPlan.za = nextDayPlan.za.filter((name) => !previousAutoZa.has(name));
    }
    delete nextDayPlan.autoZa;

    if (key.startsWith("putzerei_")) {
      Object.entries(PUTZEREI_SECTION_ALIASES).forEach(([oldName, newName]) => {
        const oldAssignments = Array.isArray(nextDayPlan[oldName]) ? nextDayPlan[oldName] : [];
        const newAssignments = Array.isArray(nextDayPlan[newName]) ? nextDayPlan[newName] : [];
        if (oldAssignments.length || newAssignments.length) {
          nextDayPlan[newName] = [...new Set([...newAssignments, ...oldAssignments])];
        }
        delete nextDayPlan[oldName];
      });
    }
    normalized[key] = nextDayPlan;
  });

  return normalized;
}

const PUTZEREI_EMPLOYEES = [
  { name: "Elfi", hours: 40 },
  { name: "Sandra", hours: 40 },
  { name: "Nadine", hours: 40 },
  { name: "Natascha", hours: 40 },
  { name: "Timi", hours: 40 },
  { name: "Renate", hours: 30 },
  { name: "Chani", hours: 40 },
  { name: "Nelly", hours: 40 },
  { name: "Carmen", hours: 40 },
  { name: "Kopi", hours: 35 },
  { name: "Silvia", hours: 40 },
  { name: "Siri", hours: 40 },
  { name: "Sylvia L.", hours: 40 },
  { name: "Andrea P.", hours: 40 },
];

const PERSONNEL_WEEKDAYS = [
  { key: 1, label: "Montag", short: "Mo" },
  { key: 2, label: "Dienstag", short: "Di" },
  { key: 3, label: "Mittwoch", short: "Mi" },
  { key: 4, label: "Donnerstag", short: "Do" },
  { key: 5, label: "Freitag", short: "Fr" },
];

const EMPTY_EMPLOYEE_FORM = {
  name: "",
  hours: "",
  preferredWorkplace1: "",
  preferredWorkplace2: "",
  noGoWorkplace1: "",
  noGoWorkplace2: "",
  regularDays: [1, 2, 3, 4, 5],
  regularShifts: ["07-12", "12-15", "15-schluss"],
};

function normalizePersonnelEmployee(employee) {
  return {
    ...employee,
    preferredWorkplace1: employee?.preferredWorkplace1 || "",
    preferredWorkplace2: employee?.preferredWorkplace2 || "",
    noGoWorkplace1: employee?.noGoWorkplace1 || "",
    noGoWorkplace2: employee?.noGoWorkplace2 || "",
    regularDays: Array.isArray(employee?.regularDays) ? employee.regularDays : [1, 2, 3, 4, 5],
    regularShifts: Array.isArray(employee?.regularShifts) ? employee.regularShifts : ["07-12", "12-15", "15-schluss"],
  };
}

function normalizePersonnelEmployees(employees, fallback) {
  const source = Array.isArray(employees) && employees.length ? employees : fallback;
  return source.map(normalizePersonnelEmployee);
}

const PERSONNEL_DEPARTMENTS = {
  waescherei: {
    label: "Wäscherei",
    sections: PERSONNEL_SECTIONS,
    groups: PERSONNEL_GROUPS,
    employees: PERSONNEL_EMPLOYEES,
  },
  putzerei: {
    label: "Putzerei",
    sections: PUTZEREI_SECTIONS,
    groups: PUTZEREI_GROUPS,
    employees: PUTZEREI_EMPLOYEES,
  },
};


const PERSONNEL_MAPS = {
  waescherei: {
    title: "Gesamtuebersicht Waescherei",
    image: "/plan-skizze-waescherei.jpg",
    imageFallbacks: ["/plan skizze wäscherei.jpg", "/plan%20skizze%20w%C3%A4scherei.jpg"],
    aspect: "aspect-[715/720]",
    zones: [
      { section: "Übernahme", x: 12, y: 88, w: 14 },
      { section: "Waschstraßen", x: 18, y: 32, w: 14 },
      { section: "Waschmaschinen", x: 13, y: 43, w: 14 },
      { section: "Absortierung", x: 48, y: 22, w: 15 },
      { section: "Mangel 1", x: 64, y: 29, w: 14 },
      { section: "Mangel 2", x: 64, y: 50, w: 14 },
      { section: "Frottee 1", x: 86, y: 20, w: 12 },
      { section: "Frottee 2", x: 86, y: 48, w: 12 },
      { section: "BM + SPLT", x: 88, y: 82, w: 12 },
      { section: "Jenway Großteile", x: 42, y: 34, w: 14 },
      { section: "Jenway Kleinteile", x: 42, y: 52, w: 14 },
      { section: "Jenway Frottee", x: 42, y: 68, w: 14 },
      { section: "Poolwäsche", x: 70, y: 84, w: 13 },
      { section: "Expedit", x: 74, y: 75, w: 13 },
      { section: "Wäsche auspacken", x: 25, y: 92, w: 14 },
    ],
  },
  putzerei: {
    title: "Gesamtuebersicht Putzerei",
    image: "/plan-skizze-putzerei.jpg",
    imageFallbacks: ["/plan skizze Putzerei.jpg", "/plan%20skizze%20Putzerei.jpg"],
    aspect: "aspect-[715/522]",
    zones: [
      { section: "Übernahme", x: 10, y: 90, w: 15 },
      { section: "Waschmaschinen", x: 22, y: 38, w: 14 },
      { section: "Putzmaschinen", x: 43, y: 43, w: 14 },
      { section: "Tunnelfinisher", x: 71, y: 25, w: 14 },
      { section: "Hemdenabteilung", x: 77, y: 78, w: 14 },
      { section: "Bügeltische", x: 60, y: 58, w: 14 },
      { section: "Verpackung", x: 88, y: 45, w: 14 },
      { section: "Kleinwäscheabteilung", x: 28, y: 80, w: 15 },
      { section: "Expedit", x: 10, y: 57, w: 13 },
    ],
  },
};

const COMBINED_PERSONNEL_ZONES = [
  { department: "waescherei", section: "Übernahme", x: 5.5, y: 87, w: 5.2 },
  { department: "waescherei", section: "Waschstraßen", x: 8.5, y: 43, w: 5.2 },
  { department: "waescherei", section: "Waschmaschinen", x: 16.5, y: 43, w: 5.8 },
  { department: "waescherei", section: "Absortierung", x: 24, y: 20, w: 5.2 },
  { department: "waescherei", section: "Mangel 1", x: 29, y: 29, w: 5.2 },
  { department: "waescherei", section: "Mangel 2", x: 29, y: 49, w: 5.2 },
  { department: "waescherei", section: "Frottee 1", x: 43, y: 18, w: 5.2 },
  { department: "waescherei", section: "Frottee 2", x: 43, y: 43, w: 5.2 },
  { department: "waescherei", section: "BM + SPLT", x: 45, y: 63, w: 5.2 },
  { department: "waescherei", section: "Jenway Großteile", x: 20, y: 33, w: 6.2 },
  { department: "waescherei", section: "Jenway Kleinteile", x: 20, y: 54, w: 6.2 },
  { department: "waescherei", section: "Jenway Frottee", x: 20, y: 70, w: 5.8 },
  { department: "waescherei", section: "Poolwäsche", x: 29, y: 82, w: 5.2 },
  { department: "waescherei", section: "Expedit", x: 46, y: 84, w: 4.5 },
  { department: "waescherei", section: "Wäsche auspacken", x: 39, y: 75, w: 6.2 },
  { department: "putzerei", section: "Übernahme", x: 55, y: 88, w: 5.2 },
  { department: "putzerei", section: "Expedit", x: 55, y: 56, w: 4.5 },
  { department: "putzerei", section: "Kleinteile", x: 64, y: 79, w: 5.2 },
  { department: "putzerei", section: "Verpackung", x: 94, y: 48, w: 5.2 },
  { department: "putzerei", section: "Waschmaschinen", x: 61, y: 39, w: 5.8 },
  { department: "putzerei", section: "Reinigungsmaschinen", x: 72, y: 39, w: 6.5 },
  { department: "putzerei", section: "Tunnelfinisher", x: 85, y: 24, w: 5.8 },
  { department: "putzerei", section: "Hemden", x: 89, y: 79, w: 4.8 },
  { department: "putzerei", section: "Bügeln", x: 80, y: 59, w: 4.5 },
];

function normalizePersonnelFloorPlanZones(value) {
  const savedByKey = new Map(
    (Array.isArray(value) ? value : []).map((zone) => [`${zone.department}-${zone.section}`, zone]),
  );
  return COMBINED_PERSONNEL_ZONES.map((fallback) => {
    const saved = savedByKey.get(`${fallback.department}-${fallback.section}`) || {};
    const x = Number(saved.x);
    const y = Number(saved.y);
    return {
      ...fallback,
      x: Number.isFinite(x) ? Math.min(98, Math.max(2, x)) : fallback.x,
      y: Number.isFinite(y) ? Math.min(98, Math.max(2, y)) : fallback.y,
    };
  });
}

function Button({ children, active, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
        active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white hover:bg-slate-50"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-300 ${
        props.className || ""
      }`}
    />
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-red-600 font-black text-red-600">
        DIE
      </div>
      <div>
        <div className="text-2xl font-black text-sky-600">WÄSCHEREI</div>
        <div className="text-xs font-bold text-sky-600">
          by <span className="text-red-600">♡</span> DieTex
        </div>
      </div>
    </div>
  );
}

function categoryStyle(cat, selected) {
  const styles = {
    Bettwäsche: "border-blue-400 bg-blue-50 text-blue-900",
    Frottee: "border-green-400 bg-green-50 text-green-900",
    Tischwäsche: "border-orange-400 bg-orange-50 text-orange-900",
    Putzerei: "border-violet-400 bg-violet-50 text-violet-900",
  };
  return `${styles[cat]} ${selected ? "scale-105 ring-4 ring-blue-200 shadow-lg" : "opacity-90 hover:opacity-100"}`;
}

function getContainerPlan(selected) {
  const plan = [];
  if (selected.includes("Bettwäsche")) plan.push({ type: "Bettwäsche" });
  if (selected.includes("Tischwäsche")) plan.push({ type: "Tischwäsche" });
  if (selected.includes("Frottee")) {
    plan.push({ type: "Frottee" });
    plan.push({ type: "SPLT + BM" });
  }
  return plan;
}

function fmtTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateInput(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function localDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHtmlBuildSignature(html) {
  const match = String(html || "").match(/\/assets\/index-[^"']+\.js/);
  return match ? match[0] : "";
}

function reloadWithCacheBuster() {
  const url = new URL(window.location.href);
  url.searchParams.set("dietex_reload", Date.now().toString());
  window.location.replace(url.toString());
}

function splitIntoColumns(rows, count) {
  const cols = Array.from({ length: count }, () => []);
  rows.forEach((row, idx) => cols[idx % count].push(row));
  return cols;
}

function displaySubcategory(subcategory) {
  if (subcategory === "Tischtücher" || subcategory === "Deckservietten") {
    return "Tischtücher + Deckservietten";
  }
  return subcategory;
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const personnelDisplayPath = pathname === "/personaldisplay";
  const externalPersonnelPortal = params.get("portal") === "personalplanung";
  const initialView = personnelDisplayPath
    ? "personaldisplay"
    : externalPersonnelPortal
      ? (params.get("view") === "personalmonitor" ? "personalmonitor" : "personalplanung")
      : (params.get("view") || "annahme");
  const personnelDisplayMode = initialView === "personaldisplay" || params.get("display") === "waescherei-gang";
  const initialStationKey = params.get("station");
  const initialStation = STATIONS.find((s) => s.key === initialStationKey) || STATIONS[0];
  const fixedView = params.get("fixed") === "1" || personnelDisplayMode;
  const expeditMode = params.get("view") === "expedit";
  const takeoverMode = fixedView && (initialView === "annahme" || initialView === "uebernahme" || params.get("mode") === "uebernahme");
  const requestedInitialViewRaw = takeoverMode
    ? "annahme"
    : expeditMode
      ? "monitor"
      : initialView === "stats"
        ? "leitung"
        : initialView === "uebernahme"
        ? "annahme"
        : initialView;
  const requestedInitialView = requestedInitialViewRaw === "station"
    ? "annahme"
    : requestedInitialViewRaw === "touren"
      ? "monitor"
      : requestedInitialViewRaw;
  const initialAdminUnlocked = externalPersonnelPortal || isAdminSessionUnlocked();

  const [view, setView] = useState(() => (isProtectedView(requestedInitialView) && !initialAdminUnlocked ? "annahme" : requestedInitialView));
  const [adminUnlocked, setAdminUnlocked] = useState(initialAdminUnlocked);
  const [pinModal, setPinModal] = useState(() =>
    isProtectedView(requestedInitialView) && !initialAdminUnlocked ? { nextView: requestedInitialView } : null
  );
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activeStation, setActiveStation] = useState(initialStation);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [history, setHistory] = useState([]);
  const [articleSettings, setArticleSettings] = useState([]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [info, setInfo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [excludedOrderArticles, setExcludedOrderArticles] = useState({});
  const [takeoverBusy, setTakeoverBusy] = useState(false);
  const [takeoverMessage, setTakeoverMessage] = useState("");

  const [stationSearch, setStationSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [statsDate, setStatsDate] = useState(fmtDateInput());
  const [statsFrom, setStatsFrom] = useState("00:00");
  const [statsTo, setStatsTo] = useState("23:59");
  const [leitungStatusFilter, setLeitungStatusFilter] = useState("alle");
  const [leitungDateFrom, setLeitungDateFrom] = useState(fmtDateInput());
  const [leitungDateTo, setLeitungDateTo] = useState(fmtDateInput());
  const [leitungSort, setLeitungSort] = useState("customer_asc");
  const [leitungDeleteModal, setLeitungDeleteModal] = useState(false);
  const [leitungDeleteFrom, setLeitungDeleteFrom] = useState(() => `${fmtDateInput()}T00:00`);
  const [leitungDeleteTo, setLeitungDeleteTo] = useState(() => `${fmtDateInput()}T23:59`);
  const [leitungDeleteBusy, setLeitungDeleteBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [hiddenStationOrders, setHiddenStationOrders] = useState({});

  const [personalDate, setPersonalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalDepartment, setPersonalDepartment] = useState("waescherei");
  const [copyPersonalDate, setCopyPersonalDate] = useState(() => new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  const [personalStatsFrom, setPersonalStatsFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalStatsTo, setPersonalStatsTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalShift, setPersonalShift] = useState("07-12");
  const [personnelDayStrengthByDate, setPersonnelDayStrengthByDate] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dietexPersonnelDayStrengthByDate") || "{}");
    } catch {
      return {};
    }
  });
  const [personnelFloorPlanZones, setPersonnelFloorPlanZones] = useState(() => {
    try {
      return normalizePersonnelFloorPlanZones(JSON.parse(localStorage.getItem("dietexPersonnelFloorPlanZones") || "null"));
    } catch {
      return normalizePersonnelFloorPlanZones(null);
    }
  });
  const [floorPlanEditMode, setFloorPlanEditMode] = useState(false);
  const [floorPlanDraft, setFloorPlanDraft] = useState(() => normalizePersonnelFloorPlanZones(null));
  const [personnelSectionsByDept, setPersonnelSectionsByDept] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dietexPersonnelSectionsByDept") || "null");
      if (saved && typeof saved === "object") {
        return {
          waescherei: normalizePersonnelSections(saved.waescherei, PERSONNEL_SECTIONS),
          putzerei: normalizePersonnelSections(saved.putzerei, PUTZEREI_SECTIONS),
        };
      }
    } catch {}
    return {
      waescherei: normalizePersonnelSections(PERSONNEL_SECTIONS, PERSONNEL_SECTIONS),
      putzerei: normalizePersonnelSections(PUTZEREI_SECTIONS, PUTZEREI_SECTIONS),
    };
  });
  const [personalPlan, setPersonalPlan] = useState(() => {
    try {
      return normalizePersonnelPlan(JSON.parse(localStorage.getItem("dietexPersonalPlan") || "{}"));
    } catch {
      return {};
    }
  });
  const [employeeStatus, setEmployeeStatus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dietexEmployeeStatus") || "{}");
    } catch {
      return {};
    }
  });
  const [dragEmployee, setDragEmployee] = useState(null);
  const [selectedPersonnelEmployee, setSelectedPersonnelEmployee] = useState(null);
  const [personnelEmployeesByDept, setPersonnelEmployeesByDept] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dietexPersonnelEmployeesByDept") || "null");
      if (saved && typeof saved === "object") {
        return {
          waescherei: normalizePersonnelEmployees(saved.waescherei, PERSONNEL_EMPLOYEES),
          putzerei: normalizePersonnelEmployees(saved.putzerei, PUTZEREI_EMPLOYEES),
        };
      }
    } catch {}
    return {
      waescherei: normalizePersonnelEmployees(PERSONNEL_EMPLOYEES, PERSONNEL_EMPLOYEES),
      putzerei: normalizePersonnelEmployees(PUTZEREI_EMPLOYEES, PUTZEREI_EMPLOYEES),
    };
  });
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeHours, setNewEmployeeHours] = useState("");
  const [exchangeEmployeeName, setExchangeEmployeeName] = useState("");
  const [exchangeTargetDept, setExchangeTargetDept] = useState("putzerei");
  const [personnelEmployeeModal, setPersonnelEmployeeModal] = useState(false);
  const [editingEmployeeName, setEditingEmployeeName] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [personnelDepartmentModal, setPersonnelDepartmentModal] = useState(false);
  const [departmentDraft, setDepartmentDraft] = useState([]);
  const [personnelSyncStatus, setPersonnelSyncStatus] = useState("loading");

  const [tourModal, setTourModal] = useState(null);
  const [tourContainerCount, setTourContainerCount] = useState("");
  const [tourNumberInput, setTourNumberInput] = useState("");
  const [pendingWash, setPendingWash] = useState({});
  const [pendingFinishedOrders, setPendingFinishedOrders] = useState({});
  const [monitorDetailOrder, setMonitorDetailOrder] = useState(null);
  const washTimers = useRef({});
  const finishedTimers = useRef({});
  const reloadTimer = useRef(null);
  const reloadDueAt = useRef(0);
  const loadAllRunning = useRef(false);
  const loadAllQueued = useRef(false);
  const personnelSyncReady = useRef(false);
  const personnelSyncAvailable = useRef(false);
  const personnelSaveTimer = useRef(null);
  const lastPersonnelStateJson = useRef("");
  const floorPlanRef = useRef(null);
  const floorPlanDrag = useRef(null);

  const createPersonnelStatePayload = () => ({
    plan: personalPlan,
    employeeStatus,
    employeesByDept: personnelEmployeesByDept,
    sectionsByDept: personnelSectionsByDept,
    dayStrengthByDate: personnelDayStrengthByDate,
    floorPlanZones: personnelFloorPlanZones,
  });

  const applyRemotePersonnelState = (remoteState) => {
    if (!remoteState || typeof remoteState !== "object") return;

    const nextState = {
      plan: normalizePersonnelPlan(remoteState.plan || {}),
      employeeStatus: remoteState.employeeStatus && typeof remoteState.employeeStatus === "object" ? remoteState.employeeStatus : {},
      employeesByDept: {
        waescherei: normalizePersonnelEmployees(remoteState.employeesByDept?.waescherei, PERSONNEL_EMPLOYEES),
        putzerei: normalizePersonnelEmployees(remoteState.employeesByDept?.putzerei, PUTZEREI_EMPLOYEES),
      },
      sectionsByDept: {
        waescherei: normalizePersonnelSections(remoteState.sectionsByDept?.waescherei, PERSONNEL_SECTIONS),
        putzerei: normalizePersonnelSections(remoteState.sectionsByDept?.putzerei, PUTZEREI_SECTIONS),
      },
      dayStrengthByDate: remoteState.dayStrengthByDate && typeof remoteState.dayStrengthByDate === "object" ? remoteState.dayStrengthByDate : {},
      floorPlanZones: normalizePersonnelFloorPlanZones(remoteState.floorPlanZones),
    };

    lastPersonnelStateJson.current = JSON.stringify(nextState);
    setPersonalPlan(nextState.plan);
    setEmployeeStatus(nextState.employeeStatus);
    setPersonnelEmployeesByDept(nextState.employeesByDept);
    setPersonnelSectionsByDept(nextState.sectionsByDept);
    setPersonnelDayStrengthByDate(nextState.dayStrengthByDate);
    setPersonnelFloorPlanZones(nextState.floorPlanZones);
    setPersonnelSyncStatus("connected");
  };

  useEffect(() => {
    let active = true;

    const loadRemotePersonnelState = async () => {
      const { data, error } = await supabase
        .from("personnel_planning_state")
        .select("state, updated_at")
        .eq("id", "main")
        .maybeSingle();

      if (!active) return;
      if (error) {
        personnelSyncAvailable.current = false;
        personnelSyncReady.current = false;
        setPersonnelSyncStatus(error.code === "42P01" || error.code === "PGRST205" ? "setup_required" : "error");
        return;
      }

      personnelSyncAvailable.current = true;
      if (data?.state) {
        const hasUnsavedLocalChanges = personnelSyncReady.current
          && !personnelDisplayMode
          && JSON.stringify(createPersonnelStatePayload()) !== lastPersonnelStateJson.current;
        if (hasUnsavedLocalChanges) return;
        applyRemotePersonnelState(data.state);
        personnelSyncReady.current = true;
        return;
      }

      if (personnelDisplayMode) {
        setPersonnelSyncStatus("waiting");
        return;
      }

      const localState = createPersonnelStatePayload();
      const localJson = JSON.stringify(localState);
      const { error: insertError } = await supabase.from("personnel_planning_state").upsert({
        id: "main",
        state: localState,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (!active) return;
      if (insertError) {
        setPersonnelSyncStatus("error");
        return;
      }
      lastPersonnelStateJson.current = localJson;
      personnelSyncReady.current = true;
      setPersonnelSyncStatus("connected");
    };

    const channel = supabase
      .channel("dietex-personnel-planning-live")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "personnel_planning_state",
        filter: "id=eq.main",
      }, (payload) => {
        if (payload.new?.state) {
          applyRemotePersonnelState(payload.new.state);
          personnelSyncAvailable.current = true;
          personnelSyncReady.current = true;
        }
      })
      .subscribe();

    loadRemotePersonnelState();
    const pollInterval = window.setInterval(loadRemotePersonnelState, 15000);

    return () => {
      active = false;
      window.clearInterval(pollInterval);
      if (personnelSaveTimer.current) window.clearTimeout(personnelSaveTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (personnelDisplayMode || !personnelSyncReady.current || !personnelSyncAvailable.current) return undefined;

    const nextState = createPersonnelStatePayload();
    const nextJson = JSON.stringify(nextState);
    if (nextJson === lastPersonnelStateJson.current) return undefined;

    if (personnelSaveTimer.current) window.clearTimeout(personnelSaveTimer.current);
    personnelSaveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("personnel_planning_state").upsert({
        id: "main",
        state: nextState,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (error) {
        setPersonnelSyncStatus("error");
        personnelSaveTimer.current = null;
        return;
      }
      lastPersonnelStateJson.current = nextJson;
      setPersonnelSyncStatus("connected");
      personnelSaveTimer.current = null;
    }, 500);

    return () => {
      if (personnelSaveTimer.current) window.clearTimeout(personnelSaveTimer.current);
    };
  }, [personalPlan, employeeStatus, personnelEmployeesByDept, personnelSectionsByDept, personnelDayStrengthByDate, personnelFloorPlanZones]);

  useEffect(() => {
    if (personnelDisplayMode) return undefined;
    scheduleLoadAll(0);
    const channel = supabase
      .channel("dietex-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => scheduleLoadAll(2000))
      .on("postgres_changes", { event: "*", schema: "public", table: "order_categories" }, () => scheduleLoadAll(2000))
      .on("postgres_changes", { event: "*", schema: "public", table: "containers" }, () => scheduleLoadAll(2000))
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_article_settings" }, () => scheduleLoadAll(2000))
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const currentScript = document.querySelector('script[type="module"][src*="/assets/index-"]');
    const currentSignature = currentScript ? new URL(currentScript.src).pathname : "";
    let reloadStarted = false;

    async function checkForAppUpdate() {
      if (!currentSignature || reloadStarted) return;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("dietex_update_check", Date.now().toString());
        const response = await fetch(url.toString(), {
          cache: "reload",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (!response.ok) return;
        const nextSignature = getHtmlBuildSignature(await response.text());
        if (nextSignature && nextSignature !== currentSignature) {
          const lastReloadAt = Number(sessionStorage.getItem("dietexLastAutoReloadAt") || "0");
          if (Date.now() - lastReloadAt < 10 * 60 * 1000) return;
          sessionStorage.setItem("dietexLastAutoReloadAt", Date.now().toString());
          reloadStarted = true;
          reloadWithCacheBuster();
        }
      } catch {
        // Offline or temporary network issue: keep the current screen running.
      }
    }

    checkForAppUpdate();
    const interval = window.setInterval(checkForAppUpdate, 60000);
    const onVisibilityChange = () => {
      if (!document.hidden) checkForAppUpdate();
    };
    const onUserReturns = () => checkForAppUpdate();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onUserReturns);
    window.addEventListener("online", onUserReturns);
    window.addEventListener("pointerdown", onUserReturns);
    window.addEventListener("touchstart", onUserReturns);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onUserReturns);
      window.removeEventListener("online", onUserReturns);
      window.removeEventListener("pointerdown", onUserReturns);
      window.removeEventListener("touchstart", onUserReturns);
    };
  }, []);


  useEffect(() => {
    localStorage.setItem("dietexPersonalPlan", JSON.stringify(personalPlan));
  }, [personalPlan]);

  useEffect(() => {
    localStorage.setItem("dietexEmployeeStatus", JSON.stringify(employeeStatus));
  }, [employeeStatus]);

  useEffect(() => {
    localStorage.setItem("dietexPersonnelEmployeesByDept", JSON.stringify(personnelEmployeesByDept));
  }, [personnelEmployeesByDept]);

  useEffect(() => {
    localStorage.setItem("dietexPersonnelSectionsByDept", JSON.stringify(personnelSectionsByDept));
  }, [personnelSectionsByDept]);

  useEffect(() => {
    localStorage.setItem("dietexPersonnelDayStrengthByDate", JSON.stringify(personnelDayStrengthByDate));
  }, [personnelDayStrengthByDate]);

  useEffect(() => {
    localStorage.setItem("dietexPersonnelFloorPlanZones", JSON.stringify(personnelFloorPlanZones));
  }, [personnelFloorPlanZones]);

  useEffect(() => {
    setSelectedPersonnelEmployee(null);
    setDragEmployee(null);
  }, [personalDepartment, personalDate, personalShift]);

  useEffect(() => {
    if (!personnelDisplayMode) return;
    const now = new Date(tick);
    const shiftIndex = Math.floor(now.getTime() / 15000) % PERSONNEL_SHIFTS.length;
    const shift = PERSONNEL_SHIFTS[shiftIndex].key;
    setPersonalDepartment("waescherei");
    setPersonalDate(localDateKey(now));
    setPersonalShift(shift);
  }, [personnelDisplayMode, tick]);

  useEffect(() => {
    if (!personnelDisplayMode) return undefined;
    const refreshMeta = document.createElement("meta");
    refreshMeta.httpEquiv = "refresh";
    refreshMeta.content = "15";
    refreshMeta.dataset.dietexPersonalDisplayRefresh = "true";
    document.head.appendChild(refreshMeta);
    return () => refreshMeta.remove();
  }, [personnelDisplayMode]);

  useEffect(() => {
    return () => {
      Object.values(washTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
      if (!personnelDisplayMode) autoMoveFinishedToTourAtMidnight();
    }, 1000);
    return () => clearInterval(interval);
  }, [orders, items]);

  useEffect(() => {
    setHiddenStationOrders((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        STATIONS.forEach((station) => {
          const relevant = enabledItemsForOrder(order).filter((i) => station.items.includes(i.subcategory) && i.washed_at);
          const key = `${order.id}-${station.key}`;
          if (relevant.length > 0 && relevant.every((i) => i.is_done) && !next[key]) {
            next[key] = Date.now() + 10000;
          }
        });
      });
      return next;
    });
  }, [orders, items, articleSettings]);

  async function safeSupabaseQuery(label, queryFactory, retries = 2) {
    let lastResult = { data: null, error: null };

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const result = await queryFactory();
        lastResult = result || lastResult;
        if (!result?.error) return result;
      } catch (error) {
        lastResult = { data: null, error };
      }

      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
      }
    }

    console.warn(`Supabase load failed: ${label}`, lastResult.error);
    return lastResult;
  }

  function scheduleLoadAll(delay = 15000) {
    const dueAt = Date.now() + delay;
    if (reloadTimer.current && reloadDueAt.current <= dueAt) return;

    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadDueAt.current = dueAt;
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null;
      reloadDueAt.current = 0;
      loadAll();
    }, delay);
  }

  async function loadAll() {
    if (loadAllRunning.current) {
      loadAllQueued.current = true;
      return;
    }

    loadAllRunning.current = true;
    try {
      const [c, o, co, h, s] = await Promise.all([
        safeSupabaseQuery("customers", () => supabase.from("customers").select("*").order("customer_number")),
        safeSupabaseQuery("orders", () =>
          supabase
            .from("orders")
            .select("*")
            .neq("status", "archiviert")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        ),
        safeSupabaseQuery("containers", () => supabase.from("containers").select("*").is("removed_at", null).order("row_number").order("place_number")),
        safeSupabaseQuery("order_history", () => supabase.from("order_history").select("*").order("completed_at", { ascending: false })),
        safeSupabaseQuery("customer_article_settings", () => supabase.from("customer_article_settings").select("*")),
      ]);

      const activeOrders = o.data || [];

      if (!c.error) setCustomers(c.data || []);
      if (!o.error) setOrders(activeOrders);
      if (!co.error) setContainers(co.data || []);
      if (!h.error) setHistory(h.data || []);
      if (!s.error) setArticleSettings(s.data || []);

      if (o.error) return;

      const result = await loadOrderCategoriesForOrders(activeOrders.map((order) => order.id));
      setItems(result.data || []);
    } finally {
      loadAllRunning.current = false;
      if (loadAllQueued.current) {
        loadAllQueued.current = false;
        scheduleLoadAll(1000);
      }
    }
  }

  function isArticleEnabled(customerNumber, subcategory) {
    const setting = articleSettings.find((s) => String(s.customer_number) === String(customerNumber) && s.subcategory === subcategory);
    return setting ? setting.is_enabled : true;
  }

  async function loadAllOrderCategories() {
    const pageSize = 1000;
    const allRows = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("order_categories")
        .select("*")
        .order("subcategory")
        .range(from, from + pageSize - 1);

      if (error) return { data: allRows, error };
      allRows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }

    return { data: allRows, error: null };
  }

  async function loadOrderCategoriesForOrders(orderIds, onChunk) {
    const uniqueIds = [...new Set(orderIds.filter(Boolean))];
    const allRows = [];
    const chunkSize = 10;

    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);
      const { data, error } = await safeSupabaseQuery("order_categories chunk", () =>
        supabase.from("order_categories").select("*").in("order_id", chunk).order("subcategory")
      );

      if (error) {
        if (allRows.length && onChunk) onChunk([...allRows]);
        continue;
      }
      allRows.push(...(data || []));
      if (onChunk) onChunk([...allRows]);
    }

    return { data: allRows, error: null };
  }

  function orderArticleKey(category, subcategory) {
    return `${category}__${subcategory}`;
  }

  function isOrderArticleIncluded(category, subcategory) {
    return !excludedOrderArticles[orderArticleKey(category, subcategory)];
  }

  function selectedOrderRows() {
    return selectedCategories.flatMap((cat) =>
      (CATEGORIES[cat] || [])
        .filter((sub) => isOrderArticleIncluded(cat, sub))
        .map((sub) => ({ category: cat, subcategory: sub }))
    );
  }

  function toggleOrderCategory(category) {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        setExcludedOrderArticles((old) => {
          const next = { ...old };
          (CATEGORIES[category] || []).forEach((sub) => delete next[orderArticleKey(category, sub)]);
          return next;
        });
        return prev.filter((cat) => cat !== category);
      }

      return [...prev, category];
    });
  }

  function toggleOrderArticle(category, subcategory) {
    setExcludedOrderArticles((prev) => {
      const key = orderArticleKey(category, subcategory);
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }

  function enabledItemsForOrder(order) {
    return items.filter((i) => i.order_id === order.id && isArticleEnabled(order.customer_number, i.subcategory));
  }

  async function toggleCustomerArticle(customerNumber, subcategory) {
    const current = isArticleEnabled(customerNumber, subcategory);
    const next = !current;

    const existing = articleSettings.find(
      (s) =>
        String(s.customer_number) === String(customerNumber) &&
        s.subcategory === subcategory
    );

    if (existing) {
      await supabase
        .from("customer_article_settings")
        .update({ is_enabled: next })
        .eq("id", existing.id);
    } else {
      await supabase.from("customer_article_settings").insert({
        customer_number: String(customerNumber),
        subcategory,
        is_enabled: next,
      });
    }

    setArticleSettings((prev) => {
      if (existing) {
        return prev.map((s) =>
          s.id === existing.id ? { ...s, is_enabled: next } : s
        );
      }

      return [
        ...prev,
        {
          id: `${customerNumber}-${subcategory}`,
          customer_number: String(customerNumber),
          subcategory,
          is_enabled: next,
        },
      ];
    });
  }

  async function autoMoveFinishedToTourAtMidnight() {
    const todayKey = localDateKey();
    const lastRunKey = localStorage.getItem("dietexAutoTourMidnightDate");

    if (!lastRunKey) {
      localStorage.setItem("dietexAutoTourMidnightDate", todayKey);
      return;
    }

    if (lastRunKey !== todayKey) {
      localStorage.setItem("dietexAutoTourMidnightDate", todayKey);
      await archiveFinishedOrders();
    }
  }

  async function archiveFinishedOrders(orderIds = null) {
    const finished = orders.filter((o) => {
      if (o.status !== "fertig") return false;
      const related = enabledItemsForOrder(o).filter((i) => i.category !== "Putzerei");
      return related.length > 0 && related.every((i) => i.is_done);
    });
    const ids = orderIds || finished.map((o) => o.id);
    if (!ids.length) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "auf_tour",
        container_count: null,
        tour_number: null,
      })
      .in("id", ids);

    if (error) {
      alert("Kunde konnte nicht auf Tour gesetzt werden: " + error.message);
      return;
    }

    await supabase
      .from("containers")
      .update({ removed_at: now })
      .in("order_id", ids);

    setOrders((prev) =>
      prev.map((o) =>
        ids.includes(o.id)
          ? {
              ...o,
              status: "auf_tour",
              container_count: null,
              tour_number: null,
            }
          : o
      )
    );
    setContainers((prev) => prev.filter((c) => !ids.includes(c.order_id)));
    setPendingFinishedOrders((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    scheduleLoadAll(1000);
  }

  async function confirmTourModal() {
    if (!tourContainerCount.trim()) {
      alert("Bitte Container- oder Packerlanzahl eingeben.");
      return;
    }

    if (!tourNumberInput.trim()) {
      alert("Bitte Tourennummer eingeben.");
      return;
    }

    const ids = tourModal?.ids || [];
    if (!ids.length) return;

    await supabase
      .from("orders")
      .update({
        status: "auf_tour",
        container_count: tourContainerCount.trim(),
        tour_number: tourNumberInput.trim(),
      })
      .in("id", ids);

    await supabase
      .from("containers")
      .update({ removed_at: new Date().toISOString() })
      .in("order_id", ids);

    setOrders((prev) =>
      prev.map((o) =>
        ids.includes(o.id)
          ? {
              ...o,
              status: "auf_tour",
              container_count: tourContainerCount.trim(),
              tour_number: tourNumberInput.trim(),
            }
          : o
      )
    );
    setContainers((prev) => prev.filter((c) => !ids.includes(c.order_id)));

    setTourModal(null);
    setTourContainerCount("");
    setTourNumberInput("");
    loadAll();
  }

  async function importCustomersExcel(event) {
    if (!adminUnlocked) {
      event.target.value = "";
      openPinModal(null);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const imported = rows
        .slice(1)
        .map((row) => ({
          customer_number: String(row[0] || "").trim(),
          customer_name: String(row[1] || "").trim(),
        }))
        .filter((row) => row.customer_number && row.customer_name);

      if (!imported.length) {
        alert("Keine Kunden gefunden. Erwartet: Spalte A Kundennummer, Spalte B Kundenname.");
        return;
      }

      const { error } = await supabase.from("customers").upsert(imported, { onConflict: "customer_number" });
      if (error) {
        alert("Import fehlgeschlagen: " + error.message);
        return;
      }

      alert(`${imported.length} Kunden wurden importiert.`);
      loadAll();
    } catch (err) {
      alert("Excel-Import fehlgeschlagen. Bitte Datei prüfen.");
    }

    event.target.value = "";
  }

  function findFreeSlots(count) {
    for (const row of ROWS) {
      const used = containers
        .filter((c) => c.row_number === row)
        .map((c) => c.place_number)
        .sort((a, b) => a - b);

      let start = 1;
      for (const place of used) {
        if (place === start) start += 1;
        else break;
      }

      if (start + count - 1 <= PLACES) {
        return Array.from({ length: count }, (_, i) => ({ row, place: start + i }));
      }
    }
    return null;
  }

  async function addOrder() {
    if (takeoverBusy) return;
    setTakeoverBusy(true);
    setTakeoverMessage("Uebernahme laeuft...");
    try {
    const number = customerNumber.trim();
    const name = customerName.trim();
    const orderRows = selectedOrderRows();

    if (!number || !name) return alert("Kundennummer und Kundenname eingeben.");
    if (!selectedCategories.length) return alert("Mindestens eine Kategorie auswählen.");

    if (!orderRows.length) return alert("Mindestens einen Artikel fuer diesen Auftrag auswaehlen.");

    let customer = customers.find((c) => String(c.customer_number) === String(number));
    if (!customer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({ customer_number: number, customer_name: name })
        .select()
        .single();
      if (error) return alert("Kunde konnte nicht gespeichert werden: " + error.message);
      customer = data;
    }

    const today = new Date().toISOString().slice(0, 10);

    const existingOrder = orders.find(
      (o) =>
        String(o.customer_number) === String(number) &&
        String(o.created_at || "").slice(0, 10) === today &&
        o.status !== "archiviert" &&
        o.status !== "auf_tour"
    );

    if (existingOrder) {
      const { data: existingItemsData, error: existingItemsError } = await supabase
        .from("order_categories")
        .select("subcategory")
        .eq("order_id", existingOrder.id);

      if (existingItemsError) {
        return alert("Bestehende Artikel konnten nicht geprueft werden: " + existingItemsError.message);
      }

      const existingItems = existingItemsData || [];
      const existingSubcategories = new Set(existingItems.map((i) => i.subcategory));

      const rowsToAdd = orderRows
        .filter((row) => !existingSubcategories.has(row.subcategory))
        .map((row) => ({ order_id: existingOrder.id, category: row.category, subcategory: row.subcategory }));

      if (rowsToAdd.length) {
        const { error: itemsError } = await supabase.from("order_categories").insert(rowsToAdd);
        if (itemsError) return alert("Artikel konnten nicht hinzugefuegt werden: " + itemsError.message);
      }

      const existingContainerTypes = new Set(
        containers
          .filter((c) => c.order_id === existingOrder.id && !c.removed_at)
          .map((c) => c.container_type)
      );

      const newContainerPlan = getContainerPlan(selectedCategories).filter((p) => !existingContainerTypes.has(p.type));

      if (newContainerPlan.length) {
        const slots = findFreeSlots(newContainerPlan.length);
        if (!slots) return alert("Kein freier Containerplatz verfügbar.");

        const { error: containerError } = await supabase.from("containers").insert(
          newContainerPlan.map((p, idx) => ({
            order_id: existingOrder.id,
            container_type: p.type,
            row_number: slots[idx].row,
            place_number: slots[idx].place,
            status: "bearbeitung",
          }))
        );
        if (containerError) return alert("Container konnten nicht angelegt werden: " + containerError.message);
      }

      if (info.trim()) {
        const mergedInfo = existingOrder.info
          ? `${existingOrder.info} | ${info.trim()}`
          : info.trim();

        const { error: infoError } = await supabase.from("orders").update({ info: mergedInfo }).eq("id", existingOrder.id);
        if (infoError) return alert("Info konnte nicht gespeichert werden: " + infoError.message);
      }

      if (!rowsToAdd.length && !newContainerPlan.length && !info.trim()) {
        alert("Dieser Kunde ist heute mit diesen Artikelgruppen bereits uebernommen.");
      }

      setCustomerSearch("");
      setCustomerNumber("");
      setCustomerName("");
      setInfo("");
      setSelectedCategories([]);
      setExcludedOrderArticles({});
      loadAll();
      return;
    }

    const plan = getContainerPlan(selectedCategories);
    const slots = findFreeSlots(plan.length);
    if (!slots) return alert("Kein freier Containerplatz verfügbar.");

    const maxSort = Math.max(0, ...orders.map((o) => Number(o.sort_order || 0)));

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        customer_number: number,
        customer_name: name,
        info: info.trim() || null,
        sequence_number: 1,
        status: "uebernommen",
        sort_order: maxSort + 10,
      })
      .select()
      .single();

    if (error) return alert("Auftrag konnte nicht erstellt werden: " + error.message);

    const rows = orderRows.map((row) => ({ order_id: order.id, category: row.category, subcategory: row.subcategory }));
    if (rows.length) {
      const { error: itemError } = await supabase.from("order_categories").insert(rows);
      if (itemError) return alert("Artikel konnten nicht erstellt werden: " + itemError.message);
    }

    if (plan.length) {
      const { error: containerError } = await supabase.from("containers").insert(
        plan.map((p, idx) => ({
          order_id: order.id,
          container_type: p.type,
          row_number: slots[idx].row,
          place_number: slots[idx].place,
          status: "bearbeitung",
        }))
      );
      if (containerError) return alert("Container konnten nicht erstellt werden: " + containerError.message);
    }

    setCustomerSearch("");
    setCustomerNumber("");
    setCustomerName("");
    setInfo("");
    setSelectedCategories([]);
    setExcludedOrderArticles({});
    setTakeoverMessage("Kunde wurde uebernommen.");
    loadAll();
    } catch (error) {
      const message = error?.message || String(error);
      setTakeoverMessage("Uebernahme fehlgeschlagen: " + message);
      alert("Uebernahme fehlgeschlagen: " + message);
    } finally {
      setTakeoverBusy(false);
    }
  }

  async function toggleItem(item) {
    const next = !item.is_done;
    await supabase
      .from("order_categories")
      .update({ is_done: next, done_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);

    const order = orders.find((o) => o.id === item.order_id);
    const orderItems = enabledItemsForOrder(order).map((i) => (i.id === item.id ? { ...i, is_done: next } : i));
    const laundryItems = orderItems.filter((i) => i.category !== "Putzerei");
    const allDone = laundryItems.length > 0 && laundryItems.every((i) => i.is_done);

    if (allDone) {
      const completedAt = new Date();
      const acceptedAt = new Date(order.created_at);
      const duration = Math.max(0, Math.round((completedAt - acceptedAt) / 60000));

      await supabase.from("orders").update({ status: "fertig", completed_at: completedAt.toISOString() }).eq("id", item.order_id);
      await supabase.from("containers").update({ status: "fertig" }).eq("order_id", item.order_id);
      await supabase.from("order_history").insert({
        order_id: order.id,
        customer_number: order.customer_number,
        customer_name: order.customer_name,
        accepted_at: order.created_at,
        completed_at: completedAt.toISOString(),
        duration_minutes: duration,
      });

      setHiddenStationOrders((p) => {
        const nextHidden = { ...p };
        STATIONS.forEach((station) => {
          const relevant = orderItems.filter((i) => station.items.includes(i.subcategory) && i.washed_at);
          if (relevant.length > 0 && relevant.every((i) => i.is_done)) {
            nextHidden[`${order.id}-${station.key}`] = Date.now() + 10000;
          }
        });
        return nextHidden;
      });
    }

    loadAll();
  }

  async function toggleStationGroup(groupItems) {
    if (!groupItems.length) return;

    const next = !groupItems.every((item) => item.is_done);

    await supabase
      .from("order_categories")
      .update({ is_done: next, done_at: next ? new Date().toISOString() : null })
      .in("id", groupItems.map((item) => item.id));

    loadAll();
  }

  function getWashKey(orderId, category) {
    return `${orderId}-${category}`;
  }

  function categoryIconsForRow(row) {
    return (row.categories || [])
      .filter((cat) => cat !== "Putzerei")
      .map((cat) => ({ cat, icon: CAT_ICON[cat] || cat.slice(0, 1) }));
  }

  async function washCategory(order, category) {
    const relatedIds = items
      .filter((i) => i.order_id === order.id && i.category === category && !i.washed_at)
      .map((i) => i.id);
    if (!relatedIds.length) return;

    const washedAt = new Date().toISOString();
    const { error } = await supabase
      .from("order_categories")
      .update({ washed_at: washedAt })
      .in("id", relatedIds);

    if (error) {
      alert("Waschstatus konnte nicht gespeichert werden: " + error.message);
      return;
    }

    setItems((prev) => prev.map((item) => (relatedIds.includes(item.id) ? { ...item, washed_at: washedAt } : item)));
    scheduleLoadAll(5000);
  }

  async function moveOrder(order, direction, category = null) {
    const visibleOrders = category ? washRowsForCategory(category) : sortedOrders;
    const current = visibleOrders.findIndex((entry) => entry.id === order.id);
    const other = visibleOrders[current + direction];
    if (!other) return;

    const aSort = Number(order.sort_order || current * 10);
    const bSort = Number(other.sort_order || (current + direction) * 10);

    await Promise.all([
      supabase.from("orders").update({ sort_order: bSort }).eq("id", order.id),
      supabase.from("orders").update({ sort_order: aSort }).eq("id", other.id),
    ]);
    loadAll();
  }

  async function removeContainer(container) {
    if (container.status !== "fertig") return;
    await supabase.from("containers").update({ removed_at: new Date().toISOString() }).eq("id", container.id);
  }

  async function removeAllFinished() {
    const finishedContainers = containers.filter((c) => c.status === "fertig");
    if (!finishedContainers.length) return alert("Keine fertigen Container vorhanden.");
    await supabase
      .from("containers")
      .update({ removed_at: new Date().toISOString() })
      .in("id", finishedContainers.map((c) => c.id));
  }

  async function deleteMasterCustomer(customer) {
    if (!confirm(`Kunde wirklich löschen?\n${customer.customer_number} ${customer.customer_name}`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      alert("Kunde konnte nicht gelöscht werden: " + error.message);
      return;
    }
    loadAll();
  }

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const sa = Number(a.sort_order || 0);
      const sb = Number(b.sort_order || 0);
      if (sa !== sb) return sa - sb;
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }, [orders]);

  const customerSuggestions = customers
    .filter((c) => customerSearch && (c.customer_number.includes(customerSearch) || c.customer_name.toLowerCase().includes(customerSearch.toLowerCase())))
    .slice(0, 8);

  function getOrderCategories(orderId) {
    const cats = items.filter((i) => i.order_id === orderId).map((i) => i.category);
    return [...new Set(cats)];
  }

  const takeoverListToday = useMemo(() => {
    const today = localDateKey();
    return sortedOrders
      .filter((order) => localDateKey(order.created_at) === today && order.status !== "archiviert")
      .map((order) => {
        const groups = getOrderCategories(order.id);
        return {
          ...order,
          takeoverGroups: groups.length ? groups.join(", ") : "-",
          takeoverTime: fmtTime(order.created_at),
        };
      })
      .sort((a, b) => String(a.customer_number || "").localeCompare(String(b.customer_number || ""), "de", { numeric: true }));
  }, [sortedOrders, items]);

  function washRowsForCategory(category) {
    return sortedOrders
      .map((order) => {
        const relevant = enabledItemsForOrder(order).filter((i) => i.category === category);
        const open = order.status === "auf_tour" ? [] : relevant.filter((i) => !i.washed_at);
        return { ...order, washTotal: relevant.length, washOpen: open.length, categories: getOrderCategories(order.id) };
      })
      .filter((row) => row.washOpen > 0);
  }

  function washRowsForStreet(street) {
    return sortedOrders
      .map((order) => {
        const relevant = enabledItemsForOrder(order).filter((i) => {
          if (street.key === "ws-2") {
            return WASH_CATEGORIES.includes(i.category) && i.category !== "Frottee";
          }

          return street.categories.includes(i.category);
        });
        const open = order.status === "auf_tour" ? [] : relevant.filter((i) => !i.washed_at);
        const labels = [...new Set(open.map((i) => displaySubcategory(i.subcategory)))];
        return {
          ...order,
          washTotal: relevant.length,
          washOpen: open.length,
          openItemIds: open.map((i) => i.id),
          washLabels: labels,
          categories: getOrderCategories(order.id),
        };
      })
      .filter((row) => row.washOpen > 0);
  }

  const monitorRows = useMemo(() => {
    return sortedOrders
      .map((order) => {
        const related = enabledItemsForOrder(order);
        const laundryItems = related.filter((i) => i.category !== "Putzerei");
        const putzereiItems = related.filter((i) => i.category === "Putzerei");
        const done = laundryItems.filter((i) => i.is_done).length;
        const total = laundryItems.length;
        const putzereiOpen = putzereiItems.length > 0 && putzereiItems.some((i) => !i.is_done);

        let monitorState = "uebernommen";
        if (order.status === "auf_tour") {
          monitorState = "auf_tour";
        } else if (total > 0 && done === total) {
          monitorState = "fertig";
        } else if (done > 0) {
          monitorState = "bearbeitung";
        }

        return {
          ...order,
          progressDone: done,
          progressTotal: total,
          putzereiOpen,
          putzereiPresent: putzereiItems.length > 0,
          monitorState,
          categories: getOrderCategories(order.id),
        };
      });
  }, [sortedOrders, items, articleSettings]);

  const workingRows = monitorRows.filter((r) => r.monitorState === "bearbeitung" && r.status !== "auf_tour");
  const finishedRows = monitorRows.filter((r) => r.monitorState === "fertig" && r.status !== "auf_tour");
  const tourRows = monitorRows.filter((r) => r.monitorState === "auf_tour");
  const packagingInfoRows = sortedOrders
    .filter((order) => order.status !== "auf_tour")
    .map((order) => {
      const laundryItems = enabledItemsForOrder(order).filter((item) => item.category !== "Putzerei");
      const washItems = laundryItems.filter((item) => WASH_CATEGORIES.includes(item.category));
      const washedItems = washItems.filter((item) => item.washed_at);
      const latestWashedAt = washedItems.map((item) => item.washed_at).filter(Boolean).sort().at(-1) || null;
      return {
        ...order,
        groups: getOrderCategories(order.id).join(", ") || "-",
        washed: washedItems.length,
        washTotal: washItems.length,
        latestWashedAt,
      };
    });
  const todayKey = new Date().toISOString().slice(0, 10);

  function monitorDetailItems(order) {
    if (!order) return [];
    return enabledItemsForOrder(order).filter((item) => item.category !== "Putzerei");
  }

  function monitorDetailGroups(order) {
    return Object.values(
      monitorDetailItems(order).reduce((acc, item) => {
        const key = item.category || "Sonstiges";
        if (!acc[key]) acc[key] = { category: key, items: [] };
        acc[key].items.push(item);
        return acc;
      }, {})
    );
  }

  async function finishMonitorItem(item) {
    if (!item || item.is_done) return;

    const doneAt = new Date().toISOString();
    const order = orders.find((o) => o.id === item.order_id);
    if (!order) return;

    const { error } = await supabase
      .from("order_categories")
      .update({
        is_done: true,
        done_at: doneAt,
        washed_at: item.washed_at || doneAt,
      })
      .eq("id", item.id);

    if (error) {
      alert("Artikel konnte nicht auf fertig gesetzt werden: " + error.message);
      return;
    }

    const orderItems = enabledItemsForOrder(order).map((row) =>
      row.id === item.id ? { ...row, is_done: true, done_at: doneAt, washed_at: row.washed_at || doneAt } : row
    );
    const allDone = orderItems.filter((row) => row.category !== "Putzerei").every((row) => row.is_done);

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_done: true, done_at: doneAt, washed_at: row.washed_at || doneAt } : row
      )
    );

    if (allDone) {
      const acceptedAt = new Date(order.created_at);
      const completedAt = new Date(doneAt);
      const duration = Math.max(0, Math.round((completedAt - acceptedAt) / 60000));

      await supabase.from("orders").update({ status: "fertig", completed_at: doneAt }).eq("id", item.order_id);
      await supabase.from("containers").update({ status: "fertig" }).eq("order_id", item.order_id);

      if (order.status !== "fertig") {
        await supabase.from("order_history").insert({
          order_id: order.id,
          customer_number: order.customer_number,
          customer_name: order.customer_name,
          accepted_at: order.created_at,
          completed_at: doneAt,
          duration_minutes: duration,
        });
      }
    }

    loadAll();
  }
  
  async function removeTourCustomer(orderId) {
    if (!window.confirm("Kunde von der Tour entfernen?")) return;

    await supabase
      .from("orders")
      .update({
        status: "archiviert",
      })
      .eq("id", orderId);

    loadAll();
  }

  async function removeWholeTour(tourNumber) {
    if (!window.confirm(`Gesamte Tour ${tourNumber} löschen?`)) return;

    const ids = tourRows
      .filter((r) => String(r.tour_number || "") === String(tourNumber))
      .map((r) => r.id);

    if (!ids.length) return;

    await supabase
      .from("orders")
      .update({
        status: "archiviert",
      })
      .in("id", ids);

    loadAll();
  }

const tourColumns = Object.entries(
    tourRows
      .reduce((acc, row) => {
        const tour = row.tour_number || "Ohne Tour";
        if (!acc[tour]) acc[tour] = [];
        acc[tour].push(row);
        return acc;
      }, {})
  )
    .sort(([a], [b]) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b), "de", { numeric: true });
    })
    .map(([tour, rows]) => ({
      tour,
      rows: rows.sort((a, b) => String(a.customer_number).localeCompare(String(b.customer_number), "de", { numeric: true })),
    }));
  const sortedProductionOrders = [...sortedOrders].sort((a, b) => {
    const aTour = a.status === "auf_tour" ? Number(a.tour_number || 999999) : -1;
    const bTour = b.status === "auf_tour" ? Number(b.tour_number || 999999) : -1;

    if (a.status === "auf_tour" && b.status === "auf_tour" && aTour !== bTour) return aTour - bTour;
    if (a.status === "auf_tour" && b.status !== "auf_tour") return 1;
    if (a.status !== "auf_tour" && b.status === "auf_tour") return -1;

    const sa = Number(a.sort_order || 0);
    const sb = Number(b.sort_order || 0);
    if (sa !== sb) return sa - sb;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  const stationOrders = useMemo(() => {
    return [...sortedOrders]
      .sort((a, b) =>
        String(a.customer_number).localeCompare(
          String(b.customer_number),
          "de",
          { numeric: true }
        )
      )
      .filter((order) => {
      const related = enabledItemsForOrder(order).filter((i) => activeStation.items.includes(i.subcategory) && i.washed_at);
      if (!related.length) return false;

      if (
        stationSearch &&
        !order.customer_number.includes(stationSearch) &&
        !order.customer_name.toLowerCase().includes(stationSearch.toLowerCase())
      ) {
        return false;
      }

      const stationDone = related.length > 0 && related.every((i) => i.is_done);

      if (stationDone) {
        const latestDoneAt = Math.max(
          ...related.map((i) => (i.done_at ? new Date(i.done_at).getTime() : 0))
        );

        if (!latestDoneAt) return false;

        return Date.now() - latestDoneAt < 5000;
      }

      return true;
    });
  }, [sortedOrders, items, articleSettings, activeStation, stationSearch, tick]);

  const statsRows = history.filter((h) => {
    const d = h.completed_at ? h.completed_at.slice(0, 10) : "";
    const t = h.completed_at ? fmtTime(h.completed_at) : "";
    return d === statsDate && t >= statsFrom && t <= statsTo;
  });


  function getCustomerProductionStatus(order) {
    const enabled = enabledItemsForOrder(order);
    const laundryEnabled = enabled.filter((i) => i.category !== "Putzerei");
    const packDone = laundryEnabled.length > 0 && laundryEnabled.every((i) => i.is_done);

    const washRelevant = laundryEnabled.filter((i) => WASH_CATEGORIES.includes(i.category));
    const washDone = washRelevant.length === 0 || washRelevant.every((i) => i.washed_at);

    if (order.status === "auf_tour") return { label: "Auf der Tour", className: "bg-violet-100 text-violet-800 border-violet-300" };
    if (packDone) return { label: "Fertig", className: "bg-green-100 text-green-800 border-green-300" };
    if (washDone) return { label: "Gewaschen", className: "bg-blue-100 text-blue-800 border-blue-300" };
    return { label: "Übernommen", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  }

  function getCustomerStatusDetails(order) {
    const enabled = enabledItemsForOrder(order);
    const laundryEnabled = enabled.filter((i) => i.category !== "Putzerei");
    const putzereiItems = enabled.filter((i) => i.category === "Putzerei");
    const washRelevant = laundryEnabled.filter((i) => WASH_CATEGORIES.includes(i.category));
    const washed = washRelevant.filter((i) => i.washed_at).length;
    const packed = laundryEnabled.filter((i) => i.is_done).length;
    const putzereiDone = putzereiItems.filter((i) => i.is_done).length;

    return {
      washed,
      washTotal: washRelevant.length,
      packed,
      packTotal: laundryEnabled.length,
      putzereiDone,
      putzereiTotal: putzereiItems.length,
      putzereiOpen: putzereiItems.length > 0 && putzereiDone < putzereiItems.length,
    };
  }

  function getCustomerProductionStatusWithTime(order) {
    const enabled = enabledItemsForOrder(order);
    const laundryEnabled = enabled.filter((i) => i.category !== "Putzerei");
    const packDone = laundryEnabled.length > 0 && laundryEnabled.every((i) => i.is_done);
    const washRelevant = laundryEnabled.filter((i) => WASH_CATEGORIES.includes(i.category));
    const washDone = washRelevant.length === 0 || washRelevant.every((i) => i.washed_at);
    const latestWashedAt = washRelevant.map((i) => i.washed_at).filter(Boolean).sort().at(-1);
    const latestDoneAt = laundryEnabled.map((i) => i.done_at).filter(Boolean).sort().at(-1);
    const finishedAt = order.completed_at || latestDoneAt;

    if (order.status === "auf_tour") return { key: "auf_tour", label: "Auf der Tour", changedAt: finishedAt || latestWashedAt || order.created_at, className: "bg-violet-100 text-violet-800 border-violet-300" };
    if (packDone) return { key: "fertig", label: "Fertig", changedAt: finishedAt || order.created_at, className: "bg-green-100 text-green-800 border-green-300" };
    if (washDone) return { key: "gewaschen", label: "Gewaschen", changedAt: latestWashedAt || order.created_at, className: "bg-blue-100 text-blue-800 border-blue-300" };
    return { key: "uebernommen", label: "Uebernommen", changedAt: order.created_at, className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  }

  async function archiveProductionOrder(order) {
    if (!window.confirm(`${order.customer_number} ${order.customer_name} wirklich ausblenden/archivieren?`)) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from("orders").update({ status: "archiviert", completed_at: now }).eq("id", order.id);
    if (error) {
      alert("Auftrag konnte nicht archiviert werden: " + error.message);
      return;
    }

    await supabase.from("containers").update({ removed_at: now }).eq("order_id", order.id).is("removed_at", null);
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setContainers((prev) => prev.filter((c) => c.order_id !== order.id));
    scheduleLoadAll(1000);
  }

  async function deleteProductionOrdersInRange() {
    const fromDate = new Date(leitungDeleteFrom);
    const toDate = new Date(leitungDeleteTo);
    if (!leitungDeleteFrom || !leitungDeleteTo || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      alert("Bitte Von und Bis mit Datum und Uhrzeit vollständig eingeben.");
      return;
    }
    if (fromDate > toDate) {
      alert("Der Von-Zeitpunkt muss vor dem Bis-Zeitpunkt liegen.");
      return;
    }

    setLeitungDeleteBusy(true);
    try {
      const { data: matchingOrders, error: selectError } = await supabase
        .from("orders")
        .select("id, customer_number, customer_name, created_at")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .order("created_at", { ascending: true });

      if (selectError) throw selectError;
      if (!matchingOrders?.length) {
        alert("In diesem Zeitraum wurden keine Kundenaufträge gefunden.");
        return;
      }

      const fromLabel = fromDate.toLocaleString("de-AT");
      const toLabel = toDate.toLocaleString("de-AT");
      if (!window.confirm(
        `${matchingOrders.length} Kundenaufträge von ${fromLabel} bis ${toLabel} endgültig löschen?\n\nArtikelzeilen, Container und Historieneinträge dieser Aufträge werden ebenfalls gelöscht.`
      )) return;

      const ids = matchingOrders.map((order) => order.id);
      const chunks = [];
      for (let index = 0; index < ids.length; index += 150) chunks.push(ids.slice(index, index + 150));

      for (const chunk of chunks) {
        for (const table of ["order_history", "containers", "order_categories", "orders"]) {
          const column = table === "orders" ? "id" : "order_id";
          const { error } = await supabase.from(table).delete().in(column, chunk);
          if (error) throw new Error(`${table}: ${error.message}`);
        }
      }

      const deletedIds = new Set(ids);
      setOrders((current) => current.filter((order) => !deletedIds.has(order.id)));
      setItems((current) => current.filter((item) => !deletedIds.has(item.order_id)));
      setContainers((current) => current.filter((container) => !deletedIds.has(container.order_id)));
      setHistory((current) => current.filter((entry) => !deletedIds.has(entry.order_id)));
      setLeitungDeleteModal(false);
      alert(`${ids.length} Kundenaufträge wurden gelöscht.`);
      scheduleLoadAll(1000);
    } catch (error) {
      alert("Kunden konnten nicht vollständig gelöscht werden: " + (error?.message || String(error)));
    } finally {
      setLeitungDeleteBusy(false);
    }
  }

  async function changeProductionStatus(order, nextStatus) {
    const enabled = enabledItemsForOrder(order);
    const laundryEnabled = enabled.filter((i) => i.category !== "Putzerei");
    const washRelevant = laundryEnabled.filter((i) => WASH_CATEGORIES.includes(i.category));
    const now = new Date().toISOString();

    if (nextStatus === "uebernommen") {
      if (!window.confirm(`${order.customer_number} ${order.customer_name} auf Uebernommen zuruecksetzen? Verpackt/Fertig/Tour wird zurueckgenommen.`)) return;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "uebernommen", completed_at: null, container_count: null, tour_number: null })
        .eq("id", order.id);
      if (orderError) {
        alert("Status konnte nicht geaendert werden: " + orderError.message);
        return;
      }

      if (enabled.length) {
        const { error: itemError } = await supabase
          .from("order_categories")
          .update({ is_done: false, done_at: null })
          .in("id", enabled.map((i) => i.id));
        if (itemError) {
          alert("Artikelstatus konnte nicht geaendert werden: " + itemError.message);
          return;
        }
      }

      await supabase.from("containers").update({ removed_at: null }).eq("order_id", order.id);
    }

    if (nextStatus === "gewaschen") {
      const missingWash = washRelevant.filter((i) => !i.washed_at);
      const { error: orderError } = await supabase.from("orders").update({ status: "uebernommen" }).eq("id", order.id);
      if (orderError) {
        alert("Status konnte nicht geaendert werden: " + orderError.message);
        return;
      }

      if (missingWash.length) {
        const { error: itemError } = await supabase
          .from("order_categories")
          .update({ washed_at: now })
          .in("id", missingWash.map((i) => i.id));
        if (itemError) {
          alert("Waschstatus konnte nicht geaendert werden: " + itemError.message);
          return;
        }
      }
    }

    if (nextStatus === "fertig") {
      const openItems = laundryEnabled.filter((i) => !i.is_done);
      const { error: orderError } = await supabase.from("orders").update({ status: "fertig", completed_at: now }).eq("id", order.id);
      if (orderError) {
        alert("Status konnte nicht geaendert werden: " + orderError.message);
        return;
      }

      if (openItems.length) {
        const { error: itemError } = await supabase
          .from("order_categories")
          .update({ is_done: true, done_at: now })
          .in("id", openItems.map((i) => i.id));
        if (itemError) {
          alert("Artikelstatus konnte nicht geaendert werden: " + itemError.message);
          return;
        }
      }
    }

    if (nextStatus === "auf_tour") {
      const { error } = await supabase
        .from("orders")
        .update({ status: "auf_tour", completed_at: now, container_count: null, tour_number: null })
        .eq("id", order.id);
      if (error) {
        alert("Status konnte nicht geaendert werden: " + error.message);
        return;
      }

      await supabase.from("containers").update({ removed_at: now }).eq("order_id", order.id).is("removed_at", null);
    }

    await loadAll();
  }

  const productionRows = sortedOrders
    .map((order) => ({ order, status: getCustomerProductionStatusWithTime(order), details: getCustomerStatusDetails(order) }))
    .filter(({ status }) => {
      if (leitungStatusFilter !== "alle" && status.key !== leitungStatusFilter) return false;

      const dateKey = status.changedAt ? String(status.changedAt).slice(0, 10) : "";
      const from = leitungDateFrom || "0000-01-01";
      const to = leitungDateTo || "9999-12-31";
      return dateKey >= from && dateKey <= to;
    })
    .sort((a, b) => {
      if (leitungSort === "customer_asc" || leitungSort === "customer_desc") {
        const result = String(a.order.customer_number).localeCompare(String(b.order.customer_number), "de", { numeric: true });
        if (result !== 0) return leitungSort === "customer_asc" ? result : -result;
      }

      const aTime = a.status.changedAt ? new Date(a.status.changedAt).getTime() : 0;
      const bTime = b.status.changedAt ? new Date(b.status.changedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a.order.customer_number).localeCompare(String(b.order.customer_number), "de", { numeric: true });
    });


  const currentDepartmentConfig = () => PERSONNEL_DEPARTMENTS[personalDepartment] || PERSONNEL_DEPARTMENTS.waescherei;

  const currentSections = () => personnelSectionsByDept[personalDepartment] || currentDepartmentConfig().sections;
  const currentGroups = () => currentDepartmentConfig().groups;
  const currentBaseEmployees = () => personnelEmployeesByDept[personalDepartment] || currentDepartmentConfig().employees;
  const sectionsForDepartment = (department) => personnelSectionsByDept[department] || PERSONNEL_DEPARTMENTS[department]?.sections || [];
  const planForDepartment = (department) => personalPlan[getPersonalKey(personalDate, personalShift, department)] || {};
  const sectionTargetForDepartment = (section, department) => {
    if (!section || section.target?.flexible) return null;
    const strength = personnelDayStrengthByDate[`${department}_${personalDate}`] || "mittel";
    const strengthTargets = section.targetsByStrength?.[strength];
    const shiftTarget = strengthTargets && Object.prototype.hasOwnProperty.call(strengthTargets, personalShift)
      ? strengthTargets[personalShift]
      : section.target?.[personalShift];
    if (shiftTarget === null || shiftTarget === "") return null;
    return Number(shiftTarget ?? section.target?.default ?? 0);
  };
  const currentEmployees = () => {
    const baseEmployees = currentBaseEmployees();
    const sourceDepartment = personalDepartment === "waescherei" ? "putzerei" : "waescherei";
    const transferZone = personalDepartment === "waescherei" ? "waescherei" : "putzerei";
    const sourcePlanKey = getPersonalKey(personalDate, personalShift, sourceDepartment);
    const borrowedNames = personalPlan[sourcePlanKey]?.[transferZone] || [];
    const sourceEmployees = personnelEmployeesByDept[sourceDepartment] || [];
    const existingNames = new Set(baseEmployees.map((employee) => employee.name.toLowerCase()));
    const borrowedEmployees = borrowedNames
      .map((name) => sourceEmployees.find((employee) => employee.name === name))
      .filter((employee) => employee && !existingNames.has(employee.name.toLowerCase()))
      .map((employee) => ({ ...employee, borrowedFrom: sourceDepartment }));

    return [...baseEmployees, ...borrowedEmployees];
  };

  const getPersonnelDayStrengthKey = () => `${personalDepartment}_${personalDate}`;
  const getPersonnelDayStrength = () => personnelDayStrengthByDate[getPersonnelDayStrengthKey()] || "mittel";
  const setPersonnelDayStrength = (strength) => {
    setPersonnelDayStrengthByDate((prev) => ({ ...prev, [getPersonnelDayStrengthKey()]: strength }));
  };

  const getPersonalKey = (date = personalDate, shift = personalShift, dept = personalDepartment) => `${dept}_${date}_${shift}`;

  const getCurrentPersonalPlan = () => personalPlan[getPersonalKey()] || {};

  const getEmployeesInSection = (sectionName) => getCurrentPersonalPlan()[sectionName] || [];

  const getEmployeeAssignment = (employeeName) => {
    const plan = getCurrentPersonalPlan();
    for (const sectionName of Object.keys(plan)) {
      if ((plan[sectionName] || []).includes(employeeName)) return sectionName;
    }
    return null;
  };

  const setEmployeeToSection = (employeeName, sectionName, targetShift = personalShift) => {
    const employee = currentEmployees().find((entry) => entry.name === employeeName);
    const isWorkplace = currentSections().some((section) => section.name === sectionName);
    const noGoWorkplaces = [employee?.noGoWorkplace1, employee?.noGoWorkplace2].filter(Boolean);

    if (isWorkplace && noGoWorkplaces.includes(sectionName)) {
      window.alert(`${employeeName} darf laut Mitarbeiterstamm nicht bei ${sectionName} eingeteilt werden.`);
      return false;
    }

    if (sectionName === "start12") {
      if (personalDepartment !== "waescherei") return false;
      setPersonalPlan((prev) => {
        const updatedPlans = { ...prev };
        PERSONNEL_SHIFTS.forEach((shift) => {
          const key = getPersonalKey(personalDate, shift.key, "waescherei");
          const current = prev[key] || {};
          const next = { ...current };
          const zonesToClear = shift.key === "07-12"
            ? allPlanningZones()
            : ["start12", "urlaub", "za", "krank", "sonstiges", "waescherei", "putzerei"];
          zonesToClear.forEach((zone) => {
            next[zone] = (current[zone] || []).filter((name) => name !== employeeName);
          });
          if (shift.key === "07-12") next.start12 = [...(next.start12 || []), employeeName];
          updatedPlans[key] = next;
        });
        return updatedPlans;
      });
      return true;
    }

    setPersonalPlan((prev) => {
      const allZones = allPlanningZones();
      const globalZones = new Set(["urlaub", "za", "krank", "sonstiges", "waescherei", "putzerei"]);
      const hasGlobalAssignment = PERSONNEL_SHIFTS.some((shift) => {
        const shiftPlan = prev[getPersonalKey(personalDate, shift.key, personalDepartment)] || {};
        return [...globalZones].some((zone) => (shiftPlan[zone] || []).includes(employeeName));
      });
      const applyToAllShifts = globalZones.has(sectionName) || (sectionName === "pool" && hasGlobalAssignment);
      const shiftsToUpdate = applyToAllShifts ? PERSONNEL_SHIFTS.map((shift) => shift.key) : [targetShift];
      const updatedPlans = { ...prev };

      shiftsToUpdate.forEach((shiftKey) => {
        const key = getPersonalKey(personalDate, shiftKey, personalDepartment);
        const current = prev[key] || {};
        const next = {};

        allZones.forEach((zone) => {
          next[zone] = (current[zone] || []).filter((name) => name !== employeeName);
        });

        if (sectionName !== "pool") {
          next[sectionName] = [...(next[sectionName] || []), employeeName];
        }

        updatedPlans[key] = next;
      });

      if (!employee?.borrowedFrom) {
        const counterpartDepartment = personalDepartment === "putzerei" ? "waescherei" : "putzerei";
        shiftsToUpdate.forEach((shiftKey) => {
          const counterpartKey = getPersonalKey(personalDate, shiftKey, counterpartDepartment);
          const counterpartPlan = prev[counterpartKey] || {};
          updatedPlans[counterpartKey] = Object.fromEntries(
            Object.entries(counterpartPlan).map(([zone, names]) => [
              zone,
              Array.isArray(names) ? names.filter((name) => name !== employeeName) : names,
            ])
          );
        });
      }

      return updatedPlans;
    });
    return true;
  };

  const selectPersonnelEmployee = (employeeName) => {
    setSelectedPersonnelEmployee((current) => current === employeeName ? null : employeeName);
  };

  const assignSelectedPersonnelEmployee = (sectionName) => {
    if (!selectedPersonnelEmployee) return;
    if (setEmployeeToSection(selectedPersonnelEmployee, sectionName)) {
      setSelectedPersonnelEmployee(null);
    }
  };

  const getSectionTarget = (section) => {
    if (section.target.flexible) return null;
    const strengthTargets = section.targetsByStrength?.[getPersonnelDayStrength()];
    const shiftTarget = strengthTargets && Object.prototype.hasOwnProperty.call(strengthTargets, personalShift)
      ? strengthTargets[personalShift]
      : section.target?.[personalShift];
    if (shiftTarget === null || shiftTarget === "") return null;
    return Number(shiftTarget ?? section.target?.default ?? 0);
  };

  const getSectionColor = (section) => {
    const target = getSectionTarget(section);
    if (target === null) return "border-slate-300 bg-slate-50";

    const actual = getEmployeesInSection(section.name).length;
    if (actual < target) return "border-yellow-400 bg-yellow-50";
    if (actual > target) return "border-red-400 bg-red-50";
    return "border-green-300 bg-green-50";
  };

  const getEmployeeStatus = (name) => employeeStatus[`${personalDepartment}_${name}`] || "anwesend";

  const cycleEmployeeStatus = (name) => {
    const values = ["anwesend", "krank", "urlaub", "frei"];
    const current = getEmployeeStatus(name);
    const next = values[(values.indexOf(current) + 1) % values.length];
    setEmployeeStatus((prev) => ({ ...prev, [`${personalDepartment}_${name}`]: next }));
  };

  const getPersonalWeekday = () => new Date(`${personalDate}T12:00:00`).getDay();

  const isEmployeeRegularDay = (employee) => {
    const days = Array.isArray(employee.regularDays) ? employee.regularDays : [1, 2, 3, 4, 5];
    return days.includes(getPersonalWeekday());
  };

  const isEmployeeRegularShift = (employee) => {
    const shifts = Array.isArray(employee.regularShifts) ? employee.regularShifts : PERSONNEL_SHIFTS.map((shift) => shift.key);
    return shifts.includes(personalShift);
  };

  const getActiveEmployees = () => currentEmployees().filter(
    (employee) => getEmployeeStatus(employee.name) === "anwesend"
  );

  const getSortedEmployees = (list) =>
    [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true }));

  const getUnassignedEmployees = () => {
    const start12Names = personalDepartment === "waescherei"
      ? personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || []
      : [];
    return getSortedEmployees(
      getActiveEmployees().filter((employee) => !getEmployeeAssignment(employee.name) && !start12Names.includes(employee.name))
    );
  };

  const getEmployeeAssignmentStats = (employeeName) => {
    const counts = {};
    Object.entries(personalPlan)
      .filter(([key]) => key.startsWith(`${personalDepartment}_`))
      .forEach(([, plan]) => {
        currentSections().forEach((section) => {
          if ((plan?.[section.name] || []).includes(employeeName)) {
            counts[section.name] = (counts[section.name] || 0) + 1;
          }
        });
      });

    return Object.entries(counts)
      .map(([section, count]) => ({ section, count }))
      .sort((a, b) => b.count - a.count || a.section.localeCompare(b.section, "de"));
  };

  const openPersonnelEmployeeEditor = (employeeName = null) => {
    const employee = employeeName ? currentBaseEmployees().find((entry) => entry.name === employeeName) : null;
    setEditingEmployeeName(employee?.name || null);
    setEmployeeForm(employee ? {
      name: employee.name,
      hours: employee.hours ?? "",
      preferredWorkplace1: employee.preferredWorkplace1 || "",
      preferredWorkplace2: employee.preferredWorkplace2 || "",
      noGoWorkplace1: employee.noGoWorkplace1 || "",
      noGoWorkplace2: employee.noGoWorkplace2 || "",
      regularDays: Array.isArray(employee.regularDays) ? employee.regularDays : [1, 2, 3, 4, 5],
      regularShifts: Array.isArray(employee.regularShifts) ? employee.regularShifts : PERSONNEL_SHIFTS.map((shift) => shift.key),
    } : {
      ...EMPTY_EMPLOYEE_FORM,
      regularDays: [...EMPTY_EMPLOYEE_FORM.regularDays],
      regularShifts: [...EMPTY_EMPLOYEE_FORM.regularShifts],
    });
    setPersonnelEmployeeModal(true);
  };

  const resetPersonnelEmployeeForm = () => {
    setEditingEmployeeName(null);
    setEmployeeForm({
      ...EMPTY_EMPLOYEE_FORM,
      regularDays: [...EMPTY_EMPLOYEE_FORM.regularDays],
      regularShifts: [...EMPTY_EMPLOYEE_FORM.regularShifts],
    });
  };

  const savePersonnelEmployee = () => {
    const name = employeeForm.name.trim();
    const hoursText = String(employeeForm.hours ?? "").trim();
    const hours = hoursText === "" ? "" : Number(hoursText);

    if (!name) {
      window.alert("Bitte Namen eingeben.");
      return;
    }
    if (hoursText !== "" && Number.isNaN(hours)) {
      window.alert("Wochenstunden bitte als Zahl eingeben.");
      return;
    }
    if (employeeForm.preferredWorkplace1 && employeeForm.preferredWorkplace1 === employeeForm.preferredWorkplace2) {
      window.alert("Bitte zwei unterschiedliche Prioritäten auswählen.");
      return;
    }
    if (employeeForm.noGoWorkplace1 && employeeForm.noGoWorkplace1 === employeeForm.noGoWorkplace2) {
      window.alert("Bitte zwei unterschiedliche No-Go-Arbeitsplätze auswählen.");
      return;
    }
    const priorities = [employeeForm.preferredWorkplace1, employeeForm.preferredWorkplace2].filter(Boolean);
    const noGoWorkplaces = [employeeForm.noGoWorkplace1, employeeForm.noGoWorkplace2].filter(Boolean);
    if (priorities.some((workplace) => noGoWorkplaces.includes(workplace))) {
      window.alert("Eine Priorität kann nicht gleichzeitig als No-Go festgelegt werden.");
      return;
    }
    if (!employeeForm.regularDays.length) {
      window.alert("Bitte mindestens einen Stamm-Arbeitstag auswählen.");
      return;
    }
    if (!employeeForm.regularShifts.length) {
      window.alert("Bitte mindestens eine Stamm-Schicht auswählen.");
      return;
    }
    if (currentBaseEmployees().some((employee) => employee.name.toLowerCase() === name.toLowerCase() && employee.name !== editingEmployeeName)) {
      window.alert("Dieser Mitarbeiter existiert bereits.");
      return;
    }

    const savedEmployee = normalizePersonnelEmployee({
      name,
      hours,
      preferredWorkplace1: employeeForm.preferredWorkplace1,
      preferredWorkplace2: employeeForm.preferredWorkplace2,
      noGoWorkplace1: employeeForm.noGoWorkplace1,
      noGoWorkplace2: employeeForm.noGoWorkplace2,
      regularDays: [...employeeForm.regularDays].sort(),
      regularShifts: [...employeeForm.regularShifts],
    });

    setPersonnelEmployeesByDept((prev) => {
      const existing = prev[personalDepartment] || [];
      const next = editingEmployeeName
        ? existing.map((employee) => employee.name === editingEmployeeName ? savedEmployee : employee)
        : [...existing, savedEmployee];
      return { ...prev, [personalDepartment]: getSortedEmployees(next) };
    });

    if (editingEmployeeName) {
      setPersonalPlan((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, plan]) => {
          next[key] = {};
          Object.entries(plan || {}).forEach(([section, names]) => {
            const renamedNames = (names || []).map((assignedName) => assignedName === editingEmployeeName ? name : assignedName);
            const isNoGoSection = key.startsWith(`${personalDepartment}_`)
              && [savedEmployee.noGoWorkplace1, savedEmployee.noGoWorkplace2].filter(Boolean).includes(section);
            next[key][section] = isNoGoSection
              ? renamedNames.filter((assignedName) => assignedName !== name)
              : renamedNames;
          });
        });
        return next;
      });

      if (editingEmployeeName !== name) {
        setEmployeeStatus((prev) => {
          const next = { ...prev };
          const oldKey = `${personalDepartment}_${editingEmployeeName}`;
          const newKey = `${personalDepartment}_${name}`;
          if (Object.prototype.hasOwnProperty.call(next, oldKey)) next[newKey] = next[oldKey];
          delete next[oldKey];
          return next;
        });
      }
    }

    resetPersonnelEmployeeForm();
  };

  const openPersonnelDepartmentEditor = () => {
    setDepartmentDraft(currentSections().map((section) => ({
      id: section.id,
      name: section.name,
      targetsByStrength: Object.fromEntries(PERSONNEL_DAY_STRENGTHS.map((strength) => [
        strength.key,
        Object.fromEntries(PERSONNEL_SHIFTS.map((shift) => [
          shift.key,
          section.targetsByStrength?.[strength.key]?.[shift.key] ?? section.target?.[shift.key] ?? "",
        ])),
      ])),
    })));
    setPersonnelDepartmentModal(true);
  };

  const savePersonnelDepartments = () => {
    const cleaned = departmentDraft.map((section) => {
      const targetsByStrength = Object.fromEntries(PERSONNEL_DAY_STRENGTHS.map((strength) => [
        strength.key,
        Object.fromEntries(PERSONNEL_SHIFTS.map((shift) => {
          const rawValue = section.targetsByStrength?.[strength.key]?.[shift.key];
          return [shift.key, rawValue === "" || rawValue === null ? null : Number(rawValue)];
        })),
      ]));

      return {
        id: section.id,
        name: section.name.trim(),
        target: { ...targetsByStrength.mittel },
        targetsByStrength,
      };
    });

    if (!cleaned.length) {
      window.alert("Mindestens eine Abteilung muss bestehen bleiben.");
      return;
    }
    if (cleaned.some((section) => !section.name)) {
      window.alert("Jede Abteilung benötigt einen Namen.");
      return;
    }
    if (new Set(cleaned.map((section) => section.name.toLowerCase())).size !== cleaned.length) {
      window.alert("Jeder Abteilungsname darf nur einmal vorkommen.");
      return;
    }
    if (cleaned.some((section) => Object.values(section.targetsByStrength).some((targets) =>
      Object.values(targets).some((value) => value !== null && (!Number.isFinite(value) || value < 0))
    ))) {
      window.alert("Soll-Personen bitte als positive Zahl oder 0 eingeben.");
      return;
    }

    const oldSections = currentSections();
    const renames = oldSections
      .map((section) => ({
        oldName: section.name,
        newName: cleaned.find((entry) => entry.id === section.id)?.name || section.name,
        exists: cleaned.some((entry) => entry.id === section.id),
      }))
      .filter(({ exists }) => exists)
      .filter(({ oldName, newName }) => oldName !== newName);
    const deletedNames = oldSections
      .filter((section) => !cleaned.some((entry) => entry.id === section.id))
      .map((section) => section.name);

    setPersonnelSectionsByDept((prev) => ({ ...prev, [personalDepartment]: cleaned }));

    if (renames.length || deletedNames.length) {
      setPersonalPlan((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, plan]) => {
          if (!key.startsWith(`${personalDepartment}_`)) {
            next[key] = plan;
            return;
          }
          const nextPlan = { ...(plan || {}) };
          renames.forEach(({ oldName, newName }) => {
            const oldNames = Array.isArray(nextPlan[oldName]) ? nextPlan[oldName] : [];
            const newNames = Array.isArray(nextPlan[newName]) ? nextPlan[newName] : [];
            nextPlan[newName] = [...new Set([...newNames, ...oldNames])];
            delete nextPlan[oldName];
          });
          deletedNames.forEach((deletedName) => delete nextPlan[deletedName]);
          next[key] = nextPlan;
        });
        return next;
      });

      setPersonnelEmployeesByDept((prev) => ({
        ...prev,
        [personalDepartment]: (prev[personalDepartment] || []).map((employee) => {
          const preferred1 = renames.find((rename) => rename.oldName === employee.preferredWorkplace1)?.newName || employee.preferredWorkplace1;
          const preferred2 = renames.find((rename) => rename.oldName === employee.preferredWorkplace2)?.newName || employee.preferredWorkplace2;
          const noGo1 = renames.find((rename) => rename.oldName === employee.noGoWorkplace1)?.newName || employee.noGoWorkplace1;
          const noGo2 = renames.find((rename) => rename.oldName === employee.noGoWorkplace2)?.newName || employee.noGoWorkplace2;
          return {
            ...employee,
            preferredWorkplace1: deletedNames.includes(preferred1) ? "" : preferred1,
            preferredWorkplace2: deletedNames.includes(preferred2) ? "" : preferred2,
            noGoWorkplace1: deletedNames.includes(noGo1) ? "" : noGo1,
            noGoWorkplace2: deletedNames.includes(noGo2) ? "" : noGo2,
          };
        }),
      }));
    }

    setPersonnelDepartmentModal(false);
  };

  const copyWholePersonalDay = () => {
    if (!copyPersonalDate) {
      window.alert("Bitte Kopierdatum auswählen.");
      return;
    }

    if (!window.confirm(`Einteilung vom ${copyPersonalDate} auf ${personalDate} kopieren?`)) return;

    setPersonalPlan((prev) => {
      const next = { ...prev };

      PERSONNEL_SHIFTS.forEach((shift) => {
        const sourceKey = getPersonalKey(copyPersonalDate, shift.key);
        const targetKey = getPersonalKey(personalDate, shift.key);
        if (prev[sourceKey]) {
          next[targetKey] = JSON.parse(JSON.stringify(prev[sourceKey]));
        }
      });

      return next;
    });
  };

  const addPersonnelEmployee = () => {
    const name = newEmployeeName.trim();
    const hoursText = newEmployeeHours.trim();

    if (!name) {
      window.alert("Bitte Namen eingeben.");
      return;
    }

    if (currentEmployees().some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      window.alert("Dieser Mitarbeiter existiert bereits.");
      return;
    }

    const hours = hoursText === "" ? "" : Number(hoursText);
    if (hoursText !== "" && Number.isNaN(hours)) {
      window.alert("Wochenstunden bitte als Zahl eingeben.");
      return;
    }

    setPersonnelEmployeesByDept((prev) => ({
      ...prev,
      [personalDepartment]: [...(prev[personalDepartment] || []), { name, hours }].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "de", { numeric: true })
      ),
    }));

    setNewEmployeeName("");
    setNewEmployeeHours("");
  };

  const editPersonnelEmployee = (oldName) => {
    const emp = currentEmployees().find((e) => e.name === oldName);
    if (!emp) return;

    const nextName = window.prompt("Name bearbeiten:", emp.name);
    if (nextName === null) return;

    const cleanName = nextName.trim();
    if (!cleanName) {
      window.alert("Name darf nicht leer sein.");
      return;
    }

    if (cleanName !== oldName && currentEmployees().some((e) => e.name.toLowerCase() === cleanName.toLowerCase())) {
      window.alert("Dieser Name existiert bereits.");
      return;
    }

    const nextHoursText = window.prompt("Wochenstunden bearbeiten:", emp.hours ?? "");
    if (nextHoursText === null) return;

    const hoursClean = String(nextHoursText).trim();
    const nextHours = hoursClean === "" ? "" : Number(hoursClean);

    if (hoursClean !== "" && Number.isNaN(nextHours)) {
      window.alert("Wochenstunden bitte als Zahl eingeben.");
      return;
    }

    setPersonnelEmployeesByDept((prev) => ({
      ...prev,
      [personalDepartment]: (prev[personalDepartment] || [])
        .map((e) => (e.name === oldName ? { name: cleanName, hours: nextHours } : e))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true })),
    }));

    setPersonalPlan((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, plan]) => {
        next[key] = {};
        Object.entries(plan || {}).forEach(([section, names]) => {
          next[key][section] = (names || []).map((name) => (name === oldName ? cleanName : name));
        });
      });
      return next;
    });

    setEmployeeStatus((prev) => {
      const next = { ...prev };
      const oldStatusKey = `${personalDepartment}_${oldName}`;
      const newStatusKey = `${personalDepartment}_${cleanName}`;
      if (Object.prototype.hasOwnProperty.call(next, oldStatusKey)) {
        next[newStatusKey] = next[oldStatusKey];
        delete next[oldStatusKey];
      }
      return next;
    });
  };

  const deletePersonnelEmployee = (name) => {
    if (!window.confirm(`${name} wirklich löschen?`)) return;

    setPersonnelEmployeesByDept((prev) => ({
      ...prev,
      [personalDepartment]: (prev[personalDepartment] || []).filter((e) => e.name !== name),
    }));

    setPersonalPlan((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, plan]) => {
        next[key] = {};
        Object.entries(plan || {}).forEach(([section, names]) => {
          next[key][section] = (names || []).filter((n) => n !== name);
        });
      });
      return next;
    });

    setEmployeeStatus((prev) => {
      const next = { ...prev };
      delete next[`${personalDepartment}_${name}`];
      return next;
    });
  };

  const exchangeEmployeeDepartment = () => {
    if (!exchangeEmployeeName) {
      window.alert("Bitte Mitarbeiter auswählen.");
      return;
    }

    if (!exchangeTargetDept || exchangeTargetDept === personalDepartment) {
      window.alert("Bitte andere Abteilung auswählen.");
      return;
    }

    const emp = currentEmployees().find((e) => e.name === exchangeEmployeeName);
    if (!emp) return;

    if (!window.confirm(`${emp.name} zu ${PERSONNEL_DEPARTMENTS[exchangeTargetDept].label} verschieben?`)) return;

    setPersonnelEmployeesByDept((prev) => {
      const sourceList = (prev[personalDepartment] || []).filter((e) => e.name !== emp.name);
      const targetListRaw = prev[exchangeTargetDept] || PERSONNEL_DEPARTMENTS[exchangeTargetDept].employees;
      const alreadyThere = targetListRaw.some((e) => e.name.toLowerCase() === emp.name.toLowerCase());
      const targetList = alreadyThere ? targetListRaw : [...targetListRaw, emp];

      return {
        ...prev,
        [personalDepartment]: sourceList.sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true })),
        [exchangeTargetDept]: targetList.sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true })),
      };
    });

    setPersonalPlan((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, plan]) => {
        next[key] = {};
        Object.entries(plan || {}).forEach(([section, names]) => {
          next[key][section] = (names || []).filter((n) => n !== emp.name);
        });
      });
      return next;
    });

    setExchangeEmployeeName("");
  };

  
  const allPlanningZones = () => [
    ...currentSections().map((section) => section.name),
    "start12",
    "urlaub",
    "za",
    "krank",
    "sonstiges",
    "waescherei",
    "putzerei",
  ];

  const applyPersonnelSuggestions = () => {
    const currentKey = getPersonalKey();
    const currentPlan = personalPlan[currentKey] || {};
    const start12Names = personalDepartment === "waescherei"
      ? personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || []
      : [];

    const nextPlan = {
      ...(personalDepartment === "waescherei" && personalShift === "07-12" ? { start12: [...start12Names] } : {}),
      urlaub: [...(currentPlan.urlaub || [])],
      za: [...(currentPlan.za || [])],
      krank: [...(currentPlan.krank || [])],
      sonstiges: [...(currentPlan.sonstiges || [])],
      waescherei: [...(currentPlan.waescherei || [])],
      putzerei: [...(currentPlan.putzerei || [])],
    };

    currentSections().forEach((section) => {
      nextPlan[section.name] = [];
    });

    const unavailable = new Set([
      ...nextPlan.urlaub,
      ...nextPlan.za,
      ...nextPlan.krank,
      ...nextPlan.sonstiges,
      ...nextPlan.waescherei,
      ...nextPlan.putzerei,
      ...(personalDepartment === "waescherei" && personalShift === "07-12" ? start12Names : []),
    ]);

    const historyPlans = Object.entries(personalPlan)
      .filter(([key]) => key.startsWith(`${personalDepartment}_`) && key !== currentKey)
      .map(([, plan]) => plan || {});

    const historyByEmployee = {};
    currentEmployees().forEach((employee) => {
      const sectionCounts = {};
      currentSections().forEach((section) => {
        sectionCounts[section.name] = historyPlans.reduce(
          (count, plan) => count + ((plan[section.name] || []).includes(employee.name) ? 1 : 0),
          0
        );
      });
      const mostAssigned = Object.entries(sectionCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))[0];
      historyByEmployee[employee.name] = {
        sectionCounts,
        mostAssignedSection: mostAssigned?.[1] > 0 ? mostAssigned[0] : "",
      };
    });

    const assigned = new Set(unavailable);

    currentSections().forEach((section) => {
      const target = getSectionTarget(section);
      if (target === null || target <= 0) return;

      const candidates = currentEmployees()
        .filter((emp) => getEmployeeStatus(emp.name) === "anwesend")
        .filter((emp) => isEmployeeRegularDay(emp))
        .filter((emp) => isEmployeeRegularShift(emp))
        .filter((emp) => !assigned.has(emp.name))
        .filter((emp) => emp.noGoWorkplace1 !== section.name && emp.noGoWorkplace2 !== section.name)
        .map((emp) => {
          let score = 0;
          const history = historyByEmployee[emp.name];

          if (emp.preferredWorkplace1 === section.name) score += 1000;
          else if (emp.preferredWorkplace1) score -= 120;

          if (emp.preferredWorkplace2 === section.name) score += 600;
          else if (emp.preferredWorkplace2) score -= 40;

          score += (history?.sectionCounts?.[section.name] || 0) * 30;
          if (history?.mostAssignedSection === section.name) score += 180;

          return { emp, score };
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(a.emp.name).localeCompare(String(b.emp.name), "de", { numeric: true });
        });

      candidates.slice(0, target).forEach(({ emp }) => {
        nextPlan[section.name].push(emp.name);
        assigned.add(emp.name);
      });
    });

    setPersonalPlan((prev) => ({
      ...prev,
      [currentKey]: nextPlan,
    }));
  };

  const absenceStatsRows = () => {
    const from = personalStatsFrom || new Date().toISOString().slice(0, 10);
    const to = personalStatsTo || from;

    const byDate = {};

    Object.entries(personalPlan)
      .filter(([key]) => key.startsWith(`${personalDepartment}_`))
      .forEach(([key, plan]) => {
        const parts = key.split("_");
        const date = parts[1];

        if (!date || date < from || date > to) return;

        if (!byDate[date]) {
          byDate[date] = {
            date,
            urlaubNames: new Set(),
            zaNames: new Set(),
            krankNames: new Set(),
          };
        }

        (plan?.urlaub || []).forEach((name) => byDate[date].urlaubNames.add(name));
        (plan?.za || []).forEach((name) => byDate[date].zaNames.add(name));
        (plan?.krank || []).forEach((name) => byDate[date].krankNames.add(name));
      });

    return Object.values(byDate)
      .map((row) => ({
        date: row.date,
        urlaub: row.urlaubNames.size,
        za: row.zaNames.size,
        krank: row.krankNames.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const printAbsenceStats = () => {
    const rows = absenceStatsRows();
    const htmlRows = rows.map((r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.urlaub}</td>
        <td>${r.za}</td>
        <td>${r.krank}</td>
      </tr>
    `).join("");

    const deptLabel = currentDepartmentConfig().label;
    const html = `
      <html>
        <head>
          <title>Personalstatistik</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            h1 { margin: 0 0 8px 0; }
            .meta { margin-bottom: 18px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #e5e7eb; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; }
          </style>
        </head>
        <body>
          <h1>Personalstatistik ${deptLabel}</h1>
          <div class="meta">Zeitraum: ${personalStatsFrom} bis ${personalStatsTo}</div>
          <table>
            <thead><tr><th>Datum</th><th>Urlaub</th><th>ZA</th><th>Krank</th></tr></thead>
            <tbody>${htmlRows}</tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Druckfenster wurde vom Browser blockiert.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };


  const clearPersonalPlanSafe = () => {
    if (!window.confirm("Personalplanung für diese Schicht wirklich leeren?")) return;

    setPersonalPlan((prev) => {
      const next = { ...prev };
      delete next[getPersonalKey()];
      return next;
    });
  };

  const copyPreviousShiftSafe = () => {
    const idx = PERSONNEL_SHIFTS.findIndex((s) => s.key === personalShift);
    const previousShift = idx > 0 ? PERSONNEL_SHIFTS[idx - 1].key : "07-12";
    const source = personalPlan[getPersonalKey(personalDate, previousShift)];

    if (!source) {
      window.alert("Für die vorherige Schicht ist kein Plan vorhanden.");
      return;
    }

    const { start12: _start12, ...sourceWithoutStart12 } = source;
    setPersonalPlan((prev) => ({ ...prev, [getPersonalKey()]: sourceWithoutStart12 }));
  };

  const printPersonalPlanSafe = () => {
    const plan = getCurrentPersonalPlan();
    const shiftLabel = PERSONNEL_SHIFTS.find((s) => s.key === personalShift)?.label || personalShift;

    const rows = currentSections().map((section) => {
      const names = plan[section.name] || [];
      const target = getSectionTarget(section);
      return `<tr><td>${section.name}</td><td>${target === null ? "bei Bedarf" : target}</td><td>${names.join(", ")}</td></tr>`;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Personalplanung</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            h1 { margin: 0 0 8px 0; }
            .meta { margin-bottom: 18px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #e5e7eb; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>DieTex Personalplanung</h1>
          <div class="meta">Datum: ${personalDate} | Schicht: ${shiftLabel}</div>
          <table>
            <thead><tr><th>Bereich</th><th>Soll</th><th>Mitarbeiter</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Druckfenster wurde vom Browser blockiert.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const exportPersonalPlanImage = async () => {
    const plan = getCurrentPersonalPlan();
    const departmentLabel = currentDepartmentConfig().label;
    const shiftLabel = PERSONNEL_SHIFTS.find((shift) => shift.key === personalShift)?.label || personalShift;
    const canvasWidth = 1600;
    const horizontalPadding = 70;
    const contentWidth = canvasWidth - horizontalPadding * 2;
    const titleColumnWidth = 360;
    const targetColumnWidth = 150;
    const namesColumnWidth = contentWidth - titleColumnWidth - targetColumnWidth;
    const lineHeight = 32;

    const sectionGroups = personalDepartment === "waescherei"
      ? [
          { title: "Schmutzwäscheabteilung", names: ["Übernahme", "Waschstraßen", "Waschmaschinen"] },
          { title: "Finishabteilung", names: ["Absortierung", "Mangel 1", "Mangel 2", "Frottee 1", "BM + SPLT"] },
          { title: "Fertigstellung", names: ["Jenway Großteile", "Jenway Kleinteile", "Jenway Frottee", "Poolwäsche", "Expedit"] },
          { title: "Weitere Abteilungen", names: currentSections()
            .filter((section) => !["Übernahme", "Waschstraßen", "Waschmaschinen", "Absortierung", "Mangel 1", "Mangel 2", "Frottee 1", "BM + SPLT", "Jenway Großteile", "Jenway Kleinteile", "Jenway Frottee", "Poolwäsche", "Expedit"].includes(section.name))
            .map((section) => section.name) },
        ]
      : [{ title: "Putzerei", names: currentSections().map((section) => section.name) }];

    const specialZones = [
      { key: "pool", title: "Nicht eingeteilt", names: getUnassignedEmployees().map((employee) => employee.name) },
      ...(personalDepartment === "waescherei" ? [{
        key: "start12",
        title: "Start 12 Uhr",
        names: personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || [],
      }] : []),
      { key: "urlaub", title: "Urlaub", names: plan.urlaub || [] },
      { key: "za", title: "ZA", names: plan.za || [] },
      { key: "krank", title: "Krank", names: plan.krank || [] },
      { key: "sonstiges", title: "Büro/Tour/Sonstiges", names: plan.sonstiges || [] },
      ...(personalDepartment === "waescherei" ? [{ key: "putzerei", title: "Putzerei", names: plan.putzerei || [] }] : []),
      ...(personalDepartment === "putzerei" ? [{ key: "waescherei", title: "Wäscherei", names: plan.waescherei || [] }] : []),
    ];

    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    measureContext.font = "700 27px Arial";

    const wrapText = (context, text, maxWidth) => {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      if (!words.length) return ["-"];
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      return lines;
    };

    const imageRows = [];
    sectionGroups.forEach((group) => {
      const sections = group.names
        .map((name) => currentSections().find((section) => section.name === name))
        .filter(Boolean);
      if (!sections.length) return;
      imageRows.push({ type: "group", title: group.title });
      sections.forEach((section) => {
        const names = plan[section.name] || [];
        const target = getSectionTarget(section);
        imageRows.push({
          type: "row",
          title: section.name === "Waschstraßen" ? "Waschstraße" : section.name,
          target: target === null ? "Bedarf" : String(target),
          names,
          state: target === null ? "neutral" : names.length < target ? "under" : names.length > target ? "over" : "optimal",
        });
      });
    });
    imageRows.push({ type: "group", title: "Mitarbeiterstatus" });
    specialZones.forEach((zone) => imageRows.push({ type: "row", title: zone.title, target: "", names: zone.names, state: "neutral" }));

    const rowHeights = imageRows.map((row) => {
      if (row.type === "group") return 66;
      const nameLines = wrapText(measureContext, row.names.join(", "), namesColumnWidth - 48);
      return Math.max(74, nameLines.length * lineHeight + 34);
    });
    const canvasHeight = 210 + rowHeights.reduce((sum, height) => sum + height, 0) + 60;
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");

    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#0f172a";
    context.font = "900 54px Arial";
    context.fillText(`DieTex Personalplanung ${departmentLabel}`, horizontalPadding, 82);
    context.fillStyle = "#475569";
    context.font = "700 28px Arial";
    context.fillText(`Datum: ${personalDate}   |   Schicht: ${shiftLabel}   |   Umsatz: ${PERSONNEL_DAY_STRENGTHS.find((entry) => entry.key === getPersonnelDayStrength())?.label || "Mittel"}`, horizontalPadding, 132);

    let y = 172;
    imageRows.forEach((row, index) => {
      const height = rowHeights[index];
      if (row.type === "group") {
        context.fillStyle = "#1d4ed8";
        context.fillRect(horizontalPadding, y + 8, contentWidth, height - 16);
        context.fillStyle = "#ffffff";
        context.font = "900 30px Arial";
        context.fillText(row.title, horizontalPadding + 24, y + 48);
        y += height;
        return;
      }

      const stateColors = {
        under: "#fef3c7",
        optimal: "#dcfce7",
        over: "#fee2e2",
        neutral: "#ffffff",
      };
      context.fillStyle = stateColors[row.state] || stateColors.neutral;
      context.strokeStyle = "#cbd5e1";
      context.lineWidth = 2;
      context.fillRect(horizontalPadding, y, contentWidth, height - 6);
      context.strokeRect(horizontalPadding, y, contentWidth, height - 6);
      context.beginPath();
      context.moveTo(horizontalPadding + titleColumnWidth, y);
      context.lineTo(horizontalPadding + titleColumnWidth, y + height - 6);
      context.moveTo(horizontalPadding + titleColumnWidth + targetColumnWidth, y);
      context.lineTo(horizontalPadding + titleColumnWidth + targetColumnWidth, y + height - 6);
      context.stroke();

      context.fillStyle = "#0f172a";
      context.font = "900 27px Arial";
      context.fillText(row.title, horizontalPadding + 22, y + 45);
      context.textAlign = "center";
      context.fillText(row.target, horizontalPadding + titleColumnWidth + targetColumnWidth / 2, y + 45);
      context.textAlign = "left";
      context.font = "700 27px Arial";
      wrapText(context, row.names.join(", "), namesColumnWidth - 48).forEach((line, lineIndex) => {
        context.fillText(line, horizontalPadding + titleColumnWidth + targetColumnWidth + 24, y + 42 + lineIndex * lineHeight);
      });
      y += height;
    });

    const fileName = `personalplan-${personalDepartment}-${personalDate}-${personalShift}.png`;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) {
      window.alert("Die Bilddatei konnte nicht erstellt werden.");
      return;
    }

    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Personalplan ${departmentLabel} ${personalDate}` });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const imageUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = imageUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
  };

  const sharePersonnelOverviewImage = async () => {
    const canvasWidth = 2400;
    const headerHeight = 150;
    const floorHeight = Math.round(canvasWidth * 2274 / 4638);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = headerHeight + floorHeight;
    const context = canvas.getContext("2d");
    const shiftLabel = PERSONNEL_SHIFTS.find((shift) => shift.key === personalShift)?.label || personalShift;
    const displayDate = new Date(`${personalDate}T12:00:00`).toLocaleDateString("de-AT", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.font = "900 48px Arial";
    context.fillText("DieTex Personalübersicht Wäscherei + Putzerei", 48, 62);
    context.fillStyle = "#475569";
    context.font = "700 30px Arial";
    context.fillText(`${displayDate}   |   ${shiftLabel}`, 48, 112);

    const floorPlanImage = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = personnelFloorPlanUrl;
    });
    context.drawImage(floorPlanImage, 0, headerHeight, canvasWidth, floorHeight);

    const drawTextBox = (text, x, y, options = {}) => {
      const font = options.font || "900 28px Arial";
      const paddingX = options.paddingX ?? 10;
      const paddingY = options.paddingY ?? 7;
      context.font = font;
      const width = context.measureText(text).width + paddingX * 2;
      const height = options.height || 42;
      const left = Math.max(4, Math.min(canvasWidth - width - 4, x));
      context.fillStyle = options.background || "rgba(255,255,255,0.94)";
      context.fillRect(left, y, width, height);
      context.strokeStyle = options.border || "#cbd5e1";
      context.lineWidth = options.lineWidth || 2;
      context.strokeRect(left, y, width, height);
      context.fillStyle = options.color || "#0f172a";
      context.fillText(text, left + paddingX, y + height - paddingY);
      return { width, height, left };
    };

    personnelFloorPlanZones.forEach((zone) => {
      const section = sectionsForDepartment(zone.department).find((entry) => entry.name === zone.section);
      if (!section) return;
      const assigned = planForDepartment(zone.department)[section.name] || [];
      const target = sectionTargetForDepartment(section, zone.department);
      const border = target === null
        ? "#64748b"
        : assigned.length < target
          ? "#eab308"
          : assigned.length > target
            ? "#dc2626"
            : "#16a34a";
      const centerX = zone.x / 100 * canvasWidth;
      const top = headerHeight + zone.y / 100 * floorHeight;
      const title = section.name === "Waschstraßen" ? "Waschstraße" : section.name;
      const titleWidth = context.measureText(title).width + 20;
      const left = centerX - Math.max(120, titleWidth) / 2;
      const titleBox = drawTextBox(title, left, top, { font: "900 20px Arial", height: 34, paddingY: 7, border, lineWidth: 5 });
      assigned.forEach((name, index) => {
        drawTextBox(name, titleBox.left, top + 38 + index * 48, {
          font: "900 30px Arial",
          height: 44,
          paddingY: 7,
          background: zone.department === "waescherei" ? "#dbeafe" : "#ede9fe",
          border: zone.department === "waescherei" ? "#93c5fd" : "#c4b5fd",
        });
      });
    });

    const plans = {
      waescherei: planForDepartment("waescherei"),
      putzerei: planForDepartment("putzerei"),
    };
    const assignedNames = new Set(
      Object.values(plans).flatMap((plan) => Object.values(plan).flatMap((names) => Array.isArray(names) ? names : [])),
    );
    const start12Names = personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || [];
    start12Names.forEach((name) => assignedNames.add(name));
    const unassignedNames = Object.entries(personnelEmployeesByDept)
      .flatMap(([department, employees]) => (employees || [])
        .filter((employee) => (employeeStatus[`${department}_${employee.name}`] || "anwesend") === "anwesend")
      .map((employee) => employee.name))
      .filter((name) => !assignedNames.has(name))
      .sort((a, b) => a.localeCompare(b, "de"));
    const uniqueNames = (names) => [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
    const statusRows = [
      { title: "Start 12 Uhr", names: uniqueNames(start12Names), color: "#ecfdf5", border: "#059669" },
      { title: "Urlaub", names: uniqueNames([...(plans.waescherei.urlaub || []), ...(plans.putzerei.urlaub || [])]), color: "#eff6ff", border: "#3b82f6" },
      { title: "ZA", names: uniqueNames([...(plans.waescherei.za || []), ...(plans.putzerei.za || [])]), color: "#fffbeb", border: "#f59e0b" },
      { title: "Krank", names: uniqueNames([...(plans.waescherei.krank || []), ...(plans.putzerei.krank || [])]), color: "#fef2f2", border: "#ef4444" },
      { title: "Büro/Tour/Sonstiges", names: uniqueNames([...(plans.waescherei.sonstiges || []), ...(plans.putzerei.sonstiges || [])]), color: "#f8fafc", border: "#475569" },
      { title: "Nicht eingeteilt", names: uniqueNames(unassignedNames), color: "#f8fafc", border: "#64748b" },
    ];
    const panelX = 1320;
    const panelY = headerHeight + 55;
    const panelWidth = 1020;
    const cellWidth = panelWidth / 3;
    const cellHeight = 125;
    context.fillStyle = "rgba(255,255,255,0.96)";
    context.fillRect(panelX - 12, panelY - 42, panelWidth + 24, cellHeight * 2 + 58);
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 3;
    context.strokeRect(panelX - 12, panelY - 42, panelWidth + 24, cellHeight * 2 + 58);
    context.fillStyle = "#0f172a";
    context.font = "900 24px Arial";
    context.fillText("Abwesenheiten & Status", panelX, panelY - 10);
    statusRows.forEach((status, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = panelX + column * cellWidth;
      const y = panelY + row * cellHeight;
      context.fillStyle = status.color;
      context.fillRect(x, y, cellWidth - 8, cellHeight - 8);
      context.fillStyle = status.border;
      context.fillRect(x, y, 7, cellHeight - 8);
      context.fillStyle = "#0f172a";
      context.font = "900 20px Arial";
      context.fillText(`${status.title} (${status.names.length})`, x + 16, y + 28);
      context.font = "900 22px Arial";
      const words = (status.names.length ? status.names.join(", ") : "-").split(" ");
      let line = "";
      let lineIndex = 0;
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > cellWidth - 32 && lineIndex < 2) {
          context.fillText(line, x + 16, y + 58 + lineIndex * 27);
          line = word;
          lineIndex += 1;
        } else {
          line = candidate;
        }
      });
      if (lineIndex < 3) context.fillText(line, x + 16, y + 58 + lineIndex * 27);
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
    if (!blob) {
      window.alert("Die Personalübersicht konnte nicht als Bild erstellt werden.");
      return;
    }
    const fileName = `personaluebersicht-${personalDate}-${personalShift}.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Personalübersicht ${displayDate}`,
          text: `Personalübersicht ${shiftLabel}`,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    const imageUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = imageUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
    window.alert("Das Bild wurde heruntergeladen. Auf diesem Gerät ist die direkte WhatsApp-Freigabe nicht verfügbar.");
  };

  function openPinModal(nextView = null) {
    setPinInput("");
    setPinError("");
    setPinModal({ nextView });
  }

  function goToView(nextView) {
    if (externalPersonnelPortal && !["personalplanung", "personalmonitor"].includes(nextView)) {
      setView("personalplanung");
      return;
    }

    if (takeoverMode && !["annahme", "station"].includes(nextView)) {
      setView("annahme");
      return;
    }

    if (isProtectedView(nextView) && !adminUnlocked) {
      openPinModal(nextView);
      return;
    }

    setView(nextView);
  }

  function confirmPin() {
    if (!ADMIN_PIN) {
      setPinError("PIN ist noch nicht in Vercel konfiguriert.");
      return;
    }

    if (pinInput.trim() !== ADMIN_PIN) {
      setPinError("PIN ist falsch.");
      return;
    }

    setAdminUnlocked(true);
    try {
      sessionStorage.setItem("dietexAdminUnlocked", "1");
    } catch {}

    if (pinModal?.nextView) {
      setView(pinModal.nextView);
    }

    setPinModal(null);
    setPinInput("");
    setPinError("");
  }

  function lockAdminArea() {
    setAdminUnlocked(false);
    try {
      sessionStorage.removeItem("dietexAdminUnlocked");
    } catch {}

    if (isProtectedView(view)) {
      setView("annahme");
    }
  }


  function SmallCustomerCard({ row, onClick, pending = false }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`grid w-full grid-cols-[80px_1fr_35px] items-center rounded-lg border bg-white px-3 py-2 text-left text-sm hover:shadow ${
          onClick ? "cursor-pointer" : ""
        } ${pending ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300" : ""}`}
      >
        <span>{row.customer_number}</span>
        <b className="text-[16px] leading-tight break-words whitespace-normal">{row.customer_name}</b>
        <b className="text-right">{row.progressDone}/{row.progressTotal}</b>
        {row.putzereiOpen && (
          <div className="col-span-3 mt-1 inline-flex w-fit rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-800">
            P
          </div>
        )}
        {row.info && <div className="col-span-3 mt-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">ℹ {row.info}</div>}
        {pending && (
          <div className="col-span-3 mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-center text-xs font-black text-white">
            Wird in 5 Sekunden entfernt - erneut antippen zum Abbrechen
          </div>
        )}
      </button>
    );
  }

  function WashCard({ row, category, compact = false, canMoveUp = true, canMoveDown = true }) {
    const washKey = getWashKey(row.id, category);
    const isPending = Boolean(pendingWash[washKey]);
    const categoryIcons = categoryIconsForRow(row);

    return (
      <div
        className={`w-full rounded-xl border ${compact ? "px-2 py-1.5" : "px-3 py-2"} text-left shadow-sm transition ${
          isPending ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300" : "bg-white hover:ring-2 hover:ring-blue-300"
        }`}
      >
        <div className={`grid ${compact ? "grid-cols-[48px_62px_1fr_auto] gap-1.5" : "grid-cols-[58px_84px_1fr_auto] gap-3"} items-center`}>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={() => moveOrder(row, -1, category)}
              className={`${compact ? "h-7 w-5" : "h-9 w-7"} rounded border border-slate-300 bg-slate-100 font-black text-slate-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-25`}
              title="Nach oben verschieben"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={() => moveOrder(row, 1, category)}
              className={`${compact ? "h-7 w-5" : "h-9 w-7"} rounded border border-slate-300 bg-slate-100 font-black text-slate-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-25`}
              title="Nach unten verschieben"
            >
              ↓
            </button>
          </div>
          <div className={`font-mono ${compact ? "text-[12px]" : "text-[15px]"} leading-tight`}>{row.customer_number}</div>
          <button
            type="button"
            onClick={() => washCategory(row, category)}
            className={`text-left font-bold ${compact ? "text-[13px]" : "text-[16px]"} leading-tight break-words whitespace-normal`}
            title={isPending ? "Nochmals antippen = rueckgaengig" : "Antippen = gewaschen"}
          >
            {row.customer_name}
          </button>
          <div className={`${compact ? "min-w-[50px]" : "min-w-[72px]"} flex justify-end gap-1`}>
            {categoryIcons.map(({ cat, icon }) => (
              <span
                key={cat}
                className={`${compact ? "h-5 w-5 text-xs" : "h-7 w-7 text-base"} flex items-center justify-center rounded-full bg-slate-100 font-black`}
                title={cat}
              >
                {icon}
              </span>
            ))}
          </div>
        </div>
        {isPending && (
          <div className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-center text-xs font-black text-white">
            Wird in 5 Sekunden ausgeblendet - erneut antippen zum Abbrechen
          </div>
        )}
        {row.info && (
          <div className="mt-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
            ℹ {row.info}
          </div>
        )}
      </div>
    );
  }

  const beginFloorPlanEdit = () => {
    setFloorPlanDraft(personnelFloorPlanZones.map((zone) => ({ ...zone })));
    setFloorPlanEditMode(true);
  };

  const saveFloorPlanPositions = () => {
    setPersonnelFloorPlanZones(normalizePersonnelFloorPlanZones(floorPlanDraft));
    setFloorPlanEditMode(false);
    floorPlanDrag.current = null;
  };

  const cancelFloorPlanEdit = () => {
    setFloorPlanDraft(personnelFloorPlanZones.map((zone) => ({ ...zone })));
    setFloorPlanEditMode(false);
    floorPlanDrag.current = null;
  };

  const resetFloorPlanDraft = () => {
    setFloorPlanDraft(normalizePersonnelFloorPlanZones(null));
  };

  const moveFloorPlanZone = (event, zoneKey) => {
    if (!floorPlanEditMode || floorPlanDrag.current !== zoneKey || !floorPlanRef.current) return;
    const bounds = floorPlanRef.current.getBoundingClientRect();
    const x = Math.min(98, Math.max(2, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(98, Math.max(2, ((event.clientY - bounds.top) / bounds.height) * 100));
    setFloorPlanDraft((current) => current.map((zone) => (
      `${zone.department}-${zone.section}` === zoneKey ? { ...zone, x, y } : zone
    )));
  };

  function CombinedPersonnelFloorPlan({ editable = false } = {}) {
    const visibleZones = editable ? floorPlanDraft : personnelFloorPlanZones;
    const waeschereiPlan = planForDepartment("waescherei");
    const putzereiPlan = planForDepartment("putzerei");
    const start12Names = personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || [];
    const uniqueSortedNames = (names) => [...new Set(names.filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), "de", { numeric: true }));
    const unassignedNamesForDepartment = (department) => {
      const departmentPlan = planForDepartment(department);
      const assignedNames = new Set(
        Object.values(departmentPlan).flatMap((names) => Array.isArray(names) ? names : [])
      );
      if (department === "waescherei") start12Names.forEach((name) => assignedNames.add(name));
      const employees = personnelEmployeesByDept[department] || PERSONNEL_DEPARTMENTS[department]?.employees || [];
      return employees
        .filter((employee) => (employeeStatus[`${department}_${employee.name}`] || "anwesend") === "anwesend")
        .filter((employee) => !assignedNames.has(employee.name))
        .map((employee) => employee.name);
    };
    const statusZones = [
      { key: "start12", title: "Start 12 Uhr", names: uniqueSortedNames(start12Names), color: "border-emerald-600 bg-emerald-50/95 text-emerald-950" },
      { key: "urlaub", title: "Urlaub", names: uniqueSortedNames([...(waeschereiPlan.urlaub || []), ...(putzereiPlan.urlaub || [])]), color: "border-blue-500 bg-blue-50/95 text-blue-950" },
      { key: "za", title: "ZA", names: uniqueSortedNames([...(waeschereiPlan.za || []), ...(putzereiPlan.za || [])]), color: "border-amber-500 bg-amber-50/95 text-amber-950" },
      { key: "krank", title: "Krank", names: uniqueSortedNames([...(waeschereiPlan.krank || []), ...(putzereiPlan.krank || [])]), color: "border-red-500 bg-red-50/95 text-red-950" },
      { key: "sonstiges", title: "Büro/Tour/Sonstiges", names: uniqueSortedNames([...(waeschereiPlan.sonstiges || []), ...(putzereiPlan.sonstiges || [])]), color: "border-slate-600 bg-slate-100/95 text-slate-950" },
      { key: "pool", title: "Nicht eingeteilt", names: uniqueSortedNames([
        ...unassignedNamesForDepartment("waescherei"),
        ...unassignedNamesForDepartment("putzerei"),
      ]), color: "border-slate-500 bg-slate-50/95 text-slate-950" },
    ];
    return (
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div ref={floorPlanRef} className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: "4638 / 2274" }}>
          <img
            src={personnelFloorPlanUrl}
            alt="Gebäudeplan Wäscherei und Putzerei"
            className="absolute inset-0 h-full w-full object-fill"
          />

          <div className="pointer-events-none absolute left-[55%] top-[5%] z-10 w-[42%] rounded-md border border-slate-300 bg-white/95 p-1.5 shadow-sm">
            <div className="mb-1 flex items-center justify-between border-b border-slate-200 pb-1 text-[9px] font-black leading-none text-slate-900">
              <span>Abwesenheiten &amp; Status</span>
              <span>{PERSONNEL_SHIFTS.find((shift) => shift.key === personalShift)?.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {statusZones.map((zone) => (
                <div key={zone.key} className={`min-w-0 border-l-4 px-1 py-0.5 ${zone.color}`}>
                  <div className="flex items-center justify-between gap-1 text-[8px] font-black leading-none">
                    <span className="truncate">{zone.title}</span>
                    <span className="shrink-0">{zone.names.length}</span>
                  </div>
                  <div className="mt-0.5 break-words text-[18px] font-black leading-tight">
                    {zone.names.length ? zone.names.join(", ") : "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {visibleZones.map((zone) => {
            const section = sectionsForDepartment(zone.department).find((entry) => entry.name === zone.section);
            if (!section) return null;
            const assigned = planForDepartment(zone.department)[section.name] || [];
            const target = sectionTargetForDepartment(section, zone.department);
            const occupancyClass = target === null
              ? "border-slate-500"
              : assigned.length < target
                ? "border-yellow-500"
                : assigned.length > target
                  ? "border-red-500"
                  : "border-green-600";
            const departmentClass = zone.department === "waescherei" ? "text-blue-950" : "text-violet-950";
            const employeeClass = zone.department === "waescherei"
              ? "border-blue-300 bg-blue-100 text-blue-950"
              : "border-violet-300 bg-violet-100 text-violet-950";
            const displayName = section.name
              .replace("Waschmaschinen", "Wasch\u00admaschinen")
              .replace("Reinigungsmaschinen", "Reinigungs\u00admaschinen");
            const zoneKey = `${zone.department}-${zone.section}`;

            return (
              <div
                key={zoneKey}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${editable ? "cursor-grab touch-none select-none rounded bg-white/55 p-1 ring-2 ring-blue-600 ring-offset-1 active:cursor-grabbing" : ""}`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  minWidth: section.name.length > 15 ? "100px" : section.name.length > 11 ? "86px" : "68px",
                }}
                onPointerDown={editable ? (event) => {
                  event.preventDefault();
                  floorPlanDrag.current = zoneKey;
                  event.currentTarget.setPointerCapture(event.pointerId);
                } : undefined}
                onPointerMove={editable ? (event) => moveFloorPlanZone(event, zoneKey) : undefined}
                onPointerUp={editable ? (event) => {
                  floorPlanDrag.current = null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                } : undefined}
                onPointerCancel={editable ? () => { floorPlanDrag.current = null; } : undefined}
              >
                <div className={`border-l-4 bg-white/95 px-1 py-0.5 text-[9px] font-black leading-tight shadow-sm ${occupancyClass} ${departmentClass}`}>
                  <span className="min-w-0 break-words">{section.name === "Waschstraßen" ? "Waschstraße" : displayName}</span>
                </div>
                <div className="mt-0.5 flex flex-col items-start gap-px">
                  {assigned.map((name) => (
                    <span key={name} className={`block w-max whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[18px] font-black leading-tight shadow-sm ${employeeClass}`}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function PersonnelMapOverview({ compact = false }) {
    if (personalDepartment === "waescherei") {
      const rowDefinitions = [
        { title: "Schmutzwäscheabteilung", sections: ["Übernahme", "Waschstraßen", "Waschmaschinen"] },
        { title: "Finishabteilung", sections: ["Absortierung", "Mangel 1", "Mangel 2", "Frottee 1", "BM + SPLT"] },
        { title: "Fertigstellung", sections: ["Jenway Großteile", "Jenway Kleinteile", "Jenway Frottee", "Poolwäsche", "Expedit"] },
      ];
      const listedNames = new Set(rowDefinitions.flatMap((row) => row.sections));
      const additionalSections = currentSections().filter((section) => !listedNames.has(section.name));

      const renderSectionField = (section, stationNumber) => {
        const assigned = getEmployeesInSection(section.name);
        const target = getSectionTarget(section);
        const freePlaces = target === null ? 0 : Math.max(0, target - assigned.length);
        const displayName = section.name === "Waschstraßen" ? "Waschstraße" : section.name;

        return (
          <div
            key={section.id || section.name}
            onClick={() => assignSelectedPersonnelEmployee(section.name)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragEmployee) setEmployeeToSection(dragEmployee, section.name);
              setDragEmployee(null);
            }}
            className={`min-h-28 rounded-xl border-2 p-3 transition ${getSectionColor(section)} ${selectedPersonnelEmployee ? "cursor-pointer ring-2 ring-blue-300" : ""}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                  {stationNumber}
                </span>
                <h4 className="break-words text-sm font-black leading-tight">{displayName}</h4>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-700">
                {assigned.length}/{target === null ? "Bedarf" : target}
              </span>
            </div>

            <div className="grid gap-1 sm:grid-cols-2">
              {assigned.map((name) => {
                const employee = currentEmployees().find((entry) => entry.name === name);
                return (
                  <button
                    type="button"
                    key={name}
                    draggable
                    onDragStart={() => setDragEmployee(name)}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectPersonnelEmployee(name);
                    }}
                    className="cursor-pointer rounded-md border border-blue-200 bg-white px-2 py-1.5 text-left shadow-sm"
                  >
                    <div className="text-[11px] font-black leading-tight">{name}</div>
                    <div className="text-[9px] leading-none text-slate-500">
                      {employee?.borrowedFrom ? `Aus ${employee.borrowedFrom === "waescherei" ? "Wäscherei" : "Putzerei"}` : employee?.hours ? `${employee.hours} h/Woche` : "Chef"}
                    </div>
                  </button>
                );
              })}
              {Array.from({ length: freePlaces }, (_, placeIndex) => (
                <div
                  key={`free-${placeIndex}`}
                  className="flex min-h-10 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/60 px-2 py-1 text-[10px] font-bold text-slate-400"
                >
                  Freier Platz
                </div>
              ))}
            </div>
          </div>
        );
      };

      let stationNumber = 0;
      return (
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black">Stationsfolge Wäscherei</h3>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {personalDate} | {PERSONNEL_SHIFTS.find((shift) => shift.key === personalShift)?.label || personalShift}
            </div>
          </div>

          <div className="space-y-2">
            {rowDefinitions.map((row, rowIndex) => {
              const sections = row.sections.map((name) => currentSections().find((section) => section.name === name)).filter(Boolean);
              const rowStart = stationNumber;
              stationNumber += sections.length;
              return (
                <div key={row.title}>
                  <h4 className="mb-2 mt-3 text-sm font-black text-slate-700 first:mt-0">{row.title}</h4>
                  <div className={`grid gap-2 ${rowIndex === 0 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-5"}`}>
                    {sections.map((section, index) => renderSectionField(section, rowStart + index + 1))}
                  </div>
                </div>
              );
            })}
          </div>

          {additionalSections.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <h4 className="mb-2 text-sm font-black text-slate-600">Weitere Abteilungen</h4>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {additionalSections.map((section, index) => renderSectionField(section, stationNumber + index + 1))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (personalDepartment === "putzerei") {
      return (
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black">Stationsfolge Putzerei</h3>
              {!compact && <p className="text-sm text-slate-500">Mitarbeiter werden per Ziehen einer Station zugeteilt.</p>}
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {personalDate} | {PERSONNEL_SHIFTS.find((s) => s.key === personalShift)?.label || personalShift}
            </div>
          </div>

          {selectedPersonnelEmployee && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-300 bg-blue-50 px-3 py-2">
              <div className="text-sm font-black text-blue-900">Ausgewählt: {selectedPersonnelEmployee}</div>
              <button type="button" className="text-xs font-bold text-blue-800 hover:underline" onClick={() => setSelectedPersonnelEmployee(null)}>
                Auswahl aufheben
              </button>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {currentSections().map((section, index) => {
              const assigned = getEmployeesInSection(section.name);
              const maximum = getSectionTarget(section) ?? 0;
              const freePlaces = Math.max(0, maximum - assigned.length);

              return (
                <div
                  key={section.name}
                  onClick={() => assignSelectedPersonnelEmployee(section.name)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragEmployee) setEmployeeToSection(dragEmployee, section.name);
                    setDragEmployee(null);
                  }}
                  className={`min-h-28 rounded-xl border-2 p-3 transition ${getSectionColor(section)} ${selectedPersonnelEmployee ? "cursor-pointer ring-2 ring-blue-300 hover:ring-blue-500" : ""}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <h4 className="break-words text-sm font-black leading-tight">{section.name}</h4>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-700">
                      {assigned.length}/{maximum}
                    </span>
                  </div>

                  <div className="grid gap-1 sm:grid-cols-2">
                    {assigned.map((name) => {
                      const employee = currentEmployees().find((entry) => entry.name === name);
                      return (
                        <button
                          type="button"
                          key={name}
                          draggable
                          onDragStart={() => setDragEmployee(name)}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectPersonnelEmployee(name);
                          }}
                          className={`cursor-pointer rounded-md border bg-white px-2 py-1.5 text-left shadow-sm ${selectedPersonnelEmployee === name ? "border-blue-600 ring-2 ring-blue-400" : "border-blue-200"}`}
                        >
                          <div className="text-[11px] font-black leading-tight">{name}</div>
                          <div className="text-[9px] leading-none text-slate-500">
                            {employee?.hours ? `${employee.hours} h/Woche` : "Chef"}
                          </div>
                        </button>
                      );
                    })}
                    {Array.from({ length: freePlaces }, (_, placeIndex) => (
                      <div
                        key={`free-${placeIndex}`}
                        className="flex min-h-10 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/60 px-2 py-1 text-[10px] font-bold text-slate-400"
                      >
                        Freier Platz
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const map = PERSONNEL_MAPS[personalDepartment];
    if (!map) return null;
    const extraSections = currentSections().slice(map.zones.length);

    return (
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black">{map.title}</h3>
            {!compact && <p className="text-sm text-slate-500">
              Mitarbeiter werden dort angezeigt, wo sie in der aktuellen Schicht eingeteilt sind.
            </p>}
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {personalDate} | {PERSONNEL_SHIFTS.find((s) => s.key === personalShift)?.label || personalShift}
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl border bg-slate-100 ${compact ? "h-[calc(100vh-280px)] min-h-[390px]" : "h-[calc(100vh-320px)] min-h-[520px]"}`}>
          <img
            src={map.image}
            alt={map.title}
            className="absolute inset-0 h-full w-full object-contain p-6"
            data-fallback-index="0"
            onError={(e) => {
              const fallbacks = map.imageFallbacks || [];
              const index = Number(e.currentTarget.dataset.fallbackIndex || "0");
              if (index < fallbacks.length) {
                e.currentTarget.dataset.fallbackIndex = String(index + 1);
                e.currentTarget.src = fallbacks[index];
              }
            }}
          />

          {map.zones.map((zone, index) => {
            const section = currentSections()[index];
            if (!section) return null;
            const sectionName = section.name;
            const names = getEmployeesInSection(sectionName);

            return (
              <div
                key={sectionName}
                className={`absolute rounded-lg border-2 p-1 shadow-md backdrop-blur-sm ${section ? getSectionColor(section) : "border-slate-300 bg-white/80"}`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, sectionName)}
              >
                <div className="mb-1 truncate text-[9px] font-black text-blue-900">{sectionName}</div>
                <div className="flex flex-wrap gap-1">
                  {names.map((name) => (
                    <button
                      type="button"
                      key={name}
                      draggable
                      onDragStart={() => setDragEmployee(name)}
                      onClick={() => selectPersonnelEmployee(name)}
                      className="cursor-pointer rounded-md bg-blue-700 px-1.5 py-0.5 text-[9px] font-black leading-tight text-white"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {extraSections.length > 0 && (
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {extraSections.map((section) => {
              const names = getEmployeesInSection(section.name);
              const target = getSectionTarget(section);
              return (
                <div
                  key={section.id}
                  onClick={() => assignSelectedPersonnelEmployee(section.name)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, section.name)}
                  className={`min-h-20 rounded-xl border-2 p-2 ${getSectionColor(section)}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-black">{section.name}</div>
                    <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black">{names.length}/{target === null ? "Bedarf" : target}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {names.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectPersonnelEmployee(name);
                        }}
                        className="rounded-md bg-blue-700 px-2 py-1 text-[10px] font-black text-white"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function PersonnelSidePanel() {
    const absenceZones = [
      ...(personalDepartment === "waescherei" ? [{ key: "start12", title: "Start 12 Uhr" }] : []),
      { key: "urlaub", title: "Urlaub" },
      { key: "za", title: "ZA" },
      { key: "krank", title: "Krank" },
      { key: "sonstiges", title: "Büro/Tour/Sonstiges" },
      ...(personalDepartment === "putzerei" ? [{ key: "waescherei", title: "Wäscherei" }] : []),
      ...(personalDepartment === "waescherei" ? [{ key: "putzerei", title: "Putzerei" }] : []),
    ];

    return (
      <aside className="rounded-2xl border bg-slate-50 p-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-black">Mitarbeiter</h3>
          <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">
            {currentEmployees().length}
          </div>
        </div>

        <div
          className={`mb-2 rounded-xl border bg-white p-2 ${selectedPersonnelEmployee ? "cursor-pointer hover:border-blue-400" : ""}`}
          onClick={() => assignSelectedPersonnelEmployee("pool")}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragEmployee) setEmployeeToSection(dragEmployee, "pool");
            setDragEmployee(null);
          }}
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-black">Nicht eingeteilt</div>
            <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
              {getUnassignedEmployees().length}
            </div>
          </div>
          <div
            className="grid h-[46vh] min-h-56 grid-cols-2 content-start gap-1 overflow-y-auto overscroll-contain pr-1 touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {getUnassignedEmployees().map((emp) => (
              <button
                type="button"
                key={emp.name}
                draggable
                onDragStart={() => setDragEmployee(emp.name)}
                onClick={(event) => {
                  event.stopPropagation();
                  selectPersonnelEmployee(emp.name);
                }}
                className={`cursor-pointer rounded-md border px-2 py-1 text-left ${selectedPersonnelEmployee === emp.name ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400" : "bg-slate-50"}`}
              >
                <div className="text-[11px] font-black leading-tight">{emp.name}</div>
                <div className="text-[9px] text-slate-500 leading-none">
                  {emp.borrowedFrom ? `Aus ${emp.borrowedFrom === "waescherei" ? "Wäscherei" : "Putzerei"}` : emp.hours ? `${emp.hours} h` : "Chef"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          {absenceZones.map((zone) => {
            const zoneNames = zone.key === "start12"
              ? personalPlan[getPersonalKey(personalDate, "07-12", "waescherei")]?.start12 || []
              : null;
            const zoneEmployees = getSortedEmployees(zoneNames
              ? currentEmployees().filter((employee) => zoneNames.includes(employee.name))
              : currentEmployees().filter((employee) => getEmployeeAssignment(employee.name) === zone.key));

            return (
              <div
                key={zone.key}
                onClick={() => assignSelectedPersonnelEmployee(zone.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragEmployee) setEmployeeToSection(dragEmployee, zone.key);
                  setDragEmployee(null);
                }}
                className={`rounded-xl border p-2 ${zone.key === "start12" ? "border-emerald-300 bg-emerald-50" : "bg-white"} ${selectedPersonnelEmployee ? "cursor-pointer hover:border-blue-400" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-xs font-black">{zone.title}</div>
                  <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                    {zoneEmployees.length}
                  </div>
                </div>
                <div className="flex min-h-8 flex-wrap gap-1">
                  {zoneEmployees.map((emp) => (
                    <button
                      type="button"
                      key={emp.name}
                      draggable
                      onDragStart={() => setDragEmployee(emp.name)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPersonnelEmployee(emp.name);
                      }}
                      className={`cursor-pointer rounded-md border px-2 py-1 text-[10px] font-black ${selectedPersonnelEmployee === emp.name ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400" : "bg-slate-50"}`}
                    >
                      {emp.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  function PersonnelDisplayStatusPanel() {
    const plan = getCurrentPersonalPlan();
    const zones = [
      { key: "pool", title: "Nicht eingeteilt", names: getUnassignedEmployees().map((employee) => employee.name) },
      { key: "urlaub", title: "Urlaub", names: plan.urlaub || [] },
      { key: "za", title: "ZA", names: plan.za || [] },
      { key: "krank", title: "Krank", names: plan.krank || [] },
      { key: "sonstiges", title: "Büro/Tour/Sonstiges", names: plan.sonstiges || [] },
      { key: "putzerei", title: "Putzerei", names: plan.putzerei || [] },
    ];

    return (
      <aside className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
          <h3 className="text-lg font-black">Mitarbeiterstatus</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black">{currentEmployees().length}</span>
        </div>
        <div className="grid gap-2">
          {zones.map((zone) => (
            <div key={zone.key} className="rounded-lg border bg-slate-50 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-sm font-black">{zone.title}</div>
                <div className="rounded-full bg-white px-2 py-0.5 text-xs font-black">{zone.names.length}</div>
              </div>
              <div className="flex min-h-8 flex-wrap content-start gap-1">
                {getSortedEmployees(zone.names.map((name) => ({ name }))).map((employee) => (
                  <span key={employee.name} className="rounded-md border bg-white px-2 py-1 text-xs font-bold">
                    {employee.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }
  /*
        }`}
      >
        <div className="grid grid-cols-[28px_92px_1fr_54px] items-start gap-3">
          <div className="cursor-grab select-none text-lg text-slate-400" title="Ziehen">↕</div>
          <div className="font-mono text-xl font-black leading-tight">{row.customer_number}</div>
          <button
            type="button"
            onClick={handleWash}
            className="text-left text-xl font-black leading-tight break-words whitespace-normal"
            title="Antippen = gewaschen"
          >
            {row.customer_name}
          </button>
          <div className="rounded-xl bg-slate-100 px-2 py-1 text-center text-2xl font-black">{row.washOpen}</div>
        </div>
        {row.washLabels?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pl-10">
            {row.washLabels.map((label) => (
              <span key={label} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                {label}
              </span>
            ))}
          </div>
        )}
        {row.info && (
          <div className="mt-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
            ℹ {row.info}
          </div>
        )}
      </div>
    );
  }

  */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className={`border-b bg-white px-8 ${fixedView ? "py-2" : "py-4"}`}>
        <div className="grid grid-cols-3 items-center">
          <Logo />
          <div className={`${personnelDisplayMode && fixedView ? "text-xl" : fixedView ? "text-2xl" : "text-3xl"} text-center font-black`}>
            {personnelDisplayMode ? "Personalplanung Wäscherei + Putzerei" : expeditMode ? "DieTex Expedit" : "DieTex Produktionsmonitor"}
          </div>
          <div className="flex items-center justify-end gap-3">
            {!fixedView && externalPersonnelPortal && (
              <Button onClick={() => supabase.auth.signOut()}>
                Abmelden
              </Button>
            )}
            {!fixedView && !externalPersonnelPortal && (adminUnlocked ? (
              <Button className="border-emerald-200 bg-emerald-50 text-emerald-800" onClick={lockAdminArea}>
                Admin sperren
              </Button>
            ) : (
              <Button className="border-slate-300 bg-slate-100 text-slate-700" onClick={() => openPinModal(null)}>
                Admin entsperren
              </Button>
            ))}
            <span className="text-2xl font-bold">◷ {fmtTime(new Date())}</span>
          </div>
        </div>
      </header>

      {selectedPersonnelEmployee && view === "personalplanung" && !personnelEmployeeModal && !personnelDepartmentModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-500">Mitarbeiter verschieben</div>
                <h2 className="text-2xl font-black">{selectedPersonnelEmployee}</h2>
                <div className="text-sm text-slate-500">
                  Aktuell: {getEmployeeAssignment(selectedPersonnelEmployee) || "Nicht eingeteilt"}
                </div>
              </div>
              <Button onClick={() => setSelectedPersonnelEmployee(null)}>Abbrechen</Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => assignSelectedPersonnelEmployee("pool")}
                className="min-h-16 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-left font-black hover:border-blue-500"
              >
                Nicht eingeteilt
              </button>
              {currentSections().map((section) => {
                const target = getSectionTarget(section);
                const actual = getEmployeesInSection(section.name).length;
                return (
                  <button
                    type="button"
                    key={section.name}
                    onClick={() => assignSelectedPersonnelEmployee(section.name)}
                    className="min-h-16 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-left hover:border-blue-600"
                  >
                    <div className="font-black">{section.name}</div>
                    <div className="text-xs font-bold text-slate-500">{actual}/{target === null ? "bei Bedarf" : target} Personen</div>
                  </button>
                );
              })}
              {[
                ...(personalDepartment === "waescherei" ? [{ key: "start12", label: "Start 12 Uhr" }] : []),
                { key: "urlaub", label: "Urlaub" },
                { key: "za", label: "ZA" },
                { key: "krank", label: "Krankenstand" },
                { key: "sonstiges", label: "Büro/Tour/Sonstiges" },
                ...(personalDepartment === "putzerei" ? [{ key: "waescherei", label: "Wäscherei" }] : []),
                ...(personalDepartment === "waescherei" ? [{ key: "putzerei", label: "Putzerei" }] : []),
              ].map((destination) => (
                <button
                  type="button"
                  key={destination.key}
                  onClick={() => assignSelectedPersonnelEmployee(destination.key)}
                  className="min-h-16 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-left font-black hover:border-blue-500"
                >
                  {destination.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Admin-PIN</h2>
            <p className="mt-1 text-sm text-slate-500">
              Dieser Bereich ist geschuetzt.
            </p>

            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                confirmPin();
              }}
            >
              <Input
                className="w-full text-center text-2xl tracking-[0.35em]"
                inputMode="numeric"
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                autoFocus
              />
              {pinError && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{pinError}</div>}

              <div className="flex justify-end gap-3">
                <Button onClick={() => setPinModal(null)}>Abbrechen</Button>
                <Button type="submit" className="bg-blue-700 text-white">
                  Entsperren
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {personnelEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-black">Mitarbeiter bearbeiten</h2>
                <p className="text-sm text-slate-500">{currentDepartmentConfig().label}</p>
              </div>
              <Button onClick={() => setPersonnelEmployeeModal(false)}>Schließen</Button>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
              <aside className="overflow-auto border-r bg-slate-50 p-3">
                <Button className="mb-3 w-full bg-blue-700 text-white" onClick={resetPersonnelEmployeeForm}>
                  Neuen Mitarbeiter anlegen
                </Button>
                <div className="space-y-2">
                  {getSortedEmployees(currentBaseEmployees()).map((employee) => {
                    const assignmentStats = getEmployeeAssignmentStats(employee.name);
                    const topAssignment = assignmentStats[0];
                    const isEditing = editingEmployeeName === employee.name;
                    return (
                      <div key={employee.name} className={`rounded-xl border p-2 ${isEditing ? "border-blue-500 bg-blue-50" : "bg-white"}`}>
                        <button type="button" className="w-full text-left" onClick={() => openPersonnelEmployeeEditor(employee.name)}>
                          <div className="font-black">{employee.name}</div>
                          <div className="text-xs text-slate-500">
                            {employee.hours !== "" ? `${employee.hours} Wochenstunden` : "Keine Wochenstunden"}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-blue-800">
                            {topAssignment ? `Am häufigsten: ${topAssignment.section} (${topAssignment.count}x)` : "Noch keine Einteilung gespeichert"}
                          </div>
                        </button>
                        <button
                          type="button"
                          className="mt-2 text-xs font-bold text-red-700 hover:underline"
                          onClick={() => {
                            deletePersonnelEmployee(employee.name);
                            if (editingEmployeeName === employee.name) resetPersonnelEmployeeForm();
                          }}
                        >
                          Mitarbeiter löschen
                        </button>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="overflow-auto p-5">
                <h3 className="mb-4 text-lg font-black">{editingEmployeeName ? "Stammdaten bearbeiten" : "Neuer Mitarbeiter"}</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-bold">
                    Name
                    <Input
                      className="mt-1 w-full"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Wochenstunden
                    <Input
                      className="mt-1 w-full"
                      type="number"
                      min="0"
                      step="0.5"
                      value={employeeForm.hours}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, hours: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Priorität 1
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      value={employeeForm.preferredWorkplace1}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, preferredWorkplace1: e.target.value }))}
                    >
                      <option value="">Keine Angabe</option>
                      {currentSections().map((section) => <option key={section.name} value={section.name}>{section.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Priorität 2
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      value={employeeForm.preferredWorkplace2}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, preferredWorkplace2: e.target.value }))}
                    >
                      <option value="">Keine Angabe</option>
                      {currentSections().map((section) => <option key={section.name} value={section.name}>{section.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    No-Go 1
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      value={employeeForm.noGoWorkplace1}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, noGoWorkplace1: e.target.value }))}
                    >
                      <option value="">Keine Angabe</option>
                      {currentSections().map((section) => <option key={section.name} value={section.name}>{section.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    No-Go 2
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      value={employeeForm.noGoWorkplace2}
                      onChange={(e) => setEmployeeForm((prev) => ({ ...prev, noGoWorkplace2: e.target.value }))}
                    >
                      <option value="">Keine Angabe</option>
                      {currentSections().map((section) => <option key={section.name} value={section.name}>{section.name}</option>)}
                    </select>
                  </label>
                </div>

                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-black">Stammschichten</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PERSONNEL_SHIFTS.map((shift, index) => {
                      const checked = employeeForm.regularShifts.includes(shift.key);
                      return (
                        <label key={shift.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${checked ? "border-blue-400 bg-blue-50 text-blue-900" : "bg-white text-slate-500"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setEmployeeForm((prev) => ({
                              ...prev,
                              regularShifts: checked
                                ? prev.regularShifts.filter((key) => key !== shift.key)
                                : [...prev.regularShifts, shift.key],
                            }))}
                          />
                          {index + 1}. Schicht
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-black">Stammtage</legend>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {PERSONNEL_WEEKDAYS.map((day) => {
                      const checked = employeeForm.regularDays.includes(day.key);
                      return (
                        <label key={day.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${checked ? "border-blue-400 bg-blue-50 text-blue-900" : "bg-white text-slate-500"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setEmployeeForm((prev) => ({
                              ...prev,
                              regularDays: checked
                                ? prev.regularDays.filter((key) => key !== day.key)
                                : [...prev.regularDays, day.key],
                            }))}
                          />
                          {day.short}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {editingEmployeeName && (
                  <div className="mt-5 rounded-xl border bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-black">Bisherige Einteilungen</div>
                    <div className="flex flex-wrap gap-2">
                      {getEmployeeAssignmentStats(editingEmployeeName).length ? getEmployeeAssignmentStats(editingEmployeeName).map((entry) => (
                        <span key={entry.section} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                          {entry.section}: {entry.count}x
                        </span>
                      )) : <span className="text-sm text-slate-500">Noch keine Einteilung gespeichert.</span>}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                  <Button onClick={resetPersonnelEmployeeForm}>Eingaben leeren</Button>
                  <Button className="bg-blue-700 text-white" onClick={savePersonnelEmployee}>
                    {editingEmployeeName ? "Änderungen speichern" : "Mitarbeiter speichern"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {personnelDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-black">Abteilungen bearbeiten</h2>
                <p className="text-sm text-slate-500">{currentDepartmentConfig().label}</p>
              </div>
              <Button onClick={() => setPersonnelDepartmentModal(false)}>Schließen</Button>
            </div>

            <div className="overflow-auto p-5">
              <div className="grid gap-3">
                {departmentDraft.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-xl border bg-slate-50 p-3">
                    <div className="mb-3 flex items-end gap-2">
                      <label className="block min-w-0 flex-1 text-xs font-black text-slate-600">
                        Abteilungsname
                        <Input
                          className="mt-1 w-full bg-white"
                          value={section.name}
                          onChange={(event) => setDepartmentDraft((prev) => prev.map((entry, index) => index === sectionIndex ? { ...entry, name: event.target.value } : entry))}
                        />
                      </label>
                      <button
                        type="button"
                        className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50"
                        onClick={() => setDepartmentDraft((prev) => prev.filter((entry) => entry.id !== section.id))}
                      >
                        Löschen
                      </button>
                    </div>

                    <div className="min-w-[650px] overflow-hidden rounded-lg border bg-white">
                      <div className="grid grid-cols-[130px_1fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                        <div>Tagesstärke</div>
                        {PERSONNEL_SHIFTS.map((shift, index) => <div key={shift.key}>Soll {index + 1}. Schicht</div>)}
                      </div>
                      {PERSONNEL_DAY_STRENGTHS.map((strength) => (
                        <div key={strength.key} className="grid grid-cols-[130px_1fr_1fr_1fr] items-center gap-2 border-t p-2">
                          <div className="text-sm font-black">{strength.label}</div>
                          {PERSONNEL_SHIFTS.map((shift) => (
                            <Input
                              key={shift.key}
                              type="number"
                              min="0"
                              step="1"
                              className="w-full text-center"
                              placeholder="bei Bedarf"
                              value={section.targetsByStrength?.[strength.key]?.[shift.key] ?? ""}
                              onChange={(event) => setDepartmentDraft((prev) => prev.map((entry, index) => index === sectionIndex ? {
                                ...entry,
                                targetsByStrength: {
                                  ...entry.targetsByStrength,
                                  [strength.key]: {
                                    ...entry.targetsByStrength?.[strength.key],
                                    [shift.key]: event.target.value,
                                  },
                                },
                              } : entry))}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="mt-3 border-blue-300 bg-blue-50 text-blue-900"
                onClick={() => setDepartmentDraft((prev) => [...prev, {
                  id: `custom-${Date.now()}`,
                  name: "Neue Abteilung",
                  targetsByStrength: Object.fromEntries(PERSONNEL_DAY_STRENGTHS.map((strength) => [
                    strength.key,
                    Object.fromEntries(PERSONNEL_SHIFTS.map((shift) => [shift.key, 0])),
                  ])),
                }])}
              >
                Neue Abteilung hinzufügen
              </Button>

              <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                <Button onClick={() => setPersonnelDepartmentModal(false)}>Abbrechen</Button>
                <Button className="bg-blue-700 text-white" onClick={savePersonnelDepartments}>Abteilungen speichern</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {leitungDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-red-800">Kundenaufträge löschen</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Gelöscht werden alle Aufträge, die im angegebenen Zeitraum übernommen wurden.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Von</span>
                <Input className="w-full" type="datetime-local" value={leitungDeleteFrom} onChange={(event) => setLeitungDeleteFrom(event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Bis</span>
                <Input className="w-full" type="datetime-local" value={leitungDeleteTo} onChange={(event) => setLeitungDeleteTo(event.target.value)} />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              Diese Löschung entfernt auch die zugehörigen Artikelzeilen, Container und Historieneinträge und kann nicht rückgängig gemacht werden.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button disabled={leitungDeleteBusy} onClick={() => setLeitungDeleteModal(false)}>Abbrechen</Button>
              <button
                type="button"
                disabled={leitungDeleteBusy}
                onClick={deleteProductionOrdersInRange}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
              >
                {leitungDeleteBusy ? "Wird geprüft..." : "Zeitraum endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Auf Tour setzen</h2>
            <p className="mt-1 text-slate-500">
              {tourModal.customerNumber} {tourModal.customerName}
            </p>

            <div className="mt-5 space-y-3">
              <Input
                className="w-full"
                placeholder="Containeranzahl oder Packerlanzahl"
                value={tourContainerCount}
                onChange={(e) => setTourContainerCount(e.target.value)}
                autoFocus
              />
              <Input
                className="w-full"
                placeholder="Tourennummer"
                value={tourNumberInput}
                onChange={(e) => setTourNumberInput(e.target.value)}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setTourModal(null)}>Abbrechen</Button>
              <Button className="bg-blue-700 text-white" onClick={confirmTourModal}>
                Speichern und entfernen
              </Button>
            </div>
          </div>
        </div>
      )}

      {monitorDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {monitorDetailOrder.customer_number} {monitorDetailOrder.customer_name}
                </h2>
                <p className="text-slate-500">Artikelstatus Verpackung</p>
              </div>
              <Button onClick={() => setMonitorDetailOrder(null)}>Schliessen</Button>
            </div>

            <div className="space-y-4">
              {monitorDetailGroups(monitorDetailOrder).map((group) => (
                <div key={group.category} className="rounded-2xl border bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-black">
                      <span className="mr-2">{CAT_ICON[group.category]}</span>{group.category}
                    </h3>
                    <div className="text-sm font-bold text-slate-500">
                      {group.items.filter((item) => item.is_done).length}/{group.items.length}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        disabled={item.is_done}
                        onClick={() => finishMonitorItem(item)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                          item.is_done
                            ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{displaySubcategory(item.subcategory)}</span>
                          <span>{item.is_done ? "Fertig" : "Offen"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className={`mx-auto w-full ${view === "personalmonitor" || view === "personaldisplay" ? "max-w-none" : "max-w-[1800px]"} ${fixedView ? "p-2" : "p-5"}`}>
        {(!fixedView || takeoverMode) && (
          <nav className="mb-5 flex flex-wrap justify-center gap-2">
            {(takeoverMode
              ? [
                  ["annahme", "Kunden übernehmen"],
                ]
              : expeditMode
              ? [
                  ["monitor", "Verpackungsmonitor"],
                ]
              : externalPersonnelPortal
              ? [
                  ["personalplanung", "Personalplanung"],
                  ["personalmonitor", "Personalübersicht"],
                ]
              : [
                  ["annahme", "Kunden übernehmen"],
                  ["waschplan", "Waschplan"],
                  ["monitor", "Verpackungsmonitor"],
                  ["stammdaten", "Stammdaten"],
                  ["leitung", "Produktionsleitung"],
                  ["personalmonitor", "Personalübersicht"],
                  ["personalplanung", "Personalplanung"],
                ]).map(([key, label]) => (
              <Button key={key} active={view === key} onClick={() => goToView(key)}>
                {label}
              </Button>
            ))}
          </nav>
        )}

        {view === "annahme" && (
          <section className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex justify-end">
              <input id="customer-excel-import" type="file" accept=".xlsx,.xls" className="hidden" onChange={importCustomersExcel} />
              <label htmlFor="customer-excel-import" className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">
                📄 Kunden Excel importieren
              </label>
            </div>

            <Input className="mb-2 w-full" placeholder="Kundennummer oder Name suchen" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />

            {customerSuggestions.length > 0 && (
              <div className="mb-3 rounded-xl border bg-white">
                {customerSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="grid w-full grid-cols-[120px_1fr] border-b p-2 text-left"
                    onClick={() => {
                      setCustomerNumber(c.customer_number);
                      setCustomerName(c.customer_name);
                      setCustomerSearch(`${c.customer_number} ${c.customer_name}`);
                    }}
                  >
                    <span>{c.customer_number}</span><b>{c.customer_name}</b>
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <Input placeholder="Kundennummer" value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} />
              <Input placeholder="Kundenname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <Input className="mt-2 w-full" placeholder="Optionale Info für Verpackung / Produktion" value={info} onChange={(e) => setInfo(e.target.value)} />

            <h2 className="my-3 text-center text-xl font-black text-blue-700">Überkategorie wählen</h2>

            <div className="grid gap-5 md:grid-cols-4">
              {Object.keys(CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleOrderCategory(cat)}
                  className={`rounded-3xl border-4 p-4 text-center transition-all ${categoryStyle(cat, selectedCategories.includes(cat))}`}
                >
                  <div className="text-4xl">{CAT_ICON[cat]}</div>
                  <b className="mt-2 block text-xl">{cat}</b>
                  <small>{CATEGORIES[cat].join(", ")}</small>
                </button>
              ))}
            </div>

            {selectedCategories.length > 0 && (
              <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <h3 className="mb-3 text-center text-lg font-black">Artikel fuer diesen Auftrag</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {selectedCategories.map((cat) => (
                    <div key={cat} className="rounded-xl border bg-white p-3">
                      <div className="mb-2 font-black">
                        <span className="mr-2">{CAT_ICON[cat]}</span>{cat}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(CATEGORIES[cat] || []).map((sub) => {
                          const active = isOrderArticleIncluded(cat, sub);
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleOrderArticle(cat, sub)}
                              className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                                active
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-slate-100 text-slate-400"
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-center border-t pt-4">
              <button type="button" onClick={addOrder} className="rounded-2xl bg-blue-700 px-8 py-3 text-base font-black text-white shadow-lg hover:bg-blue-800">
                Kunde übernehmen
              </button>
            </div>
            {takeoverMessage && (
              <div className="mx-auto mt-3 max-w-xl rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm font-bold text-blue-900">
                {takeoverMessage}
              </div>
            )}

            <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">Heute bereits übernommen</h3>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-blue-800">{takeoverListToday.length}</span>
              </div>
              {takeoverListToday.length === 0 ? (
                <div className="rounded-xl border bg-white p-3 text-sm font-semibold text-slate-500">
                  Heute noch keine Kunden übernommen.
                </div>
              ) : (
                <div className="max-h-72 overflow-auto rounded-xl border bg-white">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr className="border-b text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Kundennummer</th>
                        <th className="px-3 py-2">Kunde</th>
                        <th className="px-3 py-2">Artikelgruppe</th>
                        <th className="px-3 py-2 text-right">Übernahme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {takeoverListToday.map((order) => (
                        <tr key={order.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2 font-mono">{order.customer_number}</td>
                          <td className="px-3 py-2 font-bold">{order.customer_name}</td>
                          <td className="px-3 py-2">{order.takeoverGroups}</td>
                          <td className="px-3 py-2 text-right font-bold">{order.takeoverTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {view === "waschplan" && (
          <section className={`grid ${fixedView ? "grid-cols-3 gap-2" : "gap-5 lg:grid-cols-3"}`}>
            {WASH_CATEGORIES.map((cat) => {
              const rows = washRowsForCategory(cat);

              return (
                <div key={cat} className={`${fixedView ? "rounded-2xl p-2" : "rounded-3xl p-4"} border-4 ${categoryStyle(cat, false)}`}>
                  <h2 className={`${fixedView ? "mb-2 text-xl" : "mb-4 text-2xl"} border-b-2 border-current pb-2 text-center font-black`}>
                    <span className="mr-2">{CAT_ICON[cat]}</span>{cat}
                  </h2>
                  <div className="grid gap-2">
                    {rows.map((row, index) => (
                      <WashCard
                        key={`${row.id}-${cat}`}
                        row={row}
                        category={cat}
                        compact={fixedView}
                        canMoveUp={index > 0}
                        canMoveDown={index < rows.length - 1}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {view === "station" && (
          <section className="grid gap-5 lg:grid-cols-[300px_1fr]">
            {(!fixedView || takeoverMode) && (
              <aside className="space-y-2 rounded-3xl border bg-white p-4">
                <b>Station auswählen</b>
                {STATIONS.map((s) => (
                  <Button key={s.key} className="w-full text-left" active={activeStation.key === s.key} onClick={() => setActiveStation(s)}>
                    <div>{s.name}</div><small>{s.items.join(" • ")}</small>
                  </Button>
                ))}
              </aside>
            )}

            <div className={`rounded-3xl border bg-white p-4 ${fixedView && !takeoverMode ? "lg:col-span-2" : ""}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black">{activeStation.name}</h2>
                <Input placeholder="Suchen" value={stationSearch} onChange={(e) => setStationSearch(e.target.value)} />
              </div>

              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                {stationOrders.map((order) => {
                  const relevant = enabledItemsForOrder(order)
                    .filter((i) => activeStation.items.includes(i.subcategory) && i.washed_at)
                    .sort((a, b) => activeStation.items.indexOf(a.subcategory) - activeStation.items.indexOf(b.subcategory));

                  const groupedRelevant = Object.values(
                    relevant.reduce((acc, item) => {
                      const label = displaySubcategory(item.subcategory);
                      if (!acc[label]) acc[label] = { label, items: [] };
                      acc[label].items.push(item);
                      return acc;
                    }, {})
                  );

                  return (
                    <div key={order.id} className="rounded-xl border bg-white p-3">
                      <div className="mb-2">
                        <span className="text-sm">{order.customer_number}</span> <b>{order.customer_name}</b>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {groupedRelevant.map((group) => {
                          const done = group.items.every((item) => item.is_done);
                          return (
                            <button
                              key={group.label}
                              type="button"
                              onClick={() => toggleStationGroup(group.items)}
                              className={`rounded-lg border px-3 py-2 text-xs font-bold ${done ? "bg-green-100" : "bg-yellow-50"}`}
                            >
                              {done ? "✅" : "⭕"} {group.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {view === "monitor" && (
          <section className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Verpackungsmonitor</h2>
                <p className="text-slate-500">Reine Übersicht aller übernommenen Kunden und ihres Waschstatus.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                {packagingInfoRows.length} Kunden
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead className="bg-slate-100 text-sm">
                  <tr>
                    <th className="px-4 py-3">Kundennummer</th>
                    <th className="px-4 py-3">Kunde</th>
                    <th className="px-4 py-3">Übernommen</th>
                    <th className="px-4 py-3">Artikelgruppen</th>
                    <th className="px-4 py-3">Bereits gewaschen</th>
                  </tr>
                </thead>
                <tbody>
                  {packagingInfoRows.map((order) => {
                    const noWashRequired = order.washTotal === 0;
                    const fullyWashed = order.washTotal > 0 && order.washed === order.washTotal;
                    const partiallyWashed = order.washed > 0 && !fullyWashed;
                    return (
                      <tr key={order.id} className="border-t text-sm">
                        <td className="px-4 py-3 font-mono font-bold">{order.customer_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-black">{order.customer_name}</div>
                          {order.info && <div className="mt-1 text-xs font-semibold text-blue-800">{order.info}</div>}
                        </td>
                        <td className="px-4 py-3 font-semibold">{fmtDateTime(order.created_at)}</td>
                        <td className="px-4 py-3 font-semibold">{order.groups}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 font-black ${
                            noWashRequired
                              ? "border-slate-300 bg-slate-100 text-slate-700"
                              : fullyWashed
                                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                : partiallyWashed
                                  ? "border-blue-300 bg-blue-100 text-blue-800"
                                  : "border-amber-300 bg-amber-100 text-amber-800"
                          }`}>
                            {noWashRequired ? "Kein Waschgang" : fullyWashed ? "Gewaschen" : `${order.washed}/${order.washTotal} gewaschen`}
                          </span>
                          {order.latestWashedAt && <div className="mt-1 text-xs font-semibold text-slate-500">{fmtDateTime(order.latestWashedAt)}</div>}
                        </td>
                      </tr>
                    );
                  })}
                  {!packagingInfoRows.length && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center font-semibold text-slate-500">Keine übernommenen Kunden vorhanden.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "luftbild" && (
          <section className="rounded-3xl border bg-white p-5">
            <div className="mb-4 flex justify-between">
              <div><h2 className="text-2xl font-black">Luftbild Container</h2><p className="text-slate-500">Gelb = in Bearbeitung, Grün = fertig</p></div>
              <Button onClick={removeAllFinished}>Fertige Aufträge entfernen</Button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {ROWS.map((row) => (
                <div key={row} className="rounded-2xl border bg-slate-50 p-3">
                  <h3 className="mb-3 text-center font-black">Reihe {row}</h3>
                  <div className="grid gap-2">
                    {Array.from({ length: PLACES }, (_, i) => {
                      const place = i + 1;
                      const cont = containers.find((c) => c.row_number === row && c.place_number === place);
                      const order = cont ? orders.find((o) => o.id === cont.order_id) : null;
                      const color = !cont ? "bg-white border-dashed text-slate-400" : cont.status === "fertig" ? "bg-green-50 border-green-300 cursor-pointer" : "bg-yellow-50 border-yellow-300";
                      return (
                        <div key={place} onClick={() => cont?.status === "fertig" && removeContainer(cont)} className={`min-h-24 rounded-xl border p-2 text-xs ${color}`}>
                          {cont && order ? (
                            <>
                              <b>{order.customer_number}</b>
                              <b className="block break-words">{order.customer_name}</b>
                              <div className="mt-1 rounded bg-white/60 px-1">{cont.container_type}</div>
                              {cont.status === "fertig" && <div className="mt-1 text-center text-[10px] font-bold text-green-700">Antippen zum Entfernen</div>}
                            </>
                          ) : <div className="text-center">{place}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "touren" && (
          <section className="space-y-5">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Fertige Kunden</h2>
                  <p className="text-slate-500">Alle abgeschlossenen fertigen Kunden, aufsteigend nach Kundennummer.</p>
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  {new Date().toLocaleDateString("de-AT")}
                </div>
              </div>

              {tourRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
                  Noch keine fertigen Kunden abgeschlossen.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[...tourRows]
                    .sort((a, b) => String(a.customer_number).localeCompare(String(b.customer_number), "de", { numeric: true }))
                    .map((row) => (
                      <div key={row.id} className="rounded-xl border bg-white p-3 shadow-sm">
                        <div className="grid grid-cols-[90px_1fr] gap-2">
                          <span className="font-mono font-semibold">{row.customer_number}</span>
                          <b className="break-words">{row.customer_name}</b>
                        </div>
                        {row.putzereiOpen && (
                          <div className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-800">
                            P
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        )}

        {view === "personalplanung" && (
          <section className="space-y-2">
            <div className="rounded-2xl border bg-white p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black">Personalplanung</h2>
                  <div className={`mt-1 text-xs font-bold ${personnelSyncStatus === "connected" ? "text-emerald-700" : "text-amber-700"}`}>
                    {personnelSyncStatus === "connected" ? "Zentral gespeichert" : personnelSyncStatus === "setup_required" ? "Supabase-Einrichtung fehlt" : personnelSyncStatus === "loading" ? "Zentrale Planung wird geladen" : "Derzeit nur lokal gespeichert"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PERSONNEL_DEPARTMENTS).map(([deptKey, dept]) => (
                    <Button
                      key={deptKey}
                      active={personalDepartment === deptKey}
                      onClick={() => {
                        setPersonalDepartment(deptKey);
                        setExchangeTargetDept(deptKey === "waescherei" ? "putzerei" : "waescherei");
                        setExchangeEmployeeName("");
                      }}
                    >
                      {dept.label}
                    </Button>
                  ))}
                  <Input type="date" value={personalDate} onChange={(e) => setPersonalDate(e.target.value)} />
                  <span className="self-center text-xs font-bold text-slate-500">Kopieren von:</span>
                  <Input type="date" value={copyPersonalDate} onChange={(e) => setCopyPersonalDate(e.target.value)} />
                  <Button onClick={copyWholePersonalDay}>Tag kopieren</Button>
                  <Button onClick={() => openPersonnelEmployeeEditor()}>Mitarbeiter bearbeiten</Button>
                  <Button onClick={openPersonnelDepartmentEditor}>Abteilungen bearbeiten</Button>
                  <div className="flex items-center rounded-xl border bg-slate-50 p-1">
                    <span className="px-2 text-xs font-black text-slate-600">Umsatz:</span>
                    {PERSONNEL_DAY_STRENGTHS.map((strength) => (
                      <button
                        type="button"
                        key={strength.key}
                        onClick={() => setPersonnelDayStrength(strength.key)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-black ${getPersonnelDayStrength() === strength.key ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-white"}`}
                      >
                        {strength.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={applyPersonnelSuggestions}
                    className="rounded-xl border border-green-900 bg-green-700 px-4 py-2 text-sm font-black text-white hover:bg-green-800 active:scale-[0.98]"
                  >
                    KI-Vorschlag erstellen
                  </button>
                  {PERSONNEL_SHIFTS.map((shift) => (
                    <Button key={shift.key} active={personalShift === shift.key} onClick={() => setPersonalShift(shift.key)}>
                      {shift.label}
                    </Button>
                  ))}
                  <Button onClick={copyPreviousShiftSafe}>Vorherige Schicht übernehmen</Button>
                  <Button onClick={clearPersonalPlanSafe}>Leeren</Button>
                  <Button className="bg-emerald-700 text-white" onClick={exportPersonalPlanImage}>Als Bild teilen</Button>
                  <Button className="bg-blue-700 text-white" onClick={printPersonalPlanSafe}>Drucken</Button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[310px_1fr]">
                {PersonnelSidePanel()}
                {PersonnelMapOverview({ compact: true })}
              </div>

              {false && <div className="mb-4 rounded-2xl border bg-slate-50 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-black">Personalstatistik Urlaub / ZA / Krank</h3>
                    <p className="text-xs text-slate-500">Auswertung der gespeicherten Einteilungstage je Abteilung.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input type="date" value={personalStatsFrom} onChange={(e) => setPersonalStatsFrom(e.target.value)} />
                    <Input type="date" value={personalStatsTo} onChange={(e) => setPersonalStatsTo(e.target.value)} />
                    <Button onClick={printAbsenceStats}>Statistik drucken</Button>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl border bg-white p-3">
                    <small>Urlaub</small>
                    <div className="text-2xl font-black">
                      {absenceStatsRows().reduce((sum, r) => sum + r.urlaub, 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <small>Zeitausgleich</small>
                    <div className="text-2xl font-black">
                      {absenceStatsRows().reduce((sum, r) => sum + r.za, 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <small>Krank</small>
                    <div className="text-2xl font-black">
                      {absenceStatsRows().reduce((sum, r) => sum + r.krank, 0)}
                    </div>
                  </div>
                </div>
              </div>}

              {false && PersonnelMapOverview({})}

              {false && <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
                <aside className="rounded-3xl border bg-slate-50 p-3">
                  <h3 className="mb-2 text-lg font-black">Mitarbeiter</h3>

                  <div
                    className="mb-3 rounded-xl border bg-white p-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, "pool")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-black">Nicht eingeteilt</div>
                      <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                        {getUnassignedEmployees().length}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {getUnassignedEmployees().map((emp) => (
                        <div
                          key={emp.name}
                          draggable
                          onDragStart={() => setDragEmployee(emp.name)}
                          className="cursor-grab rounded-md border bg-slate-50 px-2 py-1"
                        >
                          <div className="text-[11px] font-black leading-tight">{emp.name}</div>
                          <div className="text-[9px] text-slate-500 leading-none">
                            {emp.hours ? `${emp.hours} h` : "Chef"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {[
                    { key: "urlaub", title: "Urlaub" },
                    { key: "za", title: "Zeitausgleich" },
                    { key: "krank", title: "Krank" },
                  ].map((zone) => {
                    const zoneEmployees = getSortedEmployees(
                      currentEmployees().filter((emp) => getEmployeeAssignment(emp.name) === zone.key)
                    );

                    return (
                      <div
                        key={zone.key}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, zone.key)}
                        className="mb-3 rounded-xl border bg-white p-2"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-black">{zone.title}</div>
                          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                            {zoneEmployees.length}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                          {zoneEmployees.map((emp) => (
                            <div
                              key={emp.name}
                              draggable
                              onDragStart={() => setDragEmployee(emp.name)}
                              className="cursor-grab rounded-md border bg-slate-50 px-2 py-1"
                            >
                              <div className="text-[11px] font-black leading-tight">{emp.name}</div>
                              <div className="text-[9px] text-slate-500 leading-none">
                                {emp.hours ? `${emp.hours} h` : "Chef"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="mb-3 rounded-xl border bg-white p-2">
                    <div className="mb-2 text-sm font-black">Mitarbeiter tauschen</div>
                    <select
                      className="mb-1 w-full rounded-xl border border-slate-300 px-2 py-1 text-sm"
                      value={exchangeEmployeeName}
                      onChange={(e) => setExchangeEmployeeName(e.target.value)}
                    >
                      <option value="">Mitarbeiter wählen</option>
                      {getSortedEmployees(currentEmployees()).map((emp) => (
                        <option key={emp.name} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                    <select
                      className="mb-2 w-full rounded-xl border border-slate-300 px-2 py-1 text-sm"
                      value={exchangeTargetDept}
                      onChange={(e) => setExchangeTargetDept(e.target.value)}
                    >
                      {Object.entries(PERSONNEL_DEPARTMENTS)
                        .filter(([deptKey]) => deptKey !== personalDepartment)
                        .map(([deptKey, dept]) => (
                          <option key={deptKey} value={deptKey}>{dept.label}</option>
                        ))}
                    </select>
                    <Button className="w-full py-1" onClick={exchangeEmployeeDepartment}>
                      Verschieben
                    </Button>
                  </div>

                  <div className="rounded-xl border bg-white p-2">
                    <div className="mb-2 text-sm font-black">Mitarbeiter anlegen</div>
                    <div className="grid grid-cols-[1fr_70px] gap-1">
                      <Input
                        className="px-2 py-1 text-sm"
                        placeholder="Name"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                      />
                      <Input
                        className="px-2 py-1 text-sm"
                        placeholder="Std."
                        value={newEmployeeHours}
                        onChange={(e) => setNewEmployeeHours(e.target.value)}
                      />
                    </div>
                    <Button className="mt-2 w-full py-1" onClick={addPersonnelEmployee}>
                      Mitarbeiter hinzufügen
                    </Button>
                  </div>
                </aside>

                <div className="space-y-3">
                  {currentGroups().map((group) => (
                    <div key={group.name} className="rounded-2xl border bg-white p-2">
                      <h3 className="mb-2 border-b pb-1 text-lg font-black text-slate-800">{group.name}</h3>

                      <div className="grid auto-rows-min gap-2 xl:grid-cols-3 2xl:grid-cols-6">
                        {group.sections.map((sectionName) => {
                          const section = currentSections().find((s) => s.name === sectionName);
                          if (!section) return null;

                          const target = getSectionTarget(section);
                          const assigned = getEmployeesInSection(section.name);

                          return (
                            <div
                              key={section.name}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, section.name)}
                              className={`rounded-xl border p-1 ${getSectionColor(section)}`}
                            >
                              <div className="mb-1 flex items-start justify-between gap-1">
                                <div>
                                  <h4 className="text-[13px] font-black leading-tight">{section.name}</h4>
                                  <div className="text-[10px] font-bold leading-tight">
                                    Soll: {target === null ? "bei Bedarf" : target} | Ist: {assigned.length}
                                  </div>
                                </div>
                                <div className="text-lg leading-none">
                                  {target === null ? "⚪" : assigned.length < target ? "🔴" : assigned.length > target ? "🟡" : "🟢"}
                                </div>
                              </div>

                              <div className="space-y-1">
                                {assigned.map((name) => {
                                  const emp = currentEmployees().find((e) => e.name === name);
                                  return (
                                    <div
                                      key={name}
                                      draggable
                                      onDragStart={() => setDragEmployee(name)}
                                      className="cursor-grab rounded-md border bg-white px-1 py-[1px]"
                                    >
                                      <div className="text-[11px] font-black leading-tight">{name}</div>
                                      <div className="text-[9px] text-slate-500 leading-none">{emp?.hours ? `${emp.hours} h/Woche` : "Chef"}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>
          </section>
        )}

        {view === "personaldisplay" && (
          <section className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-2 shadow-sm">
              <div>
                <h2 className="text-2xl font-black">Aktuelle Einteilung Wäscherei + Putzerei</h2>
                <div className="text-sm font-bold text-slate-500">
                  {new Date(`${personalDate}T12:00:00`).toLocaleDateString("de-AT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black">{PERSONNEL_SHIFTS.find((shift) => shift.key === personalShift)?.label}</div>
                <div className={`text-xs font-black ${personnelSyncStatus === "connected" ? "text-emerald-700" : "text-red-700"}`}>
                  {personnelSyncStatus === "connected" ? "Automatisch aktuell" : personnelSyncStatus === "waiting" ? "Warte auf die erste Planung" : personnelSyncStatus === "setup_required" ? "Supabase-Einrichtung fehlt" : "Verbindung wird hergestellt"}
                </div>
              </div>
            </div>
            <div className="pointer-events-none">{CombinedPersonnelFloorPlan()}</div>
          </section>
        )}

        {view === "personalmonitor" && (
          <section className="space-y-2">
            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Personalübersicht Wäscherei + Putzerei</h2>
                  <div className={`text-xs font-black ${personnelSyncStatus === "connected" ? "text-emerald-700" : "text-amber-700"}`}>
                    {personnelSyncStatus === "connected" ? "Zentral gespeichert und automatisch aktuell" : personnelSyncStatus === "setup_required" ? "Supabase-Einrichtung fehlt" : "Verbindung wird hergestellt"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!floorPlanEditMode && (
                    <>
                      <Input type="date" value={personalDate} onChange={(event) => setPersonalDate(event.target.value)} />
                      <Button className="border-green-700 bg-green-600 text-white hover:bg-green-700" onClick={sharePersonnelOverviewImage}>
                        Über WhatsApp teilen
                      </Button>
                      <Button active onClick={beginFloorPlanEdit}>
                        Positionen bearbeiten
                      </Button>
                    </>
                  )}
                  {floorPlanEditMode && (
                    <>
                      <Button onClick={resetFloorPlanDraft}>Standardpositionen</Button>
                      <Button onClick={cancelFloorPlanEdit}>Abbrechen</Button>
                      <Button active onClick={saveFloorPlanPositions}>
                        Positionen speichern
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {!floorPlanEditMode && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {PERSONNEL_SHIFTS.map((shift) => (
                    <Button key={shift.key} active={personalShift === shift.key} onClick={() => setPersonalShift(shift.key)}>
                      {shift.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {CombinedPersonnelFloorPlan({ editable: floorPlanEditMode })}
          </section>
        )}

        {view === "stats" && (
          <section className="rounded-3xl border bg-white p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="text-2xl font-black">Statistiken</h2><p className="text-slate-500">Verpackungszeit je Kunde</p></div>
              <div className="flex gap-2">
                <Input type="date" value={statsDate} onChange={(e) => setStatsDate(e.target.value)} />
                <Input type="time" value={statsFrom} onChange={(e) => setStatsFrom(e.target.value)} />
                <Input type="time" value={statsTo} onChange={(e) => setStatsTo(e.target.value)} />
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr><th className="p-3">Datum</th><th className="p-3">Nr.</th><th className="p-3">Kunde</th><th className="p-3">Übernahme</th><th className="p-3">Fertig</th><th className="p-3">Zeit</th></tr>
              </thead>
              <tbody>
                {statsRows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{new Date(r.completed_at).toLocaleDateString("de-AT")}</td>
                    <td className="p-3">{r.customer_number}</td>
                    <td className="p-3 font-semibold">{r.customer_name}</td>
                    <td className="p-3">{fmtTime(r.accepted_at)}</td>
                    <td className="p-3">{fmtTime(r.completed_at)}</td>
                    <td className="p-3 font-semibold">{r.duration_minutes} Min.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {view === "stammdaten" && (
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-2xl font-black">Stammdaten Kunden</h2><p className="text-slate-500">Pro Kunde festlegen, welche Unterkategorien bei den Stationen sichtbar sind.</p></div>
              <Input placeholder="Kunde suchen" value={masterSearch} onChange={(e) => setMasterSearch(e.target.value)} />
            </div>
            <div className="max-h-[650px] overflow-auto rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr><th className="p-3">Kundennummer</th><th className="p-3">Name</th><th className="p-3">Unterkategorien</th><th className="p-3 text-right">Aktion</th></tr>
                </thead>
                <tbody>
                  {customers.filter((c) => !masterSearch || c.customer_number.includes(masterSearch) || c.customer_name.toLowerCase().includes(masterSearch.toLowerCase())).map((c) => (
                    <tr key={c.id} className="border-t align-top">
                      <td className="p-3 font-semibold">{c.customer_number}</td>
                      <td className="p-3 font-semibold">{c.customer_name}</td>
                      <td className="p-3">
                        <div className="grid gap-2 md:grid-cols-3">
                          {ALL_SUBCATEGORIES.map((sub) => (
                            <label key={sub} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 ${isArticleEnabled(c.customer_number, sub) ? "bg-green-50 border-green-200" : "bg-slate-50 text-slate-400"}`}>
                              <input type="checkbox" checked={isArticleEnabled(c.customer_number, sub)} onChange={() => toggleCustomerArticle(c.customer_number, sub)} />
                              <span>{sub}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right"><Button className="border-red-200 bg-red-50 text-red-700" onClick={() => deleteMasterCustomer(c)}>Löschen</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "leitung" && (
          <section className="space-y-5">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Produktionsleitung</h2>
                  <p className="text-slate-500">Kunden nach letztem Produktionsstatus und Zeitraum filtern.</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLeitungDeleteModal(true)}
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-800 hover:bg-red-100"
                  >
                    Kunden löschen
                  </button>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                    <select
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                      value={leitungStatusFilter}
                      onChange={(e) => setLeitungStatusFilter(e.target.value)}
                    >
                      <option value="alle">Alle</option>
                      <option value="uebernommen">Uebernommen</option>
                      <option value="gewaschen">Gewaschen</option>
                      <option value="fertig">Fertig</option>
                      <option value="auf_tour">Auf der Tour</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Von</label>
                    <Input type="date" value={leitungDateFrom} onChange={(e) => setLeitungDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Bis</label>
                    <Input type="date" value={leitungDateTo} onChange={(e) => setLeitungDateTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sortierung</label>
                    <select
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                      value={leitungSort}
                      onChange={(e) => setLeitungSort(e.target.value)}
                    >
                      <option value="customer_asc">Kundennummer aufsteigend</option>
                      <option value="customer_desc">Kundennummer absteigend</option>
                      <option value="status_time">Letzter Status zuerst</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">Kundennummer</th>
                      <th className="p-3">Kunde</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Letzter Status</th>
                      <th className="p-3">Waschen</th>
                      <th className="p-3">Verpacken</th>
                      <th className="p-3">Container/Packerl</th>
                      <th className="p-3">Zusatz</th>
                      <th className="p-3">Tour</th>
                      <th className="p-3">Korrektur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionRows.map(({ order, status, details }) => (
                      <tr key={order.id} className="border-t">
                        <td className="p-3 font-mono font-semibold">{order.customer_number}</td>
                        <td className="p-3">
                          <b>{order.customer_name}</b>
                          {order.info && (
                            <div className="mt-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                              i {order.info}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 font-black ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{fmtDateTime(status.changedAt)}</td>
                        <td className="p-3 font-semibold">{details.washed}/{details.washTotal}</td>
                        <td className="p-3 font-semibold">{details.packed}/{details.packTotal}</td>
                        <td className="p-3 font-black">{order.container_count || "-"}</td>
                        <td className="p-3">
                          {details.putzereiOpen ? (
                            <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">P</span>
                          ) : "-"}
                        </td>
                        <td className="p-3">
                          {order.status === "auf_tour" ? (
                            <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                              Tour {order.tour_number || "-"}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                              value={status.key}
                              onChange={(e) => changeProductionStatus(order, e.target.value)}
                            >
                              <option value="uebernommen">Uebernommen</option>
                              <option value="gewaschen">Gewaschen</option>
                              <option value="fertig">Fertig</option>
                              <option value="auf_tour">Auf der Tour</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => archiveProductionOrder(order)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                            >
                              Archivieren
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!productionRows.length && (
                      <tr>
                        <td className="p-6 text-center font-semibold text-slate-500" colSpan="10">
                          Keine Kunden im gewaehlten Zeitraum.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {false && view === "leitung" && (
          <section className="space-y-5">
            <div className="grid gap-5 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5">
                <small>Waschplan</small>
                <div className="text-3xl font-black">
                  {WASH_CATEGORIES.reduce((sum, c) => sum + washRowsForCategory(c).length, 0)}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>In Bearbeitung</small>
                <div className="text-3xl font-black">{workingRows.length}</div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>Fertig</small>
                <div className="text-3xl font-black">{finishedRows.length}</div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>Auf der Tour</small>
                <div className="text-3xl font-black">{tourRows.length}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Produktionsstatus je Kunde</h2>
                  <p className="text-slate-500">
                    Übernommen → Gewaschen → Fertig → Auf der Tour. Mit ↑ ↓ kann die Reihenfolge geändert werden.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">Reihenfolge</th>
                      <th className="p-3">Kundennummer</th>
                      <th className="p-3">Kunde</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Waschen</th>
                      <th className="p-3">Verpacken</th>
                      <th className="p-3">Container/Packerl</th>
                      <th className="p-3">Zusatz</th>
                      <th className="p-3">Tour</th>
                      <th className="p-3 text-right">Verschieben</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProductionOrders.map((order, index) => {
                      const status = getCustomerProductionStatus(order);
                      const details = getCustomerStatusDetails(order);
                      return (
                        <tr key={order.id} className="border-t">
                          <td className="p-3 font-semibold">{index + 1}</td>
                          <td className="p-3 font-mono font-semibold">{order.customer_number}</td>
                          <td className="p-3">
                            <b>{order.customer_name}</b>
                            {order.info && (
                              <div className="mt-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                ℹ {order.info}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full border px-3 py-1 font-black ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">
                            {details.washed}/{details.washTotal}
                          </td>
                          <td className="p-3 font-semibold">
                            {details.packed}/{details.packTotal}
                          </td>
                          <td className="p-3 font-black">
                            {order.container_count || "-"}
                          </td>
                          <td className="p-3">
                            {details.putzereiOpen ? (
                              <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                                P
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3">
                            {order.status === "auf_tour" ? (
                              <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                                Tour {order.tour_number || "-"}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <Button onClick={() => moveOrder(order, -1)}>↑</Button>
                              <Button onClick={() => moveOrder(order, 1)}>↓</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ExternalPersonnelPortal() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setLoginBusy(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoginError("E-Mail-Adresse oder Passwort ist falsch.");
      setLoginBusy(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-lg font-black text-slate-600">Anmeldung wird geprüft</div>;
  }

  if (session) return <App />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-lg">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center text-2xl font-black">Personalplanung</h1>
        <p className="mt-1 text-center text-sm font-semibold text-slate-500">Benutzerzugang für die Produktionsleitung</p>
        <form className="mt-6 space-y-3" onSubmit={signIn}>
          <label className="block text-sm font-black text-slate-700">
            E-Mail-Adresse
            <Input
              className="mt-1 w-full"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm font-black text-slate-700">
            Passwort
            <Input
              className="mt-1 w-full"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {loginError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{loginError}</div>}
          <Button active className="w-full" disabled={loginBusy || !email.trim() || !password}>
            {loginBusy ? "Anmeldung läuft" : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}

const externalPersonnelPortal = new URLSearchParams(window.location.search).get("portal") === "personalplanung";
ReactDOM.createRoot(document.getElementById("root")).render(externalPersonnelPortal ? <ExternalPersonnelPortal /> : <App />);
