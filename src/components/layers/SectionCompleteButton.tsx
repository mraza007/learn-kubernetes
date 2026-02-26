'use client';

import { Check } from 'lucide-react';
import { SectionId, useProgressStore } from '@/stores/progressStore';

interface SectionCompleteButtonProps {
  sectionId: SectionId;
}

export function SectionCompleteButton({ sectionId }: SectionCompleteButtonProps) {
  const completedExercises = useProgressStore((s) => s.completedExercises);
  const markExerciseComplete = useProgressStore((s) => s.markExerciseComplete);
  const complete = completedExercises.includes(sectionId);

  return (
    <div className="mt-6">
      <button
        onClick={() => markExerciseComplete(sectionId)}
        className={`mt-4 rounded-lg px-6 py-3 text-sm font-mono border transition-all duration-300 inline-flex items-center gap-2 ${
          complete
            ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_15px_rgba(45,212,191,0.15)]'
            : 'border-muted/30 text-muted hover:text-text hover:border-primary/30'
        }`}
      >
        {complete && <Check className="w-4 h-4" />}
        {complete ? 'Exercise completed' : 'Mark exercise complete'}
      </button>
    </div>
  );
}
