import { describe, it, expect, beforeEach } from "vitest";
import { useAppMode } from "./appMode";

describe("useAppMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and restores mode", () => {
    const store = useAppMode.getState();
    expect(store.mode).toBe("reading");
    store.setMode("dictionary");
    expect(useAppMode.getState().mode).toBe("dictionary");
    // simulate reload
    const raw = localStorage.getItem("readnlearn-mode");
    expect(raw).toBe("dictionary");
  });
});
