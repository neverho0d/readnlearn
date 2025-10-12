import { vi } from "vitest";

// Mock for phraseStore to prevent database initialization
export const ensureDb = vi.fn().mockResolvedValue(undefined);

// Re-export all other functions from the actual module
export * from "../phraseStore";
