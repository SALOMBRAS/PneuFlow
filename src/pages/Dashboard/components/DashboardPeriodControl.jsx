export default function DashboardPeriodControl({ value, options, selectedLabel, onChange }) {
  return (
    <div
      className="card"
      style={{
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        flexWrap: 'wrap',
        minHeight: '84px'
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Periodo das metricas
        </strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          Escolha o intervalo exibido nas metricas. Atual: {selectedLabel.toLowerCase()}.
        </span>
      </div>

      <select
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: 'min(220px, 100%)', flex: '1 1 180px', marginLeft: 'auto' }}
        aria-label="Selecionar periodo das metricas"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
