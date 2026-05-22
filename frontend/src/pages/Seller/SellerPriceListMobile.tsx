import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Package,
  Filter,
  ChevronRight,
} from 'lucide-react';
import priceListApi from '../../api/priceList';
import budgetApi from '../../api/budget';
import { sellerCache } from '../../utils/sellerCache';
import type { PriceListItem } from '../../types/sellers';
import type { CrmDepartment } from '../../api/budget';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import PullToRefresh from '../../components/Mobile/PullToRefresh';
import BottomSheet from '../../components/Mobile/BottomSheet';
import './SellerPriceListMobile.css';

const SellerPriceListMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [departments, setDepartments] = useState<CrmDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDepartments();
    loadItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [departmentFilter, statusFilter]);

  const loadDepartments = async () => {
    try {
      const response = await budgetApi.getCrmList({ active_only: true });
      const allowedDepartments = ['Video e Grafica', 'Siti Web', 'Ads Center', 'Casa Famiglia', 'CRM Gestionali'];
      const filtered = response.data.filter((dept: CrmDepartment) => 
        allowedDepartments.includes(dept.name)
      );
      setDepartments(filtered);
    } catch (error) {
      console.error('Errore nel caricamento settori:', error);
    }
  };

  const loadItems = async () => {
    const cached = sellerCache.priceList.get<PriceListItem[]>(departmentFilter, statusFilter);
    if (cached) {
      setItems(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const params: any = { per_page: 100 };
      if (departmentFilter !== 'all') {
        params.department_id = parseInt(departmentFilter);
      }
      const response = await priceListApi.getAll(params);
      const allItems = response.data || [];
      let filtered: PriceListItem[];
      if (statusFilter === 'active') {
        filtered = allItems.filter((item: PriceListItem) => item.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = allItems.filter((item: PriceListItem) => !item.is_active);
      } else {
        filtered = allItems;
      }
      setItems(filtered);
      sellerCache.priceList.set(departmentFilter, statusFilter, filtered);
    } catch (error) {
      console.error('Errore nel caricamento listino:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.department?.name.toLowerCase().includes(searchLower)
    );
  });

  // Raggruppa per dipartimento
  const itemsByDepartment = filteredItems.reduce((acc, item) => {
    const deptName = item.department?.name || 'Altri';
    if (!acc[deptName]) {
      acc[deptName] = [];
    }
    acc[deptName].push(item);
    return acc;
  }, {} as Record<string, PriceListItem[]>);

  const toggleDepartment = (deptName: string) => {
    hapticButtonPress();
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptName)) {
        newSet.delete(deptName);
      } else {
        newSet.add(deptName);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const activeFiltersCount = (departmentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'active' ? 1 : 0);

  return (
    <PullToRefresh onRefresh={loadItems}>
      <div className="price-list-mobile-ios">
        {/* Header */}
        <div className="price-list-header">
          <div className="price-list-header-top">
            <h1 className="ios-large-title">{t('menu.listini')}</h1>
          </div>
          <p className="price-list-subtitle">{filteredItems.length} {t('price_list.items')}</p>
        </div>

        {/* Search Bar */}
        <div className="price-list-search-container">
          <div className="price-list-search-bar">
            <Search size={18} className="price-list-search-icon" />
            <input
              type="text"
              className="price-list-search-input"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                hapticButtonPress();
                setShowFilters(true);
              }}
              className="price-list-filter-badge"
            >
              <Filter size={14} />
              {activeFiltersCount}
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="price-list-content">
            <SkeletonLoader type="list" count={5} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="price-list-empty-state">
            <Package size={64} className="price-list-empty-icon" />
            <h3 className="price-list-empty-title">{t('price_list.no_items')}</h3>
            <p className="price-list-empty-subtitle">
              {searchTerm || activeFiltersCount > 0
                ? t('price_list.try_modify_search')
                : t('price_list.no_items_desc')}
            </p>
          </div>
        ) : (
          <div className="price-list-content">
            {Object.entries(itemsByDepartment).map(([deptName, deptItems]) => {
              const isExpanded = expandedDepartments.has(deptName);
              return (
                <div key={deptName} className="price-list-department-section">
                  <button
                    onClick={() => toggleDepartment(deptName)}
                    className="price-list-department-header"
                  >
                    <span className="price-list-department-name">{deptName}</span>
                    <span className="price-list-department-count">({deptItems.length})</span>
                    <ChevronRight
                      size={20}
                      className={`price-list-department-chevron ${isExpanded ? 'expanded' : ''}`}
                      style={{ color: 'var(--ios-secondary-label)' }}
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="ios-inset-grouped">
                      <ul className="ios-inset-grouped-list">
                        {deptItems.map((item, index) => {
                          const isLast = index === deptItems.length - 1;
                          return (
                            <li
                              key={item.id}
                              className={`ios-inset-grouped-cell ${isLast ? '' : ''}`}
                              onClick={() => {
                                hapticButtonPress();
                                navigate(`/seller/listini/${item.id}`);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="price-list-item-content">
                                <div className="price-list-item-left">
                                  <div className="price-list-item-icon">
                                    <Package size={20} style={{ color: 'var(--ios-system-blue)' }} />
                                  </div>
                                  <div className="price-list-item-info">
                                    <div className="price-list-item-name">{item.name}</div>
                                    {item.description && (
                                      <div className="price-list-item-description">
                                        {item.description.length > 60
                                          ? `${item.description.substring(0, 60)}...`
                                          : item.description}
                                      </div>
                                    )}
                                    <div className="price-list-item-price">
                                      {item.base_price ? (
                                        <>
                                          <span className="price-list-item-amount">
                                            {formatCurrency(item.base_price)}
                                          </span>
                                          {item.price_type === 'variabile' && (
                                            <span className="price-list-item-variable"> (variabile)</span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="price-list-item-contact">{t('price_list.price_on_request')}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="price-list-item-right">
                                  {!item.is_active && (
                                    <span className="price-list-item-badge-inactive">
                                      {t('price_list.inactive')}
                                    </span>
                                  )}
                                  <ChevronRight size={20} className="ios-chevron-right" />
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Filters Bottom Sheet */}
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title={t('common.filters')}
          snapPoints={[60]}
        >
          <div style={{ padding: '16px', paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ marginBottom: '24px' }}>
              <label
                className="ios-body-bold"
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: 'var(--ios-label)',
                }}
              >
                {t('price_list.department')}
              </label>
              <div className="ios-inset-grouped">
                <ul className="ios-inset-grouped-list">
                  <li className="ios-inset-grouped-cell">
                    <button
                      onClick={() => {
                        hapticButtonPress();
                        setDepartmentFilter('all');
                      }}
                      className="price-list-filter-option"
                      style={{
                        backgroundColor: departmentFilter === 'all' ? 'var(--ios-system-blue)' : 'transparent',
                        color: departmentFilter === 'all' ? '#FFFFFF' : 'var(--ios-label)',
                      }}
                    >
                      {t('price_list.all_departments')}
                    </button>
                  </li>
                  {departments.map((dept) => (
                    <li key={dept.id} className="ios-inset-grouped-cell">
                      <button
                        onClick={() => {
                          hapticButtonPress();
                          setDepartmentFilter(dept.id.toString());
                        }}
                        className="price-list-filter-option"
                        style={{
                          backgroundColor: departmentFilter === dept.id.toString() ? 'var(--ios-system-blue)' : 'transparent',
                          color: departmentFilter === dept.id.toString() ? '#FFFFFF' : 'var(--ios-label)',
                        }}
                      >
                        {dept.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                className="ios-body-bold"
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: 'var(--ios-label)',
                }}
              >
                {t('price_list.status')}
              </label>
              <div className="ios-inset-grouped">
                <ul className="ios-inset-grouped-list">
                  {[
                    { value: 'active', label: t('price_list.active_only') },
                    { value: 'inactive', label: t('price_list.inactive_only') },
                    { value: 'all', label: t('price_list.all_status') },
                  ].map((option) => (
                    <li key={option.value} className="ios-inset-grouped-cell">
                      <button
                        onClick={() => {
                          hapticButtonPress();
                          setStatusFilter(option.value);
                        }}
                        className="price-list-filter-option"
                        style={{
                          backgroundColor: statusFilter === option.value ? 'var(--ios-system-blue)' : 'transparent',
                          color: statusFilter === option.value ? '#FFFFFF' : 'var(--ios-label)',
                        }}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                hapticButtonPress();
                setShowFilters(false);
                loadItems();
              }}
              className="ios-button-primary"
              style={{
                width: '100%',
                margin: 0,
              }}
            >
              {t('common.apply')}
            </button>
          </div>
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
};

export default SellerPriceListMobile;
