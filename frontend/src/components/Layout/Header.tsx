import React, { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, LogOut, User, Settings, UserCog, Briefcase, Search, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User as UserType } from '../../types/user';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { notificationsApi, type Notification } from '../../api/notifications';
import { getActiveRole, getRoleLabel, isSellerUser, isFreelanceUser } from '../../utils/userRoles';
import SellerGlobalSearch from '../SellerGlobalSearch/SellerGlobalSearch';
import FreelanceGlobalSearch from '../FreelanceGlobalSearch/FreelanceGlobalSearch';
import './Header.css';

const Header: React.FC = () => {
    const { user, logout, changeRole, changeCrmDepartment } = useAuth();
    const { resolvedTheme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isSellerRoute = location.pathname.startsWith('/seller');
    const isFreelanceRoute = location.pathname.startsWith('/freelance');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [showCrmMenu, setShowCrmMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    const hasMultipleRoles = user?.roles && user.roles.length > 1;
    const hasCrmDepartments = user?.crm_departments && user.crm_departments.length > 0;
    const activeRole = getActiveRole(user);
    const activeRoleLabel = getRoleLabel(activeRole);
    
    const handleRoleChange = async (role: string) => {
        try {
            // Cambia ruolo e attendi che sia completato
            const updatedUser: UserType = await changeRole(role);
            setShowRoleMenu(false);
            setShowUserMenu(false);
            
            // Verifica che il ruolo sia stato aggiornato correttamente
            if (updatedUser && updatedUser.current_role === role) {
                // Naviga alla pagina di transizione cambio ruolo
                navigate(`/role-change?role=${role}`);
            } else {
                console.error('Role change verification failed', { updatedUser, expectedRole: role });
                // Fallback: ricarica la pagina corrente
                window.location.reload();
            }
        } catch (error) {
            console.error('Error changing role:', error);
        }
    };

    const handleCrmDepartmentChange = async (crmDepartmentId: number) => {
        try {
            await changeCrmDepartment(crmDepartmentId);
            setShowCrmMenu(false);
            window.location.reload(); // Reload to apply CRM changes
        } catch (error) {
            console.error('Error changing CRM department:', error);
        }
    };

    useEffect(() => {
        if (searchActive && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchActive]);

    // Close notifications dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showNotifications && !target.closest('.notifications-container')) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showNotifications]);

    // Solo il conteggio non lette al caricamento (per il badge); lista notifiche caricata all'apertura del dropdown
    useEffect(() => {
        if (!user) return;
        const loadUnreadCount = async () => {
            try {
                const countResponse = await notificationsApi.getUnreadCount();
                setUnreadCount(countResponse.data?.count ?? 0);
            } catch (error) {
                console.error('Error loading unread count:', error);
            }
        };
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Carica lista notifiche solo quando l'utente apre il dropdown (riduce richieste su ogni pagina)
    useEffect(() => {
        if (!user || !showNotifications) return;
        const loadNotifications = async () => {
            try {
                const notificationsResponse = await notificationsApi.getAll({ limit: 10 });
                setNotifications(notificationsResponse.data || []);
                const countResponse = await notificationsApi.getUnreadCount();
                setUnreadCount(countResponse.data?.count ?? 0);
            } catch (error) {
                console.error('Error loading notifications:', error);
            }
        };
        loadNotifications();
    }, [user, showNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.read_at) {
            try {
                await notificationsApi.markAsRead(notification.id);
                setNotifications(prev => 
                    prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }

        // Navigate to URL if available
        if (notification.data?.url) {
            navigate(notification.data.url);
            setShowNotifications(false);
        } else if (notification.data?.task_id) {
            navigate(`/freelance/task/${notification.data.task_id}`);
            setShowNotifications(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatNotificationTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Adesso';
        if (diffMins < 60) return `${diffMins} min fa`;
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`;
        if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'} fa`;
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };

    const getNotificationIcon = (notification: Notification) => {
        const type = notification.data?.type;
        const status = notification.data?.status;
        
        if (type === 'reschedule') {
            return status === 'approved' ? <CheckCircle2 size={16} style={{ color: '#34C759' }} /> : <XCircle size={16} style={{ color: '#FF3B30' }} />;
        } else if (type === 'deletion') {
            return status === 'approved' ? <Trash2 size={16} style={{ color: '#34C759' }} /> : <XCircle size={16} style={{ color: '#FF3B30' }} />;
        }
        return <Bell size={16} />;
    };

    const handleHeaderClick = () => {
        if (!searchActive) {
            setSearchActive(true);
        }
    };

    const handleSearchBlur = () => {
        if (searchQuery === '') {
            setSearchActive(false);
        }
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    /** Deterministic HSL gradient from the first characters of a name */
    const getAvatarGradient = (name?: string): string => {
        if (!name) return 'linear-gradient(135deg, hsl(240 70% 60%), hsl(270 65% 55%))';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h1 = Math.abs(hash) % 360;
        const h2 = (h1 + 30) % 360;
        return `linear-gradient(135deg, hsl(${h1} 68% 56%), hsl(${h2} 62% 48%))`;
    };

    return (
        <header className={`header-main ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
            {/* Apple-Style Search Bar / Seller or Freelance Global Search */}
            <div className="header-search-wrapper">
                {isSellerRoute ? (
                    <SellerGlobalSearch
                        placeholder="Cerca qui..."
                        onBlur={handleSearchBlur}
                    />
                ) : isFreelanceRoute ? (
                    <FreelanceGlobalSearch
                        placeholder="Cerca qui..."
                        onBlur={handleSearchBlur}
                    />
                ) : (
                    <div
                        className={`header-search-bar ${searchActive ? 'active' : ''}`}
                        onClick={handleHeaderClick}
                    >
                        <Search size={15} className="search-icon" />
                        {searchActive ? (
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="search-input"
                                placeholder="Cerca..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={handleSearchBlur}
                            />
                        ) : (
                            <>
                                <span className="search-placeholder">Cerca...</span>
                                <kbd className="search-kbd">⌘K</kbd>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Right Actions */}
            <div className="header-actions">
                {/* Role Badge — always visible, clickable for multi-role users */}
                {user && (
                    <button
                        className={`header-role-badge ${hasMultipleRoles ? 'clickable' : ''}`}
                        onClick={hasMultipleRoles ? () => { setShowRoleMenu(!showRoleMenu); setShowUserMenu(false); } : undefined}
                        title={hasMultipleRoles ? 'Clicca per cambiare ruolo' : `Ruolo: ${activeRoleLabel}`}
                        style={{ cursor: hasMultipleRoles ? 'pointer' : 'default' }}
                    >
                        <UserCog size={13} />
                        <span>{activeRoleLabel}</span>
                        {hasMultipleRoles && <span className="header-role-badge-dot" />}
                    </button>
                )}

                {/* Notifications */}
                <div className="notifications-container">
                    <button 
                        className="header-icon-btn" 
                        title="Notifiche"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notifications-dropdown">
                            <div className="notifications-dropdown-header">
                                <h3>Notifiche</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        className="notifications-mark-all-read"
                                        onClick={handleMarkAllAsRead}
                                    >
                                        Segna tutte come lette
                                    </button>
                                )}
                            </div>
                            <div className="notifications-list">
                                {notifications.length === 0 ? (
                                    <div className="notifications-empty">
                                        <Bell size={24} />
                                        <p>Nessuna notifica</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`notification-item ${!notification.read_at ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="notification-icon">
                                                {getNotificationIcon(notification)}
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-title">
                                                    {notification.data?.title || 'Notifica'}
                                                </div>
                                                <div className="notification-message">
                                                    {notification.data?.message || ''}
                                                </div>
                                                <div className="notification-time">
                                                    {formatNotificationTime(notification.created_at)}
                                                </div>
                                            </div>
                                            {!notification.read_at && (
                                                <div className="notification-unread-dot" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="notifications-footer">
                                <button 
                                    className="notifications-view-all"
                                    onClick={() => {
                                        navigate(isFreelanceUser(user) ? '/freelance/notifiche' : '/notifiche');
                                        setShowNotifications(false);
                                    }}
                                >
                                    Vedi tutte le notifiche
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button 
                    className="header-icon-btn" 
                    onClick={toggleTheme} 
                    title={resolvedTheme === 'dark' ? 'Attiva modalità chiara' : 'Attiva modalità scura'}
                >
                    {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* User Avatar - Elegant Circle */}
                <div className="user-menu-container">
                    <button
                        className="user-avatar-btn"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title={user?.nome || 'Utente'}
                    >
                        <div
                            className="user-avatar-circle"
                            style={{ background: getAvatarGradient(user?.nome || user?.name) }}
                        >
                            {getInitials(user?.nome || user?.name)}
                        </div>
                    </button>

                    {showUserMenu && (
                        <div className={`user-dropdown ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
                            <div className="dropdown-item">
                                <User size={16} />
                                <span>Profilo</span>
                            </div>
                            {hasMultipleRoles && (
                                <>
                                    <div className="dropdown-divider" />
                                    <div className="dropdown-item dropdown-item-role-info">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <span className="role-info-label">
                                                Ruolo Attuale
                                            </span>
                                            <span className="role-info-value">
                                                {activeRoleLabel}
                                            </span>
                                        </div>
                                    </div>
                                    <div 
                                        className="dropdown-item"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            setShowRoleMenu(true);
                                        }}
                                    >
                                        <UserCog size={16} />
                                        <span>Cambia Ruolo</span>
                                    </div>
                                </>
                            )}
                            {hasCrmDepartments && (
                                <div 
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        setShowCrmMenu(true);
                                    }}
                                >
                                    <Briefcase size={16} />
                                    <span>Gestisci CRM</span>
                                </div>
                            )}
                            <div 
                                className="dropdown-item"
                                onClick={() => {
                                    setShowUserMenu(false);
                                    if (isSellerUser(user)) {
                                        navigate('/seller/impostazioni');
                                    } else if (isFreelanceUser(user)) {
                                        navigate('/freelance/impostazioni');
                                    } else {
                                        navigate('/impostazioni');
                                    }
                                }}
                            >
                                <Settings size={16} />
                                <span>Impostazioni</span>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="dropdown-item dropdown-item-danger" onClick={logout}>
                                <LogOut size={16} />
                                <span>Logout</span>
                            </div>
                        </div>
                    )}
                    
                    {showRoleMenu && hasMultipleRoles && (
                        <div className={`role-dropdown ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
                            <div className="role-dropdown-header">
                                <span>Seleziona Ruolo</span>
                            </div>
                            {user.roles?.map((role) => (
                                <div
                                    key={role}
                                    className={`role-dropdown-item ${user.current_role === role ? 'active' : ''}`}
                                    onClick={() => handleRoleChange(role)}
                                >
                                    <span>{getRoleLabel(role)}</span>
                                    {user.current_role === role && (
                                        <span className="role-check">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {showCrmMenu && hasCrmDepartments && (
                        <div className={`role-dropdown ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
                            <div className="role-dropdown-header">
                                <span>Seleziona CRM</span>
                            </div>
                            {user.crm_departments?.map((crm) => (
                                <div
                                    key={crm.id}
                                    className={`role-dropdown-item ${user.current_crm_department?.id === crm.id ? 'active' : ''}`}
                                    onClick={() => handleCrmDepartmentChange(crm.id)}
                                    style={{
                                        borderLeft: user.current_crm_department?.id === crm.id ? `3px solid ${crm.color}` : '3px solid transparent'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span 
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: crm.color,
                                                display: 'inline-block'
                                            }}
                                        />
                                        {crm.name}
                                    </span>
                                    {user.current_crm_department?.id === crm.id && (
                                        <span className="role-check">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
