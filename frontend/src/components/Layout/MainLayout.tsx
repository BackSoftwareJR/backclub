import React from 'react';
import type { ReactNode } from 'react';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import VenditoriSidebar from '../VenditoriSidebar/VenditoriSidebar.tsx';
import GlobalContextMenu from '../ContextMenu/GlobalContextMenu.tsx';
import { useScrollRestoration } from '../../hooks/useScrollRestoration.ts';
import './MainLayout.css';

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    // Usa lo scroll restoration per salvare/ripristinare la posizione
    useScrollRestoration();

    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-content-wrapper">
                <Header />
                <main className="page-content" data-global-menu>
                    {children}
                </main>
            </div>
            <VenditoriSidebar />
            <GlobalContextMenu />
        </div>
    );
};

export default MainLayout;
