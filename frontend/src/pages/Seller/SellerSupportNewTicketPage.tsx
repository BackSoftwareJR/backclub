import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { supportTicketsApi } from '../../api/supportTickets';
import './SellerSupportNewTicketPage.css';

const SellerSupportNewTicketPage: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [recipientType, setRecipientType] = useState<'admin' | 'tecnico'>('admin');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Scrivi la tua richiesta.');
      return;
    }
    setSubmitting(true);
    try {
      await supportTicketsApi.createTicket({
        recipient_type: recipientType,
        message: trimmed,
      });
      navigate('/seller/supporto', { state: { ticketCreated: true } });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || 'Impossibile inviare la segnalazione. Riprova più tardi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`seller-support-new-ticket-page ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <header className="support-new-ticket-header">
        <button
          type="button"
          className="support-new-ticket-back"
          onClick={() => navigate('/seller/supporto')}
          aria-label="Indietro"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="support-new-ticket-title">Apri Segnalazione</h1>
      </header>

      <main className="support-new-ticket-main">
        <form onSubmit={handleSubmit} className="support-new-ticket-form">
          <div className="support-new-ticket-field">
            <label className="support-new-ticket-label">A chi vuoi aprire il ticket?</label>
            <div className="support-new-ticket-radio-group">
              <label className="support-new-ticket-radio">
                <input
                  type="radio"
                  name="recipient_type"
                  value="admin"
                  checked={recipientType === 'admin'}
                  onChange={() => setRecipientType('admin')}
                />
                <span className="support-new-ticket-radio-label">Amministrazione</span>
              </label>
              <label className="support-new-ticket-radio">
                <input
                  type="radio"
                  name="recipient_type"
                  value="tecnico"
                  checked={recipientType === 'tecnico'}
                  onChange={() => setRecipientType('tecnico')}
                />
                <span className="support-new-ticket-radio-label">Tecnico</span>
              </label>
            </div>
          </div>

          <div className="support-new-ticket-field">
            <label htmlFor="message" className="support-new-ticket-label">
              Scrivi la tua richiesta
            </label>
            <textarea
              id="message"
              className="support-new-ticket-textarea"
              placeholder="Descrivi il problema o la richiesta..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </div>

          {error && (
            <div className="support-new-ticket-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="support-new-ticket-submit"
            disabled={submitting || !message.trim()}
          >
            {submitting ? (
              <span>Invio in corso...</span>
            ) : (
              <>
                <Send size={20} />
                <span>Invia</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default SellerSupportNewTicketPage;
