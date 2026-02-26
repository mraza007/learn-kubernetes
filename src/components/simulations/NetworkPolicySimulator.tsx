'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldOff, ArrowRight, Check, X, Zap } from 'lucide-react';

interface Pod {
  id: string;
  name: string;
  label: string;
  color: string;
}

interface TrafficTest {
  id: number;
  from: string;
  to: string;
  allowed: boolean;
}

const PODS: Pod[] = [
  { id: 'frontend', name: 'frontend', label: 'role=frontend', color: 'secondary' },
  { id: 'api', name: 'api', label: 'role=api', color: 'primary' },
  { id: 'database', name: 'database', label: 'role=database', color: 'warning' },
];

let testId = 0;

export function NetworkPolicySimulator() {
  const [policyActive, setPolicyActive] = useState(false);
  const [sendingFrom, setSendingFrom] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [tests, setTests] = useState<TrafficTest[]>([]);
  const [lastResult, setLastResult] = useState<{ allowed: boolean; from: string; to: string } | null>(null);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current = [];
    };
  }, []);

  const isBlocked = useCallback(
    (from: string, to: string): boolean => {
      if (!policyActive) return false;
      // Policy selects database pod, only allows ingress from role=api
      if (to === 'database' && from !== 'api') return true;
      return false;
    },
    [policyActive],
  );

  const sendTraffic = (from: string, to: string) => {
    if (animating || from === to) return;
    setAnimating(true);
    setSendingFrom(from);
    setSendingTo(to);
    setLastResult(null);

    const timeoutId = setTimeout(() => {
      if (!isMounted.current) return;

      const allowed = !isBlocked(from, to);
      testId++;
      setTests((prev) => [{ id: testId, from, to, allowed }, ...prev].slice(0, 8));
      setLastResult({ allowed, from, to });
      setSendingFrom(null);
      setSendingTo(null);
      setAnimating(false);
    }, 800);
    timeoutIds.current.push(timeoutId);
  };

  const getColorClasses = (color: string) => {
    const map: Record<string, { border: string; bg: string; text: string }> = {
      secondary: { border: 'border-secondary/50', bg: 'bg-secondary/15', text: 'text-secondary' },
      primary: { border: 'border-primary/50', bg: 'bg-primary/15', text: 'text-primary' },
      warning: { border: 'border-warning/50', bg: 'bg-warning/15', text: 'text-warning' },
    };
    return map[color] || map.primary;
  };

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">NetworkPolicy Simulator</h3>
        <motion.div
          animate={policyActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: policyActive ? Infinity : 0, duration: 2 }}
          className={`flex items-center gap-1.5 text-xs font-mono ${policyActive ? 'text-warning' : 'text-primary'}`}
        >
          {policyActive ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          {policyActive ? 'Policy active' : 'No policy'}
        </motion.div>
      </div>

      {/* Pod Network Visualization */}
      <div className="relative rounded-lg border border-muted/20 bg-background p-6">
        <div className="flex items-center justify-between gap-4">
          {PODS.map((pod) => {
            const colors = getColorClasses(pod.color);
            const isSource = sendingFrom === pod.id;
            const isTarget = sendingTo === pod.id;
            const isProtected = policyActive && pod.id === 'database';

            return (
              <motion.div
                key={pod.id}
                animate={
                  isTarget
                    ? { scale: [1, 1.05, 1] }
                    : isSource
                      ? { scale: [1, 0.95, 1] }
                      : {}
                }
                transition={{ duration: 0.4 }}
                className={`relative flex-1 rounded-xl border-2 p-4 text-center transition-all duration-300 ${
                  isProtected
                    ? 'border-warning/60 bg-warning/10'
                    : lastResult && lastResult.to === pod.id
                      ? lastResult.allowed
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-danger/60 bg-danger/10'
                      : `${colors.border} ${colors.bg}`
                }`}
              >
                {isProtected && (
                  <motion.div
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-warning text-background text-[10px] font-bold px-2 py-0.5 rounded-full"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    PROTECTED
                  </motion.div>
                )}
                <div className={`text-sm font-bold ${colors.text}`}>{pod.name}</div>
                <div className="text-xs text-muted mt-1 font-mono">{pod.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Animated connection arrows */}
        <div className="mt-4 flex justify-center gap-3 flex-wrap">
          {PODS.map((from) =>
            PODS.filter((to) => to.id !== from.id).map((to) => {
              const blocked = isBlocked(from.id, to.id);
              return (
                <motion.button
                  key={`${from.id}-${to.id}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendTraffic(from.id, to.id)}
                  disabled={animating}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-all ${
                    blocked
                      ? 'border-danger/40 text-danger hover:bg-danger/10'
                      : 'border-muted/30 text-muted hover:text-primary hover:border-primary/40'
                  } disabled:opacity-40`}
                >
                  <span>{from.name}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{to.name}</span>
                  {blocked && <X className="w-3 h-3 text-danger" />}
                </motion.button>
              );
            }),
          )}
        </div>
      </div>

      {/* Last Result */}
      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={`result-${testId}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg border p-3 flex items-center gap-3 ${
              lastResult.allowed
                ? 'border-primary/40 bg-primary/10'
                : 'border-danger/40 bg-danger/10'
            }`}
          >
            {lastResult.allowed ? (
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-danger flex-shrink-0" />
            )}
            <div className="text-sm">
              <span className="font-mono">{lastResult.from}</span>
              <span className="text-muted mx-2">→</span>
              <span className="font-mono">{lastResult.to}</span>
              <span className={`ml-2 font-semibold ${lastResult.allowed ? 'text-primary' : 'text-danger'}`}>
                {lastResult.allowed ? 'ALLOWED' : 'BLOCKED'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setPolicyActive((prev) => !prev);
          setLastResult(null);
        }}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          policyActive
            ? 'bg-warning/15 text-warning border border-warning/40 hover:bg-warning/25'
            : 'bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25'
        }`}
      >
        {policyActive ? (
          <>
            <ShieldOff className="w-4 h-4" />
            Remove NetworkPolicy (allow all)
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Apply NetworkPolicy on database
          </>
        )}
      </motion.button>

      {/* Traffic Log */}
      <AnimatePresence>
        {tests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-lg border border-muted/20 bg-terminal p-3 space-y-1"
          >
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Traffic Log</div>
            {tests.map((test) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono flex items-center gap-2 ${
                  test.allowed ? 'text-primary' : 'text-danger'
                }`}
              >
                <Zap className="w-3 h-3 flex-shrink-0" />
                <span className="text-text">{test.from}</span>
                <ArrowRight className="w-3 h-3 text-muted" />
                <span className="text-text">{test.to}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  test.allowed ? 'bg-primary/20 text-primary' : 'bg-danger/20 text-danger'
                }`}>
                  {test.allowed ? 'OK' : 'DENY'}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={policyActive ? 'active' : 'inactive'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed"
        >
          {policyActive ? (
            <>
              <span className="text-warning font-semibold">Policy active.</span> A NetworkPolicy selects pods
              with <code className="text-text bg-surface px-1 rounded">role=database</code>. Only ingress from{' '}
              <code className="text-text bg-surface px-1 rounded">role=api</code> is allowed. Frontend is blocked.
              Traffic between frontend and api is unaffected (no policy selects api).
            </>
          ) : (
            <>
              <span className="text-primary font-semibold">No policies.</span> Kubernetes allows all pod-to-pod traffic
              by default. Every pod can reach every other pod. Apply a NetworkPolicy to restrict ingress on the database pod.
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
