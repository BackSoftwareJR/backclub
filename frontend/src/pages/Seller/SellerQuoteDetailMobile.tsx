import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  Mail,
  Percent,
  Info,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { Quote } from '../../types/sellers';
import { useAuth } from '../../context/AuthContext';
import { sellerCache } from '../../utils/sellerCache';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerQuoteDetailMobile.css';

function getEstimatedCommission(quote: Quote, commissionRate: number): number {
  const base = quote.subtotal ?? 0;
  const rate = Number(commissionRate) || 0;
  return (base * rate) / 100;
}

/** Prime due frasi del testo; se ce ne sono altre, hasMore = true */
function getFirstTwoSentences(text: string): { short: string; hasMore: boolean } {
  if (!text || !text.trim()) return { short: '', hasMore: false };
  const trimmed = text.trim();
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return { short: trimmed, hasMore: false };
  const short = sentences.slice(0, 2).join(' ').trim();
  return { short, hasMore: true };
}

const SellerQuoteDetailMobile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [requestingContract, setRequestingContract] = useState(false);
  const [expandedNoteIndices, setExpandedNoteIndices] = useState<Set<number>>(new Set());

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
      await loadQuote();
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
        const errorData =
          typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data;
        alert('Errore: ' + (errorData.error || errorData.message || 'Errore sconosciuto'));
        return;
      }

      const contentType =
        response.headers?.['content-type'] ||
        response.headers?.['Content-Type'] ||
        '';
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: contentType || 'application/pdf',
            });

      if (blob.size === 0) {
        throw new Error('PDF vuoto');
      }

      if (contentType.includes('text/html')) {
        alert(
          'Errore nella generazione del PDF. Verifica che DomPDF sia installato sul server.'
        );
        return;
      }

      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF =
        pdfHeader[0] === 0x25 &&
        pdfHeader[1] === 0x50 &&
        pdfHeader[2] === 0x44 &&
        pdfHeader[3] === 0x46;

      if (!isPDF) {
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert(
              'Errore: ' +
                (errorData.error ||
                  errorData.message ||
                  'Errore nella generazione del PDF')
            );
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
      setShowEmailSheet(false);
    } catch (error: any) {
      console.error('Errore nell\'invio email:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Errore nell\'invio dell\'email';
      alert('Errore: ' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const getStatusPill = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; bgColor: string; color: string }
    > = {
      pending: {
        label: 'IN ATTESA',
        bgColor: 'rgba(255, 214, 10, 0.15)',
        color: '#FFD60A',
      },
      approved: {
        label: 'APPROVATO',
        bgColor: 'rgba(48, 209, 88, 0.15)',
        color: '#30D158',
      },
      rejected: {
        label: 'RIFIUTATO',
        bgColor: 'rgba(255, 69, 58, 0.15)',
        color: '#FF453A',
      },
      started: {
        label: 'AVVIATO',
        bgColor: 'rgba(10, 132, 255, 0.15)',
        color: '#0A84FF',
      },
      completed: {
        label: 'COMPLETATO',
        bgColor: 'rgba(48, 209, 88, 0.15)',
        color: '#30D158',
      },
      contract_requested: {
        label: 'CONTRATTO',
        bgColor: 'rgba(10, 132, 255, 0.15)',
        color: '#0A84FF',
      },
    };
    return (
      statusMap[status] || {
        label: status.toUpperCase(),
        bgColor: 'rgba(142, 142, 147, 0.15)',
        color: '#8E8E93',
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="quote-detail-mobile-ios">
        <div className="quote-detail-loading">
          <SkeletonLoader type="list" count={5} />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-detail-mobile-ios">
        <div className="quote-detail-empty-state">
          <FileText size={64} className="quote-detail-empty-icon" />
          <h3 className="quote-detail-empty-title">Preventivo non trovato</h3>
          <button
            className="ios-button-primary ios-button-full-width"
            onClick={() => navigate('/seller/preventivi')}
            style={{ marginTop: '24px' }}
          >
            Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  const statusPill = getStatusPill(quote.status);

  return (
    <div className="quote-detail-mobile-ios">
      {/* Header - Large Title with Back Button */}
      <div className="quote-detail-header">
        <div className="quote-detail-header-top">
          <button
            onClick={() => navigate('/seller/preventivi')}
            className="quote-detail-back-button"
            aria-label="Indietro"
          >
            <ArrowLeft size={22} style={{ color: '#0A84FF' }} />
          </button>
          <h1 className="ios-large-title" style={{ flex: 1, marginLeft: '8px' }}>
            {quote.title || quote.quote_number}
          </h1>
          <button
            onClick={handleDownloadPDF}
            className="quote-detail-action-button"
            aria-label="Scarica PDF"
          >
            <Download size={22} style={{ color: '#0A84FF' }} />
          </button>
        </div>
        <div className="quote-detail-header-meta">
          <span className="quote-detail-id">{quote.quote_number}</span>
          <div
            className="quote-detail-status-pill"
            style={{
              backgroundColor: statusPill.bgColor,
              color: statusPill.color,
            }}
          >
            {statusPill.label}
          </div>
        </div>
      </div>

      {/* Richiedi contratto - in alto, sempre visibile */}
      {!quote.contract && quote.status !== 'rejected' && quote.status !== 'contract_requested' && (
        <div className="quote-detail-section quote-detail-request-contract-strip">
          <button
            type="button"
            className="quote-detail-request-contract-btn-top"
            onClick={handleRequestContract}
            disabled={requestingContract}
          >
            {requestingContract ? (
              <div className="loading-spinner-small" style={{ width: 20, height: 20 }} />
            ) : (
              <>
                <FileCheck size={20} style={{ color: '#30D158' }} />
                <span>Richiedi contratto</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Client Info Card */}
      {quote.client && (
        <div className="quote-detail-section">
          <div className="quote-detail-client-card">
            <div className="quote-detail-client-row">
              <div className="quote-detail-client-avatar">
                {(quote.client.company_name || 'C')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="quote-detail-client-info">
                <div className="quote-detail-client-name">
                  {quote.client.company_name || 'Cliente non specificato'}
                </div>
                {quote.client.email && (
                  <div className="quote-detail-client-email">
                    {quote.client.email}
                  </div>
                )}
              </div>
              {quote.client_id && (
                <button
                  onClick={() => navigate(`/seller/clienti/${quote.client_id}`)}
                  className="quote-detail-client-link"
                  aria-label="Vai al Cliente"
                >
                  <User size={18} style={{ color: '#0A84FF' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items List Card */}
      {quote.items && quote.items.length > 0 && (
        <div className="quote-detail-section">
          <div className="quote-detail-section-header">ARTICOLI</div>
          <div className="quote-detail-items-card">
            {quote.items.map((item, index) => {
              const isLast = index === (quote.items?.length ?? 0) - 1;

              return (
                <React.Fragment key={item.id || index}>
                  <div className="quote-detail-item-row">
                    <div className="quote-detail-item-info">
                      <div className="quote-detail-item-name">
                        {item.description || 'Articolo senza nome'}
                      </div>
                      {item.notes && (() => {
                        const { short, hasMore } = getFirstTwoSentences(item.notes);
                        const isExpanded = expandedNoteIndices.has(index);
                        const showExpand = hasMore && !isExpanded;
                        const showCollapse = hasMore && isExpanded;
                        return (
                          <div className="quote-detail-item-notes-wrap">
                            <div className="quote-detail-item-notes">
                              {isExpanded ? item.notes : (short || item.notes)}
                            </div>
                            {showExpand && (
                              <button
                                type="button"
                                className="quote-detail-item-notes-more"
                                onClick={() => setExpandedNoteIndices((prev) => new Set(prev).add(index))}
                              >
                                Leggi di più
                              </button>
                            )}
                            {showCollapse && (
                              <button
                                type="button"
                                className="quote-detail-item-notes-more"
                                onClick={() => setExpandedNoteIndices((prev) => {
                                  const next = new Set(prev);
                                  next.delete(index);
                                  return next;
                                })}
                              >
                                Mostra meno
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="quote-detail-item-right">
                      <div className="quote-detail-item-qty">
                        {item.quantity.toLocaleString('it-IT', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="quote-detail-item-price">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                  {!isLast && <div className="quote-detail-item-divider" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Totals Card */}
      <div className="quote-detail-section">
        <div className="quote-detail-totals-card">
          <div className="quote-detail-total-row">
            <span className="quote-detail-total-label">Subtotale</span>
            <span className="quote-detail-total-value">
              {formatCurrency(quote.subtotal)}
            </span>
          </div>
          {quote.discount_amount > 0 && (
            <div className="quote-detail-total-row">
              <span className="quote-detail-total-label">
                Sconto ({Number(quote.discount_percentage || 0).toFixed(1)}%)
              </span>
              <span className="quote-detail-total-value quote-detail-total-discount">
                - {formatCurrency(quote.discount_amount)}
              </span>
            </div>
          )}
          {quote.tax_amount > 0 && (
            <div className="quote-detail-total-row">
              <span className="quote-detail-total-label">
                IVA ({Number(quote.tax_percentage || 0).toFixed(1)}%)
              </span>
              <span className="quote-detail-total-value">
                {formatCurrency(quote.tax_amount)}
              </span>
            </div>
          )}
          <div className="quote-detail-total-divider" />
          <div className="quote-detail-total-row quote-detail-total-final">
            <span className="quote-detail-total-label-final">Totale</span>
            <span className="quote-detail-total-value-final">
              {formatCurrency(quote.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="quote-detail-section">
        <div className="quote-detail-section-header">INFORMAZIONI</div>
        <div className="quote-detail-info-card">
          <div className="quote-detail-info-row">
            <div className="quote-detail-info-label">Data Creazione</div>
            <div className="quote-detail-info-value">
              {formatDate(quote.created_at)}
            </div>
          </div>
          {quote.valid_until && (
            <>
              <div className="quote-detail-info-divider" />
              <div className="quote-detail-info-row">
                <div className="quote-detail-info-label">Valido fino al</div>
                <div
                  className="quote-detail-info-value"
                  style={{ color: '#0A84FF', fontWeight: 600 }}
                >
                  {formatDate(quote.valid_until)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes Card */}
      {quote.notes && (
        <div className="quote-detail-section">
          <div className="quote-detail-section-header">NOTE</div>
          <div className="quote-detail-notes-card">
            <div className="quote-detail-notes-content">{quote.notes}</div>
          </div>
        </div>
      )}

      {/* Commissione stimata (tap → dettaglio commissione) */}
      <div className="quote-detail-section">
        <button
          type="button"
          className="quote-detail-commission-card"
          onClick={() => navigate(`/seller/preventivi/${quote.id}/commissione`)}
        >
          <div className="quote-detail-commission-row">
            <Percent size={20} style={{ color: '#0A84FF' }} />
            <span className="quote-detail-commission-label">Commissione stimata</span>
            <ChevronRight size={20} style={{ color: '#8E8E93' }} />
          </div>
          <div className="quote-detail-commission-amount">
            {formatCurrency(getEstimatedCommission(quote, commissionRate))}
          </div>
          <div className="quote-detail-commission-meta">
            {commissionRate}% su subtotale servizi
          </div>
          <p className="quote-detail-commission-note">
            <Info size={14} />
            La commissione viene calcolata sui servizi e non su eventuali rinnovi.
          </p>
        </button>
      </div>

      {/* Action Buttons - Fixed Bottom */}
      <div className="quote-detail-actions">
        <button
          onClick={() => setShowEmailSheet(true)}
          className="quote-detail-action-btn-secondary"
        >
          <Mail size={20} style={{ color: '#0A84FF' }} />
          <span>Invia Email</span>
        </button>
        <button
          onClick={handleDownloadPDF}
          className="quote-detail-action-btn-primary"
        >
          <Download size={20} />
          <span>Scarica PDF</span>
        </button>
      </div>

      {/* Email Bottom Sheet */}
      <BottomSheet
        isOpen={showEmailSheet}
        onClose={() => setShowEmailSheet(false)}
        title="Invia Email"
        snapPoints={[60]}
      >
        <div
          style={{
            padding: '16px',
            paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
            minHeight: '200px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                fontSize: '17px',
                fontWeight: 600,
                lineHeight: '22px',
                color: '#FFFFFF',
              }}
            >
              Email destinatario
            </label>
            <input
              type="email"
              className="quote-detail-email-input"
              placeholder="nome@azienda.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            onClick={handleSendEmail}
            disabled={!email || sending}
            className="ios-button-primary ios-button-full-width"
          >
            {sending ? 'Invio in corso...' : 'Invia Email'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default SellerQuoteDetailMobile;
