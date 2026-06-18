import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCircle, ChevronRight, Mail, Phone, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getClients } from '../../api/clients';
import type { Client } from '../../api/clients';
import { sellerCache } from '../../utils/sellerCache';
import CreateClientModal from '../../components/CreateClientModal/CreateClientModal';
import GuideTour from '../../components/Guide/GuideTour';
import { clientiTourSteps, completeTourSteps } from '../../config/guideTours';
import SellerClientsMobile from './SellerClientsMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerClientsPage.css';

const SellerClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, [user?.seller_id]);

  const loadClients = async () => {
    if (!user?.seller_id) return;

    const useCache = !searchTerm;
    const cached = useCache ? sellerCache.clients.get(user.seller_id) as Client[] | null : null;
    if (cached) {
      setClients(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = { seller_id: user.seller_id };
      if (searchTerm) params.search = searchTerm;
      const clientsList = await getClients(params);
      setClients(clientsList);
      if (useCache) sellerCache.clients.set(user.seller_id, clientsList);
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadClients();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Generate initials from company name
  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // HSL avatar style — deterministic hue from name hash
  const getAvatarStyle = (name: string | undefined): React.CSSProperties => {
    if (!name) return { background: 'hsl(240, 70%, 45%)', color: '#ffffff' };
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return { background: `hsl(${hue}, 70%, 45%)`, color: '#ffffff' };
  };

  // Format date: "20 Gen 2026"
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format stats: "3 Preventivi • 1 Contratto"
  const formatStats = (client: any) => {
    const parts: string[] = [];
    const quotesCount = client.quotes_count || 0;
    const projectsCount = client.projects_count || client.crm_projects_count || 0;
    const contractsCount = client.contracts_count || 0;
    
    if (quotesCount > 0) {
      parts.push(`${quotesCount} ${quotesCount === 1 ? 'Preventivo' : 'Preventivi'}`);
    }
    if (contractsCount > 0) {
      parts.push(`${contractsCount} ${contractsCount === 1 ? 'Contratto' : 'Contratti'}`);
    }
    if (projectsCount > 0 && parts.length < 2) {
      parts.push(`${projectsCount} ${projectsCount === 1 ? 'Progetto' : 'Progetti'}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Nessuna attività';
  };

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerClientsMobile />;
  }

  if (loading) {
    return (
      <div className="seller-clients-page">
        <div className="seller-clients-header">
          <SkeletonLoader type="page-header" />
        </div>
        <div className="seller-clients-toolbar">
          <SkeletonLoader type="toolbar" />
        </div>
        <div className="seller-clients-skeleton-list">
          <SkeletonLoader type="card" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="seller-clients-page">
      <GuideTour steps={clientiTourSteps} tourId="clienti-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      {/* Header */}
      <div className="seller-clients-header">
        <div>
          <h1 className="seller-clients-title">I Miei Clienti</h1>
        </div>
        <button 
          className="seller-clients-new-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Nuovo Cliente
        </button>
      </div>

      {/* Unified Toolbar */}
      <div className="seller-clients-toolbar">
        <div className="seller-clients-search">
          <Search size={18} className="seller-clients-search-icon" />
          <input
            type="text"
            className="seller-clients-search-input"
            placeholder="Cerca cliente per nome, email, telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List Container - Finder Style */}
      {clients.length === 0 ? (
        <div className="seller-clients-empty-state">
          <UserCircle size={64} className="seller-clients-empty-icon" />
          <h3>Nessun cliente trovato</h3>
          <p>I tuoi clienti appariranno qui</p>
          <button 
            className="seller-clients-empty-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            Aggiungi il primo
          </button>
        </div>
      ) : (
        <div className="seller-clients-list">
          {clients.map((client, index) => {
            const clientAny = client as any;
            const lastQuoteDate = clientAny.last_quote_date;
            const initials = getInitials(client.company_name);
            const avatarStyle = getAvatarStyle(client.company_name);
            
            return (
              <motion.div
                key={client.id}
                className="seller-clients-row"
                onClick={() => navigate(`/seller/clienti/${client.id}`)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
              >
                {/* Column 1: Identity (The Hero) */}
                <div className="seller-clients-col-identity">
                  <div 
                    className="seller-clients-avatar"
                    style={avatarStyle}
                  >
                    {initials}
                  </div>
                  <div className="seller-clients-identity-info">
                    <div className="seller-clients-name">
                      {client.company_name || 'Cliente senza nome'}
                    </div>
                    {(client.ragione_sociale && client.ragione_sociale !== client.company_name) && (
                      <div className="seller-clients-subtitle">
                        {client.ragione_sociale}
                      </div>
                    )}
                    {!client.ragione_sociale && (client.referente_nome || client.referente_cognome) && (
                      <div className="seller-clients-subtitle">
                        {[client.referente_nome, client.referente_cognome].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Contact Info */}
                <div className="seller-clients-col-contact">
                  {client.email && (
                    <div className="seller-clients-contact-item">
                      <Mail size={14} className="seller-clients-contact-icon" />
                      <span className="seller-clients-contact-text">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="seller-clients-contact-item">
                      <Phone size={14} className="seller-clients-contact-icon" />
                      <span className="seller-clients-contact-text">{client.phone}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && (
                    <span className="seller-clients-no-contact">-</span>
                  )}
                </div>

                {/* Column 3: Activity Stats */}
                <div className="seller-clients-col-stats">
                  <div className="seller-clients-stats-text">
                    {formatStats(clientAny)}
                  </div>
                </div>

                {/* Column 4: Last Activity */}
                <div className="seller-clients-col-activity">
                  {lastQuoteDate ? (
                    <div className="seller-clients-activity-date">
                      {formatDate(lastQuoteDate)}
                    </div>
                  ) : (
                    <span className="seller-clients-no-activity">-</span>
                  )}
                </div>

                {/* Column 5: Quick Actions — revealed on hover */}
                <div className="seller-clients-col-action">
                  <div className="seller-clients-quick-actions">
                    {client.phone && (
                      <button
                        className="seller-clients-action-btn"
                        onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${client.phone}`; }}
                        title={`Chiama ${client.phone}`}
                      >
                        <Phone size={16} />
                      </button>
                    )}
                    {client.email && (
                      <button
                        className="seller-clients-action-btn"
                        onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${client.email}`; }}
                        title={`Email ${client.email}`}
                      >
                        <Mail size={16} />
                      </button>
                    )}
                    <ChevronRight size={16} className="seller-clients-chevron" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          sellerCache.clients.invalidate(user!.seller_id!);
          sellerCache.dashboard.invalidate(user!.seller_id!);
          setShowCreateModal(false);
          loadClients();
        }}
      />
    </div>
  );
};

export default SellerClientsPage;
