
import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "https://prompt2pixel-e8yy.onrender.com";
const API_URL = `${API_BASE_URL}/generate`;
const HISTORY_KEY = "prompt2pixel-history";

const examples = [
  "A beautiful sunset over mountains",
  "A cute golden retriever puppy",
  "A cozy cabin in the forest",
  "A futuristic city at night",
];

function getFullUrl(path) {
  if (!path) return "";
  return new URL(path, API_BASE_URL).href;
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [style, setStyle] = useState("Normal");
  const [page, setPage] = useState("home");
  const [downloadUrl, setDownloadUrl] = useState("");

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
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      setError(
        "Image created, but browser storage is full. Download it to keep it."
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
    setImage("");
    setDownloadUrl("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Backend request failed: ${response.status}`
        );
      }

      if (!data.success) {
        throw new Error(
          data.message || "The backend could not generate the image."
        );
      }

      if (!data.image_url) {
        throw new Error(
          "The backend reported success but did not return an image URL."
        );
      }

      // The backend returns a relative path such as /image/example.png.
      const imageUrl = getFullUrl(data.image_url);
      const fileUrl = data.download_url
        ? getFullUrl(data.download_url)
        : imageUrl;

      // Check that the returned image can actually load.
      await new Promise((resolve, reject) => {
        const testImage = new Image();

        testImage.onload = () => resolve();
        testImage.onerror = () =>
          reject(
            new Error(
              "Image generation succeeded, but the image could not be loaded. Please check the backend image route."
            )
          );

        testImage.src = imageUrl;
      });

      setImage(imageUrl);
      setDownloadUrl(fileUrl);

      const newItem = {
        id: `${Date.now()}`,
        prompt: trimmedPrompt,
        image: imageUrl,
        downloadUrl: fileUrl,
        filename:
          data.filename || `prompt2pixel-${Date.now()}.png`,
        createdAt: new Date().toLocaleString(),
      };

      let oldItems = [];

      try {
        const stored = JSON.parse(
          localStorage.getItem(HISTORY_KEY) || "[]"
        );
        oldItems = Array.isArray(stored) ? stored : [];
      } catch {
        oldItems = [];
      }

      saveHistory([newItem, ...oldItems].slice(0, 10));
    } catch (err) {
      console.error("Image generation error:", err);

      setError(
        err.message ||
          "Something went wrong while generating your image. Please try again."
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

  function openHistory(item) {
    setPrompt(item.prompt);
    setImage(getFullUrl(item.image));
    setDownloadUrl(
      getFullUrl(item.downloadUrl || item.image)
    );
    setError("");
    setPage("home");
  }

  function deleteHistory(id) {
    saveHistory(history.filter((item) => item.id !== id));
  }

  function clearHistory() {
    if (!window.confirm("Clear all your saved images?")) return;

    setHistory([]);

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // History is already cleared in the current session.
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
          <span className="count">{history.length}</span>
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
            <p>Your imagination is the only limit.</p>
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
                    <div className="prompt-label-row">
                      <label htmlFor="prompt">
                        Describe your image
                      </label>
                      <span>{prompt.length}/1000</span>
                    </div>

                    <textarea
                      id="prompt"
                      maxLength={1000}
                      value={prompt}
                      onChange={(e) =>
                        setPrompt(e.target.value)
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
                      Your prompt will be sent to the connected
                      AI backend.
                    </div>
                  </form>

                  {error && (
                    <div className="error-box">{error}</div>
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
                        Your generated images will appear here.
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
                            onClick={() => openHistory(item)}
                          >
                            <img
                              src={getFullUrl(item.image)}
                              alt=""
                            />
                            <span className="recent-text">
                              <strong>{item.prompt}</strong>
                              <small>{item.createdAt}</small>
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
                    <span className="image-icon">▧</span>{" "}
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
                    image ? "has-image" : ""
                  }`}
                >
                  {loading ? (
                    <div className="preview-empty">
                      <span className="preview-symbol rotating">
                        ✦
                      </span>
                      <h3>Creating your image</h3>
                      <p>
                        Please wait while the AI creates your
                        artwork.
                      </p>
                    </div>
                  ) : image ? (
                    <img
                      src={image}
                      alt={prompt || "Generated artwork"}
                    />
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

                {image && !loading && (
                  <div className="image-actions">
                    <button
                      className="download-button"
                      onClick={() =>
                        downloadImage(
                          downloadUrl || image,
                          "prompt2pixel-image.png"
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
                    Revisit and download your previous creations.
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
                    Generate an image to start your collection.
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
                        onClick={() => openHistory(item)}
                      >
                        <img
                          src={getFullUrl(item.image)}
                          alt={item.prompt}
                        />
                      </button>

                      <div className="history-info">
                        <p>{item.prompt}</p>
                        <small>{item.createdAt}</small>

                        <div className="history-actions">
                          <button
                            onClick={() => openHistory(item)}
                          >
                            Open
                          </button>
                          <button
                            onClick={() =>
                              downloadImage(
                                getFullUrl(
                                  item.downloadUrl || item.image
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
