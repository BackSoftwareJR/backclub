import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  MoreHorizontal,
  MessageSquare,
  User,
  Download,
  History,
} from 'lucide-react';
import leadsApi from '../../api/leads';
import type { Lead, LeadActivity } from '../../types/sellers';
import BottomSheet from '../../components/Mobile/BottomSheet';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerLeadDetailMobile.css';

const SellerLeadDetailMobile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  useEffect(() => {
    if (id) {
      loadLead();
      loadActivities();
    }
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const leadData = await leadsApi.getById(Number(id));
      setLead(leadData);
    } catch (error) {
      console.error('Errore nel caricamento lead:', error);
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

  const handleSaveNote = async () => {
    if (!newNote.trim() || !lead) return;

    try {
      setSaving(true);
      await leadsApi.addActivity(lead.id, {
        activity_type: 'note',
        description: newNote,
      });
      setNewNote('');
      await loadActivities();
      await loadLead();
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert('Errore nel salvataggio della nota');
    } finally {
      setSaving(false);
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
      alert('Errore nella preparazione del preventivo');
    }
  };

  const handleDownloadPDF = async () => {
    if (!lead) return;
    try {
      setSaving(true);
      const response = await leadsApi.generatePDF(lead.id);
      
      // Verifica se la risposta è un errore JSON
      const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
      
      if (contentType.includes('application/json')) {
        // Se è JSON, probabilmente è un errore
        let errorMessage = 'Errore nella generazione del PDF';
        try {
          // Se response.data è già un oggetto, usalo direttamente
          if (typeof response.data === 'object' && response.data !== null) {
            errorMessage = (response.data as any).error || (response.data as any).message || errorMessage;
          } else if (typeof response.data === 'string') {
            const json = JSON.parse(response.data);
            errorMessage = json.error || json.message || errorMessage;
          }
        } catch (e) {
          console.error('Errore nel parsing JSON:', e);
        }
        throw new Error(errorMessage);
      }
      
      // La risposta dovrebbe essere un blob
      let blob: Blob;
      
      if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        // Se non è un Blob, potrebbe essere un errore HTML o testo
        // Prova a verificare se è testo/HTML
        if (typeof response.data === 'string' || (response.data && response.data.toString)) {
          const text = typeof response.data === 'string' ? response.data : response.data.toString();
          // Se inizia con < o contiene error, probabilmente è HTML di errore
          if (text.trim().startsWith('<') || text.toLowerCase().includes('error')) {
            throw new Error('Errore nella generazione del PDF dal server');
          }
        }
        // Crea un blob dal dato
        blob = new Blob([response.data], { type: contentType || 'application/pdf' });
      }
      
      // Verifica che il blob non sia vuoto
      if (blob.size === 0) {
        throw new Error('Il PDF generato è vuoto');
      }
      
      // Crea il link di download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scheda-${lead.company_name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      console.error('Dettagli errore:', {
        message: error?.message,
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
      });
      
      let errorMessage = 'Errore nella generazione del PDF';
      
      // Gestisci diversi tipi di errore
      if (error?.response?.data) {
        // Se c'è una risposta dal server
        if (typeof error.response.data === 'string') {
          try {
            const json = JSON.parse(error.response.data);
            errorMessage = json.error || json.message || errorMessage;
          } catch (e) {
            // Se non è JSON, potrebbe essere HTML
            errorMessage = 'Errore dal server nella generazione del PDF';
          }
        } else if (typeof error.response.data === 'object') {
          errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Nuovo',
      contacted: 'Contattato',
      qualified: 'Qualificato',
      proposal: 'Proposta',
      negotiation: 'Negoziazione',
      won: 'Vinto',
      lost: 'Perso',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Bassa',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
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

  const getAvatarColor = (companyName: string) => {
    const colors = [
      '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F',
      '#FF9F0A', '#30D158', '#40C8E0', '#FF453A',
    ];
    const index = companyName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="lead-detail-mobile-loading lead-detail-mobile-skeleton">
        <div className="lead-detail-mobile-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="lead-detail-mobile-skeleton-content">
          <SkeletonLoader type="list" count={5} />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="lead-detail-mobile-empty">
        <User size={64} />
        <h3>Contatto non trovato</h3>
        <button onClick={() => navigate('/seller/contatti')}>
          Torna alla lista
        </button>
      </div>
    );
  }

  const getPrimaryPhone = (): string | null => {
    if (lead.statistics?.primary_phone) return lead.statistics.primary_phone;
    if (!lead.phones || lead.phones.length === 0) return null;
    const primary = lead.phones.find((p: any) => p.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.number;
    }
    const first = lead.phones[0];
    return typeof first === 'string' ? first : first.number;
  };

  const getPrimaryEmail = (): string | null => {
    if (lead.statistics?.primary_email) return lead.statistics.primary_email;
    if (!lead.emails || lead.emails.length === 0) return null;
    const primary = lead.emails.find((e: any) => e.isPrimary);
    if (primary) {
      return typeof primary === 'string' ? primary : primary.email;
    }
    const first = lead.emails[0];
    return typeof first === 'string' ? first : first.email;
  };

  const primaryPhone = getPrimaryPhone();
  const primaryEmail = getPrimaryEmail();
  const avatarColor = getAvatarColor(lead.company_name);
  const initials = getInitials(lead.company_name);

  return (
    <div className="lead-detail-mobile-ios">
      {/* Header with Back Button */}
      <div className="lead-detail-header">
        <button
          className="lead-detail-back-button"
          onClick={() => navigate('/seller/contatti')}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Identity Header - Centered */}
      <div className="lead-detail-identity">
        <div
          className="lead-detail-avatar-large"
          style={{
            background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColor}CC 100%)`,
          }}
        >
          {initials}
        </div>
        <h1 className="lead-detail-name">{lead.contact_person || lead.company_name}</h1>
        {lead.contact_person && (
          <p className="lead-detail-company">{lead.company_name}</p>
        )}
        <div className="lead-detail-badges">
          <span className="lead-detail-status-badge">{getStatusLabel(lead.status)}</span>
          <span className="lead-detail-priority-badge">{getPriorityLabel(lead.priority)}</span>
        </div>
      </div>

      {/* Action Bar - Horizontal Row */}
      <div className="lead-detail-action-bar">
        {primaryPhone && (
          <a href={`tel:${primaryPhone}`} className="lead-detail-action-button">
            <div className="lead-detail-action-icon">
              <Phone size={20} />
            </div>
            <span className="lead-detail-action-label">Chiama</span>
          </a>
        )}
        {primaryEmail && (
          <button
            className="lead-detail-action-button"
            onClick={() => {
              setShowEmailComposer(true);
            }}
          >
            <div className="lead-detail-action-icon">
              <Mail size={20} />
            </div>
            <span className="lead-detail-action-label">Nuova Mail</span>
          </button>
        )}
        {lead.status !== 'won' && lead.status !== 'lost' && (
          <button
            className="lead-detail-action-button"
            onClick={handleCreateQuote}
          >
            <div className="lead-detail-action-icon">
              <FileText size={20} />
            </div>
            <span className="lead-detail-action-label">Preventivo</span>
          </button>
        )}
        <button
          className="lead-detail-action-button"
          onClick={() => setShowMoreSheet(true)}
        >
          <div className="lead-detail-action-icon">
            <MoreHorizontal size={20} />
          </div>
          <span className="lead-detail-action-label">Altro</span>
        </button>
      </div>

      {/* Data Section - Inset Grouped List */}
      <div className="lead-detail-section">
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            {primaryPhone && (
              <li className="ios-inset-grouped-cell">
                <div className="lead-detail-data-row">
                  <div className="lead-detail-data-label">mobile</div>
                  <a href={`tel:${primaryPhone}`} className="lead-detail-data-value">
                    {primaryPhone}
                  </a>
                </div>
              </li>
            )}
            {primaryEmail && (
              <li className="ios-inset-grouped-cell">
                <div className="lead-detail-data-row">
                  <div className="lead-detail-data-label">email</div>
                  <a href={`mailto:${primaryEmail}`} className="lead-detail-data-value">
                    {primaryEmail}
                  </a>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Documents & History Section */}
      <div className="lead-detail-section">
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            {primaryEmail && (
              <li
                className="ios-inset-grouped-cell"
                onClick={() => navigate(`/seller/contatti/${lead.id}/email/storico`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <History size={18} style={{ color: '#0A84FF', marginRight: '12px' }} />
                  <span className="ios-body">Storico Email</span>
                  <span className="ios-chevron-right" style={{ marginLeft: 'auto' }}>
                    <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                  </span>
                </div>
              </li>
            )}
            <li
              className="ios-inset-grouped-cell"
              onClick={handleDownloadPDF}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Download size={18} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">Scheda PDF</span>
                <span className="ios-chevron-right" style={{ marginLeft: 'auto' }}>
                  <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Notes Section */}
      <div className="lead-detail-section">
        <div className="lead-detail-notes-header">NOTE</div>
        <div className="lead-detail-notes-input-container">
          <textarea
            className="lead-detail-notes-input"
            placeholder="Aggiungi una nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <button
            className="lead-detail-notes-send"
            onClick={handleSaveNote}
            disabled={!newNote.trim() || saving}
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      {activities.length > 0 && (
        <div className="lead-detail-section">
          <div className="lead-detail-notes-header">TIMELINE</div>
          <div className="lead-detail-timeline">
            {activities.map((activity) => (
              <div key={activity.id} className="lead-detail-timeline-item">
                <div className="lead-detail-timeline-header">
                  <span className="lead-detail-timeline-author">
                    {activity.user?.name || 'Sistema'}
                  </span>
                  <span className="lead-detail-timeline-date">
                    {formatDate(activity.created_at)}
                  </span>
                </div>
                <p className="lead-detail-timeline-text">{activity.description}</p>
                {activity.outcome && (
                  <p className="lead-detail-timeline-outcome">Esito: {activity.outcome}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* More Actions Bottom Sheet */}
      <BottomSheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        title="Altro"
        snapPoints={[40]}
      >
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            {primaryEmail && (
              <li
                className="ios-inset-grouped-cell"
                onClick={() => {
                  setShowMoreSheet(false);
                  navigate(`/seller/contatti/${lead.id}/email/storico`);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <History size={18} style={{ color: '#0A84FF', marginRight: '12px' }} />
                  <span className="ios-body">Storico Email</span>
                  <span className="ios-chevron-right" style={{ marginLeft: 'auto' }}>
                    <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                  </span>
                </div>
              </li>
            )}
            <li
              className="ios-inset-grouped-cell"
              onClick={() => {
                setShowMoreSheet(false);
                handleDownloadPDF();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Download size={18} style={{ color: '#0A84FF', marginRight: '12px' }} />
                <span className="ios-body">Scheda PDF</span>
                <span className="ios-chevron-right" style={{ marginLeft: 'auto' }}>
                  <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                </span>
              </div>
            </li>
          </ul>
        </div>
      </BottomSheet>

      {/* Email Composer Bottom Sheet */}
      {primaryEmail && (
        <BottomSheet
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          title="Nuova Email"
          snapPoints={[60]}
        >
          <div style={{ padding: '16px' }}>
            <button
              className="ios-button-primary"
              style={{ width: '100%' }}
              onClick={() => {
                navigate(`/seller/contatti/${lead.id}/email?to=${encodeURIComponent(primaryEmail)}`);
                setShowEmailComposer(false);
              }}
            >
              Componi Email
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

export default SellerLeadDetailMobile;
