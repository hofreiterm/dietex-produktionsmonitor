import "./index.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

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
    categories: ["BettwÃ¤sche", "TischwÃ¤sche"],
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
  { name: "Waschmaschinen", target: { default: 1 } },
  { name: "Putzmaschinen", target: { default: 1 } },
  { name: "Tunnelfinisher", target: { default: 1 } },
  { name: "Hemdenabteilung", target: { default: 2 } },
  { name: "Bügeltische", target: { default: 5 } },
  { name: "Verpackung", target: { default: 1 } },
  { name: "Kleinwäscheabteilung", target: { default: 1 } },
  { name: "Expedit", target: { default: 1 } },
];

const PUTZEREI_GROUPS = [
  {
    name: "Annahme / Waschen",
    sections: ["Übernahme", "Waschmaschinen", "Putzmaschinen"],
  },
  {
    name: "Finish",
    sections: ["Tunnelfinisher", "Hemdenabteilung", "Bügeltische"],
  },
  {
    name: "Verpackung",
    sections: ["Verpackung", "Kleinwäscheabteilung", "Expedit"],
  },
];

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
      { section: "Ãœbernahme", x: 12, y: 88, w: 14 },
      { section: "WaschstraÃŸen", x: 18, y: 32, w: 14 },
      { section: "Waschmaschinen", x: 13, y: 43, w: 14 },
      { section: "Absortierung", x: 48, y: 22, w: 15 },
      { section: "Mangel 1", x: 64, y: 29, w: 14 },
      { section: "Mangel 2", x: 64, y: 50, w: 14 },
      { section: "Frottee 1", x: 86, y: 20, w: 12 },
      { section: "Frottee 2", x: 86, y: 48, w: 12 },
      { section: "BM + SPLT", x: 88, y: 82, w: 12 },
      { section: "Jenway GroÃŸteile", x: 42, y: 34, w: 14 },
      { section: "Jenway Kleinteile", x: 42, y: 52, w: 14 },
      { section: "Jenway Frottee", x: 42, y: 68, w: 14 },
      { section: "PoolwÃ¤sche", x: 70, y: 84, w: 13 },
      { section: "Expedit", x: 74, y: 75, w: 13 },
      { section: "WÃ¤sche auspacken", x: 25, y: 92, w: 14 },
    ],
  },
  putzerei: {
    title: "Gesamtuebersicht Putzerei",
    image: "/plan-skizze-putzerei.jpg",
    imageFallbacks: ["/plan skizze Putzerei.jpg", "/plan%20skizze%20Putzerei.jpg"],
    aspect: "aspect-[715/522]",
    zones: [
      { section: "Ãœbernahme", x: 10, y: 90, w: 15 },
      { section: "Waschmaschinen", x: 22, y: 38, w: 14 },
      { section: "Putzmaschinen", x: 43, y: 43, w: 14 },
      { section: "Tunnelfinisher", x: 71, y: 25, w: 14 },
      { section: "Hemdenabteilung", x: 77, y: 78, w: 14 },
      { section: "BÃ¼geltische", x: 60, y: 58, w: 14 },
      { section: "Verpackung", x: 88, y: 45, w: 14 },
      { section: "KleinwÃ¤scheabteilung", x: 28, y: 80, w: 15 },
      { section: "Expedit", x: 10, y: 57, w: 13 },
    ],
  },
};

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
  const initialView = params.get("view") || "annahme";
  const initialStationKey = params.get("station");
  const initialStation = STATIONS.find((s) => s.key === initialStationKey) || STATIONS[0];
  const fixedView = params.get("fixed") === "1";
  const expeditMode = params.get("view") === "expedit";
  const takeoverMode = fixedView && (initialView === "annahme" || initialView === "uebernahme" || params.get("mode") === "uebernahme");
  const requestedInitialView = takeoverMode
    ? "annahme"
    : expeditMode
      ? "monitor"
      : initialView === "stats"
        ? "leitung"
        : initialView === "uebernahme"
        ? "annahme"
        : initialView;
  const initialAdminUnlocked = isAdminSessionUnlocked();

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

  const [stationSearch, setStationSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [statsDate, setStatsDate] = useState(fmtDateInput());
  const [statsFrom, setStatsFrom] = useState("00:00");
  const [statsTo, setStatsTo] = useState("23:59");
  const [leitungStatusFilter, setLeitungStatusFilter] = useState("alle");
  const [leitungDateFrom, setLeitungDateFrom] = useState(fmtDateInput());
  const [leitungDateTo, setLeitungDateTo] = useState(fmtDateInput());
  const [tick, setTick] = useState(Date.now());
  const [hiddenStationOrders, setHiddenStationOrders] = useState({});

  const [personalDate, setPersonalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalDepartment, setPersonalDepartment] = useState("waescherei");
  const [copyPersonalDate, setCopyPersonalDate] = useState(() => new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  const [personalStatsFrom, setPersonalStatsFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalStatsTo, setPersonalStatsTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalShift, setPersonalShift] = useState("07-12");
  const [personalPlan, setPersonalPlan] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dietexPersonalPlan") || "{}");
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
  const [personnelEmployeesByDept, setPersonnelEmployeesByDept] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dietexPersonnelEmployeesByDept") || "null");
      if (saved && typeof saved === "object") {
        return {
          waescherei: Array.isArray(saved.waescherei) && saved.waescherei.length ? saved.waescherei : PERSONNEL_EMPLOYEES,
          putzerei: Array.isArray(saved.putzerei) && saved.putzerei.length ? saved.putzerei : PUTZEREI_EMPLOYEES,
        };
      }
    } catch {}
    return {
      waescherei: PERSONNEL_EMPLOYEES,
      putzerei: PUTZEREI_EMPLOYEES,
    };
  });
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeHours, setNewEmployeeHours] = useState("");
  const [exchangeEmployeeName, setExchangeEmployeeName] = useState("");
  const [exchangeTargetDept, setExchangeTargetDept] = useState("putzerei");

  const [tourModal, setTourModal] = useState(null);
  const [tourContainerCount, setTourContainerCount] = useState("");
  const [tourNumberInput, setTourNumberInput] = useState("");
  const [dragOrderId, setDragOrderId] = useState(null);
  const [pendingWash, setPendingWash] = useState({});
  const [monitorDetailOrder, setMonitorDetailOrder] = useState(null);
  const washTimers = useRef({});

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("dietex-live")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadAll())
      .subscribe();

    return () => supabase.removeChannel(channel);
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
    return () => {
      Object.values(washTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
      autoArchiveFinishedAt2330();
    }, 1000);
    return () => clearInterval(interval);
  }, [orders, items]);

  useEffect(() => {
    setHiddenStationOrders((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        STATIONS.forEach((station) => {
          const relevant = enabledItemsForOrder(order).filter((i) => station.items.includes(i.subcategory));
          const key = `${order.id}-${station.key}`;
          if (relevant.length > 0 && relevant.every((i) => i.is_done) && !next[key]) {
            next[key] = Date.now() + 10000;
          }
        });
      });
      return next;
    });
  }, [orders, items, articleSettings]);

  async function loadAll() {
    const [c, o, i, co, h, s] = await Promise.all([
      supabase.from("customers").select("*").order("customer_number"),
      supabase.from("orders").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("order_categories").select("*").order("subcategory"),
      supabase.from("containers").select("*").is("removed_at", null).order("row_number").order("place_number"),
      supabase.from("order_history").select("*").order("completed_at", { ascending: false }),
      supabase.from("customer_article_settings").select("*"),
    ]);

    if (!c.error) setCustomers(c.data || []);
    if (!o.error) setOrders((o.data || []).filter((x) => x.status !== "archiviert"));
    if (!i.error) setItems(i.data || []);
    if (!co.error) setContainers(co.data || []);
    if (!h.error) setHistory(h.data || []);
    if (!s.error) setArticleSettings(s.data || []);
  }

  function isArticleEnabled(customerNumber, subcategory) {
    const setting = articleSettings.find((s) => String(s.customer_number) === String(customerNumber) && s.subcategory === subcategory);
    return setting ? setting.is_enabled : true;
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

  async function autoArchiveFinishedAt2330() {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    if (now.getHours() === 23 && now.getMinutes() === 30 && localStorage.getItem("dietexAutoArchive") !== todayKey) {
      localStorage.setItem("dietexAutoArchive", todayKey);
      await archiveFinishedOrders();
    }
  }

  async function archiveFinishedOrders(orderIds = null) {
    const finished = orders.filter((o) => {
      if (o.status !== "auf_tour") return false;

      const related = enabledItemsForOrder(o).filter((i) => i.category !== "Putzerei");

      return related.length > 0 && related.every((i) => i.is_done);
    });
    const ids = orderIds || finished.map((o) => o.id);
    if (!ids.length) return;

    const firstOrder = orders.find((o) => o.id === ids[0]);
    setTourModal({
      ids,
      customerName: firstOrder?.customer_name || "",
      customerNumber: firstOrder?.customer_number || "",
    });
    setTourContainerCount("");
    setTourNumberInput("");
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
      const existingItems = items.filter((i) => i.order_id === existingOrder.id);
      const existingSubcategories = new Set(existingItems.map((i) => i.subcategory));

      const rowsToAdd = orderRows
        .filter((row) => !existingSubcategories.has(row.subcategory))
        .map((row) => ({ order_id: existingOrder.id, category: row.category, subcategory: row.subcategory }));

      if (rowsToAdd.length) {
        await supabase.from("order_categories").insert(rowsToAdd);
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

        await supabase.from("containers").insert(
          newContainerPlan.map((p, idx) => ({
            order_id: existingOrder.id,
            container_type: p.type,
            row_number: slots[idx].row,
            place_number: slots[idx].place,
            status: "bearbeitung",
          }))
        );
      }

      if (info.trim()) {
        const mergedInfo = existingOrder.info
          ? `${existingOrder.info} | ${info.trim()}`
          : info.trim();

        await supabase.from("orders").update({ info: mergedInfo }).eq("id", existingOrder.id);
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
    if (rows.length) await supabase.from("order_categories").insert(rows);

    if (plan.length) {
      await supabase.from("containers").insert(
        plan.map((p, idx) => ({
          order_id: order.id,
          container_type: p.type,
          row_number: slots[idx].row,
          place_number: slots[idx].place,
          status: "bearbeitung",
        }))
      );
    }

    setCustomerSearch("");
    setCustomerNumber("");
    setCustomerName("");
    setInfo("");
    setSelectedCategories([]);
    setExcludedOrderArticles({});
    loadAll();
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
          const relevant = orderItems.filter((i) => station.items.includes(i.subcategory));
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
    const washKey = getWashKey(order.id, category);

    if (pendingWash[washKey]) {
      clearTimeout(washTimers.current[washKey]);
      delete washTimers.current[washKey];
      setPendingWash((prev) => {
        const next = { ...prev };
        delete next[washKey];
        return next;
      });
      return;
    }

    const relatedIds = items
      .filter((i) => i.order_id === order.id && i.category === category && !i.washed_at)
      .map((i) => i.id);
    if (!relatedIds.length) return;

    setPendingWash((prev) => ({ ...prev, [washKey]: true }));
    washTimers.current[washKey] = window.setTimeout(async () => {
      await supabase
        .from("order_categories")
        .update({ washed_at: new Date().toISOString() })
        .in("id", relatedIds);

      delete washTimers.current[washKey];
      setPendingWash((prev) => {
        const next = { ...prev };
        delete next[washKey];
        return next;
      });
      loadAll();
    }, 5000);
  }

  async function moveOrder(order, direction) {
    const current = sortedOrders.findIndex((o) => o.id === order.id);
    const other = sortedOrders[current + direction];
    if (!other) return;

    const aSort = Number(order.sort_order || current * 10);
    const bSort = Number(other.sort_order || (current + direction) * 10);

    await Promise.all([
      supabase.from("orders").update({ sort_order: bSort }).eq("id", order.id),
      supabase.from("orders").update({ sort_order: aSort }).eq("id", other.id),
    ]);
    loadAll();
  }

  async function reorderOrder(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;

    const currentList = [...sortedOrders];
    const fromIndex = currentList.findIndex((o) => o.id === draggedId);
    const toIndex = currentList.findIndex((o) => o.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [dragged] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, dragged);

    await Promise.all(
      currentList.map((order, index) =>
        supabase.from("orders").update({ sort_order: (index + 1) * 10 }).eq("id", order.id)
      )
    );

    setDragOrderId(null);
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
      const related = enabledItemsForOrder(order).filter((i) => activeStation.items.includes(i.subcategory));
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
      const aTime = a.status.changedAt ? new Date(a.status.changedAt).getTime() : 0;
      const bTime = b.status.changedAt ? new Date(b.status.changedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a.order.customer_number).localeCompare(String(b.order.customer_number), "de", { numeric: true });
    });


  const currentDepartmentConfig = () => PERSONNEL_DEPARTMENTS[personalDepartment] || PERSONNEL_DEPARTMENTS.waescherei;

  const currentSections = () => currentDepartmentConfig().sections;
  const currentGroups = () => currentDepartmentConfig().groups;
  const currentEmployees = () => personnelEmployeesByDept[personalDepartment] || currentDepartmentConfig().employees;

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

  const setEmployeeToSection = (employeeName, sectionName) => {
    setPersonalPlan((prev) => {
      const key = getPersonalKey();
      const current = prev[key] || {};
      const next = {};

      const allZones = allPlanningZones();

      allZones.forEach((zone) => {
        next[zone] = (current[zone] || []).filter((name) => name !== employeeName);
      });

      if (sectionName !== "pool") {
        next[sectionName] = [...(next[sectionName] || []), employeeName];
      }

      return { ...prev, [key]: next };
    });
  };

  const getSectionTarget = (section) => {
    if (section.target.flexible) return null;
    return section.target[personalShift] ?? section.target.default ?? 0;
  };

  const getSectionColor = (section) => {
    const target = getSectionTarget(section);
    if (target === null) return "border-slate-300 bg-slate-50";

    const actual = getEmployeesInSection(section.name).length;
    if (actual < target) return "border-red-300 bg-red-50";
    if (actual > target) return "border-yellow-300 bg-yellow-50";
    return "border-green-300 bg-green-50";
  };

  const getEmployeeStatus = (name) => employeeStatus[`${personalDepartment}_${name}`] || "anwesend";

  const cycleEmployeeStatus = (name) => {
    const values = ["anwesend", "krank", "urlaub", "frei"];
    const current = getEmployeeStatus(name);
    const next = values[(values.indexOf(current) + 1) % values.length];
    setEmployeeStatus((prev) => ({ ...prev, [`${personalDepartment}_${name}`]: next }));
  };

  const getActiveEmployees = () => currentEmployees().filter((e) => getEmployeeStatus(e.name) === "anwesend");

  const getSortedEmployees = (list) =>
    [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true }));

  const getUnassignedEmployees = () =>
    getSortedEmployees(getActiveEmployees().filter((e) => !getEmployeeAssignment(e.name)));

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
    "urlaub",
    "za",
    "krank",
  ];

  const applyPersonnelSuggestions = () => {
    const currentKey = getPersonalKey();
    const currentPlan = personalPlan[currentKey] || {};

    const nextPlan = {
      urlaub: [...(currentPlan.urlaub || [])],
      za: [...(currentPlan.za || [])],
      krank: [...(currentPlan.krank || [])],
    };

    currentSections().forEach((section) => {
      nextPlan[section.name] = [];
    });

    const unavailable = new Set([
      ...nextPlan.urlaub,
      ...nextPlan.za,
      ...nextPlan.krank,
    ]);

    const historyPlans = Object.entries(personalPlan)
      .filter(([key]) => key.startsWith(`${personalDepartment}_`) && key !== currentKey)
      .map(([, plan]) => plan || {});

    const assigned = new Set(unavailable);

    currentSections().forEach((section) => {
      const target = getSectionTarget(section);
      if (target === null || target <= 0) return;

      const candidates = currentEmployees()
        .filter((emp) => getEmployeeStatus(emp.name) === "anwesend")
        .filter((emp) => !assigned.has(emp.name))
        .map((emp) => {
          let score = 0;

          historyPlans.forEach((plan) => {
            if ((plan[section.name] || []).includes(emp.name)) score += 10;

            Object.entries(plan).forEach(([zone, names]) => {
              if (zone !== section.name && (names || []).includes(emp.name)) score += 1;
            });
          });

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

    setPersonalPlan((prev) => ({ ...prev, [getPersonalKey()]: source }));
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

  function openPinModal(nextView = null) {
    setPinInput("");
    setPinError("");
    setPinModal({ nextView });
  }

  function goToView(nextView) {
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


  function SmallCustomerCard({ row, onClick }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`grid w-full grid-cols-[80px_1fr_35px] items-center rounded-lg border bg-white px-3 py-2 text-left text-sm hover:shadow ${
          onClick ? "cursor-pointer" : ""
        }`}
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
      </button>
    );
  }

  function WashCard({ row, category, compact = false }) {
    const washKey = getWashKey(row.id, category);
    const isPending = Boolean(pendingWash[washKey]);
    const categoryIcons = categoryIconsForRow(row);

    return (
      <div
        draggable
        onDragStart={(e) => {
          setDragOrderId(row.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          reorderOrder(dragOrderId, row.id);
        }}
        className={`w-full rounded-xl border ${compact ? "px-2 py-1.5" : "px-3 py-2"} text-left shadow-sm transition ${
          isPending ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300" : "bg-white hover:ring-2 hover:ring-blue-300"
        } ${dragOrderId === row.id ? "ring-2 ring-blue-400 opacity-70" : ""}`}
      >
        <div className={`grid ${compact ? "grid-cols-[20px_62px_1fr_auto] gap-1.5" : "grid-cols-[28px_84px_1fr_auto] gap-3"} items-center`}>
          <div className="cursor-grab select-none text-lg text-slate-400" title="Ziehen">â†•</div>
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
            â„¹ {row.info}
          </div>
        )}
      </div>
    );
  }

  function PersonnelMapOverview({ compact = false }) {
    const map = PERSONNEL_MAPS[personalDepartment];
    if (!map) return null;

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
            const sectionName = currentSections()[index]?.name || zone.section;
            const names = getEmployeesInSection(sectionName);

            return (
              <div
                key={sectionName}
                className={`absolute rounded-lg border p-1 shadow-md backdrop-blur-sm ${
                  names.length ? "border-blue-300 bg-white/90" : "border-slate-300 bg-white/50"
                }`}
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
                    <span
                      key={name}
                      draggable
                      onDragStart={() => setDragEmployee(name)}
                      className="cursor-grab rounded-md bg-blue-700 px-1.5 py-0.5 text-[9px] font-black leading-tight text-white"
                    >
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

  function PersonnelSidePanel() {
    const absenceZones = [
      { key: "urlaub", title: "Urlaub" },
      { key: "za", title: "ZA" },
      { key: "krank", title: "Krank" },
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
          className="mb-2 rounded-xl border bg-white p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, "pool")}
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-black">Nicht eingeteilt</div>
            <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
              {getUnassignedEmployees().length}
            </div>
          </div>
          <div className="grid max-h-[28vh] grid-cols-2 gap-1 overflow-auto">
            {getUnassignedEmployees().map((emp) => (
              <div
                key={emp.name}
                draggable
                onDragStart={() => setDragEmployee(emp.name)}
                className="cursor-grab rounded-md border bg-slate-50 px-2 py-1"
              >
                <div className="text-[11px] font-black leading-tight">{emp.name}</div>
                <div className="text-[9px] text-slate-500 leading-none">{emp.hours ? `${emp.hours} h` : "Chef"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          {absenceZones.map((zone) => {
            const zoneEmployees = getSortedEmployees(
              currentEmployees().filter((emp) => getEmployeeAssignment(emp.name) === zone.key)
            );

            return (
              <div
                key={zone.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragEmployee && setEmployeeToSection(dragEmployee, zone.key)}
                className="rounded-xl border bg-white p-2"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-xs font-black">{zone.title}</div>
                  <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                    {zoneEmployees.length}
                  </div>
                </div>
                <div className="flex min-h-8 flex-wrap gap-1">
                  {zoneEmployees.map((emp) => (
                    <span
                      key={emp.name}
                      draggable
                      onDragStart={() => setDragEmployee(emp.name)}
                      className="cursor-grab rounded-md border bg-slate-50 px-2 py-1 text-[10px] font-black"
                    >
                      {emp.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
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
          <div className={`${fixedView ? "text-2xl" : "text-3xl"} text-center font-black`}>{expeditMode ? "DieTex Expedit" : "DieTex Produktionsmonitor"}</div>
          <div className="flex items-center justify-end gap-3">
            {!fixedView && (adminUnlocked ? (
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
                      <div
                        key={item.id}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                          item.is_done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{displaySubcategory(item.subcategory)}</span>
                          <span>{item.is_done ? "Fertig" : "Offen"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className={`mx-auto max-w-[1800px] ${fixedView ? "p-2" : "p-5"}`}>
        {(!fixedView || takeoverMode) && (
          <nav className="mb-5 flex flex-wrap justify-center gap-2">
            {(takeoverMode
              ? [
                  ["annahme", "Kunden Ã¼bernehmen"],
                  ["station", "Station"],
                ]
              : expeditMode
              ? [
                  ["monitor", "Verpackungsmonitor"],
                  ["touren", "Touren"],
                ]
              : [
                  ["annahme", "Kunden übernehmen"],
                  ["waschplan", "Waschplan"],
                  ["station", "Station"],
                  ["monitor", "Verpackungsmonitor"],
                  ["touren", "Touren"],
                  ["stammdaten", "Stammdaten"],
                  ["leitung", "Produktionsleitung"],
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
                    {rows.map((row) => (
                      <WashCard key={`${row.id}-${cat}`} row={row} category={cat} compact={fixedView} />
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
                    .filter((i) => activeStation.items.includes(i.subcategory))
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
          <section className="grid gap-5 lg:grid-cols-4">
            {splitIntoColumns(workingRows, 2).map((col, idx) => (
              <div key={`work-${idx}`} className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4">
                <h2 className="mb-3 border-b-2 border-orange-400 pb-2 text-center font-black">IN BEARBEITUNG</h2>
                <div className="space-y-2">{col.map((r) => <SmallCustomerCard key={r.id} row={r} onClick={() => setMonitorDetailOrder(r)} />)}</div>
              </div>
            ))}
            {splitIntoColumns(finishedRows, 2).map((col, idx) => (
              <div key={`done-${idx}`} className="rounded-3xl border border-green-100 bg-green-50/40 p-4">
                <h2 className="mb-3 border-b-2 border-green-500 pb-2 text-center font-black">FERTIG</h2>
                <div className="space-y-2">{col.map((r) => <SmallCustomerCard key={r.id} row={r} onClick={() => archiveFinishedOrders([r.id])} />)}</div>
              </div>
            ))}
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
                  <h2 className="text-2xl font-black">Touren</h2>
                  <p className="text-slate-500">Alle Kunden mit Status Auf der Tour, nach Tourennummer aufsteigend sortiert.</p>
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  {new Date().toLocaleDateString("de-AT")}
                </div>
              </div>

              {tourColumns.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
                  Heute sind noch keine Kunden auf Tour gesetzt.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {tourColumns.map((col) => (
                    <div key={col.tour} className="rounded-3xl border border-violet-200 bg-violet-50/50 p-4">
                      <div className="mb-3 border-b-2 border-violet-400 pb-2">
                        <h3 className="text-center text-2xl font-black text-violet-900">
                          Tour {col.tour}
                        </h3>
                        <button
                          onClick={() => removeWholeTour(col.tour)}
                          className="mt-2 w-full rounded-xl bg-red-100 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-200"
                        >
                          Ganze Tour löschen
                        </button>
                      </div>
                      <div className="space-y-2">
                        {col.rows.map((row) => (
                          <div key={row.id} className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="grid grid-cols-[90px_1fr] gap-2">
                              <span className="font-mono font-semibold">{row.customer_number}</span>
                              <b className="break-words">{row.customer_name}</b>
                            </div>
                            <div className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-black text-violet-900">
                              Container/Packerl: {row.container_count || "-"}
                            </div>
                            {row.putzereiOpen && (
                              <div className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-800">
                                P
                              </div>
                            )}

                            <button
                              onClick={() => removeTourCustomer(row.id)}
                              className="mt-2 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
                            >
                              Kunde entfernen
                            </button>
                          </div>
                        ))}
                      </div>
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
                  <button
                    type="button"
                    onClick={applyPersonnelSuggestions}
                    className="rounded-xl border border-green-900 bg-green-700 px-4 py-2 text-sm font-black text-white hover:bg-green-800 active:scale-[0.98]"
                  >
                    Vorschlag erstellen
                  </button>
                  {PERSONNEL_SHIFTS.map((shift) => (
                    <Button key={shift.key} active={personalShift === shift.key} onClick={() => setPersonalShift(shift.key)}>
                      {shift.label}
                    </Button>
                  ))}
                  <Button onClick={copyPreviousShiftSafe}>Vorherige Schicht übernehmen</Button>
                  <Button onClick={clearPersonalPlanSafe}>Leeren</Button>
                  <Button className="bg-blue-700 text-white" onClick={printPersonalPlanSafe}>Drucken</Button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[310px_1fr]">
                <PersonnelSidePanel />
                <PersonnelMapOverview compact />
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

              {false && <PersonnelMapOverview />}

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
                      </tr>
                    ))}
                    {!productionRows.length && (
                      <tr>
                        <td className="p-6 text-center font-semibold text-slate-500" colSpan="9">
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
