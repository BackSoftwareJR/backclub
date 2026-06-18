import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/axios';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'dipendente' | 'freelance' | 'project_manager' | 'project_master' | 'admin' | 'segreteria' | 'risorse_umane' | 'clienti' | 'venditori' | 'commercialista';
    avatar?: string;
    has_consented?: boolean;
    consent_agreed_at?: string;
    roles?: string[]; // Ruoli multipli
    all_roles?: string[]; // Tutti i ruoli (incluso primario)
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, redirectRoute?: string) => void;
    logout: () => void;
    isLoading: boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    canAccessSecreteria: () => boolean;
    canAccessMaster: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            if (token) {
                try {
                    const response = await api.get('/me');
                    // Assicurati che i dati siano nel formato corretto
                    if (response.data && response.data.id) {
                        setUser({
                            id: response.data.id,
                            name: response.data.name,
                            email: response.data.email,
                            role: response.data.role,
                            avatar: response.data.avatar,
                            has_consented: response.data.has_consented,
                            consent_agreed_at: response.data.consent_agreed_at,
                            roles: response.data.roles || [],
                            all_roles: response.data.all_roles || [response.data.role],
                        });
                    } else {
                        throw new Error('Invalid user data');
                    }
                } catch (error: any) {
                    console.error('Failed to load user', error);
                    // Se è un errore 401, rimuovi il token
                    if (error.response?.status === 401) {
                        localStorage.removeItem('auth_token');
                        setToken(null);
                        setUser(null);
                    }
                }
            }
            setIsLoading(false);
        }

        loadUser();
    }, [token]);

    const login = (newToken: string, newUser: User, redirectRoute?: string) => {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken);
        setUser(newUser);
        
        // Redirect basato su ruolo se specificato
        if (redirectRoute) {
            window.location.hash = redirectRoute;
        }
    };

    const hasRole = (role: string): boolean => {
        if (!user) return false;
        if (user.role === role) return true;
        return user.all_roles?.includes(role) || false;
    };

    const hasAnyRole = (roles: string[]): boolean => {
        if (!user) return false;
        if (roles.includes(user.role)) return true;
        return roles.some(role => user.all_roles?.includes(role)) || false;
    };

    const canAccessSecreteria = (): boolean => {
        return hasAnyRole(['segreteria', 'admin', 'project_master']);
    };

    const canAccessMaster = (): boolean => {
        return hasAnyRole(['admin', 'project_master']);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Logout failed', error);
        }
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            isLoading,
            hasRole,
            hasAnyRole,
            canAccessSecreteria,
            canAccessMaster,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
