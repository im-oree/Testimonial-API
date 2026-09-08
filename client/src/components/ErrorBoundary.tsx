/** Error boundary + role-aware full-page error screens (with safe CTAs). */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from './ui';

/** Role-aware copy: names the scope + sub-role so "back home" always makes sense. */
function roleLine(): string | null {
  const { status, kind, user } = useAuth();
  if (status !== 'signedIn' || !user) return null;
  const role = user.role.replace('_', ' ');
  if (kind === 'platform') {
    return `Signed in as platform ${role} — this is the Zojatech super-company console.`;
  }
  return `Signed in as ${role} on your tenant workspace.`;
}

/** Picks the right "home" depending on who's signed in and where they belong. */
function useHomePath(): string {
  const { status, kind } = useAuth();
  if (status !== 'signedIn') return '/login';
  return kind === 'platform' ? '/platform/overview' : '/app/overview';
}

export function ErrorScreen({ title = 'Something went wrong', message }: { title?: string; message?: string }) {
  const { status } = useAuth();
  const role = roleLine();
  const home = useHomePath();
  const navigate = useNavigate();

  return (
    <div className="error-page" role="alert">
      <div className="error-icon">!</div>
      <h1>{title}</h1>
      <p className="muted">{message || 'An unexpected error happened while loading this page.'}</p>
      {role ? <p className="muted small">{role} Use the button below to get back to your home screen.</p> : (
        <p className="muted small">If the problem continues, sign out and back in — the demo runs on an in-memory engine.</p>
      )}
      <div className="error-actions">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Go back
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        {status === 'signedIn' ? (
          <Link className="btn btn-primary" to={home}>
            Go to my dashboard →
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/login">
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
}

export function NotFoundScreen({ title = 'Page not found' }: { title?: string }) {
  const { status } = useAuth();
  const role = roleLine();
  const home = useHomePath();
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1>{title}</h1>
      <p className="muted">The page you tried to open does not exist (or you don’t have access to it).</p>
      {role && <p className="muted small">{role} We’ve pointed the button below at the right home for you.</p>}
      <div className="error-actions">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Go back
        </Button>
        {status === 'signedIn' ? (
          <Link className="btn btn-primary" to={home}>
            Go to my dashboard →
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/login">
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  resetKey?: unknown;
  fallbackTitle?: string;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors in a subtree and shows a role-aware error
 * screen instead of freezing to a white page. Resets when resetKey changes
 * (e.g. navigating to another page).
 */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  componentDidUpdate(prevProps: BoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorScreen title={this.props.fallbackTitle ?? 'Something went wrong'} message={this.state.error.message} />;
    }
    return this.props.children;
  }
}
