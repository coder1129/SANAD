'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { useRef, type ReactNode } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

type RevealDirection = 'up' | 'left' | 'right' | 'none';
type HeadingLevel = 1 | 2 | 3;

interface MotionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  distance?: number;
  initialOpacity?: number;
}

interface MotionHeadingProps {
  className?: string;
  delay?: number;
  id?: string;
  level?: HeadingLevel;
  lines?: readonly string[];
  text: string;
}

interface MotionMediaRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  parallax?: boolean;
  parallaxDistance?: number;
}

interface MotionStaggerListProps {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  ordered?: boolean;
  stagger?: number;
}

interface MotionStaggerItemProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}

interface MotionTimelineProps {
  children: ReactNode;
  className?: string;
}

const easeOut = [0.22, 1, 0.36, 1] as const;
const revealViewport = {
  amount: 0.16,
  margin: '0px 0px -64px',
  once: true,
} as const;

function getOffset(direction: RevealDirection, distance: number) {
  switch (direction) {
    case 'left':
      return { x: -Math.min(distance, 12), y: 0 };
    case 'right':
      return { x: Math.min(distance, 12), y: 0 };
    case 'none':
      return { x: 0, y: 0 };
    default:
      return { x: 0, y: distance };
  }
}

export function MotionReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 20,
  initialOpacity = 0,
}: MotionRevealProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();
  const offset = getOffset(direction, distance);

  return (
    <motion.div
      data-motion-reveal
      className={className}
      initial={reduceMotion ? false : { opacity: initialOpacity, ...offset }}
      transition={{ delay, duration: 0.62, ease: easeOut }}
      viewport={revealViewport}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
    >
      {_copy(children)}
    </motion.div>
  );
}

const headingLineVariants = {
  hidden: { opacity: 0, y: '112%' },
  visible: {
    opacity: 1,
    transition: { duration: 0.78, ease: easeOut },
    y: '0%',
  },
};

export function MotionHeading({
  className,
  delay = 0,
  id,
  level = 2,
  lines,
  text,
}: MotionHeadingProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();
  const displayLines = lines?.length ? lines : [text];
  const animationProps = {
    'data-motion-reveal': true,
    'aria-label': text,
    className,
    id,
    initial: reduceMotion ? false : 'hidden',
    variants: {
      hidden: {},
      visible: {
        transition: {
          delayChildren: reduceMotion ? 0 : delay,
          staggerChildren: reduceMotion ? 0 : 0.09,
        },
      },
    },
    viewport: revealViewport,
    whileInView: 'visible',
  } as const;

  const content = displayLines.map((line) => (
    <span aria-hidden="true" className="block overflow-hidden" key={line}>
      <motion.span
        className="block"
        variants={reduceMotion ? undefined : headingLineVariants}
      >
        {_copy(line)}
      </motion.span>
    </span>
  ));

  if (level === 1)
    return <motion.h1 {...animationProps}>{_copy(content)}</motion.h1>;
  if (level === 3)
    return <motion.h3 {...animationProps}>{_copy(content)}</motion.h3>;
  return <motion.h2 {...animationProps}>{_copy(content)}</motion.h2>;
}

export function MotionAccentLine({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      data-motion-reveal
      aria-hidden="true"
      className={className}
      initial={reduceMotion ? false : { scaleX: 0 }}
      transition={{ duration: 0.72, ease: easeOut }}
      viewport={revealViewport}
      whileInView={{ scaleX: 1 }}
    />
  );
}

export function MotionMediaReveal({
  children,
  className,
  delay = 0,
  parallax = false,
  parallaxDistance = 16,
}: MotionMediaRevealProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();
  const mediaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    offset: ['start end', 'end start'],
    target: mediaRef,
  });
  const rawY = useTransform(
    scrollYProgress,
    [0, 1],
    [-parallaxDistance, parallaxDistance],
  );
  const smoothY = useSpring(rawY, { damping: 30, stiffness: 120 });

  return (
    <motion.div className={className} ref={mediaRef}>
      <motion.div
        data-motion-reveal
        className="relative size-full"
        initial={reduceMotion ? false : { opacity: 0.92, scale: 1.045 }}
        style={{ y: parallax && !reduceMotion ? smoothY : 0 }}
        transition={{ delay, duration: 0.9, ease: easeOut }}
        viewport={{ ...revealViewport, amount: 0.12 }}
        whileInView={{ opacity: 1, scale: 1 }}
      >
        {_copy(children)}
      </motion.div>
    </motion.div>
  );
}

const staggerItemVariants = {
  hidden: { opacity: 0, scale: 0.975, y: 36 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      damping: 24,
      mass: 0.8,
      stiffness: 180,
      type: 'spring' as const,
    },
    y: 0,
  },
};

function getStaggerAnimationProps(
  reduceMotion: boolean | null,
  delay: number,
  stagger: number,
) {
  return {
    initial: reduceMotion ? false : 'hidden',
    variants: {
      hidden: {},
      visible: {
        transition: {
          delayChildren: reduceMotion ? 0 : delay,
          staggerChildren: reduceMotion ? 0 : stagger,
        },
      },
    },
    viewport: { ...revealViewport, amount: 0.1 },
    whileInView: 'visible',
  } as const;
}

export function MotionStaggerList({
  ariaLabel,
  children,
  className,
  delay = 0,
  ordered = false,
  stagger = 0.11,
}: MotionStaggerListProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();
  const animationProps = getStaggerAnimationProps(reduceMotion, delay, stagger);

  if (ordered) {
    return (
      <motion.ol
        aria-label={_copy(ariaLabel)}
        className={className}
        {...animationProps}
      >
        {_copy(children)}
      </motion.ol>
    );
  }

  return (
    <motion.ul
      aria-label={_copy(ariaLabel)}
      className={className}
      {...animationProps}
    >
      {_copy(children)}
    </motion.ul>
  );
}

export function MotionStaggerItem({
  children,
  className,
  hoverLift = false,
}: MotionStaggerItemProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      data-motion-reveal
      className={className}
      transition={
        hoverLift && !reduceMotion
          ? { damping: 24, stiffness: 260, type: 'spring' }
          : undefined
      }
      variants={reduceMotion ? undefined : staggerItemVariants}
      whileHover={hoverLift && !reduceMotion ? { y: -7 } : undefined}
    >
      {_copy(children)}
    </motion.li>
  );
}

export function MotionTimeline({ children, className }: MotionTimelineProps) {
  const _copy = useCopy();

  const reduceMotion = useReducedMotion();
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    offset: ['start 78%', 'end 52%'],
    target: timelineRef,
  });
  const progress = useSpring(scrollYProgress, {
    damping: 28,
    stiffness: 120,
  });
  const animationProps = getStaggerAnimationProps(reduceMotion, 0.08, 0.16);

  return (
    <div className="relative" ref={timelineRef}>
      <motion.span
        aria-hidden="true"
        className="absolute top-0 left-0 z-10 hidden h-0.5 w-full origin-left bg-accent lg:block"
        style={{ scaleX: reduceMotion ? 1 : progress }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 z-10 w-0.5 origin-top bg-accent lg:hidden"
        style={{ scaleY: reduceMotion ? 1 : progress }}
      />
      <motion.ol className={className} {...animationProps}>
        {_copy(children)}
      </motion.ol>
    </div>
  );
}
