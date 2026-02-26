'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { ControlPlaneJourney } from '@/components/simulations';
import { GitBranch, Server, Workflow, Eye, Cpu, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'apiserver',
    icon: <Server className="w-5 h-5" />,
    label: 'API Server',
    summary: 'Validates and persists',
    detail:
      'The single front door to the cluster. Every kubectl command, every controller, and every webhook communicates exclusively through the API server. It validates requests against the schema, runs admission webhooks, authenticates the caller, and writes accepted state to etcd.',
    color: 'primary',
  },
  {
    id: 'controllers',
    icon: <GitBranch className="w-5 h-5" />,
    label: 'Controllers',
    summary: 'Reconcile desired vs actual',
    detail:
      'The controller manager runs dozens of control loops—Deployment controller, ReplicaSet controller, Job controller, and more. Each loop watches for a gap between desired state (what you declared) and actual state (what is running) and takes action to close that gap.',
    color: 'secondary',
  },
  {
    id: 'scheduler',
    icon: <Eye className="w-5 h-5" />,
    label: 'Scheduler',
    summary: 'Assigns pods to nodes',
    detail:
      'Watches for pods with no assigned node. For each unscheduled pod it runs a two-phase algorithm: first it filters nodes that cannot satisfy constraints (resources, taints, affinity), then it scores the remaining nodes and picks the best one. It writes the node assignment back to the API server.',
    color: 'warning',
  },
  {
    id: 'kubelet',
    icon: <Cpu className="w-5 h-5" />,
    label: 'kubelet',
    summary: 'Starts containers',
    detail:
      'Runs on every worker node. Watches for pods assigned to its node, then instructs the container runtime (containerd, CRI-O) to pull images and start containers. It also runs probes and reports pod status back to the API server. It is the only control-plane component that touches the actual workload.',
    color: 'primary',
  },
];

const COMMANDS = [
  { comment: '# Watch events in real-time', cmd: 'kubectl get events -w --sort-by=.lastTimestamp' },
  { comment: '# See which controller owns a pod', cmd: "kubectl get pod <name> -o jsonpath='{.metadata.ownerReferences}'" },
  { comment: '# Check API server health', cmd: 'kubectl get componentstatuses' },
];

export function Layer8ControlPlane() {
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
    <section id="section-8" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            <span className="text-secondary">Control Plane</span> Deep Mental Model
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Trace manifests through API server, etcd, scheduler, and kubelet.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Workflow className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">The Lifecycle of kubectl apply</h3>
                <p className="text-muted mb-4">
                  When you run <span className="text-primary">kubectl apply -f deployment.yaml</span>,
                  a chain of asynchronous events unfolds. The manifest hits the API server, which
                  validates and stores it in etcd. The Deployment controller notices the new desired
                  state and creates a ReplicaSet. The scheduler assigns pods to nodes. The kubelet on
                  each node pulls images and starts containers. No single component orchestrates the
                  full sequence—each watches, reacts, and hands off.{' '}
                  <span className="text-primary">Click each component</span> to understand its role.
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
              { type: 'command', content: 'kubectl apply -f deployment.yaml' },
              { type: 'output', content: 'deployment.apps/web configured' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Explore: Trace the Request Path
          </h3>
          <ControlPlaneJourney />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Watching the System Work</h4>
            <p className="text-sm text-muted mb-4">
              These commands let you observe the control plane in action. Click any command to copy it.
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

        <FadeIn delay={0.45}>
          <div className="text-center text-sm text-muted mb-8">
            <p>Kubernetes is not one big program—it is a set of independent controllers watching and reacting. Understanding this model is the key to debugging anything.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
