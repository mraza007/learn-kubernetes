'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { Boxes, Network, ShieldCheck, Server, Container, Cpu } from 'lucide-react';

const FloatingIcon = ({
  Icon,
  className,
  delay,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
  delay: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    anime({
      targets: ref.current,
      translateY: [
        { value: -20, duration: 2000 },
        { value: 20, duration: 2000 },
        { value: -20, duration: 2000 },
      ],
      translateX: [
        { value: 10, duration: 3000 },
        { value: -10, duration: 3000 },
        { value: 10, duration: 3000 },
      ],
      rotate: [
        { value: 5, duration: 2500 },
        { value: -5, duration: 2500 },
        { value: 5, duration: 2500 },
      ],
      opacity: [
        { value: 0, duration: 0 },
        { value: 0.6, duration: 1000 },
      ],
      scale: [
        { value: 0.8, duration: 0 },
        { value: 1, duration: 800 },
      ],
      loop: true,
      easing: 'easeInOutSine',
      delay,
    });
  }, [delay]);

  return (
    <div ref={ref} className={`absolute opacity-0 ${className}`}>
      <Icon className="w-8 h-8 text-primary/30" />
    </div>
  );
};

const TechIcon = () => {
  const iconRef = useRef<SVGSVGElement>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const dataFlowRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!iconRef.current) return;

    if (cursorRef.current) {
      anime({
        targets: cursorRef.current,
        opacity: [1, 0],
        duration: 530,
        loop: true,
        easing: 'steps(1)',
      });
    }

    if (dataFlowRef.current) {
      const particles = dataFlowRef.current.querySelectorAll('.data-particle');
      anime({
        targets: particles,
        translateX: [0, 60],
        opacity: [0, 1, 1, 0],
        duration: 1500,
        delay: anime.stagger(300),
        loop: true,
        easing: 'linear',
      });
    }

    anime({
      targets: iconRef.current.querySelector('.container-glow'),
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.02, 1],
      duration: 2000,
      loop: true,
      easing: 'easeInOutSine',
    });
  }, []);

  return (
    <svg
      ref={iconRef}
      viewBox="0 0 100 80"
      className="w-24 h-20 md:w-32 md:h-24"
      fill="none"
    >
      {/* Central hexagon / wheel shape */}
      <polygon
        points="50,10 75,22 75,48 50,60 25,48 25,22"
        className="fill-surface stroke-primary/50"
        strokeWidth="2"
      />
      <polygon
        points="50,10 75,22 75,48 50,60 25,48 25,22"
        className="container-glow fill-primary/10"
      />

      {/* Hub circle */}
      <circle cx="50" cy="35" r="8" className="fill-primary/20 stroke-primary/40" strokeWidth="1.5" />

      {/* Spokes from center to vertices */}
      <line x1="50" y1="35" x2="50" y2="14" className="stroke-primary/30" strokeWidth="1" />
      <line x1="50" y1="35" x2="72" y2="24" className="stroke-primary/30" strokeWidth="1" />
      <line x1="50" y1="35" x2="72" y2="46" className="stroke-primary/30" strokeWidth="1" />
      <line x1="50" y1="35" x2="50" y2="56" className="stroke-primary/30" strokeWidth="1" />
      <line x1="50" y1="35" x2="28" y2="46" className="stroke-primary/30" strokeWidth="1" />
      <line x1="50" y1="35" x2="28" y2="24" className="stroke-primary/30" strokeWidth="1" />

      {/* Small dots at vertices */}
      <circle cx="50" cy="14" r="3" className="fill-primary/50" />
      <circle cx="72" cy="24" r="3" className="fill-secondary/50" />
      <circle cx="72" cy="46" r="3" className="fill-primary/50" />
      <circle cx="50" cy="56" r="3" className="fill-secondary/50" />
      <circle cx="28" cy="46" r="3" className="fill-primary/50" />
      <circle cx="28" cy="24" r="3" className="fill-secondary/50" />

      {/* Terminal line at bottom */}
      <rect x="30" y="66" width="18" height="2" rx="1" className="fill-primary/60" />
      <rect ref={cursorRef} x="50" y="66" width="6" height="2" rx="1" className="fill-primary" />

      {/* Data flow particles */}
      <g ref={dataFlowRef}>
        <line x1="5" y1="35" x2="25" y2="35" className="stroke-primary/20" strokeWidth="1" strokeDasharray="2 2" />
        <circle className="data-particle fill-primary" cx="5" cy="35" r="2" opacity="0" />
        <circle className="data-particle fill-secondary" cx="5" cy="35" r="2" opacity="0" />
        <circle className="data-particle fill-primary" cx="5" cy="35" r="2" opacity="0" />
      </g>

      {/* Right side outgoing */}
      <line x1="75" y1="35" x2="95" y2="35" className="stroke-primary/20" strokeWidth="1" strokeDasharray="2 2" />

      {/* Corner brackets */}
      <path d="M15 18 L15 10 L23 10" className="stroke-primary/40" strokeWidth="1.5" fill="none" />
      <path d="M85 18 L85 10 L77 10" className="stroke-primary/40" strokeWidth="1.5" fill="none" />
      <path d="M15 58 L15 66 L23 66" className="stroke-primary/40" strokeWidth="1.5" fill="none" />
      <path d="M85 58 L85 66 L77 66" className="stroke-primary/40" strokeWidth="1.5" fill="none" />
    </svg>
  );
};

