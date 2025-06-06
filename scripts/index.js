// index.js
// A small Express server that proxies:
//  • /api/binance → Binance P2P average rate (USD〉VES)
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
 *   - Fetches average price from Binance P2P API
 *   - If Binance API responds with valid JSON, return { sell, updated }
 *   - If Binance API responds with errors, catch and handle them
 */
app.get("/api/binance", async (req, res) => {
  try {
    const BINANCE_API = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

    // Request payload for Binance P2P API
    const POST_DATA = {
      asset: "USDT",
      fiat: "VES",
      merchantCheck: false,
      page: 1,
      payTypes: [],
      publisherType: null,
      rows: 5,
      tradeType: "SELL",
    };

    // Make the POST request to Binance API
    const response = await fetch(BINANCE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(POST_DATA),
    });

    if (!response.ok) {
      throw new Error(`Binance API responded ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract prices from the response
    const prices = data.data.map((item) => parseFloat(item.adv.price));
    if (prices.length === 0) {
      throw new Error("No prices found in Binance API response");
    }

    // Calculate the average price
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Respond with the average price and timestamp
    return res.json({
      sell: avgPrice.toFixed(2),
      updated: new Date().toISOString(),
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
