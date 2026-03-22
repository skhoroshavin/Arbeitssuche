import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  window.electronAPI = { invoke: async () => undefined } as never;
}
