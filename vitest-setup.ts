/// <reference types="vitest/globals" />
import "@testing-library/jest-dom/vitest";
// Replaces IntersectionObserver with a controllable mock (see mockAllIsIntersecting)
import "react-intersection-observer/test-utils";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

class ResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Server-side tests opt into the node environment (`// @vitest-environment node`), which has no window
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserver,
  });

  // jsdom does not implement media playback
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    writable: true,
    value: vi.fn(),
  });
}

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));
