import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  Filter,
  ChevronRight,
  DollarSign,
  Download,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import contractsApi from '../../api/contracts';
import type { Contract } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerContractsMobile.css';

const SellerContractsMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadContracts();
  }, [statusFilter, user?.seller_id]);

  const loadContracts = async () => {
    if (!user?.seller_id) return;

    const cached = sellerCache.contracts.get(user.seller_id, statusFilter) as Contract[] | null;
    if (cached) {
      setContracts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = { per_page: 50, seller_id: user.seller_id };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await contractsApi.getAll(params);
      setContracts(response.data);
      sellerCache.contracts.set(user.seller_id, statusFilter, response.data);
    } catch (error) {
      console.error('Errore nel caricamento contratti:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.title?.toLowerCase().includes(searchLower) ||
      contract.client?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { label: string; color: string; bgColor: string }
    > = {
      draft: {
        label: 'Bozza',
        color: '#6b7280',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
      },
      requested: {
        label: 'Richiesta',
        color: '#3b82f6',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      },
      pending_signature: {
        label: 'In Attesa Firma',
        color: '#f59e0b',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      },
      active: {
        label: 'Attivo',
        color: '#10b981',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      suspended: {
        label: 'Sospeso',
        color: '#ef4444',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      },
      completed: {
        label: 'Completato',
        color: '#10b981',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      terminated: {
        label: 'Terminato',
        color: '#6b7280',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
      },
    };
    return (
      badges[status] || {
        label: status,
        color: '#6b7280',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDownload = async (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contract.contract_file) {
      alert('Contratto non ancora disponibile');
      return;
    }

    try {
      const blob = await contractsApi.downloadFile(contract.id, 'contract');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contratto_${contract.contract_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download:', error);
      alert('Errore nel download del contratto');
    }
  };

  const activeFiltersCount = statusFilter !== 'all' ? 1 : 0;

  return (
    <PullToRefresh onRefresh={loadContracts}>
      <div className="seller-contracts-mobile">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {t('contracts.title')}
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {filteredContracts.length} contratti
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search
              size={20}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('contracts.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-colors ${
              activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter size={18} />
            <span className="text-sm font-medium">Filtri</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="px-6 space-y-3">
            <SkeletonLoader type="card" count={5} />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Briefcase
              size={64}
              className="text-gray-300 dark:text-gray-600 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('contracts.no_contract')}
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400 text-center">
              {searchTerm || activeFiltersCount > 0
                ? t('leads.try_modify_search')
                : t('contracts.no_contracts_desc', 'I tuoi contratti appariranno qui')}
            </p>
          </div>
        ) : (
          <div className="px-6 space-y-3 pb-6">
            {filteredContracts.map((contract) => {
              const statusBadge = getStatusBadge(contract.status);
              const clientInitials = getInitials(
                contract.client?.company_name || 'Cliente'
              );

              return (
                <div
                  key={contract.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => navigate(`/seller/contratti/${contract.id}`)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {clientInitials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {contract.title || 'Senza titolo'}
                          </h3>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ml-2 flex-shrink-0 ${statusBadge.bgColor}`}
                            style={{ color: statusBadge.color }}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {contract.client?.company_name || 'Cliente non specificato'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign
                              size={16}
                              className="text-gray-400 dark:text-gray-500"
                            />
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(contract.total_value || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>#{contract.contract_number}</span>
                          {contract.start_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar size={12} />
                              <span>{formatDate(contract.start_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        {contract.contract_file && (
                          <button
                            onClick={(e) => handleDownload(contract, e)}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 active:scale-95 transition-transform"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <ChevronRight
                          size={20}
                          className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1"
                        />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters Bottom Sheet */}
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtri"
          snapPoints={[60]}
        >
          <div className="px-6 py-4 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Stato
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'all', label: 'Tutti' },
                  { value: 'draft', label: 'Bozza' },
                  { value: 'requested', label: 'Richiesta' },
                  { value: 'pending_signature', label: 'In Attesa Firma' },
                  { value: 'active', label: 'Attivo' },
                  { value: 'suspended', label: 'Sospeso' },
                  { value: 'completed', label: 'Completato' },
                  { value: 'terminated', label: 'Terminato' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      statusFilter === option.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowFilters(false);
                loadContracts();
              }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold active:scale-95 transition-transform"
            >
              Applica Filtri
            </button>
          </div>
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
};

export default SellerContractsMobile;
