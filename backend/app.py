import os
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from image_service import generate_image


app = Flask(__name__)
CORS(app)

GENERATED_FOLDER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "generated"
)

os.makedirs(GENERATED_FOLDER, exist_ok=True)


@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "Prompt2pixel Backend is running!"
    })


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(silent=True) or {}

    prompt = data.get("prompt", "").strip()

    if not prompt:
        return jsonify({
            "success": False,
            "message": "Prompt is required"
        }), 400

    try:
        image = generate_image(prompt)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"image_{timestamp}.png"

        filepath = os.path.join(GENERATED_FOLDER, filename)

        with open(filepath, "wb") as file:
            file.write(image)

        return jsonify({
            "success": True,
            "message": "Image generated successfully",
            "prompt": prompt,
            "filename": filename,
            "image_url": f"/image/{filename}",
            "download_url": f"/download/{filename}"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route("/image/<filename>", methods=["GET"])
def get_image(filename):
    return send_from_directory(
        GENERATED_FOLDER,
        filename
    )


@app.route("/download/<filename>", methods=["GET"])
def download_image(filename):
    return send_from_directory(
        GENERATED_FOLDER,
        filename,
        as_attachment=True
    )


@app.route("/history", methods=["GET"])
def history():
    files = []

    for filename in os.listdir(GENERATED_FOLDER):
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
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


if __name__ == "__main__":
    app.run(debug=True)