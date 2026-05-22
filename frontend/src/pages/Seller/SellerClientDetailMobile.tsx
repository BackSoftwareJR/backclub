import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ChevronRight,
  Info,
} from 'lucide-react';
import BottomSheet from '../../components/Mobile/BottomSheet';
import type { Client } from '../../api/clients';
import type { CrmProject } from '../../api/crmProjects';
import type { Contract } from '../../types/sellers';
import type { Quote } from '../../types/sellers';
import type { ConsolidatedPayment } from './SellerClientDetailPage';
import './SellerClientDetailMobile.css';

interface SellerClientDetailMobileProps {
  client: Client;
  crmProjects: CrmProject[];
  contracts: Contract[];
  quotes: Quote[];
  consolidatedPayments: ConsolidatedPayment[];
  totalUpcoming: number;
  totalToday: number;
  formatCurrency: (amount: number | string | null | undefined) => string;
  formatDate: (date: string | null | undefined) => string;
  getStatusBadge: (status: string, type: 'project' | 'contract' | 'quote') => { label: string; class: string };
  navigate: ReturnType<typeof useNavigate>;
}

const SellerClientDetailMobile: React.FC<SellerClientDetailMobileProps> = ({
  client,
  crmProjects,
  contracts,
  quotes,
  consolidatedPayments,
  totalUpcoming,
  totalToday,
  formatCurrency,
  formatDate,
  getStatusBadge,
  navigate,
}) => {
  const [activeSheet, setActiveSheet] = useState<'progetti' | 'preventivi' | 'contratti' | 'pagamenti' | 'dati-fiscali' | null>(null);

  // Get initials for avatar
  const getInitials = () => {
    if (client.company_name) {
      return client.company_name.charAt(0).toUpperCase();
    }
    return 'C';
  };

  // Get subtitle
  const getSubtitle = () => {
    if (client.ragione_sociale && client.ragione_sociale !== client.company_name) {
      return client.ragione_sociale;
    }
    if (client.contact_person) {
      return client.contact_person;
    }
    return null;
  };

  // Counts
  const activeProjectsCount = crmProjects.filter(p => p.status === 'active' || p.status === 'avviato').length;
  const sentViewedQuotesCount = quotes.filter(q => q.status === 'pending' || q.status === 'started').length;
  const toCollect = totalUpcoming + totalToday;

  // Handle map navigation
  const handleMapClick = () => {
    if (client.address) {
      const encodedAddress = encodeURIComponent(client.address);
      window.open(`https://maps.apple.com/?q=${encodedAddress}`, '_blank');
    }
  };

  // Handle WhatsApp (optional - using phone number)
  const handleWhatsAppClick = () => {
    if (client.phone) {
      const cleanPhone = client.phone.replace(/\s/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  return (
    <div className="seller-client-detail-mobile">
      {/* Navigation Bar */}
      <div className="mobile-client-nav">
        <button className="mobile-nav-back" onClick={() => navigate('/seller/clienti')}>
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Header Section - Identity */}
      <div className="mobile-client-header">
        <div className="mobile-client-avatar-large">
          {getInitials()}
        </div>
        <h1 className="mobile-client-name">{client.company_name}</h1>
        {getSubtitle() && (
          <p className="mobile-client-subtitle">{getSubtitle()}</p>
        )}

        {/* Action Bar - 4 Circular Buttons */}
        <div className="mobile-client-actions">
          {client.phone && (
            <button
              className="mobile-action-btn"
              onClick={() => window.location.href = `tel:${client.phone}`}
              title="Chiama"
            >
              <Phone size={20} />
            </button>
          )}
          {client.email && (
            <button
              className="mobile-action-btn"
              onClick={() => window.location.href = `mailto:${client.email}`}
              title="Invia Email"
            >
              <Mail size={20} />
            </button>
          )}
          {client.address && (
            <button
              className="mobile-action-btn"
              onClick={handleMapClick}
              title="Apri in Mappe"
            >
              <MapPin size={20} />
            </button>
          )}
          {client.phone && (
            <button
              className="mobile-action-btn"
              onClick={handleWhatsAppClick}
              title="Messaggio WhatsApp"
            >
              <MessageCircle size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Highlights Section - Bento Grid */}
      <div className="mobile-highlights-grid">
        <div className="mobile-highlight-card">
          <div className="highlight-label">Da Incassare</div>
          <div className={`highlight-value ${toCollect > 0 ? 'highlight-red' : ''}`}>
            {formatCurrency(toCollect)}
          </div>
        </div>
        <div className="mobile-highlight-card">
          <div className="highlight-label">Preventivi</div>
          <div className="highlight-value">{sentViewedQuotesCount}</div>
          <div className="highlight-subtitle">Inviati/Visualizzati</div>
        </div>
        <div className="mobile-highlight-card">
          <div className="highlight-label">Progetti</div>
          <div className="highlight-value">{activeProjectsCount}</div>
          <div className="highlight-subtitle">Attivi</div>
        </div>
      </div>

      {/* Main Navigation - Inset Grouped List */}
      <div className="mobile-inset-group">
        <div className="inset-group-item" onClick={() => setActiveSheet('progetti')}>
          <div className="inset-item-left">
            <FolderKanban size={20} className="inset-item-icon" />
            <span className="inset-item-text">Progetti</span>
          </div>
          <div className="inset-item-right">
            {crmProjects.length > 0 && (
              <span className="inset-item-badge">{crmProjects.length}</span>
            )}
            <ChevronRight size={18} className="inset-item-chevron" />
          </div>
        </div>

        <div className="inset-group-item" onClick={() => setActiveSheet('preventivi')}>
          <div className="inset-item-left">
            <FileText size={20} className="inset-item-icon" />
            <span className="inset-item-text">Preventivi</span>
          </div>
          <div className="inset-item-right">
            {quotes.length > 0 && (
              <span className="inset-item-badge">{quotes.length}</span>
            )}
            <ChevronRight size={18} className="inset-item-chevron" />
          </div>
        </div>

        <div className="inset-group-item" onClick={() => setActiveSheet('contratti')}>
          <div className="inset-item-left">
            <FileText size={20} className="inset-item-icon" />
            <span className="inset-item-text">Contratti</span>
          </div>
          <div className="inset-item-right">
            {contracts.length > 0 && (
              <span className="inset-item-badge">{contracts.length}</span>
            )}
            <ChevronRight size={18} className="inset-item-chevron" />
          </div>
        </div>

        <div className="inset-group-item" onClick={() => setActiveSheet('pagamenti')}>
          <div className="inset-item-left">
            <CreditCard size={20} className="inset-item-icon" />
            <span className="inset-item-text">Pagamenti</span>
          </div>
          <div className="inset-item-right">
            <ChevronRight size={18} className="inset-item-chevron" />
          </div>
        </div>

        <div className="inset-group-item" onClick={() => setActiveSheet('dati-fiscali')}>
          <div className="inset-item-left">
            <Info size={20} className="inset-item-icon" />
            <span className="inset-item-text">Dati Fiscali</span>
          </div>
          <div className="inset-item-right">
            <ChevronRight size={18} className="inset-item-chevron" />
          </div>
        </div>
      </div>

      {/* Bottom Sheets */}
      {/* Progetti Sheet */}
      <BottomSheet
        isOpen={activeSheet === 'progetti'}
        onClose={() => setActiveSheet(null)}
        title="Progetti"
        snapPoints={[90]}
      >
        <div className="mobile-sheet-content">
          {crmProjects.length === 0 ? (
            <div className="mobile-empty-state">
              <FolderKanban size={48} className="empty-icon" />
              <p className="empty-text">Nessun progetto trovato</p>
            </div>
          ) : (
            <div className="mobile-list">
              {crmProjects.map((project) => {
                const statusBadge = getStatusBadge(project.status, 'project');
                return (
                  <div
                    key={project.id}
                    className="mobile-list-item"
                    onClick={() => {
                      setActiveSheet(null);
                      navigate(`/seller/progetti/${project.id}`);
                    }}
                  >
                    <div className="mobile-list-content">
                      <div className="mobile-list-title">{project.name}</div>
                      {project.description && (
                        <div className="mobile-list-subtitle">{project.description}</div>
                      )}
                      <div className="mobile-list-meta">
                        {project.budget_cocchi && (
                          <span>Budget: {formatCurrency(project.budget_cocchi)}</span>
                        )}
                        {project.start_date && (
                          <span>{formatDate(project.start_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="mobile-list-right">
                      <span className={`mobile-status-badge status-${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                      <ChevronRight size={18} className="mobile-chevron" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Preventivi Sheet */}
      <BottomSheet
        isOpen={activeSheet === 'preventivi'}
        onClose={() => setActiveSheet(null)}
        title="Preventivi"
        snapPoints={[90]}
      >
        <div className="mobile-sheet-content">
          {quotes.length === 0 ? (
            <div className="mobile-empty-state">
              <FileText size={48} className="empty-icon" />
              <p className="empty-text">Nessun preventivo trovato</p>
            </div>
          ) : (
            <div className="mobile-list">
              {quotes.map((quote) => {
                const statusBadge = getStatusBadge(quote.status, 'quote');
                return (
                  <div
                    key={quote.id}
                    className="mobile-list-item"
                    onClick={() => {
                      setActiveSheet(null);
                      navigate(`/seller/preventivi/${quote.id}`);
                    }}
                  >
                    <div className="mobile-list-content">
                      <div className="mobile-list-title">{quote.title || quote.quote_number}</div>
                      <div className="mobile-list-subtitle">{quote.quote_number}</div>
                      <div className="mobile-list-meta">
                        {quote.total_amount && formatCurrency(quote.total_amount)}
                        {quote.valid_until && ` • Valido fino: ${formatDate(quote.valid_until)}`}
                      </div>
                    </div>
                    <div className="mobile-list-right">
                      <span className={`mobile-status-badge status-${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                      <ChevronRight size={18} className="mobile-chevron" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Contratti Sheet */}
      <BottomSheet
        isOpen={activeSheet === 'contratti'}
        onClose={() => setActiveSheet(null)}
        title="Contratti"
        snapPoints={[90]}
      >
        <div className="mobile-sheet-content">
          {contracts.length === 0 ? (
            <div className="mobile-empty-state">
              <FileText size={48} className="empty-icon" />
              <p className="empty-text">Nessun contratto trovato</p>
            </div>
          ) : (
            <div className="mobile-list">
              {contracts.map((contract) => {
                const statusBadge = getStatusBadge(contract.status, 'contract');
                return (
                  <div
                    key={contract.id}
                    className="mobile-list-item"
                    onClick={() => {
                      setActiveSheet(null);
                      navigate(`/seller/contratti/${contract.id}`);
                    }}
                  >
                    <div className="mobile-list-content">
                      <div className="mobile-list-title">{contract.title || contract.contract_number}</div>
                      <div className="mobile-list-subtitle">{contract.contract_number}</div>
                      <div className="mobile-list-meta">
                        {contract.total_value && formatCurrency(contract.total_value)}
                        {contract.start_date && ` • ${formatDate(contract.start_date)}`}
                      </div>
                    </div>
                    <div className="mobile-list-right">
                      <span className={`mobile-status-badge status-${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                      <ChevronRight size={18} className="mobile-chevron" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Pagamenti Sheet */}
      <BottomSheet
        isOpen={activeSheet === 'pagamenti'}
        onClose={() => setActiveSheet(null)}
        title="Piani di Pagamento"
        snapPoints={[90]}
      >
        <div className="mobile-sheet-content">
          {consolidatedPayments.length === 0 ? (
            <div className="mobile-empty-state">
              <CreditCard size={48} className="empty-icon" />
              <p className="empty-text">Nessun piano di pagamento trovato</p>
            </div>
          ) : (
            <div className="mobile-payment-timeline">
              {consolidatedPayments.map((payment, index) => {
                const paymentDate = new Date(payment.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = payment.isPast && paymentDate < today;
                let statusClass = 'future';
                let statusLabel = 'Futuro';

                if (isOverdue) {
                  statusClass = 'overdue';
                  statusLabel = 'Scaduta';
                } else if (payment.isToday) {
                  statusClass = 'today';
                  statusLabel = 'Oggi';
                } else if (payment.isPast) {
                  statusClass = 'paid';
                  statusLabel = 'Pagato';
                }

                return (
                  <div key={index} className={`mobile-payment-item ${statusClass}`}>
                    <div className="mobile-payment-date">{formatDate(payment.date)}</div>
                    <div className="mobile-payment-main">
                      <div className="mobile-payment-desc">{payment.description}</div>
                      {payment.service_name && (
                        <div className="mobile-payment-service">{payment.service_name}</div>
                      )}
                      <div className="mobile-payment-amount">{formatCurrency(payment.amount)}</div>
                    </div>
                    <div className={`mobile-payment-status ${statusClass}`}>
                      <span className="status-dot" />
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Dati Fiscali Sheet */}
      <BottomSheet
        isOpen={activeSheet === 'dati-fiscali'}
        onClose={() => setActiveSheet(null)}
        title="Dati Fiscali"
        snapPoints={[90]}
      >
        <div className="mobile-sheet-content">
          <div className="mobile-info-group">
            <div className="info-group-title">CONTATTI</div>
            <div className="mobile-info-list">
              <div className="mobile-info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{client.email || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">Telefono</span>
                <span className="info-value">{client.phone || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">PEC</span>
                <span className="info-value">{client.pec || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">Indirizzo</span>
                <span className="info-value">{client.address || '-'}</span>
              </div>
            </div>
          </div>

          <div className="mobile-info-group">
            <div className="info-group-title">DATI FISCALI</div>
            <div className="mobile-info-list">
              <div className="mobile-info-row">
                <span className="info-label">Ragione Sociale</span>
                <span className="info-value">{client.ragione_sociale || client.company_name || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">Partita IVA</span>
                <span className="info-value">{client.partita_iva || client.vat_number || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">Codice Fiscale</span>
                <span className="info-value">{client.codice_fiscale || client.tax_code || '-'}</span>
              </div>
              <div className="mobile-info-row">
                <span className="info-label">Codice SDI</span>
                <span className="info-value">{client.sdi_code || '-'}</span>
              </div>
            </div>
          </div>

          {(client.referente_nome || client.referente_cognome || client.referente_email || client.referente_telefono || client.contact_person) && (
            <div className="mobile-info-group">
              <div className="info-group-title">REFERENTE</div>
              <div className="mobile-info-list">
                {(client.referente_nome || client.referente_cognome || client.contact_person) && (
                  <div className="mobile-info-row">
                    <span className="info-label">Nome</span>
                    <span className="info-value">
                      {client.referente_nome || client.referente_cognome
                        ? `${client.referente_nome || ''} ${client.referente_cognome || ''}`.trim()
                        : client.contact_person || '-'}
                    </span>
                  </div>
                )}
                {client.referente_email && (
                  <div className="mobile-info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{client.referente_email}</span>
                  </div>
                )}
                {client.referente_telefono && (
                  <div className="mobile-info-row">
                    <span className="info-label">Telefono</span>
                    <span className="info-value">{client.referente_telefono}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mobile-info-group">
            <div className="info-group-title">ALTRI DATI</div>
            <div className="mobile-info-list">
              <div className="mobile-info-row">
                <span className="info-label">Venditore</span>
                <span className="info-value">
                  {(client as any).seller?.user?.name ||
                   (client as any).seller?.name ||
                   'Non assegnato'}
                </span>
              </div>
              {client.iban && (
                <div className="mobile-info-row">
                  <span className="info-label">IBAN</span>
                  <span className="info-value">{client.iban}</span>
                </div>
              )}
              {client.payment_terms && (
                <div className="mobile-info-row">
                  <span className="info-label">Termini di Pagamento</span>
                  <span className="info-value">{client.payment_terms}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default SellerClientDetailMobile;
