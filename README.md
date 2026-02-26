# Kubernetes Made Easy

An interactive tutorial that teaches Kubernetes from the ground up. Learn how orchestration actually works through hands-on browser simulations — no cluster required.

## What You'll Learn

- **The Problem** — Why containers alone aren't enough and how desired state works
- **Cluster Basics** — Control plane and node architecture
- **Workloads** — Deployments, StatefulSets, DaemonSets, and Jobs
- **Services & Networking** — ClusterIP, NodePort, LoadBalancer, and NetworkPolicies
- **Config & Access** — ConfigMaps, Secrets, ServiceAccounts, and RBAC
- **Storage** — Ephemeral vs persistent volumes with PV/PVC
- **Scheduling** — Resource requests, limits, taints, and affinities
- **Reliability** — Probes, rolling updates, rollbacks, and HPA autoscaling
- **Control Plane** — The full kubectl apply journey and troubleshooting flow
- **Bonus** — Mixed knowledge assessment

## Getting Started

Visit the live site or run locally:

```bash
git clone https://github.com/mraza007/learn-kubernetes.git
cd learn-kubernetes
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start learning.

## Tech Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS
- Framer Motion + anime.js for animations
- Zustand for state management

## Built By

[Muhammad](https://www.linkedin.com/in/muhammad-raza-07/)

## Contributing

PRs welcome. Run `npm run build` to check for errors before submitting.

## License

MIT
