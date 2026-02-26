'use client';

import { useMemo, useState } from 'react';

export type QuestionType = 'mcq' | 'command_prediction' | 'troubleshoot';

interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  sectionRef: string;
}

const QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'Which workload is best for a stateless API that needs rolling updates?',
    options: ['Job', 'Deployment', 'DaemonSet', 'StatefulSet'],
    answer: 'Deployment',
    explanation: 'Deployments are designed for stateless replicated workloads and support rolling updates.',
    sectionRef: 'Workloads',
  },
  {
    id: 'q2',
    type: 'command_prediction',
    prompt: 'A Pod is CrashLoopBackOff. What is the best first command?',
    options: ['kubectl delete pod', 'kubectl logs <pod>', 'kubectl scale deploy', 'kubectl apply -f svc.yaml'],
    answer: 'kubectl logs <pod>',
    explanation: 'Logs usually reveal the immediate application/runtime failure cause.',
    sectionRef: 'Reliability',
  },
  {
    id: 'q3',
    type: 'troubleshoot',
    prompt: 'App lost user uploads after restart. Most likely missing?',
    options: ['ConfigMap', 'Ingress', 'PersistentVolumeClaim', 'HorizontalPodAutoscaler'],
    answer: 'PersistentVolumeClaim',
    explanation: 'PVC-backed storage persists beyond individual Pod lifecycles.',
    sectionRef: 'Storage',
  },
  {
    id: 'q4',
    type: 'mcq',
    prompt: 'What does Kubernetes compare against to decide if changes are needed?',
    options: ['The previous manifest version', 'The desired state in etcd vs actual cluster state', 'A hash of the container image', 'The node\'s available memory'],
    answer: 'The desired state in etcd vs actual cluster state',
    explanation: 'Kubernetes continuously reconciles the desired state stored in etcd with the observed state of the cluster.',
    sectionRef: 'Orchestration',
  },
  {
    id: 'q5',
    type: 'mcq',
    prompt: 'Which component runs on every worker node and manages Pod lifecycles locally?',
    options: ['kube-apiserver', 'etcd', 'kubelet', 'kube-scheduler'],
    answer: 'kubelet',
    explanation: 'The kubelet is the node-level agent that ensures containers described in PodSpecs are running and healthy.',
    sectionRef: 'Cluster Basics',
  },
  {
    id: 'q6',
    type: 'mcq',
    prompt: 'Which Service type exposes a stable internal IP reachable only within the cluster?',
    options: ['NodePort', 'LoadBalancer', 'ClusterIP', 'ExternalName'],
    answer: 'ClusterIP',
    explanation: 'ClusterIP is the default Service type and provides a virtual IP accessible only from inside the cluster.',
    sectionRef: 'Services',
  },
  {
    id: 'q7',
    type: 'command_prediction',
    prompt: 'You need HTTP path-based routing to multiple backend Services. Which resource do you create?',
    options: ['A second ClusterIP Service', 'A NetworkPolicy', 'An Ingress resource', 'A PersistentVolume'],
    answer: 'An Ingress resource',
    explanation: 'Ingress provides HTTP/HTTPS routing rules such as path and host-based routing to backend Services.',
    sectionRef: 'Services',
  },
  {
    id: 'q8',
    type: 'mcq',
    prompt: 'How does a ConfigMap differ from a Secret in Kubernetes?',
    options: ['ConfigMaps are encrypted at rest by default; Secrets are not', 'Secrets are base64-encoded by default and intended for sensitive data', 'ConfigMaps can only store one key', 'Secrets are mounted as read-only environment variables only'],
    answer: 'Secrets are base64-encoded by default and intended for sensitive data',
    explanation: 'Secrets are base64-encoded and designed for sensitive values; ConfigMaps hold plain configuration data.',
    sectionRef: 'Config',
  },
  {
    id: 'q9',
    type: 'troubleshoot',
    prompt: 'A developer can list Pods but cannot delete them. What most likely needs updating?',
    options: ['The Pod\'s resource requests', 'The RBAC Role or ClusterRole bindings', 'The node\'s kubelet config', 'The Service selector labels'],
    answer: 'The RBAC Role or ClusterRole bindings',
    explanation: 'RBAC controls API access; the Role must include the "delete" verb on the Pods resource.',
    sectionRef: 'Config',
  },
  {
    id: 'q10',
    type: 'mcq',
    prompt: 'Which PersistentVolume access mode allows multiple nodes to mount the volume read-only?',
    options: ['ReadWriteOnce', 'ReadOnlyMany', 'ReadWriteMany', 'ReadWriteOncePod'],
    answer: 'ReadOnlyMany',
    explanation: 'ReadOnlyMany (ROX) lets many nodes mount the volume simultaneously in read-only mode.',
    sectionRef: 'Storage',
  },
  {
    id: 'q11',
    type: 'command_prediction',
    prompt: 'A Pod stays Pending because no node has enough CPU. What should you check first?',
    options: ['The Pod\'s readiness probe', 'The container\'s resource requests and node allocatable capacity', 'The Service\'s targetPort', 'The Ingress controller logs'],
    answer: 'The container\'s resource requests and node allocatable capacity',
    explanation: 'The scheduler matches resource requests against allocatable capacity; oversized requests cause Pending Pods.',
    sectionRef: 'Scheduling',
  },
  {
    id: 'q12',
    type: 'troubleshoot',
    prompt: 'You want Pods to avoid a node reserved for GPU workloads. Which mechanism prevents scheduling there?',
    options: ['A resource limit on memory', 'A taint on the node with no matching toleration', 'A ClusterIP Service', 'A PodDisruptionBudget'],
    answer: 'A taint on the node with no matching toleration',
    explanation: 'Taints repel Pods unless they carry a matching toleration, keeping nodes reserved for specific workloads.',
    sectionRef: 'Scheduling',
  },
  {
    id: 'q13',
    type: 'mcq',
    prompt: 'Which probe type determines whether a container should receive traffic?',
    options: ['Liveness probe', 'Startup probe', 'Readiness probe', 'Init container check'],
    answer: 'Readiness probe',
    explanation: 'A readiness probe gates Service traffic; failing it removes the Pod from endpoint lists without restarting it.',
    sectionRef: 'Reliability',
  },
  {
    id: 'q14',
    type: 'command_prediction',
    prompt: 'Which control plane component persists all cluster state?',
    options: ['kube-scheduler', 'kube-controller-manager', 'etcd', 'kube-proxy'],
    answer: 'etcd',
    explanation: 'etcd is the distributed key-value store that holds all cluster configuration and state data.',
    sectionRef: 'Control Plane',
  },
  {
    id: 'q15',
    type: 'troubleshoot',
    prompt: 'A Pod is running but returning 503 errors. What is the most informative debug sequence?',
    options: [
      'kubectl delete pod, then redeploy',
      'kubectl logs <pod>, then kubectl describe pod <pod>, then kubectl get events',
      'kubectl scale deployment --replicas=0',
      'kubectl apply -f namespace.yaml',
    ],
    answer: 'kubectl logs <pod>, then kubectl describe pod <pod>, then kubectl get events',
    explanation: 'Logs show app errors, describe reveals probe/state issues, and events surface cluster-level problems.',
    sectionRef: 'Troubleshooting',
  },
];

