// =============================================================================
//   index.js   (BACKEND Principal)
// =============================================================================

// IMPORTS (asegúrate de tener “type”: "module" en tu package.json o usa require() si prefieres CommonJS)
import express from 'express';
import fetch from 'node-fetch';     // npm install node-fetch@2     (versión 2.x funciona con require o import)
import cors from 'cors';

const app = express();

// El puerto lo toma de la variable de entorno PORT (Render la configura por ti):
const PORT = process.env.PORT || 10000;

// ──────────────────────────────────────────────────────────────────────────────
// 1) CONFIGURAR CORS
//   Permite que tu Front‐End (madurodolar.com) haga fetch() a estos endpoint.
//   Si tu front‐end está en https://www.madurodolar.com, añade esa URL aquí.
// ──────────────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: 'https://www.madurodolar.com',
    methods: ['GET']
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// 2) CONSTANTES con URLs externas
// ──────────────────────────────────────────────────────────────────────────────
// URL proxy para Binance P2P (la que ya usabas):
const BINANCE_PROXY_URL = 'https://binance-p2p-proxy-gvv1.onrender.com/api/price';

// URL CriptoYa para BCV oficial:
const CRIPTOYA_BCV_URL = 'https://criptoya.com/api/dolar/bcv';

// ──────────────────────────────────────────────────────────────────────────────
// 3) ENDPOINT: /api/binance
//    Llama a BINANCE_PROXY_URL, parsea JSON, y usa un timeout + retry simple.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/binance', async (req, res) => {
  try {
    // Hacemos el fetch con un timeout de 10 seg. (para no quedar colgados indefinidamente)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(BINANCE_PROXY_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      // Si devuelve 502, 503, etc., respondemos con status 502 al front
      return res.status(502).json({
        error: `Binance proxy responded with status ${response.status}`
      });
    }

    // Parseamos JSON. Ejemplo esperado: { sell:"132.450", buy:"131.000", updated:"2025-06-06T12:54:37.436Z" }
    const data = await response.json();

    // Validamos que “sell” y “buy” existan en data:
    if (typeof data.sell !== 'string' || typeof data.buy !== 'string' || typeof data.updated !== 'string') {
      return res.status(502).json({
        error: 'Binance proxy returned malformed JSON'
      });
    }

    // Todo OK → devolvemos el JSON tal cual al front:
    return res.json({
      sell: data.sell,
      buy: data.buy,
      updated: data.updated
    });
  } catch (err) {
    // Si falló por timeout o abort:
    console.error('Error fetching Binance P2P:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch Binance P2P' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 4) ENDPOINT: /api/bcv
//    Llama a CRIPTOYA_BCV_URL, parsea JSON, y devolvemos { rate, updated }.
//    CriptoYa devuelve JSON similar a:
//      { "oficial": 174231.00, "transferencia": 176000.00, "value": 174231.00, "timestamp": 1738524000000 }
//    Nos interesa “oficial” y “timestamp”.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/bcv', async (req, res) => {
  try {
    const response = await fetch(CRIPTOYA_BCV_URL);
    if (!response.ok) {
      return res.status(502).json({ error: `CriptoYa responded with status ${response.status}` });
    }

    // CriptoYa devuelve algo como:
    //    { "oficial": 174231.00, "transferencia": 176000.00, "blue": 180000.00, "timestamp": 1738524000000 }
    const data = await response.json();

    // Asegurémonos de que data.oficial existe y es numérico:
    if (typeof data.oficial !== 'number' || typeof data.timestamp !== 'number') {
      return res.status(502).json({ error: 'Invalid JSON from CriptoYa' });
    }

    // Devolvemos en el mismo formato que tu front espera, es decir:
    //   { rate: <número>, updated: "<ISO‐date‐string>" }
    return res.json({
      rate: data.oficial,
      updated: new Date(data.timestamp).toISOString()
    });
  } catch (err) {
    console.error('Error fetching BCV:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch BCV' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 5) START SERVER
// ──────────────────────────────────────────────────────────────────────────────
app.listen(PORT || 10000, '0.0.0.0', () => {
  console.log(`MaduroDólar backend running on port ${PORT}`);
});
