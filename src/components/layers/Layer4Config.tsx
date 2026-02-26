'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { ConfigAccessPlayground } from '@/components/simulations';
import { Settings, Lock, Users, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'configmap',
    icon: <Settings className="w-5 h-5" />,
    label: 'ConfigMap',
    summary: 'Plain key-value config, mounted as files or env vars',
    detail:
      'Stores non-sensitive configuration data as key-value pairs. Pods consume ConfigMaps either as environment variables or as files mounted into a volume. When you update a ConfigMap, mounted files update automatically (with a short delay); env vars require a pod restart.',
    color: 'primary',
  },
  {
    id: 'secret',
    icon: <Lock className="w-5 h-5" />,
    label: 'Secret',
    summary: 'Base64-encoded sensitive data, enable encryption at rest separately',
    detail:
      'Holds sensitive data like passwords, tokens, and TLS certificates. Values are base64-encoded (not encrypted by default)—enable EncryptionConfiguration or use an external secrets manager for real security. Avoid printing Secrets in logs or environment variable dumps.',
    color: 'warning',
  },
];

const COMMANDS = [
  { comment: '# List namespaces', cmd: 'kubectl get namespaces' },
  { comment: '# Set a CPU quota on a namespace', cmd: 'kubectl apply -f quota.yaml -n staging' },
  { comment: '# Check quota usage', cmd: 'kubectl describe resourcequota -n staging' },
];

export function Layer4Config() {
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
    <section id="section-4" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            Config, <span className="text-warning">Secrets</span>, and Access
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Separate config from secrets and bind least-privilege access.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Settings className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Separating Config from Code</h3>
                <p className="text-muted mb-4">
                  Hardcoding database URLs or API keys into container images is a recipe for pain.
                  Kubernetes separates configuration from code using two objects:{' '}
                  <span className="text-primary">ConfigMaps</span> for non-sensitive data and{' '}
                  <span className="text-primary">Secrets</span> for sensitive data. Both can be mounted
                  as files or injected as environment variables.{' '}
                  <span className="text-primary">Click each card</span> to understand the difference.
                </p>
              </div>
            </div>

            {/* Interactive component cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
                    <div className="text-sm font-mono text-text">{comp.label}</div>
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
              { type: 'command', content: 'kubectl auth can-i create deployments --as=system:serviceaccount:default:app' },
              { type: 'output', content: 'no' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Access Control with RBAC</h3>
                <p className="text-muted mb-4">
                  Not every user or service should be able to do everything.{' '}
                  <span className="text-primary">RBAC</span> (Role-Based Access Control) lets you define
                  who can do what. A Role lists permitted actions (verbs like{' '}
                  <span className="text-primary">get</span>, <span className="text-primary">create</span>,{' '}
                  <span className="text-primary">delete</span> on resources like pods, deployments). A
                  RoleBinding attaches that Role to a user or ServiceAccount.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Explore: Config and Access Boundaries
          </h3>
          <ConfigAccessPlayground />
        </FadeIn>

        <FadeIn delay={0.45} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Namespaces and Resource Quotas</h4>
            <p className="text-sm text-muted mb-4">
              Namespaces partition a cluster into virtual sub-clusters. Combined with ResourceQuota,
              they prevent one team from consuming all resources. Click any command to copy it.
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
            <p>Keep secrets out of images, scope permissions narrowly, and use namespaces to isolate teams.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
