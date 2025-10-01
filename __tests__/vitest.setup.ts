// vitest.setup.js
import { vi, beforeAll, afterAll } from "vitest";

// In your test setup or before a specific test:

beforeAll(() => {
  // Mock the URL object and its methods
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "mock-object-url"), // Return a dummy URL
    revokeObjectURL: vi.fn(),
  });

  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (url === "/api/chat") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ output_text: "Howdy Howdy Howdy!" }),
        });
      }
      if (url === "/api/upload") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ presignedUrls: ["http://test-bucket/mock-object-url"] }),
        });
      }
      // Default mock response for other URLs
      return Promise.resolve();
    })
  );
});

afterAll(() => {
  // Clean up the mocks after all tests
  vi.unstubAllGlobals();
});
