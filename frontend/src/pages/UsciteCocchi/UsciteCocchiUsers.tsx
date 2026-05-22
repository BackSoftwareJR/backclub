import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users as UsersIcon, Clock, DollarSign, Briefcase } from 'lucide-react';
import { userManagementApi, type UserSearchResult } from '../../api/userManagement';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import './UsciteCocchiUsers.css';

const UsciteCocchiUsers: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        role: '',
        status: '',
    });

    const doSearch = useCallback(async (query: string, currentFilters: typeof filters) => {
        try {
            setLoading(true);
            const response = await userManagementApi.search({
                q: query,
                ...currentFilters,
            });
            setUsers(response.data || []);
        } catch (err) {
            console.error('Search error:', err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedSearch = useDebouncedCallback(doSearch, 500);

    useEffect(() => {
        debouncedSearch(searchQuery, filters);
    }, [searchQuery, filters, debouncedSearch]);

    const totalHours = users.reduce((sum, u) => sum + (u.total_hours || 0), 0);
    const totalPayments = users.reduce((sum, u) => sum + (u.total_payments || 0), 0);
    const activeUsers = users.filter(u => u.is_active === 1).length;

    return (
        <div className="users-page">
            {/* Header */}
            <div className="users-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Indietro
                </button>
                <h1>Gestione Utenti</h1>
            </div>

            {/* KPIs */}
            <div className="users-kpis">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' }}>
                        <UsersIcon size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Utenti Attivi</p>
                        <h3 className="kpi-value">{activeUsers}</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)' }}>
                        <Clock size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Ore Totali</p>
                        <h3 className="kpi-value">{totalHours.toFixed(1)}h</h3>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Pagamenti</p>
                        <h3 className="kpi-value">€ {totalPayments.toLocaleString('it-IT')}</h3>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="search-filters">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Cerca utenti..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filters">
                    <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                        <option value="">Tutti i ruoli</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="developer">Developer</option>
                        <option value="designer">Designer</option>
                    </select>

                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">Tutti gli status</option>
                        <option value="active">Attivo</option>
                        <option value="inactive">Inattivo</option>
                    </select>
                </div>
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="loading-state">Caricamento...</div>
            ) : users.length === 0 && !searchQuery && !filters.role && !filters.status ? (
                <div className="empty-state">
                    <h3>Backend non ancora deployato</h3>
                    <p>Upload UserManagementController.php ed esegui user_management_schema.sql</p>
                </div>
            ) : users.length === 0 ? (
                <div className="empty-state">Nessun utente trovato</div>
            ) : (
                <div className="users-grid">
                    {users.map(user => (
                        <div
                            key={user.id}
                            className="user-card"
                            onClick={() => navigate(`/uscite-cocchi/users/${user.id}`)}
                        >
                            <div className="user-header">
                                <div className="user-avatar">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <h3>{user.name}</h3>
                                    <p>{user.email}</p>
                                </div>
                            </div>

                            <div className="user-stats">
                                <div className="stat">
                                    <Clock size={16} />
                                    <span>{user.total_hours?.toFixed(1) || 0}h</span>
                                </div>
                                <div className="stat">
                                    <DollarSign size={16} />
                                    <span>€ {user.total_payments?.toLocaleString('it-IT') || 0}</span>
                                </div>
                                <div className="stat">
                                    <Briefcase size={16} />
                                    <span>{user.active_projects || 0} progetti</span>
                                </div>
                            </div>

                            <div className="user-badges">
                                <span className={`badge role-${user.role}`}>{user.role}</span>
                                <span className={`badge status-${user.is_active === 1 ? 'active' : 'inactive'}`}>
                                    {user.is_active === 1 ? 'active' : 'inactive'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UsciteCocchiUsers;
