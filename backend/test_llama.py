import os
import requests
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct"

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

data = {
    "messages": [
        {
            "role": "user",
            "content": "Improve this image prompt: A dog in a futuristic city"
        }
    ]
}

response = requests.post(
    url,
    headers=headers,
    json=data,
    timeout=120
)

print("Status:", response.status_code)
print("Response:")
print(response.text)