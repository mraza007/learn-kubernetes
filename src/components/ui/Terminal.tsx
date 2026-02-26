'use client';

import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

export interface TerminalLine {
	type: 'command' | 'output' | 'error';
	content: string;
	delay?: number;
}

interface TerminalProps {
	lines: TerminalLine[];
	autoPlay?: boolean;
	onComplete?: () => void;
	showPrompt?: boolean;
	className?: string;
}

export function Terminal({
	lines,
	autoPlay = true,
	onComplete,
	showPrompt = true,
	className = '',
}: TerminalProps) {
	const [displayedLines, setDisplayedLines] = useState<TerminalLine[]>([]);
	const [lineIndex, setLineIndex] = useState(0);
	const [charIndex, setCharIndex] = useState(0);
	const [typing, setTyping] = useState(false);

	const rootRef = useRef<HTMLDivElement>(null);
	const dotsRef = useRef<HTMLDivElement>(null);
	const cursorRef = useRef<HTMLSpanElement>(null);

	// Entrance animation for the terminal container
	useEffect(() => {
		if (rootRef.current) {
			anime({
				targets: rootRef.current,
				opacity: [0, 1],
				translateY: [30, 0],
				duration: 800,
				easing: 'easeOutExpo',
			});
		}
	}, []);

	// Header dots scale-in animation
	useEffect(() => {
		if (dotsRef.current) {
			anime({
				targets: dotsRef.current.children,
				scale: [0, 1],
				duration: 400,
				delay: anime.stagger(80, { start: 300 }),
				easing: 'easeOutBack',
			});
		}
	}, []);

 // Cursor blink animation
 useEffect(() => {
    if (cursorRef.current) {
      anime({
        targets: cursorRef.current,
        opacity: [1, 0, 1],
        duration: 1000,
        loop: true,
        easing: 'steps(2)',
      });
    }
    return () => {
      if (cursorRef.current) {
        anime.remove(cursorRef.current);
      }
    };
  }, [typing]);

	// Typing / line progression
	useEffect(() => {
		if (!autoPlay || lineIndex >= lines.length) {
			if (lineIndex >= lines.length && onComplete) onComplete();
			return;
		}

		const line = lines[lineIndex];
		const wait = line.delay ?? 0;

		const timeout = setTimeout(
			() => {
				if (line.type === 'command') {
					setTyping(true);
					if (charIndex < line.content.length) {
						setCharIndex((prev) => prev + 1);
					} else {
						setDisplayedLines((prev) => [...prev, line]);
						setLineIndex((prev) => prev + 1);
						setCharIndex(0);
						setTyping(false);
					}
				} else {
					setDisplayedLines((prev) => [...prev, line]);
					setLineIndex((prev) => prev + 1);
				}
			},
			wait || (line.type === 'command' ? 25 + Math.random() * 25 : 100),
		);

		return () => clearTimeout(timeout);
	}, [autoPlay, lineIndex, charIndex, lines, onComplete]);

	const activeLine = lines[lineIndex];

	return (
		<div
			ref={rootRef}
			className={`opacity-0 rounded-xl border border-muted/30 bg-terminal overflow-hidden shadow-2xl ${className}`}
		>
			{/* Header bar */}
			<div className="flex items-center gap-2 px-4 py-3 bg-surface/50 border-b border-muted/30">
				<div ref={dotsRef} className="flex items-center gap-1.5">
					<span className="w-3 h-3 rounded-full bg-[#ff5f57] scale-0" />
					<span className="w-3 h-3 rounded-full bg-[#febc2e] scale-0" />
					<span className="w-3 h-3 rounded-full bg-[#28c840] scale-0" />
				</div>
				<span className="ml-2 text-xs font-mono text-muted">terminal</span>
			</div>

			{/* Content area */}
			<div className="p-5 font-mono text-sm min-h-[140px] leading-relaxed">
				{displayedLines.map((line, idx) => (
					<div key={idx} className="mb-1.5">
						{line.type === 'command' && showPrompt ? (
							<span className="text-primary mr-2">$</span>
						) : null}
						<span
							className={
								line.type === 'error'
									? 'text-danger'
									: line.type === 'output'
										? 'text-muted'
										: 'text-text'
							}
						>
							{line.content}
						</span>
					</div>
				))}
				{typing && activeLine?.type === 'command' ? (
					<div className="mb-1.5">
						{showPrompt ? (
							<span className="text-primary mr-2">$</span>
						) : null}
						<span className="text-text">
							{activeLine.content.slice(0, charIndex)}
						</span>
						<span ref={cursorRef} className="text-primary">
							▋
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}
