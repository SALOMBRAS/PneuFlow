import { useEffect, useMemo, useState } from 'react';
import NotificationCard from './NotificationCard';

const DESKTOP_QUERY = '(min-width: 600px)';

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

export default function NotificationToastViewport({ queue, onDismiss, onPause, onResume }) {
  const isDesktop = useDesktopLayout();
  const maxVisible = isDesktop ? 3 : 2;
  const visibleItems = useMemo(() => queue.slice(0, maxVisible), [queue, maxVisible]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`pf-notification-viewport ${isDesktop ? 'pf-notification-viewport--desktop' : 'pf-notification-viewport--mobile'}`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {visibleItems.map((item) => (
        <div key={item.toastId} className={`pf-notification-viewport__item ${item.closing ? 'is-closing' : ''}`}>
          <NotificationCard
            notification={item}
            compact={!isDesktop}
            showClose
            onClose={() => onDismiss(item.toastId)}
            onMouseEnter={() => onPause(item.toastId)}
            onMouseLeave={() => onResume(item.toastId)}
            onFocus={() => onPause(item.toastId)}
            onBlur={() => onResume(item.toastId)}
          />
        </div>
      ))}
    </div>
  );
}
