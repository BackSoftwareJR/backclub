import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Filter, ExternalLink } from 'lucide-react';
import priceListApi from '../../api/priceList';
import budgetApi from '../../api/budget';
import type { PriceListItem } from '../../types/sellers';
import type { CrmDepartment } from '../../api/budget';
import GuideTour from '../../components/Guide/GuideTour';
import { listiniTourSteps, completeTourSteps } from '../../config/guideTours';
import { useIsMobile } from '../../hooks/useIsMobile';
import { sellerCache } from '../../utils/sellerCache';
import SellerPriceListMobile from './SellerPriceListMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerPriceListPage.css';

const SellerPriceListPage: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [departments, setDepartments] = useState<CrmDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

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
      // Filtra solo i dipartimenti specificati
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

  if (isMobile) {
    return <SellerPriceListMobile />;
  }

  if (loading) {
    return (
      <div className="configurazione-listini-page">
        <div className="venditori-page-header">
          <SkeletonLoader type="page-header" className="skeleton-header-no-btn" />
        </div>
        <div className="venditori-content-card">
          <div className="venditori-actions-bar">
            <SkeletonLoader type="toolbar" />
          </div>
          <div className="seller-price-list-skeleton-list">
            <SkeletonLoader type="list" count={8} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="configurazione-listini-page">
      <GuideTour steps={listiniTourSteps} tourId="listini-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Listini Prezzi</h1>
          <p className="venditori-page-subtitle">Visualizza i listini prezzi disponibili (sola lettura)</p>
        </div>
      </div>

      <div className="venditori-content-card">
        <div className="venditori-actions-bar">
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder={t('price_list.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="venditori-filter-wrapper">
            <Filter size={18} />
            <select
              className="venditori-filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">Tutti i settori</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Solo Attivi</option>
            <option value="inactive">Solo Inattivi</option>
            <option value="all">Tutti</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="venditori-empty-state">
            <Package size={64} className="venditori-empty-state-icon" />
            <h3>{t('price_list.no_items')}</h3>
            <p>{t('price_list.no_items_desc')}</p>
          </div>
        ) : (
          <div className="price-list-container">
            {Object.entries(itemsByDepartment).map(([deptName, deptItems]) => (
              <div key={deptName} className="price-list-section">
                <h3 className="section-title">{deptName}</h3>
                <div className="price-list-grid">
                  {deptItems.map((item) => (
                    <div key={item.id} className="price-list-card">
                      {/* Top: Large Centered Visual Icon */}
                      <div className="price-list-card-visual">
                        <div className="price-list-card-icon-large">
                          <Package size={40} />
                        </div>
                        {!item.is_active && (
                          <span className="price-list-card-badge-inactive">Inattivo</span>
                        )}
                      </div>
                      
                      {/* Middle: Title + Price (Hero) + Description */}
                      <div className="price-list-card-body">
                        <h3 className="price-list-card-name">{item.name}</h3>
                        
                        <div className="price-list-card-price">
                          {item.base_price ? (
                            <>
                              <span className="price-amount">€ {item.base_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                              {item.price_type === 'variabile' && (
                                <span className="price-unit"> (variabile)</span>
                              )}
                            </>
                          ) : (
                            <span className="price-contact">Prezzo su richiesta</span>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="price-list-card-description">{item.description}</p>
                        )}
                          </div>
                      
                      {/* Bottom: Action Grid */}
                      <div className={`price-list-card-actions ${!item.landing_page_url ? 'price-list-card-actions-single' : ''}`}>
                        <button
                          onClick={() => navigate(`/seller/listini/${item.id}`)}
                          className="price-list-card-action price-list-card-action-primary"
                        >
                          Scheda Tecnica
                        </button>
                        {item.landing_page_url && (
                          <a
                            href={item.landing_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="price-list-card-action price-list-card-action-ghost"
                          >
                            <span>Presenta</span>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPriceListPage;
