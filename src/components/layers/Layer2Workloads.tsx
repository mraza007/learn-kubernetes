'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { WorkloadChooser } from '@/components/simulations';
import { Boxes, Clock, Copy, Check, Repeat, Database } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'deployment',
    icon: <Copy className="w-5 h-5" />,
    label: 'Deployment',
    summary: 'Stateless apps with rolling updates',
    detail:
      'The most common controller. Manages a ReplicaSet under the hood and handles rolling updates so new pods come up before old ones go down. Use it for any app that does not need stable network identity or persistent disk per replica.',
    color: 'primary',
  },
  {
    id: 'statefulset',
    icon: <Database className="w-5 h-5" />,
    label: 'StatefulSet',
    summary: 'Stable IDs and ordered startup',
    detail:
      'Each pod gets a sticky, predictable name (e.g. postgres-0, postgres-1) and its own PersistentVolumeClaim. Pods start and stop in order, which databases and clustered systems depend on. Do not use it just because you have a database—only if the app needs stable identity.',
    color: 'secondary',
  },
  {
    id: 'daemonset',
    icon: <Repeat className="w-5 h-5" />,
    label: 'DaemonSet',
    summary: 'One pod per node',
    detail:
      'Ensures exactly one pod runs on every node (or a filtered subset). Used for cluster-wide infrastructure like log shippers, metrics agents, or CNI plugins. When a new node joins the cluster, the DaemonSet pod is placed automatically.',
    color: 'warning',
  },
  {
    id: 'job',
    icon: <Clock className="w-5 h-5" />,
    label: 'Job',
    summary: 'Run to completion',
    detail:
      'Runs one or more pods until a specified number complete successfully. Ideal for batch processing, migrations, or any task that has a defined end. CronJob wraps a Job with a schedule, replacing cron for containerized workloads.',
    color: 'primary',
  },
];

const COMMANDS = [
  { comment: '# Create a deployment', cmd: 'kubectl create deployment web --image=nginx --replicas=3' },
  { comment: '# Check rollout status', cmd: 'kubectl rollout status deploy/web' },
  { comment: '# Scale up or down', cmd: 'kubectl scale deploy/web --replicas=5' },
];

export function Layer2Workloads() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopiedTimeout = () => {
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(cmd);
    clearCopiedTimeout();
    copiedTimeoutRef.current = setTimeout(() => setCopiedCmd(null), 2000);
  };

  useEffect(() => {
    return clearCopiedTimeout;
  }, []);

  const selected = COMPONENTS.find((c) => c.id === selectedComponent);

  return (
    <section id="section-2" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            Pods, Deployments, and <span className="text-secondary">Workloads</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Pick the right controller for each workload shape.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Boxes className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Choosing the Right Controller</h3>
                <p className="text-muted mb-4">
                  You rarely create individual pods. Instead, you tell a <span className="text-primary">controller</span> what
                  you need, and it manages pods for you. Each controller type handles a different workload shape.
                  Pick the wrong one and you fight the system; pick the right one and Kubernetes handles the hard parts.{' '}
                  <span className="text-primary">Click each card</span> to learn when to use it.
                </p>
              </div>
            </div>

            {/* Interactive component cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {COMPONENTS.map((comp) => {
                const isSelected = selectedComponent === comp.id;
                return (
                  <motion.button
                    key={comp.id}
                    onClick={() => setSelectedComponent(isSelected ? null : comp.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`rounded-lg p-3 text-center border-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? `border-${comp.color}/50 bg-${comp.color}/10 shadow-[0_0_15px_rgba(45,212,191,0.1)]`
                        : 'border-muted/20 bg-background hover:border-muted/40'
                    }`}
                  >
                    <div className={`mx-auto mb-1 flex justify-center ${isSelected ? `text-${comp.color}` : 'text-muted'}`}>
                      {comp.icon}
                    </div>
                    <div className="text-sm font-mono text-text">{comp.label}</div>
                    <div className="text-xs text-muted mt-0.5">{comp.summary}</div>
                  </motion.button>
                );
              })}
            </div>

            {/* Expanded detail panel */}
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-lg border border-${selected.color}/30 bg-${selected.color}/5 p-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-${selected.color}`}>{selected.icon}</span>
                    <span className="font-mono font-semibold text-text">{selected.label}</span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{selected.detail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>

        <FadeIn delay={0.3} className="mb-16">
          <Terminal
            lines={[
              { type: 'command', content: 'kubectl get deploy,sts,ds,job' },
              { type: 'output', content: 'web Deployment, postgres StatefulSet, log-agent DaemonSet' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Match Workloads to Controllers
          </h3>
          <WorkloadChooser />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Working with Deployments</h4>
            <p className="text-sm text-muted mb-4">
              Click any command to copy it. Deployments are the most common workload type—here is the daily workflow.
            </p>
            <div className="space-y-2 font-mono text-sm">
              {COMMANDS.map((item) => (
                <motion.button
                  key={item.cmd}
                  onClick={() => copyCommand(item.cmd)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-left bg-background rounded p-3 border border-transparent hover:border-primary/30 transition-colors relative group cursor-pointer"
                >
                  <span className="text-muted">{item.comment}</span>
                  <br />
                  <span className="text-primary">{item.cmd}</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedCmd === item.cmd ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted" />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="text-center text-sm text-muted mb-8">
            <p>A Pod is the smallest unit Kubernetes manages. Controllers like Deployments ensure the right number are always running.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
