'use client';
import { useInViewFadeIn } from '../../hooks/useInViewFadeIn';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delayMs?: number;
}

export function FadeInSection({ children, className, style, delayMs = 0 }: Props) {
  const { ref, inView } = useInViewFadeIn<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 0.28s ease ${delayMs}ms, transform 0.28s ease ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
