import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, X, FileText } from 'lucide-react';
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
  
  // Email form state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    const emailFromQuery = searchParams.get('to');
    if (emailFromQuery) {
      setTo(emailFromQuery);
    }
    
    if (id) {
      loadLead();
    }
  }, [id, searchParams]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const leadData = await leadsApi.getById(Number(id));
      
      // Set email from lead if not already set from query parameter
      if (!to) {
        // Get primary email from lead
        if (leadData.emails && leadData.emails.length > 0) {
          const primaryEmail = leadData.emails.find(e => e.isPrimary);
          if (primaryEmail) {
            const email = typeof primaryEmail === 'string' ? primaryEmail : primaryEmail.email;
            setTo(email);
          } else {
            const firstEmail = leadData.emails[0];
            const email = typeof firstEmail === 'string' ? firstEmail : firstEmail.email;
            setTo(email);
          }
        }
      }
      
      // Set default subject if not set
      if (!subject) {
        setSubject(`Contatto - ${leadData.company_name}`);
      }
      
      // Set default body template (con saluto iniziale)
      if (!body) {
        const contactName = leadData.contact_person || leadData.company_name || 'Cliente';
        const templateBody = `Gentile ${contactName},

Spero che questo messaggio la trovi bene.

In riferimento alla sua richiesta per ${leadData.company_name}, siamo lieti di poterla contattare.

${leadData.tipologia ? `Siamo specializzati in servizi per ${leadData.tipologia}.` : ''}

Saremmo lieti di poter programmare un appuntamento per discutere delle sue esigenze in dettaglio.

Restiamo a disposizione per qualsiasi chiarimento.

Cordiali saluti,
${user?.name || 'Il Team'}`;
        setBody(templateBody);
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
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
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
        attachments: attachments.length > 0 ? attachments : undefined
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
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.error_details || 
                          error?.response?.data?.message ||
                          error?.message || 
                          'Errore nell\'invio email. Controlla la console per i dettagli.';
      alert('Errore nell\'invio email:\n\n' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={`email-compose-page ${resolvedTheme === 'dark' ? 'dark' : 'light'} email-compose-skeleton`}>
        <div className="email-compose-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
        </div>
        <div className="email-compose-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className={`email-compose-page ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}>
      <div className="email-compose-header">
        <div className="email-compose-header-left">
          <button 
            className="email-compose-back-btn"
            onClick={() => navigate(`/seller/contatti/${id}`)}
          >
            <ArrowLeft size={18} />
            Torna al contatto
          </button>
          <h1 className="email-compose-title">Invia Email</h1>
        </div>
        <button 
          className="email-compose-history-btn"
          onClick={() => navigate(`/seller/contatti/${id}/email/storico`)}
        >
          <FileText size={18} />
          Storico Email
        </button>
      </div>

      <div className="email-compose-container">
        <div className="email-compose-form">
          {/* To Field */}
          <div className="email-form-group">
            <label className="email-form-label">A</label>
            <input
              type="email"
              className="email-form-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@esempio.com"
              required
            />
            <p className="email-form-hint">
              L'email verrà inviata all'indirizzo che inserisci qui. Puoi modificarlo se necessario.
            </p>
          </div>

          {/* Subject Field */}
          <div className="email-form-group">
            <label className="email-form-label">Oggetto</label>
            <input
              type="text"
              className="email-form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto dell'email"
              required
            />
          </div>

          {/* Body Field */}
          <div className="email-form-group email-form-group-body">
            <label className="email-form-label">Messaggio</label>
            <textarea
              className="email-form-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Scrivi il tuo messaggio..."
              rows={15}
              required
            />
          </div>

          {/* Attachments */}
          <div className="email-form-group">
            <label className="email-form-label">Allegati</label>
            <div className="email-attachments">
              <label className="email-attach-btn">
                <Paperclip size={18} />
                Aggiungi allegato
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
              {attachments.length > 0 && (
                <div className="email-attachments-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="email-attachment-item">
                      <FileText size={16} />
                      <span>{file.name}</span>
                      <button
                        className="email-attachment-remove"
                        onClick={() => removeAttachment(index)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="email-compose-actions">
            <button
              className="email-compose-cancel-btn"
              onClick={() => navigate(`/seller/contatti/${id}`)}
            >
              Annulla
            </button>
            <button
              className="email-compose-send-btn"
              onClick={handleSend}
              disabled={sending || !to || !subject || !body}
            >
              {sending ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Invia Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerEmailComposePage;
