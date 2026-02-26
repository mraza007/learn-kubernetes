'use client';

import { useState } from 'react';

interface ScenarioStep {
  command: string;
  output: string;
  summary: string;
}

interface Scenario {
  title: string;
  description: string;
  steps: ScenarioStep[];
}

const SCENARIOS: Record<string, Scenario> = {
  pending: {
    title: 'Pod stuck in Pending',
    description:
      'A pod has been submitted but never transitions to Running. Something is preventing it from being scheduled.',
    steps: [
      {
        command: 'kubectl get pods',
        output: `NAME            READY   STATUS    RESTARTS   AGE
my-app-7b9f6   0/1     Pending   0          4m12s`,
        summary:
          'Confirmed the pod is stuck in Pending -- it has not been scheduled to any node yet.',
      },
      {
        command: 'kubectl describe pod <name>',
        output: `Events:
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  4m12s  default-scheduler  0/3 nodes are available:
           3 Insufficient memory. preemption: 0/3 nodes are available:
           3 No preemption victims found for incoming pod.`,
        summary:
          'describe revealed a FailedScheduling event -- the cluster has no node with enough memory for this pod.',
      },
      {
        command: 'kubectl get events --sort-by=.lastTimestamp',
        output: `LAST SEEN   TYPE      REASON             OBJECT              MESSAGE
4m12s       Warning   FailedScheduling   pod/my-app-7b9f6    0/3 nodes are available: 3 Insufficient memory.
6m01s       Normal    Scheduled          pod/other-app-x2    Successfully assigned default/other-app-x2 to node-2`,
        summary:
          'Cluster-wide events confirmed no scheduling issues for other pods -- the problem is resource limits on this specific pod.',
      },
    ],
  },
  crashloop: {
    title: 'Pod in CrashLoopBackOff',
    description:
      'A pod keeps starting and crashing repeatedly. Kubernetes is backing off restart attempts.',
    steps: [
      {
        command: 'kubectl get pods',
        output: `NAME            READY   STATUS             RESTARTS      AGE
my-app-7b9f6   0/1     CrashLoopBackOff   5 (32s ago)   3m48s`,
        summary:
          'Confirmed the pod is in CrashLoopBackOff with 5 restarts -- the container keeps crashing.',
      },
      {
        command: 'kubectl logs <name>',
        output: `Error: Failed to connect to database at db-service:5432
Connection refused. Retrying in 5s...
Error: Failed to connect to database at db-service:5432
panic: maximum retries exceeded
goroutine 1 [running]:
main.main()
        /app/main.go:42`,
        summary:
          'Logs revealed the application crashes because it cannot reach the database service. The root cause is a missing or misconfigured dependency.',
      },
      {
        command: 'kubectl describe pod <name>',
        output: `State:          Waiting
  Reason:       CrashLoopBackOff
Last State:     Terminated
  Reason:       Error
  Exit Code:    2
  Started:      Wed, 25 Feb 2026 10:31:00 +0000
  Finished:     Wed, 25 Feb 2026 10:31:05 +0000
Events:
  Type     Reason   Age   From     Message
  ----     ------   ----  ----     -------
  Normal   Pulled   3m    kubelet  Successfully pulled image "myapp:v2"
  Warning  BackOff  30s   kubelet  Back-off restarting failed container`,
        summary:
          'describe confirmed exit code 2 (application error) and that the image pulled successfully -- ruling out image issues.',
      },
    ],
  },
  not_responding: {
    title: 'Pod running but not responding',
    description:
      'The pod shows Running status, but HTTP requests to the application time out or return errors.',
    steps: [
      {
        command: 'kubectl get pods',
        output: `NAME            READY   STATUS    RESTARTS   AGE
my-app-7b9f6   1/1     Running   0          12m`,
        summary:
          'Pod shows Running and Ready (1/1) -- the container itself is alive, so the issue is elsewhere.',
      },
      {
        command: 'kubectl logs <name>',
        output: `Listening on port 8080...
[WARN] Health check endpoint /healthz returning 503
[ERROR] Upstream service "payments-api" unreachable
[WARN] Request queue depth: 847 (threshold: 100)`,
        summary:
          'Logs show the app is running but an upstream dependency is unreachable, causing health checks to fail and requests to queue.',
      },
      {
        command: 'kubectl describe pod <name>',
        output: `Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Readiness Gates:    <none>
Events:             <none> (no recent events)`,
        summary:
          'describe shows all conditions True and no events -- Kubernetes thinks the pod is healthy. The problem is at the application or service level.',
      },
      {
        command: 'kubectl get svc',
        output: `NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
my-app-svc   ClusterIP   10.96.45.123    <none>        80/TCP     12m
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP    5d`,
        summary:
          'Service exists and maps port 80, but the app listens on 8080. The Service targetPort must match the container port for traffic to reach the application.',
      },
    ],
  },
};

