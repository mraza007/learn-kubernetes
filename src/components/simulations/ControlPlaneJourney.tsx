'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Server, Database, Cpu, Box, CheckCircle, Play, SkipForward, RotateCcw } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Step {
  id: string;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  terminalLines: string[];
  description: string;
}

const STEPS: Step[] = [
  {
    id: 'kubectl',
    label: 'kubectl apply',
    sublabel: 'CLI → API Server',
    Icon: Terminal,
    terminalLines: [
      '$ kubectl apply -f deployment.yaml',
      'POST /api/v1/namespaces/default/pods',
      '→ Serializing manifest to JSON...',
      '→ Adding default labels & annotations...',
      '→ Sending request to kube-apiserver:6443',
    ],
    description: 'kubectl serialises your YAML manifest and sends an authenticated HTTP POST to the API Server.',
  },
  {
    id: 'apiserver',
    label: 'API Server validates',
    sublabel: 'Authentication · Admission · Schema',
    Icon: Server,
    terminalLines: [
      'kube-apiserver: received POST /api/v1/namespaces/default/pods',
      '→ AuthN: Bearer token verified (ServiceAccount)',
      '→ AuthZ: RBAC policy allows verb=create on pods',
      '→ Admission: MutatingWebhook injected sidecar',
      '→ Admission: ValidatingWebhook: OK',
      '→ Schema validation: passed',
      '← 201 Created  { uid: "a3f1bc..." }',
    ],
    description: 'The API Server authenticates the request, runs admission controllers, validates the schema, and returns 201 Created.',
  },
  {
    id: 'etcd',
    label: 'etcd stores state',
    sublabel: 'Desired state persisted',
    Icon: Database,
    terminalLines: [
      'etcd: PUT /registry/pods/default/my-app',
      '→ Raft consensus: leader broadcasting entry…',
      '→ Quorum achieved (3/3 members confirmed)',
      '→ Entry committed at index 1042',
      '→ Watchers notified: [scheduler, controller-manager]',
      'etcd: key /registry/pods/default/my-app written ✓',
    ],
    description: 'etcd persists the object as the source of truth. A Raft consensus quorum ensures the write survives node failures.',
  },
  {
    id: 'scheduler',
    label: 'Scheduler selects node',
    sublabel: 'Filtering → Scoring → Binding',
    Icon: Cpu,
    terminalLines: [
      'kube-scheduler: unscheduled pod detected: my-app',
      '→ Filtering: 3 nodes eligible (taints, affinity, resources)',
      '→ Scoring: node-2 wins (balanced CPU+mem, locality)',
      '→ Binding: POST /api/v1/namespaces/default/pods/my-app/binding',
      '← 201 Created  { nodeName: "node-2" }',
      'kube-scheduler: pod/my-app bound to node-2 ✓',
    ],
    description: 'The Scheduler watches for unscheduled pods, runs filtering and scoring predicates, then writes a Binding object back to the API Server.',
  },
  {
    id: 'kubelet',
    label: 'Kubelet starts Pod',
    sublabel: 'Container runtime · CRI',
    Icon: Box,
    terminalLines: [
      'kubelet@node-2: pod/my-app assigned to this node',
      '→ Pulling image: nginx:1.27 (containerd CRI)',
      '→ Creating sandbox (pause container)…',
      '→ Starting container: my-app',
      '→ Running liveness probe: HTTP GET :80/healthz',
      '← 200 OK  (probe succeeded)',
      'kubelet@node-2: pod/my-app phase=Running ✓',
    ],
    description: 'The kubelet on the target node calls the CRI to pull the image, create the sandbox network, and start containers.',
  },
  {
    id: 'running',
    label: 'Pod Running',
    sublabel: 'Steady state achieved',
    Icon: CheckCircle,
    terminalLines: [
      'kube-apiserver: PATCH pods/my-app status.phase=Running',
      '→ Status stored in etcd',
      '→ Endpoints controller: service endpoint registered',
      '→ kube-proxy: iptables rule added on all nodes',
      '',
      '$ kubectl get pods',
      'NAME      READY   STATUS    RESTARTS   AGE',
      'my-app    1/1     Running   0          4s',
    ],
    description: 'The API Server reflects the Running phase. The Endpoints controller updates service routing so traffic can reach your Pod.',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single node in the pipeline */
function PipelineNode({
  step,
  index,
  activeIndex,
  onClick,
}: {
  step: Step;
  index: number;
  activeIndex: number;
  onClick: () => void;
}) {
  const isCompleted = index < activeIndex;
  const isActive = index === activeIndex;
  const isUpcoming = index > activeIndex;

  const { Icon } = step;

  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center gap-4 w-full text-left focus:outline-none group"
      initial={false}
      whileHover={isUpcoming ? { x: 4 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Icon circle */}
      <div className="relative flex-shrink-0">
        <motion.div
          className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors duration-300"
          animate={{
            borderColor: isCompleted
              ? '#2dd4bf'
              : isActive
              ? '#60a5fa'
              : 'rgba(255,255,255,0.1)',
            backgroundColor: isCompleted
              ? 'rgba(45,212,191,0.15)'
              : isActive
              ? 'rgba(96,165,250,0.15)'
              : 'rgba(255,255,255,0.03)',
            boxShadow: isActive
              ? '0 0 0 4px rgba(96,165,250,0.15), 0 0 20px rgba(96,165,250,0.3)'
              : isCompleted
              ? '0 0 12px rgba(45,212,191,0.25)'
              : 'none',
          }}
          transition={{ duration: 0.4 }}
        >
          <Icon
            size={20}
            className="transition-colors duration-300"
            style={{
              color: isCompleted
                ? '#2dd4bf'
                : isActive
                ? '#60a5fa'
                : 'rgba(255,255,255,0.25)',
            }}
          />

          {/* Pulse ring on active */}
          {isActive && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-secondary/50"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </motion.div>

        {/* Completed checkmark badge */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-20"
            >
              <CheckCircle size={12} className="text-background" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <motion.p
          className="text-sm font-semibold font-mono leading-tight"
          animate={{
            color: isCompleted
              ? '#2dd4bf'
              : isActive
              ? '#60a5fa'
              : 'rgba(255,255,255,0.25)',
          }}
          transition={{ duration: 0.3 }}
        >
          {step.label}
        </motion.p>
        <motion.p
          className="text-xs mt-0.5 truncate"
          animate={{
            color: isCompleted
              ? 'rgba(45,212,191,0.6)'
              : isActive
              ? 'rgba(96,165,250,0.6)'
              : 'rgba(255,255,255,0.15)',
          }}
          transition={{ duration: 0.3 }}
        >
          {step.sublabel}
        </motion.p>
      </div>

      {/* Active indicator chevron */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            className="text-secondary text-lg font-mono flex-shrink-0 pr-1 select-none"
          >
            ›
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Animated SVG connector line between two nodes */
function ConnectorLine({ isTraversed, isTraversing }: { isTraversed: boolean; isTraversing: boolean }) {
  // The line is 40px tall; the travelling dot animates from top to bottom
  return (
    <div className="relative flex justify-start pl-6 py-0.5" style={{ height: 32 }}>
      {/* Static track */}
      <div
        className="absolute left-6 top-0 bottom-0 w-px"
        style={{
          background: isTraversed
            ? 'linear-gradient(to bottom, rgba(45,212,191,0.6), rgba(45,212,191,0.3))'
            : 'rgba(255,255,255,0.08)',
          transition: 'background 0.4s',
        }}
      />

      {/* Fill overlay that grows downward when traversed */}
      <motion.div
        className="absolute left-6 top-0 w-px origin-top"
        style={{
          background: 'linear-gradient(to bottom, #2dd4bf, #60a5fa)',
          transformOrigin: 'top',
        }}
        initial={false}
        animate={{
          scaleY: isTraversed ? 1 : 0,
          height: 32,
        }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />

      {/* Travelling dot */}
      <AnimatePresence>
        {isTraversing && (
          <motion.div
            key="dot"
            className="absolute left-[22px] w-2 h-2 rounded-full"
            style={{
              background: 'radial-gradient(circle, #60a5fa, #2dd4bf)',
              boxShadow: '0 0 8px #60a5fa, 0 0 16px rgba(96,165,250,0.5)',
              top: -4,
            }}
            initial={{ top: -4, opacity: 1 }}
            animate={{ top: 28, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Typewriter terminal output panel */
function TerminalPanel({ lines, stepId }: { lines: string[]; stepId: string }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setVisibleCount(0);
    let count = 0;
    intervalRef.current = setInterval(() => {
      count += 1;
      setVisibleCount(count);
      if (count >= lines.length && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 140);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stepId]); // re-run whenever the step changes

  return (
    <motion.div
      key={stepId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-muted/20 bg-terminal p-4 font-mono text-xs leading-relaxed overflow-hidden"
    >
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-muted/20">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-muted text-[10px] uppercase tracking-widest">output</span>
      </div>
      <div className="space-y-0.5 min-h-[120px]">
        {lines.slice(0, visibleCount).map((line, i) => {
          const isCommand = line.startsWith('$');
          const isSuccess = line.includes('✓') || line.includes('Created') || line.includes('Running');
          const isArrow = line.startsWith('→') || line.startsWith('←');
          return (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={
                isCommand
                  ? 'text-primary font-bold'
                  : isSuccess
                  ? 'text-primary'
                  : isArrow
                  ? 'text-secondary'
                  : line === ''
                  ? 'h-3'
                  : 'text-text/70'
              }
            >
              {line || '\u00A0'}
            </motion.p>
          );
        })}
        {/* Blinking cursor on last line */}
        {visibleCount < lines.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-2 h-3.5 bg-secondary/80 align-text-bottom"
          />
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ControlPlaneJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [traversingIndex, setTraversingIndex] = useState<number | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const runAllRef = useRef(false);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);

  const isFinished = activeIndex >= STEPS.length - 1;

  const advanceTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex <= activeIndex || nextIndex >= STEPS.length) return;
      // Animate the connector line between (nextIndex - 1) and nextIndex
      setTraversingIndex(nextIndex - 1);
      const timeoutId = setTimeout(() => {
        if (!isMounted.current) return;
        setTraversingIndex(null);
        setActiveIndex(nextIndex);
      }, 480);
      timeoutIds.current.push(timeoutId);
    },
    [activeIndex]
  );

  const handleNext = useCallback(() => {
    if (!isFinished) advanceTo(activeIndex + 1);
  }, [advanceTo, activeIndex, isFinished]);

  const handleReset = useCallback(() => {
    runAllRef.current = false;
    setIsRunningAll(false);
    setTraversingIndex(null);
    setActiveIndex(0);
    timeoutIds.current.forEach((id) => clearTimeout(id));
    timeoutIds.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current = [];
      runAllRef.current = false;
    };
  }, []);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const timeoutId = setTimeout(resolve, ms);
      timeoutIds.current.push(timeoutId);
    });

  const runAll = useCallback(async () => {
    if (isRunningAll) return;
    runAllRef.current = true;
    setIsRunningAll(true);

    let current = activeIndex;
    while (current < STEPS.length - 1 && runAllRef.current) {
      const next = current + 1;
      setTraversingIndex(current);
      await sleep(480);
      if (!runAllRef.current || !isMounted.current) break;
      setTraversingIndex(null);
      setActiveIndex(next);
      current = next;
      await sleep(1000);
    }

    runAllRef.current = false;
    setIsRunningAll(false);
  }, [activeIndex, isRunningAll]);

  const handleRunAll = runAll;

  const activeStep = STEPS[activeIndex];

  return (
    <div className="rounded-xl border border-muted/20 bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-muted/20 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Control Plane Journey</h3>
          <p className="text-xs text-muted mt-0.5">Trace a Pod from kubectl to Running</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Step counter */}
          <span className="text-xs text-muted font-mono tabular-nums">
            {activeIndex + 1}/{STEPS.length}
          </span>
          {/* Progress bar */}
          <div className="w-24 h-1.5 rounded-full bg-muted/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              animate={{ width: `${((activeIndex) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        {/* Left: Pipeline */}
        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div key={step.id}>
              <PipelineNode
                step={step}
                index={i}
                activeIndex={activeIndex}
                onClick={() => {
                  if (i <= activeIndex) {
                    // allow jumping back by resetting to that step
                    runAllRef.current = false;
                    setIsRunningAll(false);
                    setTraversingIndex(null);
                    setActiveIndex(i);
                  }
                }}
              />
              {i < STEPS.length - 1 && (
                <ConnectorLine
                  isTraversed={i < activeIndex}
                  isTraversing={traversingIndex === i}
                />
              )}
            </div>
          ))}
        </div>

        {/* Right: Terminal + description */}
        <div className="flex flex-col gap-4">
          {/* Description card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id + '-desc'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3"
            >
              <p className="text-xs text-secondary/90 leading-relaxed">
                <span className="font-semibold text-secondary">{activeStep.label}: </span>
                {activeStep.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Terminal output */}
          <AnimatePresence mode="wait">
            <TerminalPanel
              key={activeStep.id}
              lines={activeStep.terminalLines}
              stepId={activeStep.id}
            />
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              onClick={handleNext}
              disabled={isFinished || isRunningAll}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-secondary/20"
            >
              <SkipForward size={14} />
              Next Step
            </motion.button>

            <motion.button
              onClick={handleRunAll}
              disabled={isFinished || isRunningAll}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-primary/20"
            >
              {isRunningAll ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block"
                  >
                    <Play size={14} />
                  </motion.span>
                  Running…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run All
                </>
              )}
            </motion.button>

            <motion.button
              onClick={handleReset}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-muted/30 text-muted text-sm font-medium transition-colors hover:border-muted/50 hover:text-text"
            >
              <RotateCcw size={14} />
              Reset
            </motion.button>
          </div>
        </div>
      </div>

      {/* Educational insight footer */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mx-5 mb-5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-xs text-primary/90 font-semibold mb-1 uppercase tracking-wider">
                Key insight — Control plane is declarative, not imperative
              </p>
              <p className="text-xs text-text/70 leading-relaxed">
                You never told Kubernetes <em>how</em> to run your Pod — you declared <em>what</em> you want. Each control plane component (API Server, Scheduler, Kubelet) operates independently, watches etcd for changes, and reconciles actual state toward desired state in a continuous loop. This is the{' '}
                <span className="text-primary font-medium">control loop</span> pattern, and it makes Kubernetes self-healing: if a node dies, the scheduler simply re-reconciles.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-visible compact insight */}
      {!isFinished && (
        <div className="px-5 pb-4">
          <p className="text-[11px] text-muted/60 leading-relaxed border-t border-muted/10 pt-3">
            <span className="text-muted/80 font-semibold">How it works:</span> The API Server is the single entry point — all components communicate through it. etcd is the only stateful component. The Scheduler and Kubelet are stateless reconcilers.
          </p>
        </div>
      )}
    </div>
  );
}
