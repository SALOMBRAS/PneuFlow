import { supabase as defaultSupabase } from '../lib/supabase';
import { optimizeImageToWebp } from '../utils/imageOptimizer';

let activeSupabaseClient = defaultSupabase;

const supabase = new Proxy({}, {
  get: (_, property) => Reflect.get(activeSupabaseClient, property),
});

export const setStorageServiceClient = (client) => {
  activeSupabaseClient = client || defaultSupabase;
};

export const resetStorageServiceClient = () => {
  activeSupabaseClient = defaultSupabase;
};

const STORE_COLUMNS = 'id, owner_id, nome, whatsapp, telefone, postal_code, endereco, address_number, address_complement, neighborhood, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria, seo_titulo, seo_descricao, business_hours, plano, plan_due_date, subscription_status, trial_started_at, trial_ends_at, subscription_started_at, current_period_end, payment_provider, payment_subscription_id, created_at, slug, tipo_vitrine, template_vitrine';
const PUBLIC_STORE_COLUMNS = 'id, nome, whatsapp, telefone, postal_code, endereco, address_number, address_complement, neighborhood, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria, seo_titulo, seo_descricao, business_hours, plano, subscription_status, trial_ends_at, current_period_end, created_at, slug, tipo_vitrine, template_vitrine';
const STORE_MEMBER_COLUMNS = 'id, store_id, user_id, email, nome, role, status, invited_by, invited_at, accepted_at, created_at, updated_at, ref_code, disabled_at, removed_at, auth_deleted_at, removed_by, senha_inicial, whatsapp';
const PNEU_COLUMNS = 'id, loja_id, marca, modelo, titulo_anuncio, medida, preco, quantidade_por_anuncio, estoque, descricao, status, compatibilidade, foto_principal_url, fotos, created_at, updated_at, tipo_veiculo, created_by, updated_by';
const PNEU_COLUMNS_LEGACY = 'id, loja_id, marca, modelo, medida, preco, estoque, descricao, status, compatibilidade, foto_principal_url, fotos, created_at, updated_at, tipo_veiculo, created_by, updated_by';
const DASHBOARD_LEAD_COLUMNS = 'id, loja_id, produto_id, seller_id, ref_code, attribution_source, nome_cliente, telefone_cliente, observacao_cliente, produto_nome, titulo_anuncio, produto_medida, produto_preco, preco_anuncio, origem, created_at, desired_quantity, sold_quantity, quantidade_anuncios, quantidade_por_anuncio, quantidade_total_pneus, valor_total, status_atendimento, venda_confirmada, venda_confirmada_em, venda_confirmada_por, item_count, items';
const DASHBOARD_LEAD_COLUMNS_LEGACY = 'id, loja_id, produto_id, seller_id, ref_code, attribution_source, nome_cliente, produto_nome, produto_medida, produto_preco, origem, created_at, desired_quantity, sold_quantity, status_atendimento, venda_confirmada, venda_confirmada_em, venda_confirmada_por';

const normalizeLeadQuantity = (value, fallback = 1) =>
  Math.max(1, Number.parseInt(value ?? fallback, 10) || 1);

const isMissingSchemaColumnError = (error) =>
  error?.code === '42703' && String(error?.message || '').includes('does not exist');

const mapLegacyPneuRow = (row) => ({
  ...row,
  titulo_anuncio: null,
  quantidade_por_anuncio: 1
});

const mapLegacyLeadRow = (row) => {
  const desiredQuantity = normalizeLeadQuantity(row?.desired_quantity, 1);
  const soldQuantity = normalizeLeadQuantity(row?.sold_quantity, desiredQuantity);
  const isSold = row?.venda_confirmada === true || row?.status_atendimento === 'vendido';
  const quantity = isSold ? soldQuantity : desiredQuantity;
  const rawPrice = row?.produto_preco;
  const price = Number(rawPrice);
  const hasReliablePrice = rawPrice != null && Number.isFinite(price) && price >= 0;
  const totalValue = hasReliablePrice ? Number((price * quantity).toFixed(2)) : null;

  return {
    ...row,
    telefone_cliente: null,
    observacao_cliente: null,
    titulo_anuncio: null,
    preco_anuncio: hasReliablePrice ? price : null,
    quantidade_anuncios: quantity,
    quantidade_por_anuncio: 1,
    quantidade_total_pneus: quantity,
    valor_total: totalValue,
    item_count: 1,
    items: [
      {
        lead_id: row?.id || null,
        product_id: row?.produto_id || row?.pneu_id || null,
        titulo_anuncio: row?.produto_nome || 'Produto nao identificado',
        medida: row?.produto_medida || '',
        quantidade: quantity,
        quantidade_por_anuncio: 1,
        quantidade_total_pneus: quantity,
        preco_unitario_anuncio: hasReliablePrice ? price : null,
        valor_total: totalValue
      }
    ]
  };
};

