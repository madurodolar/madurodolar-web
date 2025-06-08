#!/usr/bin/env bash
set -euo pipefail

BOT_TOKEN="$1"
CHAT_ID="$2"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "Usage: $0 <BOT_TOKEN> <CHAT_ID>"
  exit 1
fi

# Load P2P prices
p2p_json=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/price.json)
buy=$(jq -r '.buy'  <<<"$p2p_json")
sell=$(jq -r '.sell' <<<"$p2p_json")

# Load BCV rate
bcv_json=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/bcv.json)
bcv=$(jq -r '.rate'    <<<"$bcv_json")
bcvu=$(jq -r '.updated' <<<"$bcv_json")

# Today’s date
today=$(date +"%Y-%m-%d")

# Build the message with real newlines and escape parentheses for MarkdownV2
msg=$'💡 *Referencia informativa: Valor del dólar hoy en Venezuela*'"\n\n"
msg+=$'📊 *Mercado Binance P2P* \\(informativo\\):'"\n"
msg+="• Compra: \`${buy}\` VES"$'\n'
msg+="• Venta:  \`${sell}\` VES"$'\n\n'
msg+=$'🏛 *Oficial \\(BCV\\):* \`${bcv}\` VES'$'\n'
msg+="_Ultima actualización BCV:_ `"${bcvu}"'`'$'\n\n'
msg+="📅 \`${today}\`"

# Send to Telegram
response=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode=MarkdownV2 \
  --data-urlencode "text=${msg}")

echo "Telegram API response:"
echo "${response}"



