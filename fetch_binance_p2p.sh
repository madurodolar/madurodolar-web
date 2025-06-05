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

# Extrae precios de los primeros vendedores y saca promedio
PRICES=$(echo "$RESPONSE" | jq '[.data[].adv.price | tonumber]')
AVG_PRICE=$(echo "$PRICES" | jq 'add / length')

# Genera price.json con ese valor
echo "{\"sell\":\"$(printf "%.3f" $AVG_PRICE)\",\"updated\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > price.json
