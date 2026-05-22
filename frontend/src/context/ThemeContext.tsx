import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme; // The actual theme being applied (light or dark)
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    syncWithUser: (userTheme?: string) => void; // Method to sync with user preferences
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to get system preference
const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Helper to resolve theme (system -> light/dark)
const resolveTheme = (theme: Theme): ResolvedTheme => {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
};

// Apply theme to document immediately (before React renders)
const applyThemeToDocument = (resolved: ResolvedTheme) => {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
        // Force a repaint to ensure theme is applied
        document.documentElement.style.colorScheme = resolved;
    }
};

// Initialize theme immediately on load (before React)
if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('preferred_theme') as Theme | null;
    const theme = savedTheme || 'system';
    const resolved = resolveTheme(theme);
    applyThemeToDocument(resolved);
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system';
        return (localStorage.getItem('preferred_theme') as Theme) || 'system';
    });
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
        if (typeof window === 'undefined') return 'dark';
        const savedTheme = localStorage.getItem('preferred_theme') as Theme | null;
        return resolveTheme(savedTheme || 'system');
    });

    // Apply theme to document immediately when it changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const resolved = resolveTheme(theme);
        setResolvedTheme(resolved);
        applyThemeToDocument(resolved);
        localStorage.setItem('theme', theme);
        localStorage.setItem('preferred_theme', theme);
    }, [theme]);

    // Listen for system theme changes when theme is 'system'
    useEffect(() => {
        if (typeof window === 'undefined' || theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const resolved = resolveTheme('system');
            setResolvedTheme(resolved);
            applyThemeToDocument(resolved);
        };

        // Set initial value
        handleChange();

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [theme]);

    // Sync with user preferences from API
    const syncWithUser = useCallback((userTheme?: string) => {
        if (!userTheme) return;
        
        const validTheme = ['light', 'dark', 'system'].includes(userTheme) 
            ? (userTheme as Theme) 
            : 'system';
        
        if (validTheme !== theme) {
            setThemeState(validTheme);
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        setThemeState(prev => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'light';
            // If system, toggle to opposite of current resolved theme
            return resolvedTheme === 'dark' ? 'light' : 'dark';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, syncWithUser }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
