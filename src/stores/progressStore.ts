import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

export type SectionId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface ProgressState {
  currentSection: SectionId;
  visitedSections: SectionId[];
  completedExercises: SectionId[];
  setCurrentSection: (section: SectionId) => void;
  markVisited: (section: SectionId) => void;
  markExerciseComplete: (section: SectionId) => void;
  resetProgress: () => void;
}

export const SECTIONS = [
  { id: 0, title: 'The Problem' },
  { id: 1, title: 'Cluster Basics' },
  { id: 2, title: 'Workloads' },
  { id: 3, title: 'Services' },
  { id: 4, title: 'Config and Access' },
  { id: 5, title: 'Storage' },
  { id: 6, title: 'Scheduling' },
  { id: 7, title: 'Reliability' },
  { id: 8, title: 'Control Plane' },
  { id: 9, title: 'Bonus Test' },
] as const;

export const LAYERS = SECTIONS;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentSection: 0,
      visitedSections: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      completedExercises: [],
      setCurrentSection: (section) => {
        if (get().currentSection === section) return;

        set({ currentSection: section });
        get().markVisited(section);
      },
      markVisited: (section) => {
        const existing = get().visitedSections;
        if (!existing.includes(section)) {
          set({ visitedSections: [...existing, section].sort((a, b) => a - b) });
        }
      },
      markExerciseComplete: (section) => {
        const completed = get().completedExercises;
        if (!completed.includes(section)) {
          set({ completedExercises: [...completed, section].sort((a, b) => a - b) });
        }
      },
      resetProgress: () => {
        set({ currentSection: 0, visitedSections: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], completedExercises: [] });
      },
    }),
    {
      name: 'k8s-tutorial-progress',
      version: 1,
    }
  )
);

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
