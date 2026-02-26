'use client';

import { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { FadeIn, Terminal } from '@/components/ui';
import { DesiredStateSimulator } from '@/components/simulations';
import { AlertTriangle, RefreshCw, Skull, TrendingUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScenarioCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  question: string;
  scenario: string;
  consequence: string;
  color: 'danger' | 'warning' | 'secondary';
}

const SCENARIOS: ScenarioCard[] = [
  {
    id: 'crash',
    icon: <Skull className="w-6 h-6" />,
    title: 'Restart',
    question: 'Who restarts crashed containers?',
    scenario: 'Your container crashes at 3 AM. With Docker alone, it just stays dead.',
    consequence: 'Downtime until someone manually SSHs in and runs docker start.',
    color: 'danger',
  },
  {
    id: 'scale',
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Scale',
    question: 'Who spins up more replicas?',
    scenario: 'Traffic spikes 10x during a product launch. You need 20 copies, fast.',
    consequence: 'Manual SSH to each server, docker run on each one. Too slow.',
    color: 'warning',
  },
  {
    id: 'distribute',
    icon: <Users className="w-6 h-6" />,
    title: 'Distribute',
    question: 'Who spreads load across machines?',
    scenario: 'A host machine dies. All containers on it are gone.',
    consequence: 'You need to know which containers were there and restart them elsewhere.',
    color: 'secondary',
  },
];

const colorMap = {
  danger: { border: 'border-danger/50', bg: 'bg-danger/10', text: 'text-danger', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
  warning: { border: 'border-warning/50', bg: 'bg-warning/10', text: 'text-warning', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
  secondary: { border: 'border-secondary/50', bg: 'bg-secondary/10', text: 'text-secondary', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.15)]' },
};

export function Layer0Problem() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <section id="section-0" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            The <span className="text-danger">Problem</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Containers solve packaging, but not fleet-level operations.
          </p>
        </FadeIn>

        {/* Interactive scenario cards */}
        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-2">Why Containers Aren&apos;t Enough</h3>
                <p className="text-muted text-sm">
                  Containers solve packaging — your app, dependencies, and config travel together.
                  But what happens when things go wrong? <span className="text-primary">Click each scenario</span> to find out.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SCENARIOS.map((scenario) => {
                const colors = colorMap[scenario.color];
                const isExpanded = expandedCard === scenario.id;

                return (
                  <motion.button
                    key={scenario.id}
                    onClick={() => setExpandedCard(isExpanded ? null : scenario.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer ${
                      isExpanded
                        ? `${colors.border} ${colors.bg} ${colors.glow}`
                        : 'border-muted/30 bg-background hover:border-muted/50'
                    }`}
                  >
                    <div className={`mb-2 ${isExpanded ? colors.text : 'text-muted'}`}>
                      {scenario.icon}
                    </div>
                    <div className={`text-sm font-mono font-semibold mb-1 ${isExpanded ? colors.text : 'text-text'}`}>
                      {scenario.title}
                    </div>
                    <div className="text-xs text-muted">{scenario.question}</div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 pt-3 border-t border-muted/20 space-y-2"
                        >
                          <p className="text-xs text-text leading-relaxed">{scenario.scenario}</p>
                          <p className={`text-xs font-semibold ${colors.text}`}>{scenario.consequence}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Terminal */}
        <FadeIn delay={0.3} className="mb-16">
          <Terminal
            lines={[
              { type: 'command', content: 'docker run web:v1' },
              { type: 'output', content: 'container started on node-a', delay: 500 },
              { type: 'error', content: 'node-a failed. service now down.', delay: 800 },
              { type: 'error', content: 'no orchestrator. nobody restarts it.', delay: 400 },
              { type: 'command', content: '# what if a system could heal this automatically?', delay: 600 },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        {/* Desired State explanation — always visible */}
        <FadeIn delay={0.35} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-primary/30 shadow-[0_0_30px_rgba(45,212,191,0.08)]">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <motion.div
                  className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-7 h-7 text-primary" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Desired State: Declare, Don&apos;t Script</h3>
                <p className="text-muted mb-4">
                  Kubernetes flips the operational model. Instead of writing scripts to start, stop, and restart containers,
                  you <span className="text-primary">declare what you want</span>: &ldquo;I need 3 copies of this app, always running.&rdquo;
                  Kubernetes continuously compares <span className="text-primary">desired state</span> (stored in etcd) to
                  <span className="text-primary"> actual state</span> and reconciles any drift — forever.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'You declare', value: '"3 replicas, always"', color: 'text-primary' },
                    { label: 'K8s stores in', value: 'etcd (source of truth)', color: 'text-secondary' },
                    { label: 'K8s reconciles', value: 'desired → actual, forever', color: 'text-warning' },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className="bg-background rounded-lg p-3 text-center border border-muted/20"
                    >
                      <div className="text-xs text-muted mb-1">{step.label}</div>
                      <div className={`text-sm font-mono font-semibold ${step.color}`}>{step.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Interactive simulator — always visible */}
        <FadeIn delay={0.4} className="mb-8">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Watch the Reconciliation Loop
          </h3>
          <DesiredStateSimulator />
        </FadeIn>
      </div>
    </section>
  );
}
