'use client';

import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

interface FadeInProps {
	children: React.ReactNode;
	delay?: number;
	direction?: 'up' | 'down' | 'left' | 'right' | 'none';
	className?: string;
	once?: boolean;
	duration?: number;
	distance?: number;
}

function getTransform(
	direction: FadeInProps['direction'],
	distance: number,
): { translateX?: number; translateY?: number } {
	switch (direction) {
		case 'down':
			return { translateY: -distance };
		case 'left':
			return { translateX: distance };
		case 'right':
			return { translateX: -distance };
		case 'none':
			return {};
		case 'up':
		default:
			return { translateY: distance };
	}
}

function getAnimateTo(
	direction: FadeInProps['direction'],
): { translateX?: number; translateY?: number } {
	switch (direction) {
		case 'down':
		case 'up':
			return { translateY: 0 };
		case 'left':
		case 'right':
			return { translateX: 0 };
		case 'none':
		default:
			return {};
	}
}

export function FadeIn({
	children,
	delay = 0,
	direction = 'up',
	className = '',
	once = true,
	duration = 800,
	distance = 40,
}: FadeInProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [hasAnimated, setHasAnimated] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const initialTransform = getTransform(direction, distance);
		anime.set(el, { opacity: 0, ...initialTransform });

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					if (once && hasAnimated) continue;

					anime({
						targets: el,
						opacity: [0, 1],
						...getAnimateTo(direction),
						duration,
						delay: delay * 1000,
						easing: 'easeOutExpo',
					});

					setHasAnimated(true);

					if (once) {
						observer.unobserve(el);
					}
				}
			},
			{ threshold: 0.1, rootMargin: '-50px' },
		);

		observer.observe(el);

		return () => {
			observer.disconnect();
		};
	}, [direction, distance, duration, delay, once, hasAnimated]);

	return (
		<div ref={ref} className={className} style={{ opacity: 0 }}>
			{children}
		</div>
	);
}
