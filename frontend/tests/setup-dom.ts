// jsdom has no ResizeObserver; Headless UI uses it to place open lists (the shared Select).
// Tests that measure layout stub their own; this keeps every other screen test working.
if (typeof window !== 'undefined' && !('ResizeObserver' in window))
  Object.assign(window, {
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
