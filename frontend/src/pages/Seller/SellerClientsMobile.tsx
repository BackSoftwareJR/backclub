import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronRight,
  Plus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getClients } from '../../api/clients';
import type { Client } from '../../api/clients';
import { sellerCache } from '../../utils/sellerCache';
import CreateClientModal from '../../components/CreateClientModal/CreateClientModal';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import './SellerClientsMobile.css';

const SellerClientsMobile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, [user?.seller_id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadClients();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

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

  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getClientDetail = (client: Client): string => {
    // Mostra azienda o email come dettaglio
    if (client.ragione_sociale && client.ragione_sociale !== client.company_name) {
      return client.ragione_sociale;
    }
    if (client.email) {
      return client.email;
    }
    return '';
  };

  const getClientStatus = (client: any): string | null => {
    // Se ha contratti, è un cliente, altrimenti potrebbe essere un lead
    const contractsCount = client.contracts_count || 0;
    if (contractsCount > 0) {
      return 'Cliente';
    }
    return null;
  };

  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      client.company_name?.toLowerCase().includes(search) ||
      client.ragione_sociale?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <PullToRefresh onRefresh={loadClients}>
      <div className="seller-clients-mobile-ios">
        {/* Header */}
        <div className="seller-clients-header">
          <div className="seller-clients-header-top">
            <h1 className="ios-large-title">{t('clients.title')}</h1>
            <button
              onClick={() => {
                hapticButtonPress();
                setShowCreateModal(true);
              }}
              className="seller-clients-add-btn"
            >
              <Plus size={20} />
            </button>
          </div>
          {clients.length > 0 && (
            <p className="seller-clients-subtitle">
              {clients.length} {clients.length === 1 ? 'cliente' : 'clienti'}
            </p>
          )}

          {/* Search Bar */}
          <div className="seller-clients-search-container">
            <Search size={18} className="seller-clients-search-icon" />
            <input
              type="text"
              className="seller-clients-search-input"
              placeholder={t('menu.cerca')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="seller-clients-content">
            <SkeletonLoader type="list" count={5} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="seller-clients-empty">
            <Users size={64} className="seller-clients-empty-icon" />
            <h3 className="seller-clients-empty-title">
              {searchTerm ? t('clients.no_clients') : t('clients.no_client')}
            </h3>
            {!searchTerm && (
              <button
                onClick={() => {
                  hapticButtonPress();
                  setShowCreateModal(true);
                }}
                className="ios-button-primary"
                style={{ marginTop: '16px' }}
              >
                <Plus size={18} style={{ marginRight: '8px' }} />
                {t('clients.new')}
              </button>
            )}
          </div>
        ) : (
          <div className="seller-clients-content">
            <div className="seller-clients-list">
              {filteredClients.map((client, index) => {
                const initials = getInitials(client.company_name);
                const detail = getClientDetail(client);
                const status = getClientStatus(client);
                const isLast = index === filteredClients.length - 1;

                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      hapticButtonPress();
                      navigate(`/seller/clienti/${client.id}`);
                    }}
                    className={`seller-clients-item ${isLast ? 'seller-clients-item-last' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="seller-clients-avatar">
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="seller-clients-item-content">
                      <div className="seller-clients-item-main">
                        <span className="seller-clients-item-name">
                          {client.company_name}
                        </span>
                        {status && (
                          <span className="seller-clients-status-badge">
                            {status}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <span className="seller-clients-item-detail">
                          {detail}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      size={18}
                      className="seller-clients-chevron"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Client Modal */}
        {showCreateModal && (
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
        )}
      </div>
    </PullToRefresh>
  );
};

export default SellerClientsMobile;
