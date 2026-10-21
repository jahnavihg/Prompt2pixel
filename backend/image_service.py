import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
PARALON_API_KEY = os.getenv("PARALON_API_KEY")


# ============================================================
# IMAGE GENERATION MODELS
# ============================================================

FLUX_KLEIN_4B = "@cf/black-forest-labs/flux-2-klein-4b"
FLUX_KLEIN_9B = "@cf/black-forest-labs/flux-2-klein-9b"
FLUX_SCHNELL = "@cf/black-forest-labs/flux-1-schnell"


# ============================================================
# CLOUDFLARE IMAGE GENERATION
# ============================================================

def generate_cloudflare_image(model, prompt, image_path=None):

    print(
        f"GENERATING IMAGE USING: {model}",
        flush=True
    )

    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/{model}"
    )

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"
    }

    # ========================================================
    # FLUX.1 SCHNELL
    # ========================================================
    # FLUX.1 Schnell expects JSON.
    # It does NOT accept width/height in the request body.
    # ========================================================

    if model == FLUX_SCHNELL:

        headers["Content-Type"] = "application/json"

        data = {
            "prompt": prompt
        }

        response = requests.post(
            url,
            headers=headers,
            json=data,
            timeout=300
        )

    # ========================================================
    # FLUX.2 KLEIN 4B / 9B
    # ========================================================
    # These models use multipart/form-data.
    # This also allows an input image when provided.
    # ========================================================

    else:

        data = {
            "prompt": prompt,
            "width": "1024",
            "height": "1024"
        }

        files = None
        image_file = None

        # ----------------------------------------------------
        # OPTIONAL INPUT IMAGE
        # ----------------------------------------------------

        if image_path:

            print(
                "ADDING INPUT IMAGE TO FLUX MODEL",
                flush=True
            )

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

                mime_type = "image/png"

            image_file = open(
                image_path,
                "rb"
            )

            files = {
                "input_image_0": (
                    os.path.basename(image_path),
                    image_file,
                    mime_type
                )
            }

        # ----------------------------------------------------
        # SEND REQUEST
        # ----------------------------------------------------

        try:

            response = requests.post(
                url,
                headers=headers,
                data=data,
                files=files,
                timeout=300
            )

        finally:

            if image_file:

                image_file.close()

    # ========================================================
    # ERROR HANDLING
    # ========================================================

    if not response.ok:

        print(
            f"{model} STATUS:",
            response.status_code,
            flush=True
        )

        print(
            f"{model} RESPONSE:",
            response.text,
            flush=True
        )

        response.raise_for_status()

    # ========================================================
    # PROCESS RESPONSE
    # ========================================================

    result = response.json()

    if not result.get("success"):

        print(
            f"{model} API ERROR:",
            result.get("errors"),
            flush=True
        )

        raise Exception(
            str(result.get("errors"))
        )

    # ========================================================
    # GET GENERATED IMAGE
    # ========================================================

    image_base64 = result["result"]["image"]

    image_bytes = base64.b64decode(
        image_base64
    )

    print(
        f"{model} IMAGE GENERATED SUCCESSFULLY",
        flush=True
    )

    return image_bytes


# ============================================================
# Z-IMAGE TURBO
# ============================================================

def generate_zimage(prompt):

    print(
        "GENERATING IMAGE: Z-Image Turbo",
        flush=True
    )

    if not PARALON_API_KEY:

        raise Exception(
            "PARALON_API_KEY is not configured"
        )

    url = (
        "https://paraloncloud.com/"
        "v1/images/generations"
    )

    headers = {
        "Authorization": f"Bearer {PARALON_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "z-image-turbo",
        "prompt": prompt,
        "size": "1024x1024",
        "response_format": "b64_json"
    }

    response = requests.post(
        url,
        headers=headers,
        json=data,
        timeout=300
    )

    if not response.ok:

        print(
            "Z-IMAGE STATUS:",
            response.status_code,
            flush=True
        )

        print(
            "Z-IMAGE RESPONSE:",
            response.text,
            flush=True
        )

        response.raise_for_status()

    result = response.json()

    image_base64 = (
        result["data"][0]["b64_json"]
    )

    image_bytes = base64.b64decode(
        image_base64
    )

    print(
        "Z-IMAGE TURBO IMAGE GENERATED SUCCESSFULLY",
        flush=True
    )

    return image_bytes


# ============================================================
# GENERATE ALL IMAGES
# ============================================================

def generate_images(
    prompt,
    image_uploaded=False,
    image_path=None
):

    images = []

    # ========================================================
    # IMAGE 1 — FLUX.2 KLEIN 4B
    # ========================================================

    print(
        "----------------------------------------",
        flush=True
    )

    print(
        "IMAGE 1: FLUX.2 Klein 4B",
        flush=True
    )

    image = generate_cloudflare_image(
        FLUX_KLEIN_4B,
        prompt,
        image_path=image_path
    )

    images.append({
        "model": "FLUX.2 Klein 4B",
        "image": image
    })

    # ========================================================
    # IMAGE 2 — FLUX.2 KLEIN 9B
    # ========================================================

    print(
        "----------------------------------------",
        flush=True
    )

    print(
        "IMAGE 2: FLUX.2 Klein 9B",
        flush=True
    )

    image = generate_cloudflare_image(
        FLUX_KLEIN_9B,
        prompt,
        image_path=image_path
    )

    images.append({
        "model": "FLUX.2 Klein 9B",
        "image": image
    })

    # ========================================================
    # IMAGE 3 — Z-IMAGE TURBO
    # ========================================================

    if not image_uploaded:

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "IMAGE 3: Z-Image Turbo",
            flush=True
        )

        image = generate_zimage(
            prompt
        )

        images.append({
            "model": "Z-Image Turbo",
            "image": image
        })

    else:

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "IMAGE 3: Z-Image Turbo SKIPPED",
            flush=True
        )

        print(
            "Reason: Paralon currently supports "
            "text-to-image only",
            flush=True
        )

    # ========================================================
    # IMAGE 4 — FLUX.1 SCHNELL
    # ========================================================

    if not image_uploaded:

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "IMAGE 4: FLUX.1 Schnell",
            flush=True
        )

        image = generate_cloudflare_image(
            FLUX_SCHNELL,
            prompt
        )

        images.append({
            "model": "FLUX.1 Schnell",
            "image": image
        })

    else:

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "IMAGE 4: FLUX.1 Schnell SKIPPED",
            flush=True
        )

        print(
            "Reason: Image-to-image is not being used here",
            flush=True
        )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    print(
        "----------------------------------------",
        flush=True
    )

    print(
        f"TOTAL IMAGES GENERATED: {len(images)}",
        flush=True
    )

    return images