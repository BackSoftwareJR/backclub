import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Paperclip, ArrowUpLeft } from 'lucide-react';
import leadsApi from '../../api/leads';
import apiClient from '../../api/client';
import type { LeadActivity } from '../../types/sellers';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerEmailDetailPage.css';

const SellerEmailDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id, activityId } = useParams<{ id: string; activityId: string }>();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<LeadActivity | null>(null);

  useEffect(() => {
    if (id && activityId) {
      loadData();
    }
  }, [id, activityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [, activitiesData] = await Promise.all([
        leadsApi.getById(Number(id)),
        leadsApi.getActivities(Number(id))
      ]);
      
      const emailActivity = activitiesData.find(a => a.id === Number(activityId) && a.activity_type === 'email');
      
      if (!emailActivity) {
        alert('Email non trovata');
        navigate(`/seller/contatti/${id}`);
        return;
      }
      
      // Debug: verifica struttura dati
      console.log('Email Activity:', emailActivity);
      console.log('email_details:', emailActivity.email_details);
      console.log('Type of email_details:', typeof emailActivity.email_details);
      
      if (!emailActivity.email_details) {
        console.error('email_details è null o undefined');
        alert('Dettagli email non disponibili per questa email');
        navigate(`/seller/contatti/${id}`);
        return;
      }
      
      setActivity(emailActivity);
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      alert('Errore nel caricamento dei dati');
      navigate(`/seller/contatti/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const emailDate = new Date(date);
    return emailDate.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadAttachment = async (attachment: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!id || !activityId) return;
    
    try {
      // Prova prima con l'endpoint API
      try {
        const response = await apiClient.get(
          `/leads/${id}/activities/${activityId}/attachments/${encodeURIComponent(attachment)}`,
          {
            responseType: 'blob',
          }
        );
        
        // Crea un blob e scarica il file
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.split('/').pop() || attachment;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      } catch (apiError) {
        console.log('Tentativo API fallito, provo con URL diretto:', apiError);
      }
      
      // Fallback: se l'allegato è un path completo o URL, scarica direttamente
      if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
        // URL assoluto
        window.open(attachment, '_blank');
      } else if (attachment.startsWith('/')) {
        // Path relativo al server
        const baseUrl = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
        const fullUrl = `${baseUrl.replace('/api', '')}${attachment}`;
        window.open(fullUrl, '_blank');
      } else {
        // Path relativo, prova a costruire l'URL
        const baseUrl = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
        const fullUrl = `${baseUrl.replace('/api', '')}/storage/${attachment}`;
        window.open(fullUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Errore nel download allegato:', error);
      alert('Errore nel download dell\'allegato');
    }
  };

  if (loading) {
    return (
      <div className="email-detail-mobile-ios email-detail-skeleton">
        <div className="email-detail-mobile-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
        </div>
        <div className="email-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!activity || !activity.email_details) {
    return (
      <div className="email-detail-mobile-error">
        <p className="ios-title-2">Email non trovata</p>
        <button
          className="ios-button-primary"
          onClick={() => navigate(`/seller/contatti/${id}`)}
        >
          Torna al contatto
        </button>
      </div>
    );
  }

  // Gestisci il caso in cui email_details sia una stringa JSON invece di un oggetto
  let emailDetails: LeadActivity['email_details'] = activity.email_details;
  
  if (typeof emailDetails === 'string') {
    try {
      emailDetails = JSON.parse(emailDetails) as LeadActivity['email_details'];
    } catch (e) {
      console.error('Errore nel parsing JSON di email_details:', e);
      emailDetails = undefined;
    }
  }
  
  if (!emailDetails || typeof emailDetails !== 'object') {
    return (
      <div className="email-detail-mobile-error">
        <p className="ios-title-2">Dettagli email non disponibili</p>
        <button
          className="ios-button-primary"
          onClick={() => navigate(`/seller/contatti/${id}`)}
        >
          Torna al contatto
        </button>
      </div>
    );
  }

  const hasAttachments = emailDetails?.attachments && emailDetails.attachments.length > 0;

  return (
    <div className="email-detail-mobile-ios">
      {/* Header Bar */}
      <div className="email-detail-mobile-header">
        <button
          className="email-detail-mobile-back"
          onClick={() => navigate(`/seller/contatti/${id}/email/storico`)}
        >
          <ArrowLeft size={20} />
          <span>Indietro</span>
        </button>
        <h1 className="email-detail-mobile-title">Dettaglio</h1>
      </div>

      {/* Metadata Section - No Card, Direct on Background */}
      <div className="email-detail-mobile-metadata">
        {/* Oggetto */}
        <h2 className="email-detail-mobile-subject">
          {emailDetails?.subject || '(Senza oggetto)'}
        </h2>

        {/* Da: - Sempre noreply@backclub.it e nome venditore */}
        <div className="email-detail-mobile-from">
          <span className="email-detail-mobile-label">Da:</span>
          <span className="email-detail-mobile-sender-name">
            {activity.user?.name || 'Venditore'}
          </span>
          <span className="email-detail-mobile-sender-email">
            {' '}&lt;noreply@backclub.it&gt;
          </span>
        </div>

        {/* A: */}
        <div className="email-detail-mobile-to">
          <span className="email-detail-mobile-label">A:</span>
          <span className="email-detail-mobile-recipient-name">
            {emailDetails?.to_name || emailDetails?.to || 'N/A'}
          </span>
          {emailDetails?.to_name && emailDetails?.to && (
            <span className="email-detail-mobile-recipient-email">
              {' '}&lt;{emailDetails.to}&gt;
            </span>
          )}
        </div>

        {/* Data */}
        <div className="email-detail-mobile-date">
          {emailDetails?.sent_at ? formatDate(emailDetails.sent_at) : 'Data non disponibile'}
        </div>

        {/* Divider */}
        <div className="email-detail-mobile-divider" />
      </div>

      {/* Attachments Section - Compact List */}
      {hasAttachments && emailDetails.attachments && (
        <div className="email-detail-mobile-section">
          <div className="ios-inset-grouped">
            <ul className="ios-inset-grouped-list">
              {emailDetails.attachments.map((attachment, idx) => (
                <li
                  key={idx}
                  className="ios-inset-grouped-cell email-detail-mobile-attachment-item"
                  onClick={(e) => handleDownloadAttachment(attachment, e)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                    <Paperclip size={16} style={{ color: 'var(--ios-secondary-label)', flexShrink: 0 }} />
                    <span className="ios-body" style={{ flex: 1, wordBreak: 'break-all' }}>
                      {attachment}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Email Body - Paper Container */}
      <div className="email-detail-mobile-section">
        <div className="email-detail-mobile-body-container">
          <div
            className="email-detail-mobile-body-content"
            dangerouslySetInnerHTML={{
              __html: emailDetails?.html_body || emailDetails?.body || 'Contenuto non disponibile',
            }}
          />
        </div>
      </div>

      {/* Footer Actions - Sticky Bottom Toolbar */}
      <div className="email-detail-mobile-footer">
        <button
          className="email-detail-mobile-footer-btn"
          onClick={() => {
            if (emailDetails?.to) {
              navigate(`/seller/contatti/${id}/email?to=${encodeURIComponent(emailDetails.to)}`);
            }
          }}
        >
          <ArrowUpLeft size={20} />
          <span>Rispondi</span>
        </button>
        {emailDetails?.to && (
          <a
            href={`mailto:${emailDetails.to}`}
            className="email-detail-mobile-footer-btn"
          >
            <Mail size={20} />
            <span>Email</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default SellerEmailDetailPage;
