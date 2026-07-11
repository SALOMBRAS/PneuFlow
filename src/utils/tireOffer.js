export const MAX_TIRES_PER_OFFER = 20;

const isReliableAmount = (value) => Number.isFinite(value) && value >= 0;
const isPositiveAmount = (value) => Number.isFinite(value) && value > 0;

const resolveItemHistoricalValue = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const explicitValue = Number(items.reduce((sum, item) => {
    const itemValue = Number(item?.valor_total);
    if (item?.valor_total != null && isReliableAmount(itemValue)) {
      return sum + itemValue;
    }

    const quantity = Math.max(1, Number.parseInt(item?.quantidade, 10) || 1);
    const price = Number(item?.preco_unitario_anuncio);
    if (item?.preco_unitario_anuncio != null && isReliableAmount(price)) {
      return sum + (price * quantity);
    }

    return sum;
  }, 0));

  if (explicitValue > 0) {
    return Number(explicitValue.toFixed(2));
  }

  return null;
};

export const normalizeOfferQuantity = (value, fallback = 1) => {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), MAX_TIRES_PER_OFFER);
};

export const getQuantityPerOffer = (item) =>
  normalizeOfferQuantity(item?.quantidade_por_anuncio, 1);

export const getOfferTitle = (item) => {
  const customTitle = String(item?.titulo_anuncio || '').trim();
  if (customTitle) {
    return customTitle;
  }

  return String(item?.modelo || item?.produto_nome || '').trim();
};

export const getOfferDescriptor = (item) => {
  const quantityPerOffer = getQuantityPerOffer(item);
  return quantityPerOffer > 1
    ? `Kit com ${quantityPerOffer} pneus`
    : 'Pneu unitario';
};

const splitCompatibilityValues = (value) =>
  String(value || '')
    .split(/[,\n;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);

export const getCompatibilitySummary = (item, maxItems = 2) => {
  const raw = String(item?.compatibilidade || item?.compatibility || item?.version || item?.descricao || item?.description || '').trim();
  if (!raw) {
    return 'Compatibilidade sob consulta';
  }

  const values = splitCompatibilityValues(raw);
  const isLikelyList = values.length >= 3 || raw.length > 80;

  if (!isLikelyList) {
    return raw.length > 120 ? `${raw.slice(0, 117).trim()}...` : raw;
  }

  const visibleValues = values.slice(0, Math.max(1, maxItems));
  const remaining = values.length - visibleValues.length;
  return remaining > 0
    ? `${visibleValues.join(', ')} e mais ${remaining}`
    : visibleValues.join(', ');
};

export const isKitOffer = (item) => getQuantityPerOffer(item) > 1;

export const getOfferBadgeLabel = (item) => {
  const quantityPerOffer = getQuantityPerOffer(item);
  return quantityPerOffer > 1 ? `KIT ${quantityPerOffer} PNEUS` : '';
};

export const getAvailableOfferCount = (item) => {
  const stock = Math.max(0, Number(item?.estoque || 0));
  const quantityPerOffer = getQuantityPerOffer(item);
  return Math.floor(stock / quantityPerOffer);
};

export const getOfferRemainder = (item) => {
  const stock = Math.max(0, Number(item?.estoque || 0));
  const quantityPerOffer = getQuantityPerOffer(item);
  return stock % quantityPerOffer;
};

export const getAvailabilityLabel = (item) => {
  const availableOffers = getAvailableOfferCount(item);

  if (isKitOffer(item)) {
    if (availableOffers <= 0) {
      return 'Indisponível';
    }
    return `${availableOffers} ${availableOffers === 1 ? 'kit disponível' : 'kits disponíveis'}`;
  }

  if (availableOffers <= 0) {
    return 'Indisponível';
  }

  return `${availableOffers} disponível${availableOffers === 1 ? '' : 's'}`;
};

export const getQuantitySelectorLabel = (item) =>
  isKitOffer(item) ? 'Quantidade de kits' : 'Quantidade desejada';

export const getOfferQuantityLabel = (quantity, item) => {
  const safeQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);

  if (isKitOffer(item)) {
    return `${safeQuantity} ${safeQuantity === 1 ? 'kit' : 'kits'}`;
  }

  return `${safeQuantity} ${safeQuantity === 1 ? 'pneu' : 'pneus'}`;
};

