import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_BASE_URL = "https://prompt2pixel-e8yy.onrender.com";
const API_URL = `${API_BASE_URL}/generate`;
const HISTORY_KEY = "prompt2pixel-history";

const STYLE_PROMPTS = {
  Normal: "",
  Realistic:
    "photorealistic, highly realistic, natural lighting, realistic textures, detailed photography",
  Anime:
    "anime style, detailed anime artwork, clean anime linework, expressive composition",
  Cartoon:
    "cartoon style, clean shapes, colorful cartoon illustration, expressive characters",
  Artistic:
    "artistic digital painting, creative composition, rich visual details, expressive artwork",
};

function getFullUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return new URL(path, API_BASE_URL).href;
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [style, setStyle] = useState("Normal");
  const [page, setPage] = useState("home");

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(Array.isArray(saved) ? saved : []);
    } catch {
      setHistory([]);
    }
  }, []);

  function saveHistory(items) {
    setHistory(items);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      setError(
        "Images created, but browser storage is full. Download your images to keep them."
      );
    }
  }

  function clearSelectedImage() {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImage(null);
    setSelectedImagePreview("");
    setUploadMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    const extension = file.name.split(".").pop()?.toLowerCase();

    const imageExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
    const documentExtensions = ["pdf", "docx", "txt"];

    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a file smaller than 10 MB.");
      return;
    }

    if (imageExtensions.includes(extension)) {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }

      setSelectedImage(file);
      setSelectedImagePreview(URL.createObjectURL(file));

      setUploadMessage(
        `${file.name} selected. It will be sent to the backend as an image reference.`
      );

      return;
    }

    if (!documentExtensions.includes(extension)) {
      setError(
        "Unsupported file. Choose PNG, JPG, WEBP, GIF, PDF, DOCX, or TXT."
      );
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImage(null);
    setSelectedImagePreview("");

    setUploadMessage(`Reading ${file.name}...`);

    try {
      let extractedText = "";

      if (extension === "txt") {
        extractedText = await file.text();
      } else if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        extractedText = result.value || "";
      } else if (extension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;

        const pageTexts = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const pdfPage = await pdf.getPage(pageNumber);

          const content = await pdfPage.getTextContent();

          pageTexts.push(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
          );
        }

        extractedText = pageTexts.join("\n");
      }

      extractedText = extractedText.replace(/\s+/g, " ").trim();

      if (!extractedText) {
        throw new Error(
          "No readable text was found. Scanned PDFs need OCR support."
        );
      }

      setPrompt(extractedText.slice(0, 1000));

      setUploadMessage(
        extractedText.length > 1000
          ? `Text extracted from ${file.name}. The first 1,000 characters were added to the prompt.`
          : `Text extracted from ${file.name} and added to the prompt.`
      );
    } catch (uploadError) {
      console.error("File upload error:", uploadError);

      setUploadMessage("");

      setError(
        uploadError.message || "Could not read this document."
      );
    }
  }

  async function generateImage(event) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Please describe the image you want to create.");
      return;
    }

    setLoading(true);
    setError("");

    setGeneratedImages([]);
    setSelectedGeneratedImage(null);

    try {
      const styleInstruction = STYLE_PROMPTS[style];

      const finalPrompt = styleInstruction
        ? `${trimmedPrompt}. ${styleInstruction}.`
        : trimmedPrompt;

      const formData = new FormData();

      formData.append("prompt", finalPrompt);

      if (selectedImage) {
        formData.append("file", selectedImage);
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "The backend could not generate the images."
        );
      }

      if (!Array.isArray(data.images) || data.images.length === 0) {
        throw new Error(
          "The backend did not return any generated images."
        );
      }

      const formattedImages = data.images.map((item, index) => {
        const imageUrl = getFullUrl(item.image);

        const downloadUrl = item.download_url
          ? getFullUrl(item.download_url)
          : imageUrl;

        return {
          id: `${Date.now()}-${index}`,
          model: item.model || `Image ${index + 1}`,
          image: imageUrl,
          downloadUrl,
          filename:
            item.filename ||
            `prompt2pixel-${Date.now()}-${index + 1}.png`,
          prompt: trimmedPrompt,
          style,
          createdAt: new Date().toLocaleString(),
        };
      });

      // Check that every returned image can actually load.
      await Promise.all(
        formattedImages.map(
          (item) =>
            new Promise((resolve, reject) => {
              const testImage = new Image();

              testImage.onload = resolve;

              testImage.onerror = () =>
                reject(
                  new Error(
                    `${item.model} image was generated but could not be loaded.`
                  )
                );

              testImage.src = item.image;
            })
        )
      );

      setGeneratedImages(formattedImages);

      // Automatically select the first generated image.
      setSelectedGeneratedImage(formattedImages[0]);

      // Save each generated image to history.
      const historyItems = formattedImages.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        image: item.image,
        downloadUrl: item.downloadUrl,
        filename: item.filename,
        model: item.model,
        style: item.style,
        createdAt: item.createdAt,
      }));

      let oldItems = [];

      try {
        const stored = JSON.parse(
          localStorage.getItem(HISTORY_KEY) || "[]"
        );

        oldItems = Array.isArray(stored) ? stored : [];
      } catch {
        oldItems = [];
      }

      saveHistory(
        [...historyItems, ...oldItems].slice(0, 20)
      );
    } catch (err) {
      console.error("Image generation error:", err);

      setGeneratedImages([]);
      setSelectedGeneratedImage(null);

      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadImage(
    src,
    name = "prompt2pixel-image.png"
  ) {
    if (!src) return;

    const link = document.createElement("a");

    link.href = src;
    link.download = name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  function selectGeneratedImage(item) {
    setSelectedGeneratedImage(item);
  }

  function openHistory(item) {
    setPrompt(item.prompt || "");

    const historyImage = {
      id: item.id,
      model: item.model || "Generated Image",
      image: getFullUrl(item.image),
      downloadUrl: getFullUrl(
        item.downloadUrl || item.image
      ),
      filename:
        item.filename || "prompt2pixel-image.png",
      prompt: item.prompt || "",
      style: item.style || "Normal",
      createdAt: item.createdAt,
    };

    setGeneratedImages([historyImage]);
    setSelectedGeneratedImage(historyImage);

    setError("");
    setPage("home");
  }

  function deleteHistory(id) {
    saveHistory(
      history.filter((item) => item.id !== id)
    );
  }

  function clearHistory() {
    if (!window.confirm("Clear all your saved images?")) {
      return;
    }

    setHistory([]);

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // History already cleared for this session.
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPage("home")}
        >
          <span className="brand-symbol">✦</span>

          <span>
            Prompt<span className="brand-accent">2Pixel</span>
          </span>
        </button>

        <div className="tagline">
          Turn your ideas into stunning images
        </div>

        <button
          className="header-history"
          onClick={() => setPage("history")}
        >
          ◷ <span>History</span>

          <span className="count">
            {history.length}
          </span>
        </button>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-nav">
            <button
              className={
                page === "home"
                  ? "side-link selected"
                  : "side-link"
              }
              onClick={() => setPage("home")}
            >
              <span>⌂</span> Home
            </button>

            <button
              className={
                page === "history"
                  ? "side-link selected"
                  : "side-link"
              }
              onClick={() => setPage("history")}
            >
              <span>◷</span> History
            </button>

            <button
              className={
                page === "about"
                  ? "side-link selected"
                  : "side-link"
              }
              onClick={() => setPage("about")}
            >
              <span>ⓘ</span> About
            </button>
          </div>

          <div className="sidebar-bottom">
            <span className="sidebar-star">✦</span>

            <h3>Create Anything with AI</h3>

            <div className="sidebar-line" />

            <p>
              Your imagination is the only limit.
            </p>
          </div>
        </aside>

        <main className="main-content">
          {page === "home" && (
            <div className="studio-grid">
              <div className="left-column">
                <section className="create-card">
                  <div className="section-eyebrow">
                    YOUR CREATIVE STUDIO
                  </div>

                  <h1>
                    Create Your <span>Image</span>
                  </h1>

                  <p className="section-description">
                    Describe what you want to see, and let AI
                    turn your words into art.
                  </p>

                  <form onSubmit={generateImage}>
                    <input
                      ref={fileInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt"
                      onChange={handleFileUpload}
                    />

                    <div className="upload-section">
                      <button
                        className="upload-button"
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        disabled={loading}
                      >
                        <span className="upload-button-icon">
                          ↑
                        </span>

                        Upload Image or Document
                      </button>

                      <span className="upload-help">
                        PNG, JPG, WEBP, PDF, DOCX or TXT ·
                        Max 10 MB
                      </span>
                    </div>

                    {selectedImagePreview && (
                      <div className="selected-file-card">
                        <img
                          className="selected-image-preview"
                          src={selectedImagePreview}
                          alt="Uploaded reference"
                        />

                        <div className="selected-file-details">
                          <strong>
                            {selectedImage?.name}
                          </strong>

                          <span>
                            Image selected for reference
                          </span>
                        </div>

                        <button
                          className="remove-file-button"
                          type="button"
                          onClick={clearSelectedImage}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {uploadMessage && (
                      <div className="upload-message">
                        {uploadMessage}
                      </div>
                    )}

                    <div className="prompt-label-row">
                      <label htmlFor="prompt">
                        Describe your image
                      </label>

                      <span>
                        {prompt.length}/1000
                      </span>
                    </div>

                    <textarea
                      id="prompt"
                      maxLength={1000}
                      value={prompt}
                      onChange={(event) =>
                        setPrompt(event.target.value)
                      }
                      placeholder="e.g. A beautiful sunset over mountains, cinematic style..."
                      disabled={loading}
                    />

                    <div className="style-label">
                      CHOOSE A STYLE
                    </div>

                    <div className="style-options">
                      {[
                        "Normal",
                        "Realistic",
                        "Anime",
                        "Cartoon",
                        "Artistic",
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={
                            style === item
                              ? "style-chip active"
                              : "style-chip"
                          }
                          onClick={() => setStyle(item)}
                          disabled={loading}
                        >
                          {item === "Normal" && "✧ "}
                          {item === "Realistic" && "◈ "}
                          {item === "Anime" && "✦ "}
                          {item === "Cartoon" && "☺ "}
                          {item === "Artistic" && "◉ "}
                          {item}
                        </button>
                      ))}
                    </div>

                    <button
                      className="generate-button"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner" />
                          Generating images...
                        </>
                      ) : (
                        <>
                          ✦ &nbsp; Generate Image{" "}
                          <span>→</span>
                        </>
                      )}
                    </button>

                    <div className="small-note">
                      Your prompt will be sent to the
                      connected AI backend.
                    </div>
                  </form>

                  {error && (
                    <div className="error-box">
                      {error}
                    </div>
                  )}
                </section>

                <section className="recent-card">
                  <div className="recent-heading">
                    <h2>◷ &nbsp; Recent Prompts</h2>

                    <button
                      onClick={() => setPage("history")}
                    >
                      View All ›
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <div className="no-history">
                      <span>✧</span>

                      <p>
                        Your generated images will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    <div className="recent-list">
                      {history.slice(0, 4).map((item) => (
                        <div
                          className="recent-item"
                          key={item.id}
                        >
                          <button
                            className="recent-open"
                            onClick={() =>
                              openHistory(item)
                            }
                          >
                            <img
                              src={getFullUrl(item.image)}
                              alt=""
                            />

                            <span className="recent-text">
                              <strong>
                                {item.prompt}
                              </strong>

                              <small>
                                {item.model
                                  ? `${item.model} · `
                                  : ""}
                                {item.createdAt}
                              </small>
                            </span>

                            <span className="recent-arrow">
                              ›
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="image-card">
                <div className="image-card-heading">
                  <h2>
                    <span className="image-icon">
                      ▧
                    </span>

                    Generated Images
                  </h2>

                  {generatedImages.length > 0 && (
                    <span className="ready-indicator">
                      ● {generatedImages.length} READY
                    </span>
                  )}
                </div>

                <div
                  className={`image-preview ${
                    selectedGeneratedImage
                      ? "has-image"
                      : ""
                  }`}
                >
                  {loading ? (
                    <div className="preview-empty">
                      <span className="preview-symbol rotating">
                        ✦
                      </span>

                      <h3>Creating your images</h3>

                      <p>
                        Please wait while the AI creates
                        your artwork.
                      </p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns:
                          generatedImages.length > 1
                            ? "repeat(2, minmax(0, 1fr))"
                            : "1fr",
                        gap: "16px",
                        padding: "12px",
                      }}
                    >
                      {generatedImages.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            selectGeneratedImage(item)
                          }
                          style={{
                            border:
                              selectedGeneratedImage?.id ===
                              item.id
                                ? "3px solid #6c5ce7"
                                : "1px solid #ddd",
                            borderRadius: "14px",
                            padding: "8px",
                            background: "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.model}
                            style={{
                              width: "100%",
                              aspectRatio: "1 / 1",
                              objectFit: "cover",
                              borderRadius: "10px",
                              display: "block",
                            }}
                          />

                          <div
                            style={{
                              padding: "8px 4px 2px",
                              fontWeight: 600,
                            }}
                          >
                            {item.model}
                          </div>

                          {selectedGeneratedImage?.id ===
                            item.id && (
                            <div
                              style={{
                                color: "#6c5ce7",
                                fontSize: "13px",
                                marginTop: "4px",
                              }}
                            >
                              ✓ Selected
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="preview-empty">
                      <div className="placeholder-art">
                        <div className="placeholder-sun" />

                        <div className="placeholder-mountain mountain-a" />

                        <div className="placeholder-mountain mountain-b" />
                      </div>

                      <h3>Your canvas awaits</h3>

                      <p>
                        Describe your idea and click Generate
                        Image to bring it to life.
                      </p>
                    </div>
                  )}
                </div>

                {selectedGeneratedImage &&
                  !loading && (
                    <div
                      style={{
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <strong>
                        Selected:{" "}
                        {selectedGeneratedImage.model}
                      </strong>
                    </div>
                  )}

                {selectedGeneratedImage &&
                  !loading && (
                    <div className="image-actions">
                      <button
                        className="download-button"
                        onClick={() =>
                          downloadImage(
                            selectedGeneratedImage.downloadUrl ||
                              selectedGeneratedImage.image,
                            selectedGeneratedImage.filename ||
                              "prompt2pixel-image.png"
                          )
                        }
                      >
                        ↓ &nbsp; Download Selected
                      </button>

                      <button
                        className="share-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              selectedGeneratedImage.image
                            );

                            alert("Image URL copied.");
                          } catch {
                            alert(
                              "Use Download to save your image."
                            );
                          }
                        }}
                      >
                        ↗ &nbsp; Share
                      </button>
                    </div>
                  )}

                <div className="image-caption">
                  <span>✦ Prompt2Pixel Studio</span>

                  <span>Made with imagination</span>
                </div>
              </section>
            </div>
          )}

          {page === "history" && (
            <section className="page-card">
              <div className="page-heading">
                <div>
                  <div className="section-eyebrow">
                    YOUR COLLECTION
                  </div>

                  <h1>
                    Image <span>History</span>
                  </h1>

                  <p>
                    Revisit and download your previous
                    creations.
                  </p>
                </div>

                {history.length > 0 && (
                  <button
                    className="clear-button"
                    onClick={clearHistory}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="no-history large-empty">
                  <span>✧</span>

                  <h3>No images yet</h3>

                  <p>
                    Generate an image to start your
                    collection.
                  </p>

                  <button
                    className="generate-button"
                    onClick={() => setPage("home")}
                  >
                    Start Creating →
                  </button>
                </div>
              ) : (
                <div className="history-grid">
                  {history.map((item) => (
                    <article
                      className="history-item"
                      key={item.id}
                    >
                      <button
                        className="history-image"
                        onClick={() =>
                          openHistory(item)
                        }
                      >
                        <img
                          src={getFullUrl(item.image)}
                          alt={item.prompt}
                        />
                      </button>

                      <div className="history-info">
                        <p>{item.prompt}</p>

                        {item.model && (
                          <small>
                            {item.model}
                          </small>
                        )}

                        <small>
                          {item.createdAt}
                        </small>

                        <div className="history-actions">
                          <button
                            onClick={() =>
                              openHistory(item)
                            }
                          >
                            Open
                          </button>

                          <button
                            onClick={() =>
                              downloadImage(
                                getFullUrl(
                                  item.downloadUrl ||
                                    item.image
                                ),
                                item.filename ||
                                  "prompt2pixel-image.png"
                              )
                            }
                          >
                            Download
                          </button>

                          <button
                            onClick={() =>
                              deleteHistory(item.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {page === "about" && (
            <section className="page-card about-card">
              <div className="section-eyebrow">
                ABOUT THE PROJECT
              </div>

              <h1>
                Welcome to <span>Prompt2Pixel</span>
              </h1>

              <p>
                Prompt2Pixel transforms text prompts into
                AI-generated images through its connected
                image-generation backend.
              </p>

              <button
                className="generate-button"
                onClick={() => setPage("home")}
              >
                Start Creating →
              </button>
            </section>
          )}
        </main>
      </div>

      <footer className="footer">
        <span>✦ Prompt2Pixel</span>

        <span>Transform imagination into pixels.</span>

        <span>AI Image Studio</span>
      </footer>
    </div>
  );
}

export default App;