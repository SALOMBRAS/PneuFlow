import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { getSubscriptionAccess } from '../../utils/subscriptionAccess';
import { getOrCreateVisitorId } from '../../utils/visitorId';
import { formatBRLCurrency } from '../../utils/currency';
import { VEHICLE_MODELS } from '../../data/vehicleModels';
import { MOTORCYCLE_MODELS } from '../../data/motorcycleModels';
import {
  getAvailabilityLabel,
  getAvailableOfferCount,
  getLeadSummaryLabel,
  getOfferDescriptor,
  getOfferQuantityLabel,
  getOfferTitle,
  getOfferTotalPrice,
  getPhysicalTireTotal,
  getQuantityPerOffer,
  getQuantitySelectorLabel,
  isKitOffer
} from '../../utils/tireOffer';
import {
  MessageSquare,
  X,
  Car,
  Bike,
  ArrowRight,
  MapPin,
  Clock3,
  ShieldCheck,
  CreditCard,
  PhoneCall,
  Truck,
  Filter,
  Sparkles,
  Search,
} from 'lucide-react';
import './StoreFront.css';

import PublicStoreHeader from './components/PublicStoreHeader';
import ProductCard from './components/ProductCard';
import StoreFilters from './components/StoreFilters';
import VehicleSearchBox from './components/VehicleSearchBox';
import QuantitySelector from './components/QuantitySelector';

