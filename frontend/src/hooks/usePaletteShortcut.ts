import { useEffect } from 'react';

/**
 * Ctrl+K (⌘K on a Mac) toggles the page switcher. It stays shut while another dialog is open, so it never navigates
 * away from a form someone is filling in. Kept apart from the palette so the palette itself can load on first use.
 */
export function usePaletteShortcut(open: boolean, onOpenChange: (open: boolean) => void) {
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (!open && document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, [open, onOpenChange]);
}
