
BOT_TOKEN="$1"
CHAT_ID="$2"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "Usage: $0 <BOT_TOKEN> <CHAT_ID>"
  exit 1
fi

# 1) Load the P2P JSON
p2p=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/price.json)
buy=$(echo "$p2p"   | jq -r '.buy')
sell=$(echo "$p2p"  | jq -r '.sell')

# 2) Load the BCV JSON
bcvj=$(curl -s https://raw.githubusercontent.com/madurodolar/madurodolar/main/bcv.json)
bcv=$(echo "$bcvj"  | jq -r '.rate')
bcvu=$(echo "$bcvj" | jq -r '.updated')

# 3) Build today’s date
today=$(date +"%Y-%m-%d")

# 4) Construct the Markdown-V2 message
#    remember to escape any characters that Markdown-V2 treats specially
msg="💡 *Referencia informativa: Valor del dólar hoy en Venezuela*"
msg+="\n\n📊 *Mercado Binance P2P* (informativo):"
msg+="\n• Compra: *${buy}* VES"
msg+="\n• Venta:  *${sell}* VES"
msg+="\n\n🏛 *Oficial (BCV):* ${bcv} VES"
msg+="\n_Ultima actualización BCV:_ \`${bcvu}\`"
msg+="\n\n📅 _${today}_"

# 5) Send to Telegram
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode="MarkdownV2" \
  -d disable_web_page_preview=true \
  -d text="$msg" \
  >/dev/null