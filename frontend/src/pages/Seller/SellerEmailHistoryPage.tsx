import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, ChevronRight, Paperclip } from 'lucide-react';
import leadsApi from '../../api/leads';
import type { LeadActivity } from '../../types/sellers';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerEmailHistoryPage.css';

const SellerEmailHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [emailActivities, setEmailActivities] = useState<LeadActivity[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [, activitiesData] = await Promise.all([
        leadsApi.getById(Number(id)),
        leadsApi.getActivities(Number(id))
      ]);
      
      // Filtra solo le attività email con dettagli
      const emails = activitiesData.filter(
        a => a.activity_type === 'email' && a.email_details
      );
      setEmailActivities(emails);
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - activityDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return activityDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Ieri';
    } else if (diffInDays < 7) {
      return activityDate.toLocaleDateString('it-IT', { weekday: 'short' });
    } else {
      return activityDate.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };


  const handleEmailClick = (activityId: number) => {
    navigate(`/seller/contatti/${id}/email/${activityId}`);
  };

  if (loading) {
    return (
      <div className="email-history-mobile-ios email-history-skeleton">
        <div className="email-history-mobile-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
        </div>
        <div className="email-history-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="email-history-mobile-ios">
      {/* Navigation Bar */}
      <div className="email-history-mobile-header">
        <button
          className="email-history-mobile-back"
          onClick={() => navigate(`/seller/contatti/${id}`)}
        >
          <ArrowLeft size={20} />
          <span>Contatto</span>
        </button>
        <h1 className="email-history-mobile-title">Storico Email</h1>
      </div>

      {/* Email List - Inset Grouped */}
      <div className="email-history-mobile-content">
        {emailActivities.length === 0 ? (
          <div className="email-history-mobile-empty">
            <Mail size={64} style={{ color: 'var(--ios-tertiary-label)', marginBottom: '16px' }} />
            <h3 className="ios-title-2" style={{ marginBottom: '8px' }}>Nessuna email inviata</h3>
            <p className="ios-body" style={{ color: 'var(--ios-secondary-label)' }}>
              Non ci sono email inviate a questo contatto tramite il sistema.
            </p>
          </div>
        ) : (
          <div className="ios-inset-grouped">
            <ul className="ios-inset-grouped-list">
              {emailActivities.map((activity, index) => {
                const emailDetails = activity.email_details!;
                const isLast = index === emailActivities.length - 1;
                const hasAttachments = emailDetails.attachments && emailDetails.attachments.length > 0;

                return (
                  <li
                    key={activity.id}
                    className={`ios-inset-grouped-cell email-history-mobile-item ${isLast ? '' : ''}`}
                    onClick={() => handleEmailClick(activity.id)}
                  >
                    <div className="email-history-mobile-cell-content">
                      {/* Riga Superiore: Oggetto + Data + Allegato */}
                      <div className="email-history-mobile-row-top">
                        <h3 className="email-history-mobile-subject">
                          {emailDetails.subject || '(Senza oggetto)'}
                        </h3>
                        <div className="email-history-mobile-meta">
                          {hasAttachments && (
                            <Paperclip size={14} style={{ color: 'var(--ios-secondary-label)', marginRight: '6px', flexShrink: 0 }} />
                          )}
                          <span className="email-history-mobile-date">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Riga Centrale: Destinatario */}
                      <div className="email-history-mobile-row-middle">
                        <span className="email-history-mobile-to">
                          A: {emailDetails.to_name || emailDetails.to}
                        </span>
                      </div>

                      {/* Riga Inferiore: Oggetto (ripetuto per chiarezza) */}
                      {emailDetails.subject && (
                        <div className="email-history-mobile-row-bottom">
                          <p className="email-history-mobile-preview">{emailDetails.subject}</p>
                        </div>
                      )}

                      {/* Chevron Right */}
                      <ChevronRight size={20} className="ios-chevron-right email-history-mobile-chevron" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerEmailHistoryPage;
