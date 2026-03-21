import { Component } from 'react';
import { HiMusicalNote, HiExclamationTriangle } from 'react-icons/hi2';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <HiMusicalNote size={48} className="error-boundary-icon" />
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try reloading the page.</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message || 'Unknown error'}</pre>
          </details>
          <button
            className="btn-accent"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function InlineError({ message, onRetry }) {
  return (
    <div className="inline-error" role="alert">
      <HiExclamationTriangle size={18} className="inline-error-icon" />
      <span className="inline-error-message">{message}</span>
      {onRetry && (
        <button className="btn-ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
