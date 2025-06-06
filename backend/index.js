// index.js (Backend, to deploy on Render)
// =======================================

// 1) IMPORT AND CONFIGURE DEPENDENCIES
// ------------------------------------
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// 2) ENABLE CORS FOR YOUR FRONTEND DOMAIN
// ---------------------------------------
//    Replace "https://www.madurodolar.com" with your actual frontend URL or
//    use "*" if you prefer to allow all origins temporarily (not recommended
//    in production). For maximum safety, whitelist only the exact domain.
app.use(
  cors({
    origin: "https://www.madurodolar.com", // ← change this to your real site if needed
  })
);

// 3) CONFIGURE PORT FOR RENDER
// ----------------------------
//    Render will inject process.env.PORT automatically. We fall back to 10000 locally.
const PORT = process.env.PORT || 10000;

// 4) SET UP CONSTANTS FOR BOTH API ENDPOINTS
// ------------------------------------------
//    - BINANCE_PROXY_URL: your existing Binance P2P proxy (deployed at Render)
//    - BCV_URL: we use CriptoYa’s “oficial” endpoint, which returns JSON.
const BINANCE_PROXY_URL =
  "https://binance-p2p-proxy-gvvl.onrender.com/api/price"; // ← your Binance proxy
const BCV_URL = "https://criptoya.com/api/dolar/oficial"; // ← “Oficial” (Dólar BCV) from CriptoYa

// 5) /api/binance ROUTE
// ----------------------
//    This simply forwards your request to the Binance-proxy service. If anything
//    goes wrong (e.g. 502, 500, parse errors), we catch it and return a 500 + JSON.
app.get("/api/binance", async (req, res) => {
  try {
    const response = await fetch(BINANCE_PROXY_URL);
    if (!response.ok) {
      // non-200 → relay error
      throw new Error(`Binance proxy responded with status ${response.status}`);
    }

    // e.g. { sell:"132.450", buy:"131.000", updated:"2025-06-06T12:54:37.436Z" }
    const data = await response.json();

    // We simply forward that JSON blob to the client.
    res.json(data);
  } catch (err) {
    console.error("Error fetching Binance P2P:", err.message);
    res.status(500).json({ error: "Error fetching Binance P2P" });
  }
});

// 6) /api/bcv ROUTE
// ------------------
//    Fetches the “oficial” rate from CriptoYa. That endpoint returns a JSON object
//    like `{ "oficial": 174231.00, "blue": 175000.00, … }` or, if you specifically
//    call `/api/dolar/oficial`, it may return simply a number or an object with “oficial”.
//    We guard against both possibilities.
//
//    NOTE: CriptoYa occasionally changes its JSON structure, so if you see “Invalid pair”
//    or “Unexpected token”, it usually means the URL was wrong or the service is down.
//    Make sure you are hitting exactly `https://criptoya.com/api/dolar/oficial`.
//
//    We then wrap the result into a consistent format:
//      { rate: 174231.00, updated: "2025-06-06T12:55:00.000Z" }
//
app.get("/api/bcv", async (req, res) => {
  try {
    const response = await fetch(BCV_URL);
    if (!response.ok) {
      throw new Error(`BCV endpoint responded with status ${response.status}`);
    }

    // Attempt to parse the JSON body
    // Sometimes CriptoYa’s “oficial” endpoint returns a bare number, sometimes an object.
    const raw = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      throw new Error(`Invalid JSON from BCV: ${parseErr.message}`);
    }

    // Now normalize:
    //   If parsed is an object and parsed.oficial exists → use that.
    //   If parsed is a bare number → use parsed directly.
    let rateValue;
    if (typeof parsed === "object" && parsed !== null && "oficial" in parsed) {
      rateValue = parseFloat(parsed.oficial);
    } else if (typeof parsed === "number") {
      rateValue = parsed;
    } else {
      throw new Error("BCV JSON did not contain a valid 'oficial' field");
    }

    if (isNaN(rateValue)) {
      throw new Error("Parsed BCV rate is NaN");
    }

    // If you want a reliable “updated” timestamp, you can either trust the “date”
    // field inside CriptoYa’s response (if they provide it), or simply return `Date.now()`.
    // Here we return the current UTC timestamp.
    const updatedISO = new Date().toISOString();

    res.json({
      rate: rateValue,
      updated: updatedISO,
    });
  } catch (err) {
    console.error("Error fetching BCV:", err.message);
    res.status(500).json({ error: "Error fetching BCV" });
  }
});

// 7) START HTTP SERVER
// ----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MaduroDólar backend running on port ${PORT}`);
});
// index.js (Backend, to deploy on Render)