export function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (titleRef.current) {
      const text = titleRef.current.innerText;
      titleRef.current.innerHTML = text
        .split('')
        .map((char) =>
          char === ' '
            ? ' '
            : `<span class="inline-block opacity-0">${char}</span>`
        )
        .join('');

      anime({
        targets: titleRef.current.querySelectorAll('span'),
        opacity: [0, 1],
        translateY: [50, 0],
        rotateX: [-90, 0],
        duration: 1200,
        delay: anime.stagger(50, { start: 300 }),
        easing: 'easeOutExpo',
      });
    }

    if (subtitleRef.current) {
      anime({
        targets: subtitleRef.current,
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 1000,
        delay: 1000,
        easing: 'easeOutExpo',
      });
    }

    if (descRef.current) {
      anime({
        targets: descRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        delay: 1400,
        easing: 'easeOutExpo',
      });
    }

    if (containerRef.current) {
      anime({
        targets: containerRef.current,
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: 1000,
        delay: 1800,
        easing: 'easeOutElastic(1, 0.5)',
      });
    }

    if (scrollRef.current) {
      anime({
        targets: scrollRef.current,
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 800,
        delay: 2200,
        easing: 'easeOutExpo',
      });

      anime({
        targets: scrollRef.current.querySelector('.scroll-dot'),
        translateY: [0, 12, 0],
        duration: 1500,
        loop: true,
        easing: 'easeInOutSine',
        delay: 2500,
      });
    }
  }, [mounted]);

  const handleContainerHover = () => {
    if (containerRef.current) {
      anime({
        targets: containerRef.current,
        scale: [1, 1.05, 1],
        rotateY: [0, 10, 0],
        duration: 600,
        easing: 'easeOutElastic(1, 0.5)',
      });
    }
  };

  const scrollToContent = useCallback(() => {
    const firstSection = document.getElementById('section-0');
    if (firstSection) {
      firstSection.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
    }
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45, 212, 191, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 212, 191, 1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating icons */}
      <FloatingIcon Icon={Boxes} className="top-[15%] left-[10%]" delay={0} />
      <FloatingIcon Icon={Network} className="top-[20%] right-[15%]" delay={400} />
      <FloatingIcon Icon={ShieldCheck} className="bottom-[30%] left-[8%]" delay={800} />
      <FloatingIcon Icon={Server} className="bottom-[25%] right-[12%]" delay={1200} />
      <FloatingIcon Icon={Container} className="top-[40%] left-[5%]" delay={1600} />
      <FloatingIcon Icon={Cpu} className="top-[35%] right-[8%]" delay={2000} />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="text-center relative z-10 max-w-4xl mx-auto">
        {/* Tech icon + title */}
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-4">
          <TechIcon />
          <div>
            <h1
              ref={titleRef}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-primary tracking-tight"
              style={{ perspective: '1000px' }}
            >
              Kubernetes
            </h1>
            <div className="text-xl md:text-2xl font-bold text-text tracking-wide">
              Made Easy
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div
          ref={subtitleRef}
          className="text-lg md:text-2xl font-mono text-muted mb-6 opacity-0"
        >
          Learn Kubernetes Concepts Interactively
        </div>

        {/* Tagline */}
        <p
          ref={descRef}
          className="text-base md:text-lg text-muted/70 max-w-xl mx-auto mb-12 opacity-0"
        >
          An interactive tutorial that teaches you Kubernetes from the ground up.
        </p>

        {/* Interactive button */}
        <div
          ref={containerRef}
          className="opacity-0 mb-16 cursor-pointer"
          onMouseEnter={handleContainerHover}
          onClick={scrollToContent}
        >
          <div className="inline-flex items-center gap-3 bg-surface/50 backdrop-blur-sm border border-primary/30 rounded-xl px-6 py-4 hover:border-primary/60 hover:bg-surface/80 transition-all group">
            <div className="text-primary font-mono text-sm">kubectl apply --interactive</div>
            <svg className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer"
        onClick={scrollToContent}
      >
        <div className="flex flex-col items-center gap-3 text-muted hover:text-primary transition-colors">
          <span className="text-sm font-mono">Scroll to begin</span>
          <div className="w-6 h-10 rounded-full border-2 border-current flex items-start justify-center p-1.5">
            <div className="scroll-dot w-1.5 h-1.5 rounded-full bg-current" />
          </div>
        </div>
      </div>
    </section>
  );
}