export const getPhysicalTireTotal = (offerQuantity, itemOrQuantityPerOffer = 1) => {
  const quantityPerOffer =
    typeof itemOrQuantityPerOffer === 'number'
      ? normalizeOfferQuantity(itemOrQuantityPerOffer, 1)
      : getQuantityPerOffer(itemOrQuantityPerOffer);
  const safeOfferQuantity = Math.max(1, Number.parseInt(offerQuantity, 10) || 1);
  return safeOfferQuantity * quantityPerOffer;
};

export const getOfferTotalPrice = (offerQuantity, price) => {
  const safeOfferQuantity = Math.max(1, Number.parseInt(offerQuantity, 10) || 1);
  return Number(price || 0) * safeOfferQuantity;
};

const getRawLeadItems = (lead) => {
  if (Array.isArray(lead?.items)) {
    return lead.items;
  }

  if (Array.isArray(lead?.itens)) {
    return lead.itens;
  }

  return null;
};

export const getLeadItems = (lead) => {
  const rawItems = getRawLeadItems(lead);
  if (rawItems) {
    return rawItems;
  }

  const quantityPerOffer = getLeadQuantityPerOffer(lead);
  const offerQuantity = getLeadOfferQuantity(lead, lead?.venda_confirmada ? 'sold' : 'desired');
  const physicalQuantity = getLeadPhysicalQuantity(lead, lead?.venda_confirmada ? 'sold' : 'desired');
  const offerPrice = getLeadOfferPrice(lead);
  const totalValue = getLeadTotalValue(lead, lead?.venda_confirmada ? 'sold' : 'desired');

  if (!lead?.produto_nome && !lead?.titulo_anuncio) {
    return [];
  }

  return [{
    lead_id: lead?.id || null,
    product_id: lead?.produto_id || lead?.pneu_id || null,
    titulo_anuncio: lead?.titulo_anuncio || lead?.produto_nome || 'Produto nao identificado',
    marca: lead?.marca || '',
    modelo: lead?.modelo || '',
    medida: lead?.produto_medida || lead?.medida || '',
    quantidade: offerQuantity,
    quantidade_por_anuncio: quantityPerOffer,
    quantidade_total_pneus: physicalQuantity,
    preco_unitario_anuncio: offerPrice,
    valor_total: totalValue
  }];
};

export const isMultiItemLead = (lead) => {
  const rawItems = getRawLeadItems(lead);
  if (rawItems) {
    return rawItems.length > 1;
  }

  if (lead?.item_count != null) {
    return Number.parseInt(lead.item_count, 10) > 1;
  }

  return false;
};

export const getLeadDistinctItemCount = (lead) => getLeadItems(lead).length;

export const getLeadOfferUnitCount = (lead) =>
  getLeadItems(lead).reduce(
    (sum, item) => sum + Math.max(1, Number.parseInt(item?.quantidade, 10) || 1),
    0
  );

export const getLeadOfferQuantity = (lead, mode = 'desired') => {
  if (isMultiItemLead(lead)) {
    return getLeadOfferUnitCount(lead);
  }

  if (lead?.quantidade_anuncios != null) {
    return Math.max(1, Number.parseInt(lead.quantidade_anuncios, 10) || 1);
  }

  const baseQuantity =
    mode === 'sold'
      ? lead?.sold_quantity ?? lead?.desired_quantity
      : lead?.desired_quantity ?? lead?.sold_quantity;

  const quantityPerOffer = getLeadQuantityPerOffer(lead);
  const physicalQuantity = Math.max(1, Number.parseInt(baseQuantity, 10) || 1);

  return Math.max(1, Math.ceil(physicalQuantity / quantityPerOffer));
};

