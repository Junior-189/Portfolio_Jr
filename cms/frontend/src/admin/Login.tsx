import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, ApiError } from "./api";
import "./admin.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm">
      <div className="adm-login-wrap">
        <div className="adm-login-box">
          <h1>PORTFOLIO CMS — LOGIN</h1>
          <form onSubmit={onSubmit}>
            <div className="adm-field" style={{ marginBottom: 14 }}>
              <label htmlFor="u">Username</label>
              <input id="u" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div className="adm-field">
              <label htmlFor="p">Password</label>
              <input id="p" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <p className="adm-error">{error}</p>}
            <button type="submit" className="adm-btn primary" style={{ width: "100%", marginTop: 18 }} disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="adm-hint">
            Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD in the backend's .env, set on first run via `npm run seed`. See /backend/README.
          </p>
        </div>
      </div>
    </div>
  );
}
