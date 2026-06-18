import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, X, FileText, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import leadsApi from '../../api/leads';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerEmailComposePage.css';

const SellerEmailComposePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    const emailFromQuery = searchParams.get('to');
    if (emailFromQuery) setTo(emailFromQuery);
    if (id) {
      loadLead();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const leadData = await leadsApi.getById(Number(id));

      if (!to) {
        if (leadData.emails && leadData.emails.length > 0) {
          const primaryEmail = leadData.emails.find((e: any) => e.isPrimary);
          if (primaryEmail) {
            setTo(typeof primaryEmail === 'string' ? primaryEmail : primaryEmail.email);
          } else {
            const firstEmail = leadData.emails[0];
            setTo(typeof firstEmail === 'string' ? firstEmail : firstEmail.email);
          }
        }
      }

      if (!subject) setSubject(`Contatto - ${leadData.company_name}`);

      if (!body) {
        const contactName = leadData.contact_person || leadData.company_name || 'Cliente';
        setBody(`Gentile ${contactName},

Spero che questo messaggio la trovi bene.

In riferimento alla sua richiesta per ${leadData.company_name}, siamo lieti di poterla contattare.

${leadData.tipologia ? `Siamo specializzati in servizi per ${leadData.tipologia}.` : ''}

Saremmo lieti di poter programmare un appuntamento per discutere delle sue esigenze in dettaglio.

Restiamo a disposizione per qualsiasi chiarimento.

Cordiali saluti,
${user?.name || 'Il Team'}`);
      }
    } catch (error) {
      console.error('Errore nel caricamento lead:', error);
      alert('Errore nel caricamento del contatto');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    if (!id) {
      alert('ID contatto non valido');
      return;
    }
    try {
      setSending(true);
      const result = await leadsApi.sendEmail(Number(id), {
        to,
        subject,
        body,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (result.success) {
        alert('Email inviata con successo!');
        navigate(`/seller/contatti/${id}`);
      } else {
        const errorMsg = result.error || result.error_details || result.message || 'Errore sconosciuto';
        console.error('Errore invio email:', result);
        alert('Errore nell\'invio email:\n\n' + errorMsg);
      }
    } catch (error: any) {
      console.error('Errore nell\'invio email:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.error_details ||
        error?.response?.data?.message ||
        error?.message ||
        'Errore nell\'invio email.';
      alert('Errore nell\'invio email:\n\n' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const isDark = resolvedTheme === 'dark';

  if (loading) {
    return (
      <div className={`email-compose-page ${isDark ? 'dark' : 'light'}`}>
        <div className="email-compose-header">
          <div style={{ height: 24, width: '25%', borderRadius: 6, background: 'var(--seller-bg-overlay)' }} />
        </div>
        <div style={{ padding: 24 }}>
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className={`email-compose-page ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="email-compose-header">
        <div className="email-compose-header-left">
          <button
            className="email-compose-back-btn"
            onClick={() => navigate(`/seller/contatti/${id}`)}
          >
            <ArrowLeft size={16} />
            Torna al contatto
          </button>
          <h1 className="email-compose-title">Nuova email</h1>
        </div>
        <button
          className="email-compose-history-btn"
          onClick={() => navigate(`/seller/contatti/${id}/email/storico`)}
        >
          <FileText size={16} />
          Storico
        </button>
      </div>

      {/* Form */}
      <div className="email-compose-container">
        <motion.div
          className="email-compose-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* To */}
          <div className="email-field-row email-field-to">
            <span className="email-field-label">A</span>
            <input
              type="email"
              className="email-field-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@email.com"
              required
            />
          </div>

          {/* Subject */}
          <div className="email-field-row email-field-subject">
            <span className="email-field-label">Oggetto</span>
            <input
              type="text"
              className="email-field-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto dell'email"
              required
            />
          </div>

          {/* Body */}
          <div className="email-field-body-wrap">
            <textarea
              className="email-field-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Scrivi il tuo messaggio..."
              rows={18}
              required
            />
          </div>

          {/* Toolbar + attachments */}
          <div className="email-compose-toolbar">
            <label className="email-attach-trigger">
              <Paperclip size={16} />
              <span>Allega file</span>
              <input type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>

            {attachments.length > 0 && (
              <div className="email-attachments-chips">
                {attachments.map((file, index) => (
                  <div key={index} className="email-attachment-chip">
                    <FileText size={13} />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="email-attachment-chip-remove"
                      onClick={() => removeAttachment(index)}
                      aria-label={`Rimuovi ${file.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="email-compose-actions">
            <button
              className="email-compose-draft-btn"
              type="button"
              onClick={() => navigate(`/seller/contatti/${id}`)}
            >
              <Save size={15} />
              Annulla
            </button>
            <motion.button
              className="email-compose-send-btn"
              type="button"
              onClick={handleSend}
              disabled={sending || !to || !subject || !body}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {sending ? (
                <>
                  <span className="email-compose-spinner" />
                  Invio...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Invia
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SellerEmailComposePage;
