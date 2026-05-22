import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Mail,
  Search,
  Calendar,
  Filter,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import leadsApi from '../../api/leads';
import type { Lead } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerLeadsMobile.css';

const SellerLeadsMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<string>(
    searchParams.get('priority') || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [creating, setCreating] = useState(false);
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
    if (searchParams.get('action') === 'new') {
      setShowCreateSheet(true);
    }
  }, [statusFilter, priorityFilter, user?.seller_id, searchParams]);

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

  const handleCreateLead = async () => {
    if (!newLead.company_name.trim()) {
      alert(t('leads.company_name_required'));
      return;
    }

    if (!user?.seller_id) return;

    try {
      setCreating(true);
      const leadData: any = {
        company_name: newLead.company_name,
        assigned_seller_id: user.seller_id,
        contact_person: newLead.contact_person || undefined,
        tipologia: newLead.tipologia || undefined,
        description: newLead.description || undefined,
        priority: newLead.priority,
        status: 'new',
      };

      if (newLead.phone) {
        leadData.phones = [
          {
            number: newLead.phone,
            isPrimary: true,
          },
        ];
      }

      if (newLead.email) {
        leadData.emails = [
          {
            email: newLead.email,
            isPrimary: true,
          },
        ];
      }

      await leadsApi.create(leadData);
      sellerCache.leads.invalidate(user.seller_id);
      setNewLead({
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        tipologia: '',
        description: '',
        priority: 'medium',
      });
      setShowCreateSheet(false);
      navigate('/seller/contatti', { replace: true });
      await loadLeads();
    } catch (error: any) {
      console.error('Errore nella creazione contatto:', error);
      alert(t('leads.create_error') + ': ' + (error.message || t('common.error')));
    } finally {
      setCreating(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.company_name.toLowerCase().includes(searchLower) ||
        lead.contact_person?.toLowerCase().includes(searchLower) ||
        lead.description?.toLowerCase().includes(searchLower) ||
        lead.tipologia?.toLowerCase().includes(searchLower)
      );
    });
  }, [leads, searchTerm]);

  const getPrimaryPhone = (lead: Lead): string | null => {
    if (!lead.phones || lead.phones.length === 0) return null;
    const primary = lead.phones.find((p) => p.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.number;
    }
    const first = lead.phones[0];
    return typeof first === 'string' ? first : first.number;
  };

  const getPrimaryEmail = (lead: Lead): string | null => {
    if (!lead.emails || lead.emails.length === 0) return null;
    const primary = lead.emails.find((e) => e.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.email;
    }
    const first = lead.emails[0];
    return typeof first === 'string' ? first : first.email;
  };

  const getAvatarColor = (companyName: string) => {
    const colors = [
      '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F',
      '#30D158', '#FFD60A', '#FF9F0A', '#40C8E0',
    ];
    const index = companyName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (companyName: string): string => {
    return companyName.charAt(0).toUpperCase();
  };

  const activeFiltersCount =
    (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0);

  return (
    <PullToRefresh onRefresh={loadLeads}>
      <div className="ios-system-background" style={{ minHeight: '100vh' }}>
        {/* Large Title - iOS Style */}
        <div className="ios-large-title-container ios-safe-area-top">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="ios-large-title">{t('leads.title')}</h1>
            <button
              onClick={() => setShowCreateSheet(true)}
              className="ios-body-bold"
              style={{
                color: '#0A84FF',
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                fontSize: '17px',
                fontWeight: 600,
              }}
            >
              Aggiungi
            </button>
          </div>
        </div>

        {/* Search Bar - iOS Style */}
        <div className="ios-search-bar">
          <Search size={18} className="ios-search-bar-icon" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchActive(e.target.value.length > 0);
            }}
            onFocus={() => setIsSearchActive(true)}
          />
          {isSearchActive && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsSearchActive(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--ios-system-blue)',
                fontSize: '17px',
                fontWeight: 400,
              }}
            >
              Annulla
            </button>
          )}
        </div>

        {/* Filter Button */}
        {activeFiltersCount > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={() => setShowFilters(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--ios-secondary-system-grouped-background)',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Filter size={16} style={{ color: 'var(--ios-label)' }} />
              <span className="ios-body" style={{ fontSize: '15px' }}>Filtri</span>
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: '#0A84FF',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFiltersCount}
              </span>
            </button>
          </div>
        )}

        {/* Leads List - Inset Grouped List */}
        {loading ? (
          <div className="ios-inset-grouped">
            <SkeletonLoader type="card" count={5} />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="ios-empty-state">
            <Users size={64} className="ios-empty-state-icon" />
            <h3 className="ios-empty-state-title">{t('leads.no_leads')}</h3>
            <p className="ios-empty-state-subtitle">
              {searchTerm || activeFiltersCount > 0
                ? 'Prova a modificare la ricerca o i filtri'
                : 'I tuoi contatti appariranno qui.'}
            </p>
            {!searchTerm && activeFiltersCount === 0 && (
              <button
                onClick={() => setShowCreateSheet(true)}
                className="ios-button-primary ios-button-full-width"
              >
                {t('leads.new')}
              </button>
            )}
          </div>
        ) : (
          <div className="ios-inset-grouped">
            <ul className="ios-inset-grouped-list">
              {filteredLeads.map((lead, index) => {
                const primaryPhone = getPrimaryPhone(lead);
                const primaryEmail = getPrimaryEmail(lead);
                const avatarColor = getAvatarColor(lead.company_name);
                const initials = getInitials(lead.company_name);
                const isLast = index === filteredLeads.length - 1;

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      hapticButtonPress();
                      navigate(`/seller/contatti/${lead.id}`);
                    }}
                    className={`ios-inset-grouped-cell contact-card ${isLast ? '' : ''}`}
                    style={{ padding: '16px', cursor: 'pointer' }}
                  >
                    {/* Header: Avatar + Nome/Azienda + Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', marginBottom: '12px' }}>
                      {/* Avatar */}
                      <div
                        className="ios-avatar"
                        style={{
                          backgroundColor: `${avatarColor}20`,
                          color: avatarColor,
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>

                      {/* Nome e Azienda */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="ios-body-bold"
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--ios-label)',
                            marginBottom: '2px',
                          }}
                        >
                          {lead.contact_person || lead.company_name}
                        </div>
                        {lead.contact_person && (
                          <div
                            style={{
                              fontSize: '13px',
                              color: 'var(--ios-secondary-label)',
                              fontFamily: 'var(--ios-font-family)',
                            }}
                          >
                            {lead.company_name}
                          </div>
                        )}
                      </div>

                      {/* Badge Lead/Cliente */}
                      {lead.converted_to_client_id && (
                        <div
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontFamily: 'var(--ios-font-family)',
                            backgroundColor: 'rgba(48, 209, 88, 0.15)',
                            color: '#30D158',
                            flexShrink: 0,
                          }}
                        >
                          Cliente
                        </div>
                      )}
                      {!lead.converted_to_client_id && (
                        <div
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontFamily: 'var(--ios-font-family)',
                            backgroundColor: 'rgba(10, 132, 255, 0.15)',
                            color: '#0A84FF',
                            flexShrink: 0,
                          }}
                        >
                          Lead
                        </div>
                      )}
                    </div>

                    {/* Corpo: Dati Telefono e Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      {/* Riga Telefono */}
                      {primaryPhone && (
                        <a
                          href={`tel:${primaryPhone}`}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="contact-data-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 0',
                            textDecoration: 'none',
                            color: 'rgba(235, 235, 245, 0.6)',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--ios-label)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(235, 235, 245, 0.6)';
                          }}
                        >
                          <Phone size={14} style={{ color: 'var(--ios-secondary-label)', flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '14px',
                              fontFamily: 'var(--ios-font-family)',
                              fontWeight: 400,
                              color: 'inherit',
                              wordBreak: 'break-all',
                            }}
                          >
                            {primaryPhone}
                          </span>
                        </a>
                      )}

                      {/* Riga Email */}
                      {primaryEmail && (
                        <a
                          href={`mailto:${primaryEmail}`}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="contact-data-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 0',
                            textDecoration: 'none',
                            color: 'rgba(235, 235, 245, 0.6)',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--ios-label)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(235, 235, 245, 0.6)';
                          }}
                        >
                          <Mail size={14} style={{ color: 'var(--ios-secondary-label)', flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '14px',
                              fontFamily: 'var(--ios-font-family)',
                              fontWeight: 400,
                              color: 'inherit',
                              wordBreak: 'break-all',
                            }}
                          >
                            {primaryEmail}
                          </span>
                        </a>
                      )}
                    </div>

                    {/* Data Follow-up se presente */}
                    {lead.next_followup_date && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '0.5px solid var(--ios-opaque-separator)',
                        }}
                      >
                        <Calendar size={12} style={{ color: 'var(--ios-secondary-label)' }} />
                        <span
                          className="ios-footnote"
                          style={{
                            fontSize: '13px',
                            color: 'var(--ios-secondary-label)',
                          }}
                        >
                          {new Date(lead.next_followup_date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </ul>
          </div>
        )}

        {/* Filters Bottom Sheet */}
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtri"
          snapPoints={[60]}
        >
          <div className="px-6 py-4 space-y-6">
            {/* Status Filter */}
            <div>
              <label className="ios-body-bold" style={{ display: 'block', marginBottom: '12px' }}>
                Stato
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'all', label: 'Tutti' },
                  { value: 'new', label: 'Nuovo' },
                  { value: 'contacted', label: 'Contattato' },
                  { value: 'qualified', label: 'Qualificato' },
                  { value: 'proposal', label: 'Proposta' },
                  { value: 'won', label: 'Vinto' },
                  { value: 'lost', label: 'Perso' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      statusFilter === option.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="ios-body-bold" style={{ display: 'block', marginBottom: '12px' }}>
                Priorità
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'all', label: t('leads.priority.all') },
                  { value: 'urgent', label: t('leads.urgent') },
                  { value: 'high', label: t('status.high') },
                  { value: 'medium', label: t('status.medium') },
                  { value: 'low', label: t('status.low') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPriorityFilter(option.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      priorityFilter === option.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => {
                setShowFilters(false);
                loadLeads();
              }}
              className="ios-button-primary ios-button-full-width"
            >
              Applica Filtri
            </button>
          </div>
        </BottomSheet>

        {/* Create Lead Bottom Sheet */}
        <BottomSheet
          isOpen={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          title={t('leads.new')}
          snapPoints={[85]}
        >
          <div
            style={{
              padding: '16px',
              paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
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
                {t('leads.company_name')} *
              </label>
              <input
                type="text"
                className="lead-form-input"
                placeholder={t('leads.company_name_placeholder')}
                value={newLead.company_name}
                onChange={(e) =>
                  setNewLead({ ...newLead, company_name: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
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
                {t('leads.contact_person')}
              </label>
              <input
                type="text"
                className="lead-form-input"
                placeholder={t('leads.contact_person_placeholder')}
                value={newLead.contact_person}
                onChange={(e) =>
                  setNewLead({ ...newLead, contact_person: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
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
                {t('leads.phone')}
              </label>
              <input
                type="tel"
                className="lead-form-input"
                placeholder={t('leads.phone_placeholder')}
                value={newLead.phone}
                onChange={(e) =>
                  setNewLead({ ...newLead, phone: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
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
                {t('leads.email')}
              </label>
              <input
                type="email"
                className="lead-form-input"
                placeholder={t('leads.email_placeholder')}
                value={newLead.email}
                onChange={(e) =>
                  setNewLead({ ...newLead, email: e.target.value })
                }
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
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
                {t('leads.priority_label')}
              </label>
              <select
                className="lead-form-select"
                value={newLead.priority}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    priority: e.target.value as any,
                  })
                }
              >
                <option value="low">{t('status.low')}</option>
                <option value="medium">{t('status.medium')}</option>
                <option value="high">{t('status.high')}</option>
                <option value="urgent">{t('leads.urgent')}</option>
              </select>
            </div>

            <button
              onClick={() => {
                hapticButtonPress();
                handleCreateLead();
              }}
              disabled={creating || !newLead.company_name.trim()}
              className="ios-button-primary"
              style={{
                width: '100%',
                margin: 0,
              }}
            >
              {creating ? t('common.loading') : t('leads.create')}
            </button>
          </div>
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
};

export default SellerLeadsMobile;
