import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, ChevronRight, Paperclip, PenSquare } from 'lucide-react';
import leadsApi from '../../api/leads';
import type { LeadActivity } from '../../types/sellers';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerEmailHistoryPage.css';

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.28 },
  }),
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SellerEmailHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [emailActivities, setEmailActivities] = useState<LeadActivity[]>([]);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [, activitiesData] = await Promise.all([
        leadsApi.getById(Number(id)),
        leadsApi.getActivities(Number(id)),
      ]);
      setEmailActivities(
        activitiesData.filter((a: LeadActivity) => a.activity_type === 'email' && a.email_details)
      );
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return d.toLocaleDateString('it-IT', { weekday: 'short' });
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  const handleEmailClick = (activityId: number) => {
    navigate(`/seller/contatti/${id}/email/${activityId}`);
  };

  if (loading) {
    return (
      <div className="email-history-page">
        <div className="email-history-header">
          <div style={{ height: 24, width: '20%', borderRadius: 6, background: 'var(--seller-bg-overlay)' }} />
        </div>
        <div style={{ padding: 16 }}>
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="email-history-page">
      {/* Navigation bar */}
      <div className="email-history-header">
        <button
          className="email-history-back"
          onClick={() => navigate(`/seller/contatti/${id}`)}
        >
          <ArrowLeft size={18} />
          <span>Contatto</span>
        </button>
        <h1 className="email-history-title">Email</h1>
        <button
          className="email-history-compose-btn"
          onClick={() => navigate(`/seller/contatti/${id}/email`)}
          aria-label="Nuova email"
        >
          <PenSquare size={18} />
        </button>
      </div>

      {/* Email list */}
      <div className="email-history-content">
        <AnimatePresence>
          {emailActivities.length === 0 ? (
            <motion.div
              className="email-history-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Mail size={56} className="email-history-empty-icon" />
              <h3>Nessuna email inviata</h3>
              <p>Non ci sono email inviate a questo contatto tramite il sistema.</p>
              <button
                className="email-history-empty-cta"
                onClick={() => navigate(`/seller/contatti/${id}/email`)}
              >
                <PenSquare size={16} />
                Scrivi email
              </button>
            </motion.div>
          ) : (
            <ul className="email-history-list">
              {emailActivities.map((activity, index) => {
                const emailDetails = activity.email_details!;
                const hasAttachments = emailDetails.attachments && emailDetails.attachments.length > 0;
                const senderName = activity.user?.name || 'Venditore';

                return (
                  <motion.li
                    key={activity.id}
                    className="email-history-item"
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleEmailClick(activity.id)}
                    whileHover={{ backgroundColor: 'var(--seller-bg-overlay)' }}
                  >
                    {/* Avatar */}
                    <div className="email-history-avatar">
                      {getInitials(senderName)}
                    </div>

                    {/* Content */}
                    <div className="email-history-cell">
                      <div className="email-history-row-top">
                        <span className="email-history-sender">{senderName}</span>
                        <div className="email-history-meta">
                          {hasAttachments && <Paperclip size={12} className="email-history-paperclip" />}
                          <span className="email-history-date">{formatDate(activity.created_at)}</span>
                          <ChevronRight size={14} className="email-history-chevron" />
                        </div>
                      </div>
                      <p className="email-history-subject">
                        {emailDetails.subject || '(Senza oggetto)'}
                      </p>
                      <p className="email-history-preview">
                        A: {emailDetails.to_name || emailDetails.to}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SellerEmailHistoryPage;
