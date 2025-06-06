#!/bin/bash

# Endpoint de Binance P2P (precio USDT en VES)
BINANCE_API="https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

# Parámetros de  búsqueda (USDT, vendedor, VES, Venezuela)
POST_DATA=$(cat <<EOF
{
  "asset": "USDT",
  "fiat": "VES",
  "merchantCheck": false,
  "page": 1,
  "payTypes": [],
  "publisherType": null,
  "rows": 5,
  "tradeType": "SELL"
}
EOF
)

# Realiza el request
RESPONSE=$(curl -s -X POST "$BINANCE_API" -H "Content-Type: application/json" --data-raw "$POST_DATA")

# Check if the response is empty or invalid
if [[ -z "$RESPONSE" ]]; then
  echo "Error: Empty response from Binance API"
  exit 1
fi

# Validate the response with jq
if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
  echo "Error: Invalid JSON response from Binance API"
  exit 1
fi

# Extrae precios de los primeros vendedores y saca promedio
PRICES=$(echo "$RESPONSE" | jq '[.data[].adv.price | tonumber]')
AVG_PRICE=$(echo "$PRICES" | jq 'add / length')

# Genera price.json con ese valor
echo "{\"sell\":\"$(printf "%.3f" $AVG_PRICE)\",\"updated\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > price.json

# Endpoint para obtener precios de Binance P2P
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
