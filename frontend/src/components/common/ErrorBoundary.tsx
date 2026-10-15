import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps { children: ReactNode }

export default class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  override render() {
    if (this.state.failed) {
      return (
        <main role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
          <h1 className="text-xl font-semibold">Sayfa görüntülenirken bir sorun oluştu</h1>
          <p>Lütfen sayfayı yeniden yükleyin.</p>
          <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={() => window.location.reload()}>Yeniden yükle</button>
        </main>
      );
    }
    return this.props.children;
  }
}
