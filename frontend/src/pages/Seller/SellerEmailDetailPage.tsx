import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Paperclip, ArrowUpLeft, Forward } from 'lucide-react';
import leadsApi from '../../api/leads';
import apiClient from '../../api/client';
import type { LeadActivity } from '../../types/sellers';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerEmailDetailPage.css';

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SellerEmailDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id, activityId } = useParams<{ id: string; activityId: string }>();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<LeadActivity | null>(null);

  useEffect(() => {
    if (id && activityId) loadData();
  }, [id, activityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [, activitiesData] = await Promise.all([
        leadsApi.getById(Number(id)),
        leadsApi.getActivities(Number(id)),
      ]);
      const emailActivity = activitiesData.find(
        (a: LeadActivity) => a.id === Number(activityId) && a.activity_type === 'email'
      );
      if (!emailActivity) {
        alert('Email non trovata');
        navigate(`/seller/contatti/${id}`);
        return;
      }
      console.log('Email Activity:', emailActivity);
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
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadAttachment = async (attachment: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!id || !activityId) return;
    try {
      try {
        const response = await apiClient.get(
          `/leads/${id}/activities/${activityId}/attachments/${encodeURIComponent(attachment)}`,
          { responseType: 'blob' }
        );
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
        console.log('Tentativo API fallito:', apiError);
      }
      if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
        window.open(attachment, '_blank');
      } else if (attachment.startsWith('/')) {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
        window.open(`${baseUrl.replace('/api', '')}${attachment}`, '_blank');
      } else {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
        window.open(`${baseUrl.replace('/api', '')}/storage/${attachment}`, '_blank');
      }
    } catch (error: any) {
      console.error('Errore nel download allegato:', error);
      alert('Errore nel download dell\'allegato');
    }
  };

  if (loading) {
    return (
      <div className="email-detail-page">
        <div className="email-detail-header">
          <div style={{ height: 24, width: '20%', borderRadius: 6, background: 'var(--seller-bg-overlay)' }} />
        </div>
        <div style={{ padding: 16 }}>
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!activity || !activity.email_details) {
    return (
      <div className="email-detail-error">
        <p>Email non trovata</p>
        <button onClick={() => navigate(`/seller/contatti/${id}`)}>
          Torna al contatto
        </button>
      </div>
    );
  }

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
      <div className="email-detail-error">
        <p>Dettagli email non disponibili</p>
        <button onClick={() => navigate(`/seller/contatti/${id}`)}>
          Torna al contatto
        </button>
      </div>
    );
  }

  const hasAttachments = emailDetails?.attachments && emailDetails.attachments.length > 0;
  const senderName = activity.user?.name || 'Venditore';

  return (
    <div className="email-detail-page">
      {/* Header */}
      <div className="email-detail-header">
        <button
          className="email-detail-back"
          onClick={() => navigate(`/seller/contatti/${id}/email/storico`)}
        >
          <ArrowLeft size={18} />
          <span>Storico</span>
        </button>
        <h1 className="email-detail-header-title">Dettaglio</h1>
        <div style={{ width: 80 }} />
      </div>

      {/* Metadata */}
      <motion.div
        className="email-detail-meta"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Sender row */}
        <div className="email-detail-sender-row">
          <div className="email-detail-avatar">
            {getInitials(senderName)}
          </div>
          <div className="email-detail-sender-info">
            <div className="email-detail-sender-name">{senderName}</div>
            <div className="email-detail-sender-email">
              noreply@backclub.it → {emailDetails?.to_name || emailDetails?.to || 'N/A'}
            </div>
          </div>
          <div className="email-detail-actions">
            <button
              className="email-detail-action-btn"
              title="Rispondi"
              onClick={() => {
                if (emailDetails?.to) {
                  navigate(`/seller/contatti/${id}/email?to=${encodeURIComponent(emailDetails.to)}`);
                }
              }}
            >
              <ArrowUpLeft size={17} />
            </button>
            {emailDetails?.to && (
              <a
                href={`mailto:${emailDetails.to}`}
                className="email-detail-action-btn"
                title="Email"
              >
                <Mail size={17} />
              </a>
            )}
          </div>
        </div>

        {/* Subject */}
        <h2 className="email-detail-subject">
          {emailDetails?.subject || '(Senza oggetto)'}
        </h2>

        {/* Date */}
        <p className="email-detail-date">
          {emailDetails?.sent_at ? formatDate(emailDetails.sent_at) : 'Data non disponibile'}
        </p>

        <div className="email-detail-divider" />
      </motion.div>

      {/* Attachments */}
      {hasAttachments && emailDetails.attachments && (
        <div className="email-detail-attachments">
          <p className="email-detail-attachments-label">Allegati</p>
          <div className="email-detail-attachments-list">
            {emailDetails.attachments.map((attachment, idx) => (
              <button
                key={idx}
                className="email-detail-attachment-item"
                onClick={(e) => handleDownloadAttachment(attachment, e)}
              >
                <Paperclip size={14} />
                <span>{attachment.split('/').pop() || attachment}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="email-detail-body-wrap">
        <div
          className="email-detail-body"
          dangerouslySetInnerHTML={{
            __html: emailDetails?.html_body || emailDetails?.body || 'Contenuto non disponibile',
          }}
        />
      </div>

      {/* Footer */}
      <div className="email-detail-footer">
        <button
          className="email-detail-footer-btn email-detail-footer-reply"
          onClick={() => {
            if (emailDetails?.to) {
              navigate(`/seller/contatti/${id}/email?to=${encodeURIComponent(emailDetails!.to!)}`);
            }
          }}
        >
          <ArrowUpLeft size={18} />
          <span>Rispondi</span>
        </button>
        {emailDetails?.to && (
          <a
            href={`mailto:${emailDetails.to}`}
            className="email-detail-footer-btn email-detail-footer-mail"
          >
            <Forward size={18} />
            <span>Inoltra</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default SellerEmailDetailPage;
