import { supabase } from '../lib/supabase';

const PAGE_SIZE = 30;
export const DEFAULT_CATEGORY_PREFERENCES = {
  new_leads: true,
  sales: true,
  low_stock: true,
  out_of_stock: true,
  operation_errors: true
};

const normalizeNotificationType = (type) => {
  if (['info', 'success', 'warning', 'error'].includes(type)) {
    return type;
  }

  return 'info';
};

const normalizeNotificationRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  recipientUserId: row.recipient_user_id,
  type: normalizeNotificationType(row.type),
  category: row.category || 'geral',
  title: row.title || 'Notificacao',
  message: row.message || '',
  entityType: row.entity_type || null,
  entityId: row.entity_id || null,
  actionPath: row.action_path || null,
  metadata: row.metadata || {},
  dedupeKey: row.dedupe_key || null,
  readAt: row.read_at || null,
  createdAt: row.created_at
});

const handleSupabaseError = (error, fallbackMessage) => {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
};

export const notificationService = {
  pageSize: PAGE_SIZE,

  normalizeNotificationRow,

  async listForUser({ userId, storeId, limit = PAGE_SIZE, onlyUnread = false, beforeCreatedAt = null }) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.is('read_at', null);
    }

    if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt);
    }

    const { data, error } = await query;
    handleSupabaseError(error, 'Nao foi possivel carregar as notificacoes.');
    return (data || []).map(normalizeNotificationRow);
  },

  async countUnread(userId, storeId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_user_id', userId)
      .eq('store_id', storeId)
      .is('read_at', null);

    handleSupabaseError(error, 'Nao foi possivel carregar o contador de notificacoes.');
    return count || 0;
  },

  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .is('read_at', null)
      .select('*')
      .maybeSingle();

    handleSupabaseError(error, 'Nao foi possivel marcar a notificacao como lida.');
    return data ? normalizeNotificationRow(data) : null;
  },

  async markAllAsRead(storeId) {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_store_id: storeId
    });

    handleSupabaseError(error, 'Nao foi possivel marcar todas as notificacoes como lidas.');
    return Number(data || 0);
  },

  async markManyAsRead(notificationIds = []) {
    const ids = Array.from(new Set((notificationIds || []).filter(Boolean)));
    if (ids.length === 0) return 0;

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .is('read_at', null)
      .select('id');

    handleSupabaseError(error, 'Nao foi possivel marcar as notificacoes como lidas.');
    return Array.isArray(data) ? data.length : 0;
  },

  async deleteNotification(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    handleSupabaseError(error, 'Nao foi possivel excluir a notificacao.');
    return true;
  },

  async getPreference(storeId, userId) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('popup_enabled, category_preferences')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .maybeSingle();

    handleSupabaseError(error, 'Nao foi possivel carregar as preferencias de notificacao.');
    return {
      popupEnabled: data?.popup_enabled ?? true,
      categoryPreferences: {
        ...DEFAULT_CATEGORY_PREFERENCES,
        ...(data?.category_preferences || {})
      }
    };
  },

  async setPreferences(storeId, { popupEnabled, categoryPreferences }) {
    const { data, error } = await supabase.rpc('upsert_notification_preference', {
      p_store_id: storeId,
      p_popup_enabled: popupEnabled,
      p_category_preferences: categoryPreferences
    });

    handleSupabaseError(error, 'Nao foi possivel salvar a preferencia de notificacao.');
    return {
      popupEnabled: data?.popup_enabled ?? popupEnabled,
      categoryPreferences: {
        ...DEFAULT_CATEGORY_PREFERENCES,
        ...(data?.category_preferences || categoryPreferences || {})
      }
    };
  },

  async createPersistentForCurrentUser({
    storeId,
    type,
    category,
    title,
    message,
    entityType = null,
    entityId = null,
    actionPath = null,
    metadata = {}
  }) {
    const { data, error } = await supabase.rpc('create_notification_for_current_user', {
      p_store_id: storeId,
      p_type: normalizeNotificationType(type),
      p_category: category || 'geral',
      p_title: title,
      p_message: message,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_action_path: actionPath,
      p_metadata: metadata
    });

    handleSupabaseError(error, 'Nao foi possivel registrar a notificacao.');
    return data ? normalizeNotificationRow(data) : null;
  },

  createRealtimeChannel({ userId, onInsert }) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`
        },
        (payload) => {
          if (payload?.new) {
            onInsert(normalizeNotificationRow(payload.new));
          }
        }
      );
  }
};
