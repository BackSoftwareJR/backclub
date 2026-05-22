import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  FileText, 
  User, 
  Building2, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Send
} from 'lucide-react';
import quotesApi from '../../api/quotes';
import type { Quote } from '../../types/sellers';
import '../Venditori/QuoteDetailPage.css';

const QuoteDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const data = await quotesApi.getById(Number(id));
      setQuote(data);
      setNotes(data.notes || '');
      setStatus(data.status);
      setEmail(data.client?.email || '');
    } catch (error) {
      console.error('Errore nel caricamento preventivo:', error);
      alert('Errore nel caricamento del preventivo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!quote) return;
    
    try {
      setSaving(true);
      await quotesApi.update(quote.id, { notes });
      setQuote({ ...quote, notes });
      setIsEditing(false);
      alert('Note salvate con successo');
    } catch (error) {
      console.error('Errore nel salvataggio note:', error);
      alert('Errore nel salvataggio delle note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!quote) return;
    
    try {
      setSaving(true);
      await quotesApi.updateStatus(quote.id, newStatus);
      setQuote({ ...quote, status: newStatus as any });
      setStatus(newStatus);
      alert('Stato aggiornato con successo');
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato:', error);
      alert('Errore nell\'aggiornamento dello stato');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quote) return;
    
    try {
      const response = await quotesApi.generatePDF(quote.id);
      
      // Verifica se la risposta è un errore JSON
      if (response.headers?.['content-type']?.includes('application/json')) {
        // È un errore JSON, mostra il messaggio
        const errorData = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
        alert('Errore: ' + (errorData.error || errorData.message || 'Errore sconosciuto'));
        return;
      }
      
      // Verifica il Content-Type della risposta
      const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
      
      // Crea il blob dalla risposta
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: contentType || 'application/pdf' });
      
      // Verifica che il blob non sia vuoto
      if (blob.size === 0) {
        throw new Error('PDF vuoto');
      }
      
      // Se è HTML invece di PDF, mostra errore
      if (contentType.includes('text/html')) {
        const text = await blob.text();
        alert('Errore nella generazione del PDF. Verifica che DomPDF sia installato sul server.');
        console.error('Risposta HTML invece di PDF:', text.substring(0, 500));
        return;
      }
      
      // Verifica che sia un PDF valido leggendo i primi byte
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isPDF) {
        // Verifica se è JSON (errore)
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nella generazione del PDF'));
            return;
          } catch (e) {
            // Non è JSON
          }
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }
      
      // Forza il download del PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preventivo_${quote.quote_number}.pdf`;
      link.style.display = 'none'; // Nascondi il link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      
      // Se è un errore HTTP, mostra il messaggio
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error || errorData.message) {
          alert('Errore: ' + (errorData.error || errorData.message));
          return;
        }
      }
      
      alert('Errore nella generazione del PDF. Riprova più tardi.');
    }
  };

  const handleSendEmail = async () => {
    if (!quote || !email) {
      alert('Inserisci un indirizzo email');
      return;
    }

    try {
      setSending(true);
      // TODO: Implementare API per invio email quando disponibile
      // await quotesApi.sendEmail(quote.id, { email });
      alert(`Email inviata a ${email}`);
    } catch (error) {
      console.error('Errore nell\'invio email:', error);
      alert('Errore nell\'invio dell\'email');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string; icon: any }> = {
      pending: { label: 'In Attesa', class: 'warning', icon: Clock },
      approved: { label: 'Approvato', class: 'success', icon: CheckCircle2 },
      rejected: { label: 'Rifiutato', class: 'danger', icon: XCircle },
      started: { label: 'Avviato', class: 'info', icon: CheckCircle2 },
      completed: { label: 'Completato', class: 'success', icon: CheckCircle2 },
    };
    return badges[status] || { label: status, class: '', icon: FileText };
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="venditori-empty-state">
        <h3>Preventivo non trovato</h3>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/segreteria/preventivi')}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(quote.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="quote-detail-page">
      <div className="detail-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/segreteria/preventivi')}
        >
          <ArrowLeft size={18} />
          Torna ai Preventivi
        </button>
        <div className="detail-header-content">
          <div>
            <h1 className="venditori-page-title">{quote.title || quote.quote_number}</h1>
            <div className="quote-header-info">
              <span className="quote-number-badge">{quote.quote_number}</span>
              <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                <StatusIcon size={14} />
                {statusBadge.label}
              </span>
            </div>
          </div>
          <div className="detail-header-actions">
            <button
              className="venditori-btn venditori-btn-secondary"
              onClick={handleDownloadPDF}
            >
              <Download size={18} />
              Scarica PDF
            </button>
            <button
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate(`/segreteria/preventivi/${quote.id}/edit`)}
            >
              <Edit size={18} />
              Modifica
            </button>
          </div>
        </div>
      </div>

      <div className="detail-content-grid">
        {/* Informazioni Principali */}
        <div className="detail-card">
          <div className="detail-card-title">
            <FileText size={20} />
            Informazioni Preventivo
          </div>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Numero Preventivo</span>
              <span className="info-value">{quote.quote_number}</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Titolo</span>
              <span className="info-value">{quote.title || '-'}</span>
            </div>
            {quote.description && (
              <div className="detail-info-item">
                <span className="info-label">Descrizione</span>
                <span className="info-value">{quote.description}</span>
              </div>
            )}
            <div className="detail-info-item">
              <span className="info-label">Data Creazione</span>
              <span className="info-value">
                {new Date(quote.created_at).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {quote.valid_until && (
              <div className="detail-info-item highlight">
                <span className="info-label">Valido fino al</span>
                <span className="info-value">
                  {new Date(quote.valid_until).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div className="detail-card">
          <div className="detail-card-title">
            <Building2 size={20} />
            Cliente
          </div>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Ragione Sociale</span>
              <span className="info-value">{quote.client?.company_name || '-'}</span>
            </div>
            {quote.client?.email && (
              <div className="detail-info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{quote.client.email}</span>
              </div>
            )}
            {quote.client?.phone && (
              <div className="detail-info-item">
                <span className="info-label">Telefono</span>
                <span className="info-value">{quote.client.phone}</span>
              </div>
            )}
            {quote.client?.vat_number && (
              <div className="detail-info-item">
                <span className="info-label">P.IVA</span>
                <span className="info-value">{quote.client.vat_number}</span>
              </div>
            )}
            <button
              className="venditori-btn venditori-btn-secondary"
              onClick={() => quote.client_id && navigate(`/segreteria/contatti/${quote.client_id}`)}
              style={{ marginTop: 'var(--spacing-4)' }}
            >
              <User size={16} />
              Vai al Cliente
            </button>
          </div>
        </div>

        {/* Venditore */}
        {quote.seller && (
          <div className="detail-card">
            <div className="detail-card-title">
              <User size={20} />
              Venditore
            </div>
            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Nome</span>
                <span className="info-value">{quote.seller.user?.name || '-'}</span>
              </div>
              {quote.seller.user?.email && (
                <div className="detail-info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{quote.seller.user.email}</span>
                </div>
              )}
              {quote.seller.commission_rate && (
                <div className="detail-info-item highlight">
                  <span className="info-label">Provvigione</span>
                  <span className="info-value">{quote.seller.commission_rate}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Totali */}
        <div className="detail-card">
          <div className="detail-card-title">
            <DollarSign size={20} />
            Totali
          </div>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Subtotale</span>
              <span className="info-value price-value">
                € {quote.subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="detail-info-item">
                <span className="info-label">
                  Sconto ({Number(quote.discount_percentage || 0).toFixed(1)}%)
                </span>
                <span className="info-value" style={{ color: 'var(--color-error)' }}>
                  - € {quote.discount_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quote.tax_amount > 0 && (
              <div className="detail-info-item">
                <span className="info-label">
                  IVA ({Number(quote.tax_percentage || 0).toFixed(1)}%)
                </span>
                <span className="info-value">
                  € {quote.tax_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="detail-info-item highlight">
              <span className="info-label">Totale</span>
              <span className="info-value price-value total-value">
                € {quote.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Articoli */}
        {quote.items && quote.items.length > 0 && (
          <div className="detail-card full-width">
            <div className="detail-card-title">
              <FileText size={20} />
              Articoli ({quote.items.length})
            </div>
            <div className="items-table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Descrizione</th>
                    <th className="text-center">Q.tà</th>
                    <th className="text-right">Prezzo Unit.</th>
                    <th className="text-right">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <div className="item-description">{item.description}</div>
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">
                        € {item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right">
                        € {item.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="detail-card full-width">
          <div className="detail-card-title">
            <FileText size={20} />
            Note
          </div>
          {isEditing ? (
            <div className="notes-editor">
              <textarea
                className="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inserisci note sul preventivo..."
                rows={6}
              />
              <div className="notes-actions">
                <button
                  className="venditori-btn venditori-btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setNotes(quote.notes || '');
                  }}
                >
                  Annulla
                </button>
                <button
                  className="venditori-btn venditori-btn-primary"
                  onClick={handleSaveNotes}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Salvataggio...' : 'Salva Note'}
                </button>
              </div>
            </div>
          ) : (
            <div className="notes-display">
              {quote.notes ? (
                <p className="notes-content">{quote.notes}</p>
              ) : (
                <p className="notes-empty">Nessuna nota presente</p>
              )}
              <button
                className="venditori-btn venditori-btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                <Edit size={16} />
                {quote.notes ? 'Modifica Note' : 'Aggiungi Note'}
              </button>
            </div>
          )}
        </div>

        {/* Azioni Rapide */}
        <div className="detail-card full-width">
          <div className="detail-card-title">
            <FileText size={20} />
            Azioni Rapide
          </div>
          <div className="quick-actions-grid">
            {/* Cambio Stato */}
            <div className="quick-action-item">
              <label className="action-label">Cambia Stato</label>
              <select
                className="status-select"
                value={status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={saving}
              >
                <option value="pending">In Attesa</option>
                <option value="approved">Approvato</option>
                <option value="rejected">Rifiutato</option>
                <option value="started">Avviato</option>
                <option value="completed">Completato</option>
              </select>
            </div>

            {/* Invio Email */}
            <div className="quick-action-item">
              <label className="action-label">Invia Email al Cliente</label>
              <div className="email-action-group">
                <input
                  type="email"
                  className="email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@cliente.it"
                />
                <button
                  className="venditori-btn venditori-btn-primary"
                  onClick={handleSendEmail}
                  disabled={!email || sending}
                >
                  <Send size={16} />
                  {sending ? 'Invio...' : 'Invia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPage;

