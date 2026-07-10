import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { useNotifications } from '../../hooks/useNotifications';
import { CalendarDays, CheckCircle, Clock3, MessageSquare, Minus, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { formatBRLCurrency } from '../../utils/currency';
import {
  getLeadOfferPrice,
  getLeadOfferQuantity,
  getLeadHistoricalValue,
  getLeadPhysicalQuantity,
  getLeadItems,
  getLeadDistinctItemCount,
  getLeadQuantityPerOffer,
  getLeadSummaryLabel,
  getLeadTotalValue,
  isMultiItemLead
} from '../../utils/tireOffer';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 'all'];

const LEAD_STATUS = {
  em_atendimento: {
    label: 'Em atendimento',
    filterLabel: 'Em atendimento',
    className: 'lead-status--attending',
    rowClass: 'lead-row--attending',
    Icon: Clock3
  },
  vendido: {
    label: 'Vendido',
    filterLabel: 'Vendidos',
    className: 'lead-status--sold',
    rowClass: 'lead-row--sold',
    Icon: CheckCircle
  },
  desistencia: {
    label: 'Desistência',
    filterLabel: 'Desistência',
    className: 'lead-status--lost',
    rowClass: 'lead-row--lost',
    Icon: XCircle
  }
};

const STATUS_FILTERS = ['todos', 'em_atendimento', 'vendido', 'desistencia'];
const QUANTITY_SAVE_DEBOUNCE_MS = 650;
const SALE_CONFIRMATION_INITIAL_STATE = {
  open: false,
  lead: null,
  phone: '',
  summaryLabel: '',
  quantity: 1,
  totalValue: 0,
  error: '',
  saving: false
};

const normalizeQuantity = (value, fallback = 1) =>
  Math.max(1, Number.parseInt(value ?? fallback, 10) || 1);

const normalizeBrazilPhoneDigits = (value) => {
  let digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
};

const isValidBrazilPhoneDigits = (value) => {
  const digits = normalizeBrazilPhoneDigits(value);
  return digits.length === 10 || digits.length === 11;
};

const formatBrazilPhone = (value) => {
  const digits = normalizeBrazilPhoneDigits(value);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 6) {
    return `(${ddd}) ${rest}`;
  }

  if (digits.length <= 10) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};

const getLeadAvailableStock = (lead) => {
  const stock = Number(lead?.estoque_disponivel);
  if (!Number.isFinite(stock)) {
    return null;
  }

  return Math.max(0, Math.floor(stock / getLeadQuantityPerOffer(lead)));
};

const clampQuantityForLead = (value, lead, fallback = 1) => {
  const normalized = normalizeQuantity(value, fallback);
  const availableStock = getLeadAvailableStock(lead);

  if (availableStock == null || availableStock <= 0) {
    return normalized;
  }

  return Math.min(normalized, availableStock);
};

const getLeadFinalQuantity = (lead) => getLeadOfferQuantity(lead, 'sold');

const getLeadEditableQuantity = (lead) => getLeadOfferQuantity(lead, 'desired');

const getLeadAttendanceStatus = (lead) => {
  if (lead.status_atendimento && LEAD_STATUS[lead.status_atendimento]) {
    return lead.status_atendimento;
  }

  return lead.venda_confirmada ? 'vendido' : 'em_atendimento';
};

const getStatusMeta = (status) => LEAD_STATUS[status] || LEAD_STATUS.em_atendimento;

const formatHistoricalCurrency = (value, fallback = 'Valor indisponivel') =>
  value == null ? fallback : formatBRLCurrency(value);

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('start-ellipsis');

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) pages.push('end-ellipsis');
  pages.push(totalPages);

  return pages;
};

