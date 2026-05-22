import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Loader2 } from 'lucide-react';
import '../styles/pages/Login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Inserisci email e password');
            return;
        }

        setLoading(true);

        try {
            const result = await login(email, password);
            
            console.log('Login result:', {
                hasResult: !!result,
                requiresRoleSelection: result?.requiresRoleSelection,
                roles: result?.roles,
                rolesCount: result?.roles?.length || 0,
                user: result?.user
            });
            
            // ALWAYS check if role selection is required FIRST
            // If backend says requires_role_selection is true, MUST go to role selection page
            // This happens when user has multiple roles (regardless of current_role)
            if (result && result.requiresRoleSelection === true) {
                console.log('Redirecting to role-selection page with roles:', result.roles);
                // IMPORTANT: Save roles to sessionStorage as backup in case state is lost
                if (result.roles && result.roles.length > 0) {
                    sessionStorage.setItem('pending_role_selection', JSON.stringify(result.roles));
                    // Set a flag to prevent automatic redirects during role selection
                    sessionStorage.setItem('role_selection_in_progress', 'true');
                }
                // Redirect to role selection page with roles - Use replace: true to prevent back navigation issues
                navigate('/role-selection', { 
                    state: { roles: result.roles || [] },
                    replace: true
                });
                setLoading(false);
                return;
            }
            
            console.log('No role selection needed');
            // Check if user needs onboarding - if so, let ProtectedRoute handle it
            const loginUser = result?.user;
            
            // If user hasn't completed onboarding, navigate to a protected route
            // The ProtectedRoute will automatically show the onboarding wizard
            // Check for false, null, or undefined (DB might return null/undefined for new users)
            const needsOnboarding = loginUser && (
                loginUser.onboarding_completed === false || 
                loginUser.onboarding_completed === null || 
                loginUser.onboarding_completed === undefined
            );
            
            if (needsOnboarding) {
                console.log('Login: User needs onboarding, navigating to dashboard (onboarding will be shown)', {
                    onboarding_completed: loginUser.onboarding_completed,
                    user_id: loginUser.id
                });
                navigate('/dashboard');
                return;
            }
            
            // Only redirect to dashboard if user has single role (no role selection needed)
            // Redirect based on user role - get user from result or localStorage
            // Usa current_role se disponibile, altrimenti fallback a role
            const activeRole = loginUser?.current_role || loginUser?.role;
            if (loginUser && (loginUser.seller_id || activeRole === 'venditori' || activeRole === 'seller')) {
                navigate('/seller');
            } else if (activeRole === 'freelance') {
                navigate('/freelance');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Credenziali non valide');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background gradient-animated" />

            <div className="login-card glass-card animate-scale-in">
                <div className="login-header">
                    <h1 className="login-title text-gradient">Back Club</h1>
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

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="••••••••"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Accesso in corso...</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                <span>Accedi</span>
                            </>
                        )}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
