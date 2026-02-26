'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Database,
  Cpu,
  Network,
  Box,
  Terminal,
  GitBranch,
  Layers,
  Radio,
  ChevronRight,
  Play,
  X,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComponentId =
  | 'kubectl'
  | 'api-server'
  | 'etcd'
  | 'scheduler'
  | 'controller-manager'
  | 'kubelet-1'
  | 'kube-proxy-1'
  | 'kubelet-2'
  | 'kube-proxy-2'
  | 'kubelet-3'
  | 'kube-proxy-3'
  | 'pod-1'
  | 'pod-2'
  | 'pod-3';

interface ComponentInfo {
  id: ComponentId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: 'primary' | 'secondary' | 'warning' | 'muted';
  what: string;
  communicatesWith: string[];
  kubectlCommand: string;
  kubectlLabel: string;
}

interface TraceStep {
  id: ComponentId;
  label: string;
  description: string;
  duration: number;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPONENTS: Record<string, ComponentInfo> = {
  'api-server': {
    id: 'api-server',
    label: 'API Server',
    shortLabel: 'kube-apiserver',
    icon: Server,
    color: 'primary',
    what:
      'The front door of the cluster. Every interaction — kubectl commands, controller watches, kubelet heartbeats — flows through the API Server. It authenticates requests, validates them against RBAC policies, and persists the result to etcd.',
    communicatesWith: ['etcd', 'Scheduler', 'Controller Manager', 'all Kubelets'],
    kubectlCommand: 'kubectl get --raw /healthz',
    kubectlLabel: 'Check API Server health',
  },
  etcd: {
    id: 'etcd',
    label: 'etcd',
    shortLabel: 'etcd',
    icon: Database,
    color: 'secondary',
    what:
      'A distributed key-value store that is the single source of truth for all cluster state. Every object (Pods, Services, ConfigMaps, etc.) lives here as a serialised protobuf blob. If etcd is lost without a backup, the cluster state is gone.',
    communicatesWith: ['API Server (only)'],
    kubectlCommand: 'kubectl get pod -n kube-system -l component=etcd',
    kubectlLabel: 'Inspect etcd Pod',
  },
  scheduler: {
    id: 'scheduler',
    label: 'Scheduler',
    shortLabel: 'kube-scheduler',
    icon: GitBranch,
    color: 'warning',
    what:
      'Watches for newly created Pods that have no node assigned. For each unscheduled Pod it filters nodes (taints, affinity, resource requests) then scores them, picking the best fit. It writes the node name back to the API Server — it never talks to kubelets directly.',
    communicatesWith: ['API Server (watch + write)'],
    kubectlCommand: 'kubectl get events --field-selector reason=Scheduled',
    kubectlLabel: 'See recent scheduling events',
  },
  'controller-manager': {
    id: 'controller-manager',
    label: 'Controller Manager',
    shortLabel: 'kube-controller-manager',
    icon: Cpu,
    color: 'secondary',
    what:
      'A single binary that hosts dozens of reconciliation loops (Deployment controller, ReplicaSet controller, Node controller, etc.). Each controller watches the API Server for desired-state changes, computes the diff against actual state, and issues API calls to close the gap.',
    communicatesWith: ['API Server (watch + write)'],
    kubectlCommand: 'kubectl get pod -n kube-system -l component=kube-controller-manager',
    kubectlLabel: 'Inspect Controller Manager Pod',
  },
  kubelet: {
    id: 'kubelet-1',
    label: 'kubelet',
    shortLabel: 'kubelet',
    icon: Layers,
    color: 'muted',
    what:
      'The primary node agent. Kubelet watches the API Server for Pods scheduled to its node, instructs the container runtime (e.g. containerd) to pull images and start containers, and reports back Pod status and node health via heartbeats.',
    communicatesWith: ['API Server', 'Container Runtime (CRI)', 'kube-proxy (indirectly via node)'],
    kubectlCommand: 'kubectl get nodes -o wide',
    kubectlLabel: 'Check node / kubelet status',
  },
  'kube-proxy': {
    id: 'kube-proxy-1',
    label: 'kube-proxy',
    shortLabel: 'kube-proxy',
    icon: Network,
    color: 'muted',
    what:
      'Runs on every node and programs iptables / IPVS rules so that Service cluster IPs are routed to the correct Pod endpoints. It watches the API Server for Service and Endpoints changes and keeps rules in sync.',
    communicatesWith: ['API Server (watch)', 'kernel iptables / IPVS'],
    kubectlCommand: 'kubectl get pod -n kube-system -l k8s-app=kube-proxy',
    kubectlLabel: 'Inspect kube-proxy DaemonSet Pods',
  },
};

const TRACE_STEPS: TraceStep[] = [
  {
    id: 'kubectl',
    label: 'kubectl apply',
    description:
      'You run `kubectl apply -f deployment.yaml`. kubectl reads your kubeconfig, builds an HTTP request, and sends it to the API Server endpoint.',
    duration: 1800,
  },
  {
    id: 'api-server',
    label: 'API Server',
    description:
      'API Server authenticates the request, runs admission webhooks, validates the schema, then persists the new Deployment object to etcd. It returns a 201 Created to kubectl.',
    duration: 2200,
  },
  {
    id: 'etcd',
    label: 'etcd',
    description:
      'etcd durably stores the Deployment spec. It emits a watch event to all API Server clients that are watching Deployments.',
    duration: 1600,
  },
  {
    id: 'controller-manager',
    label: 'Controller Manager',
    description:
      'The Deployment controller sees the new Deployment and creates a ReplicaSet. The ReplicaSet controller sees it and creates 3 Pod objects — each with no nodeName yet.',
    duration: 2000,
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    description:
      'The Scheduler sees 3 unscheduled Pods. It filters and scores nodes, then patches each Pod with a nodeName, writing back to the API Server.',
    duration: 2000,
  },
  {
    id: 'kubelet-1',
    label: 'kubelet (node-1)',
    description:
      'The kubelet on the selected node sees its new Pod assignment. It tells the container runtime to pull the image and start containers. It then reports PodRunning status back to the API Server.',
    duration: 2400,
  },
  {
    id: 'pod-1',
    label: 'Pod Running',
    description:
      'The container is now running inside the Pod on the node. The kubelet continues sending heartbeats. kube-proxy has programmed routing rules so the Service can reach the new Pod endpoint.',
    duration: 2000,
  },
];

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

type ColorKey = 'primary' | 'secondary' | 'warning' | 'muted' | 'danger';

const COLOR_MAP: Record<ColorKey, { border: string; bg: string; text: string; glow: string; ring: string }> = {
  primary: {
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    text: 'text-primary',
    glow: '0 0 20px rgba(45, 212, 191, 0.5), 0 0 40px rgba(45, 212, 191, 0.2)',
    ring: 'rgba(45, 212, 191, 0.6)',
  },
  secondary: {
    border: 'border-secondary/50',
    bg: 'bg-secondary/10',
    text: 'text-secondary',
    glow: '0 0 20px rgba(96, 165, 250, 0.5), 0 0 40px rgba(96, 165, 250, 0.2)',
    ring: 'rgba(96, 165, 250, 0.6)',
  },
  warning: {
    border: 'border-warning/50',
    bg: 'bg-warning/10',
    text: 'text-warning',
    glow: '0 0 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.2)',
    ring: 'rgba(245, 158, 11, 0.6)',
  },
  muted: {
    border: 'border-muted/40',
    bg: 'bg-muted/10',
    text: 'text-muted',
    glow: '0 0 16px rgba(107, 126, 159, 0.4)',
    ring: 'rgba(107, 126, 159, 0.5)',
  },
  danger: {
    border: 'border-danger/50',
    bg: 'bg-danger/10',
    text: 'text-danger',
    glow: '0 0 20px rgba(244, 63, 94, 0.5)',
    ring: 'rgba(244, 63, 94, 0.6)',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NodeCardProps {
  info: ComponentInfo;
  isSelected: boolean;
  isTraceActive: boolean;
  onClick: (id: ComponentId) => void;
}

function NodeCard({ info, isSelected, isTraceActive, onClick }: NodeCardProps) {
  const colors = COLOR_MAP[info.color];
  const highlighted = isSelected || isTraceActive;
  const Icon = info.icon;

  return (
    <motion.button
      onClick={() => onClick(info.id)}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 cursor-pointer select-none transition-colors duration-200 ${
        highlighted
          ? `${colors.border} ${colors.bg}`
          : 'border-muted/25 bg-background/60 hover:border-muted/50'
      }`}
      animate={{
        boxShadow: highlighted ? colors.glow : 'none',
        scale: isTraceActive ? [1, 1.06, 1] : 1,
      }}
      transition={{
        boxShadow: { duration: 0.3 },
        scale: isTraceActive ? { duration: 0.5, repeat: Infinity, repeatType: 'loop' } : { duration: 0.2 },
      }}
      whileHover={{ scale: highlighted ? 1 : 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Pulse ring when trace is active */}
      <AnimatePresence>
        {isTraceActive && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ border: `2px solid ${colors.ring}` }}
          />
        )}
      </AnimatePresence>

      <Icon
        size={20}
        className={highlighted ? colors.text : 'text-muted'}
        strokeWidth={1.5}
      />
      <span
        className={`text-xs font-mono font-medium leading-tight text-center ${
          highlighted ? colors.text : 'text-muted'
        }`}
      >
        {info.label}
      </span>
    </motion.button>
  );
}

interface PodBubbleProps {
  nodeIndex: number;
  isTraceActive: boolean;
}

function PodBubble({ nodeIndex, isTraceActive }: PodBubbleProps) {
  const active = isTraceActive && nodeIndex === 0;
  return (
    <motion.div
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
        active ? 'border-primary/60 bg-primary/10' : 'border-muted/20 bg-background/40'
      }`}
      animate={{ boxShadow: active ? COLOR_MAP.primary.glow : 'none' }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {active && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-lg"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ border: `2px solid ${COLOR_MAP.primary.ring}` }}
          />
        )}
      </AnimatePresence>
      <Box size={12} className={active ? 'text-primary' : 'text-muted'} strokeWidth={1.5} />
      <span className={`text-xs font-mono ${active ? 'text-primary' : 'text-muted/70'}`}>pod</span>
    </motion.div>
  );
}

interface DetailPanelProps {
  info: ComponentInfo;
  onClose: () => void;
}

function DetailPanel({ info, onClose }: DetailPanelProps) {
  const colors = COLOR_MAP[info.color];
  const Icon = info.icon;

  return (
    <motion.div
      key={info.id}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative rounded-xl border ${colors.border} bg-surface p-5 space-y-4`}
      style={{ boxShadow: `0 0 30px rgba(0,0,0,0.5), ${info.color !== 'muted' ? colors.glow : ''}` }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-muted hover:text-text transition-colors"
        aria-label="Close panel"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 pr-6">
        <div className={`rounded-lg p-2 ${colors.bg} border ${colors.border}`}>
          <Icon size={20} className={colors.text} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className={`font-mono font-semibold text-base ${colors.text}`}>{info.label}</h3>
          <p className="text-xs text-muted font-mono">{info.shortLabel}</p>
        </div>
      </div>

      {/* What it does */}
      <div>
        <p className="text-xs font-mono text-muted mb-1 uppercase tracking-wider">What it does</p>
        <p className="text-sm text-text leading-relaxed">{info.what}</p>
      </div>

      {/* Communicates with */}
      <div>
        <p className="text-xs font-mono text-muted mb-2 uppercase tracking-wider">Communicates with</p>
        <div className="flex flex-wrap gap-2">
          {info.communicatesWith.map((peer) => (
            <span
              key={peer}
              className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-md border border-muted/30 bg-background/60 text-muted`}
            >
              <Radio size={10} />
              {peer}
            </span>
          ))}
        </div>
      </div>

      {/* kubectl command */}
      <div>
        <p className="text-xs font-mono text-muted mb-2 uppercase tracking-wider">
          <Terminal size={10} className="inline mr-1" />
          Try it
        </p>
        <div className="rounded-lg border border-muted/20 bg-terminal px-3 py-2 font-mono text-sm text-primary flex items-center gap-2">
          <span className="text-muted select-none">$</span>
          <span>{info.kubectlCommand}</span>
        </div>
        <p className="text-xs text-muted mt-1">{info.kubectlLabel}</p>
      </div>
    </motion.div>
  );
}

