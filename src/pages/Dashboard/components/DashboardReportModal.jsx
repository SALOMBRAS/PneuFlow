import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, LoaderCircle, Printer, X } from 'lucide-react';
import {
  REPORT_PERIOD_PRESETS,
  REPORT_SECTION_DEFINITIONS,
  estimateReportLength,
  formatCurrency,
  formatPercent,
  getUnavailableSectionReason,
  validateReportConfig
} from './dashboardReportUtils';

function ReportConfigStep({
  config,
  onConfigChange,
  onClose,
  onPreview,
  loading,
  error,
  isOwner
}) {
  const lengthEstimate = estimateReportLength(config);
  const validationError = validateReportConfig(config) || error;

  return (
    <div className="dashboard-report-sheet">
      <div className="dashboard-report-sheet__header">
        <div>
          <span className="dashboard-report-sheet__eyebrow">Dashboard principal</span>
          <h2 id="dashboard-report-title">Gerar relatorio</h2>
          <p>Escolha o periodo e as secoes antes de abrir a pre-visualizacao para impressao.</p>
        </div>
        <button type="button" className="dashboard-report-close" onClick={onClose} aria-label="Fechar configuracao">
          <X size={18} />
        </button>
      </div>

      <div className="dashboard-report-sheet__body">
        <div className="dashboard-report-config-grid">
        <section className="dashboard-report-card dashboard-report-card--period">
          <h3>Periodo</h3>
          <div className="dashboard-report-presets">
            {REPORT_PERIOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`dashboard-report-choice ${config.preset === preset.id ? 'is-active' : ''}`}
                onClick={() => onConfigChange((current) => ({ ...current, preset: preset.id }))}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={`dashboard-report-choice ${config.preset === 'custom' ? 'is-active' : ''}`}
              onClick={() => onConfigChange((current) => ({ ...current, preset: 'custom' }))}
            >
              Periodo personalizado
            </button>
          </div>

          <div className="dashboard-report-date-grid">
            <label>
              <span>Data inicial</span>
              <input
                type="date"
                value={config.startDate}
                onChange={(event) => onConfigChange((current) => ({ ...current, preset: 'custom', startDate: event.target.value }))}
                max={config.endDate || undefined}
              />
            </label>
            <label>
              <span>Data final</span>
              <input
                type="date"
                value={config.endDate}
                onChange={(event) => onConfigChange((current) => ({ ...current, preset: 'custom', endDate: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="dashboard-report-card">
          <div className="dashboard-report-card__top">
            <div>
              <h3>Secoes</h3>
              <p>Estimativa de extensao: <strong>{lengthEstimate}</strong></p>
            </div>
            <div className="dashboard-report-bulk-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  onConfigChange((current) => ({
                    ...current,
                    sections: REPORT_SECTION_DEFINITIONS.reduce((acc, section) => {
                      acc[section.id] = !getUnavailableSectionReason(section) && (!section.ownerOnly || isOwner);
                      return acc;
                    }, {})
                  }))
                }
              >
                Selecionar tudo
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  onConfigChange((current) => ({
                    ...current,
                    sections: REPORT_SECTION_DEFINITIONS.reduce((acc, section) => {
                      acc[section.id] = false;
                      return acc;
                    }, {})
                  }))
                }
              >
                Limpar selecao
              </button>
            </div>
          </div>

          <div className="dashboard-report-sections">
            {REPORT_SECTION_DEFINITIONS.map((section) => {
              const unavailableReason = getUnavailableSectionReason(section);
              const disabled = Boolean(unavailableReason) || (section.ownerOnly && !isOwner);

              return (
                <label key={section.id} className={`dashboard-report-section-row ${disabled ? 'is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.sections?.[section.id])}
                    disabled={disabled}
                    onChange={(event) =>
                      onConfigChange((current) => ({
                        ...current,
                        sections: {
                          ...current.sections,
                          [section.id]: event.target.checked
                        }
                      }))
                    }
                  />
                  <div>
                    <strong>{section.label}</strong>
                    <span>{unavailableReason || section.description}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {!config.sections?.contacts && (
            <div className="dashboard-report-privacy-note">
              Dados pessoais sensiveis so entram se a secao correspondente estiver marcada.
            </div>
          )}
        </section>
      </div>
      </div>

      {validationError && <div className="dashboard-report-feedback is-error">{validationError}</div>}

      <div className="dashboard-report-sheet__actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" onClick={onPreview} disabled={loading}>
          {loading ? <LoaderCircle size={16} className="spin" /> : <FileText size={16} />}
          {loading ? 'Carregando...' : 'Visualizar relatorio'}
        </button>
      </div>
    </div>
  );
}

function SummaryGrid({ summary }) {
  const cards = [
    { label: 'Visualizacoes', value: summary.totalViews },
    { label: 'Clientes interessados', value: summary.totalLeads },
    { label: 'Vendas confirmadas', value: summary.confirmedSales },
    { label: 'Faturamento confirmado', value: formatCurrency(summary.confirmedRevenue) },
    { label: 'Taxa de conversao', value: `${formatPercent(summary.conversionRate)}%` },
    { label: 'Ticket medio', value: summary.confirmedSales > 0 ? formatCurrency(summary.averageTicket) : 'Sem dados' }
  ];

  return (
    <div className="dashboard-report-summary-grid">
      {cards.map((item) => (
        <article key={item.label} className="dashboard-report-summary-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function ReportSection({ section }) {
  if (section.kind === 'summary') {
    return (
      <section className="dashboard-report-preview-section">
        <h3>{section.title}</h3>
        <div className="dashboard-report-inline-summary">
          {section.items.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-report-preview-section">
      <h3>{section.title}</h3>
      {section.rows?.length ? (
        <div className="dashboard-report-table-wrap">
          <table className="dashboard-report-table">
            <thead>
              <tr>
                {section.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, index) => (
                <tr key={`${section.id}-${index}`}>
                  {row.map((value, cellIndex) => (
                    <td key={`${section.id}-${index}-${cellIndex}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="dashboard-report-empty">Nenhum dado encontrado para esta secao no periodo selecionado.</p>
      )}
      {section.totalLabel && (
        <div className="dashboard-report-total">
          <span>{section.totalLabel}</span>
          <strong>{section.totalValue}</strong>
        </div>
      )}
    </section>
  );
}

function ReportPreviewStep({ report, onBack, onClose, onPrint }) {
  return (
    <div className="dashboard-report-sheet dashboard-report-sheet--preview">
      <div className="dashboard-report-sheet__header no-print">
        <div>
          <span className="dashboard-report-sheet__eyebrow">Pre-visualizacao</span>
          <h2 id="dashboard-report-title">Relatorio pronto para impressao</h2>
          <p>Confira o conteudo antes de imprimir ou salvar em PDF pelo navegador.</p>
        </div>
        <button type="button" className="dashboard-report-close" onClick={onClose} aria-label="Fechar pre-visualizacao">
          <X size={18} />
        </button>
      </div>

      <div className="dashboard-report-sheet__body dashboard-report-sheet__body--preview">
        <div className="dashboard-report-preview print-surface">
        <header className="dashboard-report-preview__header">
          <div className="dashboard-report-brand">
            {report.header.storeLogo ? (
              <img src={report.header.storeLogo} alt={`Logo da loja ${report.header.storeName}`} />
            ) : (
              <div className="dashboard-report-logo-fallback">PneuFlow</div>
            )}
            <div>
              <span>{report.header.storeName}</span>
              <h1>{report.header.title}</h1>
            </div>
          </div>
          <div className="dashboard-report-meta">
            <span>Periodo: {report.header.rangeLabel}</span>
            <span>Gerado em: {report.header.generatedAt}</span>
          </div>
        </header>

        <SummaryGrid summary={report.summary} />

        {report.missingData?.length > 0 && (
          <div className="dashboard-report-missing-data">
            {report.missingData.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}

        <div className="dashboard-report-preview__sections">
          {report.sections.map((section) => (
            <ReportSection key={section.id} section={section} />
          ))}
        </div>

        <footer className="dashboard-report-preview__footer">
          <span>{report.header.storeName}</span>
          <span>Relatorio gerado pelo PneuFlow</span>
        </footer>
      </div>
      </div>

      <div className="dashboard-report-sheet__actions no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" onClick={onPrint}>
          <Printer size={16} />
          Imprimir / Salvar em PDF
        </button>
      </div>
    </div>
  );
}

export default function DashboardReportModal(props) {
  const { isOpen, step, report, ...rest } = props;

  if (!isOpen) return null;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        rest.onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [rest]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="dashboard-report-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-report-title"
      >
        <div className="dashboard-report-backdrop" onClick={rest.onClose} />
        <div className="dashboard-report-container">
          {step === 'preview' && report ? (
            <ReportPreviewStep report={report} onBack={rest.onBackToConfig} onClose={rest.onClose} onPrint={rest.onPrint} />
          ) : (
            <ReportConfigStep {...rest} />
          )}
        </div>
      </div>

      <style>{`
        .dashboard-report-overlay {
          position: fixed;
          inset: 0;
          z-index: 140;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100dvh;
          padding: 16px 24px;
          box-sizing: border-box;
        }

        .dashboard-report-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(5, 8, 14, 0.72);
          backdrop-filter: blur(8px);
        }

        .dashboard-report-container {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100vw - 48px));
          max-width: 1180px;
          height: auto;
          max-height: calc(100dvh - 32px);
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.98));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          box-sizing: border-box;
        }

        .dashboard-report-sheet {
          min-height: 0;
          max-height: calc(100dvh - 32px);
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          color: var(--text-primary);
        }

        .dashboard-report-sheet--preview {
          background: #f3f4f6;
          color: #111827;
        }

        .dashboard-report-sheet__header,
        .dashboard-report-sheet__actions {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 24px 28px;
          box-sizing: border-box;
        }

        .dashboard-report-sheet__header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: inherit;
        }

        .dashboard-report-sheet__actions {
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: inherit;
        }

        .dashboard-report-sheet--preview .dashboard-report-sheet__header,
        .dashboard-report-sheet--preview .dashboard-report-sheet__actions {
          border-color: #e5e7eb;
        }

        .dashboard-report-sheet__body {
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px 28px;
          box-sizing: border-box;
        }

        .dashboard-report-sheet__body--preview {
          padding: 24px;
        }

        .dashboard-report-sheet__eyebrow {
          display: inline-block;
          margin-bottom: 8px;
          color: #fbbf24;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dashboard-report-sheet__header h2,
        .dashboard-report-card h3,
        .dashboard-report-preview-section h3 {
          margin: 0;
        }

        .dashboard-report-sheet__header p,
        .dashboard-report-card p,
        .dashboard-report-section-row span {
          color: var(--text-secondary);
        }

        .dashboard-report-close {
          flex: 0 0 auto;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: currentColor;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .dashboard-report-config-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 18px;
          min-width: 0;
          align-items: start;
        }

        .dashboard-report-card {
          min-width: 0;
          display: grid;
          gap: 18px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.04);
          box-sizing: border-box;
        }

        .dashboard-report-card--period {
          align-self: start;
          align-content: start;
          align-items: start;
          grid-auto-rows: max-content;
        }

        .dashboard-report-card__top,
        .dashboard-report-bulk-actions {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dashboard-report-presets {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          align-content: start;
          justify-content: stretch;
          grid-auto-rows: minmax(78px, auto);
        }

        .dashboard-report-sections {
          display: grid;
          gap: 10px;
        }

        .dashboard-report-choice {
          width: 100%;
          min-width: 0;
          min-height: 78px;
          display: flex;
          align-items: center;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          cursor: pointer;
          font-weight: 700;
        }

        .dashboard-report-presets > .dashboard-report-choice:last-child {
          grid-column: 1 / -1;
        }

        .dashboard-report-choice.is-active {
          border-color: rgba(245, 158, 11, 0.55);
          background: rgba(245, 158, 11, 0.14);
          color: #fde68a;
        }

        .dashboard-report-date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 4px;
          align-content: start;
        }

        .dashboard-report-date-grid label {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .dashboard-report-date-grid span {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .dashboard-report-date-grid input {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.88);
          color: var(--text-primary);
          padding: 0 12px;
          box-sizing: border-box;
          font-size: 16px;
        }

        .dashboard-report-section-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          gap: 10px;
          min-width: 0;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          box-sizing: border-box;
        }

        .dashboard-report-section-row input {
          margin-top: 2px;
        }

        .dashboard-report-section-row strong {
          display: block;
          margin-bottom: 4px;
          overflow-wrap: anywhere;
        }

        .dashboard-report-section-row span {
          display: block;
          overflow-wrap: anywhere;
          line-height: 1.45;
        }

        .dashboard-report-section-row.is-disabled {
          opacity: 0.58;
        }

        .dashboard-report-feedback {
          margin: 16px 28px 0;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
        }

        .dashboard-report-feedback.is-error,
        .dashboard-report-missing-data {
          border: 1px solid rgba(248, 113, 113, 0.24);
          background: rgba(127, 29, 29, 0.12);
          color: #fecaca;
        }

        .dashboard-report-privacy-note {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.24);
          color: #fde68a;
          font-size: 13px;
          line-height: 1.45;
        }

        .dashboard-report-preview {
          width: min(100%, 960px);
          margin: 0 auto;
          background: #ffffff;
          color: #111827;
          border-radius: 22px;
          padding: 32px;
          box-sizing: border-box;
        }

        .dashboard-report-preview__header,
        .dashboard-report-preview__footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }

        .dashboard-report-brand {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .dashboard-report-brand img,
        .dashboard-report-logo-fallback {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          object-fit: cover;
          background: #111827;
          color: #fbbf24;
          display: grid;
          place-items: center;
          font-weight: 800;
          flex: 0 0 auto;
        }

        .dashboard-report-brand span {
          display: block;
          margin-bottom: 4px;
          color: #6b7280;
          font-size: 13px;
        }

        .dashboard-report-brand h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }

        .dashboard-report-meta {
          display: grid;
          gap: 6px;
          color: #4b5563;
          font-size: 13px;
          text-align: right;
        }

        .dashboard-report-summary-grid,
        .dashboard-report-inline-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboard-report-summary-grid {
          margin: 24px 0;
        }

        .dashboard-report-summary-card,
        .dashboard-report-inline-summary div {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: #f9fafb;
          min-width: 0;
        }

        .dashboard-report-inline-summary div {
          border-radius: 14px;
          padding: 12px;
        }

        .dashboard-report-summary-card span,
        .dashboard-report-inline-summary span,
        .dashboard-report-total span,
        .dashboard-report-empty {
          color: #6b7280;
        }

        .dashboard-report-summary-card strong,
        .dashboard-report-inline-summary strong,
        .dashboard-report-total strong {
          display: block;
          margin-top: 6px;
          color: #111827;
          overflow-wrap: anywhere;
        }

        .dashboard-report-preview__sections {
          display: grid;
          gap: 18px;
        }

        .dashboard-report-preview-section {
          break-inside: avoid;
          page-break-inside: avoid;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 18px;
        }

        .dashboard-report-table-wrap {
          overflow-x: auto;
          overflow-y: visible;
        }

        .dashboard-report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          min-width: 640px;
        }

        .dashboard-report-table thead {
          display: table-header-group;
        }

        .dashboard-report-table th,
        .dashboard-report-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          vertical-align: top;
        }

        .dashboard-report-table th {
          color: #374151;
          background: #f3f4f6;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .dashboard-report-total {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 13px;
        }

        .dashboard-report-missing-data {
          margin: 0 0 18px;
          border-radius: 16px;
          padding: 14px 16px;
        }

        .dashboard-report-preview__footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }

        .spin {
          animation: dashboardReportSpin 0.9s linear infinite;
        }

        @keyframes dashboardReportSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1199px) {
          .dashboard-report-overlay {
            padding: 16px 20px;
          }

          .dashboard-report-container,
          .dashboard-report-sheet {
            max-height: calc(100dvh - 24px);
          }

          .dashboard-report-config-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 14px;
          }

          .dashboard-report-sheet__header,
          .dashboard-report-sheet__body,
          .dashboard-report-sheet__actions {
            padding-left: 22px;
            padding-right: 22px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-report-overlay {
            padding: 16px;
          }

          .dashboard-report-container {
            width: min(100vw - 32px, 100%);
          }

          .dashboard-report-config-grid,
          .dashboard-report-summary-grid,
          .dashboard-report-inline-summary {
            grid-template-columns: 1fr;
          }

          .dashboard-report-sheet__header,
          .dashboard-report-sheet__body,
          .dashboard-report-sheet__actions {
            padding-left: 18px;
            padding-right: 18px;
          }

          .dashboard-report-sheet__actions {
            justify-content: stretch;
          }

          .dashboard-report-sheet__actions .btn {
            flex: 1 1 220px;
            justify-content: center;
          }

          .dashboard-report-bulk-actions .btn {
            flex: 1 1 180px;
          }

          .dashboard-report-preview {
            width: 100%;
            padding: 20px;
          }
        }

        @media (max-width: 599px) {
          .dashboard-report-overlay {
            padding: 0;
            height: 100dvh;
          }

          .dashboard-report-container,
          .dashboard-report-sheet {
            width: 100vw;
            max-width: 100vw;
            max-height: 100dvh;
            height: 100dvh;
            border-radius: 0;
          }

          .dashboard-report-sheet__header {
            padding-top: calc(16px + env(safe-area-inset-top));
          }

          .dashboard-report-sheet__actions {
            padding-bottom: calc(16px + env(safe-area-inset-bottom));
          }

          .dashboard-report-sheet__header,
          .dashboard-report-sheet__body,
          .dashboard-report-sheet__actions {
            padding-left: 16px;
            padding-right: 16px;
          }

          .dashboard-report-sheet__header,
          .dashboard-report-sheet__actions {
            gap: 12px;
          }

          .dashboard-report-presets,
          .dashboard-report-date-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-report-presets {
            grid-auto-rows: minmax(74px, auto);
            gap: 8px;
          }

          .dashboard-report-choice {
            min-height: 74px;
          }

          .dashboard-report-card {
            padding: 16px;
            gap: 14px;
            border-radius: 18px;
          }

          .dashboard-report-bulk-actions,
          .dashboard-report-sheet__actions {
            flex-direction: column;
            align-items: stretch;
          }

          .dashboard-report-bulk-actions .btn,
          .dashboard-report-sheet__actions .btn {
            width: 100%;
          }

          .dashboard-report-preview {
            padding: 16px;
            border-radius: 18px 18px 0 0;
          }

          .dashboard-report-brand,
          .dashboard-report-preview__header,
          .dashboard-report-preview__footer {
            align-items: flex-start;
          }

          .dashboard-report-preview__header,
          .dashboard-report-preview__footer {
            flex-direction: column;
          }

          .dashboard-report-meta {
            text-align: left;
          }

          .dashboard-report-table {
            min-width: 560px;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .print-surface,
          .print-surface * {
            visibility: visible;
          }

          .print-surface {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border-radius: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: auto;
            margin: 14mm;
          }

          .dashboard-report-preview-section,
          .dashboard-report-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>,
    document.body
  );
}
