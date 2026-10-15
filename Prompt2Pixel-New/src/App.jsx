
import { useState } from "react";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function goTo(nextPage) {
    setError("");
    setPage(nextPage);
  }

  function login(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    // Demo only. Real authentication will be added later.
    goTo("generate");
  }

  function signup(e) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("Frontend demo only. Account creation will be enabled after backend integration.");
  }

  function resetPassword(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("Password reset will be enabled after backend integration.");
  }

  function logout() {
    setPage("login");
    setPassword("");
    setConfirmPassword("");
    setPrompt("");
    setImage("");
    setError("");
  }

  async function generateImage(e) {
    e.preventDefault();
    setError("");

    if (!prompt.trim()) {
      setError("Please describe the image you want.");
      return;
    }

    setError("Image generation will be connected after the backend is ready.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand brand-button" onClick={() => goTo("login")}>
          <span className="brand-icon">✦</span>
          <span>
            <h2>Prompt2Pixel</h2>
            <p>AI Image Generator</p>
          </span>
        </button>

        {page === "generate" && (
          <button className="logout" onClick={logout}>
            Log out
          </button>
        )}

        {(page === "login" || page === "signup") && (
          <button
            className="header-link"
            onClick={() => goTo(page === "login" ? "signup" : "login")}
          >
            {page === "login" ? "Create account" : "Sign in"}
          </button>
        )}
      </header>

      {page === "login" && (
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

            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="text-link forgot-link"
              onClick={() => goTo("forgot")}
            >
              Forgot password?
            </button>

            {error && <p className="error">{error}</p>}

            <button className="primary-button" type="submit">
              Sign in <span>→</span>
            </button>

            <p className="switch-text">
              Don't have an account?{" "}
              <button type="button" className="text-link" onClick={() => goTo("signup")}>
                Create account
              </button>
            </p>
          </form>
        </main>
      )}

      {page === "signup" && (
        <main className="auth-layout">
          <form className="login-card signup-card" onSubmit={signup}>
            <span className="card-icon">✦</span>
            <span className="eyebrow">START CREATING TODAY</span>
            <h2>Create your account</h2>
            <p className="muted">Join Prompt2Pixel and explore your creativity.</p>

            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Enter your password again"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button className="primary-button" type="submit">
              Create account <span>→</span>
            </button>

            <p className="switch-text">
              Already have an account?{" "}
              <button type="button" className="text-link" onClick={() => goTo("login")}>
                Sign in
              </button>
            </p>
          </form>
        </main>
      )}

      {page === "forgot" && (
        <main className="auth-layout">
          <form className="login-card" onSubmit={resetPassword}>
            <span className="card-icon">✦</span>
            <h2>Forgot password?</h2>
            <p className="muted">
              Enter your email address to start the password reset process.
            </p>

            <label htmlFor="reset-email">Email address</label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button className="primary-button" type="submit">
              Reset password →
            </button>

            <p className="switch-text">
              Remember your password?{" "}
              <button type="button" className="text-link" onClick={() => goTo("login")}>
                Back to login
              </button>
            </p>
          </form>
        </main>
      )}

      {page === "generate" && (
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

              <div className="character-count">{prompt.length}/500</div>

              {error && <p className="error">{error}</p>}

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Generating..." : "✧ Generate Image →"}
              </button>
            </form>

            <section className="panel preview-panel">
              <h2>▧ Image Preview</h2>
              <div className="image-area">
                {image ? (
                  <img src={image} alt="Generated artwork" />
                ) : (
                  <div className="empty-preview">
                    <span>✧</span>
                    <h3>Your canvas awaits</h3>
                    <p>Your generated image will appear here.</p>
                  </div>
                )}
              </div>

              {image && (
                <a className="download-button" href={image} download="prompt2pixel-image.png">
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
