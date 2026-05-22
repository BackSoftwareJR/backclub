import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  User, 
  Plus,
  MessageSquare,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  Paperclip
} from 'lucide-react';
import leadsApi from '../../api/leads';
import type { Lead, LeadActivity } from '../../types/sellers';
import './LeadDetailPage.css';

const LeadDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [newActivity, setNewActivity] = useState({ type: 'note' as 'note' | 'call' | 'email' | 'meeting', description: '', outcome: '' });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedEmailActivity, setSelectedEmailActivity] = useState<LeadActivity | null>(null);
  const [showEmailDetailsModal, setShowEmailDetailsModal] = useState(false);

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
      setNotes(leadData.notes || '');
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

  const handleSaveNotes = async () => {
    if (!lead) return;
    
    try {
      setSaving(true);
      await leadsApi.update(lead.id, { notes });
      setEditingNotes(false);
      await loadLead();
    } catch (error) {
      console.error('Errore nel salvataggio note:', error);
      alert('Errore nel salvataggio delle note');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.description.trim()) {
      alert('Inserisci una descrizione per l\'attività');
      return;
    }

    try {
      setSaving(true);
      await leadsApi.addActivity(lead!.id, {
        activity_type: newActivity.type,
        description: newActivity.description,
        outcome: newActivity.outcome || undefined,
      });
      
      setNewActivity({ type: 'note', description: '', outcome: '' });
      setShowActivityForm(false);
      await loadActivities();
      await loadLead();
    } catch (error) {
      console.error('Errore nell\'aggiunta attività:', error);
      alert('Errore nell\'aggiunta dell\'attività');
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
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
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
          onClick={() => navigate(-1)}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const primaryPhone = lead.statistics?.primary_phone || lead.phones?.[0]?.number;
  const primaryEmail = lead.statistics?.primary_email || lead.emails?.[0]?.email;

  return (
    <div className="lead-detail-page">
      <div className="detail-header-section">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Torna ai Contatti
        </button>

        <div className="lead-header-main">
          <div className="lead-header-left">
            <div className="lead-avatar-large">
              {lead.company_name.charAt(0).toUpperCase()}
            </div>
            <div className="lead-header-details">
              <h1>{lead.company_name}</h1>
              {lead.contact_person && (
                <p className="lead-contact-person-name">
                  <User size={16} />
                  {lead.contact_person}
                </p>
              )}
            </div>
          </div>

          <div className="lead-header-actions">
            {primaryPhone && (
              <a href={`tel:${primaryPhone}`} className="action-btn phone-btn">
                <Phone size={18} />
                Chiama
              </a>
            )}
            {primaryEmail && (
              <a href={`mailto:${primaryEmail}`} className="action-btn email-btn">
                <Mail size={18} />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="lead-content-grid">
        {/* Colonna Sinistra - Informazioni */}
        <div className="lead-info-column">
          {/* Informazioni Principali */}
          <div className="info-card">
            <h3 className="card-title">Informazioni Principali</h3>
            <div className="info-list">
              {lead.tipologia && (
                <div className="info-item">
                  <span className="info-label">Tipologia</span>
                  <span className="info-value">{lead.tipologia}</span>
                </div>
              )}
              {lead.region && (
                <div className="info-item">
                  <span className="info-label">Regione</span>
                  <span className="info-value">{lead.region}</span>
                </div>
              )}
              {lead.seller && (
                <div className="info-item">
                  <span className="info-label">Venditore</span>
                  <span className="info-value">{lead.seller.user?.name || '-'}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Stato</span>
                <span className={`status-badge status-${lead.status}`}>
                  {lead.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Priorità</span>
                <span className={`priority-badge priority-${lead.priority}`}>
                  {lead.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="info-card">
            <h3 className="card-title">Contatti</h3>
            <div className="info-list">
              {primaryPhone && (
                <div className="info-item">
                  <Phone size={16} />
                  <a href={`tel:${primaryPhone}`} className="info-link">
                    {primaryPhone}
                  </a>
                  {lead.phones && lead.phones.length > 1 && (
                    <span className="contact-count">+{lead.phones.length - 1}</span>
                  )}
                </div>
              )}
              {primaryEmail && (
                <div className="info-item">
                  <Mail size={16} />
                  <a href={`mailto:${primaryEmail}`} className="info-link">
                    {primaryEmail}
                  </a>
                  {lead.emails && lead.emails.length > 1 && (
                    <span className="contact-count">+{lead.emails.length - 1}</span>
                  )}
                </div>
              )}
              {lead.websites && lead.websites.length > 0 && (
                <div className="info-item">
                  <Globe size={16} />
                  <a 
                    href={lead.websites[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    {lead.websites[0]}
                  </a>
                </div>
              )}
              {lead.address && (
                <div className="info-item">
                  <MapPin size={16} />
                  <span className="info-value">{lead.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="info-card notes-card">
            <div className="card-header-with-action">
              <h3 className="card-title">Note</h3>
              {!editingNotes && (
                <button
                  className="btn-icon-small"
                  onClick={() => setEditingNotes(true)}
                  title="Modifica note"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="notes-editor">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aggiungi note sul contatto..."
                  rows={6}
                />
                <div className="notes-actions">
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setEditingNotes(false);
                      setNotes(lead.notes || '');
                    }}
                    disabled={saving}
                  >
                    <X size={16} />
                    Annulla
                  </button>
                  <button
                    className="btn-primary btn-small"
                    onClick={handleSaveNotes}
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="notes-content">
                {lead.notes ? (
                  <p className="notes-text">{lead.notes}</p>
                ) : (
                  <p className="notes-empty">Nessuna nota</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Colonna Destra - Attività */}
        <div className="lead-activities-column">
          <div className="activities-card">
            <div className="card-header-with-action">
              <h3 className="card-title">Attività</h3>
              <button
                className="btn-primary btn-small"
                onClick={() => setShowActivityForm(!showActivityForm)}
              >
                <Plus size={16} />
                Nuova Attività
              </button>
            </div>

            {showActivityForm && (
              <div className="activity-form">
                <div className="form-group">
                  <label className="form-label">Tipo Attività</label>
                  <select
                    className="form-select"
                    value={newActivity.type}
                    onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
                  >
                    <option value="note">Nota</option>
                    <option value="call">Chiamata</option>
                    <option value="email">Email</option>
                    <option value="meeting">Riunione</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Descrizione</label>
                  <textarea
                    className="form-textarea"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Descrivi l'attività..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Esito (opzionale)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newActivity.outcome}
                    onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                    placeholder="Esito dell'attività..."
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setShowActivityForm(false);
                      setNewActivity({ type: 'note', description: '', outcome: '' });
                    }}
                    disabled={saving}
                  >
                    Annulla
                  </button>
                  <button
                    className="btn-primary btn-small"
                    onClick={handleAddActivity}
                    disabled={saving || !newActivity.description.trim()}
                  >
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </div>
            )}

            <div className="activities-timeline">
              {activities.length === 0 ? (
                <div className="empty-activities">
                  <MessageSquare size={48} />
                  <p>Nessuna attività registrata</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.activity_type);
                  return (
                    <div 
                      key={activity.id} 
                      className={`activity-item ${activity.activity_type === 'email' && activity.email_details ? 'activity-item-clickable' : ''}`}
                      onClick={() => {
                        if (activity.activity_type === 'email' && activity.email_details) {
                          setSelectedEmailActivity(activity);
                          setShowEmailDetailsModal(true);
                        }
                      }}
                      style={activity.activity_type === 'email' && activity.email_details ? { cursor: 'pointer' } : {}}
                    >
                      <div className="activity-icon">
                        <Icon size={18} />
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-type">{getActivityLabel(activity.activity_type)}</span>
                          <span className="activity-date">
                            <Clock size={12} />
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                        <p className="activity-description">{activity.description}</p>
                        {activity.outcome && (
                          <div className="activity-outcome">
                            <strong>Esito:</strong> {activity.outcome}
                          </div>
                        )}
                        {activity.user && (
                          <div className="activity-user">
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
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Details Modal */}
      {showEmailDetailsModal && selectedEmailActivity?.email_details && (
        <div className="modal-overlay" onClick={() => setShowEmailDetailsModal(false)}>
          <div className="email-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="email-details-header">
              <h2>Dettagli Email</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowEmailDetailsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="email-details-content">
              <div className="email-detail-row">
                <span className="email-detail-label">Da:</span>
                <span className="email-detail-value">
                  {selectedEmailActivity.email_details.from_name || selectedEmailActivity.email_details.from}
                  {selectedEmailActivity.email_details.from_name && (
                    <span className="email-detail-email"> ({selectedEmailActivity.email_details.from})</span>
                  )}
                </span>
              </div>
              <div className="email-detail-row">
                <span className="email-detail-label">A:</span>
                <span className="email-detail-value">
                  {selectedEmailActivity.email_details.to_name || selectedEmailActivity.email_details.to}
                  {selectedEmailActivity.email_details.to_name && (
                    <span className="email-detail-email"> ({selectedEmailActivity.email_details.to})</span>
                  )}
                </span>
              </div>
              <div className="email-detail-row">
                <span className="email-detail-label">Oggetto:</span>
                <span className="email-detail-value">{selectedEmailActivity.email_details.subject}</span>
              </div>
              <div className="email-detail-row">
                <span className="email-detail-label">Data invio:</span>
                <span className="email-detail-value">
                  {new Date(selectedEmailActivity.email_details.sent_at).toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {selectedEmailActivity.email_details.attachments && selectedEmailActivity.email_details.attachments.length > 0 && (
                <div className="email-detail-row">
                  <span className="email-detail-label">Allegati:</span>
                  <div className="email-attachments">
                    {selectedEmailActivity.email_details.attachments.map((attachment, idx) => (
                      <div key={idx} className="email-attachment-item">
                        <Paperclip size={14} />
                        <span>{attachment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="email-detail-row email-body-row">
                <span className="email-detail-label">Corpo email:</span>
                <div 
                  className="email-body-content"
                  dangerouslySetInnerHTML={{ __html: selectedEmailActivity.email_details.html_body || selectedEmailActivity.email_details.body }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailPage;

