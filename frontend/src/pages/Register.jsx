import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';

const SPECIAL_CHARS = '!@#$%^&*(),.?":{}|<>';

function validateField(name, value, formValues) {
  switch (name) {
    case 'email':
      if (!value) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
      return '';
    case 'displayName':
      if (!value.trim()) return 'Display name is required';
      if (value.length > 100) return 'Display name must be 100 characters or less';
      return '';
    case 'password':
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (!/\d/.test(value)) return 'Password must contain at least 1 digit';
      if (!new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(value))
        return 'Password must contain at least 1 special character';
      return '';
    case 'confirmPassword':
      if (value !== formValues.password) return 'Passwords do not match';
      return '';
    default:
      return '';
  }
}

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const updated = { ...form, [name]: value };
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value, updated),
      }));

      if (name === 'password' && touched.confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: validateField('confirmPassword', updated.confirmPassword, updated),
        }));
      }
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, form),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const allErrors = {};
    for (const key of Object.keys(form)) {
      allErrors[key] = validateField(key, form[key], form);
    }
    setErrors(allErrors);
    setTouched({ email: true, displayName: true, password: true, confirmPassword: true });

    if (Object.values(allErrors).some(Boolean)) return;

    setSubmitting(true);

    try {
      await register(form.email, form.password, form.displayName);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        setServerError('Email is already registered');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function inputClass(name) {
    return `form-input${touched[name] && errors[name] ? ' input-error' : ''}`;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join SoundBoard and start discussing tracks</p>

        {serverError && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {serverError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className={inputClass('email')}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoFocus
              autoComplete="email"
            />
            {touched.email && errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="displayName" className="form-label">Display name</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              className={inputClass('displayName')}
              placeholder="Your name"
              value={form.displayName}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="name"
            />
            {touched.displayName && errors.displayName && (
              <span className="field-error">{errors.displayName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="form-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={inputClass('password')}
                placeholder="Min 8 chars, 1 digit, 1 special"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
            <div className="form-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={inputClass('confirmPassword')}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
