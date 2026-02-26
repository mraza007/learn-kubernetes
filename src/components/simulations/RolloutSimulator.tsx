'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Zap, Shield, Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PodStatus = 'Running' | 'Creating' | 'Terminating';
type PodVersion = 'v1' | 'v2';

interface Pod {
  id: string;
  version: PodVersion;
  status: PodStatus;
  name: string;
}

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

type SimulationPhase = 'idle' | 'rolling' | 'complete' | 'rolling-back' | 'rolled-back';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function buildInitialPods(): Pod[] {
  return [1, 2, 3, 4].map((i) => ({
    id: `v1-${i}`,
    version: 'v1',
    status: 'Running',
    name: `my-app-v1-${randomSuffix()}`,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated status indicator dot */
function StatusDot({ status }: { status: PodStatus }) {
  if (status === 'Running') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
      </span>
    );
  }
  if (status === 'Creating') {
    return (
      <motion.span
        className="inline-flex h-2 w-2 rounded-full bg-amber-400"
        animate={{ rotate: 360, scale: [1, 1.3, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
    );
  }
  // Terminating
  return (
    <motion.span
      className="inline-flex h-2 w-2 rounded-full bg-rose-500"
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity }}
    />
  );
}

/** A single pod card */
function PodCard({ pod }: { pod: Pod }) {
  const isV2 = pod.version === 'v2';

  const borderColor =
    pod.status === 'Terminating'
      ? 'border-rose-500/60'
      : pod.status === 'Creating'
        ? 'border-amber-400/60'
        : isV2
          ? 'border-teal-400/60'
          : 'border-blue-400/60';

  const bgColor =
    pod.status === 'Terminating'
      ? 'bg-rose-500/10'
      : pod.status === 'Creating'
        ? 'bg-amber-400/10'
        : isV2
          ? 'bg-teal-400/10'
          : 'bg-blue-400/10';

  const versionColor = isV2 ? 'text-teal-400' : 'text-blue-400';

  const statusLabel =
    pod.status === 'Running'
      ? 'Running'
      : pod.status === 'Creating'
        ? 'Creating...'
        : 'Terminating...';

  const statusColor =
    pod.status === 'Terminating'
      ? 'text-rose-400'
      : pod.status === 'Creating'
        ? 'text-amber-400'
        : 'text-teal-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7, y: -20 }}
      animate={{
        opacity: pod.status === 'Terminating' ? 0.45 : 1,
        scale: pod.status === 'Creating' ? [1, 1.03, 1] : 1,
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.6, y: 20 }}
      transition={{
        layout: { duration: 0.4 },
        opacity: { duration: 0.35 },
        scale: pod.status === 'Creating'
          ? { duration: 0.8, repeat: Infinity }
          : { duration: 0.3 },
        y: { duration: 0.35 },
      }}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border ${borderColor} ${bgColor} px-3 py-3 w-[88px] select-none`}
    >
      {/* Version badge */}
      <span
        className={`font-mono text-base font-bold tracking-widest ${versionColor}`}
      >
        {pod.version}
      </span>

      {/* Status dot + label */}
      <div className="flex items-center gap-1.5">
        <StatusDot status={pod.status} />
        <span className={`text-[10px] font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Pod name truncated */}
      <span
        className="text-[9px] text-muted font-mono truncate w-full text-center"
        title={pod.name}
      >
        {pod.name}
      </span>
    </motion.div>
  );
}

/** A single log line */
function LogLine({ entry }: { entry: LogEntry }) {
  const color =
    entry.type === 'success'
      ? 'text-teal-400'
      : entry.type === 'warn'
        ? 'text-amber-400'
        : entry.type === 'error'
          ? 'text-rose-400'
          : 'text-blue-300/80';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-2 font-mono text-[11px] leading-relaxed"
    >
      <span className="text-muted shrink-0">{entry.time}</span>
      <span className={color}>{entry.message}</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RolloutSimulator() {
  const [pods, setPods] = useState<Pod[]>(buildInitialPods);
  const [phase, setPhase] = useState<SimulationPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-scroll log (within container only)
  useEffect(() => {
    const el = logEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLog((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, time: timestamp(), message, type },
      ]);
    },
    [],
  );

  function scheduleTimeout(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }

  function clearAllTimeouts() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }

  // ---------------------------------------------------------------------------
  // Rolling update: replaces v1 pods with v2 one at a time
  // ---------------------------------------------------------------------------
  function startRollout() {
    clearAllTimeouts();
    setPhase('rolling');
    setProgress(0);
    setLog([]);

    // Snapshot which pods to replace (all 4 v1 pods)
    const initialPods = buildInitialPods();
    setPods(initialPods);

    addLog('Rollout started — strategy: RollingUpdate', 'info');
    addLog('maxSurge: 1 | maxUnavailable: 0', 'info');

    const STEP_DURATION = 1400; // ms per pod replacement cycle
    const totalPods = 4;

    for (let i = 0; i < totalPods; i++) {
      const podIndex = i;
      const baseDelay = i * STEP_DURATION * 2.2;

      // Phase A: create v2 pod (surge +1)
      scheduleTimeout(() => {
        const newPodName = `my-app-v2-${randomSuffix()}`;
        const newPodId = `v2-${podIndex + 1}-${Date.now()}`;

        addLog(`Creating pod ${newPodName}...`, 'warn');

        setPods((prev) => {
          const next = [...prev];
          // Insert v2 "Creating" pod after current last pod
          next.push({
            id: newPodId,
            version: 'v2',
            status: 'Creating',
            name: newPodName,
          });
          return next;
        });

        // Phase B: v2 pod becomes Ready
        scheduleTimeout(() => {
          addLog(`Pod ${newPodName} is Ready`, 'success');

          setPods((prev) =>
            prev.map((p) =>
              p.id === newPodId ? { ...p, status: 'Running' } : p,
            ),
          );

          // Phase C: mark old v1 pod as Terminating
          scheduleTimeout(() => {
            setPods((prev) => {
              const v1RunningIndex = prev.findIndex(
                (p) => p.version === 'v1' && p.status === 'Running',
              );
              if (v1RunningIndex === -1) return prev;
              const terminatingPod = prev[v1RunningIndex];
              addLog(`Terminating pod ${terminatingPod.name}`, 'error');
              const next = [...prev];
              next[v1RunningIndex] = { ...terminatingPod, status: 'Terminating' };
              return next;
            });

            // Phase D: remove the terminated v1 pod
            scheduleTimeout(() => {
              setPods((prev) => {
                const v1TermIdx = prev.findIndex(
                  (p) => p.version === 'v1' && p.status === 'Terminating',
                );
                if (v1TermIdx === -1) return prev;
                const removed = prev[v1TermIdx];
                addLog(`Pod ${removed.name} deleted`, 'info');
                const next = [...prev];
                next.splice(v1TermIdx, 1);
                return next;
              });

              const completedCount = podIndex + 1;
              setProgress(Math.round((completedCount / totalPods) * 100));

              if (completedCount === totalPods) {
                scheduleTimeout(() => {
                  setPhase('complete');
                  addLog('Rollout complete — all pods running v2', 'success');
                }, 400);
              }
            }, STEP_DURATION * 0.7);
          }, STEP_DURATION * 0.5);
        }, STEP_DURATION);
      }, baseDelay);
    }
  }

  // ---------------------------------------------------------------------------
  // Rollback: replaces v2 pods with v1 one at a time
  // ---------------------------------------------------------------------------
  function startRollback() {
    clearAllTimeouts();
    setPhase('rolling-back');
    setProgress(100);
    setLog([]);

    addLog('Rollback initiated — reverting to v1', 'warn');
    addLog('maxSurge: 1 | maxUnavailable: 0', 'info');

    const STEP_DURATION = 1400;
    const totalPods = 4;

    for (let i = 0; i < totalPods; i++) {
      const podIndex = i;
      const baseDelay = i * STEP_DURATION * 2.2;

      scheduleTimeout(() => {
        const newPodName = `my-app-v1-${randomSuffix()}`;
        const newPodId = `v1-rb-${podIndex + 1}-${Date.now()}`;

        addLog(`Creating pod ${newPodName}...`, 'warn');

        setPods((prev) => [
          ...prev,
          { id: newPodId, version: 'v1', status: 'Creating', name: newPodName },
        ]);

        scheduleTimeout(() => {
          addLog(`Pod ${newPodName} is Ready`, 'success');
          setPods((prev) =>
            prev.map((p) => (p.id === newPodId ? { ...p, status: 'Running' } : p)),
          );

          scheduleTimeout(() => {
            setPods((prev) => {
              const v2RunningIndex = prev.findIndex(
                (p) => p.version === 'v2' && p.status === 'Running',
              );
              if (v2RunningIndex === -1) return prev;
              const terminatingPod = prev[v2RunningIndex];
              addLog(`Terminating pod ${terminatingPod.name}`, 'error');
              const next = [...prev];
              next[v2RunningIndex] = { ...terminatingPod, status: 'Terminating' };
              return next;
            });

            scheduleTimeout(() => {
              setPods((prev) => {
                const v2TermIdx = prev.findIndex(
                  (p) => p.version === 'v2' && p.status === 'Terminating',
                );
                if (v2TermIdx === -1) return prev;
                const removed = prev[v2TermIdx];
                addLog(`Pod ${removed.name} deleted`, 'info');
                const next = [...prev];
                next.splice(v2TermIdx, 1);
                return next;
              });

              const completedCount = podIndex + 1;
              setProgress(Math.round(((totalPods - completedCount) / totalPods) * 100));

              if (completedCount === totalPods) {
                scheduleTimeout(() => {
                  setPhase('rolled-back');
                  addLog('Rollback complete — all pods running v1', 'success');
                }, 400);
              }
            }, STEP_DURATION * 0.7);
          }, STEP_DURATION * 0.5);
        }, STEP_DURATION);
      }, baseDelay);
    }
  }

  function reset() {
    clearAllTimeouts();
    setPhase('idle');
    setProgress(0);
    setLog([]);
    setPods(buildInitialPods());
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isRolling = phase === 'rolling' || phase === 'rolling-back';
  const canRollback = phase === 'complete';
  const canDeploy = phase === 'idle' || phase === 'rolled-back';

  const progressBarColor =
    phase === 'rolling-back'
      ? 'from-amber-500 to-rose-500'
      : progress === 100
        ? 'from-teal-500 to-blue-500'
        : 'from-blue-500 to-teal-500';

  const phaseLabel: Record<SimulationPhase, string> = {
    idle: 'Ready to deploy',
    rolling: 'Rolling update in progress...',
    complete: 'Rollout complete',
    'rolling-back': 'Rolling back to v1...',
    'rolled-back': 'Rolled back to v1',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101b2e] p-5 space-y-5 font-mono">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-sans font-semibold text-[#dbeafe]">
              Rolling Update Simulator
            </span>
          </div>
          <p className="text-[11px] text-[#6b7e9f]">
            Deployment: <span className="text-blue-400">my-app</span>
            &nbsp;&bull;&nbsp;
            Strategy: <span className="text-teal-400">RollingUpdate</span>
          </p>
        </div>

        {/* Strategy badge */}
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#080f1b] px-3 py-1.5 text-[10px]">
          <Shield className="w-3 h-3 text-[#6b7e9f]" />
          <span className="text-[#6b7e9f]">maxSurge:</span>
          <span className="text-amber-400 font-bold">1</span>
          <span className="text-[#6b7e9f] mx-1">|</span>
          <span className="text-[#6b7e9f]">maxUnavailable:</span>
          <span className="text-teal-400 font-bold">0</span>
        </div>
      </div>

      {/* Pod grid */}
      <div className="rounded-xl border border-white/[0.07] bg-[#080f1b] p-4">
        <p className="text-[10px] text-[#6b7e9f] mb-3 uppercase tracking-widest">
          Pods ({pods.length})
        </p>
        <motion.div
          layout
          className="flex flex-wrap gap-2.5 min-h-[80px]"
        >
          <AnimatePresence mode="popLayout">
            {pods.map((pod) => (
              <PodCard key={pod.id} pod={pod} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-[#6b7e9f]">{phaseLabel[phase]}</span>
          <span className="text-[#dbeafe] font-bold">{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${progressBarColor}`}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {/* Version legend */}
        <div className="flex gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-blue-400" />
            <span className="text-[10px] text-[#6b7e9f]">v1 (old)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-teal-400" />
            <span className="text-[10px] text-[#6b7e9f]">v2 (new)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
            <span className="text-[10px] text-[#6b7e9f]">Creating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-rose-500" />
            <span className="text-[10px] text-[#6b7e9f]">Terminating</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startRollout}
          disabled={!canDeploy || isRolling}
          className="flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/10 px-3.5 py-2 text-[12px] text-teal-400 font-sans font-medium transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5" />
          Deploy v2
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startRollback}
          disabled={!canRollback || isRolling}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-[12px] text-amber-400 font-sans font-medium transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Rollback to v1
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={reset}
          disabled={isRolling}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] text-[#6b7e9f] font-sans font-medium transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5" />
          Reset
        </motion.button>
      </div>

      {/* Event log */}
      <div className="rounded-xl border border-white/[0.07] bg-[#080f1b]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500/70" />
            <span className="w-2 h-2 rounded-full bg-amber-400/70" />
            <span className="w-2 h-2 rounded-full bg-teal-400/70" />
          </span>
          <span className="text-[11px] text-[#6b7e9f] tracking-widest uppercase">
            Event Log
          </span>
        </div>
        <div className="p-3 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence initial={false}>
            {log.length === 0 ? (
              <p className="text-[11px] text-[#6b7e9f] italic">
                No events yet — click Deploy v2 to start.
              </p>
            ) : (
              log.map((entry) => <LogLine key={entry.id} entry={entry} />)
            )}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Key insight */}
      <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 px-4 py-3 flex gap-3">
        <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-blue-300/80 font-sans leading-relaxed">
          <span className="text-blue-400 font-semibold">Zero-downtime insight:</span>{' '}
          With <code className="text-teal-400">maxUnavailable: 0</code>, Kubernetes never
          terminates an old pod until a new pod has passed its readiness probe. Traffic
          is only routed to pods in the <span className="text-teal-400">Running</span> state,
          so end users see no service interruption even as pods are replaced one by one.
        </p>
      </div>
    </div>
  );
}
