import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Plus, 
    Edit, 
    Trash2, 
    Lock,
    Unlock,
    Key,
    Search,
    Filter,
    Mail,
    Phone,
    Shield,
    X,
    Check
} from 'lucide-react';
import { usersApi, type User as ApiUser, type CreateUserData, type UpdateUserData } from '../../api/users';
import { getCrmDepartments, type CrmDepartment } from '../../api/crmDepartments';
import './GestioneUtenti.css';

type User = ApiUser & { roles?: string[]; crm_departments?: Array<{id: number; code: string; name: string; color: string; icon: string}> };

const GestioneUtenti: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form states
    const [formData, setFormData] = useState<CreateUserData>({
        name: '',
        email: '',
        password: '',
        role: 'freelance',
        phone: '',
        department: '',
        is_active: true,
    });
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['freelance']);
    const [selectedCrmDepartments, setSelectedCrmDepartments] = useState<number[]>([]);
    const [crmDepartments, setCrmDepartments] = useState<CrmDepartment[]>([]);
    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadUsers();
        loadCrmDepartments();
    }, [roleFilter, statusFilter]);

    const loadCrmDepartments = async () => {
        try {
            const data = await getCrmDepartments(true); // Solo CRM attivi
            setCrmDepartments(data);
        } catch (err: any) {
            console.error('Error loading CRM departments:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const filters: { role?: string } = {};
            if (roleFilter !== 'all') {
                filters.role = roleFilter;
            }
            const data = await usersApi.getUsers(filters);
            let filteredData = Array.isArray(data) ? data : [];
            
            // Apply status filter
            if (statusFilter !== 'all') {
                filteredData = filteredData.filter((user: User) => {
                    if (statusFilter === 'active') return user.is_active === 1;
                    if (statusFilter === 'inactive') return user.is_active === 0;
                    return true;
                });
            }
            
            setUsers(filteredData);
        } catch (err: any) {
            console.error('Error loading users:', err);
            alert('Errore nel caricamento degli utenti');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleOpenCreateModal = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'freelance',
            phone: '',
            department: '',
            is_active: true,
        });
        setSelectedRoles(['freelance']);
        setSelectedCrmDepartments([]);
        setErrors({});
        setIsEditing(false);
        setSelectedUser(null);
        setShowUserModal(true);
    };

    const handleOpenEditModal = (user: User) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone || '',
            department: user.department || '',
            is_active: user.is_active === 1,
        });
        // Load user roles if available
        setSelectedRoles(user.roles && user.roles.length > 0 ? user.roles : [user.role]);
        // Load user CRM departments if available
        setSelectedCrmDepartments(user.crm_departments ? user.crm_departments.map(c => c.id) : []);
        setErrors({});
        setIsEditing(true);
        setSelectedUser(user);
        setShowUserModal(true);
    };

    const handleCloseModal = () => {
        setShowUserModal(false);
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'freelance',
            phone: '',
            department: '',
            is_active: true,
        });
        setSelectedRoles(['freelance']);
        setSelectedCrmDepartments([]);
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.name.trim()) {
            newErrors.name = 'Il nome è obbligatorio';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'L\'email è obbligatoria';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }
        
        if (!isEditing && !formData.password) {
            newErrors.password = 'La password è obbligatoria';
        } else if (formData.password && formData.password.length < 8) {
            newErrors.password = 'La password deve essere di almeno 8 caratteri';
        }
        
        if (selectedRoles.length === 0) {
            newErrors.roles = 'Seleziona almeno un ruolo';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        try {
            if (isEditing && selectedUser) {
                const updateData: UpdateUserData & { roles?: string[]; crm_department_ids?: number[] } = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone || undefined,
                    is_active: formData.is_active,
                    roles: selectedRoles,
                    crm_department_ids: selectedCrmDepartments,
                };
                
                if (formData.password) {
                    updateData.password = formData.password;
                }
                
                await usersApi.updateUser(selectedUser.id, updateData);
            } else {
                // When creating, password is required (validated in validateForm)
                if (!formData.password) {
                    setErrors({ password: 'La password è obbligatoria' });
                    return;
                }
                const createData = {
                    ...formData,
                    roles: selectedRoles,
                    crm_department_ids: selectedCrmDepartments,
                } as CreateUserData & { password: string; roles: string[]; crm_department_ids: number[] };
                await usersApi.createUser(createData);
            }
            
            await loadUsers();
            handleCloseModal();
        } catch (err: any) {
            console.error('Error saving user:', err);
            const errorMessage = err.response?.data?.message || 'Errore nel salvataggio dell\'utente';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Sei sicuro di voler eliminare l'utente ${user.name}?`)) {
            return;
        }
        
        setLoading(true);
        try {
            await usersApi.deleteUser(user.id);
            await loadUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert('Errore nell\'eliminazione dell\'utente');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAccess = async (user: User) => {
        setLoading(true);
        try {
            await usersApi.toggleUserAccess(user.id);
            await loadUsers();
        } catch (err: any) {
            console.error('Error toggling access:', err);
            alert('Errore nella modifica dello stato dell\'utente');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPasswordModal = (user: User) => {
        setSelectedUser(user);
        setPasswordData({ password: '', confirmPassword: '' });
        setErrors({});
        setShowPasswordModal(true);
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setSelectedUser(null);
        setPasswordData({ password: '', confirmPassword: '' });
        setErrors({});
    };

    const validatePasswordForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (!passwordData.password) {
            newErrors.password = 'La password è obbligatoria';
        } else if (passwordData.password.length < 8) {
            newErrors.password = 'La password deve essere di almeno 8 caratteri';
        }
        
        if (passwordData.password !== passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Le password non corrispondono';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validatePasswordForm() || !selectedUser) {
            return;
        }
        
        setLoading(true);
        try {
            await usersApi.resetUserPassword(selectedUser.id, passwordData.password);
            handleClosePasswordModal();
            alert('Password aggiornata con successo');
        } catch (err: any) {
            console.error('Error resetting password:', err);
            alert('Errore nell\'aggiornamento della password');
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Amministratore',
            freelance: 'Freelance',
            client: 'Cliente',
            venditori: 'Venditore',
        };
        return labels[role] || role;
    };

    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active === 1).length,
        inactive: users.filter(u => u.is_active === 0).length,
        byRole: {
            admin: users.filter(u => u.role === 'admin').length,
            freelance: users.filter(u => u.role === 'freelance').length,
            venditori: users.filter(u => u.role === 'venditori').length,
            client: users.filter(u => u.role === 'client').length,
        }
    };

    return (
        <div className="gestione-utenti-page">
            {/* Header */}
            <div className="gestione-utenti-header">
                <div>
                    <h1>Gestione Team e Utenti</h1>
                    <p className="subtitle">Gestisci utenti, ruoli e permessi di accesso</p>
                </div>
                <button 
                    className="btn-primary"
                    onClick={handleOpenCreateModal}
                    disabled={loading}
                >
                    <Plus size={16} />
                    Nuovo Utente
                </button>
            </div>

            {/* Stats */}
            <div className="gestione-utenti-stats">
                <div className="stat-card">
                    <Users size={20} />
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Totale Utenti</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Check size={20} />
                    <div>
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Attivi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <X size={20} />
                    <div>
                        <div className="stat-value">{stats.inactive}</div>
                        <div className="stat-label">Sospesi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Shield size={20} />
                    <div>
                        <div className="stat-value">{stats.byRole.admin}</div>
                        <div className="stat-label">Amministratori</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="gestione-utenti-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cerca per nome o email..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select 
                        value={roleFilter} 
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">Tutti i ruoli</option>
                        <option value="admin">Amministratore</option>
                        <option value="freelance">Freelance</option>
                        <option value="venditori">Venditore</option>
                        <option value="client">Cliente</option>
                    </select>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tutti gli stati</option>
                        <option value="active">Attivi</option>
                        <option value="inactive">Sospesi</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="gestione-utenti-table-container">
                {loading && !users.length ? (
                    <div className="loading-state">Caricamento...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Nessun utente trovato</p>
                    </div>
                ) : (
                    <table className="gestione-utenti-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Ruolo</th>
                                <th>Telefono</th>
                                <th>CRM Departments</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-small">
                                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span>{user.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="email-cell">
                                            <Mail size={14} />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="roles-cell">
                                            {user.roles && user.roles.length > 0 ? (
                                                user.roles.map((role: string) => (
                                                    <span key={role} className={`role-badge role-${role}`}>
                                                        {getRoleLabel(role)}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className={`role-badge role-${user.role}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {user.phone ? (
                                            <div className="phone-cell">
                                                <Phone size={14} />
                                                {user.phone}
                                            </div>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="crm-departments-cell">
                                            {user.crm_departments && user.crm_departments.length > 0 ? (
                                                user.crm_departments.map((crm) => (
                                                    <span 
                                                        key={crm.id} 
                                                        className="crm-badge"
                                                        style={{ 
                                                            backgroundColor: `${crm.color}20`,
                                                            borderColor: crm.color,
                                                            color: crm.color
                                                        }}
                                                    >
                                                        {crm.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${user.is_active === 1 ? 'active' : 'inactive'}`}>
                                            {user.is_active === 1 ? 'Attivo' : 'Sospeso'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleOpenEditModal(user)}
                                                title="Modifica"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleOpenPasswordModal(user)}
                                                title="Cambia Password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleToggleAccess(user)}
                                                title={user.is_active === 1 ? 'Sospendi Accesso' : 'Riattiva Accesso'}
                                            >
                                                {user.is_active === 1 ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => handleDelete(user)}
                                                title="Elimina"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{isEditing ? 'Modifica Utente' : 'Nuovo Utente'}</h2>
                            <button className="btn-close" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                {errors.email && <span className="error-text">{errors.email}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Password {isEditing ? '(lascia vuoto per non modificare)' : '*'}</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required={!isEditing}
                                />
                                {errors.password && <span className="error-text">{errors.password}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Ruoli * (puoi selezionare più ruoli)</label>
                                <div className="roles-checkbox-group">
                                    {['admin', 'freelance', 'venditori', 'client'].map((role) => (
                                        <label key={role} className="role-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedRoles.includes(role)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRoles([...selectedRoles, role]);
                                                    } else {
                                                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                                                    }
                                                }}
                                            />
                                            <span>{getRoleLabel(role)}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.roles && <span className="error-text">{errors.roles}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Telefono</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>CRM Departments (puoi selezionare più CRM)</label>
                                <div className="crm-checkbox-group">
                                    {crmDepartments.map((crm) => (
                                        <label key={crm.id} className="crm-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedCrmDepartments.includes(crm.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedCrmDepartments([...selectedCrmDepartments, crm.id]);
                                                    } else {
                                                        setSelectedCrmDepartments(selectedCrmDepartments.filter(id => id !== crm.id));
                                                    }
                                                }}
                                            />
                                            <span 
                                                className="crm-checkbox-name"
                                                style={{ 
                                                    borderLeftColor: crm.color 
                                                }}
                                            >
                                                {crm.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <span>Utente attivo</span>
                                </label>
                            </div>
                            
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                                    Annulla
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Salvataggio...' : (isEditing ? 'Aggiorna' : 'Crea')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="modal-overlay" onClick={handleClosePasswordModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cambia Password - {selectedUser.name}</h2>
                            <button className="btn-close" onClick={handleClosePasswordModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitPassword} className="modal-form">
                            <div className="form-group">
                                <label>Nuova Password *</label>
                                <input
                                    type="password"
                                    value={passwordData.password}
                                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                                    required
                                />
                                {errors.password && <span className="error-text">{errors.password}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Conferma Password *</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                />
                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                            </div>
                            
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleClosePasswordModal}>
                                    Annulla
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestioneUtenti;

