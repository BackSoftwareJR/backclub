import React, { useState, useEffect, useRef } from 'react';
import { Shield, Globe, Terminal as TerminalIcon, Check, X, Activity } from 'lucide-react';
import './Impostazioni.css';

type TabType = 'security' | 'api' | 'terminal-cocchi' | 'terminal-notifiche';

interface LogEntry {
    id: number;
    timestamp: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
}

const Impostazioni: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('security');
    const [cocchiLogs, setCocchiLogs] = useState<LogEntry[]>([]);
    const [notificheLogs, setNotificheLogs] = useState<LogEntry[]>([]);
    const cocchiTerminalRef = useRef<HTMLDivElement>(null);
    const notificheTerminalRef = useRef<HTMLDivElement>(null);

    // Mock Data - Access Logs
    const accessLogs = [
        { id: 1, user: 'Admin', action: 'Login', ip: '192.168.1.100', timestamp: '2025-01-27 21:45:12', status: 'success' },
        { id: 2, user: 'Mario Rossi', action: 'View Project', ip: '10.0.0.45', timestamp: '2025-01-27 21:40:33', status: 'success' },
        { id: 3, user: 'Unknown', action: 'Failed Login', ip: '203.0.113.5', timestamp: '2025-01-27 21:35:01', status: 'failed' },
        { id: 4, user: 'Laura Bianchi', action: 'Update Client', ip: '10.0.0.22', timestamp: '2025-01-27 21:30:15', status: 'success' },
    ];

    // Mock Data - API Endpoints
    const endpoints = [
        { path: '/api/auth/login', method: 'POST', status: 'active', lastCall: '2 min ago' },
        { path: '/api/projects', method: 'GET', status: 'active', lastCall: '5 min ago' },
        { path: '/api/cocchi/transfer', method: 'POST', status: 'active', lastCall: '1 min ago' },
        { path: '/api/clients', method: 'GET', status: 'active', lastCall: '10 min ago' },
        { path: '/api/tickets/create', method: 'POST', status: 'active', lastCall: '3 min ago' },
        { path: '/api/reports', method: 'GET', status: 'limited', lastCall: '30 min ago' },
    ];

    // Simulate real-time Cocchi logs
    useEffect(() => {
        if (activeTab !== 'terminal-cocchi') return;

        const interval = setInterval(() => {
            const actions = [
                { type: 'success', msg: '✓ Cocchi IN: €250 da Cliente Tech Solutions (ID: #1234)' },
                { type: 'info', msg: '→ Cocchi TRANSFER: €150 da Progetto A a Riserva Legale' },
                { type: 'success', msg: '✓ Cocchi IN: €500 da Contratto CRM Enterprise (ID: #5678)' },
                { type: 'warning', msg: '↓ Cocchi OUT: €300 per Pagamento Freelance Marco Neri' },
                { type: 'info', msg: '→ Cocchi TRANSFER: €100 da Riserva Cocchi a R&D' },
                { type: 'success', msg: '✓ Cocchi IN: €1200 da Vendita Sito Web Startup Innovativa' },
            ];

            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            const now = new Date();
            const timestamp = now.toTimeString().split(' ')[0];

            const newLog: LogEntry = {
                id: Date.now(),
                timestamp,
                type: randomAction.type as 'success' | 'warning' | 'error' | 'info',
                message: randomAction.msg
            };

            setCocchiLogs(prev => [...prev.slice(-50), newLog]);
        }, 3000);

        return () => clearInterval(interval);
    }, [activeTab]);

    // Simulate real-time Notifiche logs
    useEffect(() => {
        if (activeTab !== 'terminal-notifiche') return;

        const interval = setInterval(() => {
            const actions = [
                { type: 'info', msg: '📋 Nuovo Ticket: "Bug login form" creato da Laura Bianchi' },
                { type: 'success', msg: '✓ Task Completato: "Design homepage" da Sofia Russo (Progetto: Sito Web)' },
                { type: 'warning', msg: '⚠ Admin Alert: Scadenza imminente Progetto CRM Enterprise (3 giorni)' },
                { type: 'info', msg: '📨 Nuova Richiesta: Approvazione sconto 20% da Venditore Giovanni Verdi' },
                { type: 'success', msg: '✓ Task Completato: "Integrazione API" da Marco Neri' },
                { type: 'error', msg: '✗ Ticket Escalation: "Performance Issue" non risolto da 48h' },
                { type: 'info', msg: '📅 Reminder: Call cliente domani ore 15:00 (Progetto: App Mobile)' },
            ];

            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            const now = new Date();
            const timestamp = now.toTimeString().split(' ')[0];

            const newLog: LogEntry = {
                id: Date.now(),
                timestamp,
                type: randomAction.type as any,
                message: randomAction.msg
            };

            setNotificheLogs(prev => [...prev.slice(-50), newLog]);
        }, 2500);

        return () => clearInterval(interval);
    }, [activeTab]);

    // Auto-scroll terminals
    useEffect(() => {
        if (cocchiTerminalRef.current) {
            cocchiTerminalRef.current.scrollTop = cocchiTerminalRef.current.scrollHeight;
        }
    }, [cocchiLogs]);

    useEffect(() => {
        if (notificheTerminalRef.current) {
            notificheTerminalRef.current.scrollTop = notificheTerminalRef.current.scrollHeight;
        }
    }, [notificheLogs]);

    const tabs = [
        { id: 'security', label: 'Sicurezza & Accessi', icon: Shield },
        { id: 'api', label: 'API Endpoints', icon: Globe },
        { id: 'terminal-cocchi', label: 'Terminal Cocchi Live', icon: Activity },
        { id: 'terminal-notifiche', label: 'Terminal Notifiche Live', icon: TerminalIcon },
    ];

    return (
        <div className="impostazioni-page">

            {/* Header */}
            <div className="impostazioni-header">
                <h1>Impostazioni Sistema</h1>
                <p className="subtitle">Gestione sicurezza, monitoraggio endpoint e terminali live</p>
            </div>

            {/* Tabs */}
            <div className="settings-tabs">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as TabType)}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="settings-content">
                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="security-section">
                        <div className="section-card">
                            <h2>Log Accessi Recenti</h2>
                            <div className="access-logs-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Utente</th>
                                            <th>Azione</th>
                                            <th>IP Address</th>
                                            <th>Timestamp</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accessLogs.map(log => (
                                            <tr key={log.id}>
                                                <td className="user-cell">{log.user}</td>
                                                <td>{log.action}</td>
                                                <td className="ip-cell">{log.ip}</td>
                                                <td>{log.timestamp}</td>
                                                <td>
                                                    <span className={`access-status ${log.status}`}>
                                                        {log.status === 'success' ? <Check size={14} /> : <X size={14} />}
                                                        {log.status === 'success' ? 'Success' : 'Failed'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="security-settings-grid">
                            <div className="setting-card">
                                <h3>Autenticazione 2FA</h3>
                                <p>Richiedi autenticazione a due fattori</p>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-card">
                                <h3>Session Timeout</h3>
                                <p>Timeout automatico dopo inattività</p>
                                <select className="setting-select">
                                    <option>15 minuti</option>
                                    <option>30 minuti</option>
                                    <option>1 ora</option>
                                </select>
                            </div>
                            <div className="setting-card">
                                <h3>IP Whitelist</h3>
                                <p>Permetti accesso solo da IP autorizzati</p>
                                <label className="toggle-switch">
                                    <input type="checkbox" />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* API Tab */}
                {activeTab === 'api' && (
                    <div className="api-section">
                        <div className="section-card">
                            <h2>Endpoint API Attivi</h2>
                            <div className="endpoints-grid">
                                {endpoints.map((endpoint, idx) => (
                                    <div key={idx} className="endpoint-card">
                                        <div className="endpoint-header">
                                            <span className={`method-badge ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                                            <span className={`status-indicator ${endpoint.status}`}>
                                                {endpoint.status === 'active' ? '🟢' : '🟡'}
                                            </span>
                                        </div>
                                        <div className="endpoint-path">{endpoint.path}</div>
                                        <div className="endpoint-meta">Last call: {endpoint.lastCall}</div>
                                        <button className="btn-test-endpoint">Test Endpoint</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Terminal Cocchi */}
                {activeTab === 'terminal-cocchi' && (
                    <div className="terminal-section">
                        <div className="terminal-header-bar">
                            <div className="terminal-title">
                                <Activity size={16} />
                                root@backclub:~/cocchi-monitor#
                            </div>
                            <div className="terminal-controls">
                                <span className="terminal-dot red"></span>
                                <span className="terminal-dot yellow"></span>
                                <span className="terminal-dot green"></span>
                            </div>
                        </div>
                        <div className="terminal-body" ref={cocchiTerminalRef}>
                            <div className="terminal-line prompt">
                                <span className="prompt-symbol">root@backclub:~#</span> cocchi-monitor --live --verbose
                            </div>
                            <div className="terminal-line">{'>'} Monitoring Cocchi transactions...</div>
                            <div className="terminal-line">{'>'} System initialized. Watching for events...</div>
                            <div className="terminal-separator">{'─'.repeat(80)}</div>
                            {cocchiLogs.map(log => (
                                <div key={log.id} className={`terminal-line log-${log.type}`}>
                                    <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
                                </div>
                            ))}
                            {cocchiLogs.length === 0 && (
                                <div className="terminal-line info">{'>'} Waiting for transactions...</div>
                            )}
                            <div className="terminal-cursor">_</div>
                        </div>
                    </div>
                )}

                {/* Terminal Notifiche */}
                {activeTab === 'terminal-notifiche' && (
                    <div className="terminal-section">
                        <div className="terminal-header-bar">
                            <div className="terminal-title">
                                <TerminalIcon size={16} />
                                root@backclub:~/notifications-monitor#
                            </div>
                            <div className="terminal-controls">
                                <span className="terminal-dot red"></span>
                                <span className="terminal-dot yellow"></span>
                                <span className="terminal-dot green"></span>
                            </div>
                        </div>
                        <div className="terminal-body" ref={notificheTerminalRef}>
                            <div className="terminal-line prompt">
                                <span className="prompt-symbol">root@backclub:~#</span> notifications-monitor --stream --all
                            </div>
                            <div className="terminal-line">{'>'} Streaming system notifications...</div>
                            <div className="terminal-line">{'>'} Listening: tickets, tasks, admin alerts</div>
                            <div className="terminal-separator">{'─'.repeat(80)}</div>
                            {notificheLogs.map(log => (
                                <div key={log.id} className={`terminal-line log-${log.type}`}>
                                    <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
                                </div>
                            ))}
                            {notificheLogs.length === 0 && (
                                <div className="terminal-line info">{'>'} Waiting for notifications...</div>
                            )}
                            <div className="terminal-cursor">_</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Impostazioni;
