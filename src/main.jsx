import React from "react";
import ReactDOM from "react-dom/client";
import * as XLSX from "xlsx";

function App() {
  const importCustomersExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log("Importierte Kunden:", rows);

      alert(`${rows.length} Kunden importiert`);
    } catch (err) {
      console.error(err);
      alert("Excel Import fehlgeschlagen");
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>DieTex Produktionsmonitor</h1>

      <input
        id="customer-excel-import"
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={importCustomersExcel}
      />

      <label
        htmlFor="customer-excel-import"
        style={{
          background: "#2563eb",
          color: "white",
          padding: "12px 20px",
          borderRadius: 10,
          cursor: "pointer",
          display: "inline-block",
          marginTop: 20,
        }}
      >
        📄 Kunden Excel importieren
      </label>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
