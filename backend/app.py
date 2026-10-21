import os
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from image_service import generate_images
from llama_service import refine_prompt


app = Flask(__name__)
CORS(app)


# ============================================================
# FOLDERS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

GENERATED_FOLDER = os.path.join(
    BASE_DIR, "generated"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR, "uploads"
)

os.makedirs(GENERATED_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Prompt2pixel Backend is running!"
    })


# ============================================================
# UPLOAD IMAGE
# ============================================================

@app.route("/upload", methods=["POST"])
def upload_image():

    try:
        image_file = request.files.get("image")

        if not image_file or not image_file.filename:
            return jsonify({
                "success": False,
                "message": "Image is required"
            }), 400

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S_%f"
        )

        original_name = image_file.filename

        extension = os.path.splitext(
            original_name
        )[1].lower()

        if not extension:
            extension = ".png"

        filename = (
            f"uploaded_{timestamp}{extension}"
        )

        filepath = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        image_file.save(filepath)

        print(
            "IMAGE UPLOAD SUCCESS:",
            filename,
            flush=True
        )

        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "filename": filename,
            "image_url": f"/upload/{filename}"
        })

    except Exception as e:

        print(
            "UPLOAD ERROR:",
            repr(e),
            flush=True
        )

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ============================================================
# GENERATE
# ============================================================

@app.route("/generate", methods=["POST"])
def generate():

    try:

        prompt = ""
        image_uploaded = False
        uploaded_image_path = None


        # ====================================================
        # JSON REQUEST
        # ====================================================

        if request.is_json:

            data = (
                request.get_json(
                    silent=True
                ) or {}
            )

            prompt = (
                data.get(
                    "prompt",
                    ""
                ).strip()
            )

            image_uploaded = bool(
                data.get(
                    "image_uploaded",
                    False
                )
            )


        # ====================================================
        # MULTIPART REQUEST
        # ====================================================

        else:

            prompt = (
                request.form.get(
                    "prompt",
                    ""
                ).strip()
            )

            image_file = request.files.get(
                "image"
            )

            if (
                image_file
                and image_file.filename
            ):

                image_uploaded = True

                timestamp = datetime.now().strftime(
                    "%Y%m%d_%H%M%S_%f"
                )

                original_name = (
                    image_file.filename
                )

                extension = os.path.splitext(
                    original_name
                )[1].lower()

                if not extension:
                    extension = ".png"

                filename = (
                    f"uploaded_{timestamp}{extension}"
                )

                uploaded_image_path = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )

                image_file.save(
                    uploaded_image_path
                )

                print(
                    "IMAGE UPLOADED:",
                    filename,
                    flush=True
                )


        # ====================================================
        # CHECK PROMPT
        # ====================================================

        if not prompt:

            return jsonify({
                "success": False,
                "message": "Prompt is required"
            }), 400


        # ====================================================
        # INPUT TYPE
        # ====================================================

        if image_uploaded:

            print(
                "IMAGE INPUT DETECTED",
                flush=True
            )

            print(
                "Uploaded image:",
                uploaded_image_path,
                flush=True
            )

        else:

            print(
                "PROMPT ONLY INPUT",
                flush=True
            )


        # ====================================================
        # STEP 1 — LLAMA 4
        # ====================================================

        print(
            "STEP 1: Sending prompt to Llama 4...",
            flush=True
        )

        refined_prompt = refine_prompt(
            prompt,
            uploaded_image_path
        )

        print(
            "STEP 1 COMPLETED: Prompt refined",
            flush=True
        )


        # ====================================================
        # STEP 2 — IMAGE GENERATION
        # ====================================================

        print(
            "STEP 2: Generating images...",
            flush=True
        )

        # IMPORTANT:
        # The uploaded image path is passed here.
        # This allows image_service.py to pass the
        # image to the supported FLUX models.

        images = generate_images(
            refined_prompt,
            image_uploaded=image_uploaded,
            image_path=uploaded_image_path
        )

        print(
            "STEP 2 COMPLETED: Images generated",
            flush=True
        )


        # ====================================================
        # SAVE GENERATED IMAGES
        # ====================================================

        results = []

        for item in images:

            model_name = item["model"]
            image_bytes = item["image"]

            timestamp = datetime.now().strftime(
                "%Y%m%d_%H%M%S_%f"
            )

            safe_model_name = (
                model_name
                .lower()
                .replace(".", "")
                .replace(" ", "_")
                .replace("-", "_")
            )

            filename = (
                f"{safe_model_name}_"
                f"{timestamp}.png"
            )

            filepath = os.path.join(
                GENERATED_FOLDER,
                filename
            )

            with open(
                filepath,
                "wb"
            ) as file:

                file.write(image_bytes)

            results.append({
                "model": model_name,
                "filename": filename,
                "image_url": f"/image/{filename}",
                "download_url": f"/download/{filename}"
            })

            print(
                "IMAGE SAVED:",
                filename,
                flush=True
            )


        # ====================================================
        # RESPONSE
        # ====================================================

        return jsonify({
            "success": True,
            "message": "Images generated successfully",
            "prompt": prompt,
            "refined_prompt": refined_prompt,
            "image_uploaded": image_uploaded,
            "count": len(results),
            "images": results
        })


    except Exception as e:

        print(
            "GENERATE ERROR:",
            repr(e),
            flush=True
        )

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ============================================================
# GET GENERATED IMAGE
# ============================================================

@app.route(
    "/image/<filename>",
    methods=["GET"]
)
def get_image(filename):

    return send_from_directory(
        GENERATED_FOLDER,
        filename
    )


# ============================================================
# GET UPLOADED IMAGE
# ============================================================

@app.route(
    "/upload/<filename>",
    methods=["GET"]
)
def get_uploaded_image(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )


# ============================================================
# DOWNLOAD IMAGE
# ============================================================

@app.route(
    "/download/<filename>",
    methods=["GET"]
)
def download_image(filename):

    return send_from_directory(
        GENERATED_FOLDER,
        filename,
        as_attachment=True
    )


# ============================================================
# HISTORY
# ============================================================

@app.route(
    "/history",
    methods=["GET"]
)
def history():

    files = []

    for filename in os.listdir(
        GENERATED_FOLDER
    ):

        if filename.lower().endswith(
            (
                ".png",
                ".jpg",
                ".jpeg",
                ".webp"
            )
        ):

            files.append({
                "filename": filename,
                "image_url": f"/image/{filename}",
                "download_url": f"/download/{filename}"
            })

    files.sort(
        key=lambda item: item["filename"],
        reverse=True
    )

    return jsonify({
        "success": True,
        "count": len(files),
        "images": files
    })


# ============================================================
# START FLASK
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )