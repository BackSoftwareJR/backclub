import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCog, Check, Loader2 } from 'lucide-react';
import './RoleSelectionPage.css';

// Prevent any automatic redirects while on role selection page
const ROLE_SELECTION_PATH = '/role-selection';

const RoleSelectionPage: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [animationPhase, setAnimationPhase] = useState<'entering' | 'visible'>('entering');
    const hasInitialized = useRef(false);

    const { changeRole, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // CRITICAL: Prevent any automatic redirects while we're on this page
    useEffect(() => {
        // This ensures we stay on this page even if user object changes
        if (location.pathname === ROLE_SELECTION_PATH && availableRoles.length > 1) {
            console.log('RoleSelectionPage mounted - preventing automatic redirects');
        }
    }, [location.pathname, availableRoles.length]);

    // Get roles from location state or user - RUN ONLY ONCE
    useEffect(() => {
        // Prevent multiple executions
        if (hasInitialized.current) {
            console.log('RoleSelectionPage - Already initialized, skipping');
            return;
        }
        
        const state = location.state as { roles?: string[] } | null;
        let rolesToUse: string[] = [];
        
        // Try to get roles from sessionStorage as fallback
        let sessionRoles: string[] = [];
        try {
            const stored = sessionStorage.getItem('pending_role_selection');
            if (stored) {
                sessionRoles = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error reading sessionStorage:', e);
        }
        
        console.log('RoleSelectionPage - useEffect triggered', {
            hasState: !!state,
            stateRoles: state?.roles,
            stateRolesLength: state?.roles?.length || 0,
            sessionRoles: sessionRoles,
            sessionRolesLength: sessionRoles.length,
            userRoles: user?.roles,
            userRolesLength: user?.roles?.length || 0,
            userCurrentRole: user?.current_role,
            locationPathname: location.pathname
        });
        
        // PRIORITY 1: Use roles from location state (passed from login) - THIS IS THE PRIMARY SOURCE
        // This is the most reliable source since it comes directly from the login response
        if (state?.roles && Array.isArray(state.roles) && state.roles.length > 0) {
            rolesToUse = state.roles;
            console.log('✅ Using roles from location state:', rolesToUse);
            hasInitialized.current = true;
        } 
        // PRIORITY 1.5: Use roles from sessionStorage (fallback if state is lost)
        else if (sessionRoles.length > 0) {
            rolesToUse = sessionRoles;
            console.log('✅ Using roles from sessionStorage:', rolesToUse);
            // Clear sessionStorage after using it
            sessionStorage.removeItem('pending_role_selection');
            hasInitialized.current = true;
        } 
        // PRIORITY 2: Use roles from user object (if available and multiple)
        else if (user?.roles && Array.isArray(user.roles) && user.roles.length > 1) {
            rolesToUse = user.roles;
            console.log('✅ Using roles from user object:', rolesToUse);
            hasInitialized.current = true;
        } 
        // PRIORITY 3: Single role - redirect to dashboard (only if we're sure)
        else if (user?.roles && Array.isArray(user.roles) && user.roles.length === 1) {
            console.log('⚠️ Single role detected, redirecting to dashboard');
            hasInitialized.current = true;
            navigate('/dashboard', { replace: true });
            return;
        } 
        // PRIORITY 4: No roles available yet - wait for user to load (but don't redirect yet)
        else {
            console.log('⏳ Waiting for roles to load...', {
                hasState: !!state,
                hasUser: !!user,
                userRoles: user?.roles
            });
            // Don't mark as initialized yet, wait for user to load
            // But also don't redirect - just wait
            return;
        }
        
        // Show selection if user has multiple roles (even if current_role is already set)
        if (rolesToUse.length > 1) {
            console.log('✅ Setting up role selection with', rolesToUse.length, 'roles:', rolesToUse);
            setAvailableRoles(rolesToUse);
            // Pre-select current_role if available, otherwise select first role
            if (user?.current_role && rolesToUse.includes(user.current_role)) {
                setSelectedRole(user.current_role);
                console.log('Pre-selected role:', user.current_role);
            } else {
                setSelectedRole(rolesToUse[0]);
                console.log('Selected first role:', rolesToUse[0]);
            }
        } else if (rolesToUse.length === 1) {
            // Single role, redirect to dashboard
            console.log('⚠️ Single role in rolesToUse, redirecting to dashboard');
            navigate('/dashboard', { replace: true });
        } else {
            console.log('❌ No roles found, this should not happen');
        }
    }, [location.state, user, navigate, location.pathname]);

    useEffect(() => {
        // Entrance animation
        const timer = setTimeout(() => {
            setAnimationPhase('visible');
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Amministratore',
            freelance: 'Freelance',
            venditori: 'Venditore',
            seller: 'Venditore',
            client: 'Cliente',
            clienti: 'Cliente',
            dipendente: 'Dipendente',
            project_manager: 'Project Manager',
            project_master: 'Project Master',
            segreteria: 'Segreteria',
            risorse_umane: 'Risorse Umane',
            commercialista: 'Commercialista',
        };
        return labels[role] || role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
    };

    const getRoleDescription = (role: string) => {
        const descriptions: Record<string, string> = {
            admin: 'Accesso completo al sistema',
            freelance: 'Gestione progetti e attività',
            venditori: 'Dashboard vendite e clienti',
            seller: 'Dashboard vendite e clienti',
            client: 'Area riservata clienti',
            clienti: 'Area riservata clienti',
            dipendente: 'Gestione attività e progetti',
            project_manager: 'Gestione progetti e team',
            project_master: 'Gestione avanzata progetti',
            segreteria: 'Gestione amministrativa',
            risorse_umane: 'Gestione risorse umane',
            commercialista: 'Gestione contabilità',
        };
        return descriptions[role] || 'Accesso alle funzionalità del ruolo';
    };

    const handleRoleSelection = async () => {
        if (!selectedRole) {
            setError('Seleziona un ruolo');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await changeRole(selectedRole);
            
            // Clear sessionStorage after role selection
            sessionStorage.removeItem('pending_role_selection');
            sessionStorage.removeItem('role_selection_in_progress');
            
            // Small delay for smooth transition
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Redirect based on selected role
            if (selectedRole === 'venditori' || selectedRole === 'seller') {
                navigate('/seller', { replace: true });
            } else if (selectedRole === 'freelance') {
                navigate('/freelance', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nella selezione del ruolo');
            setLoading(false);
        }
    };

    // Don't render until we have roles or we're redirecting
    if (availableRoles.length === 0) {
        // Show loading while checking roles
        return (
            <div className="role-selection-page">
                <div className="role-selection-background" />
                <div className="role-selection-container visible">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem' }} />
                        <p>Caricamento ruoli...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="role-selection-page">
            <div className="role-selection-background" />
            
            <div className={`role-selection-container ${animationPhase}`}>
                <div className="role-selection-header">
                    <div className="role-selection-icon-wrapper">
                        <UserCog size={32} className="role-selection-icon" />
                    </div>
                    <h1 className="role-selection-title">Seleziona Ruolo</h1>
                    <p className="role-selection-subtitle">
                        Hai più ruoli assegnati. Scegli quale ruolo vuoi utilizzare per questa sessione.
                    </p>
                </div>

                {error && (
                    <div className="role-selection-error">
                        {error}
                    </div>
                )}

                <div className="role-selection-list">
                    {availableRoles.map((role, index) => (
                        <button
                            key={role}
                            className={`role-selection-card ${selectedRole === role ? 'selected' : ''}`}
                            onClick={() => setSelectedRole(role)}
                            disabled={loading}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            <div className="role-selection-card-content">
                                <div className="role-selection-card-main">
                                    <div className="role-selection-card-label">
                                        {getRoleLabel(role)}
                                    </div>
                                    <div className="role-selection-card-description">
                                        {getRoleDescription(role)}
                                    </div>
                                </div>
                                <div className="role-selection-card-indicator">
                                    {selectedRole === role && (
                                        <div className="role-selection-check">
                                            <Check size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="role-selection-actions">
                    <button
                        className="role-selection-button"
                        onClick={handleRoleSelection}
                        disabled={loading || !selectedRole}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Caricamento...</span>
                            </>
                        ) : (
                            <span>Continua</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelectionPage;

