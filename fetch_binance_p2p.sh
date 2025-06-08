#!/bin/bash

# Endpoint de Binance P2P (precio USDT en VES)
BINANCE_API="https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

# Function to fetch and calculate the average price
fetch_average_price() {
  local trade_type=$1
  local post_data=$(cat <<EOF
{
  "asset": "USDT",
  "fiat": "VES",
  "merchantCheck": false,
  "page": 1,
  "payTypes": [],
  "publisherType": null,
  "rows": 5,
  "tradeType": "$trade_type"
}
EOF
)

  # Make the POST request to Binance API
  local response=$(curl -s -X POST "$BINANCE_API" -H "Content-Type: application/json" --data-raw "$post_data")

  # Check if the response is empty
  if [[ -z "$response" ]]; then
    echo "Error: Empty response from Binance API for tradeType: $trade_type"
    exit 1
  fi

  # Validate the response with jq
  if ! echo "$response" | jq . > /dev/null 2>&1; then
    echo "Error: Invalid JSON response from Binance API for tradeType: $trade_type"
    echo "Response: $response"
    exit 1
  fi

  # Check if the response contains the "data" field
  if ! echo "$response" | jq -e '.data' > /dev/null 2>&1; then
    echo "Error: Binance API response does not contain 'data' field for tradeType: $trade_type"
    echo "Response: $response"
    exit 1
  fi

  # Extract prices and calculate the average
  local prices=$(echo "$response" | jq '[.data[].adv.price | tonumber]')
  if [[ -z "$prices" || "$prices" == "null" ]]; then
    echo "Error: No prices found in Binance API response for tradeType: $trade_type"
    echo "Response: $response"
    exit 1
  fi

  local avg_price=$(echo "$prices" | jq 'add / length')

  echo "$avg_price"
}

# Fetch sell and buy rates
SELL_RATE=$(fetch_average_price "SELL")
BUY_RATE=$(fetch_average_price "BUY")

# Generate price.json with both rates
echo "{\"sell\":\"$(printf "%.3f" $SELL_RATE)\",\"buy\":\"$(printf "%.3f" $BUY_RATE)\",\"updated\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > price.json
echo "✅ price.json written:"
cat price.json