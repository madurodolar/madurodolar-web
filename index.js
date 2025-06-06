// index.js
// -------------
// A minimal Express server that proxies
// the “parallel” USD/VES rate (via CriptoYa) and
// the “BCV oficial” USD/VES rate (via CriptoYa).
//
// CORS is enabled so your front‐end (www.madurodolar.com) can fetch these routes.

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (you can lock this down to only your domain if you want)
// e.g. app.use(cors({ origin: "https://www.madurodolar.com" }));
app.use(cors());

/**
 * GET /api/binance
 * 
 * - Fetches the “dólar paralelo” (Binance P2P‐like) from CriptoYa:
 *     https://criptoya.com/api/dolar/paralelo
 * 
 * The CriptoYa response looks like:
 * {
 *   "sell": 132.45,
 *   "buy": 131.00,
 *   "variation": -0.12,
 *   "date": "2025-06-06T12:54:37.436Z"
 * }
 * 
 * We re‐shape it to:
 * {
 *   sell: "132.45",
 *   buy: "131.00",
 *   updated: "2025-06-06T12:54:37.436Z"
 * }
 */
app.get("/api/binance", async (req, res) => {
  try {
    const response = await fetch("https://criptoya.com/api/dolar/paralelo");
    if (!response.ok) throw new Error(`CriptoYa responded ${response.status} ${response.statusText}`);
    const json = await response.json();

    // json.sell and json.buy are numbers (e.g. 132.45), json.date is the ISO‐string timestamp
    return res.json({
      sell: json.sell.toFixed(2),
      buy: json.buy.toFixed(2),
      updated: json.date
    });
  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/bcv
 * 
 * - Fetches the “dólar oficial BCV” from CriptoYa:
 *     https://criptoya.com/api/dolar/oficial
 * 
 * The CriptoYa response looks like:
 * {
 *   "oficial": 174231.00,
 *   "date": "2025-06-06T12:55:00.000Z"
 * }
 * 
 * We re‐shape to:
 * {
 *   rate: 174231.00,
 *   updated: "2025-06-06T12:55:00.000Z"
 * }
 */
app.get("/api/bcv", async (req, res) => {
  try {
    const response = await fetch("https://criptoya.com/api/dolar/oficial");
    if (!response.ok) throw new Error(`CriptoYa responded ${response.status} ${response.statusText}`);
    const json = await response.json();

    return res.json({
      rate: json.oficial,
      updated: json.date
    });
  } catch (err) {
    console.error("Error fetching BCV:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


/**
 * In case someone hits the root, just confirm the server is alive:
 */
app.get("/", (_req, res) => {
  res.send("🟢 MaduroDólar backend is running");
});


app.listen(PORT, () => {
  console.log(`🟢 MaduroDólar backend running on port ${PORT}`);
});

