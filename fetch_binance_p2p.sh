#!/usr/bin/env bash
set -euo pipefail

BINANCE_API="https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"

get_price() {
  local TYPE=$1
  local RESP

  RESP=$(curl -s --compressed -X POST "$BINANCE_API" \
    -H "Content-Type: application/json" \
    --data-raw '{"asset":"USDT","fiat":"VES","merchantCheck":false,"page":1,"rows":5,"payTypes":[],"publisherType":null,"tradeType":"'"$TYPE"'"}')

  # validate JSON
  echo "$RESP" | jq . >/dev/null 2>&1

  # extract first adv.price
  local PRICE
  PRICE=$(jq -r '.data[0].adv.price' <<<"$RESP")

  # sanity check
  if [[ ! $PRICE =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    >&2 echo "❌ Bad price for $TYPE: $PRICE"
    exit 1
  fi

  echo "$PRICE"
}

SELL=$(get_price SELL)
BUY=$(get_price BUY)

cat > price.json <<EOF
{
  "sell": "$SELL",
  "buy":  "$BUY",
  "updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ price.json written:"
cat price.json
