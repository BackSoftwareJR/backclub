import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, FileText, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { invoicesApi } from '../../api/invoices';
import type { Invoice, InvoiceToIssue } from '../../api/invoices';
import { paymentPlansApi } from '../../api/paymentPlans';
import InvoiceIssueModal from '../../components/InvoiceIssueModal';
import InvoiceSettleModal from '../../components/InvoiceSettleModal';
import CreditNoteModal from '../../components/CreditNoteModal';
import CreateInvoiceModal from '../../components/CreateInvoiceModal';
import EditInvoiceModal from '../../components/EditInvoiceModal';
import './InvoiceListTab.css';

interface InvoiceListTabProps {
  onStatsRefresh?: () => void | Promise<void>;
}

const InvoiceListTab: React.FC<InvoiceListTabProps> = ({ onStatsRefresh }) => {
  const navigate = useNavigate();
  const [toIssue, setToIssue] = useState<InvoiceToIssue[]>([]);
  const [toSettle, setToSettle] = useState<Invoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | null>(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  
  // Modal states
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedToIssue, setSelectedToIssue] = useState<InvoiceToIssue | null>(null);

  useEffect(() => {
    loadData();
  }, [monthFilter, yearFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica fatture da emettere con filtri mese/anno
      const toIssueParams: any = {};
      if (monthFilter) {
        toIssueParams.month = monthFilter;
      }
      if (yearFilter) {
        toIssueParams.year = yearFilter;
      }
      const toIssueResponse = await invoicesApi.getToIssue(toIssueParams);
      setToIssue(toIssueResponse.data || []);

      // Carica fatture da saldare: SEMPRE tutte (nessun filtro mese/anno)
      // Appaiono finché non si preme "Segna come Saldato"
      const toSettleResponse = await invoicesApi.getToSettle({});
      setToSettle(toSettleResponse.data || []);

      // Carica tutte le fatture
      const params: any = {
        per_page: 100,
      };
      if (monthFilter) {
        params.month = monthFilter;
      }
      if (yearFilter) {
        params.year = yearFilter;
      }
      const allResponse = await invoicesApi.getAll(params);
      setAllInvoices(allResponse.data?.data || []);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
    onStatsRefresh?.();
  };

  const handleIssueInvoice = (item: InvoiceToIssue) => {
    setSelectedToIssue(item);
    setShowIssueModal(true);
  };

  const handleEditToIssue = (item: InvoiceToIssue) => {
    navigate(`/segreteria/piani-pagamento/${item.payment_plan_id}/modifica`);
  };

  const handleDeleteToIssue = async (item: InvoiceToIssue) => {
    if (!window.confirm('Eliminare questa rata dal piano? La rata verrà rimossa dal piano di pagamento.')) return;
    try {
      const res = await paymentPlansApi.getById(item.payment_plan_id);
      const plan = res.data;
      const installments = plan.installments || [];
      const remaining = installments
        .filter((inst: { id: number }) => inst.id !== item.installment_id)
        .map((inst: { id: number; due_date: string; amount: number; original_amount?: number; discount_amount?: number; discount_reason?: string; description?: string }) => ({
          id: inst.id,
          due_date: inst.due_date,
          amount: inst.amount,
          original_amount: inst.original_amount,
          discount_amount: inst.discount_amount,
          discount_reason: inst.discount_reason,
          description: inst.description,
        }));
      await paymentPlansApi.updateInstallments(item.payment_plan_id, remaining);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Errore nell\'eliminazione della rata');
    }
  };

  const handleSettleInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSettleModal(true);
  };

  const handleCreditNote = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowCreditNoteModal(true);
  };

  const handleViewDetails = (invoice: Invoice) => {
    // TODO: Naviga a dettaglio fattura
    console.log('View details:', invoice);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    if (invoice.status === 'paid') return;
    setInvoiceToEdit(invoice);
    setShowEditInvoiceModal(true);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'paid') return;
    const msg = invoice.payment_plan_id
      ? 'Eliminando questa fattura la rata del piano tornerà "da emettere". Continuare?'
      : 'Eliminare questa fattura?';
    if (!window.confirm(msg)) return;
    try {
      await invoicesApi.delete(invoice.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Errore nell\'eliminazione');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT');
  };

  const filteredAllInvoices = allInvoices.filter(invoice => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="invoice-list-tab">
      <div className="invoice-list-tab-actions">
        <button
          type="button"
          className="fatture-btn fatture-btn-primary fatture-btn-create"
          onClick={() => setShowCreateInvoiceModal(true)}
        >
          <Plus size={18} />
          Crea Fattura al volo
        </button>
      </div>

      {/* Box 1: Fatture da Emettere */}
      <div className="fatture-list-box">
        <div className="fatture-list-box-header">
          <h3 className="fatture-list-box-title">
            Fatture da Emettere
            <span className="fatture-list-box-count">{toIssue.length}</span>
          </h3>
          <div className="fatture-filters">
            <select
              className="filter-select"
              value={monthFilter || ''}
              onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tutti i mesi</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleDateString('it-IT', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        {toIssue.length === 0 ? (
          <div className="fatture-empty-state">
            <FileText size={48} />
            <p>Nessuna fattura da emettere</p>
          </div>
        ) : (
          <div className="fatture-table-wrapper">
            <table className="fatture-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Importo Previsto</th>
                  <th>Data Scadenza</th>
                  <th>Piano Pagamento</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {toIssue.map((item) => (
                  <tr key={item.installment_id}>
                    <td>
                      <div>
                        <div className="fatture-client-name">{item.client?.company_name}</div>
                        <div className="fatture-client-details">
                          {item.client?.vat_number && `P.IVA: ${item.client.vat_number}`}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="fatture-amount">{formatCurrency(item.amount)}</span>
                    </td>
                    <td>{formatDate(item.due_date)}</td>
                    <td>
                      {item.contract?.contract_number || item.quote?.quote_number || '-'}
                    </td>
                    <td>
                      <div className="fatture-actions">
                        <button
                          className="fatture-btn-icon"
                          onClick={() => handleEditToIssue(item)}
                          title="Modifica rata"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="fatture-btn-icon fatture-btn-icon-danger"
                          onClick={() => handleDeleteToIssue(item)}
                          title="Elimina rata"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="fatture-btn fatture-btn-primary"
                          onClick={() => handleIssueInvoice(item)}
                        >
                          Emetti Fattura
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Box 2: Fatture da Saldare - sempre tutte, a prescindere dal mese */}
      <div className="fatture-list-box">
        <div className="fatture-list-box-header">
          <h3 className="fatture-list-box-title">
            Fatture da Saldare
            <span className="fatture-list-box-count">{toSettle.length}</span>
          </h3>
          <p className="fatture-list-box-hint">Qui compaiono tutte le fatture emesse e non ancora saldate, fino a quando non premi &quot;Segna come Saldato&quot;.</p>
        </div>
        {toSettle.length === 0 ? (
          <div className="fatture-empty-state">
            <CheckCircle size={48} />
            <p>Nessuna fattura da saldare</p>
          </div>
        ) : (
          <div className="fatture-table-wrapper">
            <table className="fatture-table">
              <thead>
                <tr>
                  <th>Numero Fattura</th>
                  <th>Cliente</th>
                  <th>Importo</th>
                  <th>Data Emissione</th>
                  <th>Scadenza</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {toSettle.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="fatture-invoice-number">{invoice.invoice_number}</span>
                    </td>
                    <td>{invoice.client?.company_name}</td>
                    <td>
                      <span className="fatture-amount">{formatCurrency(invoice.total_cocchi)}</span>
                    </td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      <div className="fatture-actions">
                        <button
                          className="fatture-btn-icon"
                          onClick={() => handleViewDetails(invoice)}
                          title="Vedi Dettagli"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="fatture-btn-icon"
                          onClick={() => handleEditInvoice(invoice)}
                          title="Modifica"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="fatture-btn-icon fatture-btn-icon-danger"
                          onClick={() => handleDeleteInvoice(invoice)}
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="fatture-btn fatture-btn-success"
                          onClick={() => handleSettleInvoice(invoice)}
                        >
                          Segna come Saldato
                        </button>
                        <button
                          className="fatture-btn fatture-btn-secondary"
                          onClick={() => handleCreditNote(invoice)}
                        >
                          Emetti Nota di Credito
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Box 3: Tutte le Fatture */}
      <div className="fatture-list-box">
        <div className="fatture-list-box-header">
          <h3 className="fatture-list-box-title">
            Tutte le Fatture
            <span className="fatture-list-box-count">{filteredAllInvoices.length}</span>
          </h3>
          <div className="fatture-filters">
            <div className="fatture-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="fatture-search-input"
                placeholder="Cerca per numero, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={monthFilter || ''}
              onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tutti i mesi</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleDateString('it-IT', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredAllInvoices.length === 0 ? (
          <div className="fatture-empty-state">
            <FileText size={48} />
            <p>Nessuna fattura trovata</p>
          </div>
        ) : (
          <div className="fatture-table-wrapper">
            <table className="fatture-table">
              <thead>
                <tr>
                  <th>Numero Fattura</th>
                  <th>Cliente</th>
                  <th>Importo</th>
                  <th>Data Emissione</th>
                  <th>Scadenza</th>
                  <th>Stato</th>
                  <th>Tipo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="fatture-invoice-number">{invoice.invoice_number}</span>
                    </td>
                    <td>{invoice.client?.company_name}</td>
                    <td>
                      <span className="fatture-amount">{formatCurrency(invoice.total_cocchi)}</span>
                    </td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      <span className={`fatture-status-badge fatture-status-${invoice.status}`}>
                        {invoice.status === 'draft' && 'Bozza'}
                        {invoice.status === 'sent' && 'Inviata'}
                        {invoice.status === 'paid' && 'Pagata'}
                        {invoice.status === 'overdue' && 'Scaduta'}
                        {invoice.status === 'cancelled' && 'Annullata'}
                      </span>
                    </td>
                    <td>
                      {invoice.type === 'credit_note' ? (
                        <span className="fatture-type-badge credit-note">Nota di Credito</span>
                      ) : (
                        <span className="fatture-type-badge invoice">Fattura</span>
                      )}
                    </td>
                    <td>
                      <div className="fatture-actions">
                        <button
                          className="fatture-btn-icon"
                          onClick={() => handleViewDetails(invoice)}
                          title="Vedi Dettagli"
                        >
                          <Eye size={16} />
                        </button>
                        {invoice.status !== 'paid' && (
                          <>
                            <button
                              className="fatture-btn-icon"
                              onClick={() => handleEditInvoice(invoice)}
                              title="Modifica"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="fatture-btn-icon fatture-btn-icon-danger"
                              onClick={() => handleDeleteInvoice(invoice)}
                              title="Elimina"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showIssueModal && selectedToIssue && (
        <InvoiceIssueModal
          toIssue={selectedToIssue}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedToIssue(null);
            loadData();
          }}
        />
      )}

      {showSettleModal && selectedInvoice && (
        <InvoiceSettleModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowSettleModal(false);
            setSelectedInvoice(null);
            loadData();
          }}
        />
      )}

      {showCreditNoteModal && selectedInvoice && (
        <CreditNoteModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowCreditNoteModal(false);
            setSelectedInvoice(null);
            loadData();
          }}
        />
      )}

      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateInvoiceModal(false)}
          onSuccess={loadData}
        />
      )}

      {showEditInvoiceModal && invoiceToEdit && (
        <EditInvoiceModal
          invoice={invoiceToEdit}
          onClose={() => {
            setShowEditInvoiceModal(false);
            setInvoiceToEdit(null);
          }}
          onSuccess={() => {
            loadData();
            setShowEditInvoiceModal(false);
            setInvoiceToEdit(null);
          }}
        />
      )}
    </div>
  );
};

export default InvoiceListTab;

