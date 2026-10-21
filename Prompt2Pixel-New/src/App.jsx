import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_BASE_URL = "https://prompt2pixel-e8yy.onrender.com";
const API_URL = `${API_BASE_URL}/generate`;
const HISTORY_KEY = "prompt2pixel-history";

function getFullUrl(path) {
  if (!path) return "";
  return new URL(path, API_BASE_URL).href;
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
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
      const saved = JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
      );
      setHistory(Array.isArray(saved) ? saved : []);
    } catch {
      setHistory([]);
    }
  }, []);

  function saveHistory(items) {
    setHistory(items);

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(items)
      );
    } catch {
      setError(
        "Image created, but browser storage is full. Download it to keep it."
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

    const imageExtensions = [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
    ];

    const documentExtensions = [
      "pdf",
      "docx",
      "txt",
    ];

    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a file smaller than 10 MB.");
      return;
    }

    /*
     * IMAGE UPLOAD
     */
    if (imageExtensions.includes(extension)) {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }

      setSelectedImage(file);
      setSelectedImagePreview(
        URL.createObjectURL(file)
      );

      setUploadMessage(
        `${file.name} selected. It will be sent to the AI backend as a reference image.`
      );

      return;
    }

    /*
     * DOCUMENT UPLOAD
     */
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

      /*
       * TXT
       */
      if (extension === "txt") {
        extractedText = await file.text();
      }

      /*
       * DOCX
       */
      else if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();

        const result =
          await mammoth.extractRawText({
            arrayBuffer,
          });

        extractedText = result.value || "";
      }

      /*
       * PDF
       */
      else if (extension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();

        const pdf =
          await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;

        const pageTexts = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const pdfPage =
            await pdf.getPage(pageNumber);

          const content =
            await pdfPage.getTextContent();

          pageTexts.push(
            content.items
              .map((item) =>
                "str" in item ? item.str : ""
              )
              .join(" ")
          );
        }

        extractedText =
          pageTexts.join("\n");
      }

      extractedText = extractedText
        .replace(/\s+/g, " ")
        .trim();

      if (!extractedText) {
        throw new Error(
          "No readable text was found. Scanned PDFs need OCR support."
        );
      }

      setPrompt(
        extractedText.slice(0, 1000)
      );

      setUploadMessage(
        extractedText.length > 1000
          ? `Text extracted from ${file.name}. The first 1,000 characters were added to the prompt.`
          : `Text extracted from ${file.name} and added to the prompt.`
      );
    } catch (uploadError) {
      console.error(
        "File upload error:",
        uploadError
      );

      setUploadMessage("");

      setError(
        uploadError.message ||
          "Could not read this document."
      );
    }
  }

  /*
   * GENERATE IMAGE
   *
   * IMPORTANT FIX:
   * The backend returns:
   *
   * data.images
   *
   * instead of:
   *
   * data.image_url
   *
   * Also, selected images are now sent
   * to the backend using FormData.
   */
  async function generateImage(event) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError(
        "Please describe the image you want to create."
      );
      return;
    }

    setLoading(true);
    setError("");
    setImage("");
    setDownloadUrl("");

    try {
      /*
       * Use FormData because it supports:
       * 1. Prompt only
       * 2. Prompt + image
       */
      const formData = new FormData();

      formData.append(
        "prompt",
        trimmedPrompt
      );

      /*
       * Send uploaded image when available.
       */
      if (selectedImage) {
        formData.append(
          "file",
          selectedImage
        );
      }

      console.log(
        "Sending request to:",
        API_URL
      );

      const response = await fetch(
        API_URL,
        {
          method: "POST",
          body: formData,
        }
      );

      /*
       * Try to read JSON response.
       */
      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Backend returned an invalid response. HTTP status: ${response.status}`
        );
      }

      console.log(
        "Backend response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "The backend could not generate the image."
        );
      }

      /*
       * Backend returns:
       *
       * images: [
       *   {
       *     model: "...",
       *     url: "...",
       *     download_url: "..."
       *   }
       * ]
       */
      if (
        !data.images ||
        data.images.length === 0
      ) {
        throw new Error(
          "The backend did not return any images."
        );
      }

      /*
       * Display the first generated image.
       */
      const firstImage =
        data.images[0];

      const imageUrl =
        getFullUrl(firstImage.url);

      const fileUrl =
        firstImage.download_url
          ? getFullUrl(
              firstImage.download_url
            )
          : imageUrl;

      /*
       * Test whether image URL works.
       */
      await new Promise(
        (resolve, reject) => {
          const testImage =
            new Image();

          testImage.onload =
            resolve;

          testImage.onerror = () =>
            reject(
              new Error(
                "Image was generated, but it could not be loaded."
              )
            );

          testImage.src =
            imageUrl;
        }
      );

      setImage(imageUrl);
      setDownloadUrl(fileUrl);

      /*
       * Save first generated image
       * to browser history.
       */
      const newItem = {
        id: `${Date.now()}`,
        prompt: trimmedPrompt,
        image: imageUrl,
        downloadUrl: fileUrl,
        filename:
          firstImage.filename ||
          `prompt2pixel-${Date.now()}.png`,
        createdAt:
          new Date().toLocaleString(),
      };

      let oldItems = [];

      try {
        const stored =
          JSON.parse(
            localStorage.getItem(
              HISTORY_KEY
            ) || "[]"
          );

        oldItems = Array.isArray(
          stored
        )
          ? stored
          : [];
      } catch {
        oldItems = [];
      }

      saveHistory(
        [newItem, ...oldItems].slice(
          0,
          10
        )
      );
    } catch (err) {
      console.error(
        "Image generation error:",
        err
      );

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

    const link =
      document.createElement("a");

    link.href = src;
    link.download = name;
    link.target = "_blank";
    link.rel =
      "noopener noreferrer";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  function openHistory(item) {
    setPrompt(item.prompt);

    setImage(
      getFullUrl(item.image)
    );

    setDownloadUrl(
      getFullUrl(
        item.downloadUrl ||
          item.image
      )
    );

    setError("");

    setPage("home");
  }

  function deleteHistory(id) {
    saveHistory(
      history.filter(
        (item) => item.id !== id
      )
    );
  }

  function clearHistory() {
    if (
      !window.confirm(
        "Clear all your saved images?"
      )
    ) {
      return;
    }

    setHistory([]);

    try {
      localStorage.removeItem(
        HISTORY_KEY
      );
    } catch {
      // History has already been cleared.
    }
  }

  return (
    <div className="app-shell">

      <header className="topbar">

        <button
          className="brand"
          onClick={() =>
            setPage("home")
          }
        >
          <span className="brand-symbol">
            ✦
          </span>

          <span>
            Prompt
            <span className="brand-accent">
              2Pixel
            </span>
          </span>
        </button>

        <div className="tagline">
          Turn your ideas into stunning
          images
        </div>

        <button
          className="header-history"
          onClick={() =>
            setPage("history")
          }
        >
          ◷
          <span>History</span>

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
              onClick={() =>
                setPage("home")
              }
            >
              <span>⌂</span>
              Home
            </button>

            <button
              className={
                page === "history"
                  ? "side-link selected"
                  : "side-link"
              }
              onClick={() =>
                setPage("history")
              }
            >
              <span>◷</span>
              History
            </button>

            <button
              className={
                page === "about"
                  ? "side-link selected"
                  : "side-link"
              }
              onClick={() =>
                setPage("about")
              }
            >
              <span>ⓘ</span>
              About
            </button>

          </div>

          <div className="sidebar-bottom">

            <span className="sidebar-star">
              ✦
            </span>

            <h3>
              Create Anything with AI
            </h3>

            <div className="sidebar-line" />

            <p>
              Your imagination is the
              only limit.
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
                    Create Your{" "}
                    <span>Image</span>
                  </h1>

                  <p className="section-description">
                    Describe what you want
                    to see, and let AI turn
                    your words into art.
                  </p>

                  <form
                    onSubmit={generateImage}
                  >

                    <input
                      ref={fileInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt"
                      onChange={
                        handleFileUpload
                      }
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
                        PNG, JPG, WEBP, PDF,
                        DOCX or TXT · Max 10 MB
                      </span>

                    </div>

                    {selectedImagePreview && (
                      <div className="selected-file-card">

                        <img
                          className="selected-image-preview"
                          src={
                            selectedImagePreview
                          }
                          alt="Uploaded reference"
                        />

                        <div className="selected-file-details">

                          <strong>
                            {selectedImage?.name}
                          </strong>

                          <span>
                            Image selected for
                            reference
                          </span>

                        </div>

                        <button
                          className="remove-file-button"
                          type="button"
                          onClick={
                            clearSelectedImage
                          }
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
                        setPrompt(
                          event.target.value
                        )
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
                          onClick={() =>
                            setStyle(item)
                          }
                        >
                          {item ===
                            "Normal" &&
                            "✧ "}

                          {item ===
                            "Realistic" &&
                            "◈ "}

                          {item ===
                            "Anime" &&
                            "✦ "}

                          {item ===
                            "Cartoon" &&
                            "☺ "}

                          {item ===
                            "Artistic" &&
                            "◉ "}

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

                          Generating image...
                        </>
                      ) : (
                        <>
                          ✦ &nbsp; Generate Image{" "}
                          <span>→</span>
                        </>
                      )}

                    </button>

                    <div className="small-note">
                      Your prompt will be sent
                      to the connected AI
                      backend.
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

                    <h2>
                      ◷ &nbsp; Recent Prompts
                    </h2>

                    <button
                      onClick={() =>
                        setPage("history")
                      }
                    >
                      View All ›
                    </button>

                  </div>

                  {history.length === 0 ? (
                    <div className="no-history">

                      <span>✧</span>

                      <p>
                        Your generated images
                        will appear here.
                      </p>

                    </div>
                  ) : (
                    <div className="recent-list">

                      {history
                        .slice(0, 4)
                        .map((item) => (

                          <div
                            className="recent-item"
                            key={item.id}
                          >

                            <button
                              className="recent-open"
                              onClick={() =>
                                openHistory(
                                  item
                                )
                              }
                            >

                              <img
                                src={getFullUrl(
                                  item.image
                                )}
                                alt=""
                              />

                              <span className="recent-text">

                                <strong>
                                  {item.prompt}
                                </strong>

                                <small>
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
                    </span>{" "}
                    Generated Image
                  </h2>

                  {image && (
                    <span className="ready-indicator">
                      ● READY
                    </span>
                  )}

                </div>

                <div
                  className={`image-preview ${
                    image
                      ? "has-image"
                      : ""
                  }`}
                >

                  {loading ? (

                    <div className="preview-empty">

                      <span className="preview-symbol rotating">
                        ✦
                      </span>

                      <h3>
                        Creating your image
                      </h3>

                      <p>
                        Please wait while the AI
                        creates your artwork.
                      </p>

                    </div>

                  ) : image ? (

                    <img
                      src={image}
                      alt={
                        prompt ||
                        "Generated artwork"
                      }
                    />

                  ) : (

                    <div className="preview-empty">

                      <div className="placeholder-art">

                        <div className="placeholder-sun" />

                        <div className="placeholder-mountain mountain-a" />

                        <div className="placeholder-mountain mountain-b" />

                      </div>

                      <h3>
                        Your canvas awaits
                      </h3>

                      <p>
                        Describe your idea and
                        click Generate Image to
                        bring it to life.
                      </p>

                    </div>

                  )}

                </div>

                {image && !loading && (

                  <div className="image-actions">

                    <button
                      className="download-button"
                      onClick={() =>
                        downloadImage(
                          downloadUrl ||
                            image
                        )
                      }
                    >
                      ↓ &nbsp; Download
                    </button>

                    <button
                      className="share-button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            image
                          );

                          alert(
                            "Image URL copied."
                          );
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

                  <span>
                    ✦ Prompt2Pixel Studio
                  </span>

                  <span>
                    Made with imagination
                  </span>

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
                    Image{" "}
                    <span>History</span>
                  </h1>

                  <p>
                    Revisit and download your
                    previous creations.
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

                  <h3>
                    No images yet
                  </h3>

                  <p>
                    Generate an image to
                    start your collection.
                  </p>

                  <button
                    className="generate-button"
                    onClick={() =>
                      setPage("home")
                    }
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
                          src={getFullUrl(
                            item.image
                          )}
                          alt={item.prompt}
                        />
                      </button>

                      <div className="history-info">

                        <p>
                          {item.prompt}
                        </p>

                        <small>
                          {item.createdAt}
                        </small>

                        <div className="history-actions">

                          <button
                            onClick={() =>
                              openHistory(
                                item
                              )
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
                              deleteHistory(
                                item.id
                              )
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
                Welcome to{" "}
                <span>Prompt2Pixel</span>
              </h1>

              <p>
                Prompt2Pixel transforms text
                prompts into AI-generated images
                through its connected
                image-generation backend.
              </p>

              <button
                className="generate-button"
                onClick={() =>
                  setPage("home")
                }
              >
                Start Creating →
              </button>

            </section>

          )}

        </main>

      </div>

      <footer className="footer">

        <span>
          ✦ Prompt2Pixel
        </span>

        <span>
          Transform imagination into
          pixels.
        </span>

        <span>
          AI Image Studio
        </span>

      </footer>

    </div>
  );
}

export default App;