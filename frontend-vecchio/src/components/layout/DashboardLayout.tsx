import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';

export function DashboardLayout({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Sidebar />
            <Header />
            <main className="pl-64 pt-16 min-h-screen flex flex-col">
                <div className="p-8 max-w-7xl mx-auto flex-1 w-full">
                    {children}
                </div>
                <footer className="p-6 border-t border-slate-800 mt-auto">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <Logo size="sm" />
                        <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
                            <p>
                                Progetto realizzato da <a href="https://backclub.it" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Back Club</a>
                            </p>
                            <div className="flex flex-col items-center gap-1">
                                <a href="#/privacy-terms" className="hover:text-slate-300 transition-colors">Termini e Condizioni</a>
                                {user?.consent_agreed_at && (
                                    <span className="text-slate-600">
                                        Consenso espresso il: {new Date(user.consent_agreed_at).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
