import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar as CalendarIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Cocchi.css';

const Cocchi: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [timeRange, setTimeRange] = useState<6 | 12>(6);

    // Mock data
    const projects = [
        { id: '1', name: 'Progetto Alpha', saldo: 15000, entrate: 30000, uscite: 15000 },
        { id: '2', name: 'Progetto Beta', saldo: -3500, entrate: 5000, uscite: 8500 },
        { id: '3', name: 'Progetto Gamma', saldo: 8000, entrate: 12000, uscite: 4000 },
    ];

    const riserve = {
        legali: { value: 12500, percentage: 15 },
        utili: { value: 45200, percentage: 54 },
        tasse: { value: 18300, percentage: 22 },
        spese: { value: 7800, percentage: 9 }
    };

    const entrate = [
        {
            id: 1,
            importo: 15000,
            data: '2024-12-20',
            descrizione: 'Acconto 50% Progetto Alpha',
            categoria: 'Pagamento Cliente',
            progetto: 'Progetto Alpha',
            fattura: 'FATT-2024-001'
        },
        {
            id: 3,
            importo: 8000,
            data: '2024-12-15',
            descrizione: 'Saldo finale',
            categoria: 'Pagamento Cliente',
            progetto: 'Progetto Gamma',
            fattura: 'FATT-2024-003'
        },
    ];

    const uscite = [
        {
            id: 2,
            importo: 3500,
            data: '2024-12-18',
            descrizione: 'Licenze software annuali',
            categoria: 'Fornitore',
            progetto: 'Progetto Beta',
            fattura: null
        },
    ];

    const forecastData6 = [
        { month: 'Gen', entrate: 35000, uscite: 12000 },
        { month: 'Feb', entrate: 42000, uscite: 15000 },
        { month: 'Mar', entrate: 38000, uscite: 13500 },
        { month: 'Apr', entrate: 45000, uscite: 16000 },
        { month: 'Mag', entrate: 40000, uscite: 14000 },
        { month: 'Giu', entrate: 48000, uscite: 17000 },
    ];

    const forecastData12 = [
        ...forecastData6,
        { month: 'Lug', entrate: 44000, uscite: 15500 },
        { month: 'Ago', entrate: 36000, uscite: 12000 },
        { month: 'Set', entrate: 50000, uscite: 18000 },
        { month: 'Ott', entrate: 46000, uscite: 16500 },
        { month: 'Nov', entrate: 42000, uscite: 14500 },
        { month: 'Dic', entrate: 52000, uscite: 19000 },
    ];

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCocchi = (amount: number) => amount.toLocaleString('it-IT');

    const totalEntrate = entrate.reduce((sum, e) => sum + e.importo, 0);
    const totalUscite = uscite.reduce((sum, u) => sum + u.importo, 0);
    const saldo = totalEntrate - totalUscite;

    return (
        <div className="cocchi-minimal">
            {/* Quick Actions Bar */}

            {/* Header */}
            <div className="minimal-header">
                <div>
                    <h1>Cocchi</h1>
                    <p className="subtitle">Gestione budget e riserve</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary-small" onClick={() => navigate('/cocchi/calendario')}>
                        <CalendarIcon size={16} />
                        Calendario
                    </button>
                    <button className="btn-add">
                        <Plus size={18} />
                        Nuova
                    </button>
                </div>
            </div>

            {/* Balance Row */}
            <div className="balance-row">
                <div className="balance-item">
                    <span className="balance-label">Entrate</span>
                    <span className="balance-value positive">+{formatCocchi(totalEntrate)}</span>
                </div>
                <div className="balance-divider" />
                <div className="balance-item">
                    <span className="balance-label">Uscite</span>
                    <span className="balance-value negative">−{formatCocchi(totalUscite)}</span>
                </div>
                <div className="balance-divider" />
                <div className="balance-item">
                    <span className="balance-label">Saldo</span>
                    <span className={`balance-value ${saldo >= 0 ? 'positive' : 'negative'}`}>
                        {formatCocchi(saldo)}
                    </span>
                </div>
            </div>

            {/* Search Projects */}
            <div className="search-section">
                <div className="search-input-wrapper">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Cerca progetto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input-clean"
                    />
                </div>

                {searchQuery && filteredProjects.length > 0 && (
                    <div className="search-results">
                        {filteredProjects.map(project => (
                            <div
                                key={project.id}
                                className="project-result-card"
                                onClick={() => navigate(`/cocchi/progetto/${project.id}`)}
                            >
                                <div className="project-result-name">{project.name}</div>
                                <div className="project-result-stats">
                                    <span className="stat-mini positive">↑ {formatCocchi(project.entrate)}</span>
                                    <span className="stat-mini negative">↓ {formatCocchi(project.uscite)}</span>
                                    <span className={`stat-mini ${project.saldo >= 0 ? 'positive' : 'negative'}`}>
                                        = {formatCocchi(project.saldo)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Riserve */}
            <div className="section-wrapper">
                <h2 className="section-title">Riserve</h2>
                <div className="riserve-grid">
                    <div className="riserva-card">
                        <div className="riserva-header">
                            <span className="riserva-name">Legali</span>
                            <span className="riserva-percent">{riserve.legali.percentage}%</span>
                        </div>
                        <div className="riserva-value">{formatCocchi(riserve.legali.value)}</div>
                    </div>

                    <div className="riserva-card">
                        <div className="riserva-header">
                            <span className="riserva-name">Utili</span>
                            <span className="riserva-percent">{riserve.utili.percentage}%</span>
                        </div>
                        <div className="riserva-value">{formatCocchi(riserve.utili.value)}</div>
                    </div>

                    <div className="riserva-card">
                        <div className="riserva-header">
                            <span className="riserva-name">Tasse</span>
                            <span className="riserva-percent">{riserve.tasse.percentage}%</span>
                        </div>
                        <div className="riserva-value">{formatCocchi(riserve.tasse.value)}</div>
                    </div>

                    <div className="riserva-card">
                        <div className="riserva-header">
                            <span className="riserva-name">Spese</span>
                            <span className="riserva-percent">{riserve.spese.percentage}%</span>
                        </div>
                        <div className="riserva-value">{formatCocchi(riserve.spese.value)}</div>
                    </div>
                </div>
            </div>

            {/* Forecast */}
            <div className="section-wrapper">
                <div className="section-header-inline">
                    <h2 className="section-title">Prospetto</h2>
                    <div className="time-range-toggle">
                        <button
                            className={timeRange === 6 ? 'active' : ''}
                            onClick={() => setTimeRange(6)}
                        >
                            6 mesi
                        </button>
                        <button
                            className={timeRange === 12 ? 'active' : ''}
                            onClick={() => setTimeRange(12)}
                        >
                            12 mesi
                        </button>
                    </div>
                </div>

                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={timeRange === 6 ? forecastData6 : forecastData12}>
                            <XAxis
                                dataKey="month"
                                stroke="var(--color-text-quaternary)"
                                style={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="var(--color-text-quaternary)"
                                style={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--color-bg-elevated)',
                                    border: '1px solid var(--color-border-secondary)',
                                    borderRadius: 'var(--radius-lg)',
                                    fontSize: 12
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="entrate"
                                stroke="var(--color-success)"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="uscite"
                                stroke="var(--color-error)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2-Column Transactions (iPhone style) */}
            <div className="section-wrapper">
                <h2 className="section-title">Transazioni</h2>
                <div className="transactions-two-column">
                    {/* Colonna Entrate */}
                    <div className="transaction-column">
                        <div className="column-header entrate">Entrate</div>
                        <div className="transaction-items">
                            {entrate.map(t => (
                                <div
                                    key={t.id}
                                    className="transaction-item-compact"
                                    onClick={() => navigate(`/cocchi/transazione/${t.id}`)}
                                >
                                    <div className="transaction-compact-desc">{t.descrizione}</div>
                                    <div className="transaction-compact-meta">
                                        {t.categoria} • {t.progetto} • {new Date(t.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="transaction-compact-amount positive">
                                        +{formatCocchi(t.importo)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colonna Uscite */}
                    <div className="transaction-column">
                        <div className="column-header uscite">Uscite</div>
                        <div className="transaction-items">
                            {uscite.map(t => (
                                <div
                                    key={t.id}
                                    className="transaction-item-compact"
                                    onClick={() => navigate(`/cocchi/transazione/${t.id}`)}
                                >
                                    <div className="transaction-compact-desc">{t.descrizione}</div>
                                    <div className="transaction-compact-meta">
                                        {t.categoria} • {t.progetto} • {new Date(t.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="transaction-compact-amount negative">
                                        −{formatCocchi(t.importo)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cocchi;
