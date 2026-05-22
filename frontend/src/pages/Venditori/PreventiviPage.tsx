import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, FileText, Search, FileCheck, X, Trash2 } from 'lucide-react';
import quotesApi from '../../api/quotes';
import type { Quote } from '../../types/sellers';
import './PreventiviPage.css';

const PreventiviPage: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadQuotes();
  }, [statusFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await quotesApi.getAll(params);
      setQuotes(response.data);
    } catch (error) {
      console.error('Errore nel caricamento preventivi:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quote_number.toLowerCase().includes(searchLower) ||
      quote.title.toLowerCase().includes(searchLower) ||
      quote.client?.company_name?.toLowerCase().includes(searchLower) ||
      quote.seller?.user?.name.toLowerCase().includes(searchLower)
    );
  });

  const handleRequestContract = async (quoteId: number) => {
    if (!confirm('Vuoi richiedere un contratto per questo preventivo?')) {
      return;
    }

    try {
      await quotesApi.requestContract(quoteId);
      alert('Richiesta contratto creata con successo!');
      // Ricarica i preventivi per aggiornare lo stato
      loadQuotes();
    } catch (error: any) {
      console.error('Errore nella richiesta contratto:', error);
      const errorMessage = error.response?.data?.error || 'Errore nella richiesta del contratto';
      alert(errorMessage);
    }
  };

  const handleReject = async (quoteId: number) => {
    if (!confirm('Vuoi rifiutare questo preventivo?')) {
      return;
    }

    try {
      await quotesApi.reject(quoteId);
      alert('Preventivo rifiutato con successo!');
      // Ricarica i preventivi per aggiornare lo stato
      loadQuotes();
    } catch (error: any) {
      console.error('Errore nel rifiuto del preventivo:', error);
      const errorMessage = error.response?.data?.error || 'Errore nel rifiuto del preventivo';
      alert(errorMessage);
    }
  };

  const handleDelete = async (quoteId: number) => {
    try {
      // Prima prova a eliminare per vedere se c'è un contratto associato
      await quotesApi.delete(quoteId);
      alert('Preventivo eliminato con successo!');
      loadQuotes();
    } catch (error: any) {
      // Se c'è un errore perché ha un contratto associato
      if (error.response?.status === 400 && error.response?.data?.has_contract) {
        const confirmMessage = 
          '⚠️ AZIONE CRITICA ⚠️\n\n' +
          'Questo preventivo è stato convertito in contratto.\n\n' +
          'Vuoi eliminare anche:\n' +
          '• Il contratto associato\n' +
          '• Il progetto collegato\n' +
          '• Tutti i dati correlati\n\n' +
          'Questa è un\'azione IRREVERSIBILE!\n' +
          'Sei sicuro di voler procedere?';
        
        if (confirm(confirmMessage)) {
          // Seconda conferma per sicurezza
          if (confirm('ULTIMA CONFERMA: Eliminare definitivamente preventivo, contratto e progetto?\n\nQuesta azione NON può essere annullata!')) {
            try {
              await quotesApi.delete(quoteId, true);
              alert('Preventivo, contratto e progetto eliminati con successo!');
              loadQuotes();
            } catch (deleteError: any) {
              console.error('Errore nell\'eliminazione completa:', deleteError);
              const errorMessage = deleteError.response?.data?.error || 'Errore nell\'eliminazione';
              alert(errorMessage);
            }
          }
        }
      } else {
        console.error('Errore nell\'eliminazione del preventivo:', error);
        const errorMessage = error.response?.data?.error || 'Errore nell\'eliminazione del preventivo';
        alert(errorMessage);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      pending: { label: 'In Attesa', class: 'warning' },
      approved: { label: 'Approvato', class: 'success' },
      rejected: { label: 'Rifiutato', class: 'danger' },
      started: { label: 'Avviato', class: 'info' },
      completed: { label: 'Completato', class: 'success' },
      contract_requested: { label: 'Contratto Richiesto', class: 'info' },
    };
    return badges[status] || { label: status, class: '' };
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="preventivi-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Preventivi</h1>
          <p className="venditori-page-subtitle">Gestisci tutti i preventivi</p>
        </div>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/venditori/preventivi/nuovo')}
        >
          <Plus size={18} />
          Nuovo Preventivo
        </button>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca preventivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="pending">In Attesa</option>
            <option value="approved">Approvato</option>
            <option value="rejected">Rifiutato</option>
            <option value="contract_requested">Contratto Richiesto</option>
            <option value="started">Avviato</option>
            <option value="completed">Completato</option>
          </select>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="venditori-empty-state">
            <FileText size={64} className="venditori-empty-state-icon" />
            <h3>Nessun preventivo trovato</h3>
            <p>Crea il tuo primo preventivo</p>
            <button 
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate('/venditori/preventivi/nuovo')}
            >
              <Plus size={18} />
              Crea Preventivo
            </button>
          </div>
        ) : (
          <div className="quotes-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Titolo</th>
                  <th>Cliente</th>
                  <th>Venditore</th>
                  <th>Totale</th>
                  <th>Stato</th>
                  <th>Data</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => {
                  const statusBadge = getStatusBadge(quote.status);
                  return (
                    <tr key={quote.id}>
                      <td className="quote-number">{quote.quote_number}</td>
                      <td>{quote.title}</td>
                      <td>{quote.client?.company_name || '-'}</td>
                      <td>{quote.seller?.user?.name || '-'}</td>
                      <td className="total-cell">€ {quote.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>{new Date(quote.created_at).toLocaleDateString('it-IT')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                            title="Visualizza"
                          >
                            <Eye size={16} />
                          </button>
                          {!quote.contract && quote.status !== 'rejected' && quote.status !== 'contract_requested' && (
                            <button
                              className="btn-icon"
                              onClick={() => handleRequestContract(quote.id)}
                              title="Richiedi Contratto"
                              style={{ marginLeft: '8px' }}
                            >
                              <FileCheck size={16} />
                            </button>
                          )}
                          {quote.status !== 'rejected' && quote.status !== 'contract_requested' && (
                            <button
                              className="btn-icon"
                              onClick={() => handleReject(quote.id)}
                              title="Rifiuta Preventivo"
                              style={{ marginLeft: '8px', color: '#ef4444' }}
                            >
                              <X size={16} />
                            </button>
                          )}
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(quote.id)}
                            title="Elimina Preventivo"
                            style={{ marginLeft: '8px', color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
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
    </div>
  );
};

export default PreventiviPage;

