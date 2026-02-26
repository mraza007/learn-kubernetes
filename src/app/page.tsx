'use client';

import { HeroSection } from '@/components/hero/HeroSection';
import {
	Layer0Problem,
	Layer1Basics,
	Layer2Workloads,
	Layer3Services,
	Layer4Config,
	Layer5Storage,
	Layer6Scheduling,
	Layer7Reliability,
	Layer8ControlPlane,
} from '@/components/layers';
import { ScrollTracker } from '@/components/ui';

export default function Home() {
	return (
		<main className="relative overflow-x-hidden">
			<ScrollTracker />
			<HeroSection />
			<Layer0Problem />
			<Layer1Basics />
			<Layer2Workloads />
			<Layer3Services />
			<Layer4Config />
			<Layer5Storage />
			<Layer6Scheduling />
			<Layer7Reliability />
			<Layer8ControlPlane />

			{/* Footer */}
			<footer className="py-8 px-4 border-t border-muted/20">
				<div className="max-w-4xl mx-auto text-center text-sm text-muted font-mono space-y-2">
					<div>Kubernetes Made Easy &mdash; Learn Kubernetes Interactively</div>
					<div>
						Built by{' '}
						<a
							href="https://github.com/mraza007"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							mraza007
						</a>
						{' \u00B7 '}
						<a
							href="https://www.linkedin.com/in/muhammad-raza-07/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							LinkedIn
						</a>
					</div>
				</div>
			</footer>
		</main>
	);
}
