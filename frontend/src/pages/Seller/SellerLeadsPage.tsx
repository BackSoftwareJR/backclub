import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Phone, Mail, Search, MapPin, X, ChevronRight, Trash2, Copy, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import leadsApi from '../../api/leads';
import type { Lead } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import GuideTour from '../../components/Guide/GuideTour';
import { contattiTourSteps, completeTourSteps } from '../../config/guideTours';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SellerLeadsMobile from './SellerLeadsMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerLeadsPage.css';

const SellerLeadsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEmailMenu, setOpenEmailMenu] = useState<number | null>(null);
  const [showPhoneTooltip, setShowPhoneTooltip] = useState<number | null>(null);
  const [newLead, setNewLead] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    tipologia: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  useEffect(() => {
    loadLeads();
    // Controlla se c'è il parametro action=new nell'URL
    if (searchParams.get('action') === 'new') {
      setShowCreateModal(true);
    }
  }, [statusFilter, priorityFilter, user?.seller_id, searchParams]);

  // Close email menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.email-menu-wrapper') && !target.closest('.email-menu-dropdown')) {
        setOpenEmailMenu(null);
      }
    };

    if (openEmailMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openEmailMenu]);

  const handleCopyEmail = async (email: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Fallback per browser che non supportano clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        // Fallback: crea un elemento temporaneo
        const textArea = document.createElement('textarea');
        textArea.value = email;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
      }
      
      setOpenEmailMenu(null);
      alert(t('leads.email_copied', { email }));
    } catch (err) {
      console.error('Errore nella copia email:', err);
      // Fallback manuale
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setOpenEmailMenu(null);
      alert(t('leads.email_copied', { email }));
    }
  };

  const handleSendEmailFromTemplate = (leadId: number, email: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenEmailMenu(null);
    navigate(`/seller/contatti/${leadId}/email?to=${encodeURIComponent(email)}`);
  };

  const loadLeads = async () => {
    if (!user?.seller_id) return;

    const cached = sellerCache.leads.get(user.seller_id, statusFilter, priorityFilter) as Lead[] | null;
    if (cached) {
      setLeads(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = {
        per_page: 100,
        seller_id: user.seller_id,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const response = await leadsApi.getAll(params);
      setLeads(response.data);
      sellerCache.leads.set(user.seller_id, statusFilter, priorityFilter, response.data);
    } catch (error) {
      console.error('Errore nel caricamento leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (lead: Lead) => {
    if (!confirm(t('leads.reject_confirm', { name: lead.company_name }))) {
      return;
    }

    try {
      await leadsApi.update(lead.id, { status: 'lost' });
      sellerCache.leads.invalidate(user!.seller_id!);
      sellerCache.detail.lead.invalidate(lead.id);
      await loadLeads();
      alert(t('leads.reject_success'));
    } catch (error: any) {
      console.error('Errore nel rifiuto del contatto:', error);
      alert(t('leads.reject_error') + ': ' + (error.message || t('common.error')));
    }
  };

  const handleCreateLead = async () => {
    if (!newLead.company_name.trim()) {
      alert(t('leads.company_name_required'));
      return;
    }

    if (!user?.seller_id) {
      alert(t('leads.seller_not_found'));
      return;
    }

    try {
      setCreating(true);
      const leadData: any = {
        company_name: newLead.company_name,
        assigned_seller_id: user.seller_id, // Assegnazione automatica al venditore
        contact_person: newLead.contact_person || undefined,
        tipologia: newLead.tipologia || undefined,
        description: newLead.description || undefined,
        priority: newLead.priority,
        status: 'new',
      };

      // Aggiungi telefono se presente
      if (newLead.phone) {
        leadData.phones = [{
          number: newLead.phone,
          isPrimary: true,
        }];
      }

      // Aggiungi email se presente
      if (newLead.email) {
        leadData.emails = [{
          email: newLead.email,
          isPrimary: true,
        }];
      }

      await leadsApi.create(leadData);
      sellerCache.leads.invalidate(user.seller_id);
      // Reset form e chiudi modal
      setNewLead({
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        tipologia: '',
        description: '',
        priority: 'medium',
      });
      setShowCreateModal(false);
      
      // Rimuovi il parametro dall'URL
      navigate('/seller/contatti', { replace: true });
      
      // Mostra messaggio di successo
      alert(t('leads.create_success_message'));
      
      // Ricarica la lista
      await loadLeads();
    } catch (error: any) {
      console.error('Errore nella creazione contatto:', error);
      alert('Errore nella creazione del contatto: ' + (error.message || 'Errore sconosciuto'));
    } finally {
      setCreating(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.company_name.toLowerCase().includes(searchLower) ||
        lead.contact_person?.toLowerCase().includes(searchLower) ||
        lead.description?.toLowerCase().includes(searchLower) ||
        lead.tipologia?.toLowerCase().includes(searchLower)
      );
    });
  }, [leads, searchTerm]);

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; class: string; color: string; emoji: string }> = {
      low: { label: 'Bassa', class: 'low', color: '#0A84FF', emoji: '🔵' },
      medium: { label: 'Media', class: 'medium', color: '#FFD60A', emoji: '🟡' },
      high: { label: 'Alta', class: 'high', color: '#FF3B30', emoji: '🔴' },
      urgent: { label: 'Urgente', class: 'urgent', color: '#FF3B30', emoji: '🔴' },
    };
    return badges[priority] || { label: priority, class: '', color: '#86868B', emoji: '⚪' };
  };

  const getPrimaryPhone = (lead: Lead): string | null => {
    if (!lead.phones || lead.phones.length === 0) return null;
    const primary = lead.phones.find(p => p.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.number;
    }
    const first = lead.phones[0];
    return typeof first === 'string' ? first : first.number;
  };

  const getPrimaryEmail = (lead: Lead): string | null => {
    if (!lead.emails || lead.emails.length === 0) return null;
    const primary = lead.emails.find(e => e.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.email;
    }
    const first = lead.emails[0];
    return typeof first === 'string' ? first : first.email;
  };

  // HSL avatar style — deterministic hue from name hash
  const getAvatarStyle = (name: string): React.CSSProperties => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return { background: `hsl(${hue}, 70%, 45%)`, color: '#ffffff' };
  };

  const getInitials = (companyName: string): string => {
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return companyName.substring(0, 2).toUpperCase();
  };

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerLeadsMobile />;
  }

  if (loading) {
    return (
      <div className={`apple-crm-page ${resolvedTheme === 'dark' ? 'dark' : 'light'} apple-crm-page-skeleton`}>
        <div className="apple-crm-toolbar">
          <SkeletonLoader type="toolbar" />
        </div>
        <div className="apple-crm-list-container">
          <SkeletonLoader type="card" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className={`apple-crm-page ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}>
      <GuideTour steps={contattiTourSteps} tourId="contatti-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      {/* Page Header */}
      <div className="apple-crm-page-header">
        <h1 className="apple-crm-page-title">I Miei Contatti</h1>
      </div>
      {/* Unified Toolbar */}
      <div className="apple-crm-toolbar">
        <div className="apple-crm-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="apple-crm-search-input"
            placeholder={t('leads.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="apple-crm-filters">
          <select
            className="apple-crm-filter-pill"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('leads.status_label')}</option>
            <option value="new">{t('status.new')}</option>
            <option value="contacted">{t('status.contacted')}</option>
            <option value="qualified">{t('status.qualified')}</option>
            <option value="proposal">{t('leads.proposal')}</option>
            <option value="negotiation">{t('leads.negotiation')}</option>
            <option value="won">{t('leads.won')}</option>
            <option value="lost">{t('leads.lost')}</option>
          </select>
          <select
            className="apple-crm-filter-pill"
            value={priorityFilter}
            onChange={(e) => {
              hapticButtonPress();
              setPriorityFilter(e.target.value);
            }}
          >
            <option value="all">{t('leads.priority_label')}</option>
            <option value="urgent">{t('leads.urgent')}</option>
            <option value="high">{t('status.high')}</option>
            <option value="medium">{t('status.medium')}</option>
            <option value="low">{t('status.low')}</option>
          </select>
        </div>
        <button 
          className="apple-crm-primary-btn"
          onClick={() => {
            hapticButtonPress();
            setShowCreateModal(true);
          }}
        >
          <Plus size={18} />
          {t('leads.new')}
        </button>
      </div>

      {/* Contact List */}
      {filteredLeads.length === 0 ? (
        <div className="apple-crm-empty-state">
          <Phone size={64} className="empty-state-icon" />
          <h3>{t('leads.no_leads')}</h3>
          <p>{t('leads.create_first')}</p>
          <button 
            className="apple-crm-primary-btn"
            onClick={() => {
              hapticButtonPress();
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} />
            {t('leads.new')}
          </button>
        </div>
      ) : (
        <div className="apple-crm-list">
          {filteredLeads.map((lead, index) => {
            const priorityBadge = getPriorityBadge(lead.priority);
            const primaryPhone = getPrimaryPhone(lead);
            const primaryEmail = getPrimaryEmail(lead);
            
            const avatarStyle = getAvatarStyle(lead.company_name);
            const initials = getInitials(lead.company_name);
            
            return (
              <motion.div
                key={lead.id} 
                className="apple-crm-row"
                onClick={() => navigate(`/seller/contatti/${lead.id}`)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
              >
                {/* Avatar Column */}
                <div className="apple-crm-avatar">
                  <div 
                    className="contact-avatar"
                    style={avatarStyle}
                  >
                    {initials}
                  </div>
                </div>

                {/* Column 1: Identity (next to Avatar) */}
                <div className="apple-crm-entity">
                  <div className="entity-name">{lead.company_name}</div>
                  <div className="entity-meta">
                    {lead.tipologia && (
                      <>
                        <span className="entity-type">{lead.tipologia}</span>
                        {lead.region && <span className="entity-separator">•</span>}
                      </>
                    )}
                    {lead.region && (
                      <span className="entity-location">
                        <MapPin size={10} />
                        {lead.region}
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 2: Contact Info */}
                <div className="apple-crm-contact">
                  <div className="contact-name">
                    {lead.contact_person || 'Referente non spec.'}
                  </div>
                  {primaryPhone && (
                    <div className="contact-phone">
                      <Phone size={12} />
                      {primaryPhone}
                    </div>
                  )}
                </div>

                {/* Column 3: Priority */}
                <div className="apple-crm-priority">
                  <div className="priority-indicator" style={{ color: priorityBadge.color }}>
                    <span className="priority-dot" style={{ backgroundColor: priorityBadge.color }}></span>
                    <span className="priority-text">{priorityBadge.label}</span>
                  </div>
                </div>

                {/* Column 4: Smart Actions */}
                <div className="apple-crm-actions">
                  {primaryPhone && (
                    <div className="phone-tooltip-wrapper">
                      <button
                        className="action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPhoneTooltip(showPhoneTooltip === lead.id ? null : lead.id);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowPhoneTooltip(null), 200);
                        }}
                      >
                        <Phone size={18} />
                      </button>
                      {showPhoneTooltip === lead.id && (
                        <div className="phone-tooltip">
                          {primaryPhone}
                        </div>
                      )}
                    </div>
                  )}
                  {primaryEmail && (
                    <div className="email-menu-wrapper">
                      <button
                        className="action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenEmailMenu(openEmailMenu === lead.id ? null : lead.id);
                        }}
                      >
                        <Mail size={18} />
                      </button>
                      {openEmailMenu === lead.id && (
                        <div className="email-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="email-menu-item"
                            onClick={(e) => handleCopyEmail(primaryEmail, e)}
                          >
                            <Copy size={16} />
                            <span>Copia email</span>
                          </button>
                          <button
                            className="email-menu-item"
                            onClick={(e) => handleSendEmailFromTemplate(lead.id, primaryEmail, e)}
                          >
                            <Send size={16} />
                            <span>Invia email da template</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    className="action-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/seller/contatti/${lead.id}`);
                    }}
                    title="Dettaglio"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {lead.status !== 'won' && lead.status !== 'lost' && (
                    <button
                      className="action-icon-btn action-icon-btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(lead);
                      }}
                      title="Rifiuta"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Creazione Nuovo Contatto */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('leads.new')}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/seller/contatti', { replace: true });
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('leads.company_name')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                  placeholder={t('leads.company_name_placeholder')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('leads.contact_person')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={newLead.contact_person}
                  onChange={(e) => setNewLead({ ...newLead, contact_person: e.target.value })}
                  placeholder={t('leads.contact_person_placeholder')}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('leads.phone')}</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder={t('leads.phone_placeholder')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('leads.email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder={t('leads.email_placeholder')}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('leads.tipologia')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={newLead.tipologia}
                  onChange={(e) => setNewLead({ ...newLead, tipologia: e.target.value })}
                  placeholder={t('leads.tipologia_placeholder')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('leads.priority_label')}</label>
                <select
                  className="form-select"
                  value={newLead.priority}
                  onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as any })}
                >
                  <option value="low">{t('status.low')}</option>
                  <option value="medium">{t('status.medium')}</option>
                  <option value="high">{t('status.high')}</option>
                  <option value="urgent">{t('leads.urgent')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('leads.description')}</label>
                <textarea
                  className="form-textarea"
                  value={newLead.description}
                  onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                  placeholder={t('leads.description_placeholder')}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/seller/contatti', { replace: true });
                }}
                disabled={creating}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateLead}
                disabled={creating || !newLead.company_name.trim()}
              >
                {creating ? t('common.loading') : t('leads.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerLeadsPage;
