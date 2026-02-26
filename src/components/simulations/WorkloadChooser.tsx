'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Boxes, Clock, Copy, Repeat, Database, ChevronRight, Check, X } from 'lucide-react';

interface Workload {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  useCase: string;
}

const WORKLOADS: Workload[] = [
  {
    name: 'Deployment',
    icon: <Copy className="w-5 h-5" />,
    color: 'primary',
    description: 'Manages stateless replicated pods with rolling updates and rollbacks.',
    useCase: 'Web servers, APIs, microservices',
  },
  {
    name: 'StatefulSet',
    icon: <Database className="w-5 h-5" />,
    color: 'secondary',
    description: 'Like Deployment but with stable network identity and persistent storage per pod.',
    useCase: 'Databases, distributed systems (Kafka, ZooKeeper)',
  },
  {
    name: 'DaemonSet',
    icon: <Boxes className="w-5 h-5" />,
    color: 'warning',
    description: 'Ensures exactly one pod runs on every (or selected) node in the cluster.',
    useCase: 'Log collectors, monitoring agents, node-level networking',
  },
  {
    name: 'Job',
    icon: <Clock className="w-5 h-5" />,
    color: 'danger',
    description: 'Runs a pod to completion, then stops. Retries on failure.',
    useCase: 'Database migrations, batch processing, one-time tasks',
  },
];

interface Scenario {
  description: string;
  answer: string;
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    description: 'Run a stateless web API with rolling updates and 3 replicas',
    answer: 'Deployment',
    hint: 'Stateless + replicas + rolling updates = the most common workload type.',
  },
  {
    description: 'Run one log collector on every node in the cluster',
    answer: 'DaemonSet',
    hint: 'Need exactly one pod per node? Only one workload type guarantees that.',
  },
  {
    description: 'Run a one-time database migration that must complete successfully',
    answer: 'Job',
    hint: 'This task runs once and exits. It is not a long-running service.',
  },
  {
    description: 'Run a PostgreSQL database needing stable network identity and persistent storage',
    answer: 'StatefulSet',
    hint: 'Stable hostnames (pod-0, pod-1) + persistent volumes = stateful workload.',
  },
  {
    description: 'Deploy a frontend React app served by nginx with auto-scaling',
    answer: 'Deployment',
    hint: 'Static files served by nginx are stateless — any replica can serve any request.',
  },
  {
    description: 'Run a Prometheus node exporter on every machine to collect metrics',
    answer: 'DaemonSet',
    hint: 'Collecting node-level metrics requires a pod on each and every node.',
  },
];

export function WorkloadChooser() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const scenario = SCENARIOS[scenarioIndex];
  const isCorrect = selected === scenario.answer;

  const handleSelect = (name: string) => {
    if (showResult) return;
    setSelected(name);
    setShowResult(true);
    setScore((prev) => ({
      correct: prev.correct + (name === scenario.answer ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const nextScenario = () => {
    setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
    setSelected(null);
    setShowResult(false);
  };

  const getColorClasses = (color: string, active: boolean) => {
    const map: Record<string, { border: string; bg: string; text: string }> = {
      primary: {
        border: active ? 'border-primary/60' : 'border-muted/30',
        bg: active ? 'bg-primary/15' : 'bg-background',
        text: active ? 'text-primary' : 'text-muted',
      },
      secondary: {
        border: active ? 'border-secondary/60' : 'border-muted/30',
        bg: active ? 'bg-secondary/15' : 'bg-background',
        text: active ? 'text-secondary' : 'text-muted',
      },
      warning: {
        border: active ? 'border-warning/60' : 'border-muted/30',
        bg: active ? 'bg-warning/15' : 'bg-background',
        text: active ? 'text-warning' : 'text-muted',
      },
      danger: {
        border: active ? 'border-danger/60' : 'border-muted/30',
        bg: active ? 'bg-danger/15' : 'bg-background',
        text: active ? 'text-danger' : 'text-muted',
      },
    };
    return map[color] || map.primary;
  };

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Pick the Right Workload</h3>
        <div className="text-xs font-mono text-muted">
          {score.correct}/{score.total} correct
        </div>
      </div>

      {/* Scenario */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scenarioIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border border-secondary/30 bg-secondary/5 p-4"
        >
          <div className="text-xs font-mono text-secondary mb-2 uppercase tracking-wide">
            Scenario {scenarioIndex + 1}/{SCENARIOS.length}
          </div>
          <p className="text-sm text-text">{scenario.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Workload Cards */}
      <div className="grid grid-cols-2 gap-3">
        {WORKLOADS.map((workload) => {
          const isAnswer = showResult && workload.name === scenario.answer;
          const isWrong = showResult && selected === workload.name && !isCorrect;
          const isSelected = selected === workload.name;
          const colors = getColorClasses(
            workload.color,
            isSelected || isAnswer,
          );

          return (
            <motion.button
              key={workload.name}
              onClick={() => handleSelect(workload.name)}
              disabled={showResult}
              whileHover={!showResult ? { scale: 1.02 } : {}}
              whileTap={!showResult ? { scale: 0.98 } : {}}
              className={`relative rounded-lg border-2 p-4 text-left transition-all duration-300 ${
                isAnswer
                  ? 'border-primary/60 bg-primary/15'
                  : isWrong
                    ? 'border-danger/60 bg-danger/10'
                    : colors.border + ' ' + colors.bg
              } ${showResult ? 'cursor-default' : 'cursor-pointer hover:border-muted/50'}`}
            >
              {/* Result indicator */}
              {isAnswer && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-background" />
                </motion.div>
              )}
              {isWrong && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-background" />
                </motion.div>
              )}

              <div className={`mb-2 ${isAnswer ? 'text-primary' : isWrong ? 'text-danger' : colors.text}`}>
                {workload.icon}
              </div>
              <div className={`font-mono text-sm font-semibold mb-1 ${isAnswer ? 'text-primary' : isWrong ? 'text-danger' : 'text-text'}`}>
                {workload.name}
              </div>
              <div className="text-xs text-muted leading-relaxed">{workload.description}</div>
              <div className="text-xs text-muted/70 mt-2 italic">{workload.useCase}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div
              className={`rounded-lg border p-3 text-sm ${
                isCorrect
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-warning/40 bg-warning/10 text-warning'
              }`}
            >
              {isCorrect ? (
                <span>Correct! {scenario.hint}</span>
              ) : (
                <span>
                  Not quite — the best fit is <strong>{scenario.answer}</strong>. {scenario.hint}
                </span>
              )}
            </div>

            <button
              onClick={nextScenario}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              Next scenario <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Educational insight */}
      <div className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed">
        <span className="text-primary font-semibold">Key insight:</span> The right workload type depends on whether your app is stateless or stateful,
        needs to run on every node, or is a one-time task. Most web apps use Deployments.
      </div>
    </div>
  );
}
