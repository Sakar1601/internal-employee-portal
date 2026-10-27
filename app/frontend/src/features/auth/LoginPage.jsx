import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isDemo, DEMO_CREDENTIALS } from "../../api";
import { useAuth } from "./auth";
import { DemoBanner } from "../demo/DemoBanner";
import { LogoMark } from "../../shared/ui/Logo";
import { ThemeToggle } from "../../shared/ui/ThemeToggle";
import { paths } from "../../paths";

export function LoginPage() {
  const [username, setUsername] = useState(isDemo ? DEMO_CREDENTIALS.username : "");
  const [password, setPassword] = useState(isDemo ? DEMO_CREDENTIALS.password : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { token, login } = useAuth();
  const navigate = useNavigate();

  if (token) return <Navigate to={paths.home} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(username, password);
      navigate(paths.home);
    } catch (err) {
      setError(err.status === 401 ? "Invalid username or password." : "Could not reach the server. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <DemoBanner />
      <main className="login-page">
        {!isDemo && (
          <div className="login-theme">
            <ThemeToggle />
          </div>
        )}
        <section className="login-intro" aria-hidden="false">
          <LogoMark size={48} />
          <p className="eyebrow">People registry</p>
          <h1>
            Who works here,
            <br />
            <em>and since when.</em>
          </h1>
          <p className="login-lede">
            The internal directory for a small, regulated company. Sign in to search, add and correct employee
            records.
          </p>
        </section>
        <form onSubmit={handleSubmit} className="login-panel">
          <h2>Sign in</h2>
          {isDemo && (
            <p className="login-hint">
              Demo credentials are prefilled. They only unlock the simulator in this tab; there is no real account.
            </p>
          )}
          <label>
            <span>Username</span>
            <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </>
  );
}
