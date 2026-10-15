
import { useState } from "react";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function login(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    // Temporary frontend demo login.
    // Replace with real authentication later.
    setPage("generate");
  }

  function logout() {
    setPage("login");
    setPassword("");
    setPrompt("");
    setImage("");
    setError("");
  }

  async function generateImage(e) {
    e.preventDefault();

    if (!prompt.trim()) {
      setError("Please describe the image you want.");
      return;
    }

    setError(
      "Image generation will be connected when your backend is ready."
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <div>
            <h2>Prompt2Pixel</h2>
            <p>AI Image Generator</p>
          </div>
        </div>

        {page === "generate" && (
          <button className="logout" onClick={logout}>
            Log out
          </button>
        )}
      </header>

      {page === "login" ? (
        <main className="login-layout">
          <section className="welcome">
            <span className="eyebrow">YOUR IMAGINATION, REIMAGINED</span>
            <h1>Turn your ideas into stunning visuals.</h1>
            <p>
              Describe your dream image and bring your creativity to life
              with Prompt2Pixel.
            </p>
            <div className="sparkle">✦</div>
          </section>

          <form className="login-card" onSubmit={login}>
            <span className="card-icon">✦</span>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to continue creating.</p>

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button className="primary-button" type="submit">
              Sign in <span>→</span>
            </button>

            <p className="small-note">
              New to Prompt2Pixel? Create an account feature can be
              added with backend authentication.
            </p>
          </form>
        </main>
      ) : (
        <main className="generator">
          <section className="page-heading">
            <span className="eyebrow">AI IMAGE STUDIO</span>
            <h1>Turn your imagination into stunning visuals ✨</h1>
            <p>Describe your dream image and let AI bring it to life.</p>
          </section>

          <div className="workspace">
            <form className="panel prompt-panel" onSubmit={generateImage}>
              <h2>✧ Create Your Image</h2>

              <label htmlFor="prompt">Your prompt</label>
              <textarea
                id="prompt"
                rows="7"
                maxLength={500}
                placeholder="A magical castle surrounded by misty mountains..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError("");
                }}
              />

              <div className="character-count">
                {prompt.length}/500
              </div>

              {error && <p className="error">{error}</p>}

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Generating..." : "✧ Generate Image →"}
              </button>
            </form>

            <section className="panel preview-panel">
              <h2>▧ Image Preview</h2>

              <div className="image-area">
                {image ? (
                  <img src={image} alt="Your generated artwork" />
                ) : (
                  <div className="empty-preview">
                    <span>✧</span>
                    <h3>Your canvas awaits</h3>
                    <p>Your generated image will appear here.</p>
                  </div>
                )}
              </div>

              {image && (
                <a
                  className="download-button"
                  href={image}
                  download="prompt2pixel-image.png"
                >
                  Download image ↓
                </a>
              )}
            </section>
          </div>
        </main>
      )}

      <footer>© 2026 Prompt2Pixel · Create something extraordinary</footer>
    </div>
  );
}
