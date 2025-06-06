// ─────────────────────────────────────────────────────────────
//   backend/index.js
// ─────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import https from "https";

// ─────────────────────────────────────────────────────────────
// 1) Create Express app & define port
// ─────────────────────────────────────────────────────────────
const app = express();
// Render (and many platforms) will inject process.env.PORT automatically:
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// 2) Enable CORS so that your front-end can fetch from this server
//    without running into CORS policy errors.
//    If you only ever fetch from https://www.madurodolar.com, you can lock it down.
// ─────────────────────────────────────────────────────────────
app.use(
  cors({
    // Only allow requests coming from your front-end domain:
    origin: "https://www.madurodolar.com",
  })
);

// ─────────────────────────────────────────────────────────────
// 3) Set up an HTTPS agent to disable SSL verification if needed
//    (sometimes CriptoYa or Binance proxies have self-signed/invalid certs)
// ─────────────────────────────────────────────────────────────
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// ─────────────────────────────────────────────────────────────
// 4) GET /api/binance
//    Proxies the Binance P2P endpoint
//    (assumes you have deployed your own binance-proxy to onrender.com)
//    Returns JSON of the form: { sell: "131.000", buy: "129.500", updated: "2025-06-06T12:34:56.789Z" }
// ─────────────────────────────────────────────────────────────
app.get("/api/binance", async (req, res) => {
  try {
    // Replace this URL with your actual Binance P2P proxy on Render (or wherever):
    const BINANCE_PROXY_URL =
      "https://madurodolar-web.onrender.com/api/binance"; 
    // If you are calling a completely external proxy, it might look like:
    // const BINANCE_PROXY_URL = "https://binance-p2p-proxy-gvvl.onrender.com/api/price";

    const response = await fetch(BINANCE_PROXY_URL, { agent: httpsAgent });
    if (!response.ok) {
      throw new Error(
        `Binance proxy responded with ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    //
    // We expect `data` to already look like:
    //   { sell: "131.000", buy: "129.500", updated: "2025-06-06T12:34:56.789Z" }
    //
    return res.json({
      sell: data.sell ?? null,
      buy: data.buy ?? null,
      updated: data.updated ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    // If something fails, return a 500 with nulls (front-end will show “Error”)
    return res.status(500).json({ sell: null, buy: null, updated: null });
  }
});

// ─────────────────────────────────────────────────────────────
// 5) GET /api/bcv
//    Proxies the Dólar Oficial (BCV) via CriptoYa.
//    CriptoYa’s “/api/dolar/oficial” returns something like:
//      { "oficial": 175000.00, "fecha": "2025-06-06T12:35:00.000Z", … }
//    We will repackage it as { rate: 175000.00, updated: "2025-06-06T12:35:00.000Z" }
// ─────────────────────────────────────────────────────────────
app.get("/api/bcv", async (req, res) => {
  try {
    const CRIPTOYA_URL = "https://criptoya.com/api/dolar/oficial";

    const response = await fetch(CRIPTOYA_URL, { agent: httpsAgent });
    if (!response.ok) {
      throw new Error(
        `CriptoYa responded with ${response.status} ${response.statusText}`
      );
    }
    const json = await response.json();
    //
    // Example CriptoYa JSON:
    //   {
    //     "oficial": 175000.00,
    //     "fecha": "2025-06-06T12:35:00.000Z",
    //     …other fields…
    //   }
    //
    const rate = typeof json.oficial === "number" ? json.oficial : NaN;
    const updated = typeof json.fecha === "string" ? json.fecha : new Date().toISOString();

    return res.json({ rate, updated });
  } catch (err) {
    console.error("Error fetching Dólar BCV:", err.message);
    return res.status(500).json({ rate: null, updated: null });
  }
});

// ─────────────────────────────────────────────────────────────
// 6) Start listening
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MaduroDólar backend running on port ${PORT}`);
});
