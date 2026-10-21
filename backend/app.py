import os
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from image_service import generate_images
from llama_service import refine_prompt


# ============================================================
# APP SETUP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# FOLDERS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

GENERATED_FOLDER = os.path.join(BASE_DIR, "generated")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

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

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "error": "No image file provided"
        }), 400

    image = request.files["image"]

    if image.filename == "":
        return jsonify({
            "success": False,
            "error": "No image selected"
        }), 400

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

    original_name = image.filename
    extension = os.path.splitext(original_name)[1].lower()

    if extension not in [".png", ".jpg", ".jpeg", ".webp"]:
        return jsonify({
            "success": False,
            "error": "Unsupported image format"
        }), 400

    filename = f"uploaded_{timestamp}{extension}"

    filepath = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    image.save(filepath)

    print(
        f"IMAGE UPLOADED: {filename}",
        flush=True
    )

    return jsonify({
        "success": True,
        "filename": filename,
        "url": f"/upload/{filename}"
    })


# ============================================================
# GENERATE IMAGES
# ============================================================

@app.route("/generate", methods=["POST"])
def generate():

    try:

        prompt = ""
        uploaded_image_path = None
        image_uploaded = False

        # ----------------------------------------------------
        # HANDLE JSON REQUEST
        # ----------------------------------------------------

        if request.is_json:

            data = request.get_json()

            prompt = data.get("prompt", "").strip()

        # ----------------------------------------------------
        # HANDLE MULTIPART REQUEST
        # ----------------------------------------------------

        else:

            prompt = request.form.get(
                "prompt",
                ""
            ).strip()

            image = request.files.get("image")

            if image:

                if image.filename == "":
                    return jsonify({
                        "success": False,
                        "error": "Invalid image file"
                    }), 400

                extension = os.path.splitext(
                    image.filename
                )[1].lower()

                if extension not in [
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".webp"
                ]:
                    return jsonify({
                        "success": False,
                        "error": "Unsupported image format"
                    }), 400

                timestamp = datetime.now().strftime(
                    "%Y%m%d_%H%M%S_%f"
                )

                filename = (
                    f"uploaded_{timestamp}{extension}"
                )

                uploaded_image_path = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )

                image.save(
                    uploaded_image_path
                )

                image_uploaded = True

                print(
                    f"INPUT IMAGE SAVED: {filename}",
                    flush=True
                )

        # ----------------------------------------------------
        # VALIDATE PROMPT
        # ----------------------------------------------------

        if not prompt:

            return jsonify({
                "success": False,
                "error": "Please enter a prompt"
            }), 400

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "STEP 1 - PROMPT PROCESSING",
            flush=True
        )

        print(
            f"USER PROMPT: {prompt}",
            flush=True
        )

        if image_uploaded:

            print(
                "IMAGE + PROMPT REQUEST",
                flush=True
            )

        else:

            print(
                "PROMPT ONLY REQUEST",
                flush=True
            )

        # ====================================================
        # STEP 1 - LLAMA 4 PROMPT REFINEMENT
        # ====================================================

        try:

            refined_prompt = refine_prompt(
                prompt,
                uploaded_image_path
            )

        except Exception as e:

            error_message = str(e)

            print(
                "LLAMA 4 ERROR:",
                error_message,
                flush=True
            )

            # ------------------------------------------------
            # HANDLE CLOUDFLARE 429 QUOTA ERROR
            # ------------------------------------------------

            if (
                "429" in error_message
                or "daily free allocation" in error_message
                or "Too Many Requests" in error_message
            ):

                return jsonify({
                    "success": False,
                    "error": (
                        "Llama 4 daily free quota has been "
                        "exhausted. Please try again later."
                    )
                }), 429

            # ------------------------------------------------
            # OTHER LLAMA ERROR
            # ------------------------------------------------

            return jsonify({
                "success": False,
                "error": (
                    "Llama 4 prompt processing failed. "
                    "Please try again later."
                )
            }), 500

        print(
            "STEP 1 COMPLETED: Prompt refined",
            flush=True
        )

        print(
            f"REFINED PROMPT: {refined_prompt}",
            flush=True
        )

        # ====================================================
        # STEP 2 - IMAGE GENERATION
        # ====================================================

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "STEP 2 - IMAGE GENERATION",
            flush=True
        )

        try:

            images = generate_images(
                refined_prompt,
                image_uploaded=image_uploaded,
                image_path=uploaded_image_path
            )

        except Exception as e:

            error_message = str(e)

            print(
                "IMAGE GENERATION ERROR:",
                error_message,
                flush=True
            )

            # ------------------------------------------------
            # HANDLE QUOTA / RATE LIMIT
            # ------------------------------------------------

            if (
                "429" in error_message
                or "daily free allocation" in error_message
                or "Too Many Requests" in error_message
            ):

                return jsonify({
                    "success": False,
                    "error": (
                        "Image generation service quota "
                        "has been exhausted. Please try "
                        "again later."
                    )
                }), 429

            # ------------------------------------------------
            # OTHER IMAGE ERROR
            # ------------------------------------------------

            return jsonify({
                "success": False,
                "error": (
                    "Image generation failed. "
                    "Please try again later."
                )
            }), 500

        print(
            "STEP 2 COMPLETED: Images generated",
            flush=True
        )

        # ====================================================
        # STEP 3 - SAVE GENERATED IMAGES
        # ====================================================

        saved_images = []

        for index, item in enumerate(images):

            image_bytes = item["image"]
            model_name = item["model"]

            timestamp = datetime.now().strftime(
                "%Y%m%d_%H%M%S_%f"
            )

            filename = (
                f"generated_{timestamp}_{index + 1}.png"
            )

            filepath = os.path.join(
                GENERATED_FOLDER,
                filename
            )

            with open(filepath, "wb") as image_file:

                image_file.write(
                    image_bytes
                )

            print(
                f"SAVED IMAGE: {filename}",
                flush=True
            )

            saved_images.append({
                "filename": filename,
                "model": model_name,
                "url": f"/image/{filename}",
                "download_url": f"/download/{filename}"
            })

        # ----------------------------------------------------
        # DELETE TEMPORARY UPLOAD
        # ----------------------------------------------------

        if uploaded_image_path:

            try:

                if os.path.exists(
                    uploaded_image_path
                ):

                    os.remove(
                        uploaded_image_path
                    )

            except Exception as e:

                print(
                    "UPLOAD CLEANUP ERROR:",
                    str(e),
                    flush=True
                )

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            f"TOTAL IMAGES GENERATED: {len(saved_images)}",
            flush=True
        )

        return jsonify({
            "success": True,
            "prompt": prompt,
            "refined_prompt": refined_prompt,
            "images": saved_images,
            "count": len(saved_images)
        })

    except Exception as e:

        print(
            "UNEXPECTED SERVER ERROR:",
            str(e),
            flush=True
        )

        return jsonify({
            "success": False,
            "error": "An unexpected server error occurred."
        }), 500


