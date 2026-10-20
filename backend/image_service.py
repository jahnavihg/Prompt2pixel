import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")

MODEL = "@cf/black-forest-labs/flux-2-dev"


def generate_image(prompt):
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/{MODEL}"
    )

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"
    }

    files = {
        "prompt": (None, prompt),
        "steps": (None, "25"),
        "width": (None, "1024"),
        "height": (None, "768")
    }

    response = requests.post(
        url,
        headers=headers,
        files=files,
        timeout=300
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("success"):
        raise Exception(str(result.get("errors")))

    image_base64 = result["result"]["image"]

    return base64.b64decode(image_base64)