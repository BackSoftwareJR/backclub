/**
 * Login V2 - Design Apple Esclusivo
 * Sistema completamente nuovo con 2FA
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthV2 } from '../hooks/useAuthV2';
import { LoginStep1 } from '../components/auth/LoginStep1';
import { LoginStep2TwoFactor } from '../components/auth/LoginStep2TwoFactor';

export default function LoginV2() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const authV2 = useAuthV2();

  const handleStep1Success = (data: any) => {
    if (data.requires2FA) {
      // Passa a step 2 (gestito automaticamente dall'hook)
      console.log('2FA richiesto, passa a step 2');
    } else {
      // Login completato
      login(data.user.access_token, data.user, data.redirectRoute);
      navigate(data.redirectRoute || '/dashboard');
    }
  };

  const handleStep2Success = (data: any) => {
    // Login completato dopo 2FA
    login(localStorage.getItem('auth_token')!, data.user, data.redirectRoute);
    navigate(data.redirectRoute || '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
      {/* Background Pattern Apple Style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient mesh sottile */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60" />
        
        {/* Cerchi sfumati stile Apple */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-200/30 to-pink-200/30 blur-3xl" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-200/20 to-blue-200/20 blur-3xl" />
        
        {/* Grid pattern sottile */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Container principale */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo e Header */}
        <div className="text-center mb-8 animate-fade-in">
          {/* Logo minimalista */}
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">
            {authV2.step === 1 ? 'Benvenuto' : 'Verifica la tua identità'}
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            {authV2.step === 1 ? 'Accedi al tuo account BackClub' : 'Abbiamo inviato un codice alla tua email'}
          </p>
        </div>

        {/* Card principale - Apple style */}
        <div className="apple-card animate-slide-in-up">
          {/* Step Progress minimal */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
              authV2.step === 1 ? 'bg-blue-500' : 'bg-blue-500/30'
            }`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
              authV2.step === 2 ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          </div>

          {/* Content con transizioni */}
          <div className="transition-all duration-300">
            {authV2.step === 1 ? (
              <LoginStep1
                authV2={authV2}
                onSuccess={handleStep1Success}
              />
            ) : (
              <LoginStep2TwoFactor
                authV2={authV2}
                onSuccess={handleStep2Success}
                onBack={authV2.reset}
              />
            )}
          </div>
        </div>

        {/* Footer minimale */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-gray-400">
            Protetto con autenticazione sicura
          </p>
        </div>
      </div>
    </div>
  );
}
