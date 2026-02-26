'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, MemoryStick, Server, Box, AlertTriangle, Check, X } from 'lucide-react';

interface Node {
  name: string;
  totalCpu: number;
  totalMemory: number;
  usedCpu: number;
  usedMemory: number;
  taints?: string[];
}

interface PodPlacement {
  nodeName: string;
  reason: string;
}

export function SchedulerPlayground() {
  const [cpuReq, setCpuReq] = useState(1);
  const [memReq, setMemReq] = useState(2);
  const [scheduled, setScheduled] = useState<PodPlacement | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const nodes: Node[] = useMemo(
    () => [
      { name: 'node-1', totalCpu: 4, totalMemory: 8, usedCpu: 1, usedMemory: 3 },
      { name: 'node-2', totalCpu: 2, totalMemory: 4, usedCpu: 1, usedMemory: 2 },
      { name: 'node-3', totalCpu: 8, totalMemory: 16, usedCpu: 6, usedMemory: 12, taints: ['gpu=true:NoSchedule'] },
    ],
    [],
  );

  const getNodeFit = (node: Node) => {
    const availCpu = node.totalCpu - node.usedCpu;
    const availMem = node.totalMemory - node.usedMemory;
    const cpuFit = availCpu >= cpuReq;
    const memFit = availMem >= memReq;
    const hasTaint = (node.taints?.length ?? 0) > 0;
    return { availCpu, availMem, cpuFit, memFit, fits: cpuFit && memFit && !hasTaint, hasTaint };
  };

  const schedulePod = () => {
    setScheduling(true);
    setScheduled(null);

    if (!isMounted.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;

      const candidates = nodes
        .map((n) => ({ node: n, ...getNodeFit(n) }))
        .filter((c) => c.fits);

      if (candidates.length === 0) {
        setScheduled({ nodeName: '', reason: 'No node has sufficient resources or all suitable nodes are tainted.' });
      } else {
        // Pick the node with most available resources (spread strategy)
        const best = candidates.sort((a, b) => (b.availCpu + b.availMem) - (a.availCpu + a.availMem))[0];
        setScheduled({ nodeName: best.node.name, reason: `Best fit: ${best.availCpu} vCPU and ${best.availMem} Gi available.` });
      }
      setScheduling(false);
    }, 1200);
  };

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <h3 className="text-lg font-semibold text-text">Scheduler Playground</h3>
      <p className="text-sm text-muted">
        Set your pod&apos;s resource requests and see which node the scheduler picks.
      </p>

      {/* Resource Request Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="w-4 h-4 text-secondary" />
            <span className="text-text">CPU Request</span>
            <span className="ml-auto font-mono text-secondary">{cpuReq} vCPU</span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            value={cpuReq}
            onChange={(e) => {
              setCpuReq(Number(e.target.value));
              setScheduled(null);
            }}
            className="w-full accent-secondary"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MemoryStick className="w-4 h-4 text-primary" />
            <span className="text-text">Memory Request</span>
            <span className="ml-auto font-mono text-primary">{memReq} Gi</span>
          </div>
          <input
            type="range"
            min={1}
            max={16}
            value={memReq}
            onChange={(e) => {
              setMemReq(Number(e.target.value));
              setScheduled(null);
            }}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* Pod being scheduled */}
      <div className="flex items-center justify-center">
        <motion.div
          animate={scheduling ? { y: [0, -8, 0] } : {}}
          transition={{ repeat: scheduling ? Infinity : 0, duration: 0.6 }}
          className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/10 px-4 py-3 flex items-center gap-2"
        >
          <Box className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm text-primary">my-pod</span>
          <span className="text-xs text-muted ml-2">
            {cpuReq} vCPU / {memReq} Gi
          </span>
        </motion.div>
      </div>

      {/* Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {nodes.map((node) => {
          const fit = getNodeFit(node);
          const isSelected = scheduled?.nodeName === node.name;

          return (
            <motion.div
              key={node.name}
              animate={isSelected ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.5 }}
              className={`rounded-lg border-2 p-4 space-y-3 transition-all duration-300 ${
                isSelected
                  ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(45,212,191,0.15)]'
                  : scheduled && !isSelected
                    ? 'border-muted/20 bg-background opacity-50'
                    : 'border-muted/30 bg-background'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted" />
                  <span className="font-mono text-sm text-text">{node.name}</span>
                </div>
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
                {scheduled && !isSelected && scheduled.nodeName && (
                  <X className="w-4 h-4 text-muted/50" />
                )}
              </div>

              {/* CPU Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">CPU</span>
                  <span className={fit.cpuFit ? 'text-primary' : 'text-danger'}>
                    {node.totalCpu - node.usedCpu} / {node.totalCpu} free
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <motion.div
                    className="h-full bg-secondary/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(node.usedCpu / node.totalCpu) * 100}%` }}
                  />
                </div>
              </div>

              {/* Memory Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Memory</span>
                  <span className={fit.memFit ? 'text-primary' : 'text-danger'}>
                    {node.totalMemory - node.usedMemory} / {node.totalMemory} Gi free
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <motion.div
                    className="h-full bg-primary/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(node.usedMemory / node.totalMemory) * 100}%` }}
                  />
                </div>
              </div>

              {/* Taints */}
              {fit.hasTaint && (
                <div className="flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="w-3 h-3" />
                  Taint: {node.taints?.[0]}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Schedule Button */}
      <motion.button
        onClick={schedulePod}
        disabled={scheduling}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-lg border border-secondary/40 bg-secondary/15 px-4 py-3 text-sm font-semibold text-secondary hover:bg-secondary/25 transition-colors disabled:opacity-50"
      >
        {scheduling ? 'Scheduler evaluating nodes...' : 'Schedule Pod'}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {scheduled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg border p-3 text-sm ${
              scheduled.nodeName
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-danger/40 bg-danger/10 text-danger'
            }`}
          >
            {scheduled.nodeName ? (
              <>
                <span className="font-mono font-semibold">Scheduled</span> on{' '}
                <span className="font-mono">{scheduled.nodeName}</span> — {scheduled.reason}
              </>
            ) : (
              <>
                <span className="font-mono font-semibold">Pending</span> — {scheduled.reason}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight */}
      <div className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed">
        <span className="text-primary font-semibold">Key insight:</span> The scheduler filters nodes that can't fit the pod (insufficient resources or taints),
        then scores remaining candidates. Resource requests are guarantees — set them accurately so the scheduler makes good decisions.
      </div>
    </div>
  );
}
