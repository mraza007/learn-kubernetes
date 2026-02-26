'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeIn, Terminal } from '@/components/ui';
import { ServiceRoutingSimulator, NetworkPolicySimulator } from '@/components/simulations';
import { Network, Globe, Shield, Route, Copy, Check } from 'lucide-react';

const COMPONENTS = [
  {
    id: 'clusterip',
    icon: <Network className="w-5 h-5" />,
    label: 'ClusterIP',
    summary: 'Internal-only stable IP',
    detail:
      'The default Service type. Allocates a virtual IP that is reachable only within the cluster. Use it for service-to-service communication where you do not need external access. DNS resolution (e.g. my-svc.default.svc.cluster.local) works out of the box.',
    color: 'primary',
  },
  {
    id: 'nodeport',
    icon: <Globe className="w-5 h-5" />,
    label: 'NodePort',
    summary: 'Exposed on every node',
    detail:
      'Opens a static port (30000–32767) on every node in the cluster. External traffic hitting any node on that port is forwarded to the Service. Useful for development or on-prem setups without a cloud load balancer, but not recommended for production exposure.',
    color: 'secondary',
  },
  {
    id: 'loadbalancer',
    icon: <Route className="w-5 h-5" />,
    label: 'LoadBalancer',
    summary: 'External cloud LB',
    detail:
      'Provisions a cloud provider load balancer (AWS ELB, GCP GLB, etc.) that forwards traffic into the cluster. Each LoadBalancer Service gets its own external IP. Great for production but costs money per service—Ingress is usually more cost-effective when you have many services.',
    color: 'warning',
  },
];

const COMMANDS = [
  { comment: '# Route /api to the api-svc, /web to web-svc', cmd: 'kubectl get ingress' },
  { comment: '# Gateway API is the newer, more expressive successor', cmd: 'kubectl get gateway' },
];

export function Layer3Services() {
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
    <section id="section-3" className="py-24 px-4 border-t border-muted/20">
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-mono font-bold text-text mb-4">
            <span className="text-primary">Services</span> and Traffic Flow
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Expose Pods safely and understand request routing.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Network className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Stable Networking for Ephemeral Pods</h3>
                <p className="text-muted mb-4">
                  Pods come and go—they crash, scale up, get rescheduled. If you hardcode a pod's IP,
                  it'll break within hours. A <span className="text-primary">Service</span> provides a
                  stable virtual IP and DNS name that automatically routes to healthy pods using label
                  selectors. Think of it as a load balancer that Kubernetes manages for you.{' '}
                  <span className="text-primary">Click each type</span> to learn when to use it.
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
              { type: 'command', content: 'kubectl get svc' },
              { type: 'output', content: 'web ClusterIP 10.96.12.41' },
            ]}
            className="max-w-2xl mx-auto"
          />
        </FadeIn>

        <FadeIn delay={0.35} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Explore: Service Routing
          </h3>
          <ServiceRoutingSimulator />
        </FadeIn>

        <FadeIn delay={0.4} className="mb-16">
          <div className="bg-surface rounded-xl p-8 border border-muted/30">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono text-text mb-3">Controlling Traffic with NetworkPolicy</h3>
                <p className="text-muted mb-4">
                  By default, every pod can talk to every other pod—no restrictions. A{' '}
                  <span className="text-primary">NetworkPolicy</span> lets you define which pods can
                  communicate. Once any policy selects a pod, all non-allowed traffic is denied. Think
                  of it as a firewall rule for pod-to-pod traffic.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.45} className="mb-16">
          <h3 className="text-xl font-mono text-text mb-6 text-center">
            Try It: Apply a Network Policy
          </h3>
          <NetworkPolicySimulator />
        </FadeIn>

        <FadeIn delay={0.5} className="mb-16">
          <div className="bg-terminal rounded-xl p-6 border border-muted/30">
            <h4 className="font-mono text-lg text-text mb-2">Ingress: HTTP Routing to Services</h4>
            <p className="text-sm text-muted mb-4">
              For HTTP traffic from outside the cluster, Ingress provides path-based and host-based
              routing to backend Services. Click any command to copy it.
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
            <p>Services decouple pod identity from network identity. Pods change; the Service endpoint stays the same.</p>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}
