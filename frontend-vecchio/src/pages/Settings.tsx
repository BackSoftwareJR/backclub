import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Shield, Key, CreditCard, Server, AlertTriangle, CheckCircle, Activity, Globe } from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';

export default function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(user?.role === 'freelance' ? 'password' : 'security');
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({ active_users: 0, failed_logins: 0 });
    const [isLoading, setIsLoading] = useState(false);

    // Password form state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (activeTab === 'security' && user?.role !== 'freelance') {
            fetchSecurityData();
        }
    }, [activeTab, user]);

    const fetchSecurityData = async () => {
        setIsLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                api.get('/security/logs'),
                api.get('/security/stats')
            ]);
            setLogs(logsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch security data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (passwordData.new_password !== passwordData.new_password_confirmation) {
            setPasswordMessage({ type: 'error', text: 'Le password non coincidono.' });
            return;
        }

        try {
            await api.put('/user/password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
                new_password_confirmation: passwordData.new_password_confirmation
            });
            setPasswordMessage({ type: 'success', text: 'Password aggiornata con successo.' });
            setPasswordData({ current_password: '', new_password: '', new_password_confirmation: '' });
        } catch (error: any) {
            setPasswordMessage({
                type: 'error',
                text: error.response?.data?.message || 'Errore durante l\'aggiornamento della password.'
            });
        }
    };

    const tabs = user?.role === 'freelance'
        ? [
            { id: 'password', label: 'Password', icon: Key }
        ]
        : [
            { id: 'security', label: 'Sicurezza', icon: Shield },
            { id: 'license', label: 'Licenza', icon: Key },
            { id: 'subscription', label: 'Abbonamento', icon: CreditCard },
            { id: 'password', label: 'Password', icon: Key }, // Optional for admins too
        ];

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Impostazioni</h1>
                <p className="text-slate-400 mt-2">
                    {user?.role === 'freelance' ? 'Gestisci la tua password' : 'Gestisci sicurezza, licenza e abbonamento'}
                </p>
            </div>

            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl mb-8 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
              flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'password' && (
                <div className="max-w-md mx-auto md:mx-0 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-card p-8 rounded-xl">
                        <h2 className="text-xl font-bold text-white mb-6">Modifica Password</h2>

                        {passwordMessage && (
                            <div className={`p-4 rounded-lg mb-6 text-sm ${passwordMessage.type === 'success'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Password Attuale</label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nuova Password</label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Conferma Nuova Password</label>
                                <input
                                    type="password"
                                    value={passwordData.new_password_confirmation}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <Button type="submit" className="w-full mt-2">
                                Aggiorna Password
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'security' && user?.role !== 'freelance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-6 rounded-xl border-l-4 border-l-green-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Utenti Attivi (24h)</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{stats.active_users}</h3>
                                </div>
                                <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                                    <Activity className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-6 rounded-xl border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Login Falliti (24h)</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{stats.failed_logins}</h3>
                                </div>
                                <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-6 rounded-xl border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Stato Sistema</p>
                                    <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        Sicuro
                                    </h3>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Shield className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Log di Accesso</h3>
                            <p className="text-slate-400 text-sm">Monitora gli accessi recenti al sistema</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Utente</th>
                                        <th className="px-6 py-4">IP Address</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">User Agent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">Caricamento log...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">Nessun log trovato.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {log.user ? log.user.name : <span className="text-slate-500 italic">Sconosciuto</span>}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{log.ip_address}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'success'
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                        {log.status === 'success' ? 'Successo' : 'Fallito'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-4 max-w-xs truncate" title={log.user_agent}>{log.user_agent}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'license' && user?.role !== 'freelance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-card p-8 rounded-xl text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                            <Server className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Licenza Software Proprietaria</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                            Questo software è di proprietà esclusiva di <strong>Back Club</strong> ed è attualmente ospitato sui nostri server sicuri.
                            Questa versione è concessa in licenza d'uso e non può essere rivenduta commercialmente.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                    <Globe className="w-5 h-5 mr-2 text-blue-400" />
                                    Hosting Gestito (Attuale)
                                </h3>
                                <ul className="space-y-3 text-slate-400 text-sm">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                        <span>Manutenzione e aggiornamenti di sicurezza inclusi</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                        <span>Backup giornalieri automatici</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                        <span>Supporto tecnico prioritario</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600/20 to-transparent w-24 h-full" />
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                    <Server className="w-5 h-5 mr-2 text-purple-400" />
                                    Self-Hosting (Opzionale)
                                </h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    È possibile acquistare la licenza per ospitare il software sul proprio server, database e dominio.
                                </p>
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Costo Trasferimento</span>
                                        <span className="text-white font-bold">600€ (una tantum)</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Tempo Stimato</span>
                                        <span className="text-white font-bold">2 Giorni Lavorativi</span>
                                    </div>
                                </div>
                                <Button className="w-full">Richiedi Trasferimento</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'subscription' && user?.role !== 'freelance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-card p-8 rounded-xl border border-green-500/30 bg-green-500/5">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Abbonamento Attivo</h2>
                                    <p className="text-green-400 font-medium">Piano "Gift Code" - Accesso Completo</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400 text-sm">Prossimo rinnovo</p>
                                <p className="text-white font-bold text-lg">Indeterminato</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-6">Dettaglio Costi Operativi</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-950 rounded-lg border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <Server className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-white font-medium">Server & Infrastruttura</p>
                                        <p className="text-slate-500 text-xs">Manutenzione, Sicurezza, Hosting</p>
                                    </div>
                                </div>
                                <span className="text-white font-bold">40€ / mese</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-950 rounded-lg border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <p className="text-white font-medium">Servizio SMTP Email</p>
                                        <p className="text-slate-500 text-xs">Invio notifiche e comunicazioni</p>
                                    </div>
                                </div>
                                <span className="text-white font-bold">Incluso</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">Totale Mensile</span>
                            <span className="text-2xl font-bold text-white">40€</span>
                        </div>
                        <p className="text-center text-slate-500 text-xs mt-4">
                            Questo importo copre i costi minimi di manutenzione server, sicurezza e gestione errori.
                        </p>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

// Helper icon component since Mail was missing in imports
function Mail(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    )
}
