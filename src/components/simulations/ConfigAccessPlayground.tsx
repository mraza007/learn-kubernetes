'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Lock, Shield, Eye, EyeOff, FileText, Key } from 'lucide-react';

type ResourceType = 'configmap' | 'secret';
type RbacRole = 'viewer' | 'editor' | 'admin';

interface AccessAttempt {
  id: number;
  action: string;
  resource: string;
  result: 'allowed' | 'denied';
  reason: string;
}

let attemptId = 0;

const RBAC_PERMISSIONS: Record<RbacRole, { verbs: string[]; description: string }> = {
  viewer: { verbs: ['get', 'list', 'watch'], description: 'Read-only access to resources' },
  editor: { verbs: ['get', 'list', 'watch', 'create', 'update', 'patch'], description: 'Read + write, but no RBAC changes' },
  admin: { verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'], description: 'Full access including delete' },
};

export function ConfigAccessPlayground() {
  const [resourceType, setResourceType] = useState<ResourceType>('configmap');
  const [role, setRole] = useState<RbacRole>('viewer');
  const [showSecret, setShowSecret] = useState(false);
  const [attempts, setAttempts] = useState<AccessAttempt[]>([]);

  const configData = {
    'app.env': 'production',
    'log.level': 'info',
    'max.connections': '100',
  };

  const secretData = {
    'db.password': showSecret ? 'sup3r-s3cret-pw!' : '••••••••••••••',
    'api.key': showSecret ? 'sk-abc123xyz789' : '••••••••••••••',
  };

  const tryAccess = (action: string, resource: string) => {
    const perms = RBAC_PERMISSIONS[role];
    const allowed = perms.verbs.includes(action);
    attemptId++;
    setAttempts((prev) =>
      [
        {
          id: attemptId,
          action,
          resource,
          result: (allowed ? 'allowed' : 'denied') as 'allowed' | 'denied',
          reason: allowed
            ? `Role "${role}" has "${action}" verb`
            : `Role "${role}" lacks "${action}" verb`,
        },
        ...prev,
      ].slice(0, 6),
    );
  };

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <h3 className="text-lg font-semibold text-text">Config & RBAC Playground</h3>

      {/* Resource Type Tabs */}
      <div className="flex gap-2">
        {(['configmap', 'secret'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setResourceType(type)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              resourceType === type
                ? type === 'configmap'
                  ? 'bg-primary/15 text-primary border border-primary/40'
                  : 'bg-warning/15 text-warning border border-warning/40'
                : 'bg-background text-muted border border-muted/30 hover:border-muted/50'
            }`}
          >
            {type === 'configmap' ? <FileText className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            {type === 'configmap' ? 'ConfigMap' : 'Secret'}
          </button>
        ))}
      </div>

      {/* Data Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={resourceType}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`rounded-lg border p-4 font-mono text-sm space-y-2 ${
            resourceType === 'configmap'
              ? 'border-primary/30 bg-primary/5'
              : 'border-warning/30 bg-warning/5'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs uppercase tracking-wide ${resourceType === 'configmap' ? 'text-primary' : 'text-warning'}`}>
              {resourceType === 'configmap' ? 'ConfigMap: app-config' : 'Secret: app-secrets'}
            </span>
            {resourceType === 'secret' && (
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="flex items-center gap-1 text-xs text-muted hover:text-warning transition-colors"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? 'Hide' : 'Reveal'}
              </button>
            )}
          </div>

          {Object.entries(resourceType === 'configmap' ? configData : secretData).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-1 border-b border-muted/15 last:border-0">
              <span className="text-text">{key}</span>
              <span className={resourceType === 'configmap' ? 'text-primary' : 'text-warning'}>{value}</span>
            </div>
          ))}

          {resourceType === 'secret' && (
            <div className="text-xs text-muted mt-2 italic">
              Secrets are base64-encoded (not encrypted) by default. Enable encryption at rest for real security.
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* RBAC Role Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-text">
          <Shield className="w-4 h-4 text-secondary" />
          ServiceAccount Role
        </div>
        <div className="flex gap-2">
          {(Object.keys(RBAC_PERMISSIONS) as RbacRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-2 rounded-lg border text-sm font-mono transition-all ${
                role === r
                  ? 'border-secondary/50 bg-secondary/15 text-secondary'
                  : 'border-muted/30 text-muted hover:border-muted/50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted">
          Verbs: {RBAC_PERMISSIONS[role].verbs.map((v, i) => (
            <span key={v}>
              <span className="text-secondary">{v}</span>
              {i < RBAC_PERMISSIONS[role].verbs.length - 1 && ', '}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {['get', 'create', 'update', 'delete'].map((action) => (
          <motion.button
            key={action}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => tryAccess(action, resourceType)}
            className="rounded-lg border border-muted/30 bg-background px-3 py-2 text-sm font-mono text-text hover:border-secondary/40 transition-colors"
          >
            kubectl {action} {resourceType}
          </motion.button>
        ))}
      </div>

      {/* Access Log */}
      <AnimatePresence>
        {attempts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-lg border border-muted/20 bg-terminal p-3 space-y-1"
          >
            <div className="text-xs font-mono text-muted mb-2 uppercase tracking-wide">Access Log</div>
            {attempts.map((attempt) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono flex items-center gap-2 ${
                  attempt.result === 'allowed' ? 'text-primary' : 'text-danger'
                }`}
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  attempt.result === 'allowed' ? 'bg-primary/20' : 'bg-danger/20'
                }`}>
                  {attempt.result === 'allowed' ? 'ALLOW' : 'DENY'}
                </span>
                <span className="text-muted">{attempt.action}</span>
                <span className="text-text">{attempt.resource}</span>
                <span className="text-muted/50 ml-auto">{attempt.reason}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight */}
      <div className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed">
        <span className="text-primary font-semibold">Key insight:</span> ConfigMaps hold plain config, Secrets hold sensitive values (base64-encoded).
        RBAC controls who can read, create, or delete either. Always use Secrets for passwords and API keys, and scope RBAC roles to least privilege.
      </div>
    </div>
  );
}
