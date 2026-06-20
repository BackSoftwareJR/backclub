import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForUser } from '../utils/userRoles';
import { SignInPage } from '@/components/ui/sign-in';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result && result.requiresRoleSelection === true) {
        if (result.roles && result.roles.length > 0) {
          sessionStorage.setItem('pending_role_selection', JSON.stringify(result.roles));
          sessionStorage.setItem('role_selection_in_progress', 'true');
        }
        navigate('/role-selection', {
          state: { roles: result.roles || [] },
          replace: true,
        });
        return;
      }

      const loginUser = result?.user;
      const needsOnboarding =
        loginUser &&
        (loginUser.onboarding_completed === false ||
          loginUser.onboarding_completed === null ||
          loginUser.onboarding_completed === undefined);

      if (needsOnboarding) {
        navigate(getHomeRouteForUser(loginUser));
        return;
      }

      navigate(getHomeRouteForUser(loginUser));
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
          ? err.response.data.message
          : 'Credenziali non valide';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        error={error}
        loading={loading}
        onSignIn={handleSignIn}
        onResetPassword={() => {
          window.location.href = 'mailto:supporto@backclub.it?subject=Recupero%20password%20Backclub';
        }}
        onCreateAccount={() => navigate('/richiedi-accesso')}
      />
    </div>
  );
};

export default Login;
