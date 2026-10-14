
import { useState } from "react";
import "./App.css";

const styles = ["Realistic", "Anime", "3D", "Fantasy"];
const ratios = ["1:1", "4:5", "16:9"];

const samples = [
  {
    title: "A magical castle beside a lake",
    style: "Fantasy",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900",
  },
  {
    title: "A futuristic city at night",
    style: "Realistic",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900",
  },
  {
    title: "A beautiful mountain landscape",
    style: "Realistic",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900",
  },
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Realistic");
  const [ratio, setRatio] = useState("1:1");
  const [activePage, setActivePage] = useState("Generate");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      alert("Please describe the image you want to create.");
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    try {
      // Demo mode: real backend connection will be added later.
      await new Promise((resolve) => setTimeout(resolve, 700));

      const demoImage = samples[history.length % samples.length];

      const result = {
        ...demoImage,
        title: prompt.trim(),
        style,
        ratio,
      };

      setGeneratedImage(result);
      setHistory((previous) => [result, ...previous]);
    } finally {
      setLoading(false);
    }
  }

  function saveFavorite(image) {
    setFavorites((previous) =>
      previous.some((item) => item.title === image.title)
        ? previous
        : [image, ...previous]
    );
  }

  function downloadImage(image) {
    const link = document.createElement("a");
    link.href = image.image;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  }

  const currentImage = generatedImage || samples[0];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <div>
            <h2>Prompt2<span>Pixel</span></h2>
            <p>AI Image Generator</p>
          </div>
        </div>

        <nav>
          {["Generate", "History", "Favorites"].map((item) => (
            <button
              key={item}
              className={`nav-item ${activePage === item ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              <span>
                {item === "Generate"
                  ? "✧"
                  : item === "History"
                    ? "◷"
                    : "♡"}
              </span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>✦</span>
          <h3>Create. Explore.</h3>
          <p>Bring your imagination to life.</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Turn your imagination into stunning visuals ✨</h1>
            <p>Describe your dream image and let AI bring it to life.</p>
          </div>
          <div className="avatar">P</div>
        </header>

        {activePage === "Generate" && (
          <>
            <section className="workspace">
              <div className="panel creator">
                <h2>✧ Create Your Image</h2>

                <label htmlFor="prompt">Your prompt</label>
                <textarea
                  id="prompt"
                  maxLength={500}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the image you want to create..."
                />
                <div className="character-count">{prompt.length}/500</div>

                <h3 className="field-title">Choose a style</h3>
                <div className="style-grid">
                  {styles.map((item, index) => (
                    <button
                      key={item}
                      className={`style-option ${style === item ? "selected" : ""}`}
                      onClick={() => setStyle(item)}
                    >
                      <span className="style-emoji">
                        {["🏞️", "🎨", "🧊", "🏰"][index]}
                      </span>
                      {item}
                    </button>
                  ))}
                </div>

                <h3 className="field-title">Aspect ratio</h3>
                <div className="ratio-grid">
                  {ratios.map((item) => (
                    <button
                      key={item}
                      className={`ratio-option ${ratio === item ? "selected" : ""}`}
                      onClick={() => setRatio(item)}
                    >
                      <strong>{item}</strong>
                      <small>
                        {item === "1:1"
                          ? "Square"
                          : item === "4:5"
                            ? "Portrait"
                            : "Landscape"}
                      </small>
                    </button>
                  ))}
                </div>

                <button
                  className="generate-button"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? "Creating preview..." : "✧ Generate Image →"}
                </button>
                <p className="demo-note">
                  Demo mode · Real AI generation will be connected later
                </p>
              </div>

              <div className="panel preview-panel">
                <h2>▧ {generatedImage ? "Generated Preview" : "Image Preview"}</h2>
                <img
                  className="preview-image"
                  src={currentImage.image}
                  alt={currentImage.title}
                />
                <p className="preview-caption">
                  {generatedImage
                    ? generatedImage.title
                    : "Your generated image will appear here."}
                </p>
                <div className="preview-actions">
                  <button
                    className="download-button"
                    onClick={() => downloadImage(currentImage)}
                  >
                    ↓ Open / Download
                  </button>
                  <button
                    className="save-button"
                    onClick={() => saveFavorite(currentImage)}
                  >
                    ♡ Save to Favorites
                  </button>
                </div>
              </div>
            </section>

            <section className="panel recent-panel">
              <div className="section-heading">
                <h2>◷ Recent Generations</h2>
                <button onClick={() => setActivePage("History")}>
                  View all →
                </button>
              </div>

              <div className="recent-grid">
                {(history.length ? history : samples).map((image, index) => (
                  <button
                    className="recent-card"
                    key={`${image.title}-${index}`}
                    onClick={() => setGeneratedImage(image)}
                  >
                    <img src={image.image} alt={image.title} />
                    <strong>{image.title}</strong>
                    <span>{image.style}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activePage === "History" && (
          <section className="panel page-panel">
            <h2>Generation History</h2>
            {history.length === 0 ? (
              <p>Your generated previews will appear here.</p>
            ) : (
              <div className="recent-grid">
                {history.map((image, index) => (
                  <button
                    className="recent-card"
                    key={`${image.title}-${index}`}
                    onClick={() => {
                      setGeneratedImage(image);
                      setActivePage("Generate");
                    }}
                  >
                    <img src={image.image} alt={image.title} />
                    <strong>{image.title}</strong>
                    <span>{image.style}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "Favorites" && (
          <section className="panel page-panel">
            <h2>Your Favorites</h2>
            {favorites.length === 0 ? (
              <p>Save a preview to see it here.</p>
            ) : (
              <div className="recent-grid">
                {favorites.map((image, index) => (
                  <button
                    className="recent-card"
                    key={`${image.title}-${index}`}
                    onClick={() => {
                      setGeneratedImage(image);
                      setActivePage("Generate");
                    }}
                  >
                    <img src={image.image} alt={image.title} />
                    <strong>{image.title}</strong>
                    <span>{image.style}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <footer>Prompt2Pixel · Built with React</footer>
      </main>
    </div>
  );
}