export default function Leads() {
  const { store, isOwner, user, member } = useStore();
  const {
    createPersistentNotification,
    notifyTransientError,
    notifyTransientSuccess,
    notifyTransientWarning
  } = useNotifications();
  const [leads, setLeads] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [updatingLeadId, setUpdatingLeadId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [quantitySaveStates, setQuantitySaveStates] = useState({});
  const [expandedLeadIds, setExpandedLeadIds] = useState({});
  const [saleConfirmationModal, setSaleConfirmationModal] = useState(SALE_CONFIRMATION_INITIAL_STATE);

  const leadsRef = useRef([]);
  const quantityDraftsRef = useRef({});
  const saveTimersRef = useRef({});
  const dirtyQuantityIdsRef = useRef(new Set());
  const inFlightSavePromisesRef = useRef({});
  const saveSequenceRef = useRef({});

  const quantityDraftStorageKey = store?.id ? `pneuflow.leads.quantityDrafts.${store.id}` : null;

  const readStoredQuantityDrafts = useCallback(() => {
    if (!quantityDraftStorageKey || typeof window === 'undefined') {
      return {};
    }

    try {
      const raw = window.sessionStorage.getItem(quantityDraftStorageKey);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return parsed;
    } catch {
      return {};
    }
  }, [quantityDraftStorageKey]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    quantityDraftsRef.current = quantityDrafts;
  }, [quantityDrafts]);

  useEffect(() => {
    if (!quantityDraftStorageKey || typeof window === 'undefined') return;

    try {
      window.sessionStorage.setItem(quantityDraftStorageKey, JSON.stringify(quantityDrafts));
    } catch (error) {
      console.warn('Não foi possível persistir os rascunhos de quantidade:', error);
    }
  }, [quantityDraftStorageKey, quantityDrafts]);

  const updateQuantitySaveState = useCallback((leadId, nextState) => {
    setQuantitySaveStates((current) => ({
      ...current,
      [leadId]: nextState
    }));
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!store) return;
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const storeLeads = await storageService.getLeads(store.id);
      setLeads(storeLeads);
      const storedDrafts = readStoredQuantityDrafts();
      const nextDirtyIds = new Set();
      const nextQuantityDrafts = (storeLeads || []).reduce((acc, lead) => {
        const backendQuantity = getLeadEditableQuantity(lead);
        const storedQuantity = storedDrafts[lead.id];

        if (storedQuantity == null) {
          acc[lead.id] = backendQuantity;
          return acc;
        }

        const clampedStoredQuantity = clampQuantityForLead(storedQuantity, lead, backendQuantity);
        acc[lead.id] = clampedStoredQuantity;

        if (clampedStoredQuantity !== backendQuantity) {
          nextDirtyIds.add(lead.id);
        }

        return acc;
      }, {});

      dirtyQuantityIdsRef.current = nextDirtyIds;
      setQuantityDrafts(nextQuantityDrafts);
      quantityDraftsRef.current = nextQuantityDrafts;
      leadsRef.current = storeLeads || [];
    } catch (err) {
      console.error('Erro ao carregar dados dos leads:', err);
      if (!silent) {
        setFeedbackMessage({
          type: 'error',
          text: err.message || 'Não foi possível carregar os leads.'
        });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [readStoredQuantityDrafts, store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteLead = async (leadId) => {
    if (!store?.id) return;

    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este lead? Essa ação é permanente e não poderá ser desfeita.'
    );

    if (!confirmed) return;

    setDeletingLeadId(leadId);
    setFeedbackMessage(null);

    try {
      await storageService.deleteLead(leadId, store.id);
      notifyTransientSuccess({
        title: 'Lead removido com sucesso.',
        message: 'O lead foi removido da sua lista.',
        category: 'leads',
        actionPath: '/dashboard/leads'
      });
      setFeedbackMessage({ type: 'success', text: 'Lead removido com sucesso.' });
      await loadData({ silent: true });
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      await createPersistentNotification({
        type: 'error',
        title: 'N?o foi poss?vel concluir',
        message: err.message || 'N?o foi poss?vel remover este lead.',
        category: 'operation_errors'
      });
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Não foi possível remover este lead. Tente novamente.'
      });
    } finally {
      setDeletingLeadId(null);
    }
  };

  const clearQuantitySaveTimer = useCallback((leadId) => {
    const timer = saveTimersRef.current[leadId];
    if (timer) {
      clearTimeout(timer);
      delete saveTimersRef.current[leadId];
    }
  }, []);

  const scheduleQuantitySave = useCallback((leadId) => {
    clearQuantitySaveTimer(leadId);

    saveTimersRef.current[leadId] = setTimeout(() => {
      flushQuantitySave(leadId);
    }, QUANTITY_SAVE_DEBOUNCE_MS);
  }, [clearQuantitySaveTimer]);

  const flushQuantitySave = useCallback(async (leadId) => {
    const existingPromise = inFlightSavePromisesRef.current[leadId];
    if (existingPromise) {
      return existingPromise;
    }

    clearQuantitySaveTimer(leadId);

    const lead = leadsRef.current.find((item) => item.id === leadId);
    if (!lead || getLeadAttendanceStatus(lead) !== 'em_atendimento') {
      return false;
    }

    const currentQuantity = quantityDraftsRef.current[leadId] ?? getLeadEditableQuantity(lead);
    const normalizedQuantity = clampQuantityForLead(currentQuantity, lead, getLeadEditableQuantity(lead));
    const persistedQuantity = getLeadEditableQuantity(lead);

    if (normalizedQuantity === persistedQuantity && !dirtyQuantityIdsRef.current.has(leadId)) {
      updateQuantitySaveState(leadId, { status: 'saved', message: 'Salvo' });
      return true;
    }

    const saveSequence = (saveSequenceRef.current[leadId] || 0) + 1;
    saveSequenceRef.current[leadId] = saveSequence;

    const savePromise = (async () => {
      updateQuantitySaveState(leadId, { status: 'saving', message: 'Salvando...' });

      try {
        await storageService.updateLeadAttendanceStatus(leadId, 'em_atendimento', null, normalizedQuantity);

        if (saveSequenceRef.current[leadId] !== saveSequence) {
          return false;
        }

        dirtyQuantityIdsRef.current.delete(leadId);
        quantityDraftsRef.current = {
          ...quantityDraftsRef.current,
          [leadId]: normalizedQuantity
        };
        setQuantityDrafts((current) => ({
          ...current,
          [leadId]: normalizedQuantity
        }));
        updateQuantitySaveState(leadId, { status: 'saved', message: 'Salvo' });

        const latestDraft = quantityDraftsRef.current[leadId];
        const latestQuantity = clampQuantityForLead(latestDraft, lead, getLeadEditableQuantity(lead));

        if (latestQuantity !== normalizedQuantity) {
          scheduleQuantitySave(leadId);
        }

        return true;
      } catch (error) {
        if (saveSequenceRef.current[leadId] !== saveSequence) {
          return false;
        }

        dirtyQuantityIdsRef.current.delete(leadId);
        quantityDraftsRef.current = {
          ...quantityDraftsRef.current,
          [leadId]: persistedQuantity
        };
        setQuantityDrafts((current) => ({
          ...current,
          [leadId]: persistedQuantity
        }));
        updateQuantitySaveState(leadId, {
          status: 'error',
          message: error?.message || 'Não foi possível salvar a quantidade.'
        });
        notifyTransientError({
          title: 'N?o foi poss?vel concluir',
          message: error?.message || 'N?o foi poss?vel salvar a quantidade.',
          category: 'operation_errors'
        });
        setFeedbackMessage({
          type: 'error',
          text: 'Não foi possível salvar a quantidade.'
        });
        return false;
      } finally {
        if (inFlightSavePromisesRef.current[leadId] === savePromise) {
          delete inFlightSavePromisesRef.current[leadId];
        }
      }
    })();

    inFlightSavePromisesRef.current[leadId] = savePromise;
    return savePromise;
  }, [clearQuantitySaveTimer, scheduleQuantitySave, updateQuantitySaveState]);

  const handleQuantityChange = (leadId, value) => {
    const lead = leadsRef.current.find((item) => item.id === leadId);
    if (!lead || getLeadAttendanceStatus(lead) !== 'em_atendimento') return;

    const nextQuantity = clampQuantityForLead(value, lead, getLeadEditableQuantity(lead));
    dirtyQuantityIdsRef.current.add(leadId);
    quantityDraftsRef.current = {
      ...quantityDraftsRef.current,
      [leadId]: nextQuantity
    };

    setQuantityDrafts((current) => ({
      ...current,
      [leadId]: nextQuantity
    }));

    updateQuantitySaveState(leadId, { status: 'dirty', message: null });
    scheduleQuantitySave(leadId);
  };

  const handleQuantityBlur = (leadId) => {
    flushQuantitySave(leadId);
  };

  const stepQuantity = (leadId, delta) => {
    const lead = leadsRef.current.find((item) => item.id === leadId);
    if (!lead || getLeadAttendanceStatus(lead) !== 'em_atendimento') return;

    const currentValue = quantityDraftsRef.current[leadId] ?? getLeadEditableQuantity(lead);
    const availableStock = getLeadAvailableStock(lead);
    const nextValue = availableStock != null && availableStock > 0
      ? Math.min(Math.max(1, normalizeQuantity(currentValue) + delta), availableStock)
      : Math.max(1, normalizeQuantity(currentValue) + delta);

    dirtyQuantityIdsRef.current.add(leadId);
    quantityDraftsRef.current = {
      ...quantityDraftsRef.current,
      [leadId]: nextValue
    };

    setQuantityDrafts((current) => ({
      ...current,
      [leadId]: nextValue
    }));

    updateQuantitySaveState(leadId, { status: 'dirty', message: null });
    scheduleQuantitySave(leadId);
  };

  const isLeadManagedByCurrentSeller = useCallback((lead) => {
    if (isOwner) return true;
    if (!user?.id) return false;

    if (lead.seller_id && lead.seller_id === user.id) {
      return true;
    }

    if (lead.ref_code && member?.ref_code) {
      return lead.ref_code === member.ref_code;
    }

    return false;
  }, [isOwner, member?.ref_code, user?.id]);

  const getAllowedStatuses = useCallback((lead) => {
    const currentStatus = getLeadAttendanceStatus(lead);

    if (isOwner) {
      if (currentStatus === 'vendido' || currentStatus === 'desistencia') {
        return [currentStatus, 'em_atendimento'];
      }

      return ['em_atendimento', 'vendido', 'desistencia'];
    }

    if (!isLeadManagedByCurrentSeller(lead)) {
      return [currentStatus];
    }

    if (currentStatus === 'em_atendimento') {
      return ['em_atendimento', 'vendido', 'desistencia'];
    }

    return [currentStatus];
  }, [isLeadManagedByCurrentSeller, isOwner]);

  const toggleLeadExpanded = useCallback((leadId) => {
    setExpandedLeadIds((current) => ({
      ...current,
      [leadId]: !current[leadId]
    }));
  }, []);

  const closeSaleConfirmationModal = useCallback(() => {
    setSaleConfirmationModal(SALE_CONFIRMATION_INITIAL_STATE);
  }, []);

  const openSaleConfirmationModal = useCallback((lead, payload) => {
    setSaleConfirmationModal({
      open: true,
      lead,
      phone: formatBrazilPhone(lead.telefone_cliente || ''),
      summaryLabel: payload.summaryLabel,
      quantity: payload.quantity,
      totalValue: payload.totalValue,
      error: '',
      saving: false
    });
  }, []);

  const handleUpdateLeadStatus = async (lead, nextStatus) => {
    const hasPendingQuantitySave =
      dirtyQuantityIdsRef.current.has(lead.id) ||
      Boolean(saveTimersRef.current[lead.id]) ||
      Boolean(inFlightSavePromisesRef.current[lead.id]);

    if (hasPendingQuantitySave) {
      const saved = await flushQuantitySave(lead.id);
      if (!saved) return;
    }

    const currentLead = leadsRef.current.find((item) => item.id === lead.id) || lead;
    const currentStatus = getLeadAttendanceStatus(currentLead);
    if (currentStatus === nextStatus) return;

    const quantity = normalizeQuantity(
      quantityDraftsRef.current[lead.id],
      currentStatus === 'vendido' ? getLeadFinalQuantity(currentLead) : getLeadEditableQuantity(currentLead)
    );
    const multiItemLead = isMultiItemLead(currentLead);
    const availableStock = getLeadAvailableStock(currentLead);
    const quantityPerOffer = getLeadQuantityPerOffer(currentLead);
    const physicalQuantity = multiItemLead
      ? getLeadPhysicalQuantity(currentLead, currentStatus === 'vendido' ? 'sold' : 'desired')
      : quantity * quantityPerOffer;
    const summaryLabel = multiItemLead
      ? getLeadSummaryLabel(currentLead, currentStatus === 'vendido' ? 'sold' : 'desired')
      : getLeadSummaryLabel({
          ...currentLead,
          quantidade_anuncios: quantity,
          quantidade_total_pneus: physicalQuantity
        });
    const totalValue = multiItemLead
      ? getLeadTotalValue(currentLead, currentStatus === 'vendido' ? 'sold' : 'desired')
      : getLeadOfferPrice(currentLead) * quantity;

    if (nextStatus === 'vendido') {
      if (!multiItemLead && availableStock !== null && availableStock <= 0) {
        notifyTransientWarning({
          title: 'Estoque indisponivel',
          message: 'N?o h? estoque suficiente para confirmar esta venda.',
          category: 'leads'
        });
        setFeedbackMessage({ type: 'error', text: 'Estoque indisponível.' });
        return;
      }

      openSaleConfirmationModal(currentLead, {
        summaryLabel,
        quantity,
        totalValue
      });
      return;
    }

    if (currentStatus === 'vendido' && nextStatus === 'em_atendimento') {
      const confirmed = window.confirm('Reabrir esta venda para edição?');
      if (!confirmed) return;
    }

    if (currentStatus === 'desistencia' && nextStatus === 'em_atendimento') {
      const confirmed = window.confirm('Reabrir este lead para atendimento?');
      if (!confirmed) return;
    }

    setUpdatingLeadId(lead.id);
    setFeedbackMessage(null);

    try {
      const soldQuantity = nextStatus === 'vendido' ? quantity : null;
      const desiredQuantity = quantity;
      await storageService.updateLeadAttendanceStatus(lead.id, nextStatus, soldQuantity, desiredQuantity, {
        titulo_anuncio: lead.titulo_anuncio || null,
        preco_anuncio: getLeadOfferPrice(lead),
        quantidade_por_anuncio: quantityPerOffer,
        valor_total: totalValue
      });
      await createPersistentNotification({
        type: 'success',
        title: nextStatus === 'vendido' ? 'Venda finalizada' : 'Lead atualizado',
        message: nextStatus === 'vendido'
          ? `Venda de ${summaryLabel} confirmada para ${lead.nome_cliente}.`
          : 'O status do lead foi atualizado com sucesso.',
        category: nextStatus === 'vendido' ? 'sales' : 'general',
        actionPath: '/dashboard/leads',
        entityType: 'lead',
        entityId: lead.id
      });
      setFeedbackMessage({
        type: 'success',
        text: nextStatus === 'vendido'
          ? 'Venda confirmada com sucesso.'
          : currentStatus === 'vendido' && nextStatus === 'em_atendimento'
            ? 'Venda reaberta. A quantidade pode ser corrigida.'
            : 'Status do lead atualizado.'
      });
      await loadData({ silent: true });
    } catch (err) {
      console.error('Erro ao atualizar status do lead:', err);
      await createPersistentNotification({
        type: 'error',
        title: 'N?o foi poss?vel concluir',
        message: err.message || 'N?o foi poss?vel atualizar o status do lead.',
        category: 'operation_errors'
      });
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Não foi possível atualizar o status do lead.'
      });
      await loadData({ silent: true });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleConfirmSale = async () => {
    const currentLead = saleConfirmationModal.lead;
    if (!currentLead) return;

    const customerPhoneDigits = normalizeBrazilPhoneDigits(saleConfirmationModal.phone);
    if (!isValidBrazilPhoneDigits(customerPhoneDigits)) {
      setSaleConfirmationModal((current) => ({
        ...current,
        error: 'Informe um telefone válido com 10 ou 11 dígitos.'
      }));
      return;
    }

    setSaleConfirmationModal((current) => ({
      ...current,
      saving: true,
      error: ''
    }));

    setUpdatingLeadId(currentLead.id);
    setFeedbackMessage(null);

    try {
      const lead = leadsRef.current.find((item) => item.id === currentLead.id) || currentLead;
      const quantity = saleConfirmationModal.quantity;
      await storageService.updateLeadAttendanceStatus(currentLead.id, 'vendido', quantity, quantity, {
        titulo_anuncio: lead.titulo_anuncio || null,
        preco_anuncio: getLeadOfferPrice(lead),
        quantidade_por_anuncio: getLeadQuantityPerOffer(lead),
        valor_total: saleConfirmationModal.totalValue,
        telefone_cliente: customerPhoneDigits
      });
      await createPersistentNotification({
        type: 'success',
        title: 'Venda finalizada',
        message: `Venda de ${saleConfirmationModal.summaryLabel} confirmada para ${lead.nome_cliente}.`,
        category: 'sales',
        actionPath: '/dashboard/leads',
        entityType: 'lead',
        entityId: currentLead.id
      });
      setFeedbackMessage({
        type: 'success',
        text: 'Venda confirmada com sucesso.'
      });
      closeSaleConfirmationModal();
      await loadData({ silent: true });
    } catch (err) {
      console.error('Erro ao confirmar venda com telefone:', err);
      await createPersistentNotification({
        type: 'error',
        title: 'N?o foi poss?vel concluir',
        message: err.message || 'N?o foi poss?vel atualizar o status do lead.',
        category: 'operation_errors'
      });
      setSaleConfirmationModal((current) => ({
        ...current,
        saving: false,
        error: err.message || 'Não foi possível atualizar o status do lead.'
      }));
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Não foi possível atualizar o status do lead.'
      });
      await loadData({ silent: true });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, statusFilter, pageSize]);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const text = filterText.toLowerCase();
    const productName = (lead.produto_nome || '').toLowerCase();
    const customerName = (lead.nome_cliente || '').toLowerCase();
    const sellerName = (lead.vendedor_nome || '').toLowerCase();
    const sellerEmail = (lead.vendedor_email || '').toLowerCase();
    const refCode = (lead.vendedor_ref_code || lead.ref_code || '').toLowerCase();

    const matchesText =
      productName.includes(text) ||
      customerName.includes(text) ||
      sellerName.includes(text) ||
      sellerEmail.includes(text) ||
      refCode.includes(text);

    const status = getLeadAttendanceStatus(lead);
    const matchesStatus = statusFilter === 'todos' || statusFilter === status;

    return matchesText && matchesStatus;
  }), [leads, filterText, statusFilter]);

  const totalPages = pageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(filteredLeads.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedLeads = useMemo(() => {
    if (pageSize === 'all') return filteredLeads;

    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const paginationItems = getPageNumbers(currentPage, totalPages);

  return (
    <div className="animate-fade">
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, textAlign: 'left' }}>Leads de WhatsApp</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Clientes interessados que clicaram para entrar em contato no WhatsApp.</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por pneu, cliente ou vendedor..."
            className="form-input"
            style={{ paddingLeft: '44px' }}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        <div className="leads-filter-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 16px', fontSize: '13px' }}
              >
                {status === 'todos' ? 'Todos' : getStatusMeta(status).filterLabel}
              </button>
            ))}
          </div>

          <div className="leads-page-size-control" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Mostrar:</span>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPageSize(option)}
                className={`btn ${pageSize === option ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                {option === 'all' ? 'Todos' : option}
              </button>
            ))}
          </div>
        </div>

        {feedbackMessage && (
          <div
            role={feedbackMessage.type === 'error' ? 'alert' : 'status'}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: feedbackMessage.type === 'error'
                ? '1px solid rgba(239, 68, 68, 0.24)'
                : '1px solid rgba(34, 197, 94, 0.24)',
              backgroundColor: feedbackMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(34, 197, 94, 0.1)',
              color: feedbackMessage.type === 'error' ? 'var(--error)' : 'var(--success)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {feedbackMessage.text}
          </div>
        )}
      </div>

      <div className="card leads-table-card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Carregando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <p>Nenhum lead encontrado.</p>
          </div>
        ) : (
          <>
            <div className="leads-table-wrap" style={{ overflowX: 'auto', position: 'relative' }}>
              <div className="leads-swipe-hint">
                <span>Arraste para o lado para ver cliente, produto, vendedor, status, valor e ações.</span>
              </div>
              <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '5%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Produto</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vendedor</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Valor</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data/Hora</th>
                    <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => {
                    const status = getLeadAttendanceStatus(lead);
                    const statusMeta = getStatusMeta(status);
                    const StatusIcon = statusMeta.Icon;
                    const ClientIcon = MessageSquare;
                    const isSold = status === 'vendido';
                    const isUpdating = updatingLeadId === lead.id;
                    const allowedStatuses = getAllowedStatuses(lead);
                    const canEditStatus = allowedStatuses.length > 1;
                    const isLost = status === 'desistencia';
                    const isManagedByCurrentSeller = isLeadManagedByCurrentSeller(lead);
                    const multiItemLead = isMultiItemLead(lead);
                    const leadItems = getLeadItems(lead);
                    const leadValue = getLeadHistoricalValue(lead, isSold ? 'sold' : 'desired');
                    const isExpanded = Boolean(expandedLeadIds[lead.id]);
                    const availableStock = getLeadAvailableStock(lead);
                    const canEditQuantity =
                      !multiItemLead &&
                      status === 'em_atendimento' &&
                      (isOwner || isManagedByCurrentSeller) &&
                      (availableStock === null || availableStock > 0);
                    const canReopen = isOwner && (isSold || isLost);
                    const quantityValue = clampQuantityForLead(
                      quantityDrafts[lead.id],
                      lead,
                      isSold ? getLeadFinalQuantity(lead) : getLeadEditableQuantity(lead)
                    );
                    const quantitySaveState = quantitySaveStates[lead.id];

                    return (
                      <Fragment key={lead.id}>
                      <tr
                        style={{ borderBottom: '1px solid var(--border)' }}
                        className={`lead-row ${statusMeta.rowClass}`}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div className="lead-icon-box lead-icon-box--client" aria-hidden="true" style={{ marginTop: '1px' }}>
                              <ClientIcon className="lead-icon" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 600, fontSize: '14px', lineHeight: 1.25 }}>
                                {lead.nome_cliente || 'Cliente Interessado'}
                              </span>
                              {lead.telefone_cliente ? (
                                <span style={{ display: 'block', marginTop: '3px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.2 }}>
                                  {formatBrazilPhone(lead.telefone_cliente)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{lead.produto_nome}</span>
                            {multiItemLead && (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ marginTop: '8px', alignSelf: 'flex-start' }}
                                onClick={() => toggleLeadExpanded(lead.id)}
                              >
                                {isExpanded ? 'Ocultar itens' : 'Ver itens'}
                              </button>
                            )}
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.produto_medida || 'Medida não inf.'}</span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {lead.vendedor_nome ? (
                              <>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{lead.vendedor_nome}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.vendedor_email}</span>
                              </>
                            ) : lead.seller_id ? (
                              <>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Vendedor vinculado</span>
                                <span style={{ fontSize: '11px', color: 'var(--error)', fontStyle: 'italic' }}>dados do vendedor indisponíveis</span>
                              </>
                            ) : lead.vendedor_ref_code ? (
                              <>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Ref: {lead.vendedor_ref_code}</span>
                                <span style={{ fontSize: '11px', color: 'var(--error)', fontStyle: 'italic' }}>vendedor não encontrado</span>
                              </>
                            ) : (
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem vendedor</span>
                            )}

                            <div style={{ marginTop: '4px' }}>
                              {lead.attribution_source === 'referral' ? (
                                <span className="lead-source lead-source--referral">Indicação</span>
                              ) : lead.attribution_source === 'product' ? (
                                <span className="lead-source lead-source--product">Anúncio</span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div className="lead-status-cell">
                            <label className="lead-status-label" htmlFor={`status-${lead.id}`}>
                              Status
                            </label>
                            <div className="lead-status-control">
                              <span className={`lead-status-pill ${statusMeta.className}`}>
                                <span className="lead-icon-box lead-icon-box--status" aria-hidden="true">
                                  <StatusIcon className="lead-icon" />
                                </span>
                                {statusMeta.label}
                              </span>
                              {status === 'em_atendimento' ? (
                                <select
                                id={`status-${lead.id}`}
                                value={status}
                                onChange={(event) => handleUpdateLeadStatus(lead, event.target.value)}
                                disabled={isUpdating || !canEditStatus}
                                aria-label="Status do lead"
                              >
                                <option value="em_atendimento">Em atendimento</option>
                                <option value="vendido">Vendido</option>
                                <option value="desistencia">Desistência</option>
                                </select>
                              ) : (
                                <div className="lead-status-closed-actions">
                                  {canReopen ? (
                                    <button
                                      type="button"
                                      className="btn btn-outline"
                                      onClick={() => handleUpdateLeadStatus(lead, 'em_atendimento')}
                                      disabled={isUpdating}
                                    >
                                      {isSold ? 'Reabrir venda' : 'Reabrir lead'}
                                    </button>
                                  ) : (
                                    <span className="lead-status-note lead-status-note--neutral">
                                      Apenas o dono pode reabrir este lead.
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {!canEditStatus && !isOwner && status === 'em_atendimento' && (
                              <span className="lead-status-note lead-status-note--neutral">
                                Apenas o dono pode reabrir este lead.
                              </span>
                            )}

                            {isSold && lead.venda_confirmada_em && (
                              <span className="lead-status-note">
                                Confirmado em {new Date(lead.venda_confirmada_em).toLocaleDateString('pt-BR')}
                              </span>
                            )}

                            {status === 'em_atendimento' ? (
                              <div className="lead-sale-quantity-control">
                                <label htmlFor={`quantity-${lead.id}`}>
                                  {getLeadQuantityPerOffer(lead) > 1 ? 'Quantidade de kits' : 'Quantidade desejada'}
                                </label>
                                <div className="lead-sale-quantity-field">
                                  <button
                                    type="button"
                                  className="lead-quantity-stepper"
                                  onClick={() => stepQuantity(lead.id, -1)}
                                  disabled={isUpdating || !canEditQuantity || quantityValue <= 1}
                                  aria-label="Diminuir quantidade"
                                >
                                    <Minus className="lead-icon" />
                                  </button>
                                  <input
                                    id={`quantity-${lead.id}`}
                                    type="number"
                                    min="1"
                                    step="1"
                                    max={availableStock && availableStock > 0 ? availableStock : undefined}
                                    value={quantityValue}
                                    onChange={(event) => handleQuantityChange(lead.id, event.target.value)}
                                    onBlur={() => handleQuantityBlur(lead.id)}
                                    disabled={isUpdating || !canEditQuantity}
                                    aria-label={getLeadQuantityPerOffer(lead) > 1 ? 'Quantidade de kits' : 'Quantidade desejada'}
                                  />
                                  <button
                                    type="button"
                                  className="lead-quantity-stepper"
                                  onClick={() => stepQuantity(lead.id, 1)}
                                  disabled={
                                      isUpdating ||
                                      !canEditQuantity ||
                                      (availableStock != null && availableStock > 0 && quantityValue >= availableStock)
                                  }
                                  aria-label="Aumentar quantidade"
                                >
                                    <Plus className="lead-icon" />
                                  </button>
                                </div>
                                <span
                                  className={`lead-quantity-status ${
                                    quantitySaveState?.status === 'error' ||
                                    (availableStock !== null && availableStock <= 0)
                                      ? 'lead-quantity-status--error'
                                      : ''
                                  }`}
                                >
                                  {quantitySaveState?.status === 'saving'
                                    ? 'Salvando...'
                                    : quantitySaveState?.status === 'saved'
                                      ? 'Salvo'
                                      : quantitySaveState?.status === 'error'
                                        ? quantitySaveState.message
                                        : availableStock !== null && availableStock <= 0
                                          ? 'Estoque indisponível.'
                                          : getLeadQuantityPerOffer(lead) > 1
                                            ? `Limite atual: ${availableStock ?? quantityValue} kit(s).`
                                            : `Limite atual: ${availableStock ?? quantityValue} pneu(s).`}
                                </span>
                              </div>
                            ) : (
                              <div className="lead-sale-quantity-summary">
                                <span className="lead-sale-quantity-summary__label">
                                  {isSold ? 'Resumo final' : 'Resumo registrado'}
                                </span>
                                <strong>{getLeadSummaryLabel(lead, isSold ? 'sold' : 'desired')}</strong>
                                <span>
                                  {isSold
                                    ? (isOwner
                                      ? 'Reabra a venda para corrigir a quantidade.'
                                      : 'Quantidade bloqueada apos a confirmacao da venda.')
                                    : (isOwner
                                      ? 'Reabra o lead para voltar a editar a quantidade.'
                                      : 'Quantidade bloqueada enquanto o lead estiver em desistencia.')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          {leadValue == null ? (
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Valor indisponível
                            </span>
                          ) : (
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                              {formatBRLCurrency(leadValue)}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalendarDays className="lead-icon lead-icon--calendar" />
                            <span>
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {isOwner && (
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                disabled={deletingLeadId === lead.id}
                                className="btn btn-outline"
                                style={{ padding: '6px 8px', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--error)', opacity: deletingLeadId === lead.id ? 0.6 : 1 }}
                                title="Excluir lead"
                                aria-label="Excluir lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={`lead-row-details ${statusMeta.rowClass}`}>
                          <td colSpan={7} style={{ padding: '0 24px 20px' }}>
                            <div className="filter-panel" style={{ margin: 0, display: 'grid', gap: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <strong style={{ display: 'block', marginBottom: '4px' }}>Resumo do orcamento</strong>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {getLeadSummaryLabel(lead, isSold ? 'sold' : 'desired')}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                  Telefone:{' '}
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {lead.telefone_cliente ? formatBrazilPhone(lead.telefone_cliente) : 'Telefone não informado'}
                                  </strong>
                                </div>
                              </div>

                              {lead.observacao_cliente && (
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>Observacao:</strong> {lead.observacao_cliente}
                                </div>
                              )}

                              <div style={{ display: 'grid', gap: '10px' }}>
                                {leadItems.map((item, index) => (
                                  <div key={item.id || `${lead.id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ minWidth: 0 }}>
                                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{item.titulo_anuncio}</strong>
                                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        {[item.marca, item.modelo, item.medida].filter(Boolean).join(' • ') || 'Produto sem detalhes adicionais'}
                                      </span>
                                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                        {item.quantidade} anuncio(s){Number(item.quantidade_por_anuncio) > 1 ? ` • ${item.quantidade_por_anuncio} pneus por anuncio` : ''} • {item.quantidade_total_pneus} pneus fisicos
                                      </span>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        {formatHistoricalCurrency(item.preco_unitario_anuncio, '--')}
                                      </span>
                                      <strong style={{ color: 'var(--primary)' }}>
                                        {formatHistoricalCurrency(item.valor_total)}
                                      </strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="leads-pagination">
              <div className="leads-pagination__summary">
                <span>
                  Mostrando {pageSize === 'all' ? filteredLeads.length : paginatedLeads.length} de {filteredLeads.length} lead{filteredLeads.length === 1 ? '' : 's'}
                </span>
                <strong>Página {currentPage} de {totalPages}</strong>
              </div>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="leads-pagination__controls" aria-label="Paginação de leads">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>

                  <div className="leads-pagination__pages">
                    {paginationItems.map((item) => (
                      typeof item === 'number' ? (
                        <button
                          key={item}
                          type="button"
                          className={`btn ${currentPage === item ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setCurrentPage(item)}
                          aria-current={currentPage === item ? 'page' : undefined}
                        >
                          {item}
                        </button>
                      ) : (
                        <span key={item} className="leads-pagination__ellipsis">...</span>
                      )
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {saleConfirmationModal.open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-confirmation-title"
        >
          <div className="modal-content animate-slide leads-sale-modal" style={{ maxWidth: '520px', textAlign: 'left' }}>
            <button
              type="button"
              className="modal-close"
              onClick={closeSaleConfirmationModal}
              aria-label="Fechar confirmação de venda"
            >
              <XCircle size={18} />
            </button>

            <form
              className="leads-sale-modal__form"
              onSubmit={(event) => {
                event.preventDefault();
                handleConfirmSale();
              }}
            >
              <div>
                <span className="pf-kicker">Confirmar venda</span>
                <h3 id="sale-confirmation-title" className="leads-sale-modal__title">
                  Informe o telefone do cliente
                </h3>
                <p className="leads-sale-modal__copy">
                  {saleConfirmationModal.summaryLabel}
                </p>
              </div>

              <div className="leads-sale-modal__summary">
                <div>
                  <span>Cliente</span>
                  <strong>{saleConfirmationModal.lead?.nome_cliente || 'Cliente Interessado'}</strong>
                </div>
                <div>
                  <span>Quantidade</span>
                  <strong>{saleConfirmationModal.quantity}</strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{formatHistoricalCurrency(saleConfirmationModal.totalValue)}</strong>
                </div>
              </div>

              <label className="leads-sale-modal__field" htmlFor="customer-phone">
                <span>Telefone do cliente</span>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="form-input"
                  placeholder="(85) 99999-9999"
                  value={saleConfirmationModal.phone}
                  onChange={(event) => {
                    const formattedPhone = formatBrazilPhone(event.target.value);
                    setSaleConfirmationModal((current) => ({
                      ...current,
                      phone: formattedPhone,
                      error: ''
                    }));
                  }}
                />
              </label>

              <p className={`leads-sale-modal__error ${saleConfirmationModal.error ? 'leads-sale-modal__error--visible' : ''}`}>
                {saleConfirmationModal.error || 'Digite um número com 10 ou 11 dígitos para concluir a venda.'}
              </p>

              <div className="leads-sale-modal__footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeSaleConfirmationModal}
                  disabled={saleConfirmationModal.saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saleConfirmationModal.saving}
                >
                  {saleConfirmationModal.saving ? 'Confirmando...' : 'Confirmar venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .lead-row {
          transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .lead-row:hover {
          background-color: rgba(255, 255, 255, 0.015);
        }

        .lead-row--attending {
          border-left: 3px solid rgba(245, 158, 11, 0.74);
        }

        .lead-row--sold {
          background: rgba(34, 197, 94, 0.08) !important;
          border-left: 3px solid #22c55e !important;
        }

        .lead-row--sold:hover {
          background: rgba(34, 197, 94, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.18);
        }

        .lead-row--lost {
          background: rgba(239, 68, 68, 0.08) !important;
          border-left: 3px solid rgba(248, 113, 113, 0.78) !important;
        }

        .lead-source {
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .lead-source--referral {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .lead-source--product {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .lead-icon-box,
        .lead-quantity-stepper {
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .lead-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          min-width: 32px;
          height: 32px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .lead-icon-box--client {
          background-color: var(--whatsapp-glow);
          color: var(--whatsapp);
        }

        .lead-icon-box--status {
          width: 18px;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: currentColor;
        }

        .lead-icon {
          display: block;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          stroke-width: 2;
        }

        .lead-icon--calendar {
          width: 13px;
          height: 13px;
          color: var(--text-muted);
        }

        .lead-status-cell {
          display: flex;
          min-width: 220px;
          flex-direction: column;
          gap: 8px;
        }

        .lead-status-label,
        .lead-sale-quantity-control label {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .lead-status-control {
          display: grid;
          grid-template-columns: minmax(118px, 1fr) minmax(150px, 1fr);
          gap: 8px;
          align-items: center;
        }

        .lead-status-closed-actions {
          display: flex;
          justify-content: flex-end;
        }

        .lead-status-closed-actions .btn {
          min-height: 36px;
          width: 100%;
          justify-content: center;
        }

        .lead-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 34px;
          padding: 6px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .lead-status--attending {
          background: rgba(245, 158, 11, 0.14);
          color: #fbbf24;
        }

        .lead-status--attending .lead-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .lead-status--sold {
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
        }

        .lead-status--lost {
          background: rgba(239, 68, 68, 0.16);
          color: #fca5a5;
        }

        .lead-status-control select {
          min-height: 36px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--secondary);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          padding: 0 10px;
        }

        .lead-status-control select:focus-visible,
        .lead-sale-quantity-control input:focus-visible {
          outline: 3px solid rgba(245, 158, 11, 0.24);
          outline-offset: 2px;
        }

        .lead-status-note {
          width: fit-content;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          font-size: 10px;
          font-weight: 700;
        }

        .lead-status-note--neutral {
          background: rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
        }

        .lead-sale-quantity-control {
          display: grid;
          gap: 8px;
        }

        .lead-quantity-status {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
        }

        .lead-quantity-status--error {
          color: var(--error);
        }

        .lead-sale-quantity-field {
          display: grid;
          grid-template-columns: 36px minmax(76px, 96px) 36px;
          gap: 6px;
          align-items: center;
        }

        .lead-sale-quantity-control input {
          min-height: 34px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--secondary);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          padding: 0 10px;
          text-align: center;
        }

        .lead-sale-quantity-control .btn {
          min-height: 34px;
          padding: 6px 10px;
          font-size: 12px;
          white-space: nowrap;
        }

        .lead-quantity-stepper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          min-width: 36px;
          min-height: 34px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--secondary);
          color: var(--text-primary);
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
        }

        .lead-quantity-stepper:hover:not(:disabled),
        .lead-quantity-stepper:focus-visible {
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.08);
          outline: none;
        }

        .lead-quantity-stepper:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .lead-quantity-stepper .lead-icon {
          width: 15px;
          height: 15px;
        }

        .lead-sale-quantity-summary {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
        }

        .lead-sale-quantity-summary__label {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .lead-sale-quantity-summary strong {
          color: var(--text-primary);
          font-size: 15px;
        }

        .lead-sale-quantity-summary span:last-child {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.4;
        }

        .leads-swipe-hint {
          display: none;
        }

        @media (min-width: 1024px) {
          .leads-table-card {
            overflow: visible;
          }

          .leads-table-wrap {
            min-width: 0;
            max-width: 100%;
            overflow-x: hidden;
          }

          .leads-table {
            table-layout: fixed;
            min-width: 0;
            width: 100%;
          }

          .leads-table th,
          .leads-table td {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .leads-table th:first-child,
          .leads-table td:first-child {
            padding-left: 16px !important;
          }

          .leads-table th:last-child,
          .leads-table td:last-child {
            padding-right: 16px !important;
          }

          .leads-table th:nth-child(1),
          .leads-table td:nth-child(1) {
            width: 12%;
          }

          .leads-table th:nth-child(2),
          .leads-table td:nth-child(2) {
            width: 13%;
          }

          .leads-table th:nth-child(3),
          .leads-table td:nth-child(3) {
            width: 15%;
          }

          .leads-table th:nth-child(4),
          .leads-table td:nth-child(4) {
            width: 33%;
          }

          .leads-table th:nth-child(5),
          .leads-table td:nth-child(5) {
            width: 8%;
          }

          .leads-table th:nth-child(6),
          .leads-table td:nth-child(6) {
            width: 11%;
          }

          .leads-table th:nth-child(7),
          .leads-table td:nth-child(7) {
            width: 8%;
          }

          .lead-status-cell {
            min-width: 0;
          }

          .lead-status-control {
            grid-template-columns: minmax(100px, 0.82fr) minmax(120px, 1.18fr);
          }

          .lead-status-pill {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .lead-sale-quantity-field {
            grid-template-columns: 30px minmax(60px, 76px) 30px;
          }

          .lead-sale-quantity-summary {
            padding: 10px 12px;
          }

          .lead-sale-quantity-summary strong {
            font-size: 14px;
          }

          .lead-status-note,
          .lead-quantity-status {
            max-width: 100%;
          }

          .leads-table td:nth-child(7) > div {
            justify-content: center;
          }

          .leads-table th:nth-child(7) {
            text-align: center;
          }

          .leads-table td:nth-child(7) .btn {
            width: 42px;
            min-width: 42px;
            height: 42px;
            min-height: 42px;
            padding: 0;
            justify-content: center;
            align-items: center;
            border-radius: 12px;
          }

          .leads-table td:nth-child(7) .btn svg {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
          }
        }

        .leads-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.01);
          flex-wrap: wrap;
        }

        .leads-pagination__summary {
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .leads-pagination__summary strong {
          color: var(--text-primary);
          font-size: 13px;
        }

        .leads-pagination__controls,
        .leads-pagination__pages {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .leads-pagination__controls .btn,
        .leads-pagination__pages .btn {
          min-height: 36px;
          padding: 6px 12px;
          font-size: 13px;
        }

        .leads-pagination__ellipsis {
          color: var(--text-muted);
          padding: 0 2px;
          font-weight: 700;
        }

        .leads-sale-modal {
          width: min(520px, calc(100vw - 32px));
        }

        .leads-sale-modal__form {
          display: grid;
          gap: 18px;
        }

        .leads-sale-modal__title {
          margin: 6px 0 8px;
          font-size: 24px;
          line-height: 1.15;
        }

        .leads-sale-modal__copy {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }

        .leads-sale-modal__summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 14px;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .leads-sale-modal__summary div {
          display: grid;
          gap: 4px;
        }

        .leads-sale-modal__summary span,
        .leads-sale-modal__field span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .leads-sale-modal__summary strong {
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.35;
        }

        .leads-sale-modal__field {
          display: grid;
          gap: 8px;
        }

        .leads-sale-modal__error {
          min-height: 20px;
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0;
          transform: translateY(-2px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .leads-sale-modal__error--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .leads-sale-modal__footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .leads-table-wrap {
            -webkit-overflow-scrolling: touch;
          }

          .leads-table {
            min-width: 980px;
          }

          .leads-swipe-hint {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px 10px;
            color: var(--text-secondary);
            font-size: 12px;
            line-height: 1.45;
            background: linear-gradient(90deg, rgba(11, 12, 16, 0.98) 0%, rgba(11, 12, 16, 0.78) 70%, rgba(11, 12, 16, 0.08) 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            position: sticky;
            top: 0;
            z-index: 2;
          }

          .leads-swipe-hint::after {
            content: '→';
            flex-shrink: 0;
            color: var(--primary);
            font-size: 14px;
            font-weight: 700;
          }

          .leads-pagination {
            align-items: stretch;
            padding: 14px 14px 16px;
          }

          .leads-pagination__controls {
            width: 100%;
            justify-content: space-between;
          }

          .leads-pagination__pages {
            order: 3;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
