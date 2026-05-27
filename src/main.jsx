import "./index.css";
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  "https://dkdusyigghttjxdpbofy.supabase.co",
  "sb_publishable_Mr55Ge_ud02QSvXwWj0hTg_EQa19pPs"
);

const CATEGORIES = {
  Bettwäsche: ["Deckenbezüge + Leintücher", "Polsterbezüge"],
  Frottee: ["Frottee", "Spannleintücher", "Bademäntel"],
  Tischwäsche: ["Tischtücher", "Deckservietten", "Mundservietten"],
  Putzerei: ["Putzerei"],
};

const WASH_CATEGORIES = ["Bettwäsche", "Frottee", "Tischwäsche"];

const ALL_SUBCATEGORIES = [
  "Deckenbezüge + Leintücher",
  "Polsterbezüge",
  "Frottee",
  "Spannleintücher",
  "Bademäntel",
  "Tischtücher",
  "Deckservietten",
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
  { key: "jenway-kleinteile", name: "Jenway Kleinteile", items: ["Polsterbezüge", "Mundservietten", "Tischtücher", "Deckservietten"] },
  { key: "jenway-grossteile", name: "Jenway Großteile", items: ["Deckenbezüge + Leintücher"] },
  { key: "jenway-frottee", name: "Jenway Frottee", items: ["Frottee"] },
  { key: "frottee-splt-bm", name: "Frottee SPLT + BM", items: ["Bademäntel", "Spannleintücher"] },
  { key: "putzerei", name: "Putzerei", items: ["Putzerei"] },
];

const ROWS = [1, 2, 3, 4, 5];
const PLACES = 10;

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

