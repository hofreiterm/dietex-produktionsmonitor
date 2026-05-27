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
  "Bettwäsche": ["Deckenbezüge + Leintücher", "Polsterbezüge"],
  "Frottee": ["Frottee", "Spannleintücher", "Bademäntel"],
  "Tischwäsche": ["Tischtücher", "Deckservietten", "Mundservietten"],
  "Putzerei": ["Putzerei"],
};
const CAT_ICON = { "Bettwäsche": "🛏️", Frottee: "🥋", "Tischwäsche": "🍽️", Putzerei: "P" };
const STATIONS = [
  { key: "jenway-kleinteile", name: "Jenway Kleinteile", items: ["Polsterbezüge", "Mundservietten", "Tischtücher"] },
  { key: "jenway-grossteile", name: "Jenway Großteile", items: ["Deckenbezüge + Leintücher", "Deckservietten"] },
  { key: "jenway-frottee", name: "Jenway Frottee", items: ["Frottee"] },
  { key: "frottee-splt-bm", name: "Frottee SPLT + BM", items: ["Bademäntel", "Spannleintücher"] },
  { key: "putzerei", name: "Putzerei", items: ["Putzerei"] },
];
const ROWS = [1, 2, 3, 4, 5];
const PLACES = 10;

function Button({ children, active, className = "", ...props }) {
  return <button type="button" className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white hover:bg-slate-50"} ${className}`} {...props}>{children}</button>;
}
function Input(props) { return <input {...props} className={`rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-300 ${props.className || ""}`} />; }
function fmtTime(ts) { return ts ? new Date(ts).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }) : "-"; }
function fmtDateInput(d = new Date()) { return d.toISOString().slice(0, 10); }
function splitCols(arr, n) { const cols = Array.from({ length: n }, () => []); arr.forEach((x, i) => cols[i % n].push(x)); return cols; }
function catStyle(cat, selected) { const s = { "Bettwäsche": "border-blue-400 bg-blue-50 text-blue-900", Frottee: "border-green-400 bg-green-50 text-green-900", "Tischwäsche": "border-orange-400 bg-orange-50 text-orange-900", Putzerei: "border-violet-400 bg-violet-50 text-violet-900" }; return `${s[cat]} ${selected ? "scale-105 ring-4 ring-blue-200 shadow-lg" : ""}`; }
function Logo() { return <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-red-600 font-black text-red-600">DIE</div><div><div className="text-2xl font-black text-sky-600">WÄSCHEREI</div><div className="text-xs font-bold text-sky-600">by <span className="text-red-600">♡</span> DieTex</div></div></div>; }
function containerPlan(selected) { const p = []; if (selected.includes("Bettwäsche")) p.push("Bettwäsche"); if (selected.includes("Tischwäsche")) p.push("Tischwäsche"); if (selected.includes("Frottee")) { p.push("Frottee"); p.push("SPLT + BM"); } return p; }

function App() {
  const params = new URLSearchParams(window.location.search);
  const fixedView = params.get("fixed") === "1";
  const stationFromUrl = params.get("station");
  const startViewRaw = params.get("view") || "annahme";
  const [view, setView] = useState(startViewRaw === "uebernahme" ? "annahme" : startViewRaw);
  const [activeStation, setActiveStation] = useState(STATIONS.find(s => s.key === stationFromUrl) || STATIONS[0]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [history, setHistory] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [info, setInfo] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [stationSearch, setStationSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [statsDate, setStatsDate] = useState(fmtDateInput());
  const [statsFrom, setStatsFrom] = useState("00:00");
  const [statsTo, setStatsTo] = useState("23:59");
  const [tick, setTick] = useState(Date.now());
  const [hiddenStationOrders, setHiddenStationOrders] = useState({});

  async function loadAll() {
    const [c,o,i,co,h] = await Promise.all([
      supabase.from("customers").select("*").order("customer_number"),
      supabase.from("orders").select("*").order("created_at"),
      supabase.from("order_categories").select("*").order("subcategory"),
      supabase.from("containers").select("*").is("removed_at", null).order("row_number").order("place_number"),
      supabase.from("order_history").select("*").order("completed_at", { ascending:false }),
    ]);
    if (!c.error) setCustomers(c.data || []);
    if (!o.error) setOrders((o.data || []).filter(x => x.status !== "archiviert"));
    if (!i.error) setItems(i.data || []);
    if (!co.error) setContainers(co.data || []);
    if (!h.error) setHistory(h.data || []);
  }

  useEffect(() => { loadAll(); const ch = supabase.channel("dietex-live").on("postgres_changes", {event:"*", schema:"public"}, loadAll).subscribe(); return () => supabase.removeChannel(ch); }, []);
  useEffect(() => { const iv = setInterval(() => { setTick(Date.now()); autoArchive2330(); }, 1000); return () => clearInterval(iv); }, [orders]);
  useEffect(() => { setHiddenStationOrders(prev => { const n = {...prev}; orders.forEach(o => STATIONS.forEach(s => { const rel = items.filter(i => i.order_id === o.id && s.items.includes(i.subcategory)); const k = `${o.id}-${s.key}`; if (rel.length && rel.every(i => i.is_done) && !n[k]) n[k] = Date.now() + 10000; })); return n; }); }, [orders,items]);

  async function autoArchive2330(){ const now = new Date(); const key = now.toISOString().slice(0,10); if(now.getHours()===23 && now.getMinutes()===30 && localStorage.getItem("dietex-auto-archive")!==key){ localStorage.setItem("dietex-auto-archive", key); await archiveFinished(); } }
  async function archiveFinished(ids=null){ const useIds = ids || orders.filter(o => o.status === "fertig" || o.completed_at).map(o => o.id); if(!useIds.length) return; await supabase.from("orders").update({status:"archiviert"}).in("id", useIds); await supabase.from("containers").update({removed_at:new Date().toISOString()}).in("order_id", useIds); loadAll(); }

  async function importCustomersExcel(e){ const file = e.target.files?.[0]; if(!file) return; try{ const buf = await file.arrayBuffer(); const wb = XLSX.read(buf,{type:"array"}); const ws = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:""}); const imported = rows.slice(1).map(r=>({customer_number:String(r[0]||"").trim(), customer_name:String(r[1]||"").trim()})).filter(r=>r.customer_number&&r.customer_name); if(!imported.length) return alert("Keine Kunden gefunden. Spalte A Kundennummer, Spalte B Kundenname."); const {error}=await supabase.from("customers").upsert(imported,{onConflict:"customer_number"}); if(error) return alert("Import fehlgeschlagen: "+error.message); alert(`${imported.length} Kunden wurden importiert.`); loadAll(); }catch(err){ alert("Excel-Import fehlgeschlagen."); } e.target.value=""; }
  function findFreeSlots(count){ for(const row of ROWS){ const used=containers.filter(c=>c.row_number===row).map(c=>c.place_number).sort((a,b)=>a-b); let start=1; for(const p of used){ if(p===start) start++; else break; } if(start+count-1<=PLACES) return Array.from({length:count},(_,i)=>({row,place:start+i})); } return null; }
  async function addOrder(){ if(!customerNumber.trim()||!customerName.trim()) return alert("Kundennummer und Kundenname eingeben."); if(!selectedCats.length) return alert("Mindestens eine Kategorie auswählen."); const plan = containerPlan(selectedCats); const slots = findFreeSlots(plan.length); if(!slots) return alert("Kein freier Containerplatz verfügbar."); let customer = customers.find(c=>c.customer_number===customerNumber.trim()); if(!customer){ const {data,error}=await supabase.from("customers").insert({customer_number:customerNumber.trim(), customer_name:customerName.trim()}).select().single(); if(error) return alert(error.message); customer=data; } const {data:order,error}=await supabase.from("orders").insert({customer_id:customer.id,customer_number:customerNumber.trim(),customer_name:customerName.trim(),info:info.trim()||null,sequence_number:1,status:"uebernommen"}).select().single(); if(error) return alert("Auftrag konnte nicht erstellt werden: "+error.message); const rows = selectedCats.flatMap(cat => CATEGORIES[cat].map(sub=>({order_id:order.id,category:cat,subcategory:sub}))); if(rows.length) await supabase.from("order_categories").insert(rows); if(plan.length) await supabase.from("containers").insert(plan.map((type,idx)=>({order_id:order.id,container_type:type,row_number:slots[idx].row,place_number:slots[idx].place,status:"bearbeitung"}))); setCustomerSearch(""); setCustomerNumber(""); setCustomerName(""); setInfo(""); setSelectedCats([]); loadAll(); }
  async function toggleItem(item){ const next=!item.is_done; await supabase.from("order_categories").update({is_done:next,done_at:next?new Date().toISOString():null}).eq("id",item.id); const all = items.filter(i=>i.order_id===item.order_id).map(i=>i.id===item.id?{...i,is_done:next}:i); if(all.length && all.every(i=>i.is_done)){ const order=orders.find(o=>o.id===item.order_id); const completedAt=new Date(); const duration=Math.max(0,Math.round((completedAt-new Date(order.created_at))/60000)); await supabase.from("orders").update({status:"fertig",completed_at:completedAt.toISOString()}).eq("id",item.order_id); await supabase.from("containers").update({status:"fertig"}).eq("order_id",item.order_id); await supabase.from("order_history").insert({order_id:order.id,customer_number:order.customer_number,customer_name:order.customer_name,accepted_at:order.created_at,completed_at:completedAt.toISOString(),duration_minutes:duration}); }
    loadAll(); }
  async function removeContainer(cont){ if(cont.status!=="fertig") return; await supabase.from("containers").update({removed_at:new Date().toISOString()}).eq("id",cont.id); loadAll(); }
  async function removeAllFinished(){ const ids = containers.filter(c=>c.status==="fertig").map(c=>c.id); if(!ids.length) return alert("Keine fertigen Container vorhanden."); await supabase.from("containers").update({removed_at:new Date().toISOString()}).in("id",ids); loadAll(); }
  async function deleteMasterCustomer(c){ if(!confirm(`Kunde wirklich löschen?\n${c.customer_number} ${c.customer_name}`)) return; const {error}=await supabase.from("customers").delete().eq("id",c.id); if(error) return alert("Kunde konnte nicht gelöscht werden: "+error.message); loadAll(); }

  const suggestions = customers.filter(c => customerSearch && (c.customer_number.includes(customerSearch) || c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()))).slice(0,8);
  const orderCats = id => [...new Set(items.filter(i=>i.order_id===id).map(i=>i.category))];
  const monitorRows = useMemo(() => orders.map(o => { const rel=items.filter(i=>i.order_id===o.id); const done=rel.filter(i=>i.is_done).length; let state="uebernommen"; if(o.status==="fertig"||o.completed_at) state="fertig"; else if(done>0) state="bearbeitung"; return {...o,progressDone:done,progressTotal:rel.length,monitorState:state,categories:orderCats(o.id)}; }).sort((a,b)=>String(a.customer_number).localeCompare(String(b.customer_number),"de",{numeric:true})), [orders,items]);
  const takenRows = monitorRows.filter(r=>r.monitorState==="uebernommen");
  const workingRows = monitorRows.filter(r=>r.monitorState==="bearbeitung");
  const finishedRows = monitorRows.filter(r=>r.monitorState==="fertig");
  const stationOrders = useMemo(()=> orders.filter(o => { const rel=items.filter(i=>i.order_id===o.id && activeStation.items.includes(i.subcategory)); if(!rel.length) return false; if(stationSearch && !o.customer_number.includes(stationSearch) && !o.customer_name.toLowerCase().includes(stationSearch.toLowerCase())) return false; const k=`${o.id}-${activeStation.key}`; if(rel.every(i=>i.is_done)&&hiddenStationOrders[k]&&tick>hiddenStationOrders[k]) return false; return true; }).sort((a,b)=>String(a.customer_number).localeCompare(String(b.customer_number),"de",{numeric:true})), [orders,items,activeStation,stationSearch,hiddenStationOrders,tick]);
  const statsRows = history.filter(h => { const d=h.completed_at?h.completed_at.slice(0,10):""; const t=h.completed_at?fmtTime(h.completed_at):""; return d===statsDate && t>=statsFrom && t<=statsTo; });

  const SmallCard = ({r,onClick}) => <button type="button" onClick={onClick} className={`grid w-full grid-cols-[85px_1fr_55px] items-center rounded-lg border bg-white px-3 py-2 text-left text-sm hover:shadow ${onClick?"cursor-pointer":""}`}><span>{r.customer_number}</span><b className="truncate">{r.customer_name}</b><b className="text-right">{r.progressDone}/{r.progressTotal}</b>{r.info&&<div className="col-span-3 mt-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">ℹ {r.info}</div>}</button>;

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white px-8 py-4"><div className="grid grid-cols-3 items-center"><Logo/><div className="text-center text-3xl font-black">DieTex Produktionsmonitor</div><div className="text-right text-2xl font-bold">◷ {fmtTime(new Date())}</div></div></header>
    <main className="mx-auto max-w-[1800px] p-5">
      {!fixedView && <nav className="mb-5 flex flex-wrap justify-center gap-2">{[["annahme","Kunden übernehmen"],["uebernahme-monitor","Übernahme"],["station","Station"],["monitor","Verpackungsmonitor"],["luftbild","Luftbild"],["stats","Statistiken"],["stammdaten","Stammdaten"],["leitung","Produktionsleitung"]].map(([k,l])=><Button key={k} active={view===k} onClick={()=>setView(k)}>{l}</Button>)}</nav>}

      {view==="annahme" && <section className="rounded-3xl border bg-white p-4 shadow-sm"><div className="mb-3 flex justify-end"><input id="customer-excel-import" type="file" accept=".xlsx,.xls" className="hidden" onChange={importCustomersExcel}/><label htmlFor="customer-excel-import" className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">📄 Kunden Excel importieren</label></div><Input className="mb-2 w-full" placeholder="Kundennummer oder Name suchen" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/>{suggestions.length>0&&<div className="mb-3 rounded-xl border bg-white">{suggestions.map(c=><button key={c.id} type="button" className="grid w-full grid-cols-[120px_1fr] border-b p-2 text-left" onClick={()=>{setCustomerNumber(c.customer_number);setCustomerName(c.customer_name);setCustomerSearch(`${c.customer_number} ${c.customer_name}`)}}><span>{c.customer_number}</span><b>{c.customer_name}</b></button>)}</div>}<div className="grid gap-3 md:grid-cols-[220px_1fr]"><Input placeholder="Kundennummer" value={customerNumber} onChange={e=>setCustomerNumber(e.target.value)}/><Input placeholder="Kundenname" value={customerName} onChange={e=>setCustomerName(e.target.value)}/></div><Input className="mt-2 w-full" placeholder="Optionale Info für Verpackung / Produktion" value={info} onChange={e=>setInfo(e.target.value)}/><h2 className="my-3 text-center text-xl font-black text-blue-700">Überkategorie wählen</h2><div className="grid gap-5 md:grid-cols-4">{Object.keys(CATEGORIES).map(cat=><button key={cat} type="button" onClick={()=>setSelectedCats(p=>p.includes(cat)?p.filter(x=>x!==cat):[...p,cat])} className={`rounded-3xl border-4 p-4 text-center transition-all ${catStyle(cat,selectedCats.includes(cat))}`}><div className="text-4xl">{CAT_ICON[cat]}</div><b className="mt-2 block text-xl">{cat}</b><small>{CATEGORIES[cat].join(", ")}</small></button>)}</div><div className="mt-5 flex justify-center border-t pt-4"><button type="button" onClick={addOrder} className="rounded-2xl bg-blue-700 px-8 py-3 text-base font-black text-white shadow-lg hover:bg-blue-800">Kunde übernehmen</button></div></section>}

      {view==="uebernahme-monitor" && <section className="rounded-3xl border border-blue-100 bg-blue-50/40 p-5"><h2 className="mb-4 border-b-2 border-blue-400 pb-2 text-center text-2xl font-black">ÜBERNAHME</h2><div className="grid gap-3 md:grid-cols-4">{takenRows.map(r=><div key={r.id} className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm"><div className="grid grid-cols-[80px_1fr] gap-2"><span className="font-semibold">{r.customer_number}</span><b className="truncate">{r.customer_name}</b></div><div className="mt-2 flex gap-2 text-xl">{["Bettwäsche","Frottee","Tischwäsche","Putzerei"].map(cat=><span key={cat} className={r.categories.includes(cat)?"opacity-100":"opacity-15"} title={cat}>{CAT_ICON[cat]}</span>)}</div>{r.info&&<div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">ℹ {r.info}</div>}</div>)}</div></section>}

      {view==="station" && <section className="grid gap-5 lg:grid-cols-[300px_1fr]">{!fixedView&&<aside className="space-y-2 rounded-3xl border bg-white p-4"><b>Station auswählen</b>{STATIONS.map(s=><Button key={s.key} className="w-full text-left" active={activeStation.key===s.key} onClick={()=>setActiveStation(s)}><div>{s.name}</div><small>{s.items.join(" • ")}</small></Button>)}</aside>}<div className={`rounded-3xl border bg-white p-4 ${fixedView?"lg:col-span-2":""}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">{activeStation.name}</h2><Input placeholder="Suchen" value={stationSearch} onChange={e=>setStationSearch(e.target.value)}/></div><div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">{stationOrders.map(o=>{const rel=items.filter(i=>i.order_id===o.id&&activeStation.items.includes(i.subcategory)).sort((a,b)=>activeStation.items.indexOf(a.subcategory)-activeStation.items.indexOf(b.subcategory));const cont=containers.find(c=>c.order_id===o.id);return <div key={o.id} className="rounded-xl border bg-white p-3"><div className="mb-2"><span className="text-sm">{o.customer_number}</span> <b>{o.customer_name}</b><div className="text-xs text-blue-700">{cont?`Reihe ${cont.row_number}, Platz ${cont.place_number}`:"Putzerei / kein Container"}</div></div><div className="flex flex-wrap gap-2">{rel.map(item=><button key={item.id} type="button" onClick={()=>toggleItem(item)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.is_done?"bg-green-100":"bg-yellow-50"}`}>{item.is_done?"✅":"⭕"} {item.subcategory}</button>)}</div></div>})}</div></div></section>}

      {view==="monitor" && <section className="grid gap-5 lg:grid-cols-4">{splitCols(workingRows,2).map((col,idx)=><div key={`w${idx}`} className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4"><h2 className="mb-3 border-b-2 border-orange-400 pb-2 text-center font-black">IN BEARBEITUNG</h2><div className="space-y-2">{col.map(r=><SmallCard key={r.id} r={r}/>)}</div></div>)}{splitCols(finishedRows,2).map((col,idx)=><div key={`f${idx}`} className="rounded-3xl border border-green-100 bg-green-50/40 p-4"><h2 className="mb-3 border-b-2 border-green-500 pb-2 text-center font-black">FERTIG</h2><div className="space-y-2">{col.map(r=><SmallCard key={r.id} r={r} onClick={()=>archiveFinished([r.id])}/>)}</div></div>)}</section>}

      {view==="luftbild" && <section className="rounded-3xl border bg-white p-5"><div className="mb-4 flex justify-between"><div><h2 className="text-2xl font-black">Luftbild Container</h2><p className="text-slate-500">Gelb = in Bearbeitung, Grün = fertig</p></div><Button onClick={removeAllFinished}>Fertige Aufträge entfernen</Button></div><div className="grid grid-cols-5 gap-4">{ROWS.map(row=><div key={row} className="rounded-2xl border bg-slate-50 p-3"><h3 className="mb-3 text-center font-black">Reihe {row}</h3><div className="grid gap-2">{Array.from({length:PLACES},(_,i)=>{const place=i+1;const cont=containers.find(c=>c.row_number===row&&c.place_number===place);const order=cont?orders.find(o=>o.id===cont.order_id):null;const color=!cont?"bg-white border-dashed text-slate-400":cont.status==="fertig"?"bg-green-50 border-green-300 cursor-pointer":"bg-yellow-50 border-yellow-300";return <div key={place} onClick={()=>cont?.status==="fertig"&&removeContainer(cont)} className={`min-h-24 rounded-xl border p-2 text-xs ${color}`}>{cont&&order?<><b>{order.customer_number}</b><b className="block break-words">{order.customer_name}</b><div className="mt-1 rounded bg-white/60 px-1">{cont.container_type}</div>{cont.status==="fertig"&&<div className="mt-1 text-center text-[10px] font-bold text-green-700">Antippen zum Entfernen</div>}</>:<div className="text-center">{place}</div>}</div>})}</div></div>)}</div></section>}

      {view==="stats" && <section className="rounded-3xl border bg-white p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Statistiken</h2><p className="text-slate-500">Verpackungszeit je Kunde</p></div><div className="flex gap-2"><Input type="date" value={statsDate} onChange={e=>setStatsDate(e.target.value)}/><Input type="time" value={statsFrom} onChange={e=>setStatsFrom(e.target.value)}/><Input type="time" value={statsTo} onChange={e=>setStatsTo(e.target.value)}/></div></div><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Datum</th><th className="p-3">Nr.</th><th className="p-3">Kunde</th><th className="p-3">Übernahme</th><th className="p-3">Fertig</th><th className="p-3">Zeit</th></tr></thead><tbody>{statsRows.map(r=><tr key={r.id} className="border-t"><td className="p-3">{new Date(r.completed_at).toLocaleDateString("de-AT")}</td><td className="p-3">{r.customer_number}</td><td className="p-3 font-semibold">{r.customer_name}</td><td className="p-3">{fmtTime(r.accepted_at)}</td><td className="p-3">{fmtTime(r.completed_at)}</td><td className="p-3 font-semibold">{r.duration_minutes} Min.</td></tr>)}</tbody></table></section>}

      {view==="stammdaten" && <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Stammdaten Kunden</h2><p className="text-slate-500">Kunden suchen und einzelne Kunden löschen.</p></div><Input placeholder="Kunde suchen" value={masterSearch} onChange={e=>setMasterSearch(e.target.value)}/></div><div className="max-h-[650px] overflow-auto rounded-2xl border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Kundennummer</th><th className="p-3">Name</th><th className="p-3 text-right">Aktion</th></tr></thead><tbody>{customers.filter(c=>!masterSearch||c.customer_number.includes(masterSearch)||c.customer_name.toLowerCase().includes(masterSearch.toLowerCase())).map(c=><tr key={c.id} className="border-t"><td className="p-3 font-semibold">{c.customer_number}</td><td className="p-3">{c.customer_name}</td><td className="p-3 text-right"><Button className="border-red-200 bg-red-50 text-red-700" onClick={()=>deleteMasterCustomer(c)}>Löschen</Button></td></tr>)}</tbody></table></div></section>}

      {view==="leitung" && <section className="grid gap-5 md:grid-cols-4"><div className="rounded-2xl border bg-white p-5"><small>Übernommen</small><div className="text-3xl font-black">{takenRows.length}</div></div><div className="rounded-2xl border bg-white p-5"><small>In Bearbeitung</small><div className="text-3xl font-black">{workingRows.length}</div></div><div className="rounded-2xl border bg-white p-5"><small>Fertig</small><div className="text-3xl font-black">{finishedRows.length}</div></div><div className="rounded-2xl border bg-white p-5"><small>Container sichtbar</small><div className="text-3xl font-black">{containers.length}</div></div></section>}
    </main>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
