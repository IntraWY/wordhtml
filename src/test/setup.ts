import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/** Prevent tippy.js from touching DOM layout APIs missing in jsdom (variable suggestion tests). */
vi.mock("tippy.js", () => {
  const instance = {
    destroy: vi.fn(),
    setProps: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
  };
  return {
    default: vi.fn(() => [instance]),
  };
});