const SUBSET_SIZE = 10;

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface BonusAssessmentProps {
  onComplete: () => void;
}

export function BonusAssessment({ onComplete }: BonusAssessmentProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 2147483646) + 1);

  const activeQuestions = useMemo(
    () => seededShuffle(QUESTIONS, seed).slice(0, SUBSET_SIZE),
    [seed],
  );

  const result = useMemo(() => {
    return activeQuestions.map((q) => ({
      ...q,
      correct: answers[q.id] === q.answer,
    }));
  }, [answers, activeQuestions]);

  const allAnswered = activeQuestions.every((q) => answers[q.id]);

  const mastered = result.filter((r) => r.correct).map((r) => r.sectionRef);
  const revisit = result.filter((r) => !r.correct).map((r) => r.sectionRef);

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-6 space-y-6">
      {activeQuestions.map((question) => (
        <div key={question.id} className="space-y-2">
          <p className="font-mono text-sm text-muted uppercase tracking-wide">{question.type.replace('_', ' ')}</p>
          <p className="text-sm">{question.prompt}</p>
          <div className="grid gap-2">
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                className={`text-left rounded border px-3 py-2 text-sm ${answers[question.id] === option ? 'border-primary/50 text-primary bg-primary/10' : 'border-muted/30 text-muted'}`}
              >
                {option}
              </button>
            ))}
          </div>
          {submitted ? (
            <p className={`text-xs ${answers[question.id] === question.answer ? 'text-primary' : 'text-warning'}`}>
              {answers[question.id] === question.answer ? 'Correct.' : 'Needs review.'} {question.explanation} Review: {question.sectionRef}
            </p>
          ) : null}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setSubmitted(true);
            onComplete();
          }}
          disabled={!allAnswered}
          className="px-4 py-2 rounded border border-primary/40 text-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
        >
          Submit for feedback
        </button>
        <button
          onClick={() => {
            const onlyMissed: Record<string, string> = {};
            result.forEach((item) => {
              if (item.correct) {
                onlyMissed[item.id] = item.answer;
              }
            });
            setAnswers(onlyMissed);
            setSubmitted(false);
          }}
          className="px-4 py-2 rounded border border-muted/30 text-muted text-sm"
        >
          Retry missed only
        </button>
      </div>

      {submitted ? (
        <div className="rounded border border-muted/30 bg-background/50 p-4 text-sm space-y-2">
          <p>
            <span className="text-primary font-mono">Mastered:</span>{' '}
            {mastered.length ? Array.from(new Set(mastered)).join(', ') : 'Keep practicing all sections'}
          </p>
          <p>
            <span className="text-warning font-mono">Revisit:</span>{' '}
            {revisit.length ? Array.from(new Set(revisit)).join(', ') : 'None, great job'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
