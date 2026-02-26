'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Server, Box, Layers, Zap, ChevronRight, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer';

interface ServiceConfig {
  label: string;
  description: string;
  tagline: string;
  color: string;
  borderColor: string;
  bgColor: string;
  insight: string;
  yaml: string;
  // Which layers are visible in the diagram
  layers: Array<'internet' | 'loadbalancer' | 'node' | 'service' | 'pods'>;
  // The ordered hops a packet takes (index into NODES array)
  path: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  ClusterIP: {
    label: 'ClusterIP',
    description: 'Internal-only. Reachable solely by Pods within the cluster.',
    tagline: 'In-cluster traffic only',
    color: 'text-primary',
    borderColor: 'border-primary/40',
    bgColor: 'bg-primary/10',
    insight:
      'ClusterIP assigns a stable virtual IP inside the cluster. kube-proxy programs iptables / IPVS rules so any Pod can reach the Service IP — which then load-balances across healthy endpoints.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP   # default`,
    layers: ['service', 'pods'],
    path: ['service', 'pod-a', 'pod-b', 'pod-c'],
  },
  NodePort: {
    label: 'NodePort',
    description: 'Exposes a static port on every Node IP in the cluster.',
    tagline: 'External via Node IP:port',
    color: 'text-secondary',
    borderColor: 'border-secondary/40',
    bgColor: 'bg-secondary/10',
    insight:
      'NodePort opens the same high port (30000–32767) on every Node. Traffic hits any Node IP, kube-proxy DNAT-rewrites it to the ClusterIP, which then forwards to a Pod — even one on a different Node.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 31000
  type: NodePort`,
    layers: ['node', 'service', 'pods'],
    path: ['node', 'service', 'pod-a', 'pod-b', 'pod-c'],
  },
  LoadBalancer: {
    label: 'LoadBalancer',
    description: 'Cloud LB with an external IP sitting in front of NodePort.',
    tagline: 'Production-grade external access',
    color: 'text-warning',
    borderColor: 'border-warning/40',
    bgColor: 'bg-warning/10',
    insight:
      'LoadBalancer builds on top of NodePort. The cloud controller provisions an external load balancer whose IP is assigned to the Service. Traffic flows: Client → Cloud LB → Node:NodePort → ClusterIP → Pod.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
  # Cloud controller auto-assigns:
  # externalTrafficPolicy: Cluster`,
    layers: ['internet', 'loadbalancer', 'node', 'service', 'pods'],
    path: ['internet', 'loadbalancer', 'node', 'service', 'pod-a', 'pod-b', 'pod-c'],
  },
};

const SERVICE_TYPES: ServiceType[] = ['ClusterIP', 'NodePort', 'LoadBalancer'];

// Which pod gets highlighted per run (cycles so it looks dynamic)
const POD_TARGETS: Array<'pod-a' | 'pod-b' | 'pod-c'> = ['pod-a', 'pod-b', 'pod-c'];

// ---------------------------------------------------------------------------
// Helper: Layer node definitions
// ---------------------------------------------------------------------------

interface LayerDef {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}

const INTERNET_LAYER: LayerDef = {
  id: 'internet',
  label: 'Internet / Client',
  sublabel: 'External HTTP request',
  icon: Globe,
  iconColor: 'text-danger',
  borderColor: 'border-danger/40',
  bgColor: 'bg-danger/5',
};

const LB_LAYER: LayerDef = {
  id: 'loadbalancer',
  label: 'Cloud Load Balancer',
  sublabel: 'External IP assigned by cloud',
  icon: Layers,
  iconColor: 'text-warning',
  borderColor: 'border-warning/40',
  bgColor: 'bg-warning/5',
};

const NODE_LAYER: LayerDef = {
  id: 'node',
  label: 'Kubernetes Node',
  sublabel: 'NodePort 31000',
  icon: Server,
  iconColor: 'text-secondary',
  borderColor: 'border-secondary/40',
  bgColor: 'bg-secondary/5',
};