const loadPneusWithSchemaCompatibility = async (queryFactory) => {
  const { data, error } = await queryFactory(PNEU_COLUMNS);
  if (!error) {
    return { data: data || [], usedLegacySchema: false };
  }

  if (!isMissingSchemaColumnError(error)) {
    throw error;
  }

  console.warn('[SchemaCompatibility] Colunas novas de pneus ainda nao existem no remoto. Aplicando fallback legado.', {
    code: error.code,
    message: error.message
  });

  const legacyResult = await queryFactory(PNEU_COLUMNS_LEGACY);
  if (legacyResult.error) {
    throw legacyResult.error;
  }

  return {
    data: (legacyResult.data || []).map(mapLegacyPneuRow),
    usedLegacySchema: true
  };
};

const applyDateRange = (query, column, startAt, endAt) => {
  let nextQuery = query;

  if (startAt) {
    nextQuery = nextQuery.gte(column, startAt);
  }

  if (endAt) {
    nextQuery = nextQuery.lte(column, endAt);
  }

  return nextQuery;
};

const loadDashboardLeadsWithSchemaCompatibility = async (storeId, options = {}) => {
  const {
    startAt = null,
    endAt = null,
    dateColumn = 'created_at',
    soldOnly = false
  } = options;

  const query = (columns) => {
    let builder = supabase
      .from('leads')
      .select(columns)
      .eq('loja_id', storeId);

    if (soldOnly) {
      builder = builder.eq('venda_confirmada', true);
    }

    builder = applyDateRange(builder, dateColumn, startAt, endAt);
    return builder.order(dateColumn, { ascending: false });
  };

  const { data, error } = await query(DASHBOARD_LEAD_COLUMNS);
  if (!error) {
    return { data: data || [], usedLegacySchema: false };
  }

  if (!isMissingSchemaColumnError(error)) {
    throw error;
  }

  console.warn('[SchemaCompatibility] Colunas novas de leads ainda nao existem no remoto. Aplicando fallback legado.', {
    code: error.code,
    message: error.message
  });

  const legacyResult = await query(DASHBOARD_LEAD_COLUMNS_LEGACY);
  if (legacyResult.error) {
    throw legacyResult.error;
  }

  return {
    data: (legacyResult.data || []).map(mapLegacyLeadRow),
    usedLegacySchema: true
  };
};

const loadLeadStockMap = async (storeId) => {
  const { data: leadRelations, error: leadRelationsError } = await supabase
    .from('leads')
    .select('id, produto_id, pneu_id')
    .eq('loja_id', storeId);

  if (leadRelationsError) {
    throw leadRelationsError;
  }

  const productIds = Array.from(
    new Set(
      (leadRelations || [])
        .flatMap((lead) => [lead.produto_id, lead.pneu_id])
        .filter(Boolean)
    )
  );

  if (productIds.length === 0) {
    return { leadRelations: leadRelations || [], stockByProductId: new Map() };
  }

  const { data: pneuRows, error: pneuRowsError } = await supabase
    .from('pneus')
    .select('id, estoque')
    .in('id', productIds);

  if (pneuRowsError) {
    throw pneuRowsError;
  }

  const stockByProductId = new Map(
    (pneuRows || []).map((row) => [row.id, Math.max(0, Number(row.estoque || 0))])
  );

  return { leadRelations: leadRelations || [], stockByProductId };
};

