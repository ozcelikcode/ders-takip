import { Component, type ReactNode } from 'react';
import { useLanguageStore } from '../../store/languageStore';

interface ErrorBoundaryProps { children: ReactNode }

export default class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  override render() {
    if (this.state.failed) {
      // A class component cannot use hooks; the current catalog is read once for the fallback.
      const text = useLanguageStore.getState().text.shell;
      return (
        <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-(--canvas) p-6 text-center text-(--text)">
          <h1 className="text-lg font-medium">{text.errorTitle}</h1>
          <p className="text-sm text-(--muted)">{text.errorHint}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{text.reload}</button>
        </main>
      );
    }
    return this.props.children;
  }
}
