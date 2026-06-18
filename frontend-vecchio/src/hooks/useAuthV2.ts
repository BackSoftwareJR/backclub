/**
 * Hook per gestire autenticazione V2 con 2FA
 */

import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'backclub.it' 
    ? 'https://backclub.it/backend/public/api' 
    : 'http://localhost:8000/api');

interface LoginStep1Response {
  requires_2fa: boolean;
  temp_token?: string;
  email_hint?: string;
  expires_in?: number;
  access_token?: string;
  token_type?: string;
  user?: any;
  redirect_route?: string;
  session_id?: number;
}

interface LoginStep2Response {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: any;
  redirect_route: string;
  session_id: number;
}

interface AuthError {
  message: string;
  errors?: Record<string, string[]>;
  error_code?: string;
  remaining_attempts?: number;
  blocked_until?: string;
}

export function useAuthV2() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number | null>(null);

  /**
   * Step 1: Login con email e password
   */
  const loginStep1 = async (email: string, password: string, remember: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<LoginStep1Response>(
        `${API_BASE_URL}/v2/login`,
        { email, password, remember },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;

      // Se richiede 2FA
      if (data.requires_2fa && data.temp_token) {
        setTempToken(data.temp_token);
        setEmailHint(data.email_hint || null);
        setCodeExpiresIn(data.expires_in || 600);
        setStep(2);
        
        return {
          success: true,
          requires2FA: true,
          emailHint: data.email_hint,
        };
      }

      // Login diretto (senza 2FA)
      if (data.access_token && data.user) {
        // Salva token
        localStorage.setItem('auth_token', data.access_token);
        
        return {
          success: true,
          requires2FA: false,
          user: data.user,
          redirectRoute: data.redirect_route || '/dashboard',
        };
      }

      throw new Error('Risposta server non valida');

    } catch (err: any) {
      const errorData: AuthError = err.response?.data || {};
      
      let errorMessage = 'Errore durante il login';
      
      if (err.response?.status === 401) {
        errorMessage = errorData.message || 'Credenziali non valide';
      } else if (err.response?.status === 403) {
        errorMessage = errorData.message || 'Account disattivato';
      } else if (err.response?.status === 429) {
        errorMessage = errorData.message || 'Troppi tentativi. Riprova più tardi.';
      } else if (err.response?.status === 422) {
        // Errori di validazione
        if (errorData.errors) {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        }
      } else if (!err.response) {
        errorMessage = 'Errore di connessione. Verifica la tua connessione internet.';
      }

      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Verifica codice 2FA
   */
  const loginStep2Verify = async (code: string, trustDevice: boolean = false) => {
    if (!tempToken) {
      setError('Sessione scaduta. Rieffettua il login.');
      return { success: false, error: 'Sessione scaduta' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<LoginStep2Response>(
        `${API_BASE_URL}/v2/login/verify-2fa`,
        {
          temp_token: tempToken,
          code: code.trim(),
          trust_device: trustDevice,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;

      // Salva token
      localStorage.setItem('auth_token', data.access_token);

      return {
        success: true,
        user: data.user,
        redirectRoute: data.redirect_route || '/dashboard',
      };

    } catch (err: any) {
      const errorData: AuthError = err.response?.data || {};
      
      let errorMessage = 'Errore durante la verifica';
      
      if (err.response?.status === 401) {
        errorMessage = errorData.message || 'Codice non valido o scaduto';
      } else if (err.response?.status === 429) {
        errorMessage = errorData.message || 'Troppi tentativi. Riprova più tardi.';
      }

      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        remainingAttempts: errorData.remaining_attempts,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reinvia codice 2FA
   */
  const resendCode = async () => {
    if (!tempToken) {
      setError('Sessione scaduta. Rieffettua il login.');
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post(
        `${API_BASE_URL}/v2/login/resend-2fa`,
        { temp_token: tempToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      setCodeExpiresIn(600); // Reset timer

      return { success: true };

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Errore invio codice';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset stato
   */
  const reset = () => {
    setStep(1);
    setTempToken(null);
    setEmailHint(null);
    setCodeExpiresIn(null);
    setError(null);
    setLoading(false);
  };

  return {
    // Stato
    loading,
    error,
    step,
    emailHint,
    codeExpiresIn,
    
    // Metodi
    loginStep1,
    loginStep2Verify,
    resendCode,
    reset,
    
    // Utility
    setError,
  };
}