const mapLeadAttendanceErrorMessage = (error) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('estoque insuficiente')) {
    return 'Estoque insuficiente para essa quantidade.';
  }

  if (message.includes('sem permissao')) {
    return 'Você não possui permissão para esta ação.';
  }

  if (message.includes('reabra a venda')) {
    return 'Reabra a venda antes de alterar a quantidade.';
  }

  if (message.includes('quantidade') && message.includes('inval')) {
    return 'Informe uma quantidade válida.';
  }

  if (message.includes('telefone') && message.includes('inval')) {
    return 'Informe um telefone válido com 10 ou 11 dígitos.';
  }

  return error?.message || 'Não foi possível atualizar este lead.';
};

const normalizeStoreSlug = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

// Database Access Functions using Supabase
export const storageService = {
  // --- Auth & Session ---
  
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('pneuflow_current_user'); // Clean up old legacy key if exists
    localStorage.removeItem('pneuflow_remember_session');
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  resetPasswordEmail: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return true;
  },

  // --- Store & Profile Management ---

  getStoreMemberRole: async (storeId, userId) => {
    const { data, error } = await supabase
      .from('store_members')
      .select('id, role, status, ref_code, nome, email')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) return null;
    return data;
  },

  getStoreMembers: async (storeId) => {
    const { data, error } = await supabase
      .from('store_members')
      .select(STORE_MEMBER_COLUMNS)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  normalizeWhatsapp: (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  },

  inviteSeller: async (storeId, sellerData) => {
    // Call the Edge Function to handle validation, member creation and admin invite
    const { data, error } = await supabase.functions.invoke('invite-seller', {
      body: { 
        email: sellerData.email.toLowerCase(), 
        nome: sellerData.nome,
        store_id: storeId,
        password: sellerData.password // Added password field
      }
    });
    
    if (error) {
      let message = error.message || 'Erro ao chamar Edge Function';

      try {
        if (error.context) {
          const errorBody = await error.context.json();

          message =
            errorBody?.error ||
            errorBody?.message ||
            errorBody?.details ||
            message;

          if (errorBody?.step) {
            message += ` | etapa: ${errorBody.step}`;
          }
        }
      } catch (parseError) {
        console.warn('Não foi possível ler o corpo do erro:', parseError);
      }

      throw new Error(message);
    }

    if (data?.error) {
      let message = data.error;

      if (data.step) {
        message += ` | etapa: ${data.step}`;
      }

      throw new Error(message);
    }

    return data;
  },

  manageSellerAccess: async ({ storeId, memberId, action }) => {
    const { data, error } = await supabase.functions.invoke('manage-seller-access', {
      body: {
        store_id: storeId,
        member_id: memberId,
        action
      }
    });

    if (error) {
      let message = error.message || 'Erro ao gerenciar vendedor';

      try {
        if (error.context) {
          const errorText = await error.context.text();
          const errorBody = JSON.parse(errorText);
          message = errorBody?.error || errorBody?.message || message;
        }
      } catch {}

      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);

    return data;
  },

  updateMemberStatus: async (memberId, status) => {
    const { data, error } = await supabase
      .from('store_members')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .select(STORE_MEMBER_COLUMNS)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  updateSellerRefCode: async (memberId, refCode) => {
    const cleanRef = refCode.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const { data, error } = await supabase
      .from('store_members')
      .update({ ref_code: cleanRef, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .select(STORE_MEMBER_COLUMNS)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  updateSellerWhatsapp: async (memberId, whatsapp) => {
    const { data, error } = await supabase
      .from('store_members')
      .update({
        whatsapp: storageService.normalizeWhatsapp(whatsapp),
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select(STORE_MEMBER_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  createSellerAccess: async (memberId) => {
    const { data, error } = await supabase.functions.invoke('create-seller-access', {
      body: {
        member_id: memberId
      }
    });

    if (error) {
      let message = error.message || 'Erro ao iniciar acesso temporario.';

      try {
        if (error.context) {
          const errorBody = await error.context.json();
          message = errorBody?.error || errorBody?.message || message;
        }
      } catch {}

      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);

    return data;
  },

  redeemSellerAccess: async ({ ownerAccessToken, ticket }) => {
    const { data, error } = await supabase.functions.invoke('redeem-seller-access', {
      headers: {
        Authorization: `Bearer ${ownerAccessToken}`
      },
      body: {
        ticket
      }
    });

    if (error) {
      let message = error.message || 'Erro ao resgatar acesso temporario.';

      try {
        if (error.context) {
          const errorBody = await error.context.json();
          message = errorBody?.error || errorBody?.message || message;
        }
      } catch {}

      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);

    return data;
  },

  endSellerAccess: async (auditId) => {
    const { data, error } = await supabase.functions.invoke('end-seller-access', {
      body: {
        audit_id: auditId
      }
    });

    if (error) {
      let message = error.message || 'Erro ao encerrar acesso temporario.';

      try {
        if (error.context) {
          const errorBody = await error.context.json();
          message = errorBody?.error || errorBody?.message || message;
        }
      } catch {}

      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);

    return data;
  },

  getSellerByRefCode: async (storeId, refCode) => {
    const { data, error } = await supabase.rpc('get_public_referral_seller', {
      p_store_id: storeId,
      p_ref_code: refCode
    });
    
    if (error) {
      console.error('Erro ao buscar vendedor por ref RPC:', error);
      return null;
    }

    return Array.isArray(data) ? data[0] || null : data;
  },

  registerReferralVisit: async ({ storeId, sellerId = null, refCode = null, visitorId, path = null, userAgent = null }) => {
    const { error } = await supabase.rpc('registrar_visita_referral', {
      p_store_id: storeId,
      p_seller_id: sellerId,
      p_ref_code: refCode,
      p_visitor_id: visitorId,
      p_path: path,
      p_user_agent: userAgent
    });
    
    if (error) console.error('Erro ao registrar visita referral RPC:', error);
    return !error;
  },

  createStore: async (data) => {
    const { storeName, ownerEmail, ownerPassword, phone, name } = data;

    // 1. Sign up user only
    // We store the extra data in user_metadata so we can use it after email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ownerEmail,
      password: ownerPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: name,
          store_name: storeName,
          phone_number: phone
        }
      }
    });

    if (authError) {
      console.error('Erro no Supabase Auth:', authError);
      throw authError;
    }
    
    return authData;
  },

  completeRegistration: async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) return null;

    if (session.user.user_metadata?.invited_to_store) return null;

    const { data, error } = await supabase.rpc('ensure_store_provisioned');
    if (error) throw error;
    return data;

  },

  getStoreByOwner: async (userId) => {
    const { data, error } = await supabase
      .from('stores')
      .select(STORE_COLUMNS)
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  getStoreByMember: async (userId) => {
    const { data, error } = await supabase
      .from('store_members')
      .select(`stores (${STORE_COLUMNS})`)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data?.stores || null;
  },

  getStoreById: async (id) => {
    const { data, error } = await supabase
      .from('stores')
      .select(STORE_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  getStoreBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('stores')
      .select(PUBLIC_STORE_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  updateStoreSlug: async (storeId, slug) => {
    const cleanSlug = normalizeStoreSlug(slug);

    if (cleanSlug.length < 3) {
      throw new Error('O link precisa ter pelo menos 3 caracteres.');
    }

    if (cleanSlug.length > 48) {
      throw new Error('O link pode ter no maximo 48 caracteres.');
    }

    const existingStore = await storageService.getStoreBySlug(cleanSlug);
    if (existingStore && existingStore.id !== storeId) {
      throw new Error('Este link ja esta em uso por outra loja.');
    }

    const { data, error } = await supabase
      .from('stores')
      .update({ slug: cleanSlug })
      .eq('id', storeId)
      .select(STORE_COLUMNS)
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Este link ja esta em uso por outra loja.');
      }
      throw error;
    }

    return data;
  },

  updateStore: async (id, updateData) => {
    // Map frontend camelCase to DB snake_case for Supabase using REAL column names
    const mappedData = {
      nome: updateData.name ?? updateData.nome,
      whatsapp: updateData.whatsapp,
      telefone: updateData.phone ?? updateData.telefone,
      postal_code: updateData.postal_code ?? updateData.postalCode,
      endereco: updateData.address ?? updateData.endereco,
      address_number: updateData.address_number ?? updateData.addressNumber,
      address_complement: updateData.address_complement ?? updateData.addressComplement,
      neighborhood: updateData.neighborhood ?? updateData.neighborhoodName,
      cidade: updateData.city ?? updateData.cidade,
      estado: updateData.state ?? updateData.estado,
      logo: updateData.logo,
      banner: updateData.banner,
      foto_capa: updateData.cover ?? updateData.foto_capa,
      cor_principal: updateData.cor_principal ?? updateData.primaryColor,
      cor_secundaria: updateData.cor_secundaria ?? updateData.secondaryColor,
      seo_titulo: updateData.seoTitle ?? updateData.seo_titulo,
      seo_descricao: updateData.seoDescription ?? updateData.seo_descricao,
      business_hours: updateData.business_hours ?? updateData.businessHours,
      slug: updateData.slug ? normalizeStoreSlug(updateData.slug) : undefined,
      tipo_vitrine: updateData.tipo_vitrine ?? updateData.tipoVitrine ?? 'carro'
    };

    // Remove undefined values to prevent overwriting with null
    Object.keys(mappedData).forEach(key => mappedData[key] === undefined && delete mappedData[key]);

    const { data, error } = await supabase
      .from('stores')
      .update(mappedData)
      .eq('id', id)
      .select(STORE_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // --- Pneus (Tires) CRUD ---
  
  normalizePneuImages: (pneuData) => {
    const uniqueImages = [
      pneuData.foto_principal_url,
      ...(Array.isArray(pneuData.fotos) ? pneuData.fotos : [])
    ].filter(Boolean);

    const limitedImages = [...new Set(uniqueImages)].slice(0, 2);

    return {
      ...pneuData,
      foto_principal_url: limitedImages[0] || '',
      fotos: limitedImages
    };
  },

  getPneus: async (storeId) => {
    const result = await loadPneusWithSchemaCompatibility((columns) =>
      supabase
        .from('pneus')
        .select(columns)
        .eq('loja_id', storeId)
        .order('created_at', { ascending: false })
    );

    return result.data;
  },

  getPneuById: async (id) => {
    const result = await loadPneusWithSchemaCompatibility((columns) =>
      supabase
        .from('pneus')
        .select(columns)
        .eq('id', id)
        .maybeSingle()
    );

    return Array.isArray(result.data) ? result.data[0] || null : result.data;
  },

  createPneu: async (pneuData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const normalizedData = storageService.normalizePneuImages(pneuData);
    const { data, error } = await supabase
      .from('pneus')
      .insert([{
        ...normalizedData,
        tipo_veiculo: normalizedData.tipo_veiculo || 'carro',
        created_by: session.user.id,
        updated_by: session.user.id
      }])
      .select(PNEU_COLUMNS)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  updatePneu: async (id, pneuData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const normalizedData = storageService.normalizePneuImages(pneuData);
    const { data, error } = await supabase
      .from('pneus')
      .update({ 
        ...normalizedData, 
        updated_at: new Date().toISOString(),
        tipo_veiculo: normalizedData.tipo_veiculo || 'carro',
        updated_by: session.user.id
      })
      .eq('id', id)
      .select(PNEU_COLUMNS)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  deletePneu: async (id) => {
    const { error } = await supabase
      .from('pneus')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // --- Leads ---
  getLeads: async (storeId) => {
    try {
      await supabase.rpc('expirar_leads_inativos', {
        p_store_id: storeId
      });
    } catch (error) {
      // Keeps the current dashboard usable before the new migration is applied.
      console.warn('Não foi possível expirar leads inativos automaticamente:', error?.message || error);
    }

    const [{ data, error }, relationResult] = await Promise.all([
      supabase.rpc('get_leads_com_vendedor', {
        p_store_id: storeId
      }),
      loadLeadStockMap(storeId).catch((stockError) => {
        console.warn('Não foi possível carregar o estoque dos leads:', stockError?.message || stockError);
        return { leadRelations: [], stockByProductId: new Map() };
      })
    ]);

    if (error) {
      console.error('Erro RPC get_leads_com_vendedor:', error);
      throw error;
    }

    const relationMap = new Map(
      (relationResult.leadRelations || []).map((relation) => [relation.id, relation])
    );

    return (data || []).map((lead) => {
      const relation = relationMap.get(lead.id);
      const productId = relation?.produto_id || relation?.pneu_id || null;

      return {
        ...lead,
        produto_id: productId,
        pneu_id: relation?.pneu_id || null,
        estoque_disponivel: productId
          ? relationResult.stockByProductId.get(productId) ?? null
          : null
      };
    });
  },

  createLead: async (payload) => {
    if (Array.isArray(payload?.items) && payload.items.length > 0) {
      return storageService.createLeadCart(payload);
    }

    const { data, error } = await supabase.rpc('registrar_lead', {
      p_loja_id: payload.loja_id,
      p_produto_id: payload.produto_id || null,
      p_nome_cliente: payload.nome_cliente,
      p_produto_nome: payload.produto_nome || '',
      p_titulo_anuncio: payload.titulo_anuncio || null,
      p_produto_medida: payload.produto_medida || '',
      p_produto_preco: Number(payload.produto_preco || 0),
      p_preco_anuncio: Number(payload.preco_anuncio ?? payload.produto_preco ?? 0),
      p_quantidade_anuncios: Math.max(1, Number.parseInt(payload.quantidade_anuncios ?? payload.desired_quantity, 10) || 1),
      p_quantidade_por_anuncio: Math.max(1, Number.parseInt(payload.quantidade_por_anuncio, 10) || 1),
      p_quantidade_total_pneus: Math.max(1, Number.parseInt(payload.quantidade_total_pneus, 10) || 1),
      p_valor_total: Number(payload.valor_total ?? 0),
      p_desired_quantity: Math.max(1, Number.parseInt(payload.desired_quantity, 10) || 1),
      p_origem: payload.origem || 'whatsapp',
      p_seller_id: payload.seller_id || null,
      p_ref_code: payload.ref_code || null,
      p_attribution_source: payload.attribution_source || 'product'
    });

    if (error) {
      console.error('Supabase registrar_lead RPC error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      throw error;
    }

    return data;
  },

  createLeadCart: async (payload) => {
    const normalizedItems = (payload.items || []).map((item) => ({
      product_id: item.product_id,
      quantidade: Math.max(1, Number.parseInt(item.quantidade, 10) || 1)
    }));

    const { data, error } = await supabase.rpc('registrar_lead_com_itens', {
      p_loja_id: payload.loja_id,
      p_nome_cliente: payload.nome_cliente,
      p_telefone_cliente: payload.telefone_cliente || null,
      p_observacao_cliente: payload.observacao_cliente || null,
      p_items: normalizedItems,
      p_origem: payload.origem || 'whatsapp',
      p_seller_id: payload.seller_id || null,
      p_ref_code: payload.ref_code || null,
      p_attribution_source: payload.attribution_source || 'product',
      p_request_id: payload.request_id || null
    });

    if (error) {
      console.error('Supabase registrar_lead_com_itens RPC error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      throw error;
    }

    return data;
  },

  deleteLead: async (id, storeId) => {
    if (!id || !storeId) {
      throw new Error('Lead ou loja inválidos.');
    }

    const { data, error } = await supabase.rpc('excluir_lead', {
      p_lead_id: id,
      p_store_id: storeId
    });
    
    if (error) throw error;
    if (data !== true) throw new Error('Não foi possível remover este lead.');
    return true;
  },

  updateLeadSaleStatus: async (leadId, vendaConfirmada, soldQuantity = 1) => {
    const { data, error } = await supabase.rpc('atualizar_status_venda_lead', {
      p_lead_id: leadId,
      p_venda_confirmada: vendaConfirmada,
      p_sold_quantity: normalizeLeadQuantity(soldQuantity)
    });

    if (error) {
      console.error('Erro ao atualizar status de venda RPC:', error);
      throw new Error(mapLeadAttendanceErrorMessage(error));
    }
    return data;
  },

  updateLeadAttendanceStatus: async (leadId, status, soldQuantity = 1, desiredQuantity = null, snapshot = {}, customerPhone = null) => {
    const normalizedDesiredQuantity =
      desiredQuantity == null
        ? null
        : normalizeLeadQuantity(desiredQuantity);
    const normalizedSoldQuantity =
      status === 'vendido'
        ? normalizeLeadQuantity(soldQuantity ?? desiredQuantity)
        : null;

    const { data, error } = await supabase.rpc('atualizar_status_atendimento_lead', {
      p_lead_id: leadId,
      p_status_atendimento: status,
      p_sold_quantity: normalizedSoldQuantity,
      p_desired_quantity: normalizedDesiredQuantity,
      p_titulo_anuncio: snapshot.titulo_anuncio || null,
      p_preco_anuncio: snapshot.preco_anuncio == null ? null : Number(snapshot.preco_anuncio),
      p_quantidade_por_anuncio: snapshot.quantidade_por_anuncio == null ? null : normalizeLeadQuantity(snapshot.quantidade_por_anuncio),
      p_valor_total: snapshot.valor_total == null ? null : Number(snapshot.valor_total),
      p_telefone_cliente: customerPhone || snapshot.telefone_cliente || null
    });

    if (error) {
      console.error('Erro ao atualizar status de atendimento do lead:', error);
      throw new Error(mapLeadAttendanceErrorMessage(error));
    }
    return data;
  },

  getDashboardCommercialMetrics: async (storeId, options = {}) => {
    const {
      startAt = null,
      endAt = null
    } = options;
    const partialErrors = [];
    const schemaFallbacks = [];

    const safeSelect = async (label, queryFactory) => {
      try {
        const result = await queryFactory();
        if (result?.usedLegacySchema) {
          schemaFallbacks.push(label);
        }
        return Array.isArray(result?.data) ? result.data : [];
      } catch (error) {
        console.error(`[DashboardMetrics] Falha ao buscar ${label}:`, error);
        partialErrors.push({
          label,
          message: error?.message || `Nao foi possivel carregar ${label}.`
        });
        return [];
      }
    };

    const requests = {
      leads: () => loadDashboardLeadsWithSchemaCompatibility(storeId, {
        startAt,
        endAt,
        dateColumn: 'created_at'
      }),
      soldLeads: () => loadDashboardLeadsWithSchemaCompatibility(storeId, {
        startAt,
        endAt,
        dateColumn: 'venda_confirmada_em',
        soldOnly: true
      }),
      pneus: () =>
        loadPneusWithSchemaCompatibility((columns) =>
          supabase
            .from('pneus')
            .select(columns)
            .eq('loja_id', storeId)
        ),
      sellers: async () => {
        const { data, error } = await supabase
          .from('store_members')
          .select('id, store_id, user_id, nome, role, status, ref_code')
          .eq('store_id', storeId);

        if (error) throw error;
        return { data: data || [], usedLegacySchema: false };
      },
      visits: async () => {
        let query = supabase
          .from('store_referral_visits')
          .select('id, store_id, seller_id, ref_code, created_at')
          .eq('store_id', storeId);

        query = applyDateRange(query, 'created_at', startAt, endAt);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return { data: data || [], usedLegacySchema: false };
      }
    };

    const entries = Object.entries(requests);
    const results = await Promise.allSettled(
      entries.map(([label, query]) => safeSelect(label, query))
    );

    return entries.reduce((acc, [label], index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        acc[label] = Array.isArray(result.value) ? result.value : [];
      } else {
        console.error(`[DashboardMetrics] Query ${label} rejeitada:`, result.reason);
        acc[label] = [];
      }
      return acc;
    }, {
      leads: [],
      soldLeads: [],
      pneus: [],
      sellers: [],
      visits: [],
      partialErrors,
      schemaFallbacks
    });
  },

  getDashboardReportData: async (storeId, options = {}) => {
    const {
      startAt,
      endAt,
      selectedSections = []
    } = options;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('Sessao nao encontrada. Faca login novamente.');
    }

    const ownerStore = await storageService.getStoreByOwner(session.user.id);
    if (!ownerStore || ownerStore.id !== storeId) {
      throw new Error('Somente o dono da loja pode gerar este relatorio.');
    }

    const safeSelect = async (label, queryBuilder) => {
      try {
        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`[DashboardReport] Erro ao buscar ${label}:`, error);
        throw new Error(`Nao foi possivel carregar ${label} para o relatorio.`);
      }
    };

    const selected = new Set(selectedSections);
    const shouldLoadLeadFlow =
      selected.has('summary') ||
      selected.has('leads') ||
      selected.has('pending') ||
      selected.has('withdrawals') ||
      selected.has('seller_performance');
    const shouldLoadSales =
      selected.has('summary') ||
      selected.has('sales') ||
      selected.has('sold_products') ||
      selected.has('seller_performance');
    const shouldLoadVisits = selected.has('summary');
    const shouldLoadSellers = selected.has('seller_performance') || selected.has('leads') || selected.has('sales') || selected.has('pending') || selected.has('withdrawals');
    const shouldLoadStock = selected.has('stock') || selected.has('sold_products');

    const requests = [];

    if (shouldLoadLeadFlow) {
      requests.push([
        'leads',
        storageService.getLeads(storeId).then((rows) =>
          rows.filter((lead) => lead.created_at >= startAt && lead.created_at <= endAt)
        )
      ]);
    }

    if (shouldLoadSales) {
      requests.push([
        'soldLeads',
        storageService.getLeads(storeId).then((rows) =>
          rows.filter((lead) =>
            lead.status_atendimento === 'vendido' &&
            lead.venda_confirmada_em >= startAt &&
            lead.venda_confirmada_em <= endAt
          )
        )
      ]);
    }

    if (shouldLoadVisits) {
      requests.push([
        'visits',
        safeSelect(
          'visualizacoes',
          supabase
            .from('store_referral_visits')
            .select('id, created_at, seller_id, ref_code')
            .eq('store_id', storeId)
            .gte('created_at', startAt)
            .lte('created_at', endAt)
        )
      ]);
    }

    if (shouldLoadSellers) {
      requests.push([
        'sellers',
        safeSelect(
          'vendedores',
          supabase
            .from('store_members')
            .select('id, user_id, nome, email, role, status, ref_code')
            .eq('store_id', storeId)
        )
      ]);
    }

    if (shouldLoadStock) {
      requests.push([
        'stock',
        safeSelect(
          'estoque',
          supabase
            .from('pneus')
            .select('id, marca, modelo, titulo_anuncio, medida, preco, quantidade_por_anuncio, estoque, status')
            .eq('loja_id', storeId)
            .order('estoque', { ascending: true })
        )
      ]);
    }

    const results = await Promise.all(requests.map(([, promise]) => promise));

    const baseResult = requests.reduce((acc, [label], index) => {
      acc[label] = results[index] || [];
      return acc;
    }, {
      leads: [],
      soldLeads: [],
      visits: [],
      sellers: [],
      stock: []
    });

    const stockById = new Map(
      (baseResult.stock || []).map((item) => [item.id, item])
    );

    const enrichLead = (lead) => {
      const product = stockById.get(lead.produto_id);
      const firstItem = Array.isArray(lead.items) ? lead.items[0] : null;
      return {
        ...lead,
        marca: product?.marca || firstItem?.marca || '',
        modelo: product?.modelo || firstItem?.modelo || '',
        titulo_anuncio: lead.titulo_anuncio || product?.titulo_anuncio || firstItem?.titulo_anuncio || null,
        medida: product?.medida || firstItem?.medida || lead.produto_medida || ''
      };
    };

    return {
      ...baseResult,
      leads: (baseResult.leads || []).map(enrichLead),
      soldLeads: (baseResult.soldLeads || []).map(enrichLead)
    };
  },

  // --- Legacy Aliases ---
  getTires: async (storeId) => storageService.getPneus(storeId),

  // --- Storage & Uploads ---
  uploadPneuImages: async (files, storeId) => {
    const uploadPromises = Array.from(files).map(async (file, index) => {
      const optimizedFile = await optimizeImageToWebp(file);
      const safeFileName = `${Date.now()}-${index}-${optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `${storeId}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pneus-fotos')
        .upload(filePath, optimizedFile, {
          cacheControl: '3600',
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pneus-fotos')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  },

  uploadStoreImage: async (file) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão não encontrada. Faça login novamente.');

    const userId = session.user.id;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('stores')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('stores')
      .getPublicUrl(filePath);

    return publicUrl;
  }
};