export const getLeadQuantityPerOffer = (lead) =>
  normalizeOfferQuantity(lead?.quantidade_por_anuncio, 1);

export const getLeadPhysicalQuantity = (lead, mode = 'desired') => {
  if (isMultiItemLead(lead)) {
    return getLeadItems(lead).reduce(
      (sum, item) => sum + Math.max(1, Number.parseInt(item?.quantidade_total_pneus, 10) || 1),
      0
    );
  }

  if (mode === 'sold') {
    if (lead?.sold_quantity != null) {
      return Math.max(1, Number.parseInt(lead.sold_quantity, 10) || 1);
    }
  } else if (lead?.quantidade_total_pneus != null) {
    return Math.max(1, Number.parseInt(lead.quantidade_total_pneus, 10) || 1);
  }

  const offerQuantity = getLeadOfferQuantity(lead, mode);
  return getPhysicalTireTotal(offerQuantity, getLeadQuantityPerOffer(lead));
};

export const getLeadOfferPrice = (lead) => {
  if (isMultiItemLead(lead)) {
    return getLeadTotalValue(lead);
  }

  const price = Number(lead?.preco_anuncio ?? lead?.produto_preco);
  return Number.isFinite(price) ? price : 0;
};

export const getLeadHistoricalValue = (lead, mode = 'desired') => {
  const snapshotItems = Array.isArray(lead?.items)
    ? lead.items
    : Array.isArray(lead?.itens)
      ? lead.itens
      : null;

  const snapshotValue = resolveItemHistoricalValue(snapshotItems);
  if (snapshotValue != null) {
    return snapshotValue;
  }

  const explicitValue = Number(lead?.valor_total);
  if (lead?.valor_total != null && isReliableAmount(explicitValue) && explicitValue > 0) {
    return explicitValue;
  }

  if (isMultiItemLead(lead)) {
    return null;
  }

  const offerQuantity = getLeadOfferQuantity(lead, mode);
  if (lead?.valor_total != null && isReliableAmount(explicitValue) && explicitValue > 0) {
    return explicitValue;
  }

  const unitPrice = Number(lead?.preco_anuncio ?? lead?.produto_preco);
  if (lead?.preco_anuncio == null && lead?.produto_preco == null) {
    return null;
  }

  if (!isReliableAmount(unitPrice)) {
    return null;
  }

  return Number((unitPrice * offerQuantity).toFixed(2));
};

export const getLeadTotalValue = (lead, mode = 'desired') => {
  const historicalValue = getLeadHistoricalValue(lead, mode);
  return historicalValue == null ? 0 : historicalValue;
};

export const getLeadSummaryLabel = (lead, mode = 'desired') => {
  if (isMultiItemLead(lead)) {
    const distinctItems = getLeadDistinctItemCount(lead);
    const offerUnits = getLeadOfferUnitCount(lead);
    const physicalTotal = getLeadPhysicalQuantity(lead, mode);
    return `${distinctItems} ${distinctItems === 1 ? 'item distinto' : 'itens distintos'} - ${offerUnits} ${offerUnits === 1 ? 'anúncio' : 'anúncios'} - ${physicalTotal} ${physicalTotal === 1 ? 'pneu físico' : 'pneus físicos'}`;
  }

  const offerQuantity = getLeadOfferQuantity(lead, mode);
  const physicalTotal = getLeadPhysicalQuantity(lead, mode);

  if (getLeadQuantityPerOffer(lead) > 1) {
    return `${offerQuantity} ${offerQuantity === 1 ? 'kit' : 'kits'} - ${physicalTotal} pneus`;
  }

  return `${physicalTotal} ${physicalTotal === 1 ? 'pneu' : 'pneus'}`;
};
