import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from './StoreContext';
import { NotificationCenter, NotificationToastViewport } from '../components/Notifications';
import { DEFAULT_CATEGORY_PREFERENCES, notificationService } from '../services/notifications';

const DESKTOP_QUERY = '(min-width: 600px)';
const DESKTOP_VISIBLE_MS = 5000;
const DESKTOP_FADE_MS = 1500;

export const NotificationContext = createContext(null);

const getIsDesktop = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(DESKTOP_QUERY).matches;
};

const getDesktopTimings = () => ({
  visibleMs: DESKTOP_VISIBLE_MS,
  fadeMs: DESKTOP_FADE_MS,
  totalMs: DESKTOP_VISIBLE_MS + DESKTOP_FADE_MS
});

function buildLocalNotification({ type, title, message, category = 'general', actionPath = null, metadata = {} }) {
  return {
    id: `local:${crypto.randomUUID()}`,
    type,
    title,
    message,
    category,
    actionPath,
    metadata,
    readAt: null,
    createdAt: new Date().toISOString()
  };
}

export function NotificationProvider({ children }) {
  const { store, user, session } = useStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [historyError, setHistoryError] = useState('');
  const [popupEnabled, setPopupEnabledState] = useState(true);
  const [categoryPreferences, setCategoryPreferences] = useState(DEFAULT_CATEGORY_PREFERENCES);
  const [centerOpen, setCenterOpenState] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  const mountedRef = useRef(false);
  const subscriptionRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const toastTimersRef = useRef({});
  const activeToastIdsRef = useRef(new Set());
  const popupEnabledRef = useRef(true);
  const categoryPreferencesRef = useRef(DEFAULT_CATEGORY_PREFERENCES);
  const isDesktopRef = useRef(getIsDesktop());
  const subscribedAtRef = useRef(null);
  const lastLoadedAtRef = useRef(null);
  const lastTriggerRef = useRef(null);

  const clearToastTimer = (toastId) => {
    const timer = toastTimersRef.current[toastId];
    if (timer) {
      clearTimeout(timer);
      delete toastTimersRef.current[toastId];
    }
  };

  const removeToast = (toastId) => {
    clearToastTimer(toastId);
    activeToastIdsRef.current.delete(toastId.split(':')[0]);
    setToastQueue((current) => current.filter((item) => item.toastId !== toastId));
  };

  const dismissToast = (toastId) => {
    clearToastTimer(toastId);
    setToastQueue((current) =>
      current.map((item) => (
        item.toastId === toastId ? { ...item, closing: true } : item
      ))
    );

    const { fadeMs } = getDesktopTimings();
    toastTimersRef.current[toastId] = setTimeout(() => removeToast(toastId), fadeMs);
  };

  const scheduleToast = (notification) => {
    if (!isDesktopRef.current || !popupEnabledRef.current) return;
    if (activeToastIdsRef.current.has(notification.id)) return;

    const timings = getDesktopTimings();
    const toastId = `${notification.id}:${Date.now()}`;
    activeToastIdsRef.current.add(notification.id);

    setToastQueue((current) => [
      ...current,
      {
        ...notification,
        toastId,
        closing: false,
        paused: false,
        startedAt: Date.now(),
        remainingMs: timings.visibleMs
      }
    ]);

    toastTimersRef.current[toastId] = setTimeout(() => dismissToast(toastId), timings.visibleMs);
  };

  const pauseToast = (toastId) => {
    clearToastTimer(toastId);
    setToastQueue((current) =>
      current.map((item) => (
        item.toastId === toastId
          ? {
              ...item,
              paused: true,
              remainingMs: Math.max(250, item.remainingMs - (Date.now() - item.startedAt))
            }
          : item
      ))
    );
  };

  const resumeToast = (toastId) => {
    setToastQueue((current) =>
      current.map((item) => {
        if (item.toastId !== toastId || item.closing) return item;

        clearToastTimer(toastId);
        toastTimersRef.current[toastId] = setTimeout(() => dismissToast(toastId), item.remainingMs);

        return {
          ...item,
          paused: false,
          startedAt: Date.now()
        };
      })
    );
  };

  const ingestNotifications = (items, { prepend = false } = {}) => {
    if (!items.length) return;

    setNotifications((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      items.forEach((item) => {
        seenIdsRef.current.add(item.id);
        map.set(item.id, map.has(item.id) ? { ...map.get(item.id), ...item } : item);
      });

      const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (!prepend) {
        lastLoadedAtRef.current = merged.at(-1)?.createdAt || null;
      }
      return merged;
    });
  };

  const loadInitial = async () => {
    if (!user?.id || !store?.id) return;

    const [items, unread, preferences] = await Promise.all([
      notificationService.listForUser({ userId: user.id, storeId: store.id }),
      notificationService.countUnread(user.id, store.id),
      notificationService.getPreference(store.id, user.id)
    ]);

    seenIdsRef.current = new Set(items.map((item) => item.id));
    lastLoadedAtRef.current = items.at(-1)?.createdAt || null;
    setNotifications(items);
    setUnreadCount(unread);
    setPopupEnabledState(preferences.popupEnabled);
    setCategoryPreferences(preferences.categoryPreferences);
    setHasMore(items.length === notificationService.pageSize);
    setHistoryError('');
  };

  const teardownSubscription = async () => {
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  const closeCenter = () => {
    setCenterOpenState(false);
    requestAnimationFrame(() => {
      lastTriggerRef.current?.focus?.();
    });
  };

  const openCenter = (trigger = null) => {
    if (trigger) {
      lastTriggerRef.current = trigger;
    }
    setCenterOpenState(true);
  };

  const toggleCenter = (trigger = null) => {
    if (centerOpen) {
      closeCenter();
    } else {
      openCenter(trigger);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Object.keys(toastTimersRef.current).forEach(clearToastTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => {
      const nextIsDesktop = mediaQuery.matches;
      setIsDesktop(nextIsDesktop);
      isDesktopRef.current = nextIsDesktop;
      if (!nextIsDesktop) {
        Object.keys(toastTimersRef.current).forEach(clearToastTimer);
        setToastQueue([]);
        activeToastIdsRef.current.clear();
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    popupEnabledRef.current = popupEnabled;
  }, [popupEnabled]);

  useEffect(() => {
    categoryPreferencesRef.current = categoryPreferences;
  }, [categoryPreferences]);

  useEffect(() => {
    if (!session || !store?.id || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setToastQueue([]);
      setCenterOpenState(false);
      setHasMore(false);
      setLoadingMore(false);
      setHistoryError('');
      setPopupEnabledState(true);
      setCategoryPreferences(DEFAULT_CATEGORY_PREFERENCES);
      seenIdsRef.current = new Set();
      subscribedAtRef.current = null;
      teardownSubscription();
      return undefined;
    }

    let active = true;

    const setup = async () => {
      try {
        await loadInitial();
        if (!active) return;

        await teardownSubscription();
        const channel = notificationService.createRealtimeChannel({
          userId: user.id,
          onInsert: (notification) => {
            if (!mountedRef.current) return;
            if (seenIdsRef.current.has(notification.id)) return;
            if (notification.storeId !== store.id) return;

            seenIdsRef.current.add(notification.id);
            ingestNotifications([notification], { prepend: true });
            setUnreadCount((current) => current + (notification.readAt ? 0 : 1));

            if (subscribedAtRef.current && new Date(notification.createdAt).getTime() >= subscribedAtRef.current) {
              scheduleToast(notification);
            }
          }
        });

        subscriptionRef.current = channel;
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscribedAtRef.current = Date.now();
          }
        });
      } catch (error) {
        console.error('Erro ao carregar notificacoes:', error);
        setHistoryError(error?.message || 'Nao foi possivel carregar as notificacoes agora.');
      }
    };

    setup();

    return () => {
      active = false;
      teardownSubscription();
    };
  }, [session, store?.id, user?.id]);

  const loadMore = async () => {
    if (!user?.id || !store?.id || loadingMore || !hasMore || !lastLoadedAtRef.current) return;

    setLoadingMore(true);
    try {
      const nextItems = await notificationService.listForUser({
        userId: user.id,
        storeId: store.id,
        beforeCreatedAt: lastLoadedAtRef.current
      });
      ingestNotifications(nextItems);
      setHasMore(nextItems.length === notificationService.pageSize);
      setHistoryError('');
    } catch (error) {
      console.error('Erro ao carregar mais notificacoes:', error);
      setHistoryError(error?.message || 'Nao foi possivel carregar mais notificacoes.');
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (notificationId) => {
    const target = notifications.find((item) => item.id === notificationId);
    if (!target || target.readAt) return target;

    setNotifications((current) =>
      current.map((item) => (
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
      ))
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Erro ao marcar notificacao como lida:', error);
    }

    return target;
  };

  const markAllAsRead = async () => {
    if (!store?.id || unreadCount === 0) return;

    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead(store.id);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const persistPreferences = async (nextPopupEnabled, nextCategoryPreferences) => {
    if (!store?.id) return;

    try {
      const saved = await notificationService.setPreferences(store.id, {
        popupEnabled: nextPopupEnabled,
        categoryPreferences: nextCategoryPreferences
      });
      setPopupEnabledState(saved.popupEnabled);
      setCategoryPreferences(saved.categoryPreferences);
    } catch (error) {
      console.error('Erro ao salvar preferencia de notificacao:', error);
      throw error;
    }
  };

  const updatePopupPreference = async (nextValue) => {
    const previousPopupEnabled = popupEnabledRef.current;
    setPopupEnabledState(nextValue);

    try {
      await persistPreferences(nextValue, categoryPreferencesRef.current);
    } catch {
      setPopupEnabledState(previousPopupEnabled);
    }
  };

  const updateCategoryPreference = async (categoryKey, nextValue) => {
    const nextPreferences = {
      ...categoryPreferencesRef.current,
      [categoryKey]: nextValue
    };

    const previousPreferences = categoryPreferencesRef.current;
    setCategoryPreferences(nextPreferences);

    try {
      await persistPreferences(popupEnabledRef.current, nextPreferences);
    } catch {
      setCategoryPreferences(previousPreferences);
    }
  };

  const createTransientNotice = ({
    type,
    title,
    message,
    category = 'general',
    actionPath = null,
    metadata = {},
    silentPopup = false,
  }) => {
    const notification = buildLocalNotification({ type, title, message, category, actionPath, metadata });

    if (!silentPopup) {
      scheduleToast(notification);
    }

    return notification;
  };

  const createPersistentNotification = async ({
    type,
    title,
    message,
    category = 'general',
    actionPath = null,
    metadata = {},
    entityType = null,
    entityId = null
  }) => {
    if (!store?.id || !user?.id) {
      throw new Error('Usuario e loja sao obrigatorios para persistir notificacoes.');
    }

    const persistedNotification = await notificationService.createPersistentForCurrentUser({
      storeId: store.id,
      type,
      category,
      title,
      message,
      actionPath,
      entityType,
      entityId,
      metadata
    });

    if (!persistedNotification) {
      return null;
    }

    ingestNotifications([persistedNotification], { prepend: true });
    setUnreadCount((current) => current + (persistedNotification.readAt ? 0 : 1));
    setHistoryError('');
    scheduleToast(persistedNotification);
    return persistedNotification;
  };

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    historyError,
    popupEnabled,
    categoryPreferences,
    centerOpen,
    isDesktop,
    openCenter,
    closeCenter,
    toggleCenter,
    hasMore,
    loadingMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    setPopupEnabled: updatePopupPreference,
    setCategoryEnabled: updateCategoryPreference,
    notifyTransientSuccess: (options) => createTransientNotice({ type: 'success', ...options }),
    notifyTransientInfo: (options) => createTransientNotice({ type: 'info', ...options }),
    notifyTransientWarning: (options) => createTransientNotice({ type: 'warning', ...options }),
    notifyTransientError: (options) => createTransientNotice({ type: 'error', ...options }),
    createPersistentNotification
  }), [
    createPersistentNotification,
    createTransientNotice,
    notifications,
    unreadCount,
    historyError,
    popupEnabled,
    categoryPreferences,
    centerOpen,
    isDesktop,
    hasMore,
    loadingMore
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationCenter />
      {isDesktop && (
        <NotificationToastViewport
          queue={toastQueue}
          onDismiss={dismissToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      )}
    </NotificationContext.Provider>
  );
}
