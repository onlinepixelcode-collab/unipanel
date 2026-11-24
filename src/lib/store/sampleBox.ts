"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const SAMPLE_LIMIT = 8;

interface SampleBoxState {
  ids: string[];
  add: (ids: string | string[]) => { added: string[]; skipped: string[] };
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useSampleBox = create<SampleBoxState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (input) => {
        const list = Array.isArray(input) ? input : [input];
        const cur = [...get().ids];
        const added: string[] = [];
        const skipped: string[] = [];
        for (const id of list) {
          if (cur.includes(id)) continue;
          if (cur.length >= SAMPLE_LIMIT) {
            skipped.push(id);
            continue;
          }
          cur.push(id);
          added.push(id);
        }
        set({ ids: cur });
        return { added, skipped };
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
    }),
    { name: "unipanel-sample-box", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
