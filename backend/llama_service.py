import os
import base64
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


def refine_prompt(user_prompt, image_path=None):

    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    # ---------------------------------------------------------
    # System instruction
    # ---------------------------------------------------------

    system_prompt = (
        "You are an expert AI image prompt engineer. "
        "Convert the user's request into a highly detailed, "
        "photorealistic image-generation prompt suitable for "
        "a high-quality image generation model such as FLUX. "
        "Preserve the user's original subject, objects, "
        "environment, action, composition, and intent. "
        "Improve the prompt with realistic visual details "
        "such as natural lighting, realistic shadows, "
        "accurate textures, natural colors, realistic "
        "materials, depth of field, professional photography, "
        "camera perspective, lens characteristics, and fine "
        "visual details. "
        "For people, include natural facial features, "
        "realistic skin texture, natural hair, realistic "
        "clothing, and natural body proportions. "
        "For animals, include realistic fur, feathers, eyes, "
        "anatomy, textures, and natural behavior. "
        "For buildings and environments, include realistic "
        "architecture, surfaces, vegetation, reflections, "
        "weather, lighting, shadows, and atmospheric details. "
        "Make the final result look physically realistic, "
        "natural, lifelike, and suitable for professional "
        "photography. "
        "Do not add unnecessary objects or change the user's "
        "original intention. "
        "Do not make the image cartoon-like, anime-style, "
        "illustration-like, painting-like, fantasy-like, "
        "or artificially generated-looking unless the user "
        "explicitly requests that style. "
        "Do not explain your changes. "
        "Return ONLY the final improved image-generation prompt."
    )

    # ---------------------------------------------------------
    # Prompt only
    # ---------------------------------------------------------

    if not image_path:

        data = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        }

    # ---------------------------------------------------------
    # Image + Prompt
    # ---------------------------------------------------------

    else:

        print(
            "LLAMA 4: Processing uploaded image + prompt",
            flush=True
        )

        with open(image_path, "rb") as image_file:
            image_bytes = image_file.read()

        image_base64 = base64.b64encode(
            image_bytes
        ).decode("utf-8")

        # Detect the actual image type
        extension = os.path.splitext(
            image_path
        )[1].lower()

        if extension == ".png":
            mime_type = "image/png"

        elif extension in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"

        elif extension == ".webp":
            mime_type = "image/webp"

        else:
            mime_type = "image/jpeg"

        image_data_url = (
            f"data:{mime_type};base64,"
            + image_base64
        )

        data = {
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url
                            }
                        }
                    ]
                }
            ]
        }

    # ---------------------------------------------------------
    # Send request to Cloudflare Llama 4
    # ---------------------------------------------------------

    print(
        "SENDING REQUEST TO LLAMA 4...",
        flush=True
    )

    response = requests.post(
        URL,
        headers=headers,
        json=data,
        timeout=120
    )

    # ---------------------------------------------------------
    # Error handling
    # ---------------------------------------------------------

    if not response.ok:

        print(
            "LLAMA STATUS:",
            response.status_code,
            flush=True
        )

        print(
            "LLAMA RESPONSE:",
            response.text,
            flush=True
        )

        response.raise_for_status()

    result = response.json()

    if not result.get("success"):

        print(
            "LLAMA API ERROR:",
            result.get("errors"),
            flush=True
        )

        raise Exception(
            str(result.get("errors"))
        )

    # ---------------------------------------------------------
    # Extract refined prompt
    # ---------------------------------------------------------

    refined_prompt = (
        result["result"]["choices"][0]
        ["message"]["content"]
        .strip()
    )

    print(
        "REFINED PROMPT:",
        refined_prompt,
        flush=True
    )

    return refined_prompt