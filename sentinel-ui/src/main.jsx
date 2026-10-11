import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Uncaught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0d14',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px'
            }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred in the dashboard.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Route guard: show Login if no valid token, otherwise show Dashboard */
function AppGuard() {
  const { token } = useAuth();
  return token ? <App /> : <LoginPage />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppGuard />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
