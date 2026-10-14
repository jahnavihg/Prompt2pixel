from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def home():
    return "Prompt2pixel Backend is running!"


@app.route("/generate", methods=["POST"])
def generate_image():
    data = request.get_json()

    prompt = data.get("prompt")

    if not prompt:
        return jsonify({
            "success": False,
            "message": "Prompt is required"
        }), 400

    return jsonify({
        "success": True,
        "prompt": prompt,
        "message": "Prompt received successfully"
    })


if __name__ == "__main__":
    app.run(debug=True)