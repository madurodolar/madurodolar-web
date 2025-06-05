/**
 * Backend server para MaduroDólar:
 * - /api/binance → obtiene Binance P2P USD/VES
 * - /api/bcv     → obtiene BCV USD/VES desde CriptoYa
 */

import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 1. Endpoint /api/binance
 *    Hace POST a Binance P2P y devuelve { sell, buy, updated }
 */
app.get('/api/binance', async (req, res) => {
  try {
    const url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
    // Para Binance P2P necesitamos mandar dos requests: una para SELL y otra para BUY
    const makeRequest = async (tradeType) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://p2p.binance.com',
          'Referer': 'https://p2p.binance.com/'
        },
        body: JSON.stringify({
          asset: 'USDT',
          fiat: 'VES',
          tradeType: tradeType, // 'SELL' o 'BUY'
          page: 1,
          rows: 1,
          payTypes: []
        })
      });
      const json = await response.json();
      // json.data[0].adv.price contine el precio en string
      return json?.data?.[0]?.adv?.price || null;
    };

    const sellPrice = await makeRequest('SELL');
    const buyPrice = await makeRequest('BUY');
    const now = new Date().toISOString();

    return res.json({
      sell: sellPrice,
      buy: buyPrice,
      updated: now
    });
  } catch (err) {
    console.error('Error en /api/binance:', err);
    return res.status(500).json({ error: 'Error obteniendo datos Binance P2P', details: err.message });
  }
});


/**
 * 2. Endpoint /api/bcv
 *    Hace GET a API de CriptoYa para obtener la tasa oficial BCV
 *    y devuelve { rate, updated }
 */
app.get('/api/bcv', async (req, res) => {
    try {
      const response = await fetch(BCV_URL, { agent });
      const textoRaw = await response.text();  // Leemos como texto para inspeccionarlo
      console.log("Raw BCV response:", textoRaw); // Ver en Log qué devolvió realmente
      
      // Si esperas HTML y luego extraer la tasa con regex, pon aquí tu lógica:
      const regex = /<span class="tasa-oficial">([\d,.]+)<\/span>/;
      const match = textoRaw.match(regex);
      if (!match) {
        // Si no encontramos la etiqueta con la tasa, devolvemos un JSON de error
        throw new Error("No se pudo extraer la tasa BCV (se recibió: " + textoRaw + ")");
      }
      
      const tasa = parseFloat(match[1].replace(',', '.')); 
      return res.json({ rate: tasa }); // Devolvemos siempre un JSON válido
    } catch (err) {
      console.error("Error en /api/bcv:", err.message);
      return res.status(500).json({ error: "Error obteniendo tasa BCV", details: err.message });
    }
  });
  

// Si quieres que respondan también desde la raíz (opcional)
app.get('/', (req, res) => {
  res.send('MaduroDólar Backend. Usa /api/binance y /api/bcv');
});

app.listen(PORT, () => {
  console.log(`MaduroDólar backend corriendo en puerto ${PORT}`);
});
