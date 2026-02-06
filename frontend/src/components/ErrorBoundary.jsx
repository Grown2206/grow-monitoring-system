import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ThemeContext } from '../theme';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing
 */
class ErrorBoundary extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // You could also log to an error reporting service here
    this.setState({
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const theme = this.context?.currentTheme;

      // Fallback wenn ThemeContext nicht verfügbar (z.B. Error im ThemeProvider selbst)
      if (!theme) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8" style={{ backgroundColor: '#0f172a' }}>
            <AlertTriangle size={64} className="mb-4" style={{ color: '#ef4444' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>Etwas ist schief gelaufen</h2>
            <p className="mb-6 text-center max-w-md" style={{ color: '#94a3b8' }}>
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
            </p>
            <div className="flex gap-4">
              <button onClick={this.handleReset} className="px-6 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#334155', color: '#ffffff' }}>
                Erneut versuchen
              </button>
              <button onClick={this.handleReload} className="px-6 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
                Seite neu laden
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8" style={{ backgroundColor: theme.bg.main }}>
          <AlertTriangle size={64} className="mb-4" style={{ color: '#ef4444' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>Etwas ist schief gelaufen</h2>
          <p className="mb-6 text-center max-w-md" style={{ color: theme.text.muted }}>
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
          </p>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mb-6 max-w-2xl w-full">
              <summary className="cursor-pointer text-sm mb-2" style={{ color: theme.text.muted }}>
                Error Details (Development Only)
              </summary>
              <pre className="text-xs p-4 rounded overflow-auto max-h-60" style={{ backgroundColor: theme.bg.card, color: theme.text.secondary }}>
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: theme.bg.hover, color: theme.text.primary }}
            >
              Erneut versuchen
            </button>
            <button
              onClick={this.handleReload}
              className="px-6 py-2 rounded-lg transition-colors text-white"
              style={{ backgroundColor: theme.accent.color }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
