'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { StoragePersistenceSimulator } from '@/components/simulations';
import { HardDrive, Database, FolderSync, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'pv',
    icon: <HardDrive className="w-5 h-5" />,
    label: 'PV',
    summary: 'Cluster-level storage resource',
    detail:
      'A PersistentVolume is a piece of storage provisioned by an admin or dynamically via a StorageClass. It is a cluster-level resource, like a node—it exists independently of any pod. The PV spec describes capacity, access modes, and the backend (NFS, cloud disk, local path, etc.).',
    color: 'primary',
  },
  {
    id: 'pvc',
    icon: <Database className="w-5 h-5" />,
    label: 'PVC',
    summary: "Pod's request for storage",
    detail:
      "A PersistentVolumeClaim is a pod's request for storage. You specify how much space you need and which access modes you require. Kubernetes binds the PVC to a suitable PV. The pod mounts the PVC as a volume—it never deals with the underlying disk directly.",
    color: 'secondary',
  },
  {
    id: 'storageclass',
    icon: <FolderSync className="w-5 h-5" />,
    label: 'StorageClass',
    summary: 'Template for dynamic provisioning',
    detail:
      'Instead of pre-creating PVs manually, a StorageClass tells Kubernetes how to provision one on demand. When a PVC references a StorageClass, Kubernetes calls the associated provisioner (e.g. AWS EBS, GCP PD) and creates the disk automatically. This is how most production clusters work.',
    color: 'warning',
  },
];

const COMMANDS = [
  { comment: '# ReadWriteOnce — single node read-write', cmd: 'accessModes: [ReadWriteOnce]' },
  { comment: '# ReadOnlyMany — many nodes read-only', cmd: 'accessModes: [ReadOnlyMany]' },
  { comment: '# Check PVC status', cmd: 'kubectl get pvc' },
];

export function Layer5Storage() {
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
    <section id="section-5" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            <span className="text-secondary">Storage</span> and Stateful Data
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Learn why ephemeral container filesystems need persistent volumes.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <HardDrive className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Why Pods Need Persistent Storage</h3>
                <p className="text-muted mb-4">
                  Container filesystems are ephemeral—when a pod restarts, everything written inside the
                  container vanishes. For databases, file uploads, or any data that must survive restarts,
                  you need storage that lives outside the pod lifecycle. Kubernetes solves this with{' '}
                  <span className="text-primary">PersistentVolumes</span>.{' '}
                  <span className="text-primary">Click each object</span> to understand its role.
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
              { type: 'command', content: 'kubectl get pvc' },
              { type: 'output', content: 'uploads-pvc Bound 10Gi' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: See What Survives a Restart
          </h3>
          <StoragePersistenceSimulator />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Access Modes and Lifecycle</h4>
            <p className="text-sm text-muted mb-4">
              Access modes control how many nodes can mount a volume simultaneously. The reclaim policy
              decides what happens to a PV after its PVC is deleted. Click any line to copy it.
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

        <FadeIn delay={0.45}>
          <div className="text-center text-sm text-muted mb-8">
            <p>If your data matters, mount a PVC. Container filesystems are scratch space.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