function fmtDateInput(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function splitIntoColumns(rows, count) {
  const cols = Array.from({ length: count }, () => []);
  rows.forEach((row, idx) => cols[idx % count].push(row));
  return cols;
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("view") || "annahme";
  const initialStationKey = params.get("station");
  const initialStation = STATIONS.find((s) => s.key === initialStationKey) || STATIONS[0];
  const fixedView = params.get("fixed") === "1";

  const [view, setView] = useState(initialView === "uebernahme" ? "annahme" : initialView);
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

  const [stationSearch, setStationSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [statsDate, setStatsDate] = useState(fmtDateInput());
  const [statsFrom, setStatsFrom] = useState("00:00");
  const [statsTo, setStatsTo] = useState("23:59");
  const [tick, setTick] = useState(Date.now());
  const [hiddenStationOrders, setHiddenStationOrders] = useState({});

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("dietex-live")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadAll())
      .subscribe();

    return () => supabase.removeChannel(channel);
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

  function isArticleEnabled(customerId, subcategory) {
    const setting = articleSettings.find((s) => s.customer_id === customerId && s.subcategory === subcategory);
    return setting ? setting.is_enabled : true;
  }

  function enabledItemsForOrder(order) {
    return items.filter((i) => i.order_id === order.id && isArticleEnabled(order.customer_id, i.subcategory));
  }

  async function toggleCustomerArticle(customerId, subcategory) {
    const current = isArticleEnabled(customerId, subcategory);
    const next = !current;
    const existing = articleSettings.find((s) => s.customer_id === customerId && s.subcategory === subcategory);

    if (existing) {
      await supabase.from("customer_article_settings").update({ is_enabled: next }).eq("id", existing.id);
    } else {
      await supabase.from("customer_article_settings").insert({ customer_id: customerId, subcategory, is_enabled: next });
    }

    setArticleSettings((prev) => {
      if (existing) return prev.map((s) => (s.id === existing.id ? { ...s, is_enabled: next } : s));
      return [...prev, { id: `${customerId}-${subcategory}`, customer_id: customerId, subcategory, is_enabled: next }];
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
      const related = enabledItemsForOrder(o);
      return related.length > 0 && related.every((i) => i.is_done);
    });
    const ids = orderIds || finished.map((o) => o.id);
    if (!ids.length) return;

    await supabase.from("orders").update({ status: "archiviert" }).in("id", ids);
    await supabase.from("containers").update({ removed_at: new Date().toISOString() }).in("order_id", ids);
    loadAll();
  }

  async function importCustomersExcel(event) {
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
    if (!customerNumber.trim() || !customerName.trim()) return alert("Kundennummer und Kundenname eingeben.");
    if (!selectedCategories.length) return alert("Mindestens eine Kategorie auswählen.");

    const plan = getContainerPlan(selectedCategories);
    const slots = findFreeSlots(plan.length);
    if (!slots) return alert("Kein freier Containerplatz verfügbar.");

    let customer = customers.find((c) => c.customer_number === customerNumber.trim());
    if (!customer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({ customer_number: customerNumber.trim(), customer_name: customerName.trim() })
        .select()
        .single();
      if (error) return alert("Kunde konnte nicht gespeichert werden: " + error.message);
      customer = data;
    }

    const maxSort = Math.max(0, ...orders.map((o) => Number(o.sort_order || 0)));
    const sameDayOrders = orders.filter((o) => o.customer_number === customerNumber.trim()).length;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        customer_number: customerNumber.trim(),
        customer_name: customerName.trim(),
        info: info.trim() || null,
        sequence_number: sameDayOrders + 1,
        status: "uebernommen",
        sort_order: maxSort + 10,
      })
      .select()
      .single();

    if (error) return alert("Auftrag konnte nicht erstellt werden: " + error.message);

    const rows = selectedCategories.flatMap((cat) =>
      (CATEGORIES[cat] || []).map((sub) => ({ order_id: order.id, category: cat, subcategory: sub }))
    );
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
  }

  async function toggleItem(item) {
    const next = !item.is_done;
    await supabase
      .from("order_categories")
      .update({ is_done: next, done_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);

    const order = orders.find((o) => o.id === item.order_id);
    const orderItems = enabledItemsForOrder(order).map((i) => (i.id === item.id ? { ...i, is_done: next } : i));
    const allDone = orderItems.length > 0 && orderItems.every((i) => i.is_done);

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

  async function washCategory(order, category) {
    if (!confirm(`${order.customer_name} - ${category} als gewaschen entfernen?`)) return;
    const relatedIds = items.filter((i) => i.order_id === order.id && i.category === category).map((i) => i.id);
    if (!relatedIds.length) return;
    await supabase.from("order_categories").update({ washed_at: new Date().toISOString() }).in("id", relatedIds);
    loadAll();
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
        const open = relevant.filter((i) => !i.washed_at);
        return { ...order, washTotal: relevant.length, washOpen: open.length, categories: getOrderCategories(order.id) };
      })
      .filter((row) => row.washOpen > 0);
  }

  const monitorRows = useMemo(() => {
    return sortedOrders
      .map((order) => {
        const related = enabledItemsForOrder(order);
        const done = related.filter((i) => i.is_done).length;
        const total = related.length;

        let monitorState = "uebernommen";
        if (total > 0 && done === total) {
          monitorState = "fertig";
        } else if (done > 0) {
          monitorState = "bearbeitung";
        }

        return {
          ...order,
          progressDone: done,
          progressTotal: total,
          monitorState,
          categories: getOrderCategories(order.id),
        };
      });
  }, [sortedOrders, items, articleSettings]);

  const workingRows = monitorRows.filter((r) => r.monitorState === "bearbeitung");
  const finishedRows = monitorRows.filter((r) => r.monitorState === "fertig");

  const stationOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      const related = enabledItemsForOrder(order).filter((i) => activeStation.items.includes(i.subcategory));
      if (!related.length) return false;
      if (stationSearch && !order.customer_number.includes(stationSearch) && !order.customer_name.toLowerCase().includes(stationSearch.toLowerCase())) return false;

      const stationDone = related.every((i) => i.is_done);
      const hiddenKey = `${order.id}-${activeStation.key}`;
      if (stationDone && hiddenStationOrders[hiddenKey] && tick > hiddenStationOrders[hiddenKey]) return false;

      return true;
    });
  }, [sortedOrders, items, articleSettings, activeStation, stationSearch, hiddenStationOrders, tick]);

  const statsRows = history.filter((h) => {
    const d = h.completed_at ? h.completed_at.slice(0, 10) : "";
    const t = h.completed_at ? fmtTime(h.completed_at) : "";
    return d === statsDate && t >= statsFrom && t <= statsTo;
  });

  function SmallCustomerCard({ row, onClick }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`grid w-full grid-cols-[85px_1fr_55px] items-center rounded-lg border bg-white px-3 py-2 text-left text-sm hover:shadow ${
          onClick ? "cursor-pointer" : ""
        }`}
      >
        <span>{row.customer_number}</span>
        <b className="truncate">{row.customer_name}</b>
        <b className="text-right">{row.progressDone}/{row.progressTotal}</b>
        {row.info && <div className="col-span-3 mt-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">ℹ {row.info}</div>}
      </button>
    );
  }

  function WashCard({ row, category }) {
    return (
      <button
        type="button"
        onClick={() => washCategory(row, category)}
        className="w-full rounded-xl border bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-blue-300"
      >
        <div className="grid grid-cols-[80px_1fr_48px] gap-2">
          <span className="font-semibold">{row.customer_number}</span>
          <b className="truncate">{row.customer_name}</b>
          <span className="text-right font-bold">{row.washOpen}</span>
        </div>
        {row.info && <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">ℹ {row.info}</div>}
        <div className="mt-2 text-xs font-semibold text-slate-500">Zum Entfernen antippen, wenn gewaschen</div>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-8 py-4">
        <div className="grid grid-cols-3 items-center">
          <Logo />
          <div className="text-center text-3xl font-black">DieTex Produktionsmonitor</div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-2xl font-bold">◷ {fmtTime(new Date())}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] p-5">
        {!fixedView && (
          <nav className="mb-5 flex flex-wrap justify-center gap-2">
            {[
              ["annahme", "Kunden übernehmen"],
              ["waschplan", "Waschplan"],
              ["station", "Station"],
              ["monitor", "Verpackungsmonitor"],
              ["luftbild", "Luftbild"],
              ["stats", "Statistiken"],
              ["stammdaten", "Stammdaten"],
              ["leitung", "Produktionsleitung"],
            ].map(([key, label]) => (
              <Button key={key} active={view === key} onClick={() => setView(key)}>
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
                  onClick={() => setSelectedCategories((p) => (p.includes(cat) ? p.filter((x) => x !== cat) : [...p, cat]))}
                  className={`rounded-3xl border-4 p-4 text-center transition-all ${categoryStyle(cat, selectedCategories.includes(cat))}`}
                >
                  <div className="text-4xl">{CAT_ICON[cat]}</div>
                  <b className="mt-2 block text-xl">{cat}</b>
                  <small>{CATEGORIES[cat].join(", ")}</small>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-center border-t pt-4">
              <button type="button" onClick={addOrder} className="rounded-2xl bg-blue-700 px-8 py-3 text-base font-black text-white shadow-lg hover:bg-blue-800">
                Kunde übernehmen
              </button>
            </div>
          </section>
        )}

        {view === "waschplan" && (
          <section className="grid gap-5 lg:grid-cols-3">
            {WASH_CATEGORIES.map((cat) => (
              <div key={cat} className={`rounded-3xl border-4 p-4 ${categoryStyle(cat, false)}`}>
                <h2 className="mb-4 border-b-2 border-current pb-2 text-center text-2xl font-black">
                  <span className="mr-2">{CAT_ICON[cat]}</span>{cat}
                </h2>
                <div className="space-y-2">
                  {washRowsForCategory(cat).map((row) => <WashCard key={`${row.id}-${cat}`} row={row} category={cat} />)}
                </div>
              </div>
            ))}
          </section>
        )}

        {view === "station" && (
          <section className="grid gap-5 lg:grid-cols-[300px_1fr]">
            {!fixedView && (
              <aside className="space-y-2 rounded-3xl border bg-white p-4">
                <b>Station auswählen</b>
                {STATIONS.map((s) => (
                  <Button key={s.key} className="w-full text-left" active={activeStation.key === s.key} onClick={() => setActiveStation(s)}>
                    <div>{s.name}</div><small>{s.items.join(" • ")}</small>
                  </Button>
                ))}
              </aside>
            )}

            <div className={`rounded-3xl border bg-white p-4 ${fixedView ? "lg:col-span-2" : ""}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black">{activeStation.name}</h2>
                <Input placeholder="Suchen" value={stationSearch} onChange={(e) => setStationSearch(e.target.value)} />
              </div>

              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                {stationOrders.map((order) => {
                  const relevant = enabledItemsForOrder(order)
                    .filter((i) => activeStation.items.includes(i.subcategory))
                    .sort((a, b) => activeStation.items.indexOf(a.subcategory) - activeStation.items.indexOf(b.subcategory));
                  const cont = containers.find((c) => c.order_id === order.id);

                  return (
                    <div key={order.id} className="rounded-xl border bg-white p-3">
                      <div className="mb-2">
                        <span className="text-sm">{order.customer_number}</span> <b>{order.customer_name}</b>
                        <div className="text-xs text-blue-700">{cont ? `Reihe ${cont.row_number}, Platz ${cont.place_number}` : "Putzerei / kein Container"}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {relevant.map((item) => (
                          <button key={item.id} type="button" onClick={() => toggleItem(item)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.is_done ? "bg-green-100" : "bg-yellow-50"}`}>
                            {item.is_done ? "✅" : "⭕"} {item.subcategory}
                          </button>
                        ))}
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
                <div className="space-y-2">{col.map((r) => <SmallCustomerCard key={r.id} row={r} />)}</div>
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
                            <label key={sub} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 ${isArticleEnabled(c.id, sub) ? "bg-green-50 border-green-200" : "bg-slate-50 text-slate-400"}`}>
                              <input type="checkbox" checked={isArticleEnabled(c.id, sub)} onChange={() => toggleCustomerArticle(c.id, sub)} />
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
            <div className="grid gap-5 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5"><small>Waschplan</small><div className="text-3xl font-black">{WASH_CATEGORIES.reduce((sum, c) => sum + washRowsForCategory(c).length, 0)}</div></div>
              <div className="rounded-2xl border bg-white p-5"><small>In Bearbeitung</small><div className="text-3xl font-black">{workingRows.length}</div></div>
              <div className="rounded-2xl border bg-white p-5"><small>Fertig</small><div className="text-3xl font-black">{finishedRows.length}</div></div>
              <div className="rounded-2xl border bg-white p-5"><small>Container sichtbar</small><div className="text-3xl font-black">{containers.length}</div></div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xl font-black">Kundenreihenfolge</h2>
              <div className="space-y-2">
                {sortedOrders.map((order) => (
                  <div key={order.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 rounded-xl border bg-slate-50 p-3">
                    <span>{order.customer_number}</span>
                    <b>{order.customer_name}</b>
                    <div className="flex gap-2">
                      <Button onClick={() => moveOrder(order, -1)}>↑</Button>
                      <Button onClick={() => moveOrder(order, 1)}>↓</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
