import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/user';
import { authApi } from '../api/auth';
import { storeToken, storeUser, getStoredUser, clearAuth } from '../utils/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ requiresRoleSelection?: boolean; roles?: string[]; user?: User } | void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<User | null>;
    changeRole: (role: string) => Promise<User>;
    changeCrmDepartment: (crmDepartmentId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = getStoredUser();
            if (storedUser) {
                // Imposta temporaneamente l'utente dal localStorage
                setUser(storedUser);

                // Verify token is still valid by fetching current user
                // Questo aggiorna sempre l'utente con i dati più recenti dal backend
                try {
                    const currentUser = await authApi.me();
                    // Aggiorna immediatamente lo stato e il localStorage con i dati freschi
                    setUser(currentUser);
                    storeUser(currentUser);
                } catch (error) {
                    // Token is invalid, clear auth
                    clearAuth();
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authApi.login({ email, password });
        storeToken(response.access_token);
        const userWithRoles = {
            ...response.user,
            roles: response.roles ?? response.user.roles,
        };
        storeUser(userWithRoles);
        setUser(userWithRoles);
        
        // Debug: log response to see what we're getting
        console.log('Login response:', {
            requires_role_selection: response.requires_role_selection,
            roles: response.roles,
            rolesCount: response.roles?.length || 0
        });
        
        // Return info about role selection if needed
        // ALWAYS redirect to role selection if backend says requires_role_selection is true
        // This happens when user has multiple roles (regardless of current_role)
        if (response.requires_role_selection === true) {
            console.log('Role selection required, redirecting to role-selection page');
            return {
                requiresRoleSelection: true,
                roles: response.roles || [],
                user: userWithRoles,
            };
        }
        
        console.log('Single role or no role selection needed');
        return {
            user: userWithRoles,
        };
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            try {
                const { sellerCache } = await import('../utils/sellerCache');
                sellerCache.invalidateAll();
            } catch (_) {}
            clearAuth();
            setUser(null);
        }
    };

    const refreshUser = async (): Promise<User | null> => {
        try {
            const currentUser = await authApi.me();
            setUser(currentUser);
            storeUser(currentUser);
            return currentUser;
        } catch (error) {
            console.error('Refresh user error:', error);
            clearAuth();
            setUser(null);
            return null;
        }
    };

    const changeRole = async (role: string) => {
        try {
            const response = await authApi.changeRole(role);
            // Aggiorna immediatamente lo stato e il localStorage
            setUser(response.user);
            storeUser(response.user);
            // Forza un refresh per assicurarsi che il localStorage sia sincronizzato
            return response.user;
        } catch (error) {
            console.error('Change role error:', error);
            throw error;
        }
    };

    const changeCrmDepartment = async (crmDepartmentId: number) => {
        try {
            const response = await authApi.changeCrmDepartment(crmDepartmentId);
            setUser(response.user);
            storeUser(response.user);
        } catch (error) {
            console.error('Change CRM department error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, changeRole, changeCrmDepartment }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
