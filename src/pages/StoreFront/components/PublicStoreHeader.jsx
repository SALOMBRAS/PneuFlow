import React from 'react';
import { MessageSquare, MapPin, Clock3, BadgeCheck } from 'lucide-react';
import { formatBusinessHourLabel } from '../../../utils/storeHours';

export default function PublicStoreHeader({
  store,
  locationText,
  statusLabel,
  statusTone = 'success',
  onWhatsappClick,
  commercialContactEnabled = true,
}) {
  const statusClass = statusTone === 'success' ? 'status-pill--success' : 'status-pill--muted';
  const hoursLabel = formatBusinessHourLabel(store.business_hours, 'Atendimento comercial');

  return (
    <header className="public-store-header">
      <div className="public-store-container">
        <div className="header-content header-content--storefront">
          <div className="header-brand">
            <div className="header-brand__mark">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.nome}
                  className="header-logo-img"
                  decoding="async"
                  width="56"
                  height="56"
                />
              ) : (
                <span>{store.nome?.charAt(0) || 'P'}</span>
              )}
            </div>

            <div className="header-brand__copy">
              <div className={`status-pill ${statusClass}`}>
                <BadgeCheck size={13} />
                <span>{statusLabel}</span>
              </div>
              <h1 className="header-store-name">{store.nome}</h1>
              <div className="header-meta">
                <span>
                  <MapPin size={13} />
                  {locationText || 'Loja premium de pneus'}
                </span>
                <span>
                  <Clock3 size={13} />
                  {hoursLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              onClick={onWhatsappClick}
              className={`btn-whatsapp-header ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
              aria-label={`Falar com ${store.nome || 'a loja'} no WhatsApp`}
              disabled={!commercialContactEnabled}
              aria-disabled={!commercialContactEnabled}
            >
              <MessageSquare size={18} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