# ============================================================
# SERVE GENERATED IMAGE
# ============================================================

@app.route("/image/<filename>", methods=["GET"])
def serve_image(filename):

    return send_from_directory(
        GENERATED_FOLDER,
        filename
    )


# ============================================================
# SERVE UPLOADED IMAGE
# ============================================================

@app.route("/upload/<filename>", methods=["GET"])
def serve_uploaded_image(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )


# ============================================================
# DOWNLOAD GENERATED IMAGE
# ============================================================

@app.route("/download/<filename>", methods=["GET"])
def download_image(filename):

    return send_from_directory(
        GENERATED_FOLDER,
        filename,
        as_attachment=True
    )


# ============================================================
# HISTORY
# ============================================================

@app.route("/history", methods=["GET"])
def history():

    images = []

    try:

        for filename in os.listdir(
            GENERATED_FOLDER
        ):

            if filename.lower().endswith(
                (".png", ".jpg", ".jpeg", ".webp")
            ):

                images.append({
                    "filename": filename,
                    "url": f"/image/{filename}",
                    "download_url": (
                        f"/download/{filename}"
                    )
                })

        images.sort(
            key=lambda item: item["filename"],
            reverse=True
        )

        return jsonify({
            "success": True,
            "count": len(images),
            "images": images
        })

    except Exception as e:

        print(
            "HISTORY ERROR:",
            str(e),
            flush=True
        )

        return jsonify({
            "success": False,
            "error": "Unable to load image history"
        }), 500


# ============================================================
# RUN APP
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )