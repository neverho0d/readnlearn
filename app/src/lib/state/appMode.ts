import { create } from "zustand";

export type AppMode = "reading" | "dictionary" | "learning";

interface AppModeState {
    mode: AppMode;
    // eslint-disable-next-line no-unused-vars
    setMode: (m: AppMode) => void;
}

export const useAppMode = create<AppModeState>((set) => ({
    mode: (localStorage.getItem("readnlearn-mode") as AppMode) || "reading",
    setMode: (m) => {
        localStorage.setItem("readnlearn-mode", m);
        set({ mode: m });
    },
}));
