import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  User, 
  MessageSquare,
  Calendar,
  Edit,
  FileText,
  Building2,
  Monitor,
  Target,
  Download
} from 'lucide-react';
import leadsApi from '../../api/leads';
import type { Lead, LeadActivity } from '../../types/sellers';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerLeadDetailMobile from './SellerLeadDetailMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import { sellerCache } from '../../utils/sellerCache';
import './SellerLeadDetailPage.css';

const SellerLeadDetailPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  if (isMobile) {
    return <SellerLeadDetailMobile />;
  }
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: 'note' as 'note' | 'call' | 'email' | 'meeting', description: '', outcome: '' });

  useEffect(() => {
    if (id) {
      loadLead();
      loadActivities();
    }
  }, [id]);

  const loadLead = async () => {
    const leadId = Number(id);
    const cached = sellerCache.detail.lead.get<Lead>(leadId);
    if (cached) {
      setLead(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const leadData = await leadsApi.getById(leadId);
      setLead(leadData);
      sellerCache.detail.lead.set(leadId, leadData);
    } catch (error) {
      console.error('Errore nel caricamento lead:', error);
      alert('Errore nel caricamento del contatto');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const activitiesData = await leadsApi.getActivities(Number(id));
      setActivities(activitiesData);
    } catch (error) {
      console.error('Errore nel caricamento attività:', error);
    }
  };


  const handleSaveActivity = async () => {
    if (!newActivity.description.trim()) {
      alert('Inserisci una descrizione');
      return;
    }

    try {
      setSaving(true);
      
      // Always create an activity in the timeline
      await leadsApi.addActivity(lead!.id, {
        activity_type: newActivity.type,
        description: newActivity.description,
        outcome: newActivity.outcome || undefined,
      });
      
      // If it's a note, also update the lead's notes field (append or replace)
      if (newActivity.type === 'note') {
        const currentNotes = lead?.notes || '';
        const updatedNotes = currentNotes 
          ? `${currentNotes}\n\n${newActivity.description}` 
          : newActivity.description;
        await leadsApi.update(lead!.id, { notes: updatedNotes });
      }
      
      setNewActivity({ type: 'note', description: '', outcome: '' });
      await loadActivities();
      await loadLead();
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Errore nel salvataggio';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead || lead.status === newStatus) {
      return;
    }

    try {
      setChangingStatus(true);
      await leadsApi.update(lead.id, { status: newStatus });
      sellerCache.detail.lead.invalidate(lead.id);
      sellerCache.leads.invalidate(user?.seller_id ?? 0);
      await Promise.all([loadLead(), loadActivities()]);
    } catch (error: any) {
      console.error('Errore nel cambio stato:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Errore nel cambio stato';
      alert(errorMessage);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleCreateQuote = async () => {
    if (!lead) return;
    
    try {
      const response = await leadsApi.prepareForQuote(lead.id);
      const quoteData = (response as any).quote_data || response;
      
      navigate('/seller/preventivi/nuovo', {
        state: {
          fromLead: true,
          leadId: lead.id,
          quoteData: quoteData,
        },
      });
    } catch (error: any) {
      console.error('Errore nella preparazione preventivo:', error);
      alert('Errore nella preparazione del preventivo: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  const handleDownloadPDF = async () => {
    if (!lead) return;
    
    try {
      setSaving(true);
      const response = await leadsApi.generatePDF(lead.id);
      
      // Verifica se la risposta è un errore JSON
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
      
      // Verifica che sia un PDF valido
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
      
      // Forza il download del PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scheda_contatto_${lead.company_name.replace(/[^a-z0-9]/gi, '_')}_${lead.id}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Errore nella generazione del PDF';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'status_change': return Edit;
      default: return MessageSquare;
    }
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      call: 'Chiamata',
      email: 'Email',
      meeting: 'Riunione',
      note: 'Nota',
      status_change: 'Cambio Stato',
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMs = now.getTime() - activityDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Oggi alle ' + activityDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Ieri alle ' + activityDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      return activityDate.toLocaleDateString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    } else {
      return activityDate.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  if (loading) {
    return (
      <div className="lead-detail-page lead-detail-skeleton">
        <div className="lead-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="lead-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="venditori-empty-state">
        <User size={64} className="venditori-empty-state-icon" />
        <h3>Contatto non trovato</h3>
        <button
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/seller/contatti')}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const primaryPhone = lead.statistics?.primary_phone || lead.phones?.[0]?.number;
  const primaryEmail = lead.statistics?.primary_email || lead.emails?.[0]?.email;
  const vatNumber = (lead as any).vat_number || (lead as any).p_iva;

  return (
    <div className={`contact-profile-page ${theme}`}>
      {/* Back Button */}
      <button className="contact-back-btn" onClick={() => navigate('/seller/contatti')}>
        <ArrowLeft size={18} />
        Torna ai Contatti
      </button>

      {/* Main Grid Layout */}
      <div className="contact-profile-grid">
        {/* Left Column: Profile Card */}
        <div className="contact-profile-card">
          {/* Header Section */}
          <div className="profile-header">
            <div className="profile-avatar" style={getAvatarStyle(lead.company_name)}>
              {getInitials(lead.company_name)}
            </div>
            <h1 className="profile-name">{lead.company_name}</h1>
            {lead.contact_person && (
              <p className="profile-contact-person">
                <User size={14} />
                {lead.contact_person}
              </p>
            )}
            {lead.tipologia && (
              <span className="profile-tag">{lead.tipologia}</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="profile-actions">
            {primaryPhone && (
              <a href={`tel:${primaryPhone}`} className="action-btn-circle">
                <Phone size={20} />
                <span>Chiama</span>
              </a>
            )}
            {primaryEmail && (
              <>
                <a href={`mailto:${primaryEmail}`} className="action-btn-circle">
                  <Mail size={20} />
                  <span>Email</span>
                </a>
                <button 
                  className="action-btn-circle" 
                  onClick={() => navigate(`/seller/contatti/${lead.id}/email?to=${encodeURIComponent(primaryEmail)}`)}
                  title="Nuova Email"
                >
                  <Mail size={20} />
                  <span>Nuova Mail</span>
                </button>
                <button 
                  className="action-btn-circle" 
                  onClick={() => navigate(`/seller/contatti/${lead.id}/email/storico`)}
                  title="Vedi Storico Email"
                >
                  <FileText size={20} />
                  <span>Storico Email</span>
                </button>
              </>
            )}
            {lead.status !== 'won' && lead.status !== 'lost' && (
              <button className="action-btn-circle" onClick={handleCreateQuote}>
                <FileText size={20} />
                <span>Preventivo</span>
              </button>
            )}
            <button className="action-btn-circle" onClick={handleDownloadPDF} disabled={saving}>
              <Download size={20} />
              <span>{saving ? 'Generazione...' : 'Scheda PDF'}</span>
            </button>
          </div>

          {/* Inset Grouped Data List */}
          <div className="profile-data-list">
            {primaryPhone && (
              <div className="data-list-item">
                <Phone size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <a href={`tel:${primaryPhone}`} className="data-list-value">
                    {primaryPhone}
                  </a>
                  {lead.phones && lead.phones.length > 1 && (
                    <span className="data-list-count">+{lead.phones.length - 1}</span>
                  )}
                </div>
              </div>
            )}
            {primaryEmail && (
              <div className="data-list-item">
                <Mail size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <a href={`mailto:${primaryEmail}`} className="data-list-value">
                    {primaryEmail}
                  </a>
                  {lead.emails && lead.emails.length > 1 && (
                    <span className="data-list-count">+{lead.emails.length - 1}</span>
                  )}
                </div>
              </div>
            )}
            {lead.address && (
              <div className="data-list-item">
                <MapPin size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <span className="data-list-value">{lead.address}</span>
                </div>
              </div>
            )}
            {vatNumber && (
              <div className="data-list-item">
                <Building2 size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <span className="data-list-value">P.IVA: {vatNumber}</span>
                </div>
              </div>
            )}
            {lead.websites && lead.websites.length > 0 && (
              <div className="data-list-item">
                <Globe size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <a 
                    href={lead.websites[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="data-list-value"
                  >
                    {lead.websites[0]}
                  </a>
                </div>
              </div>
            )}
            {lead.region && (
              <div className="data-list-item">
                <MapPin size={18} className="data-list-icon" />
                <div className="data-list-content">
                  <span className="data-list-value">{lead.region}</span>
                </div>
              </div>
            )}
            <div className="data-list-item">
              <div className="data-list-content">
                <span className="data-list-label">Stato</span>
                <span className={`status-badge status-${lead.status}`}>
                  {lead.status}
                </span>
              </div>
            </div>
            <div className="data-list-item">
              <div className="data-list-content">
                <span className="data-list-label">Priorità</span>
                <span className={`priority-badge priority-${lead.priority}`}>
                  {lead.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Digital Status & Pitch Strategy Section */}
          {(lead.digital_status || lead.pitch_strategy) && (
            <div className="profile-info-section">
              <h3 className="profile-section-title">Informazioni Strategiche</h3>
              <div className="profile-info-content">
                {lead.digital_status && (
                  <div className="info-section-item">
                    <div className="info-section-header">
                      <Monitor size={18} className="info-section-icon" />
                      <span className="info-section-label">Stato Digitale Attuale</span>
                    </div>
                    <p className="info-section-value">{lead.digital_status}</p>
                  </div>
                )}
                {lead.pitch_strategy && (
                  <div className="info-section-item">
                    <div className="info-section-header">
                      <Target size={18} className="info-section-icon" />
                      <span className="info-section-label">Strategia di Pitch & Opportunità</span>
                    </div>
                    <p className="info-section-value">{lead.pitch_strategy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline & Activity */}
        <div className="contact-timeline-column">
          {/* Status Change Box and Activity Input */}
          <div className="timeline-inputs-row">
            {/* Status Change Box */}
            <div className="status-change-box">
              <label className="status-change-label">
                <Edit size={18} />
                Stato Contatto
              </label>
              <select
                className="status-change-select"
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as Lead['status'])}
                disabled={changingStatus}
              >
                <option value="new">Nuovo</option>
                <option value="contacted">Contattato</option>
                <option value="qualified">Qualificato</option>
                <option value="proposal">Proposta</option>
                <option value="negotiation">Negoziazione</option>
                <option value="won">Vinto</option>
                <option value="lost">Perso</option>
              </select>
              {changingStatus && (
                <div className="status-change-loading">
                  <div className="loading-spinner-small"></div>
                </div>
              )}
            </div>

            {/* New Activity Input */}
            <div className="timeline-activity-input">
            <textarea
              className="activity-textarea"
              value={newActivity.description}
              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
              placeholder="Scrivi una nota o registra una chiamata..."
              rows={3}
            />
            <div className="activity-input-actions">
              <select
                className="activity-type-select"
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
              >
                <option value="note">Nota</option>
                <option value="call">Chiamata</option>
                <option value="email">Email</option>
                <option value="meeting">Riunione</option>
              </select>
              <button
                className="activity-save-btn"
                onClick={handleSaveActivity}
                disabled={saving || !newActivity.description.trim()}
              >
                {saving ? 'Salvataggio...' : newActivity.type === 'note' ? 'Salva Nota' : 'Salva Attività'}
              </button>
            </div>
          </div>
          </div>

          {/* Timeline */}
          <div className="timeline-container">
            {activities.length === 0 ? (
              <div className="timeline-empty">
                <MessageSquare size={48} />
                <p>Nessuna attività registrata</p>
              </div>
            ) : (
              <div className="timeline">
                {activities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.activity_type);
                  const isLast = index === activities.length - 1;
                  return (
                    <div 
                      key={activity.id} 
                      className={`timeline-item ${activity.activity_type === 'email' && activity.email_details ? 'timeline-item-clickable' : ''}`}
                      onClick={() => {
                        if (activity.activity_type === 'email' && activity.email_details) {
                          navigate(`/seller/contatti/${id}/email/${activity.id}`);
                        }
                      }}
                      style={activity.activity_type === 'email' && activity.email_details ? { cursor: 'pointer' } : {}}
                    >
                      <div className="timeline-line-container">
                        <div className="timeline-dot">
                          <Icon size={16} />
                        </div>
                        {!isLast && <div className="timeline-line" />}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-type">{getActivityLabel(activity.activity_type)}</span>
                          <span className="timeline-date">{formatDate(activity.created_at)}</span>
                        </div>
                        <p className="timeline-description">{activity.description}</p>
                        {activity.outcome && (
                          <div className="timeline-outcome">
                            <strong>Esito:</strong> {activity.outcome}
                          </div>
                        )}
                        {activity.user && (
                          <div className="timeline-user">
                            <User size={12} />
                            {activity.user.name}
                          </div>
                        )}
                        {activity.activity_type === 'email' && activity.email_details && (
                          <div className="timeline-email-hint" style={{ marginTop: '8px', fontSize: '12px', color: '#0A84FF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} />
                            Clicca per vedere i dettagli dell'email
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLeadDetailPage;