const normalizeText = (text) =>
  text
    ?.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(17, 24, 39, ${alpha})`;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return `rgba(17, 24, 39, ${alpha})`;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const stripPhone = (value) => String(value || '').replace(/\D/g, '');

const hasValidWhatsapp = (value) => stripPhone(value).length >= 10;

const getAvailableStock = (tire) => getAvailableOfferCount(tire);

const clampQuantity = (value, tire) => {
  const max = getAvailableStock(tire);
  if (max <= 0) return 0;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;

  return Math.min(Math.max(parsed, 1), max);
};

const debugReferral = (...args) => {
  if (import.meta.env.DEV) {
    void args;
  }
};

const VISIT_SESSION_PREFIX = 'pneuflow_store_visit';
const VISIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const INACTIVE_STOREFRONT_MESSAGE = 'Esta vitrine está temporariamente inativa. Entre em contato com a loja ou aguarde a reativação.';

const getStoreStatus = (hoursText) => {
  const now = new Date();
  const day = now.getDay();
  const current = now.getHours() + now.getMinutes() / 60;

  let open = day >= 1 && day <= 5 && current >= 8 && current < 18;
  if (day === 6) open = current >= 8 && current < 13;
  if (day === 0) open = false;

  if (typeof hoursText === 'string' && hoursText.toLowerCase().includes('aberto')) {
    open = true;
  }

  return {
    open,
    label: open ? 'Aberto agora' : 'Fechado agora',
    tone: open ? 'success' : 'muted',
  };
};

const getCompatibilitySnippet = (tire) =>
  tire.compatibilidade || tire.compatibility || tire.descricao || tire.description || 'Compatibilidade premium sob consulta';

export default function StoreHome() {
  const { storeSlug } = useParams();
  const location = useLocation();
  const referralCode = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('ref') || searchParams.get('vendedor') || '';
  }, [location.search]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tires, setTires] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [referralSeller, setReferralSeller] = useState(null);
  const [activeRefCode, setActiveRefCode] = useState(null);
  const [referralLookupDone, setReferralLookupDone] = useState(false);
  const visitRegistrationRef = useRef({ key: '', at: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStockOnly, setFilterStockOnly] = useState(false);
  const [catalogVehicleType, setCatalogVehicleType] = useState('todos');

  const [finderOpen, setFinderOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState(null);
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleSearchApplied, setVehicleSearchApplied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedTire, setSelectedTire] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [targetTire, setTargetTire] = useState(null);
  const [leadQuantity, setLeadQuantity] = useState(1);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [savingLead, setSavingLead] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const filteredSuggestions = useMemo(() => {
    if (!vehicleModel || vehicleModel.length < 1) return [];

    const dataset = vehicleType === 'moto' ? MOTORCYCLE_MODELS : VEHICLE_MODELS;

    let allModels = [];
    if (vehicleBrand && dataset[vehicleBrand]) {
      allModels = dataset[vehicleBrand];
    } else {
      Object.values(dataset).forEach((models) => {
        allModels = [...allModels, ...models];
      });
      allModels = [...new Set(allModels)];
    }

    const normalizedInput = normalizeText(vehicleModel);
    return allModels
      .filter((model) => normalizeText(model).includes(normalizedInput))
      .sort()
      .slice(0, 8);
  }, [vehicleModel, vehicleBrand, vehicleType]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setReferralLookupDone(false);
      try {
        const s = await storageService.getStoreBySlug(storeSlug);
        if (s) {
          setStore(s);
          if (s.tipo_vitrine !== 'ambos') {
            setVehicleType(s.tipo_vitrine || 'carro');
          }
          const list = await storageService.getPneus(s.id);
          const activeList = list.filter((t) => t.status === 'ativo' || t.active || t.stock !== false);
          
          setTires(activeList);
          
          // --- Seller referral tracking ---
          debugReferral('ref recebido da URL:', referralCode);
          debugReferral('store.id:', s.id);
          
          if (referralCode) {
            const seller = await storageService.getSellerByRefCode(s.id, referralCode);
            debugReferral('resultado da busca do vendedor:', seller);
            debugReferral('whatsapp do vendedor:', seller?.whatsapp || null);
            debugReferral('whatsapp da loja:', s.whatsapp || null);

            if (seller && seller.status === 'active' && hasValidWhatsapp(seller.whatsapp)) {
              setActiveRefCode(seller.ref_code || referralCode);
              setReferralSeller(seller);
              debugReferral('whatsappDestino final:', seller.whatsapp);
            } else {
              setActiveRefCode(null);
              setReferralSeller(null);
              debugReferral(
                'fallback para WhatsApp da loja:',
                !seller
                  ? 'vendedor nao encontrado'
                  : seller.status !== 'active'
                    ? 'vendedor inativo'
                    : 'vendedor sem WhatsApp valido'
              );
            }
          } else {
            setActiveRefCode(null);
            setReferralSeller(null);
            debugReferral('fallback para WhatsApp da loja:', 'URL sem ref/vendedor');
          }
          // -------------------------------
        } else {
          setStore(null);
          setTires([]);
          setReferralSeller(null);
          setActiveRefCode(null);
        }
      } catch (err) {
        console.error('Erro ao carregar loja:', err);
        setStore(null);
        setTires([]);
        setReferralSeller(null);
        setActiveRefCode(null);
      } finally {
        setReferralLookupDone(true);
        setLoading(false);
      }
    };

    loadData();
  }, [storeSlug, referralCode]);

  useEffect(() => {
    if (!store?.id || loading || !referralLookupDone) return;
    if (typeof window === 'undefined') return;

    const visitorId = getOrCreateVisitorId();
    const registrationKey = `${store.id}:${visitorId}`;
    const sessionKey = `${VISIT_SESSION_PREFIX}:${registrationKey}`;
    const now = Date.now();

    try {
      const lastRegisteredAt = Number(window.sessionStorage.getItem(sessionKey) || 0);
      if (Number.isFinite(lastRegisteredAt) && lastRegisteredAt > 0 && now - lastRegisteredAt < VISIT_COOLDOWN_MS) {
        visitRegistrationRef.current = { key: registrationKey, at: now };
        return;
      }
    } catch {
      // If sessionStorage is unavailable, rely on the RPC dedupe + in-memory guard.
    }

    if (
      visitRegistrationRef.current.key === registrationKey &&
      now - visitRegistrationRef.current.at < VISIT_COOLDOWN_MS
    ) {
      return;
    }

    visitRegistrationRef.current = { key: registrationKey, at: now };

    const sellerId = referralSeller?.id || null;
    const refCode = referralSeller?.ref_code || activeRefCode || referralCode || null;
    const path = `${location.pathname}${location.search}`;
    const userAgent = window.navigator?.userAgent || '';

    let cancelled = false;

    const registerVisit = async () => {
      const registered = await storageService.registerReferralVisit({
        storeId: store.id,
        sellerId,
        refCode,
        visitorId,
        path,
        userAgent,
      });

      if (!cancelled && registered) {
        try {
          window.sessionStorage.setItem(sessionKey, String(Date.now()));
        } catch {
          // Ignore sessionStorage failures.
        }
      }

      if (!registered) {
        visitRegistrationRef.current = { key: '', at: 0 };
      }
    };

    registerVisit().catch((error) => {
      visitRegistrationRef.current = { key: '', at: 0 };
      console.error('Erro ao registrar visita da vitrine:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [store?.id, loading, referralLookupDone, referralSeller?.id, referralSeller?.ref_code, activeRefCode, referralCode, location.pathname, location.search]);

  const uniqueBrands = useMemo(
    () => [...new Set(tires.map((t) => t.marca).filter(Boolean))].sort(),
    [tires]
  );

  const uniqueSizes = useMemo(
    () => [...new Set(tires.map((t) => t.medida).filter(Boolean))].sort(),
    [tires]
  );

  const featuredTires = useMemo(() => {
    return [...tires]
      .filter((t) => Boolean(t.foto_principal_url || t.image))
      .sort((a, b) => {
        const stockScore = Number(Boolean(getAvailableStock(b))) - Number(Boolean(getAvailableStock(a)));
        if (stockScore !== 0) return stockScore;
        return Number(a.preco || 0) - Number(b.preco || 0);
      })
      .slice(0, 3);
  }, [tires]);

  const displayedTires = useMemo(() => {
    let result = tires;

    if (vehicleSearchApplied) {
      result = result.filter((t) => {
        if (vehicleType && t.tipo_veiculo && t.tipo_veiculo !== vehicleType) return false;
        if (filterBrand && t.marca !== filterBrand) return false;

        const normalizedBrand = normalizeText(vehicleBrand);
        const normalizedModel = normalizeText(vehicleModel);
        const normalizedCompat = normalizeText(getCompatibilitySnippet(t));

        if (!normalizedCompat) return true;

        const matchesBrand = normalizedBrand ? normalizedCompat.includes(normalizedBrand) : true;
        const matchesModel = normalizedModel ? normalizedCompat.includes(normalizedModel) : true;
        return matchesBrand && matchesModel;
      });
    } else {
      result = result.filter((t) => {
        const matchesSearch =
          normalizeText(getOfferTitle(t) || '').includes(normalizeText(searchQuery || '')) ||
          normalizeText(t.modelo || '').includes(normalizeText(searchQuery || '')) ||
          normalizeText(t.marca || '').includes(normalizeText(searchQuery || '')) ||
          normalizeText(t.medida || '').includes(normalizeText(searchQuery || ''));
        const matchesBrand = !filterBrand || t.marca === filterBrand;
        const matchesStock = !filterStockOnly || getAvailableStock(t) > 0;
        
        // Filtro por tipo de veículo do catálogo (Todos/Carro/Moto)
        let matchesCatalogType = true;
        if (catalogVehicleType === 'carro') {
          matchesCatalogType = t.tipo_veiculo === 'carro';
        } else if (catalogVehicleType === 'moto') {
          matchesCatalogType = t.tipo_veiculo === 'moto';
        }
        
        return matchesSearch && matchesBrand && matchesStock && matchesCatalogType;
      });
    }

    return result;
  }, [tires, vehicleSearchApplied, vehicleType, vehicleBrand, vehicleModel, searchQuery, filterBrand, filterStockOnly, catalogVehicleType]);

  useEffect(() => {
    if (!featuredTires.length) return undefined;
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % featuredTires.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [featuredTires.length]);

  const getTireImages = (tire) => {
    if (!tire) return [];
    const images = [
      tire.foto_principal_url || tire.image,
      ...(Array.isArray(tire.fotos) ? tire.fotos : [])
    ].filter(Boolean);

    return [...new Set(images)].slice(0, 2);
  };

  const galleryImages = useMemo(() => {
    return getTireImages(selectedTire);
  }, [selectedTire]);

  const placeholderImage = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800';

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: '#05070c', color: '#fff' }}>
        Carregando vitrine...
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: '#05070c', flexDirection: 'column', gap: '16px', color: '#fff' }}>
        <h2>Loja não encontrada</h2>
        <Link to="/" className="button button--primary button--xl" style={{ textDecoration: 'none' }}>
          Ir para o site principal
        </Link>
      </div>
    );
  }

  // Cores fixas da vitrine (Tarefa 8)
  const primaryColor = '#f59e0b';
  const secondaryColor = '#121214';
  const status = getStoreStatus(store.hours);
  const locationText = [store.endereco, store.cidade, store.estado].filter(Boolean).join(', ') || 'Endereço não informado';
  const primarySoft = hexToRgba(primaryColor, 0.12);
  const primaryMedium = hexToRgba(primaryColor, 0.22);
  const secondarySoft = hexToRgba(secondaryColor, 0.16);

  const pageBackground = `
    radial-gradient(circle at top left, ${primarySoft} 0, transparent 360px),
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.12) 0, transparent 340px),
    linear-gradient(180deg, #05070c 0%, #080a10 52%, #05070c 100%)
  `;

  const brandStyle = {
    '--store-primary': primaryColor,
    '--store-secondary': secondaryColor,
    '--store-primary-soft': primarySoft,
    '--store-primary-medium': primaryMedium,
    '--store-secondary-soft': secondarySoft,
    background: pageBackground,
    minHeight: '100vh',
  };

  const heroTire = featuredTires[activeHeroIndex % (featuredTires.length || 1)] || displayedTires[0] || tires[0] || null;
  const subscriptionAccess = getSubscriptionAccess(store);
  const commercialContactEnabled = subscriptionAccess.hasStoreAccess;
  const whatsappDestination = hasValidWhatsapp(referralSeller?.whatsapp)
    ? referralSeller.whatsapp
    : store.whatsapp;
  debugReferral('whatsappDestino render:', {
    whatsappDestino: whatsappDestination,
    vendedor: referralSeller?.ref_code || null,
    loja: store.whatsapp || null
  });

  const scrollToCatalog = () => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const closeFinderAndShowCatalog = () => {
    setFinderOpen(false);
    window.requestAnimationFrame(scrollToCatalog);
  };

  const handleApplyVehicleSearch = (e) => {
    e.preventDefault();
    if (!vehicleModel) return;
    setVehicleSearchApplied(true);
    closeFinderAndShowCatalog();
  };

  const handleClearVehicleSearch = () => {
    if (store.tipo_vitrine === 'ambos') setVehicleType(null);
    setVehicleBrand('');
    setVehicleModel('');
    setVehicleSearchApplied(false);
    setShowSuggestions(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterBrand('');
    setFilterStockOnly(false);
    setCatalogVehicleType('todos');
    handleClearVehicleSearch();
  };

  const handleOpenDetail = (tire) => {
    setSelectedTire(tire);
    setDetailQuantity(clampQuantity(1, tire) || 1);
  };

  const handleInterest = (tire, quantity = 1) => {
    if (!commercialContactEnabled) return;
    const availableStock = getAvailableStock(tire);

    if (availableStock <= 0) {
      setLeadError('Este pneu esta indisponivel no momento.');
      return;
    }

    setTargetTire(tire);
    setLeadQuantity(clampQuantity(quantity, tire));
    setLeadError('');
    setLeadModalOpen(true);
  };

  const handleConfirmLead = async (e) => {
    e.preventDefault();
    if (!commercialContactEnabled) return;
    if (!customerName.trim() || !targetTire) return;

    setSavingLead(true);
    setLeadError('');

    const produtoNome = getOfferTitle(targetTire) || `${targetTire.marca || ''} ${targetTire.modelo || ''}`.trim();
    const requestedQuantity = clampQuantity(leadQuantity, targetTire);
    const quantityPerOffer = getQuantityPerOffer(targetTire);
    const totalPhysicalTires = getPhysicalTireTotal(requestedQuantity, quantityPerOffer);
    const totalValue = getOfferTotalPrice(requestedQuantity, Number(targetTire.preco || 0));

    if (requestedQuantity < 1) {
      setLeadError('Este pneu esta indisponivel no momento.');
      setSavingLead(false);
      return;
    }
    
    const currentRefCode = referralSeller?.ref_code || activeRefCode || null;
    const hasReferralSeller = Boolean(referralSeller?.ref_code && hasValidWhatsapp(referralSeller?.whatsapp));
    const leadPayload = {
      loja_id: store.id,
      produto_id: targetTire.id,
      nome_cliente: customerName.trim(),
      produto_nome: produtoNome,
      titulo_anuncio: targetTire.titulo_anuncio || null,
      produto_medida: targetTire.medida || '',
      produto_preco: Number(targetTire.preco || 0),
      preco_anuncio: Number(targetTire.preco || 0),
      quantidade_anuncios: requestedQuantity,
      quantidade_por_anuncio: quantityPerOffer,
      quantidade_total_pneus: totalPhysicalTires,
      valor_total: totalValue,
      desired_quantity: requestedQuantity,
      origem: 'whatsapp',
      ref_code: hasReferralSeller ? currentRefCode : null,
      attribution_source: hasReferralSeller ? 'referral' : 'product'
    };

    try {
      await storageService.createLead(leadPayload);

      const formattedPrice = formatBRLCurrency(targetTire.preco);
      let text = `Olá!\n\nMeu nome é ${customerName.trim()}.\n\nTenho interesse no seguinte produto:\n\nProduto: ${produtoNome}\nMedida: ${targetTire.medida || 'N/A'}\nValor do anúncio: ${formattedPrice}\n\n`;

      if (isKitOffer(targetTire)) {
        text += `Quantidade desejada: ${requestedQuantity} ${requestedQuantity === 1 ? 'kit' : 'kits'}\n`;
        text += `Total de pneus: ${totalPhysicalTires}\n`;
        text += `Valor total: ${formatBRLCurrency(totalValue)}\n\n`;
      } else {
        text += `Quantidade desejada: ${requestedQuantity} unidade${requestedQuantity === 1 ? '' : 's'}\n`;
        text += `Valor total: ${formatBRLCurrency(totalValue)}\n\n`;
      }

      if (vehicleSearchApplied) {
        const carInfo = vehicleBrand ? `${vehicleBrand} ${vehicleModel}` : vehicleModel;
        text += `Meu carro é um ${carInfo}. `;
      }

      if (hasReferralSeller) {
        text += `Fui atendido por: ${referralSeller.nome || 'vendedor'}\n\n`;
      }

      text += 'Poderia me passar mais informacoes?';

      window.open(`https://wa.me/${stripPhone(whatsappDestination)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');

      setLeadModalOpen(false);
      setCustomerName('');
      setTargetTire(null);
      setLeadQuantity(1);
    } catch (error) {
      console.error('Erro ao registrar lead:', error);
      setLeadError('Não foi possível registrar seu interesse. Tente novamente.');
    } finally {
      setSavingLead(false);
    }
  };

  const handleGeneralWhatsapp = () => {
    if (!commercialContactEnabled) return;

    let text = 'Olá! Acessei o catálogo digital de vocês e gostaria de tirar uma dúvida sobre pneus.';
    if (referralSeller?.ref_code && hasValidWhatsapp(referralSeller?.whatsapp)) {
      text += ` Fui atendido por: ${referralSeller.nome || 'vendedor'}.`;
    }
    window.open(`https://wa.me/${stripPhone(whatsappDestination)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const paymentMethods = ['Pix', 'Cartão', 'Dinheiro'];

  return (
    <div className="public-store-page" style={brandStyle}>
      <PublicStoreHeader
        store={store}
        locationText={locationText}
        statusLabel={status.label}
        statusTone={status.tone}
        onWhatsappClick={handleGeneralWhatsapp}
        commercialContactEnabled={commercialContactEnabled}
      />

      <main className="public-store-container">
        {!commercialContactEnabled && (
          <section className="store-inactive-notice" role="status" aria-live="polite">
            {INACTIVE_STOREFRONT_MESSAGE}
          </section>
        )}

        <VehicleSearchBox
          store={store}
          locationText={locationText}
          statusLabel={status.label}
          statusTone={status.tone}
          onOpen={() => setFinderOpen(true)}
          onWhatsAppClick={handleGeneralWhatsapp}
          onScrollToCatalog={scrollToCatalog}
          onHeroInterest={handleInterest}
          onSelectHero={setActiveHeroIndex}
          vehicleSearchApplied={vehicleSearchApplied}
          vehicleBrand={vehicleBrand}
          vehicleModel={vehicleModel}
          onClear={handleClearVehicleSearch}
          primaryColor={primaryColor}
          heroTire={heroTire}
          heroTires={featuredTires}
          activeHeroIndex={activeHeroIndex}
          resultCount={displayedTires.length}
          uniqueSizes={uniqueSizes}
          uniqueBrands={uniqueBrands}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterBrand={filterBrand}
          setFilterBrand={setFilterBrand}
          commercialContactEnabled={commercialContactEnabled}
        />

        <section id="catalogo" className="storefront-layout">
          <aside className="storefront-sidebar">
            <StoreFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterBrand={filterBrand}
              setFilterBrand={setFilterBrand}
              filterStockOnly={filterStockOnly}
              setFilterStockOnly={setFilterStockOnly}
              catalogVehicleType={catalogVehicleType}
              setCatalogVehicleType={setCatalogVehicleType}
              uniqueBrands={uniqueBrands}
              store={store}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              onOpenVehicleSearch={() => setFinderOpen(true)}
            />
          </aside>

          <div className="storefront-products">
            <div className="catalog-toolbar">
              <div>
                <p className="section-kicker">Catálogo premium</p>
                <h2 className="store-collection__title">
                  {vehicleSearchApplied ? 'Pneus compatíveis' : 'Seleção em destaque'}
                </h2>
                <p>{displayedTires.length} {displayedTires.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
              </div>

              <div className="catalog-toolbar-actions">
                <button type="button" className="mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
                  <Filter size={16} />
                  Filtros
                </button>
                <button type="button" className="button button--ghost" onClick={handleResetFilters}>
                  Limpar
                </button>
              </div>
            </div>

            {displayedTires.length > 0 ? (
              <div className="products-grid">
                {displayedTires.map((tire) => (
                  <ProductCard
                    key={tire.id}
                    tire={tire}
                    primaryColor={primaryColor}
                    onInterest={handleInterest}
                    commercialContactEnabled={commercialContactEnabled}
                    onDetail={(t) => {
                      setActiveImageIndex(0);
                      handleOpenDetail(t);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <Search size={34} />
                </div>
                <h3>Nenhum pneu encontrado</h3>
                <p>Tente ajustar os filtros, remover a busca por veículo ou mudar a marca selecionada.</p>
                <button type="button" className="button button--primary button--xl" onClick={handleResetFilters}>
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="store-section-grid">
          <article className="info-card">
            <p className="section-kicker">Operacao</p>
            <h3 className="info-card__title">Horário e endereço</h3>
            <p className="info-card__copy">
              Tudo o que o cliente precisa para confiar antes de chamar no WhatsApp.
            </p>
            <div className="hours-list">
              <span className="hours-item">
                <Clock3 size={14} />
                {store.hours || 'Horário não informado'}
              </span>
              <span className="hours-item">
                <MapPin size={14} />
                {locationText}
              </span>
              <span className="hours-item">
                <ShieldCheck size={14} />
                {status.label}
              </span>
            </div>
            <div className="contact-band">
              <div className="contact-band__row">
                <div>
                  <h4 className="contact-band__title">Contato rápido</h4>
                  <p className="contact-band__text">Clique para abrir o WhatsApp e falar com a loja em poucos segundos.</p>
                </div>
                <button
                  type="button"
                  className={`button button--primary button--xl ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
                  onClick={handleGeneralWhatsapp}
                  disabled={!commercialContactEnabled}
                  aria-disabled={!commercialContactEnabled}
                >
                  <MessageSquare size={18} />
                  WhatsApp
                </button>
              </div>
            </div>
          </article>

          <article className="info-card">
            <p className="section-kicker">Pagamento</p>
            <h3 className="info-card__title">Formas aceitas</h3>
            <p className="info-card__copy">Mostre facilidade de compra e reduza a fricção no fechamento.</p>
            <div className="payments-list">
              {paymentMethods.map((method) => (
                <span className="payment-item" key={method}>
                  <CreditCard size={14} />
                  {method}
                </span>
              ))}
            </div>
            <div className="contact-band" style={{ marginTop: '18px' }}>
              <div className="contact-band__row">
                <div>
                  <h4 className="contact-band__title">{store.nome}</h4>
                  <p className="contact-band__text">{store.description || 'Uma vitrine feita para vender mais.'}</p>
                </div>
                <button type="button" className="button button--primary button--xl" onClick={scrollToCatalog}>
                  <ArrowRight size={18} />
                  Ver catálogo
                </button>
              </div>
            </div>
          </article>

          <article className="info-card">
            <p className="section-kicker">Contato direto</p>
            <h3 className="info-card__title">Atendimento com foco em conversão</h3>
            <p className="info-card__copy">
              Deixe o acesso ao WhatsApp sempre visível. Esse é o atalho principal para fechar a venda.
            </p>
            <div className="quick-contact__list">
              <span className="highlight-item">
                <PhoneCall size={14} />
                WhatsApp comercial
              </span>
              <span className="highlight-item">
                <Truck size={14} />
                Entrega e instalação
              </span>
            </div>
          </article>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-store-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.nome}
                    loading="lazy"
                    decoding="async"
                    width="42"
                    height="42"
                  />
                ) : (
                  <span>{store.nome?.charAt(0) || 'P'}</span>
                )}
                <span>{store.nome}</span>
              </div>
              <p className="footer-copy">
                {store.description || 'Especialistas em pneus com uma vitrine digital mais elegante, mais clara e mais focada em conversão.'}
              </p>
            </div>

            <div className="footer-links">
              <a className="footer-link" href="#catalogo">Catálogo</a>
              <a className="footer-link" href="#catalogo" onClick={(e) => { e.preventDefault(); scrollToCatalog(); }}>Filtros</a>
              <button
                type="button"
                className={`footer-link ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
                onClick={handleGeneralWhatsapp}
                style={{ background: 'transparent', border: 0, padding: 0 }}
                disabled={!commercialContactEnabled}
                aria-disabled={!commercialContactEnabled}
              >
                WhatsApp
              </button>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {store.nome}</span>
            <span className="powered-by">
              <Sparkles size={12} />
              PneuFlow
            </span>
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={handleGeneralWhatsapp}
        className={`store-whatsapp-fab ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
        aria-label="Abrir WhatsApp"
        disabled={!commercialContactEnabled}
        aria-disabled={!commercialContactEnabled}
      >
        <MessageSquare size={24} />
      </button>

      {mobileFiltersOpen && (
        <div className="storefront-drawer-backdrop" onClick={() => setMobileFiltersOpen(false)}>
          <div className="storefront-drawer" onClick={(e) => e.stopPropagation()}>
            <StoreFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterBrand={filterBrand}
              setFilterBrand={setFilterBrand}
              filterStockOnly={filterStockOnly}
              setFilterStockOnly={setFilterStockOnly}
              catalogVehicleType={catalogVehicleType}
              setCatalogVehicleType={setCatalogVehicleType}
              uniqueBrands={uniqueBrands}
              store={store}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              onOpenVehicleSearch={() => {
                setMobileFiltersOpen(false);
                setFinderOpen(true);
              }}
              onClose={() => setMobileFiltersOpen(false)}
              variant="drawer"
            />
          </div>
        </div>
      )}

      {finderOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content-new animate-slide" style={{ padding: '26px' }}>
            <button className="modal-close" onClick={() => setFinderOpen(false)} type="button" aria-label="Fechar">
              <X size={18} />
            </button>
            <p className="section-kicker">Busca inteligente</p>
            <h3 className="modal-title">Encontre o pneu ideal</h3>
            <p className="info-card__copy">Filtre por marca ou busque pelo veículo para chegar mais rápido no catálogo.</p>

            <div className="finder-modal__section">
              <div className="finder-modal__section-header">
                <div>
                  <p className="search-card__label">Busca por marca</p>
                  <p className="search-card__copy">Escolha uma marca da loja e veja os pneus compatíveis.</p>
                </div>
                {filterBrand && (
                  <button type="button" className="text-button text-button--light" onClick={() => setFilterBrand('')}>
                    Limpar
                  </button>
                )}
              </div>

              <select
                id="finder-tire-brand"
                className="search-card__select"
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
              >
                <option value="">Todas as marcas</option>
                {uniqueBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <button type="button" className="button button--ghost button--wide button--inline" onClick={closeFinderAndShowCatalog}>
                Ver pneus filtrados
                <ArrowRight size={16} />
              </button>
            </div>

            {store.tipo_vitrine === 'ambos' && !vehicleType ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="filter-panel"
                  style={{ padding: '24px', borderRadius: '22px', textAlign: 'center' }}
                  onClick={() => setVehicleType('carro')}
                >
                  <Car size={30} style={{ color: primaryColor }} />
                  <div style={{ marginTop: '12px', fontWeight: 900, color: '#fff' }}>Pneu para carro</div>
                </button>
                <button
                  type="button"
                  className="filter-panel"
                  style={{ padding: '24px', borderRadius: '22px', textAlign: 'center' }}
                  onClick={() => setVehicleType('moto')}
                >
                  <Bike size={30} style={{ color: primaryColor }} />
                  <div style={{ marginTop: '12px', fontWeight: 900, color: '#fff' }}>Pneu para moto</div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyVehicleSearch} style={{ display: 'grid', gap: '16px', marginTop: '18px' }}>
                <div>
                  <label className="filter-label" htmlFor="vehicle-brand">Marca (opcional)</label>
                  <select
                    id="vehicle-brand"
                    className="search-card__select"
                    value={vehicleBrand}
                    onChange={(e) => {
                      setVehicleBrand(e.target.value);
                      setVehicleModel('');
                    }}
                  >
                    <option value="">Todas as marcas</option>
                    {Object.keys(vehicleType === 'moto' ? MOTORCYCLE_MODELS : VEHICLE_MODELS)
                      .sort()
                      .map((brand) => (
                        <option key={brand} value={brand}>
                          {brand.replace('_', ' ')}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ position: 'relative' }}>
                  <label className="filter-label" htmlFor="vehicle-model">Modelo do veículo *</label>
                  <input
                    id="vehicle-model"
                    type="text"
                    required
                    placeholder="Digite o modelo..."
                    className="search-card__input"
                    value={vehicleModel}
                    onChange={(e) => {
                      setVehicleModel(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '8px',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        background: '#0b0f16',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                        zIndex: 1,
                      }}
                    >
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setVehicleModel(suggestion);
                            setShowSuggestions(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 0,
                            color: '#fff',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  {store.tipo_vitrine === 'ambos' && (
                    <button
                      type="button"
                      className="button button--ghost button--xl"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setVehicleType(null);
                        setVehicleBrand('');
                        setVehicleModel('');
                      }}
                    >
                      Voltar
                    </button>
                  )}
                  <button type="submit" className="button button--primary button--xl" style={{ flex: 2 }}>
                    Buscar pneus
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedTire && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content-new animate-slide" style={{ textAlign: 'left', maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setSelectedTire(null)} type="button" aria-label="Fechar">
              <X size={18} />
            </button>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  minHeight: '300px',
                  backgroundImage: `linear-gradient(180deg, rgba(5,7,12,0.02), rgba(5,7,12,0.72)), url(${galleryImages.length > 0 ? galleryImages[activeImageIndex] : placeholderImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transition: 'background-image 0.3s ease-in-out'
                }}
              />
              
              {galleryImages.length > 1 && (
                <>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '16px', 
                    left: '0', 
                    right: '0', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '8px' 
                  }}>
                    {galleryImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: activeImageIndex === idx ? 'var(--store-primary)' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        aria-label={`Ver foto ${idx + 1}`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setActiveImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
                  </button>

                  <button
                    onClick={() => setActiveImageIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowRight size={20} />
                  </button>
                </>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <p className="section-kicker" style={{ marginBottom: '6px' }}>{selectedTire.marca}</p>
                  <h3 className="modal-title" style={{ fontSize: '2rem' }}>{getOfferTitle(selectedTire)}</h3>
                  <p className="info-card__copy" style={{ marginTop: '10px' }}>{getCompatibilitySnippet(selectedTire)}</p>
                </div>
                <span className="product-badge product-badge--spec">{selectedTire.medida}</span>
              </div>

              <div className="contact-band" style={{ marginTop: '18px' }}>
                <div className="contact-band__row">
                  <div>
                    <p className="section-kicker" style={{ marginBottom: '6px' }}>{isKitOffer(selectedTire) ? 'Preço do kit' : 'Preço à vista'}</p>
                    <h4 className="contact-band__title">{formatBRLCurrency(selectedTire.preco)}</h4>
                    <p className="info-card__copy" style={{ marginTop: '8px' }}>{getOfferDescriptor(selectedTire)}</p>
                  </div>
                  <span className={`status-pill ${getAvailableStock(selectedTire) > 0 ? 'status-pill--success' : 'status-pill--muted'}`}>
                    {getAvailabilityLabel(selectedTire)}
                  </span>
                </div>
              </div>

              <QuantitySelector
                value={detailQuantity}
                max={getAvailableStock(selectedTire)}
                onChange={setDetailQuantity}
                label={getQuantitySelectorLabel(selectedTire)}
                availabilityText={getAvailabilityLabel(selectedTire)}
                helperText={
                  isKitOffer(selectedTire)
                    ? `${getOfferQuantityLabel(detailQuantity, selectedTire)} = ${getPhysicalTireTotal(detailQuantity, selectedTire)} pneus.`
                    : ''
                }
                disabled={!commercialContactEnabled}
                className="quantity-selector--detail"
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="button button--ghost button--xl" style={{ flex: 1 }} onClick={() => setSelectedTire(null)}>
                  Voltar
                </button>
                <button
                  type="button"
                  className={`button button--primary button--xl ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
                  style={{ flex: 2 }}
                  disabled={!commercialContactEnabled || getAvailableStock(selectedTire) <= 0}
                  aria-disabled={!commercialContactEnabled || getAvailableStock(selectedTire) <= 0}
                  onClick={() => {
                    handleInterest(selectedTire, detailQuantity);
                    setSelectedTire(null);
                  }}
                >
                  <MessageSquare size={16} />
                  {getAvailableStock(selectedTire) > 0 ? (isKitOffer(selectedTire) ? 'Quero este kit' : 'Me interessou') : 'Indisponivel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {leadModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content-new animate-slide" style={{ padding: '26px' }}>
            <button
              className="modal-close"
              onClick={() => {
                setLeadModalOpen(false);
                setCustomerName('');
                setTargetTire(null);
                setLeadQuantity(1);
              }}
              type="button"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div className="empty-state__icon" style={{ width: '72px', height: '72px' }}>
                <MessageSquare size={30} />
              </div>
              <h3 className="modal-title" style={{ marginTop: '10px' }}>Quase lá</h3>
              <p className="info-card__copy">Como podemos te chamar? Informe seu nome para iniciar o contato.</p>
            </div>

            {leadError && (
              <div className="contact-band" style={{ marginBottom: '16px', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                <p className="contact-band__text" style={{ margin: 0, color: '#fecaca' }}>{leadError}</p>
              </div>
            )}

            <form onSubmit={handleConfirmLead} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label className="filter-label" htmlFor="customer-name">Seu nome *</label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Digite seu nome completo..."
                  className="search-card__input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="filter-panel" style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: 0 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={targetTire?.foto_principal_url || targetTire?.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=100'}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="56"
                    height="56"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getOfferTitle(targetTire)}
                  </p>
                  <p style={{ margin: 0, color: 'rgba(248,250,252,0.66)', fontSize: '0.86rem' }}>{targetTire?.medida}</p>
                </div>
              </div>

              <QuantitySelector
                value={leadQuantity}
                max={getAvailableStock(targetTire)}
                onChange={setLeadQuantity}
                label={getQuantitySelectorLabel(targetTire)}
                availabilityText={getAvailabilityLabel(targetTire)}
                helperText={
                  isKitOffer(targetTire)
                    ? `${getOfferQuantityLabel(leadQuantity, targetTire)} = ${getPhysicalTireTotal(leadQuantity, targetTire)} pneus. Total: ${formatBRLCurrency(getOfferTotalPrice(leadQuantity, Number(targetTire?.preco || 0)))}.`
                    : `Total: ${formatBRLCurrency(getOfferTotalPrice(leadQuantity, Number(targetTire?.preco || 0)))}.`
                }
              />

              <button
                type="submit"
                disabled={savingLead || !customerName.trim() || !commercialContactEnabled || getAvailableStock(targetTire) <= 0}
                className={`button button--primary button--xl ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
                style={{
                  opacity: savingLead || !customerName.trim() || !commercialContactEnabled || getAvailableStock(targetTire) <= 0 ? 0.72 : 1,
                  cursor: savingLead || !customerName.trim() || !commercialContactEnabled || getAvailableStock(targetTire) <= 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {savingLead ? 'Processando...' : (
                  <>
                    Continuar para o WhatsApp
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
