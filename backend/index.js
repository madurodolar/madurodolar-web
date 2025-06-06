// index.js
// A small Express server that proxies:
//  • /api/binance → Binance P2P average rate (SELL & BUY)
//  • /api/bcv     → CriptoYa’s oficial BCV rate

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (you can restrict this if needed)
app.use(cors());

/**
 * GET /api/binance
 *   - Fetches average SELL and BUY prices from Binance P2P API
 */
app.get("/api/binance", async (req, res) => {
  try {
    const BINANCE_API = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

    // Function to fetch and calculate the average price
    const fetchAveragePrice = async (tradeType) => {
      const POST_DATA = {
        asset: "USDT",
        fiat: "VES",
        merchantCheck: false,
        page: 1,
        payTypes: [],
        publisherType: null,
        rows: 5,
        tradeType: tradeType,
      };

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
        throw new Error(`No prices found for tradeType: ${tradeType}`);
      }

      // Calculate the average price
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    };

    // Fetch sell and buy rates
    const sellRate = await fetchAveragePrice("SELL");
    const buyRate = await fetchAveragePrice("BUY");

    // Respond with both rates and the timestamp
    return res.json({
      sell: sellRate.toFixed(2),
      buy: buyRate.toFixed(2),
      updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/bcv
 *   - Fetches official BCV rate from CriptoYa
 */
app.get("/api/bcv", async (req, res) => {
  try {
    const response = await fetch("https://criptoya.com/api/dolar/oficial");
    if (!response.ok) {
      throw new Error(`CriptoYa responded ${response.status} ${response.statusText}`);
    }

    const raw = await response.text();

    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      const snippet = raw.slice(0, 100);
      throw new Error(`Invalid JSON from CriptoYa: "${snippet}"`);
    }

    if (typeof json.oficial !== "number" || typeof json.date !== "string") {
      throw new Error(`Unexpected shape from CriptoYa: ${JSON.stringify(json)}`);
    }

    return res.json({
      rate: json.oficial,
      updated: json.date,
    });
  } catch (err) {
    console.error("Error fetching BCV:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Root health check
 */
app.get("/", (_req, res) => {
  res.send("🟢 MaduroDólar backend is running");
});

app.listen(PORT, () => {
  console.log(`🟢 MaduroDólar backend running on port ${PORT}`);
});

