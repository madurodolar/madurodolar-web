// ─────────────────────────────────────────────────────────────────────────────
//   backend/index.js
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Enable CORS for all origins (so your front end at https://www.madurodolar.com
//       can fetch these routes without being blocked). If you prefer to lock it down
//       to only your Pages domain, replace `cors()` with:
//
//       app.use(cors({ origin: "https://www.madurodolar.com" }));
//
app.use(cors());

//
// GET /api/binance
// ───────────────────────────────────────────────────────────────────────────────
// Fetches the Binance P2P USD/VES rate and returns a JSON object:
//   { sell: "<string price>", buy: "<string price>", updated: "<ISO timestamp>" }
//
// NOTE: Binance’s “P2P” endpoint is not officially documented in a single URL, so
//       below is a commonly used public URL that BINANCE’s web client hits.
//       If this stops working, you may need to adjust the URL or use a tiny proxy.
//       
// For now, this uses the same proxy approach we tested earlier:
//   https://binance-p2p-proxy‐gvvl.onrender.com/api/price
// which simply returns JSON like { sell:"131.000", buy:"129.200", updated:"…" }.
//
app.get("/api/binance", async (req, res) => {
  try {
    // ── 1) Fetch from our existing Binan‐ce P2P proxy
    const response = await fetch(
      "https://binance-p2p-proxy-gvvl.onrender.com/api/price"
    );

    if (!response.ok) {
      throw new Error(`Binance proxy responded ${response.status}`);
    }

    // ── 2) Parse the JSON. We expect an object like:
    //       { sell: "131.000", buy: "129.200", updated: "2025-06-06T12:54:37.436Z" }
    const data = await response.json();

    // ── 3) Return exactly that same shape to the caller:
    //       { sell, buy, updated }
    return res.json({
      sell: data.sell,
      buy: data.buy,
      updated: data.updated,
    });
  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    return res.status(500).json({
      error: "Error obteniendo Binance P2P",
      details: err.message,
    });
  }
});

//
// GET /api/bcv
// ───────────────────────────────────────────────────────────────────────────────
// Fetches the official USD/VES (“Dólar BCV”) from CriptoYa (public API) and returns:
//   { rate: <number>, updated: "<ISO timestamp>" }
//
// CriptoYa’s “oficial” endpoint returns something like:
//   { “oficial”: “174.231,00”, … }
// We parse the “oficial” string, replace “,” → “.”, turn it into a float.
//
app.get("/api/bcv", async (req, res) => {
  try {
    // ── 1) Fetch from CriptoYa’s Dólar Oficial endpoint:
    const response = await fetch("https://criptoya.com/api/dolar/oficial");

    if (!response.ok) {
      throw new Error(`CriptoYa responded ${response.status}`);
    }

    // ── 2) Parse JSON. Example result:
    //       { 
    //         oficial: "174.231,00",
    //         "blue": "180.500,00", 
    //         […] 
    //       }
    const json = await response.json();

    // ── 3) Extract the “oficial” field and convert "174.231,00" → 174231.00
    //       (replace the period thousand‐separator, replace comma decimal‐separator → “.”)
    const rawString = json.oficial || json.oficial || "";
    const normalized = rawString.replace(/\./g, "").replace(",", ".");
    const rate = parseFloat(normalized);

    if (Number.isNaN(rate)) {
      throw new Error(`No se pudo parsear la tasa BCV: "${rawString}"`);
    }

    // ── 4) Return a simple JSON { rate, updated }
    return res.json({
      rate,
      updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching BCV rate:", err.message);
    return res.status(500).json({
      error: "Error obteniendo BCV",
      details: err.message,
    });
  }
});

//
// If you ever want a root‐level health-check or “hello” route, you could add:
//
// app.get("/", (req, res) => {
//   res.send("MaduroDólar backend is running 🟢");
// });
//

// ───────────────────────────────────────────────────────────────────────────────
// Start listening on `PORT` (render will supply process.env.PORT for you).
// When you test locally, it’ll default to port 3000 if PORT is not set.
//

app.listen(PORT, () => {
  console.log(`MaduroDólar backend corriendo en puerto ${PORT}`);
});

