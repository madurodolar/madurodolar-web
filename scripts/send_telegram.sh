#!/usr/bin/env bash
set -euo pipefail

BOT_TOKEN="$1"
CHAT_ID="$2"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "Usage: $0 <BOT_TOKEN> <CHAT_ID>"
  exit 1
fi

# Load price.json (prefer local file)
if [[ -f price.json ]]; then
  p2p=$(cat price.json)
else
  p2p=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/price.json)
fi
buy=$(jq -r '.buy'  <<<"$p2p")
sell=$(jq -r '.sell' <<<"$p2p")

# Load bcv.json (prefer local file)
if [[ -f bcv.json ]]; then
  bcvj=$(cat bcv.json)
else
  bcvj=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/bcv.json)
fi
bcv=$(jq -r '.rate'    <<<"$bcvj")
bcvu=$(jq -r '.updated' <<<"$bcvj")

# Build date
raw_date=$(date +"%Y-%m-%d")
date_escaped="\\(${raw_date}\\)"

# Construct MarkdownV2 message — note all \( and \)
msg="💡 *Referencia informativa: Valor del dólar hoy en Venezuela*"
msg+="\n\n📊 *Mercado Binance P2P* \\(informativo\\):"
msg+="\n• Compra: *${buy}* VES"
msg+="\n• Venta:  *${sell}* VES"
msg+="\n\n🏛 *Oficial \\(BCV\\):* ${bcv} VES"
msg+="\n_Ultima actualización BCV:_ \`${bcvu}\`"
msg+="\n\n📅 _${date_escaped}_"

# Send to Telegram and show the raw response
response=$(curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode=MarkdownV2 \
  --data-urlencode "text=${msg}")

echo "Telegram API response:"
echo "${response}"
