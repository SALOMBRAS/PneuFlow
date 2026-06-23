import { supabase } from '../lib/supabase';
import { optimizeImageToWebp } from '../utils/imageOptimizer';

const STORE_COLUMNS = 'id, owner_id, nome, whatsapp, telefone, endereco, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria, seo_titulo, seo_descricao, plano, plan_due_date, subscription_status, trial_started_at, trial_ends_at, subscription_started_at, current_period_end, payment_provider, payment_subscription_id, created_at, slug, tipo_vitrine, template_vitrine';
const PUBLIC_STORE_COLUMNS = 'id, nome, whatsapp, telefone, endereco, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria, seo_titulo, seo_descricao, plano, subscription_status, trial_ends_at, current_period_end, created_at, slug, tipo_vitrine, template_vitrine';
const STORE_MEMBER_COLUMNS = 'id, store_id, user_id, email, nome, role, status, invited_by, invited_at, accepted_at, created_at, updated_at, ref_code, disabled_at, removed_at, auth_deleted_at, removed_by, senha_inicial, whatsapp';
const PNEU_COLUMNS = 'id, loja_id, marca, modelo, medida, preco, estoque, descricao, status, compatibilidade, foto_principal_url, fotos, created_at, updated_at, tipo_veiculo, created_by, updated_by';

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
      endereco: updateData.address ?? updateData.endereco,
      cidade: updateData.city ?? updateData.cidade,
      estado: updateData.state ?? updateData.estado,
      logo: updateData.logo,
      banner: updateData.banner,
      foto_capa: updateData.cover ?? updateData.foto_capa,
      cor_principal: updateData.cor_principal ?? updateData.primaryColor,
      cor_secundaria: updateData.cor_secundaria ?? updateData.secondaryColor,
      seo_titulo: updateData.seoTitle ?? updateData.seo_titulo,
      seo_descricao: updateData.seoDescription ?? updateData.seo_descricao,
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
    const { data, error } = await supabase
      .from('pneus')
      .select(PNEU_COLUMNS)
      .eq('loja_id', storeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar pneus:', error);
      return [];
    }
    return data;
  },

  getPneuById: async (id) => {
    const { data, error } = await supabase
      .from('pneus')
      .select(PNEU_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase.rpc('get_leads_com_vendedor', { 
      p_store_id: storeId 
    });
    
    if (error) {
      console.error('Erro RPC get_leads_com_vendedor:', error);
      throw error;
    }
    return data || [];
  },

  createLead: async (payload) => {
    const { data, error } = await supabase.rpc('registrar_lead', {
      p_loja_id: payload.loja_id,
      p_produto_id: payload.produto_id || null,
      p_nome_cliente: payload.nome_cliente,
      p_produto_nome: payload.produto_nome || '',
      p_produto_medida: payload.produto_medida || '',
      p_produto_preco: Number(payload.produto_preco || 0),
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

  updateLeadSaleStatus: async (leadId, vendaConfirmada) => {
    const { data, error } = await supabase.rpc('atualizar_status_venda_lead', {
      p_lead_id: leadId,
      p_venda_confirmada: vendaConfirmada
    });

    if (error) {
      console.error('Erro ao atualizar status de venda RPC:', error);
      throw error;
    }
    return data;
  },

  getDashboardCommercialMetrics: async (storeId) => {
    const safeSelect = async (label, queryBuilder) => {
      try {
        const { data, error } = await queryBuilder;
        if (error) {
          console.error(`[DashboardMetrics] Erro ao buscar ${label}:`, error);
          return [];
        }
        return data || [];
      } catch (error) {
        console.error(`[DashboardMetrics] Falha inesperada ao buscar ${label}:`, error);
        return [];
      }
    };

    const requests = {
      leads: supabase
        .from('leads')
        .select('id, loja_id, produto_id, seller_id, ref_code, attribution_source, nome_cliente, produto_nome, produto_medida, produto_preco, origem, created_at, venda_confirmada, venda_confirmada_em, venda_confirmada_por')
        .eq('loja_id', storeId),
      pneus: supabase
        .from('pneus')
        .select('id, loja_id, status, estoque, created_by')
        .eq('loja_id', storeId),
      sellers: supabase
        .from('store_members')
        .select('id, store_id, user_id, nome, role, status, ref_code')
        .eq('store_id', storeId),
      visits: supabase
        .from('store_referral_visits')
        .select('id, store_id, seller_id, ref_code, created_at')
        .eq('store_id', storeId)
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
      pneus: [],
      sellers: [],
      visits: []
    });
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
