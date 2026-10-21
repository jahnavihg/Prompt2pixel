import os
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from PyPDF2 import PdfReader
from docx import Document

from image_service import generate_images
from llama_service import refine_prompt


# ============================================================
# APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# FOLDERS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

GENERATED_FOLDER = os.path.join(
    BASE_DIR,
    "generated"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

os.makedirs(
    GENERATED_FOLDER,
    exist_ok=True
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


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
# EXTRACT TEXT FROM PDF
# ============================================================

def extract_pdf_text(filepath):

    text = ""

    reader = PdfReader(filepath)

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text.strip()


# ============================================================
# EXTRACT TEXT FROM DOCX
# ============================================================

def extract_docx_text(filepath):

    document = Document(filepath)

    paragraphs = []

    for paragraph in document.paragraphs:

        if paragraph.text.strip():

            paragraphs.append(
                paragraph.text.strip()
            )

    return "\n".join(paragraphs)


# ============================================================
# EXTRACT TEXT FROM TXT
# ============================================================

def extract_txt_text(filepath):

    with open(
        filepath,
        "r",
        encoding="utf-8",
        errors="ignore"
    ) as text_file:

        return text_file.read().strip()


# ============================================================
# UPLOAD
# ============================================================

@app.route("/upload", methods=["POST"])
def upload_file():

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "error": "No file provided"
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":

        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400

    original_name = uploaded_file.filename

    extension = os.path.splitext(
        original_name
    )[1].lower()

    allowed_extensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".pdf",
        ".docx",
        ".txt"
    ]

    if extension not in allowed_extensions:

        return jsonify({
            "success": False,
            "error": (
                "Unsupported file format. "
                "Use PNG, JPG, JPEG, WEBP, PDF, "
                "DOCX or TXT."
            )
        }), 400

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    filename = (
        f"uploaded_{timestamp}{extension}"
    )

    filepath = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    uploaded_file.save(filepath)

    print(
        f"FILE UPLOADED: {filename}",
        flush=True
    )

    return jsonify({
        "success": True,
        "filename": filename,
        "url": f"/upload/{filename}",
        "file_type": extension
    })


# ============================================================
# GENERATE
# ============================================================

@app.route("/generate", methods=["POST"])
def generate():

    try:

        prompt = ""

        uploaded_image_path = None

        uploaded_document_path = None

        image_uploaded = False

        document_uploaded = False


        # ====================================================
        # JSON REQUEST
        # ====================================================

        if request.is_json:

            data = request.get_json()

            prompt = data.get(
                "prompt",
                ""
            ).strip()


        # ====================================================
        # MULTIPART REQUEST
        # ====================================================

        else:

            prompt = request.form.get(
                "prompt",
                ""
            ).strip()

            uploaded_file = request.files.get(
                "file"
            )


            # ------------------------------------------------
            # BACKWARD COMPATIBILITY
            # Allows frontend to continue using "image"
            # ------------------------------------------------

            if not uploaded_file:

                uploaded_file = request.files.get(
                    "image"
                )


            if uploaded_file:

                if uploaded_file.filename == "":

                    return jsonify({
                        "success": False,
                        "error": "Invalid file"
                    }), 400


                original_name = uploaded_file.filename

                extension = os.path.splitext(
                    original_name
                )[1].lower()


                allowed_extensions = [
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".webp",
                    ".pdf",
                    ".docx",
                    ".txt"
                ]


                if extension not in allowed_extensions:

                    return jsonify({
                        "success": False,
                        "error": (
                            "Unsupported file format. "
                            "Use PNG, JPG, JPEG, WEBP, "
                            "PDF, DOCX or TXT."
                        )
                    }), 400


                timestamp = datetime.now().strftime(
                    "%Y%m%d_%H%M%S_%f"
                )


                filename = (
                    f"uploaded_{timestamp}{extension}"
                )


                filepath = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )


                uploaded_file.save(filepath)


                print(
                    f"INPUT FILE SAVED: {filename}",
                    flush=True
                )


                # --------------------------------------------
                # IMAGE
                # --------------------------------------------

                if extension in [
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".webp"
                ]:

                    uploaded_image_path = filepath

                    image_uploaded = True


                # --------------------------------------------
                # PDF / DOCX / TXT
                # --------------------------------------------

                elif extension in [
                    ".pdf",
                    ".docx",
                    ".txt"
                ]:

                    uploaded_document_path = filepath

                    document_uploaded = True


        # ====================================================
        # PROMPT VALIDATION
        # ====================================================

        if not prompt:

            return jsonify({
                "success": False,
                "error": "Please enter a prompt"
            }), 400


        # ====================================================
        # DOCUMENT PROCESSING
        # ====================================================

        if document_uploaded:

            print(
                "DOCUMENT UPLOAD REQUEST",
                flush=True
            )

            extension = os.path.splitext(
                uploaded_document_path
            )[1].lower()


            try:

                if extension == ".pdf":

                    extracted_text = extract_pdf_text(
                        uploaded_document_path
                    )

                elif extension == ".docx":

                    extracted_text = extract_docx_text(
                        uploaded_document_path
                    )

                elif extension == ".txt":

                    extracted_text = extract_txt_text(
                        uploaded_document_path
                    )

                else:

                    extracted_text = ""


            except Exception as e:

                print(
                    "DOCUMENT TEXT EXTRACTION ERROR:",
                    str(e),
                    flush=True
                )

                return jsonify({
                    "success": False,
                    "error": (
                        "Unable to read the uploaded "
                        "document."
                    )
                }), 400


            if not extracted_text:

                return jsonify({
                    "success": False,
                    "error": (
                        "The uploaded document does "
                        "not contain readable text."
                    )
                }), 400


            # ------------------------------------------------
            # Limit extremely large documents
            # ------------------------------------------------

            extracted_text = extracted_text[:20000]


            document_prompt = (
                "The user uploaded a document. "
                "Use the following document content "
                "as additional context when creating "
                "the image-generation prompt.\n\n"
                "DOCUMENT CONTENT:\n"
                f"{extracted_text}\n\n"
                "USER REQUEST:\n"
                f"{prompt}"
            )


            prompt = document_prompt


            print(
                "DOCUMENT TEXT EXTRACTED SUCCESSFULLY",
                flush=True
            )


        # ====================================================
        # STEP 1 — LLAMA 4
        # ====================================================

        print(
            "----------------------------------------",
            flush=True
        )

        print(
            "STEP 1 - PROMPT PROCESSING",
            flush=True
        )


        if image_uploaded:

            print(
                "IMAGE + PROMPT REQUEST",
                flush=True
            )

        elif document_uploaded:

            print(
                "DOCUMENT + PROMPT REQUEST",
                flush=True
            )

        else:

            print(
                "PROMPT ONLY REQUEST",
                flush=True
            )


        # ====================================================
        # LLAMA 4 PROMPT REFINEMENT
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
            # IMPORTANT:
            # If Llama 4 free quota is exhausted,
            # continue using the original prompt.
            # ------------------------------------------------

            if (
                "429" in error_message
                or "daily free allocation" in error_message
                or "Too Many Requests" in error_message
            ):

                print(
                    "LLAMA 4 QUOTA EXHAUSTED - "
                    "CONTINUING WITH ORIGINAL PROMPT",
                    flush=True
                )

                refined_prompt = prompt


            else:

                return jsonify({
                    "success": False,
                    "error": (
                        "Llama 4 prompt processing "
                        "failed. Please try again later."
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
        # STEP 2 — IMAGE GENERATION
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


            if (
                "429" in error_message
                or "daily free allocation" in error_message
                or "Too Many Requests" in error_message
            ):

                return jsonify({
                    "success": False,
                    "error": (
                        "Image generation service "
                        "quota has been exhausted. "
                        "Please try again later."
                    )
                }), 429


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
        # SAVE GENERATED IMAGES
        # ====================================================

        saved_images = []


        for index, item in enumerate(images):

            image_bytes = item["image"]

            model_name = item["model"]


            timestamp = datetime.now().strftime(
                "%Y%m%d_%H%M%S_%f"
            )


            filename = (
                f"generated_{timestamp}_"
                f"{index + 1}.png"
            )


            filepath = os.path.join(
                GENERATED_FOLDER,
                filename
            )


            with open(
                filepath,
                "wb"
            ) as image_file:

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
                "download_url": (
                    f"/download/{filename}"
                )
            })


        # ====================================================
        # CLEANUP UPLOADED FILES
        # ====================================================

        files_to_delete = []


        if uploaded_image_path:

            files_to_delete.append(
                uploaded_image_path
            )


        if uploaded_document_path:

            files_to_delete.append(
                uploaded_document_path
            )


        for file_path in files_to_delete:

            try:

                if os.path.exists(file_path):

                    os.remove(file_path)

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
            f"TOTAL IMAGES GENERATED: "
            f"{len(saved_images)}",
            flush=True
        )


        return jsonify({
            "success": True,
            "prompt": prompt,
            "refined_prompt": refined_prompt,
            "images": saved_images,
            "count": len(saved_images)
        })


    # ========================================================
    # UNEXPECTED ERROR
    # ========================================================

    except Exception as e:

        print(
            "UNEXPECTED SERVER ERROR:",
            str(e),
            flush=True
        )


        return jsonify({
            "success": False,
            "error": (
                "An unexpected server error occurred."
            )
        }), 500


# ============================================================
# SERVE GENERATED IMAGE
# ============================================================

@app.route(
    "/image/<filename>",
    methods=["GET"]
)
def serve_image(filename):

    return send_from_directory(
        GENERATED_FOLDER,
        filename
    )


# ============================================================
# SERVE UPLOADED FILE
# ============================================================

@app.route(
    "/upload/<filename>",
    methods=["GET"]
)
def serve_uploaded_file(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )


# ============================================================
# DOWNLOAD GENERATED IMAGE
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

    images = []


    try:

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
            "error": (
                "Unable to load image history"
            )
        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )