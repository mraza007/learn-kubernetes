'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Zap, AlertTriangle, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PodStatus = 'creating' | 'running' | 'terminating' | 'crashed';

interface Pod {
  id: string;
  label: string;
  status: PodStatus;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let podCounter = 0;

function createPod(): Pod {
  podCounter += 1;
  return {
    id: `pod-${podCounter}-${Date.now()}`,
    label: `P${podCounter}`,
    status: 'creating',
    createdAt: Date.now(),
  };
}

// How long each lifecycle phase lasts (ms)
const CREATING_DURATION = 900;
const TERMINATING_DURATION = 700;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PodCardProps {
  pod: Pod;
  onKill: (id: string) => void;
}

function PodCard({ pod, onKill }: PodCardProps) {
  const isKillable = pod.status === 'running';

  const statusConfig: Record<
    PodStatus,
    { label: string; borderColor: string; bgColor: string; dotColor: string; glowClass: string }
  > = {
    creating: {
      label: 'Creating',
      borderColor: 'border-warning/60',
      bgColor: 'bg-warning/5',
      dotColor: 'bg-warning',
      glowClass: '',
    },
    running: {
      label: 'Running',
      borderColor: 'border-primary/50',
      bgColor: 'bg-primary/5',
      dotColor: 'bg-primary',
      glowClass: 'glow-primary',
    },
    terminating: {
      label: 'Terminating',
      borderColor: 'border-danger/50',
      bgColor: 'bg-danger/5',
      dotColor: 'bg-danger',
      glowClass: '',
    },
    crashed: {
      label: 'Crashed',
      borderColor: 'border-danger/70',
      bgColor: 'bg-danger/10',
      dotColor: 'bg-danger',
      glowClass: '',
    },
  };

  const cfg = statusConfig[pod.status];

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.4, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 380, damping: 22 },
    },
    exit: {
      opacity: 0,
      scale: 0.3,
      y: -10,
      transition: { duration: 0.35, ease: 'easeIn' as const },
    },
  };

  return (
    <motion.div
      layout="position"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`
        relative flex flex-col items-center justify-between
        rounded-lg border ${cfg.borderColor} ${cfg.bgColor} ${cfg.glowClass}
        p-3 w-[88px] h-[88px] cursor-default select-none
        transition-shadow duration-300
        ${isKillable ? 'hover:border-danger/70 hover:bg-danger/10 cursor-pointer group' : ''}
      `}
      onClick={() => isKillable && onKill(pod.id)}
      title={isKillable ? 'Click to simulate a crash' : undefined}
      whileHover={isKillable ? { scale: 1.06 } : undefined}
      whileTap={isKillable ? { scale: 0.94 } : undefined}
    >
      {/* Crash hint overlay */}
      {isKillable && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-danger/15 z-10">
          <span className="text-danger text-[10px] font-mono font-bold tracking-wider">KILL</span>
        </div>
      )}

      {/* Pod label */}
      <span className="font-mono font-bold text-base text-text z-0">{pod.label}</span>

      {/* Status indicator dot */}
      <div className="flex items-center gap-1 z-0">
        <motion.span
          className={`block w-2 h-2 rounded-full ${cfg.dotColor}`}
          animate={
            pod.status === 'creating'
              ? { opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }
              : pod.status === 'terminating' || pod.status === 'crashed'
              ? { opacity: [1, 0.3, 1] }
              : { opacity: 1, scale: 1 }
          }
          transition={
            pod.status === 'creating' || pod.status === 'terminating' || pod.status === 'crashed'
              ? { repeat: Infinity, duration: 0.7, ease: 'easeInOut' }
              : {}
          }
        />
        <span className="font-mono text-[10px] text-muted">{cfg.label}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

interface StatusBarProps {
  desired: number;
  actual: number;
  isReconciling: boolean;
}

function StatusBar({ desired, actual, isReconciling }: StatusBarProps) {
  const inSync = desired === actual && !isReconciling;
  const drift = desired - actual;

  return (
    <div
      className={`
        flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 font-mono text-sm
        transition-colors duration-500
        ${inSync ? 'border-primary/40 bg-primary/5' : 'border-warning/40 bg-warning/5'}
      `}
    >
      <span className="text-muted">
        Desired: <span className="text-secondary font-bold">{desired}</span>
      </span>
      <span className="text-muted">
        Actual: <span className="text-primary font-bold">{actual}</span>
      </span>

      {inSync ? (
        <span className="flex items-center gap-1.5 text-primary font-semibold">
          <CheckCircle2 size={13} />
          In sync
        </span>
      ) : isReconciling ? (
        <span className="flex items-center gap-1.5 text-warning font-semibold">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="inline-flex"
          >
            <RefreshCw size={13} />
          </motion.span>
          Reconciling&hellip; ({drift > 0 ? `+${drift}` : drift} pods)
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-warning">
          <AlertTriangle size={13} />
          Drift detected
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log line
// ---------------------------------------------------------------------------

interface LogEntry {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'success';
  ts: number;
}

let logId = 0;

function makeLog(text: string, level: LogEntry['level'] = 'info'): LogEntry {
  logId += 1;
  return { id: logId, text, level, ts: Date.now() };
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DesiredStateSimulator() {
  const [desired, setDesired] = useState(3);
  const [pods, setPods] = useState<Pod[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    makeLog('Controller started. Watching pod state...', 'info'),
  ]);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);
  const isReconciling = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
      if (reconcileTimerRef.current) {
        clearTimeout(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Log helpers
  // ---------------------------------------------------------------------------

  const pushLog = useCallback((text: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => {
      const next = [...prev, makeLog(text, level)];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  }, []);

  // Auto-scroll logs (within the log container only)
  useEffect(() => {
    const el = logsEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // ---------------------------------------------------------------------------
  // Reconciliation loop
  // ---------------------------------------------------------------------------

  const runningCount = useCallback(
    (currentPods: Pod[]) =>
      currentPods.filter((p) => p.status === 'running' || p.status === 'creating').length,
    []
  );

  const scheduleReconcile = useCallback(() => {
    if (reconcileTimerRef.current) return; // already scheduled

    const delayTimerId = setTimeout(() => {
      if (!isMounted.current) return;

      reconcileTimerRef.current = null;

      // Track whether a pod-lifecycle action was taken so we can choose
      // the correct re-arm delay (longer when an animation is in flight).
      let actionTaken = false;

      setPods((currentPods) => {
        const effective = runningCount(currentPods);

        if (effective === desired) {
          isReconciling.current = false;
          return currentPods;
        }

        isReconciling.current = true;
        actionTaken = true;

        if (effective < desired) {
          // Spawn one pod
          const newPod = createPod();
          pushLog(`Creating pod ${newPod.label} (${effective} → ${desired})`, 'info');

          // Transition it to running after CREATING_DURATION
          const createDoneId = setTimeout(() => {
            if (!isMounted.current) return;

            setPods((prev) =>
              prev.map((p) => (p.id === newPod.id ? { ...p, status: 'running' } : p))
            );
            pushLog(`Pod ${newPod.label} is Running`, 'success');
          }, CREATING_DURATION);
          timeoutIdsRef.current.push(createDoneId);

          return [...currentPods, newPod];
        } else {
          // Find the newest non-terminating pod to remove
          const toRemove = [...currentPods]
            .reverse()
            .find((p) => p.status === 'running' || p.status === 'creating');

          if (!toRemove) return currentPods;

          pushLog(`Terminating pod ${toRemove.label} (${effective} → ${desired})`, 'warn');

          // Mark as terminating, then fully remove
          const removePodId = setTimeout(() => {
            if (!isMounted.current) return;
            setPods((prev) => prev.filter((p) => p.id !== toRemove.id));
            pushLog(`Pod ${toRemove.label} terminated`, 'warn');
          }, TERMINATING_DURATION);
          timeoutIdsRef.current.push(removePodId);

          return currentPods.map((p) =>
            p.id === toRemove.id ? { ...p, status: 'terminating' as PodStatus } : p
          );
        }
      });

      // Re-arm the loop: wait for the current animation to finish before
      // checking again; if nothing changed a short idle poll is enough.
      const delay = actionTaken
        ? Math.max(CREATING_DURATION, TERMINATING_DURATION) + 150
        : 500;
      const rescheduleId = setTimeout(() => {
        if (!isMounted.current) return;
        reconcileTimerRef.current = null;
        scheduleReconcile();
      }, delay);
      timeoutIdsRef.current.push(rescheduleId);
    }, 300);
    timeoutIdsRef.current.push(delayTimerId);
    reconcileTimerRef.current = delayTimerId;
  }, [desired, pushLog, runningCount]);

  // Kick the loop whenever desired or pods change
  useEffect(() => {
    scheduleReconcile();
    return () => {
      if (reconcileTimerRef.current) {
        clearTimeout(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };
  }, [desired, scheduleReconcile]);

  // ---------------------------------------------------------------------------
  // Pod interactions
  // ---------------------------------------------------------------------------

  const handleKillPod = useCallback(
    (id: string) => {
      setPods((currentPods) => {
        const target = currentPods.find((p) => p.id === id);
        if (!target || target.status !== 'running') return currentPods;

        pushLog(`Pod ${target.label} crashed!  Controller will replace it.`, 'warn');

        // Mark crashed, then remove so reconciler adds a replacement
        const crashClearId = setTimeout(() => {
          if (!isMounted.current) return;
          setPods((prev) => prev.filter((p) => p.id !== id));
          // scheduleReconcile will fire naturally via the useEffect below
        }, TERMINATING_DURATION);
        timeoutIdsRef.current.push(crashClearId);

        return currentPods.map((p) =>
          p.id === id ? { ...p, status: 'crashed' as PodStatus } : p
        );
      });
    },
    [pushLog]
  );

  // Re-trigger reconciler when pods list changes (e.g. after a crash removal)
  useEffect(() => {
    scheduleReconcile();
  }, [pods.length, scheduleReconcile]);

  // ---------------------------------------------------------------------------
  // Desired controls
  // ---------------------------------------------------------------------------

  const decreaseDesired = () => {
    setDesired((v) => {
      const next = Math.max(0, v - 1);
      pushLog(`Desired state changed: ${v} → ${next}`, 'info');
      return next;
    });
  };

  const increaseDesired = () => {
    setDesired((v) => {
      const next = Math.min(10, v + 1);
      pushLog(`Desired state changed: ${v} → ${next}`, 'info');
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Derived state for display
  // ---------------------------------------------------------------------------

  const activePodCount = pods.filter(
    (p) => p.status === 'running' || p.status === 'creating'
  ).length;

  const reconciling =
    activePodCount !== desired || pods.some((p) => p.status === 'creating' || p.status === 'terminating' || p.status === 'crashed');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-muted/30 bg-surface space-y-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-muted/20 px-5 py-3 bg-terminal/40">
        <Zap size={15} className="text-primary" />
        <span className="font-mono text-sm font-semibold text-primary tracking-wider">
          RECONCILIATION CONTROLLER
        </span>
        <span className="ml-auto font-mono text-xs text-muted">ReplicaSet / watch loop</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Status bar */}
        <StatusBar desired={desired} actual={activePodCount} isReconciling={reconciling} />

        {/* Desired state control */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-1">
              Desired Replicas
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={decreaseDesired}
                disabled={desired <= 0}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-muted/40 bg-terminal text-text hover:border-danger/60 hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={14} />
              </motion.button>

              <motion.span
                key={desired}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="font-mono text-4xl font-bold text-secondary w-12 text-center tabular-nums"
              >
                {desired}
              </motion.span>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={increaseDesired}
                disabled={desired >= 10}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-muted/40 bg-terminal text-text hover:border-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} />
              </motion.button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-1">
              Running Pods
            </p>
            <motion.span
              key={activePodCount}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-mono text-4xl font-bold text-primary tabular-nums"
            >
              {activePodCount}
            </motion.span>
          </div>
        </div>

        {/* Pod grid */}
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">
            Pod Instances
            {pods.some((p) => p.status === 'running') && (
              <span className="ml-2 text-muted/60 normal-case tracking-normal">
                — click a running pod to simulate crash
              </span>
            )}
          </p>

          <div className="min-h-[100px] rounded-lg border border-muted/20 bg-background/40 p-3">
            {pods.length === 0 ? (
              <div className="flex items-center justify-center h-[76px]">
                <span className="text-muted font-mono text-sm">
                  {desired === 0 ? 'Scale-down complete. No pods scheduled.' : 'Waiting for pods…'}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <AnimatePresence mode="popLayout">
                  {pods.map((pod) => (
                    <PodCard key={pod.id} pod={pod} onKill={handleKillPod} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Controller log */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={13} className="text-muted" />
            <p className="text-xs text-muted font-mono uppercase tracking-widest">
              Controller Log
            </p>
          </div>
          <div className="h-32 overflow-y-auto rounded-lg border border-muted/20 bg-terminal px-3 py-2 space-y-0.5 font-mono text-xs">
            <AnimatePresence initial={false}>
              {logs.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 leading-5"
                >
                  <span className="text-muted/50 shrink-0">{formatTs(entry.ts)}</span>
                  <span
                    className={
                      entry.level === 'success'
                        ? 'text-primary'
                        : entry.level === 'warn'
                        ? 'text-warning'
                        : 'text-text/70'
                    }
                  >
                    {entry.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Educational insight */}
      <div className="border-t border-muted/20 bg-terminal/30 px-5 py-4 space-y-1.5">
        <p className="font-mono text-xs text-primary font-semibold uppercase tracking-widest">
          How the reconciliation loop works
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Kubernetes controllers run a continuous{' '}
          <span className="text-text">observe &rarr; diff &rarr; act</span> loop. Every few
          seconds the ReplicaSet controller compares{' '}
          <span className="text-secondary font-semibold">desired state</span> (what you declared
          in YAML) against{' '}
          <span className="text-primary font-semibold">actual state</span> (what is alive in the
          cluster). If they diverge it creates or deletes pods{' '}
          <span className="text-text">one at a time</span> until they match — including after
          crashes. You never imperatively command &ldquo;start a pod&rdquo;; you just update a
          number and the control plane makes it true.
        </p>
      </div>
    </div>
  );
}
