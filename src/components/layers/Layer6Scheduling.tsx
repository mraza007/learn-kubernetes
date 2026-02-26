'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { SchedulerPlayground, HPAConceptSimulator } from '@/components/simulations';
import { Gauge, Cpu, AlertTriangle, TrendingUp, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'requests',
    icon: <Cpu className="w-5 h-5" />,
    label: 'Requests',
    summary: 'Guaranteed minimum — scheduler uses this for placement',
    detail:
      'The amount of CPU and memory the container is guaranteed to have. The scheduler only places a pod on a node that has at least this much free. Setting requests too low means your pod may land on an overloaded node; too high and it may never schedule.',
    color: 'primary',
  },
  {
    id: 'limits',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Limits',
    summary: 'Hard ceiling — memory exceeded = OOMKilled, CPU exceeded = throttled',
    detail:
      'The maximum resources a container may consume. Exceeding the memory limit triggers an OOMKill—the kernel terminates the process immediately. Exceeding the CPU limit causes throttling but not termination. Always set limits to protect neighboring pods on the same node.',
    color: 'warning',
  },
];

const COMMANDS = [
  { comment: '# Taint a node (repels pods without a toleration)', cmd: 'kubectl taint nodes gpu-node hardware=gpu:NoSchedule' },
  { comment: '# Node affinity attracts pods to labeled nodes', cmd: 'nodeAffinity: requiredDuringScheduling...' },
  { comment: '# Check why a pod is Pending', cmd: 'kubectl describe pod <name> | grep -A5 Events' },
];

export function Layer6Scheduling() {
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
    <section id="section-6" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            <span className="text-primary">Scheduling</span> and Resources
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Requests, limits, and placement choices control runtime behavior.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Gauge className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Requests, Limits, and Placement</h3>
                <p className="text-muted mb-4">
                  When you create a pod, you tell Kubernetes how much CPU and memory it needs
                  (<span className="text-primary">requests</span>) and the maximum it may use
                  (<span className="text-primary">limits</span>). The scheduler uses requests to
                  find a node with enough room. If a container exceeds its memory limit, the kernel
                  kills it (<span className="text-primary">OOMKilled</span>). CPU over-limit is
                  throttled, not killed.{' '}
                  <span className="text-primary">Click each concept</span> to understand the difference.
                </p>
              </div>
            </div>

            {/* Interactive component cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
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
                    <div className="text-sm font-mono text-text mb-1">{comp.label}</div>
                    <div className="text-xs text-muted">{comp.summary}</div>
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
              { type: 'command', content: 'kubectl describe pod api-7c5 | grep -A2 Requests' },
              { type: 'output', content: 'cpu: 500m, memory: 512Mi' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Schedule Pods onto Nodes
          </h3>
          <SchedulerPlayground />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Autoscaling with HPA</h3>
                <p className="text-muted mb-4">
                  The <span className="text-primary">HorizontalPodAutoscaler</span> watches a
                  metric—usually CPU utilization—and adjusts replica count automatically. When load
                  rises above target, HPA adds pods. When it drops, HPA removes them. It respects
                  min and max bounds so you never scale to zero or infinity.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.45} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Watch HPA React to Load
          </h3>
          <HPAConceptSimulator />
        </FadeIn>

        <FadeIn delay={0.5} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Taints, Tolerations, and Affinity</h4>
            <p className="text-sm text-muted mb-4">
              Beyond resources, Kubernetes offers fine-grained placement control. Click any command to copy it.
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

        <FadeIn delay={0.55}>
          <div className="text-center text-sm text-muted mb-8">
            <p>Set requests honestly, limits conservatively. Let HPA handle traffic spikes so you don't.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
