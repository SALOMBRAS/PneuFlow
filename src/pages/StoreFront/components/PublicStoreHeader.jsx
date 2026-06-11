import React from 'react';
import { MessageSquare, MapPin, Clock3, BadgeCheck } from 'lucide-react';

export default function PublicStoreHeader({
  store,
  locationText,
  statusLabel,
  statusTone = 'success',
  onWhatsappClick,
}) {
  const statusClass = statusTone === 'success' ? 'status-pill--success' : 'status-pill--muted';

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
                  {store.hours || 'Atendimento comercial'}
                </span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button onClick={onWhatsappClick} className="btn-whatsapp-header" aria-label={`Falar com ${store.nome || 'a loja'} no WhatsApp`}>
              <MessageSquare size={18} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
