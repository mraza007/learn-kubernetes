'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { ClusterAnatomyExplorer } from '@/components/simulations';
import { Server, Database, Cpu, Network, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'api',
    icon: <Network className="w-5 h-5" />,
    label: 'API Server',
    summary: 'Single entry point for all operations',
    detail: 'Every kubectl command, every internal component, and every webhook goes through the API server. It validates requests, authenticates users, and writes to etcd.',
    color: 'primary',
  },
  {
    id: 'etcd',
    icon: <Database className="w-5 h-5" />,
    label: 'etcd',
    summary: 'Stores all cluster state',
    detail: 'A distributed key-value store that holds the entire desired state of your cluster. If etcd is lost without backup, you lose your cluster configuration.',
    color: 'secondary',
  },
  {
    id: 'scheduler',
    icon: <Cpu className="w-5 h-5" />,
    label: 'Scheduler',
    summary: 'Picks which node runs each pod',
    detail: 'Watches for unscheduled pods, evaluates node resources, taints, and affinities, then assigns each pod to the best-fit node.',
    color: 'warning',
  },
  {
    id: 'kubelet',
    icon: <Server className="w-5 h-5" />,
    label: 'kubelet',
    summary: 'Node agent that manages containers',
    detail: 'Runs on every worker node. Receives pod specs from the API server and ensures the containers described in those specs are running and healthy.',
    color: 'primary',
  },
];

const COMMANDS = [
  { comment: '# Check cluster health', cmd: 'kubectl cluster-info' },
  { comment: '# List all nodes and their status', cmd: 'kubectl get nodes' },
  { comment: '# Inspect a specific node', cmd: 'kubectl describe node <name>' },
];

export function Layer1Basics() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [terminalComplete, setTerminalComplete] = useState(false);
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
    <section id="section-1" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            Cluster <span className="text-primary">Basics</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Understand the control plane and node responsibilities.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Server className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-2">Anatomy of a Cluster</h3>
                <p className="text-muted text-sm">
                  A Kubernetes cluster has two halves: the <span className="text-primary">control plane</span> (the brain) and
                  <span className="text-primary"> worker nodes</span> (the muscle).{' '}
                  <span className="text-primary">Click each component</span> to learn what it does.
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
                    <div className={`mx-auto mb-1 ${isSelected ? `text-${comp.color}` : 'text-muted'}`}>
                      {comp.icon}
                    </div>
                    <div className={`text-sm font-mono ${isSelected ? 'text-text' : 'text-text'}`}>{comp.label}</div>
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
              { type: 'command', content: 'kubectl cluster-info' },
              { type: 'output', content: 'Kubernetes control plane is running at https://10.0.0.1:6443', delay: 400 },
              { type: 'output', content: 'CoreDNS is running at https://10.0.0.1:6443/api/v1/...', delay: 200 },
              { type: 'command', content: 'kubectl get nodes', delay: 500 },
              { type: 'output', content: 'NAME       STATUS   ROLES           AGE   VERSION', delay: 300 },
              { type: 'output', content: 'node-1     Ready    control-plane   5d    v1.29.0', delay: 100 },
              { type: 'output', content: 'node-2     Ready    <none>          5d    v1.29.0', delay: 100 },
              { type: 'output', content: 'node-3     Ready    <none>          5d    v1.29.0', delay: 100 },
            ]}
            onComplete={() => setTerminalComplete(true)}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Explore: Cluster Components
          </h3>
          <ClusterAnatomyExplorer />
        </FadeIn>

        {/* Copyable commands section */}
        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Essential Cluster Commands</h4>
            <p className="text-sm text-muted mb-4">
              Click to copy. These commands orient you when you first connect to a cluster.
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
            <p>Every kubectl command goes through the API server, which validates it, writes to etcd, and lets controllers react.</p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
