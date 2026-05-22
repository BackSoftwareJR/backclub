import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { backclubAccessApi } from '../api/backclubAccess';
import '../styles/pages/Login.css';
import './RichiediAccessoBackclub.css';

const RichiediAccessoBackclub: React.FC = () => {
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Inserisci la tua email.');
      return;
    }
    if (!privacyAccepted) {
      setError('Devi accettare l\'informativa sulla privacy.');
      return;
    }

    setLoading(true);
    try {
      await backclubAccessApi.richiediAccesso({
        email: email.trim(),
        privacy_accepted: true,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response
        : null;
      setError(res?.data?.message || 'Si è verificato un errore. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-background gradient-animated" />
        <div className="login-card glass-card animate-scale-in richiedi-accesso-card">
          <div className="richiedi-accesso-success">
            <CheckCircle size={48} className="richiedi-accesso-success-icon" />
            <h1 className="login-title text-gradient">Richiesta inviata</h1>
            <p className="richiedi-accesso-success-text">
              Grazie per aver richiesto l'accesso al BackClub. Controlla la tua email: riceverai un messaggio di ringraziamento a breve.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background gradient-animated" />
      <div className="login-card glass-card animate-scale-in richiedi-accesso-card">
        <div className="login-header">
          <h1 className="login-title text-gradient">Richiedi l'accesso</h1>
          <p className="login-subtitle">
            Inserisci la tua email per richiedere l'accesso al BackClub. Riceverai una mail di conferma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error animate-slide-in-top">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="nome@esempio.it"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group richiedi-accesso-privacy">
            <label className="richiedi-accesso-checkbox-label">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                disabled={loading}
                className="richiedi-accesso-checkbox"
              />
              <span>
                Accetto l'<a href="https://backclub.it/privacy" target="_blank" rel="noopener noreferrer" className="richiedi-accesso-link">informativa sulla privacy</a> e il trattamento dei miei dati per la gestione della richiesta di accesso.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Invio in corso...</span>
              </>
            ) : (
              <span>Invia richiesta</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RichiediAccessoBackclub;
