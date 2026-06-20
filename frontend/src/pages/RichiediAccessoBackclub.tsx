import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { backclubAccessApi } from '../api/backclubAccess';

const RichiediAccessoBackclub: React.FC = () => {
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Inserisci la tua email.');
      return;
    }
    if (!privacyAccepted) {
      setError("Devi accettare l'informativa sulla privacy.");
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
      const res =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : null;
      setError(res?.data?.message || 'Si è verificato un errore. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ── */
  if (success) {
    return (
      <div className="h-[100dvh] w-[100dvw] bg-background flex items-center justify-center p-8 font-sans">
        <div className="animate-element w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="h-16 w-16 rounded-3xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Richiesta inviata
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Grazie per aver richiesto l'accesso a{' '}
              <span className="text-violet-400 font-medium">BackClub</span>.
              Controlla la tua email: riceverai un messaggio di conferma a breve.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="h-[100dvh] w-[100dvw] bg-background flex flex-col md:flex-row font-sans overflow-hidden">

      {/* Left column: form */}
      <section className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-16">
        <div className="w-full max-w-[380px] flex flex-col gap-8">

          {/* Back to login */}
          <button
            onClick={() => navigate('/login')}
            className="animate-element animate-delay-100 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna al login
          </button>

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="animate-element animate-delay-200 text-[2.6rem] font-semibold leading-[1.15] tracking-tight text-foreground">
              Richiedi l'accesso a{' '}
              <span className="text-violet-400">BackClub</span>
            </h1>
            <p className="animate-element animate-delay-300 text-[15px] text-muted-foreground leading-relaxed">
              Inserisci la tua email e riceverai una mail di conferma.
            </p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

            {/* Email */}
            <div className="animate-element animate-delay-400 flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-foreground/60 tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                autoComplete="email"
                autoFocus
                disabled={loading}
                className="w-full min-h-[48px] rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3.5 text-[15px] text-foreground placeholder:text-foreground/30 transition-all duration-200 outline-none focus:border-violet-400/50 focus:bg-violet-500/[0.07] focus:ring-4 focus:ring-violet-500/10 disabled:opacity-50"
              />
            </div>

            {/* Privacy checkbox */}
            <div className="animate-element animate-delay-500">
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  disabled={loading}
                  className="custom-checkbox mt-0.5 flex-shrink-0"
                />
                <span className="text-[13px] text-foreground/60 leading-relaxed group-hover:text-foreground/80 transition-colors">
                  Accetto l'
                  <a
                    href="https://backclub.it/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    informativa sulla privacy
                  </a>
                  {' '}e il trattamento dei miei dati per la gestione della richiesta di accesso.
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-element rounded-xl border border-destructive/25 bg-destructive/10 px-5 py-3.5 text-[13px] text-destructive leading-relaxed">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="animate-element animate-delay-600 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2.5 rounded-full bg-violet-600 px-7 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-violet-500 hover:gap-4 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_4px_20px_rgba(139,92,246,0.3)]"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Invio in corso…
                  </>
                ) : (
                  <>
                    Invia richiesta
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="animate-element animate-delay-700 text-[13px] text-muted-foreground">
            Hai già un account?{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              Accedi
            </a>
          </p>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)' }}
        >
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent rounded-b-3xl" />
        </div>
      </section>
    </div>
  );
};

export default RichiediAccessoBackclub;
