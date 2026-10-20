import os
import requests
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct"

URL = (
    f"https://api.cloudflare.com/client/v4/accounts/"
    f"{ACCOUNT_ID}/ai/run/{MODEL}"
)


def refine_prompt(user_prompt):
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    data = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert AI image prompt engineer. "
                    "Convert the user's request into a highly detailed, "
                    "photorealistic image-generation prompt. "
                    "Preserve the user's original subject, objects, "
                    "environment, and intent. "
                    "Add realistic details such as natural lighting, "
                    "realistic shadows, accurate textures, natural colors, "
                    "realistic materials, depth of field, professional "
                    "photography, camera perspective, lens details, "
                    "and fine details. "
                    "Make people, faces, skin, hair, clothing, objects, "
                    "buildings, animals, and environments look physically "
                    "realistic whenever they appear. "
                    "Do not make the image cartoon-like, anime-style, "
                    "illustration-like, or overly artificial unless the "
                    "user explicitly requests that style. "
                    "Return only the improved image prompt."
                )
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    }

    response = requests.post(
        URL,
        headers=headers,
        json=data,
        timeout=120
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("success"):
        raise Exception(str(result.get("errors")))

    return result["result"]["choices"][0]["message"]["content"].strip()