interface TraceStepBannerProps {
  step: TraceStep;
  stepIndex: number;
  totalSteps: number;
}

function TraceStepBanner({ step, stepIndex, totalSteps }: TraceStepBannerProps) {
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl border border-secondary/40 bg-secondary/5 px-4 py-3 space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-secondary" />
          <span className="text-xs font-mono text-secondary font-semibold uppercase tracking-wider">
            Trace &mdash; Step {stepIndex + 1}/{totalSteps}
          </span>
        </div>
        <span className="text-xs font-mono text-muted">{step.label}</span>
      </div>
      <p className="text-sm text-text leading-relaxed">{step.description}</p>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-muted/20 overflow-hidden">
        <motion.div
          className="h-full bg-secondary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: step.duration / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClusterAnatomyExplorer() {
  const [selectedId, setSelectedId] = useState<ComponentId | null>(null);
  const [traceRunning, setTraceRunning] = useState(false);
  const [traceStepIndex, setTraceStepIndex] = useState<number>(-1);
  const traceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Which component IDs are currently "lit up" by the trace
  const traceActiveId: ComponentId | null =
    traceStepIndex >= 0 ? TRACE_STEPS[traceStepIndex]?.id ?? null : null;

  const isTraceActive = (id: ComponentId): boolean => traceActiveId === id;

  const handleNodeClick = useCallback(
    (id: ComponentId) => {
      if (traceRunning) return;
      // Map worker node variants back to their canonical info keys
      const canonical = id.startsWith('kubelet') ? 'kubelet' : id.startsWith('kube-proxy') ? 'kube-proxy' : id;
      if (COMPONENTS[canonical]) {
        setSelectedId(id === selectedId ? null : id);
      }
    },
    [traceRunning, selectedId],
  );

  const handleClose = useCallback(() => setSelectedId(null), []);

  const stopTrace = useCallback(() => {
    traceTimeoutsRef.current.forEach(clearTimeout);
    traceTimeoutsRef.current = [];
    setTraceRunning(false);
    setTraceStepIndex(-1);
  }, []);

  const startTrace = useCallback(() => {
    if (traceRunning) {
      stopTrace();
      return;
    }
    setSelectedId(null);
    setTraceRunning(true);
    setTraceStepIndex(0);

    let elapsed = 0;
    TRACE_STEPS.forEach((step, i) => {
      if (i === 0) return; // already set above

      elapsed += TRACE_STEPS[i - 1].duration;
      const t = setTimeout(() => {
        setTraceStepIndex(i);
      }, elapsed);
      traceTimeoutsRef.current.push(t);
    });

    // Finish
    const totalDuration = TRACE_STEPS.reduce((acc, s) => acc + s.duration, 0);
    const finish = setTimeout(() => {
      setTraceRunning(false);
      setTraceStepIndex(-1);
    }, totalDuration);
    traceTimeoutsRef.current.push(finish);
  }, [traceRunning, stopTrace]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      traceTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Resolve detail info for selected id
  const selectedInfo: ComponentInfo | null = (() => {
    if (!selectedId) return null;
    const canonical = selectedId.startsWith('kubelet')
      ? 'kubelet'
      : selectedId.startsWith('kube-proxy')
      ? 'kube-proxy'
      : selectedId;
    return COMPONENTS[canonical] ?? null;
  })();

  const WORKER_NODES = [
    { label: 'node-1', kubeId: 'kubelet-1' as ComponentId, proxyId: 'kube-proxy-1' as ComponentId, podId: 'pod-1' as ComponentId },
    { label: 'node-2', kubeId: 'kubelet-2' as ComponentId, proxyId: 'kube-proxy-2' as ComponentId, podId: 'pod-2' as ComponentId },
    { label: 'node-3', kubeId: 'kubelet-3' as ComponentId, proxyId: 'kube-proxy-3' as ComponentId, podId: 'pod-3' as ComponentId },
  ];

  // Connection line SVG between control plane and workers
  // Drawn as a simple decorative element
  const showConnectionLines = true;

  return (
    <div className="space-y-5 font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* Header toolbar                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Cluster Anatomy</h2>
          <p className="text-xs text-muted mt-0.5">
            {traceRunning
              ? 'Tracing a request through the cluster...'
              : 'Click any component to explore it, or trace a request end-to-end.'}
          </p>
        </div>

        <motion.button
          onClick={startTrace}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-mono font-medium transition-colors duration-200 ${
            traceRunning
              ? 'border-danger/50 bg-danger/10 text-danger'
              : 'border-secondary/50 bg-secondary/10 text-secondary hover:bg-secondary/20'
          }`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          animate={traceRunning ? { boxShadow: COLOR_MAP.secondary.glow } : { boxShadow: 'none' }}
        >
          {traceRunning ? (
            <>
              <X size={14} />
              Stop trace
            </>
          ) : (
            <>
              <Play size={14} />
              Trace a request
            </>
          )}
        </motion.button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* kubectl "client" node (outside the cluster)                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex justify-center">
        <motion.div
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-sm ${
            isTraceActive('kubectl')
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-muted/30 bg-background/60 text-muted'
          }`}
          animate={{
            boxShadow: isTraceActive('kubectl') ? COLOR_MAP.primary.glow : 'none',
          }}
          transition={{ duration: 0.3 }}
        >
          <Terminal size={15} strokeWidth={1.5} />
          <span>kubectl</span>
          <span className="text-xs opacity-60">(your machine)</span>
        </motion.div>
      </div>

      {/* Arrow from kubectl to control plane */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-0.5">
          <motion.div
            className="w-px bg-muted/30"
            style={{ height: 20 }}
            animate={
              traceRunning && traceStepIndex >= 0
                ? { backgroundColor: ['rgba(107,126,159,0.3)', 'rgba(45,212,191,0.7)', 'rgba(107,126,159,0.3)'] }
                : {}
            }
            transition={{ duration: 1, repeat: Infinity }}
          />
          <ChevronRight size={12} className="text-muted/50 rotate-90" />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Control Plane                                                         */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="rounded-2xl border border-primary/25 bg-surface p-4 space-y-3"
        animate={
          (isTraceActive('api-server') ||
            isTraceActive('etcd') ||
            isTraceActive('scheduler') ||
            isTraceActive('controller-manager'))
            ? { boxShadow: '0 0 30px rgba(45,212,191,0.12)' }
            : { boxShadow: 'none' }
        }
        transition={{ duration: 0.4 }}
      >
        {/* Zone label */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-primary/20" />
          <span className="text-xs font-mono text-primary/70 uppercase tracking-widest px-1">Control Plane</span>
          <div className="h-px flex-1 bg-primary/20" />
        </div>

        {/* 4 control-plane components */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { key: 'api-server', id: 'api-server' as ComponentId },
              { key: 'etcd', id: 'etcd' as ComponentId },
              { key: 'scheduler', id: 'scheduler' as ComponentId },
              { key: 'controller-manager', id: 'controller-manager' as ComponentId },
            ] as const
          ).map(({ key, id }) => (
            <NodeCard
              key={key}
              info={COMPONENTS[key]}
              isSelected={selectedId === id}
              isTraceActive={isTraceActive(id)}
              onClick={handleNodeClick}
            />
          ))}
        </div>
      </motion.div>

      {/* Connection lines from control plane to workers */}
      {showConnectionLines && (
        <div className="flex justify-center">
          <svg width="80%" height="28" viewBox="0 0 400 28" className="overflow-visible opacity-30">
            <line x1="200" y1="0" x2="66" y2="28" stroke="#6b7e9f" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="200" y1="0" x2="200" y2="28" stroke="#6b7e9f" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="200" y1="0" x2="334" y2="28" stroke="#6b7e9f" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Worker Nodes                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {WORKER_NODES.map((node, idx) => {
          const kubeletActive = isTraceActive(node.kubeId);
          const podActive = isTraceActive(node.podId);
          const nodeHighlighted = kubeletActive || podActive;

          return (
            <motion.div
              key={node.label}
              className={`rounded-2xl border p-3 space-y-2.5 ${
                nodeHighlighted ? 'border-muted/50 bg-surface' : 'border-muted/20 bg-surface/60'
              }`}
              animate={
                nodeHighlighted
                  ? { boxShadow: '0 0 20px rgba(107,126,159,0.2)' }
                  : { boxShadow: 'none' }
              }
              transition={{ duration: 0.3 }}
            >
              {/* Node header */}
              <div className="flex items-center gap-1.5">
                <div className="h-px flex-1 bg-muted/20" />
                <span className="text-xs font-mono text-muted/60 uppercase tracking-widest">
                  {node.label}
                </span>
                <div className="h-px flex-1 bg-muted/20" />
              </div>

              {/* kubelet */}
              <NodeCard
                info={{ ...COMPONENTS['kubelet'], id: node.kubeId }}
                isSelected={selectedId === node.kubeId}
                isTraceActive={kubeletActive}
                onClick={handleNodeClick}
              />

              {/* kube-proxy */}
              <NodeCard
                info={{ ...COMPONENTS['kube-proxy'], id: node.proxyId }}
                isSelected={selectedId === node.proxyId}
                isTraceActive={isTraceActive(node.proxyId)}
                onClick={handleNodeClick}
              />

              {/* Pod(s) */}
              <div className="flex justify-center relative">
                <PodBubble nodeIndex={idx} isTraceActive={podActive} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Info panels (detail or trace banner)                                 */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence mode="wait">
        {traceRunning && traceStepIndex >= 0 ? (
          <TraceStepBanner
            key={`trace-${traceStepIndex}`}
            step={TRACE_STEPS[traceStepIndex]}
            stepIndex={traceStepIndex}
            totalSteps={TRACE_STEPS.length}
          />
        ) : selectedInfo ? (
          <DetailPanel key={selectedId} info={selectedInfo} onClose={handleClose} />
        ) : (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-muted/15 bg-surface/40 px-4 py-3 text-center"
          >
            <p className="text-xs text-muted font-mono">
              Select any component above to learn what it does &mdash; or press{' '}
              <span className="text-secondary">Trace a request</span> to watch a deployment flow through the cluster.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
