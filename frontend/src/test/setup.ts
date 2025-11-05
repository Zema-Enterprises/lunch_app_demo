import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import './polyfills';
import { server } from './mocks/server';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);
expect.extend(toHaveNoViolations);

const reactRouterWarningRegex = /React Router Future Flag Warning/;
const originalConsoleWarn = console.warn;
let consoleWarnSpy: ReturnType<typeof vi.spyOn> | undefined;

// Start MSW server before all tests
beforeAll(() => {
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
    const [message] = args;
    if (typeof message === 'string' && reactRouterWarningRegex.test(message)) {
      return;
    }
    originalConsoleWarn(...args);
  });
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
  consoleWarnSpy?.mockRestore();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock scrollTo
window.scrollTo = vi.fn();
