'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { RolloutSimulator, TroubleshootingFlowSimulator } from '@/components/simulations';
import { Heart, RefreshCw, AlertTriangle, Search, Clock, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'liveness',
    icon: <Heart className="w-5 h-5" />,
    label: 'Liveness',
    summary: 'Is the container stuck? Restart it.',
    detail:
      'A failing liveness probe tells Kubernetes the container is stuck in a bad state it cannot recover from on its own. Kubernetes will kill and restart the container. Be careful not to make the threshold too sensitive—unnecessary restarts can cause more harm than good.',
    color: 'primary',
  },
  {
    id: 'readiness',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Readiness',
    summary: 'Ready for traffic? Gate the Service.',
    detail:
      'A failing readiness probe removes the pod from the Service endpoints without killing it. This prevents traffic from reaching a pod that is still warming up, running migrations, or temporarily overloaded. The pod stays alive and can recover to ready status.',
    color: 'warning',
  },
  {
    id: 'startup',
    icon: <Clock className="w-5 h-5" />,
    label: 'Startup',
    summary: 'Still booting? Disable other probes.',
    detail:
      'Designed for slow-starting containers. While the startup probe has not yet succeeded, liveness and readiness probes are disabled. This prevents Kubernetes from killing a container that is legitimately still initializing—useful for JVM apps or containers that load large datasets on boot.',
    color: 'secondary',
  },
];

const COMMANDS = [
  { comment: '# Watch a rollout in progress', cmd: 'kubectl rollout status deploy/web' },
  { comment: '# Roll back to the previous version', cmd: 'kubectl rollout undo deploy/web' },
  { comment: '# See rollout history', cmd: 'kubectl rollout history deploy/web' },
];

export function Layer7Reliability() {
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
    <section id="section-7" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            <span className="text-warning">Reliability</span> and Rollouts
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Use probes, rollout strategy, and rollback to ship safely.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Health Checks: Probes</h3>
                <p className="text-muted mb-4">
                  Kubernetes does not just start your container and hope for the best. It
                  continuously checks whether your app is healthy using{' '}
                  <span className="text-primary">probes</span>. A liveness probe restarts stuck
                  containers. A readiness probe gates traffic—failing it removes the pod from
                  Service endpoints without killing it. A startup probe protects slow-starting apps.{' '}
                  <span className="text-primary">Click each probe</span> to understand when to use it.
                </p>
              </div>
            </div>

            {/* Interactive component cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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
              { type: 'command', content: 'kubectl rollout status deploy/web' },
              { type: 'output', content: 'deployment "web" successfully rolled out' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Rolling Update and Rollback
          </h3>
          <RolloutSimulator />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Search className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Troubleshooting: A Systematic Approach</h3>
                <p className="text-muted mb-4">
                  When something breaks, resist the urge to delete and redeploy. Instead, follow a
                  diagnostic sequence: start with{' '}
                  <span className="text-primary">kubectl get pods</span> to see the status, then{' '}
                  <span className="text-primary">kubectl logs</span> for application errors, then{' '}
                  <span className="text-primary">kubectl describe pod</span> for events and
                  conditions, then cluster-wide events. Each command reveals a different layer of the
                  problem.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.45} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Explore: Debug in the Right Order
          </h3>
          <TroubleshootingFlowSimulator />
        </FadeIn>

        <FadeIn delay={0.5} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Rollout Management</h4>
            <p className="text-sm text-muted mb-4">
              Rolling updates replace pods incrementally. If something goes wrong, rollback instantly.
              Click any command to copy it.
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
            <p>Probes keep your app honest. Rolling updates keep deployments safe. When things break, diagnose before you delete.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
