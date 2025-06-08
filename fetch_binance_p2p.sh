#!/usr/bin/env bash
set -euo pipefail

BINANCE_API="https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

fetch_average_price() {
  local trade_type=$1
  local post_data body response prices avg

  read -r -d '' post_data <<EOF
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

  # 1) fetch
  response=$(curl -s -X POST "$BINANCE_API" \
    -H "Content-Type: application/json" \
    --data-raw "$post_data")

  # 2) make sure it’s valid JSON
  if ! jq . >/dev/null <<<"$response"; then
    >&2 echo "❌ Invalid JSON from Binance for $trade_type:"
    >&2 echo "$response"
    exit 1
  fi

  # 3) pull out the prices array
  prices=$(jq -r '[.data[].adv.price | tonumber] | @sh' <<<"$response")
  # prices will look like: '([123.45, 124.00, 122.90])'

  # 4) ensure we got something
  if [[ "$prices" == "null" || "$prices" == "[]" ]]; then
    >&2 echo "❌ No prices found in Binance response for $trade_type"
    exit 1
  fi

  # 5) compute average
  avg=$(jq 'add / length' <<<"$prices")
  printf "%s\n" "$avg"
}

# main
SELL_RATE=$(fetch_average_price SELL)
BUY_RATE  =$(fetch_average_price BUY)

# 6) now SAFE to printf, because SELL_RATE & BUY_RATE are guaranteed to be numbers
printf '{"sell":"%.3f","buy":"%.3f","updated":"%s"}\n' \
  "$SELL_RATE" \
  "$BUY_RATE" \
  "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
> price.json

echo "✅ price.json written:"
cat price.json
