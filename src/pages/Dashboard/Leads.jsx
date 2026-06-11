import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { MessageSquare, Calendar, Car, Search, Trash2 } from 'lucide-react';

export default function Leads() {
  const { store, isOwner } = useStore();
  const [leads, setLeads] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!store) return;
    setIsLoading(true);
    try {
      console.log('Store usada para buscar leads:', store);
      const storeLeads = await storageService.getLeads(store.id);
      console.log('Leads retornados pela RPC para este usuário:', storeLeads);
      setLeads(storeLeads);
    } catch (err) {
      console.error('Erro ao carregar dados dos leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Tem certeza que deseja remover este lead do histórico?')) {
      await storageService.deleteLead(leadId);
      setLeads(leads.filter(l => l.id !== leadId));
    }
  };

  const handleUpdateSaleStatus = async (leadId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      // Call RPC - The database will handle the permissions
      await storageService.updateLeadSaleStatus(leadId, newStatus);
      
      // Always reload after success to get the real state (timestamps, etc.)
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar status da venda:', err);
      // Show the real error message from database/RPC
      alert(err.message || 'Não foi possível atualizar o status da venda.');
      // Revert UI to real state
      await loadData();
    }
  };

  // Filter logic
  const filteredLeads = leads.filter(l => {
    // 1. Text filter
    const text = filterText.toLowerCase();
    const productName = (l.produto_nome || '').toLowerCase();
    const customerName = (l.nome_cliente || '').toLowerCase();
    const sellerName = (l.vendedor_nome || '').toLowerCase();
    const sellerEmail = (l.vendedor_email || '').toLowerCase();
    const refCode = (l.vendedor_ref_code || l.ref_code || '').toLowerCase();

    const matchesText = productName.includes(text) || 
                       customerName.includes(text) || 
                       sellerName.includes(text) || 
                       sellerEmail.includes(text) || 
                       refCode.includes(text);
    
    // 2. Status filter
    let matchesStatus = true;
    if (statusFilter === 'pendentes') matchesStatus = !l.venda_confirmada;
    if (statusFilter === 'vendidos') matchesStatus = l.venda_confirmada;

    return matchesText && matchesStatus;
  });

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, textAlign: 'left' }}>Leads de WhatsApp</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Clientes interessados que clicaram para entrar em contato no WhatsApp.</p>
        </div>
      </div>

      {/* Filter and Search */}
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

        <div style={{ display: 'flex', gap: '8px' }}>
          {['todos', 'pendentes', 'vendidos'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 16px', fontSize: '13px', textTransform: 'capitalize' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table/List */}
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
          <div className="leads-table-wrap" style={{ overflowX: 'auto', position: 'relative' }}>
            <div className="leads-swipe-hint">
              <span>Arraste para o lado para ver cliente, produto, vendedor, compra, valor e ações.</span>
            </div>
            <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Produto</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vendedor</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Compra</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Valor</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data/Hora</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  console.log('Lead rendering:', lead.id, 'venda_confirmada:', lead.venda_confirmada);
                  console.log('Lead venda_confirmada:', lead.id, lead.venda_confirmada);
                  
                  const isSold = lead.venda_confirmada;
                  const rowStyle = isSold ? {
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    borderLeft: '3px solid #22c55e'
                  } : {};

                  return (
                    <tr 
                      key={lead.id} 
                      style={{ ...rowStyle, borderBottom: '1px solid var(--border)' }} 
                      className={isSold ? 'lead-row sold' : 'lead-row'}
                    >
                      {/* Customer Info */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            backgroundColor: 'var(--whatsapp-glow)', 
                            color: 'var(--whatsapp)', 
                            padding: '8px', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <MessageSquare size={16} />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{lead.nome_cliente || 'Cliente Interessado'}</span>
                        </div>
                      </td>

                      {/* Product info */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{lead.produto_nome}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.produto_medida || 'Medida não inf.'}</span>
                        </div>
                      </td>

                      {/* Seller Info */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {lead.vendedor_nome ? (
                            <>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{lead.vendedor_nome}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.vendedor_email}</span>
                            </>
                          ) : lead.seller_id ? (
                            <>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>ID: {lead.seller_id}</span>
                              <span style={{ fontSize: '11px', color: 'var(--error)', fontStyle: 'italic' }}>vendedor não encontrado</span>
                            </>
                          ) : lead.vendedor_ref_code ? (
                            <>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Ref: {lead.vendedor_ref_code}</span>
                              <span style={{ fontSize: '11px', color: 'var(--error)', fontStyle: 'italic' }}>vendedor não encontrado</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem vendedor</span>
                          )}
                          
                          {/* Attribution Badge */}
                          <div style={{ marginTop: '4px' }}>
                            {lead.attribution_source === 'referral' ? (
                              <span style={{ 
                                fontSize: '10px', 
                                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                color: '#10b981', 
                                padding: '2px 8px', 
                                borderRadius: '100px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>Indicação</span>
                            ) : lead.attribution_source === 'product' ? (
                              <span style={{ 
                                fontSize: '10px', 
                                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                color: '#3b82f6', 
                                padding: '2px 8px', 
                                borderRadius: '100px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>Anúncio</span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Sale Confirmation */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: (isSold && !isOwner) ? 'not-allowed' : 'pointer',
                            opacity: (isSold && !isOwner) ? 0.7 : 1
                          }}>
                            <input 
                              type="checkbox" 
                              checked={isSold}
                              onChange={() => handleUpdateSaleStatus(lead.id, isSold)}
                              disabled={isSold && !isOwner}
                              style={{ 
                                width: '18px', 
                                height: '18px', 
                                accentColor: '#22c55e',
                                cursor: (isSold && !isOwner) ? 'not-allowed' : 'pointer'
                              }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isSold ? '#22c55e' : 'var(--text-secondary)' }}>
                              {isSold ? 'Vendido' : 'Pendente'}
                            </span>
                          </label>
                          
                          {isSold && (
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#22c55e', 
                              fontWeight: 600,
                              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              display: 'inline-block',
                              alignSelf: 'flex-start'
                            }}>
                              Confirmado em {new Date(lead.venda_confirmada_em).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Price */}
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                          {lead.produto_preco ? Number(lead.produto_preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '---'}
                        </span>
                      </td>

                      {/* Date/Time */}
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isOwner && (
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="btn btn-outline" 
                              style={{ padding: '6px 8px', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--error)' }}
                              title="Remover Lead"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Styles */}
      <style>{`
        .lead-row {
          transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
        }

        .lead-row:hover {
          background-color: rgba(255, 255, 255, 0.01);
        }

        .lead-row.sold {
          background: rgba(34, 197, 94, 0.08) !important;
          border-left: 3px solid #22c55e !important;
        }

        .lead-row.sold:hover {
          background: rgba(34, 197, 94, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.18);
        }

        .leads-swipe-hint {
          display: none;
        }

        @media (max-width: 768px) {
          .leads-table-wrap {
            -webkit-overflow-scrolling: touch;
          }

          .leads-table {
            min-width: 920px;
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
        }
      `}</style>
    </div>
  );
}
