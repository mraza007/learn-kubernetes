'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, Database, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface FileEntry {
  id: string;
  name: string;
  size: string;
}

let fileCounter = 0;

export function StoragePersistenceSimulator() {
  const [hasPvc, setHasPvc] = useState(true);
  const [ephemeralFiles, setEphemeralFiles] = useState<FileEntry[]>([
    { id: 'e1', name: 'app.log', size: '2.1 KB' },
  ]);
  const [pvcFiles, setPvcFiles] = useState<FileEntry[]>([
    { id: 'p1', name: 'data.db', size: '48 MB' },
    { id: 'p2', name: 'uploads/photo.jpg', size: '3.2 MB' },
  ]);
  const [podAlive, setPodAlive] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current = [];
    };
  }, []);

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      if (!isMounted.current) return;
      callback();
    }, delay);
    timeoutIds.current.push(timeoutId);
    return timeoutId;
  };

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  const writeFile = (target: 'ephemeral' | 'pvc') => {
    fileCounter++;
    const file: FileEntry = {
      id: `f${fileCounter}`,
      name: target === 'ephemeral' ? `tmp-${fileCounter}.log` : `upload-${fileCounter}.dat`,
      size: `${(Math.random() * 10 + 1).toFixed(1)} KB`,
    };
    if (target === 'ephemeral') {
      setEphemeralFiles((prev) => [...prev, file]);
      addEvent(`Wrote ${file.name} to ephemeral storage`);
    } else {
      setPvcFiles((prev) => [...prev, file]);
      addEvent(`Wrote ${file.name} to PVC-backed volume`);
    }
  };

  const deleteFile = (target: 'ephemeral' | 'pvc', id: string) => {
    if (target === 'ephemeral') {
      const file = ephemeralFiles.find((f) => f.id === id);
      setEphemeralFiles((prev) => prev.filter((f) => f.id !== id));
      if (file) addEvent(`Deleted ${file.name} from ephemeral`);
    } else {
      const file = pvcFiles.find((f) => f.id === id);
      setPvcFiles((prev) => prev.filter((f) => f.id !== id));
      if (file) addEvent(`Deleted ${file.name} from PVC`);
    }
  };

  const restartPod = () => {
    setRestarting(true);
    setPodAlive(false);
    addEvent('Pod terminating...');

    scheduleTimeout(() => {
      setEphemeralFiles([]);
      addEvent('Ephemeral filesystem wiped');

      if (hasPvc) {
        addEvent('PVC data preserved across restart');
      } else {
        addEvent('No PVC mounted — all data lost!');
      }
    }, 600);

    scheduleTimeout(() => {
      setPodAlive(true);
      setRestarting(false);
      addEvent('New pod started');
      if (!hasPvc) {
        setPvcFiles([]);
      }
    }, 1500);
  };

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Storage Persistence</h3>
        <div className={`flex items-center gap-2 text-xs font-mono ${podAlive ? 'text-primary' : 'text-danger'}`}>
          <motion.div
            className={`w-2 h-2 rounded-full ${podAlive ? 'bg-primary' : 'bg-danger'}`}
            animate={podAlive ? { scale: [1, 1.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          {podAlive ? 'Pod Running' : 'Pod Terminated'}
        </div>
      </div>

      {/* PVC Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setHasPvc(!hasPvc)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            hasPvc ? 'bg-primary/40' : 'bg-muted/30'
          }`}
        >
          <motion.div
            className={`inline-block h-4 w-4 rounded-full ${hasPvc ? 'bg-primary' : 'bg-muted'}`}
            animate={{ x: hasPvc ? 24 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span className="text-sm text-text">
          PersistentVolumeClaim {hasPvc ? <span className="text-primary">mounted</span> : <span className="text-muted">not mounted</span>}
        </span>
      </div>

      {/* Storage Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ephemeral Storage */}
        <div className="rounded-lg border border-muted/30 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-mono text-warning">
              <AlertTriangle className="w-4 h-4" />
              Ephemeral (tmpfs)
            </div>
            <button
              onClick={() => writeFile('ephemeral')}
              disabled={!podAlive}
              className="p-1.5 rounded border border-muted/30 text-muted hover:text-warning hover:border-warning/40 transition-colors disabled:opacity-30"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="min-h-[80px] space-y-1">
            <AnimatePresence>
              {ephemeralFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-surface group"
                >
                  <span className="text-muted font-mono">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted/50">{file.size}</span>
                    <button
                      onClick={() => deleteFile('ephemeral', file.id)}
                      className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {ephemeralFiles.length === 0 && (
              <div className="text-xs text-muted/50 text-center py-4 italic">
                {podAlive ? 'No files' : 'Wiped on restart'}
              </div>
            )}
          </div>
          <div className="text-xs text-warning/70 italic">Lost when pod restarts</div>
        </div>

        {/* PVC Storage */}
        <div className={`rounded-lg border p-4 space-y-3 transition-all duration-300 ${
          hasPvc ? 'border-primary/40 bg-primary/5' : 'border-muted/20 bg-background opacity-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-mono ${hasPvc ? 'text-primary' : 'text-muted'}`}>
              <HardDrive className="w-4 h-4" />
              PVC Volume
            </div>
            <button
              onClick={() => writeFile('pvc')}
              disabled={!podAlive || !hasPvc}
              className="p-1.5 rounded border border-muted/30 text-muted hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-30"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="min-h-[80px] space-y-1">
            <AnimatePresence>
              {pvcFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-surface group"
                >
                  <span className="text-text font-mono">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted/50">{file.size}</span>
                    <button
                      onClick={() => deleteFile('pvc', file.id)}
                      className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {pvcFiles.length === 0 && (
              <div className="text-xs text-muted/50 text-center py-4 italic">
                {hasPvc ? 'No files' : 'PVC not mounted'}
              </div>
            )}
          </div>
          <div className={`text-xs italic ${hasPvc ? 'text-primary/70' : 'text-muted/50'}`}>
            {hasPvc ? 'Persists across restarts' : 'Enable PVC to persist data'}
          </div>
        </div>
      </div>

      {/* Restart Button */}
      <motion.button
        onClick={restartPod}
        disabled={restarting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          restarting
            ? 'bg-danger/20 text-danger border border-danger/40'
            : 'bg-warning/15 text-warning border border-warning/40 hover:bg-warning/25'
        }`}
      >
        <motion.div animate={restarting ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: restarting ? Infinity : 0 }}>
          <RotateCcw className="w-4 h-4" />
        </motion.div>
        {restarting ? 'Pod restarting...' : 'Restart Pod (kubectl delete pod)'}
      </motion.button>

      {/* Event Log */}
      {events.length > 0 && (
        <div className="rounded-lg border border-muted/20 bg-terminal p-3 max-h-32 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            <AnimatePresence initial={false}>
              {events.map((event, i) => (
                <motion.div
                  key={event + i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${
                    event.includes('lost') || event.includes('wiped') || event.includes('Wiped')
                      ? 'text-danger'
                      : event.includes('preserved') || event.includes('PVC')
                        ? 'text-primary'
                        : 'text-muted'
                  }`}
                >
                  <span className="text-muted/50 mr-2">{'>>'}</span>
                  {event}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-lg border border-muted/20 bg-background/50 p-3 text-xs text-muted leading-relaxed">
        <span className="text-primary font-semibold">Key insight:</span> Pod filesystems are ephemeral by default — a restart wipes everything.
        PersistentVolumeClaims decouple data from pod lifecycle, letting databases, uploads, and logs survive restarts and rescheduling.
      </div>
    </div>
  );
}