const ALL_COMMANDS = [
  'kubectl get pods',
  'kubectl describe pod <name>',
  'kubectl logs <name>',
  'kubectl get events --sort-by=.lastTimestamp',
  'kubectl get svc',
  'kubectl delete pod <name>',
];

export function TroubleshootingFlowSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<string>('pending');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const scenario = SCENARIOS[selectedScenario];
  const expectedCommands = scenario.steps.map((s) => s.command);

  function handleScenarioChange(key: string) {
    setSelectedScenario(key);
    resetState();
  }

  function resetState() {
    setCurrentStep(0);
    setCompletedSteps([]);
    setHint(null);
    setFinished(false);
  }

  function handleCommandClick(command: string) {
    if (finished) return;

    const expected = expectedCommands[currentStep];

    if (command === expected) {
      setHint(null);
      const nextCompleted = [...completedSteps, currentStep];
      setCompletedSteps(nextCompleted);

      if (currentStep + 1 >= scenario.steps.length) {
        setFinished(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      const hintText = buildHint(command, expected, selectedScenario, currentStep);
      setHint(hintText);
    }
  }

  function isCommandCompleted(command: string): boolean {
    return completedSteps.some((i) => scenario.steps[i].command === command);
  }

  return (
    <div className="rounded-xl border border-muted/30 bg-surface p-5 space-y-4">
      <h3 className="text-lg font-semibold text-text">
        Troubleshooting Flow Simulator
      </h3>
      <p className="text-sm text-muted">
        Practice the systematic order for debugging Kubernetes pod issues.
        Select a scenario, then click the commands in the correct diagnostic order.
      </p>

      <div className="flex items-center gap-3">
        <label htmlFor="scenario-select" className="text-sm font-medium text-text">
          Scenario:
        </label>
        <select
          id="scenario-select"
          value={selectedScenario}
          onChange={(e) => handleScenarioChange(e.target.value)}
          className="rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          onClick={resetState}
          className="ml-auto rounded-md border border-muted/30 px-3 py-1.5 text-xs font-medium text-muted hover:text-text hover:border-primary transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="rounded-lg border border-muted/30 bg-background p-3">
        <p className="text-sm text-text font-medium">{scenario.title}</p>
        <p className="text-xs text-muted mt-1">{scenario.description}</p>
      </div>

      {hint && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <p className="text-sm text-warning">{hint}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ALL_COMMANDS.map((cmd) => {
          const completed = isCommandCompleted(cmd);
          return (
            <button
              key={cmd}
              onClick={() => handleCommandClick(cmd)}
              disabled={completed || finished}
              className={`rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
                completed
                  ? 'border-green-500/40 bg-green-500/10 text-green-400 cursor-default'
                  : finished
                    ? 'border-muted/20 bg-background text-muted/50 cursor-default'
                    : 'border-muted/30 bg-background text-text hover:border-primary hover:text-primary cursor-pointer'
              }`}
            >
              {completed && <span className="mr-1">&#10003;</span>}
              {cmd}
            </button>
          );
        })}
      </div>

      {completedSteps.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            Step-by-step output
          </p>
          {completedSteps.map((stepIndex) => {
            const step = scenario.steps[stepIndex];
            return (
              <div
                key={stepIndex}
                className="rounded-lg border border-muted/30 bg-background p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs">&#10003;</span>
                  <span className="text-xs font-mono text-primary">
                    $ {step.command}
                  </span>
                </div>
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed">
                  {step.output}
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {finished && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-green-400">
            Scenario complete -- here is what each step revealed:
          </p>
          {scenario.steps.map((step, i) => (
            <div key={i} className="text-xs text-text">
              <span className="font-mono text-primary">{step.command}</span>
              <span className="text-muted mx-1">--</span>
              <span>{step.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildHint(
  clicked: string,
  expected: string,
  scenarioKey: string,
  stepIndex: number
): string {
  if (clicked === 'kubectl delete pod <name>') {
    return 'Deleting the pod destroys diagnostic information. Always investigate before deleting.';
  }

  if (stepIndex === 0 && clicked !== 'kubectl get pods') {
    return 'Start with "kubectl get pods" to see the current status before diving deeper.';
  }

  if (scenarioKey === 'crashloop' && stepIndex === 1 && clicked === 'kubectl describe pod <name>') {
    return 'For CrashLoopBackOff, check logs first -- they usually reveal why the application is crashing.';
  }

  if (scenarioKey === 'pending' && stepIndex === 1 && clicked === 'kubectl logs <name>') {
    return 'A Pending pod has not started yet, so there are no logs. Use describe to check scheduling events.';
  }

  if (scenarioKey === 'not_responding' && stepIndex === 3 && clicked !== 'kubectl get svc') {
    return 'The pod is running and logs show a port mismatch hint. Check the Service definition next.';
  }

  return `Not quite. Try "${expected}" next -- it gives the most useful information at this stage.`;
}
