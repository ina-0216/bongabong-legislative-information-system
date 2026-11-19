import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches unhandled render errors so the app shows a
 * graceful fallback instead of a blank white screen.
 *
 * Wrap around any subtree that might throw. In production this prevents
 * total UI loss; in development it surfaces the error message clearly.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console so devs can see the full stack
    console.error('[ErrorBoundary] Caught a render error:', error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    // Hard reload as a last resort — clears any corrupt state
    window.location.href = '/dashboard';
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-background p-6"
      >
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={28} className="text-destructive" />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            An unexpected error occurred while loading this page. Your data is
            safe — try refreshing to continue.
          </p>

          {isDev && this.state.error && (
            <pre className="text-left text-[11px] bg-muted/60 border border-border rounded-lg p-3 mb-6 overflow-auto max-h-40 text-destructive font-mono whitespace-pre-wrap break-all">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}

          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw size={15} />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
