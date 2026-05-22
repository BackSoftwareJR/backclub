// Token storage utilities
export const storeToken = (token: string): void => {
    localStorage.setItem('access_token', token);
};

export const getToken = (): string | null => {
    return localStorage.getItem('access_token');
};

export const removeToken = (): void => {
    localStorage.removeItem('access_token');
};

// User storage utilities
export const storeUser = (user: any): void => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getStoredUser = (): any | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const removeUser = (): void => {
    localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// Clear all auth data
export const clearAuth = (): void => {
    removeToken();
    removeUser();
    removeRoleChangeFlag();
};

// Role change flag utilities (per gestire il cambio ruolo durante il reload)
export const setRoleChangeFlag = (targetRoute: string): void => {
    localStorage.setItem('role_change_target', targetRoute);
    localStorage.setItem('role_change_timestamp', Date.now().toString());
};

export const getRoleChangeFlag = (): string | null => {
    const target = localStorage.getItem('role_change_target');
    const timestamp = localStorage.getItem('role_change_timestamp');
    
    // Rimuovi il flag se è più vecchio di 5 secondi (per evitare loop infiniti)
    if (timestamp && Date.now() - parseInt(timestamp) > 5000) {
        removeRoleChangeFlag();
        return null;
    }
    
    return target;
};

export const removeRoleChangeFlag = (): void => {
    localStorage.removeItem('role_change_target');
    localStorage.removeItem('role_change_timestamp');
};
