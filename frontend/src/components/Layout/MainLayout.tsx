import React from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import GlobalContextMenu from '../ContextMenu/GlobalContextMenu.tsx';
import { useScrollRestoration } from '../../hooks/useScrollRestoration.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { canAccessStaffArea, getHomeRouteForUser } from '../../utils/userRoles.ts';
import './MainLayout.css';

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user, loading } = useAuth();

    // Usa lo scroll restoration per salvare/ripristinare la posizione
    useScrollRestoration();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--color-bg-primary)',
            }}>
                <div className="animate-spin" style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid var(--color-bg-tertiary)',
                    borderTopColor: 'var(--color-accent-blue)',
                    borderRadius: '50%',
                }} />
            </div>
        );
    }

    if (user && !canAccessStaffArea(user)) {
        return <Navigate to={getHomeRouteForUser(user)} replace />;
    }

    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-content-wrapper">
                <Header />
                <main className="page-content" data-global-menu>
                    {children}
                </main>
            </div>
            <GlobalContextMenu />
        </div>
    );
};

export default MainLayout;
