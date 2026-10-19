import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps { children: ReactNode }

export default class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  override render() {
    if (this.state.failed) {
      return (
        <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--canvas)] p-6 text-center text-[var(--text)]">
          <h1 className="text-lg font-medium">Sayfa görüntülenirken bir sorun oluştu</h1>
          <p className="text-sm text-[var(--muted)]">Lütfen sayfayı yeniden yükleyin.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Yeniden yükle</button>
        </main>
      );
    }
    return this.props.children;
  }
}
