// vitest.setup.js
import { vi, beforeAll, afterAll } from "vitest";

beforeAll(() => {
  // Mock the URL object and its methods
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "mock-object-url"), // Return a dummy URL
    revokeObjectURL: vi.fn(),
  });
});

afterAll(() => {
  // Clean up the mocks after all tests
  vi.unstubAllGlobals();
});
