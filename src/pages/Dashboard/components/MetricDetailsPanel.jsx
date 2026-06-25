import { ArrowRight, X } from 'lucide-react';

const toneLabels = {
  primary: 'Amber',
  whatsapp: 'WhatsApp',
  blue: 'Visitas',
  purple: 'Conversao',
  success: 'Sucesso'
};

export default function MetricDetailsPanel({ metric, onClose, onNavigate, compact = false }) {
  if (!metric) return null;

  const hasProgress = Number.isFinite(metric.progress);
  const progress = hasProgress ? Math.max(0, Math.min(100, metric.progress)) : 0;
  const tone = metric.tone || 'primary';

  const handleAction = (action) => {
    if (action.href) {
      window.open(action.href, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.to) onNavigate(action.to);
  };

  return (
    <article className={`metric-details-panel metric-details-panel--${tone} ${compact ? 'is-compact' : ''}`}>
      <div className="metric-details-panel__glow" aria-hidden="true" />

      <header className="metric-details-panel__header">
        <div className="metric-details-panel__identity">
          <div className={`metric-details-panel__icon metric-details-panel__icon--${tone}`}>
            {metric.icon}
          </div>

          <div>
            <span className="metric-details-panel__eyebrow">Detalhe da metrica</span>
            <h3>{metric.label}</h3>
            <p>{metric.description || metric.note}</p>
          </div>
        </div>

        <div className="metric-details-panel__value">
          <span>{toneLabels[tone] || 'Metrica'}</span>
          <strong>{metric.value}</strong>
        </div>

        <button
          type="button"
          className="metric-details-panel__close"
          onClick={onClose}
          aria-label="Fechar detalhes da metrica"
        >
          <X size={18} />
        </button>
      </header>

      <div className="metric-details-panel__body">
        <section className="metric-details-panel__summary" aria-label="Resumo da metrica">
          <span className="metric-details-panel__section-label">Resumo</span>
          <strong>{metric.summaryTitle || metric.helper}</strong>
          <p>{metric.note}</p>

          <div className="metric-details-panel__progress">
            <div>
              <span>{metric.progressLabel || 'Indicador atual'}</span>
              <strong>{hasProgress ? `${progress.toFixed(0)}%` : 'Sem dados'}</strong>
            </div>
            <div className="metric-details-panel__bar" aria-hidden="true">
              <span style={{ width: hasProgress ? `${progress}%` : '0%' }} />
            </div>
          </div>
        </section>

        <section className="metric-details-panel__insights" aria-label="Indicadores relacionados">
          {(metric.details || []).map((detail, index) => (
            <div
              key={detail.label}
              className="metric-details-panel__insight"
              style={{ '--metric-detail-index': index }}
            >
              <span>{detail.label}</span>
              <strong>{detail.value}</strong>
            </div>
          ))}
        </section>

        <section className="metric-details-panel__actions" aria-label="Acoes relacionadas">
          <div>
            <span className="metric-details-panel__section-label">Proximo passo</span>
            <p>{metric.actionHint || 'Use uma acao relacionada para aprofundar essa metrica.'}</p>
          </div>

          <div className="metric-details-panel__action-list">
            {(metric.actions || []).map((action) => (
              <button
                key={action.label}
                type="button"
                className="metric-details-panel__action"
                onClick={() => handleAction(action)}
              >
                {action.label}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
