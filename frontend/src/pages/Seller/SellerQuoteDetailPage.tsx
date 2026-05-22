import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  User, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Percent,
  Info,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { Quote } from '../../types/sellers';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerQuoteDetailMobile from './SellerQuoteDetailMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import { sellerCache } from '../../utils/sellerCache';
import './SellerQuoteDetailPage.css';

function getEstimatedCommission(quote: Quote, commissionRate: number): number {
  const base = quote.subtotal ?? 0;
  const rate = Number(commissionRate) || 0;
  return (base * rate) / 100;
}

const SellerQuoteDetailPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [requestingContract, setRequestingContract] = useState(false);

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    const quoteId = Number(id);
    const cached = sellerCache.detail.quote.get<Quote>(quoteId);
    if (cached) {
      setQuote(cached);
      setEmail(cached.client?.email || '');
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await quotesApi.getById(quoteId);
      setQuote(data);
      setEmail(data.client?.email || '');
      sellerCache.detail.quote.set(quoteId, data);
      let rate = data.seller?.commission_rate;
      if (rate == null || rate === undefined) {
        try {
          const contractsRes = await sellerCommissionsApi.getContracts();
          rate = contractsRes?.data?.summary?.commission_rate ?? 0;
        } catch (_) {}
      }
      setCommissionRate(Number(rate) || 0);
    } catch (error) {
      console.error('Errore nel caricamento preventivo:', error);
      alert('Errore nel caricamento del preventivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestContract = async () => {
    if (!quote || !user?.seller_id) return;
    if (!confirm('Vuoi richiedere un contratto per questo preventivo?')) return;
    try {
      setRequestingContract(true);
      await quotesApi.requestContract(quote.id);
      sellerCache.quotes.invalidate(user.seller_id);
      sellerCache.dashboard.invalidate(user.seller_id);
      sellerCache.detail.quote.invalidate(quote.id);
      loadQuote();
      alert('Richiesta contratto creata con successo!');
    } catch (error: any) {
      console.error('Errore nella richiesta contratto:', error);
      alert(error.response?.data?.error || 'Errore nella richiesta del contratto');
    } finally {
      setRequestingContract(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quote) return;
    
    try {
      const response = await quotesApi.generatePDF(quote.id);
      
      if (response.headers?.['content-type']?.includes('application/json')) {
        const errorData = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
        alert('Errore: ' + (errorData.error || errorData.message || 'Errore sconosciuto'));
        return;
      }
      
      const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: contentType || 'application/pdf' });
      
      if (blob.size === 0) {
        throw new Error('PDF vuoto');
      }
      
      if (contentType.includes('text/html')) {
        alert('Errore nella generazione del PDF. Verifica che DomPDF sia installato sul server.');
        return;
      }
      
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46;
      
      if (!isPDF) {
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nella generazione del PDF'));
            return;
          } catch (e) {}
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preventivo_${quote.quote_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
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
    if (!quote || !email) return;
    
    try {
      setSending(true);
      const clientName = quote.client?.company_name || quote.client?.name;
      await quotesApi.sendEmail(quote.id, email, clientName);
      alert('Email inviata con successo');
    } catch (error: any) {
      console.error('Errore nell\'invio email:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Errore nell\'invio dell\'email';
      alert('Errore: ' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string; icon: any; color: string }> = {
      pending: { label: 'In Attesa', class: 'warning', icon: Clock, color: '#f59e0b' },
      approved: { label: 'Approvato', class: 'success', icon: CheckCircle2, color: '#10b981' },
      rejected: { label: 'Rifiutato', class: 'danger', icon: XCircle, color: '#ef4444' },
      started: { label: 'Avviato', class: 'info', icon: CheckCircle2, color: '#3b82f6' },
      completed: { label: 'Completato', class: 'success', icon: CheckCircle2, color: '#10b981' },
      contract_requested: { label: 'Contratto Richiesto', class: 'info', icon: FileText, color: '#3b82f6' },
    };
    return badges[status] || { label: status, class: '', icon: FileText, color: '#6b7280' };
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerQuoteDetailMobile />;
  }

  if (loading) {
    return (
      <div className="seller-quote-detail-page seller-quote-detail-skeleton">
        <div className="seller-quote-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="seller-quote-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="seller-quote-detail-empty">
        <h3>Preventivo non trovato</h3>
        <button 
          className="seller-quote-detail-btn-primary"
          onClick={() => navigate('/seller/preventivi')}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(quote.status);
  const StatusIcon = statusBadge.icon;
  const clientInitials = getInitials(quote.client?.company_name || 'Cliente');

  return (
    <div className="seller-quote-detail-page">
      {/* Unified Header - Compact & Cohesive */}
      <div className="seller-quote-detail-header">
        <div className="seller-quote-detail-header-left">
        <button 
            className="seller-quote-detail-back-btn"
          onClick={() => navigate('/seller/preventivi')}
            aria-label="Indietro"
        >
          <ArrowLeft size={18} />
        </button>
          <div className="seller-quote-detail-header-title-group">
            <h1 className="seller-quote-detail-title">{quote.title || quote.quote_number}</h1>
            <div className="seller-quote-detail-header-meta">
              <span className="seller-quote-detail-id-badge">{quote.quote_number}</span>
              <span 
                className="seller-quote-detail-status-badge"
                style={{ backgroundColor: `${statusBadge.color}20`, color: statusBadge.color }}
              >
                <StatusIcon size={12} />
                {statusBadge.label}
              </span>
            </div>
          </div>
        </div>
        <div className="seller-quote-detail-header-actions">
          {!quote.contract && quote.status !== 'rejected' && quote.status !== 'contract_requested' && (
            <button
              type="button"
              className="seller-quote-detail-request-contract-btn-header"
              onClick={handleRequestContract}
              disabled={requestingContract}
            >
              {requestingContract ? (
                <div className="loading-spinner-small" />
              ) : (
                <>
                  <FileCheck size={18} />
                  <span>Richiedi contratto</span>
                </>
              )}
            </button>
          )}
          <div className="seller-quote-detail-action-pill">
            <button
              className="seller-quote-detail-download-btn-header"
              onClick={handleDownloadPDF}
              title="Scarica PDF"
            >
              <Download size={18} />
              <span>Scarica</span>
            </button>
            <div className="seller-quote-detail-action-pill-divider"></div>
            <div className="seller-quote-detail-email-group-compact">
              <input
                type="email"
                placeholder="Invia via email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="seller-quote-detail-email-input-compact"
              />
              <button
                className="seller-quote-detail-email-send-btn-compact"
                onClick={handleSendEmail}
                disabled={!email || sending}
                title="Invia email"
              >
                {sending ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Asymmetric Grid */}
      <div className="seller-quote-detail-container">
        <div className="seller-quote-detail-grid">
          {/* Left Column - Items List (Span 2) - Invoice Table Structure */}
          <div className="seller-quote-detail-main-column">
            {quote.items && quote.items.length > 0 ? (
              <div className="seller-quote-detail-items-card">
                <h2 className="seller-quote-detail-items-title">Dettaglio Articoli</h2>
                {/* Table Header */}
                <div className="seller-quote-detail-items-table-header">
                  <div className="seller-quote-detail-items-table-col-desc">DESCRIZIONE</div>
                  <div className="seller-quote-detail-items-table-col-qty">Q.TÀ</div>
                  <div className="seller-quote-detail-items-table-col-price">PREZZO</div>
          </div>
                {/* Items List */}
                <div className="seller-quote-detail-items-list">
                  {quote.items.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                      <div className="seller-quote-detail-item-row">
                        <div className="seller-quote-detail-item-content">
                          <div className="seller-quote-detail-item-title">
                            {item.description || 'Articolo senza nome'}
            </div>
                          {item.notes && (
                            <div className="seller-quote-detail-item-description">
                              {item.notes}
              </div>
            )}
                        </div>
                        <div className="seller-quote-detail-item-qty">
                          {item.quantity.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="seller-quote-detail-item-price">
                          <div className="seller-quote-detail-item-price-main">
                            € {item.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
                          {item.quantity > 1 && (
                            <div className="seller-quote-detail-item-price-detail">
                              € {item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })} cad.
              </div>
            )}
          </div>
        </div>
                      {quote.items && index < quote.items.length - 1 && (
                        <div className="seller-quote-detail-item-divider"></div>
                      )}
                    </React.Fragment>
                  ))}
            </div>
              </div>
            ) : (
              <div className="seller-quote-detail-items-card">
                <p className="seller-quote-detail-empty-text">Nessun articolo presente</p>
              </div>
            )}

            {/* Notes Section */}
            {quote.notes && (
              <div className="seller-quote-detail-items-card">
                <h2 className="seller-quote-detail-items-title">Note</h2>
                <div className="seller-quote-detail-notes-content">
                  {quote.notes}
                </div>
              </div>
            )}
        </div>

          {/* Right Column - Inspector Sidebar (Span 1, Sticky) */}
          <div className="seller-quote-detail-sidebar">
            {/* Card 1: Totals (Hero) */}
            <div className="seller-quote-detail-inspector-card seller-quote-detail-totals-card">
              <div className="seller-quote-detail-inspector-card-header">
            <DollarSign size={20} />
                <span>Totali</span>
          </div>
              <div className="seller-quote-detail-totals-list">
                <div className="seller-quote-detail-total-row">
                  <span className="seller-quote-detail-total-label">Subtotale</span>
                  <span className="seller-quote-detail-total-value">
                € {quote.subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quote.discount_amount > 0 && (
                  <div className="seller-quote-detail-total-row">
                    <span className="seller-quote-detail-total-label">
                  Sconto ({Number(quote.discount_percentage || 0).toFixed(1)}%)
                </span>
                    <span className="seller-quote-detail-total-value seller-quote-detail-total-discount">
                  - € {quote.discount_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {quote.tax_amount > 0 && (
                  <div className="seller-quote-detail-total-row">
                    <span className="seller-quote-detail-total-label">
                  IVA ({Number(quote.tax_percentage || 0).toFixed(1)}%)
                </span>
                    <span className="seller-quote-detail-total-value">
                  € {quote.tax_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
                <div className="seller-quote-detail-total-divider"></div>
                <div className="seller-quote-detail-total-row seller-quote-detail-total-final">
                  <span className="seller-quote-detail-total-label-final">Totale</span>
                  <span className="seller-quote-detail-total-value-final">
                € {quote.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {/* Download Button - Prominent & Always Visible */}
          <button
            className="seller-quote-detail-download-btn"
            onClick={handleDownloadPDF}
          >
            <Download size={20} />
            <span>Scarica Preventivo</span>
          </button>
        </div>

            {/* Card 2: Client Info - Compact Contact Row */}
            {quote.client && (
              <div className="seller-quote-detail-inspector-card seller-quote-detail-client-card-compact">
                <div className="seller-quote-detail-client-row">
                  <div className="seller-quote-detail-client-avatar-small">
                    {clientInitials}
            </div>
                  <div className="seller-quote-detail-client-info-compact">
                    <div className="seller-quote-detail-client-name-compact">
                      {quote.client.company_name || '-'}
            </div>
                    {quote.client.email && (
                      <div className="seller-quote-detail-client-email-compact">
                        {quote.client.email}
          </div>
        )}
            </div>
                  {quote.client_id && (
                    <button
                      className="seller-quote-detail-client-action-btn"
                      onClick={() => navigate(`/seller/clienti/${quote.client_id}`)}
                      title="Vai al Cliente"
                    >
                      <User size={16} />
                    </button>
                  )}
            </div>
          </div>
        )}

            {/* Card 3: Timeline */}
            <div className="seller-quote-detail-inspector-card">
              <div className="seller-quote-detail-inspector-card-header">
                <Clock size={20} />
                <span>Timeline</span>
              </div>
              <div className="seller-quote-detail-timeline">
                <div className="seller-quote-detail-timeline-item">
                  <div className="seller-quote-detail-timeline-label">Data Creazione</div>
                  <div className="seller-quote-detail-timeline-value">
                    {new Date(quote.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {quote.valid_until && (
                  <div className="seller-quote-detail-timeline-item">
                    <div className="seller-quote-detail-timeline-label">Valido fino al</div>
                    <div className="seller-quote-detail-timeline-value seller-quote-detail-timeline-value-highlight">
                      {new Date(quote.valid_until).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Card: Commissione stimata (link a dettaglio commissione) */}
            <button
              type="button"
              className="seller-quote-detail-commission-card"
              onClick={() => navigate(`/seller/preventivi/${quote.id}/commissione`)}
            >
              <div className="seller-quote-detail-inspector-card-header">
                <Percent size={20} />
                <span>Commissione stimata</span>
                <ChevronRight size={18} className="seller-quote-detail-commission-chevron" />
              </div>
              <div className="seller-quote-detail-commission-preview">
                <span className="seller-quote-detail-commission-amount">
                  € {(getEstimatedCommission(quote, commissionRate)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
                <span className="seller-quote-detail-commission-meta">
                  {commissionRate}% su subtotale servizi
                </span>
              </div>
              <p className="seller-quote-detail-commission-note">
                <Info size={14} />
                La commissione viene calcolata sui servizi e non su eventuali rinnovi.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerQuoteDetailPage;
