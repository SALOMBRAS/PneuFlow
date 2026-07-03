import { useEffect, useRef, useState } from 'react';

const getPrefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const RevealOnScroll = ({
  as: Component = 'div',
  className = '',
  children,
  direction = 'up',
  delay = 0,
  duration = 600,
  distance = 24,
  stagger = 0,
  ...props
}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = (event) => setPrefersReducedMotion(event.matches);

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMotionPreference);

    return () => mediaQuery.removeEventListener('change', handleMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const resolvedDistance = prefersReducedMotion ? 0 : distance;
  const translateX = direction === 'left' ? `-${resolvedDistance}px` : direction === 'right' ? `${resolvedDistance}px` : '0';
  const translateY = direction === 'down' ? `-${resolvedDistance}px` : `${resolvedDistance}px`;

  return (
    <Component
      ref={ref}
      className={`reveal-on-scroll ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{
        '--reveal-delay': `${delay}ms`,
        '--reveal-duration': `${duration}ms`,
        '--reveal-x': translateX,
        '--reveal-y': direction === 'left' || direction === 'right' ? '0' : translateY,
        '--reveal-stagger': `${stagger}ms`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default RevealOnScroll;
