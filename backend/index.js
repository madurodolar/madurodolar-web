// index.js
// A small Express server that proxies:
//  • /api/binance → CriptoYa’s parallel rate (USD〉VES)
//  • /api/bcv     → CriptoYa’s oficial BCV rate (USD〉VES)
// In both cases we first fetch raw text, then attempt JSON.parse.
// That way if CriptoYa returns plain “Invalid pair” or HTML, we catch it.
//
// Dependencies: express, cors, node-fetch

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (or lock down to your domain if you prefer)
app.use(cors());

/**
 * GET /api/binance
 *   - Fetches paralelo from CriptoYa
 *   - If CriptoYa responds with valid JSON, return { sell, buy, updated }
 *   - If CriptoYa responds with text like "Invalid pair", we catch parse errors
 */
app.get("/api/binance", async (req, res) => {
  try {
    const response = await fetch("https://criptoya.com/api/dolar/paralelo");
    if (!response.ok) {
      throw new Error(`CriptoYa responded ${response.status} ${response.statusText}`);
    }

    // Read raw text first (it might not always be valid JSON)
    const raw = await response.text();

    // Try to parse JSON; if it fails, we throw with the raw snippet
    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      // Show first 100 chars of raw for debugging
      const snippet = raw.slice(0, 100);
      throw new Error(`Invalid JSON from CriptoYa: "${snippet}"`);
    }

    // At this point, json should look like:
    //   { "sell": 132.45, "buy": 131.00, "variation": ..., "date": "2025-06-06T12:54:37.436Z" }
    if (typeof json.sell !== "number" || typeof json.buy !== "number" || typeof json.date !== "string") {
      throw new Error(`Unexpected shape from CriptoYa: ${JSON.stringify(json)}`);
    }

    // Re‐shape into { sell:"132.45", buy:"131.00", updated:"...ISO..." }
    return res.json({
      sell: json.sell.toFixed(2),
      buy:  json.buy.toFixed(2),
      updated: json.date
    });

  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/bcv
 *   - Fetches oficial rate from CriptoYa
 *   - If CriptoYa responds with valid JSON, return { rate, updated }
 *   - If CriptoYa returns plain text (e.g. "Invalid pair"), catch parse‐error
 */
app.get("/api/bcv", async (req, res) => {
  try {
    const response = await fetch("https://criptoya.com/api/dolar/oficial");
    if (!response.ok) {
      throw new Error(`CriptoYa responded ${response.status} ${response.statusText}`);
    }

    // Again, read raw text first
    const raw = await response.text();

    // Attempt to parse JSON
    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      const snippet = raw.slice(0, 100);
      throw new Error(`Invalid JSON from CriptoYa: "${snippet}"`);
    }

    // CriptoYa’s oficial API usually returns:
    //   { "oficial": 174231.00, "date": "2025-06-06T12:55:00.000Z", ... }
    if (typeof json.oficial !== "number" || typeof json.date !== "string") {
      throw new Error(`Unexpected shape from CriptoYa: ${JSON.stringify(json)}`);
    }

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
 * Root health‐check – just to verify service is up.
 */
app.get("/", (_req, res) => {
  res.send("🟢 MaduroDólar backend is running");
});


app.listen(PORT, () => {
  console.log(`🟢 MaduroDólar backend running on port ${PORT}`);
});
