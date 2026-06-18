/**
 * Login Step 1: Email e Password - Apple Style
 */

import { useState } from 'react';

interface LoginStep1Props {
  authV2: any;
  onSuccess: (data: any) => void;
}

export function LoginStep1({ authV2, onSuccess }: LoginStep1Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await authV2.loginStep1(email, password, remember);
    
    if (result.success) {
      onSuccess(result);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email Input - Apple Style */}
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
          disabled={authV2.loading}
          className="apple-input"
        />
      </div>

      {/* Password Input - Apple Style */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 px-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="La tua password"
          required
          autoComplete="current-password"
          disabled={authV2.loading}
          className="apple-input"
        />
      </div>

      {/* Remember me - minimal */}
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="peer sr-only"
              disabled={authV2.loading}
            />
            <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all duration-200 flex items-center justify-center">
              {remember && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">
            Ricordami
          </span>
        </label>

        <a
          href="#/forgot-password"
          className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
        >
          Password dimenticata?
        </a>
      </div>

      {/* Error message - Apple style */}
      {authV2.error && (
        <div className="apple-error-message animate-shake">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{authV2.error}</span>
        </div>
      )}

      {/* Submit button - Apple style */}
      <button
        type="submit"
        disabled={authV2.loading || !email || !password}
        className="apple-button-primary"
      >
        {authV2.loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Accesso in corso...</span>
          </div>
        ) : (
          'Accedi'
        )}
      </button>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-xs font-medium text-gray-400 bg-white">OPPURE</span>
        </div>
      </div>

      {/* Register link - subtle */}
      <div className="text-center">
        <span className="text-sm text-gray-500">Non hai un account? </span>
        <a
          href="#/register"
          className="text-sm text-blue-500 hover:text-blue-600 font-semibold transition-colors"
        >
          Registrati gratuitamente
        </a>
      </div>
    </form>
  );
}