const SERVICE_LAYER: LayerDef = {
  id: 'service',
  label: 'Service (ClusterIP)',
  sublabel: 'kube-proxy / IPVS rules',
  icon: Zap,
  iconColor: 'text-primary',
  borderColor: 'border-primary/40',
  bgColor: 'bg-primary/5',
};

const LAYER_MAP: Record<string, LayerDef> = {
  internet: INTERNET_LAYER,
  loadbalancer: LB_LAYER,
  node: NODE_LAYER,
  service: SERVICE_LAYER,
};

// ---------------------------------------------------------------------------
// Sub-component: Tab selector
// ---------------------------------------------------------------------------

function TabSelector({
  active,
  onChange,
}: {
  active: ServiceType;
  onChange: (t: ServiceType) => void;
}) {
  return (
    <div className="relative flex gap-1 p-1 rounded-lg bg-terminal border border-muted/20">
      {SERVICE_TYPES.map((t) => {
        const cfg = SERVICE_CONFIGS[t];
        const isActive = active === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className="relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none"
            style={{ minWidth: 110 }}
          >
            {isActive && (
              <motion.span
                layoutId="tab-bg"
                className={`absolute inset-0 rounded-md ${cfg.bgColor} border ${cfg.borderColor}`}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className={`relative ${isActive ? cfg.color : 'text-muted'}`}>{t}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Connector arrow between layers
// ---------------------------------------------------------------------------

function Connector({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <motion.div
        className={`w-px flex-1 min-h-[20px] ${active ? color : 'bg-muted/20'}`}
        animate={{ opacity: active ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />
      <ChevronRight
        className={`rotate-90 ${active ? color.replace('bg-', 'text-') : 'text-muted/20'}`}
        size={12}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Packet dot (animated)
// ---------------------------------------------------------------------------

function PacketDot({ isAnimating }: { isAnimating: boolean }) {
  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20"
        >
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_2px_#2dd4bf]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Network layer box
// ---------------------------------------------------------------------------

function LayerBox({
  def,
  isVisible,
  isActive,
  hasPacket,
}: {
  def: LayerDef;
  isVisible: boolean;
  isActive: boolean;
  hasPacket: boolean;
}) {
  const Icon = def.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={def.id}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`relative rounded-lg border ${def.borderColor} ${def.bgColor} px-4 py-3 flex items-center gap-3 transition-shadow duration-300 ${isActive ? 'shadow-[0_0_12px_2px_rgba(45,212,191,0.18)]' : ''}`}
        >
          {/* Active glow ring */}
          {isActive && (
            <motion.div
              className={`absolute inset-0 rounded-lg border ${def.borderColor} opacity-60`}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}

          <div className={`shrink-0 ${def.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text leading-tight">{def.label}</p>
            {def.sublabel && (
              <p className="text-xs text-muted mt-0.5 truncate">{def.sublabel}</p>
            )}
          </div>

          <PacketDot isAnimating={hasPacket} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Pod endpoint
// ---------------------------------------------------------------------------

function PodBox({
  id,
  label,
  isVisible,
  isTargeted,
  isPulsing,
}: {
  id: string;
  label: string;
  isVisible: boolean;
  isTargeted: boolean;
  isPulsing: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`relative rounded-lg border px-3 py-2.5 flex flex-col items-center gap-1.5 min-w-[80px] transition-all duration-300 ${
            isTargeted
              ? 'border-primary/70 bg-primary/10 shadow-[0_0_14px_3px_rgba(45,212,191,0.25)]'
              : 'border-muted/30 bg-surface'
          }`}
        >
          {isPulsing && isTargeted && (
            <motion.div
              className="absolute inset-0 rounded-lg border border-primary/50"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <Box
            size={16}
            className={isTargeted ? 'text-primary' : 'text-muted'}
          />
          <span className={`text-xs font-mono ${isTargeted ? 'text-primary' : 'text-muted'}`}>
            {label}
          </span>
          {isTargeted && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-bold text-primary/80 uppercase tracking-wider"
            >
              hit
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: YAML preview panel
// ---------------------------------------------------------------------------

function YamlPanel({ yaml, color }: { yaml: string; color: string }) {
  return (
    <motion.div
      key={yaml}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-muted/20 bg-terminal overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-muted/15 bg-muted/5">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
        </div>
        <Terminal size={12} className="text-muted ml-1" />
        <span className="text-xs text-muted font-mono">service.yaml</span>
      </div>
      <pre className={`p-4 text-xs font-mono leading-relaxed overflow-x-auto ${color}`}>
        {yaml}
      </pre>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ServiceRoutingSimulator() {
  const [activeType, setActiveType] = useState<ServiceType>('ClusterIP');
  const [animating, setAnimating] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [targetedPod, setTargetedPod] = useState<string | null>(null);
  const [pulsingPod, setPulsingPod] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const abortRef = useRef<boolean>(false);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current = [];
      abortRef.current = true;
    };
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
    }, delay);
    timeoutIds.current.push(timeoutId);
    return timeoutId;
  }, []);

  const cfg = SERVICE_CONFIGS[activeType];
  const visibleLayers = cfg.layers;
  const isPodsVisible = visibleLayers.includes('pods');

  // The ordered layer IDs to animate through (excluding 'pods' — pods handled separately)
  const layerPath = cfg.path.filter(
    (id) => id !== 'pod-a' && id !== 'pod-b' && id !== 'pod-c',
  );

  const handleTypeChange = useCallback(
    (t: ServiceType) => {
      abortRef.current = true;
      setAnimating(false);
      setActiveLayerId(null);
      setTargetedPod(null);
      setPulsingPod(null);
      setActiveType(t);
      // Allow next animation run
      scheduleTimeout(() => {
        if (!isMounted.current) return;
        abortRef.current = false;
      }, 50);
    },
    [scheduleTimeout],
  );

  const handleSendRequest = useCallback(async () => {
    if (animating) return;

    abortRef.current = false;
    setAnimating(true);
    setTargetedPod(null);
    setPulsingPod(null);

    const podTarget = POD_TARGETS[runCount % 3];
    const newRunCount = runCount + 1;
    setRunCount(newRunCount);

    // Animate through each layer node in sequence
    const delay = (ms: number) =>
      new Promise<void>((res) => {
        scheduleTimeout(res, ms);
      });

    for (const layerId of layerPath) {
      if (abortRef.current) break;
      setActiveLayerId(layerId);
      await delay(500);
      if (abortRef.current) break;
      setActiveLayerId(null);
      await delay(120);
    }

    if (!abortRef.current && isPodsVisible) {
      // Animate into pods
      setActiveLayerId('pods');
      await delay(300);
      if (!abortRef.current) {
        setActiveLayerId(null);
        setTargetedPod(podTarget);
        setPulsingPod(podTarget);
        // Stop pulsing after a bit
        scheduleTimeout(() => {
          if (!isMounted.current) return;
          if (!abortRef.current) setPulsingPod(null);
        }, 2000);
      }
    }

    if (!abortRef.current) setAnimating(false);
  }, [animating, layerPath, isPodsVisible, runCount, scheduleTimeout]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  // Reset targeted pod when type changes
  useEffect(() => {
    setTargetedPod(null);
    setPulsingPod(null);
  }, [activeType]);

  return (
    <div className="rounded-xl border border-muted/20 bg-surface p-5 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text">Service Routing Simulator</h3>
        <p className="text-xs text-muted">
          Select a Service type and send a request to visualize the packet path.
        </p>
      </div>

      {/* Tab selector */}
      <TabSelector active={activeType} onChange={handleTypeChange} />

      {/* Description badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.borderColor} ${cfg.bgColor}`}
      >
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.tagline}</span>
        <span className="text-xs text-muted">—</span>
        <span className="text-xs text-muted">{cfg.description}</span>
      </div>

      {/* Main layout: diagram + yaml */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Network diagram */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">
            Packet path
          </p>

          {/* Layers */}
          <div className="flex flex-col gap-0">
            {/* Internet */}
            <LayerBox
              def={LAYER_MAP.internet}
              isVisible={visibleLayers.includes('internet')}
              isActive={activeLayerId === 'internet'}
              hasPacket={activeLayerId === 'internet'}
            />
            {visibleLayers.includes('internet') && visibleLayers.includes('loadbalancer') && (
              <Connector active={animating || activeLayerId !== null} color="bg-warning/60" />
            )}

            {/* Load Balancer */}
            <LayerBox
              def={LAYER_MAP.loadbalancer}
              isVisible={visibleLayers.includes('loadbalancer')}
              isActive={activeLayerId === 'loadbalancer'}
              hasPacket={activeLayerId === 'loadbalancer'}
            />
            {visibleLayers.includes('loadbalancer') && visibleLayers.includes('node') && (
              <Connector active={animating || activeLayerId !== null} color="bg-warning/60" />
            )}

            {/* Node */}
            <LayerBox
              def={LAYER_MAP.node}
              isVisible={visibleLayers.includes('node')}
              isActive={activeLayerId === 'node'}
              hasPacket={activeLayerId === 'node'}
            />
            {visibleLayers.includes('node') && visibleLayers.includes('service') && (
              <Connector active={animating || activeLayerId !== null} color="bg-secondary/60" />
            )}

            {/* Service */}
            <LayerBox
              def={LAYER_MAP.service}
              isVisible={visibleLayers.includes('service')}
              isActive={activeLayerId === 'service'}
              hasPacket={activeLayerId === 'service'}
            />

            {/* Arrow down to pods */}
            {isPodsVisible && (
              <Connector active={animating || targetedPod !== null} color="bg-primary/60" />
            )}

            {/* Pods row */}
            <AnimatePresence>
              {isPodsVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-3 justify-center pt-1"
                >
                  {(['pod-a', 'pod-b', 'pod-c'] as const).map((podId, i) => (
                    <PodBox
                      key={podId}
                      id={podId}
                      label={`pod-${String.fromCharCode(65 + i)}`}
                      isVisible={true}
                      isTargeted={targetedPod === podId}
                      isPulsing={pulsingPod === podId}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* If ClusterIP - show source pod feeding in from top */}
            {activeType === 'ClusterIP' && (
              <div className="mt-4 p-3 rounded-lg border border-muted/15 bg-terminal text-xs text-muted font-mono text-center">
                <span className="text-primary/70">source pod</span>
                <span className="mx-2">→</span>
                <span className="text-primary">ClusterIP:80</span>
                <span className="mx-2">→</span>
                <span className="text-primary/70">endpoint pod</span>
              </div>
            )}
          </div>

          {/* Send request button */}
          <div className="pt-4">
            <motion.button
              onClick={handleSendRequest}
              disabled={animating}
              whileTap={{ scale: 0.96 }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none ${
                animating
                  ? 'border-muted/20 text-muted cursor-not-allowed bg-muted/5'
                  : `${cfg.borderColor} ${cfg.bgColor} ${cfg.color} hover:shadow-[0_0_10px_2px_rgba(45,212,191,0.15)]`
              }`}
            >
              {animating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block"
                  >
                    ⟳
                  </motion.span>
                  <span>Routing packet...</span>
                </>
              ) : (
                <>
                  <Zap size={14} />
                  <span>Send request</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* YAML panel */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">
            Service spec
          </p>
          <YamlPanel yaml={cfg.yaml} color={cfg.color} />
        </div>
      </div>

      {/* Educational insight */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeType}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className={`rounded-lg border ${cfg.borderColor} ${cfg.bgColor} p-4`}
        >
          <div className="flex items-start gap-2">
            <span className={`shrink-0 mt-0.5 ${cfg.color}`}>
              <Zap size={14} />
            </span>
            <div>
              <p className={`text-xs font-semibold mb-1 ${cfg.color}`}>
                How {activeType} works
              </p>
              <p className="text-xs text-muted leading-relaxed">{cfg.insight}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
