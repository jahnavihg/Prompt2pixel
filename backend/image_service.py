import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")

MODEL = "@cf/black-forest-labs/flux-1-schnell"


def generate_image(prompt):
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/{MODEL}"
    )

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }

    data = {
        "prompt": prompt,
        "steps": 4
    }

    response = requests.post(
        url,
        headers=headers,
        json=data,
        timeout=180
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("success"):
        raise Exception(str(result.get("errors")))

    image_base64 = result["result"]["image"]

    return base64.b64decode(image_base64)