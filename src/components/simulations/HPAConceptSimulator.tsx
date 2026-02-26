'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Gauge, Cpu, Zap } from 'lucide-react';

const HPA_MIN = 1;
const HPA_MAX = 6;
const TARGET_CPU = 50;
const CPU_FLOOR = 10;
const CPU_CEIL = 100;

function clampCpu(value: number): number {
  return Math.max(CPU_FLOOR, Math.min(CPU_CEIL, value));
}

interface HPAEvent {
  id: number;
  message: string;
  type: 'scale-up' | 'scale-down' | 'stable';
}

let eventId = 0;

export function HPAConceptSimulator() {
  const [replicas, setReplicas] = useState(2);
  const [cpu, setCpu] = useState(30);
  const [events, setEvents] = useState<HPAEvent[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const evaluationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (evaluationTimer.current) {
        clearTimeout(evaluationTimer.current);
        evaluationTimer.current = null;
      }
    };
  }, []);

  const addEvent = useCallback((message: string, type: HPAEvent['type']) => {
    eventId++;
    setEvents((prev) => [{ id: eventId, message, type }, ...prev].slice(0, 6));
  }, []);

  const addTraffic = () => {
    setCpu((prev) => clampCpu(prev + 20));
  };

  const removeTraffic = () => {
    setCpu((prev) => clampCpu(prev - 20));
  };

  const evaluate = () => {
    setEvaluating(true);
    if (evaluationTimer.current) {
      clearTimeout(evaluationTimer.current);
    }

    evaluationTimer.current = setTimeout(() => {
      if (!isMounted.current) return;

      if (cpu > TARGET_CPU && replicas < HPA_MAX) {
        setReplicas((prev) => prev + 1);
        setCpu((prev) => clampCpu(prev - 15));
        addEvent(
          `Scaled up: CPU ${cpu}% > target ${TARGET_CPU}%. Replicas ${replicas} → ${replicas + 1}`,
          'scale-up',
        );
      } else if (cpu < 30 && replicas > HPA_MIN) {
        setReplicas((prev) => prev - 1);
        setCpu((prev) => clampCpu(prev + 10));
        addEvent(
          `Scaled down: CPU ${cpu}% < 30%. Replicas ${replicas} → ${replicas - 1}`,
          'scale-down',
        );
      } else if (cpu > TARGET_CPU && replicas >= HPA_MAX) {
        addEvent(`At max replicas (${HPA_MAX}). Cannot scale further.`, 'stable');
      } else if (cpu < 30 && replicas <= HPA_MIN) {
        addEvent(`At min replicas (${HPA_MIN}). Cannot scale down.`, 'stable');
      } else {
        addEvent(`CPU ${cpu}% within range (30%-${TARGET_CPU}%). No change.`, 'stable');
      }
      setEvaluating(false);
    }, 600);
  };

  const cpuColor = cpu > TARGET_CPU ? 'danger' : cpu < 30 ? 'primary' : 'warning';

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">HPA Autoscaler</h3>
        <div className="flex items-center gap-4 text-xs font-mono text-muted">
          <span>Target: <span className="text-warning">{TARGET_CPU}%</span></span>
          <span>Min: <span className="text-warning">{HPA_MIN}</span></span>
          <span>Max: <span className="text-warning">{HPA_MAX}</span></span>
        </div>
      </div>

      {/* CPU Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-secondary" />
            <span className="text-text">Avg CPU Utilization</span>
          </div>
          <motion.span
            key={cpu}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={`font-mono font-bold text-${cpuColor}`}
          >
            {cpu}%
          </motion.span>
        </div>
        <div className="relative h-4 rounded-full bg-background overflow-hidden">
          {/* Target line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-warning/80 z-10"
            style={{ left: `${TARGET_CPU}%` }}
          />
          <motion.div
            className={`h-full rounded-full bg-${cpuColor}`}
            animate={{ width: `${cpu}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted">
          <span>0%</span>
          <span className="text-warning">Target {TARGET_CPU}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Replica Pods */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text">Replicas</span>
          <span className="font-mono text-primary">{replicas} / {HPA_MAX}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {Array.from({ length: replicas }, (_, i) => (
              <motion.div
                key={`pod-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xs font-mono transition-colors ${
                    cpu > TARGET_CPU
                      ? 'border-danger/50 bg-danger/10 text-danger'
                      : 'border-primary/40 bg-primary/10 text-primary'
                  }`}
                >
                  P{i + 1}
                </div>
                {/* CPU load indicator per pod */}
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden bg-background">
                  <motion.div
                    className={`h-full bg-${cpuColor}/60`}
                    animate={{ width: `${Math.min(100, cpu / replicas * (0.8 + Math.random() * 0.4))}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Ghost slots for max */}
          {Array.from({ length: HPA_MAX - replicas }, (_, i) => (
            <div
              key={`ghost-${i}`}
              className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-muted/20 text-xs text-muted/30"
            >
              --
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={addTraffic}
          className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/20 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Add traffic
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={removeTraffic}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <TrendingDown className="w-4 h-4" />
          Remove traffic
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={evaluate}
          disabled={evaluating}
          className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50"
        >
          <motion.div animate={evaluating ? { rotate: 360 } : {}} transition={{ duration: 0.6 }}>
            <Gauge className="w-4 h-4" />
          </motion.div>
          {evaluating ? 'Evaluating...' : 'HPA Evaluate'}
        </motion.button>
      </div>

      {/* Events */}
      <AnimatePresence>
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-lg border border-muted/20 bg-terminal p-3 space-y-1"
          >
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">HPA Events</div>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono flex items-center gap-2 ${
                  event.type === 'scale-up'
                    ? 'text-warning'
                    : event.type === 'scale-down'
                      ? 'text-primary'
                      : 'text-muted'
                }`}
              >
                {event.type === 'scale-up' && <TrendingUp className="w-3 h-3 flex-shrink-0" />}
                {event.type === 'scale-down' && <TrendingDown className="w-3 h-3 flex-shrink-0" />}
                {event.type === 'stable' && <Zap className="w-3 h-3 flex-shrink-0" />}
                {event.message}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight */}
      <div className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed">
        <span className="text-primary font-semibold">Key insight:</span> The HPA checks metrics every 15s (default) and adjusts replicas to keep CPU near target.
        Scaling up spreads load, scaling down saves resources. Always set resource requests accurately — HPA compares actual usage against requested amounts.
      </div>
    </div>
  );
}
