#!/usr/bin/env bash

# Variables (defínelas como secretos en GitHub Actions)
BOT_TOKEN="$1"     # Primer argumento: tu token de BotFather
CHAT_ID="$2"       # Segundo: el chat_id de tu canal (p.ej. -1001234567890)

# Obtenemos el precio más reciente de price.json
data=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/price.json)
sell=$(echo "$data" | jq -r '.sell')
buy=$(echo "$data" | jq -r '.buy')
updated=$(echo "$data" | jq -r '.updated')

# Construimos el mensaje
text="💵 *Maduro Dólar* 💵\n\n*Venta:* \`${sell}\` VES\n*Compra:* \`${buy}\` VES\n_Ultima actualización:_ \`$updated\`"

# Enviamos el mensaje (MarkdownV2 para formateo)
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode="MarkdownV2" \
  -d disable_web_page_preview=true \
  -d text="$text" >/dev/null
