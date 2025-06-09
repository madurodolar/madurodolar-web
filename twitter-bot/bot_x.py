import os
import tweepy

# 1) Autenticación con tus claves (lee de env vars)
client = tweepy.Client(
    bearer_token        = os.getenv("TW_BEARER_TOKEN"),
    consumer_key        = os.getenv("TW_API_KEY"),
    consumer_secret     = os.getenv("TW_API_SECRET"),
    access_token        = os.getenv("TW_ACCESS_TOKEN"),
    access_token_secret = os.getenv("TW_ACCESS_SECRET")
)

# 2) Función para tu tweet
def tweet(texto: str):
    resp = client.create_tweet(text=texto)
    print("Publicado en X:", resp.data)

if __name__ == "__main__":
    # Aquí decides cómo traes el valor del dólar:
    #  – Oportunidad A: reutilizas tu script shell/JS con subprocess
    #  – Oportunidad B: haces un pequeño get_rates.py en Python
    # Para ir rápido, vamos con un valor fijo de prueba:
    valor = "130.500"
    tweet(f"💡 Valor del dólar hoy en Venezuela: {valor} VES #MaduroDolar")
