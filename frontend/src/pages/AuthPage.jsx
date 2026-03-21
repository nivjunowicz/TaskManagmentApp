import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk, registerThunk, clearError } from '../features/auth/authSlice';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,}$/;

function validate(tab, fields) {
  const errs = {};
  if (!fields.email.trim())          errs.email = 'Email is required';
  else if (!EMAIL_RE.test(fields.email)) errs.email = 'Invalid email format';
  if (!fields.password.trim())       errs.password = 'Password is required';
  else if (fields.password.length < 6) errs.password = 'Password must be at least 6 characters';

  if (tab === 'register') {
    if (!fields.fullName.trim())     errs.fullName = 'Full name is required';
    if (!fields.telephone.trim())    errs.telephone = 'Telephone is required';
    else if (!PHONE_RE.test(fields.telephone)) errs.telephone = 'Invalid phone number';
  }
  return errs;
}

export default function AuthPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);

  const [tab, setTab] = useState('login');
  const [fields, setFields] = useState({ email: '', password: '', fullName: '', telephone: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
    if (error) dispatch(clearError());
  };

  const switchTab = (t) => {
    setTab(t);
    setFieldErrors({});
    dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(tab, fields);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    if (tab === 'login') {
      dispatch(loginThunk({ email: fields.email, password: fields.password }));
    } else {
      dispatch(registerThunk({
        email: fields.email,
        password: fields.password,
        fullName: fields.fullName,
        telephone: fields.telephone,
      }));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand */}
        <h1 style={styles.brand}>TaskManager</h1>
        <p style={styles.subtitle}>
          {tab === 'login' ? 'Sign in to your workspace' : 'Create your account'}
        </p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
            onClick={() => switchTab('login')}
          >
            Login
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'register' ? styles.tabActive : {}) }}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        {/* API error */}
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {tab === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Jane Doe"
                  value={fields.fullName}
                  onChange={set('fullName')}
                  className={fieldErrors.fullName ? 'error' : ''}
                />
                {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="telephone">Telephone</label>
                <input
                  id="telephone"
                  type="tel"
                  placeholder="+1-234-567-8901"
                  value={fields.telephone}
                  onChange={set('telephone')}
                  className={fieldErrors.telephone ? 'error' : ''}
                />
                {fieldErrors.telephone && <span className="field-error">{fieldErrors.telephone}</span>}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={fields.email}
              onChange={set('email')}
              className={fieldErrors.email ? 'error' : ''}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={fields.password}
              onChange={set('password')}
              className={fieldErrors.password ? 'error' : ''}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchHint}>
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); switchTab(tab === 'login' ? 'register' : 'login'); }}>
            {tab === 'login' ? 'Register' : 'Login'}
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--bg-base)',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderTop: '4px solid var(--accent)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
  },
  brand: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '-0.5px',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '1.5rem',
    background: 'var(--bg-base)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px',
  },
  tab: {
    flex: 1,
    padding: '0.45rem',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '0.875rem',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  switchHint: {
    marginTop: '1.25rem',
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },
};
