'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SECTIONS, SectionId, useHydrated, useProgressStore } from '@/stores/progressStore';

export function ScrollTracker() {
  const hydrated = useHydrated();
  const setCurrentSection = useProgressStore((s) => s.setCurrentSection);
  const rafId = useRef<number | null>(null);

  const updateCurrentSection = useCallback(() => {
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const section = SECTIONS[i];
      const el = document.getElementById(`section-${section.id}`);
      if (!el) continue;

      const top = el.getBoundingClientRect().top + window.scrollY;
      const pivot = window.scrollY + window.innerHeight / 3;
      if (pivot >= top) {
        setCurrentSection(section.id as SectionId);
        return;
      }
    }
  }, [setCurrentSection]);

  useEffect(() => {
    if (!hydrated) return;

    const onScroll = () => {
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        updateCurrentSection();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateCurrentSection();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [hydrated, updateCurrentSection]);

  return null;
}
