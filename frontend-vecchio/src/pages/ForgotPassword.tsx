/**
 * Forgot Password - Apple Style
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implementare API reset password
      // Per ora mostra solo messaggio
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err: any) {
      setError('Errore durante la richiesta. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
      {/* Background Pattern Apple Style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-200/30 to-pink-200/30 blur-3xl" />
      </div>

      {/* Container */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo e Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">
            Password Dimenticata?
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            Ti invieremo le istruzioni per reimpostarla
          </p>
        </div>

        {/* Card */}
        <div className="apple-card animate-slide-in-up">
          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900">Email Inviata!</h2>
              <p className="text-gray-600 text-sm">
                Se l'indirizzo email è registrato nel nostro sistema, riceverai le istruzioni per reimpostare la password.
              </p>
              <p className="text-gray-500 text-xs mt-4">
                Controlla anche la cartella spam.
              </p>

              <Link
                to="/login"
                className="inline-block mt-6 text-blue-500 hover:text-blue-600 font-semibold text-sm transition-colors"
              >
                ← Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 px-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@azienda.it"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  className="apple-input"
                />
                <p className="text-xs text-gray-500 px-1 mt-2">
                  Inserisci l'email associata al tuo account
                </p>
              </div>

              {error && (
                <div className="apple-error-message animate-shake">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="apple-button-primary"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Invio in corso...</span>
                  </div>
                ) : (
                  'Invia Istruzioni'
                )}
              </button>

              <div className="text-center mt-6">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Torna al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

