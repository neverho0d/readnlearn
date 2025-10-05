import "@testing-library/jest-dom/vitest";

// JSDOM does not implement scrollIntoView; stub to avoid errors in components
Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
  value: () => {},
  writable: true,
});

// Clean up localStorage between tests to avoid cross-test pollution
beforeEach(() => {
  localStorage.clear();
  // Stub alert for components that use it
  // @ts-expect-error test env stub
  globalThis.alert = vi.fn();
});

// Note: MSW is not used yet; add it here when network tests are introduced
