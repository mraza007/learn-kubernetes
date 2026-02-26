'use client';

import { FadeIn } from '@/components/ui';
import { BonusAssessment } from '@/components/simulations';
import { useProgressStore } from '@/stores/progressStore';

export function Layer9Bonus() {
  const markExerciseComplete = useProgressStore((s) => s.markExerciseComplete);

  return (
    <section id="section-9" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            Bonus: <span className="text-primary">Knowledge Check</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Test your Kubernetes understanding with mixed-format questions. Feedback only, no scores.
          </p>
        </FadeIn>

        <FadeIn delay={0.3} className="mb-8">
          <BonusAssessment onComplete={() => markExerciseComplete(9)} />
        </FadeIn>
      </div>
    </section>
  );
}
