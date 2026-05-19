import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{
      fontFamily: "Arial",
      padding: 40
    }}>
      <h1>DieTex Produktionsmonitor läuft 🚀</h1>
      <p>Vercel + GitHub + Supabase funktionieren.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
