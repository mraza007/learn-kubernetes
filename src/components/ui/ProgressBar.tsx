'use client';

import { motion } from 'motion/react';
import { SECTIONS, SectionId, useHydrated, useProgressStore } from '@/stores/progressStore';
import { useCallback } from 'react';

export function ProgressBar() {
  const currentSection = useProgressStore((s) => s.currentSection);
  const completedExercises = useProgressStore((s) => s.completedExercises);
  const visitedSections = useProgressStore((s) => s.visitedSections);
  const hydrated = useHydrated();
  const scrollToSection = useCallback((id: SectionId) => {
    const element = document.getElementById(`section-${id}`);
    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'start',
    });
  }, []);

  if (!hydrated) return null;

  const completion = Math.round((completedExercises.length / SECTIONS.length) * 100);

  return (
    <motion.div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <div className="bg-surface/80 backdrop-blur-lg rounded-full px-6 py-3 border border-muted/30 shadow-lg">
        <div className="flex items-center gap-3">
          {SECTIONS.map((section, index) => {
            const isVisited = visitedSections.includes(section.id as SectionId);
            const isComplete = completedExercises.includes(section.id as SectionId);
            const isCurrent = currentSection === section.id;
            const isLast = index === SECTIONS.length - 1;

            return (
              <div key={section.id} className="flex items-center">
                {/* Dot */}
                <motion.button
                  onClick={() => isVisited && scrollToSection(section.id as SectionId)}
                  className={`relative group ${isVisited ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  whileHover={isVisited ? { scale: 1.2 } : {}}
                  whileTap={isVisited ? { scale: 0.9 } : {}}
                >
                  {/* Glow effect for current */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      animate={{
                        scale: [1, 1.8, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {/* Dot itself */}
                  <motion.div
                    className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                      isVisited
                        ? isCurrent
                          ? 'bg-primary shadow-[0_0_12px_rgba(45,212,191,0.6)]'
                          : isComplete
                            ? 'bg-primary/80'
                            : 'bg-primary/50'
                        : 'bg-muted/40 border border-muted/60'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.05, type: 'spring' }}
                  />

                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <motion.div
                      className="bg-terminal px-3 py-2 rounded-lg whitespace-nowrap text-xs border border-muted/30 shadow-xl"
                      initial={{ y: -5 }}
                      whileInView={{ y: 0 }}
                    >
                      <span className={isVisited ? 'text-primary' : 'text-muted'}>
                        {section.title}
                      </span>
                    </motion.div>
                    {/* Tooltip arrow */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-terminal border-l border-t border-muted/30 rotate-45" />
                  </div>
                </motion.button>

                {/* Connector line */}
                {!isLast && (
                  <div className="relative w-6 h-0.5 mx-1">
                    <div className="absolute inset-0 bg-muted/30 rounded-full" />
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: visitedSections.includes((section.id + 1) as SectionId) ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Progress percentage */}
          <motion.div
            className="ml-2 pl-3 border-l border-muted/30 text-xs font-mono tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span className="text-primary">{completion}</span>
            <span className="text-muted">%</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
