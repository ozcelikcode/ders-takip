import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ErrorBoundary', () => {
  it('keeps healthy application content visible', () => {
    render(<ErrorBoundary><p>Çalışma planı</p></ErrorBoundary>);
    expect(screen.getByText('Çalışma planı')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('provides recovery when a child crashes without exposing internal details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenPage(): never { throw new Error('private diagnostic details'); }
    const handleExpectedError = (event: ErrorEvent) => {
      if (event.error instanceof Error && event.error.message === 'private diagnostic details') event.preventDefault();
    };
    window.addEventListener('error', handleExpectedError);
    try { render(<ErrorBoundary><BrokenPage /></ErrorBoundary>); }
    finally { window.removeEventListener('error', handleExpectedError); }
    expect(screen.getByRole('alert').textContent).toContain('Sayfa görüntülenirken bir sorun oluştu');
    expect(screen.getByRole('button', { name: 'Yeniden yükle' })).toBeTruthy();
    expect(screen.queryByText('private diagnostic details')).toBeNull();
  });
});
