/**
 * Login Step 2: Codice 2FA - Apple Style
 */

import { useState, useEffect } from 'react';
import { CodeInput } from '../ui/CodeInput';
import { CountdownTimer } from '../ui/CountdownTimer';

interface LoginStep2TwoFactorProps {
  authV2: any;
  onSuccess: (data: any) => void;
  onBack: () => void;
}

export function LoginStep2TwoFactor({ authV2, onSuccess, onBack }: LoginStep2TwoFactorProps) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);

  // Cooldown resend button
  useEffect(() => {
    if (resendCooldown === 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeComplete = async (completedCode: string) => {
    setIsVerifying(true);
    
    const result = await authV2.loginStep2Verify(completedCode, trustDevice);
    
    if (result.success) {
      onSuccess(result);
    } else {
      // Clear code e shake animation su errore
      setTimeout(() => {
        setCode('');
        setIsVerifying(false);
      }, 500);
    }
  };

  const handleResend = async () => {
    const result = await authV2.resendCode();
    
    if (result.success) {
      setResendCooldown(60);
      setCanResend(false);
    }
  };

  const handleCodeExpire = () => {
    authV2.setError('Il codice è scaduto. Richiedi un nuovo codice.');
    setCanResend(true);
    setResendCooldown(0);
  };

  return (
    <div className="space-y-6">
      {/* Email hint - minimal */}
      {authV2.emailHint && (
        <div className="text-center py-3 px-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-medium text-gray-500 mb-1">Codice inviato a</p>
          <p className="text-sm font-semibold text-gray-900">{authV2.emailHint}</p>
        </div>
      )}

      {/* Code input section */}
      <div className="space-y-4">
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Inserisci il codice di verifica
          </label>
        </div>
        
        <CodeInput
          length={6}
          value={code}
          onChange={setCode}
          onComplete={handleCodeComplete}
          disabled={authV2.loading || isVerifying}
          error={!!authV2.error && !authV2.error.startsWith('✅')}
        />

        {/* Countdown timer - minimal */}
        {authV2.codeExpiresIn && (
          <div className="flex justify-center py-2">
            <CountdownTimer
              initialSeconds={authV2.codeExpiresIn}
              onExpire={handleCodeExpire}
            />
          </div>
        )}
      </div>

      {/* Trust device - Apple style */}
      <label className="flex items-center gap-3 cursor-pointer group py-3 px-4 rounded-xl hover:bg-gray-50 transition-all">
        <div className="relative">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="peer sr-only"
            disabled={authV2.loading}
          />
          <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all duration-200 flex items-center justify-center">
            {trustDevice && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
            Considera questo dispositivo fidato
          </span>
          <p className="text-xs text-gray-400 mt-0.5">
            Non richiederemo il codice la prossima volta
          </p>
        </div>
      </label>

      {/* Error/Success message */}
      {authV2.error && (
        <div className={`apple-message ${
          authV2.error.startsWith('✅')
            ? 'apple-message-success'
            : 'apple-message-error animate-shake'
        }`}>
          {authV2.error.startsWith('✅') ? (
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{authV2.error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={!canResend || authV2.loading}
          className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
            canResend && !authV2.loading
              ? 'bg-gray-100 text-blue-600 hover:bg-gray-200 active:scale-[0.98]'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canResend ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Invia nuovo codice
            </span>
          ) : (
            `Reinvia codice tra ${resendCooldown}s`
          )}
        </button>

        {/* Back button */}
        <button
          onClick={onBack}
          disabled={authV2.loading}
          className="w-full py-3 px-4 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Torna al login
        </button>
      </div>

      {/* Help text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Non hai ricevuto il codice? Controlla la cartella spam
        </p>
      </div>
    </div>
  );
}
