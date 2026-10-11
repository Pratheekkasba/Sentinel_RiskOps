import { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode]         = useState('login');   // 'login' | 'register'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (fullName.trim().length < 2) {
          setError('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        await register(email, password, fullName, 'ANALYST');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setEmail('');
    setPassword('');
    setFullName('');
  };

  return (
    <div className="login-shell">
      {/* Animated background blobs */}
      <div className="login-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="login-brand">sentinel</h1>
            <p className="login-brand-sub">AI Risk Manager</p>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p>{mode === 'login'
            ? 'Sign in to your analyst workspace'
            : 'Join the Sentinel risk operations team'}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="login-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* Full name — register only */}
          {mode === 'register' && (
            <div className="login-field">
              <label htmlFor="fullName">Full name</label>
              <div className="login-input-wrap">
                <input
                  id="fullName"
                  type="text"
                  placeholder="Pratheek Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={16} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="analyst@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit"
            disabled={isLoading}
          >
            {isLoading
              ? <><Loader size={16} className="spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login' ? 'Sign in' : 'Create account'
            }
          </button>
        </form>

        {/* Toggle */}
        <p className="login-toggle">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" onClick={toggle}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>

        {/* Footer */}
        <div className="login-footer">
          <span className="live-indicator"><span /> Sentinel Risk Engine · Live</span>
        </div>
      </div>
    </div>
  );
}
