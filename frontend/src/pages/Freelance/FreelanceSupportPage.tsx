import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { SupportTicket } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceSupportoTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceSupportPage.css';

const FreelanceSupportPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'tool_request' as SupportTicket['type'],
    description: '',
    priority: 'medium' as SupportTicket['priority'],
  });

  // Mock data for now - will be replaced with API call when backend is ready
  useEffect(() => {
    // Simulate loading tickets
    setLoading(true);
    setTimeout(() => {
      // Mock tickets - remove when API is ready
      setTickets([
        {
          id: 1,
          type: 'tool_request',
          description: 'Richiesta accesso a Figma per il progetto X',
          priority: 'high',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          type: 'blocking_issue',
          description: 'Non riesco ad accedere ai file del progetto Y',
          priority: 'urgent',
          status: 'in_progress',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      alert('Inserisci una descrizione');
      return;
    }

    setSubmitting(true);
    
    try {
      // TODO: Replace with actual API call
      // await freelanceApi.createSupportTicket(formData);
      
      // Mock: Add ticket to list
      const newTicket: SupportTicket = {
        id: tickets.length + 1,
        ...formData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setTickets([newTicket, ...tickets]);
      setFormData({
        type: 'tool_request',
        description: '',
        priority: 'medium',
      });
      setShowForm(false);
      alert('Richiesta inviata con successo');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Errore nell\'invio della richiesta');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type: SupportTicket['type']) => {
    const typeMap: Record<SupportTicket['type'], string> = {
      tool_request: 'Richiesta Strumenti',
      blocking_issue: 'Problema Bloccante',
      vacation_request: 'Richiesta Ferie/Permessi',
    };
    return typeMap[type] || type;
  };

  const getPriorityLabel = (priority: SupportTicket['priority']) => {
    const priorityMap: Record<SupportTicket['priority'], string> = {
      low: 'Bassa',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return priorityMap[priority] || priority;
  };

  const getStatusLabel = (status: SupportTicket['status']) => {
    const statusMap: Record<SupportTicket['status'], string> = {
      pending: 'In attesa',
      in_progress: 'In elaborazione',
      resolved: 'Risolto',
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'in_progress':
        return <AlertCircle size={16} />;
      case 'resolved':
        return <CheckCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending':
        return '#FF9F0A';
      case 'in_progress':
        return '#0A84FF';
      case 'resolved':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent':
        return '#FF453A';
      case 'high':
        return '#FF9F0A';
      case 'medium':
        return '#0A84FF';
      case 'low':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="freelance-support">
      <GuideTour steps={freelanceSupportoTourSteps} tourId="freelance-supporto-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      <div className="freelance-support-header">
        <div>
          <h1 className="freelance-support-title">Supporto</h1>
          <p className="freelance-support-subtitle">
            Richiedi strumenti, segnala problemi o richiedi ferie
          </p>
        </div>
        <button
          className="freelance-support-new-btn"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} />
          Nuova Richiesta
        </button>
      </div>

      {showForm && (
        <div className="freelance-support-form-card">
          <h2 className="freelance-support-form-title">Nuova Richiesta</h2>
          <form onSubmit={handleSubmit} className="freelance-support-form">
            <div className="freelance-support-form-field">
              <label className="freelance-support-form-label">Tipo Richiesta</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SupportTicket['type'] })}
                className="freelance-support-form-select"
                required
              >
                <option value="tool_request">Richiesta Strumenti</option>
                <option value="blocking_issue">Problema Bloccante</option>
                <option value="vacation_request">Richiesta Ferie/Permessi</option>
              </select>
            </div>

            <div className="freelance-support-form-field">
              <label className="freelance-support-form-label">Priorità</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as SupportTicket['priority'] })}
                className="freelance-support-form-select"
                required
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div className="freelance-support-form-field">
              <label className="freelance-support-form-label">Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="freelance-support-form-textarea"
                placeholder="Descrivi la tua richiesta..."
                rows={5}
                required
              />
            </div>

            <div className="freelance-support-form-actions">
              <button
                type="button"
                className="freelance-support-form-cancel"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: 'tool_request',
                    description: '',
                    priority: 'medium',
                  });
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="freelance-support-form-submit"
                disabled={submitting}
              >
                {submitting ? 'Invio...' : 'Invia Richiesta'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="freelance-support-tickets">
        <h2 className="freelance-support-tickets-title">Le tue Richieste</h2>
        
        {loading ? (
          <div className="freelance-loading">
            <div className="freelance-spinner"></div>
          </div>
        ) : tickets.length > 0 ? (
          <div className="freelance-support-tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="freelance-support-ticket">
                <div className="freelance-support-ticket-header">
                  <div className="freelance-support-ticket-type">
                    {getTypeLabel(ticket.type)}
                  </div>
                  <div className="freelance-support-ticket-badges">
                    <span
                      className="freelance-support-ticket-priority"
                      style={{
                        backgroundColor: `${getPriorityColor(ticket.priority)}20`,
                        color: getPriorityColor(ticket.priority),
                      }}
                    >
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span
                      className="freelance-support-ticket-status"
                      style={{
                        backgroundColor: `${getStatusColor(ticket.status)}20`,
                        color: getStatusColor(ticket.status),
                      }}
                    >
                      {getStatusIcon(ticket.status)}
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                </div>
                <p className="freelance-support-ticket-description">{ticket.description}</p>
                <div className="freelance-support-ticket-footer">
                  <span className="freelance-support-ticket-date">
                    Creato: {formatDate(ticket.created_at)}
                  </span>
                  {ticket.resolved_at && (
                    <span className="freelance-support-ticket-resolved">
                      Risolto: {formatDate(ticket.resolved_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="freelance-empty-state">
            <HelpCircle size={48} />
            <p>Nessuna richiesta ancora</p>
            <p className="freelance-empty-state-subtitle">
              Clicca su "Nuova Richiesta" per iniziare
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreelanceSupportPage;
