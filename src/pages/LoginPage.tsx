import { useState } from 'react';
import { useAuth } from '../auth';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username.trim(), password);
      navigate('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    } catch (err: any) {
      setError('Login failed');
    }
  }

  return (
    <div className="container auth-wrap">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
        {error && (
          <p className="danger" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        <p className="auth-meta">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
