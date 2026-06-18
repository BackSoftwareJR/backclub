import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Filter, ExternalLink, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import priceListApi from '../../api/priceList';
import budgetApi from '../../api/budget';
import type { PriceListItem } from '../../types/sellers';
import type { CrmDepartment } from '../../api/budget';
import GuideTour from '../../components/Guide/GuideTour';
import { listiniTourSteps, completeTourSteps } from '../../config/guideTours';
import { useIsMobile } from '../../hooks/useIsMobile';
import { sellerCache } from '../../utils/sellerCache';
import SellerPriceListMobile from './SellerPriceListMobile';
import './SellerPriceListPage.css';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] as const as [number, number, number, number] },
  }),
};

const SkeletonCard: React.FC = () => (
  <div className="pl-skeleton-card">
    <div className="pl-skeleton-icon" />
    <div className="pl-skeleton-lines">
      <div className="pl-skeleton-line pl-skeleton-line--name" />
      <div className="pl-skeleton-line pl-skeleton-line--price" />
      <div className="pl-skeleton-line pl-skeleton-line--desc" />
    </div>
    <div className="pl-skeleton-actions">
      <div className="pl-skeleton-btn" />
      <div className="pl-skeleton-btn" />
    </div>
  </div>
);

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
      const params: Record<string, unknown> = { per_page: 100 };
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

  const itemsByDepartment = filteredItems.reduce((acc, item) => {
    const deptName = item.department?.name || 'Altri';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(item);
    return acc;
  }, {} as Record<string, PriceListItem[]>);

  if (isMobile) {
    return <SellerPriceListMobile />;
  }

  return (
    <div className="pl-page">
      <GuideTour steps={listiniTourSteps} tourId="listini-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />

      {/* ── Page header ── */}
      <header className="pl-page-header">
        <div>
          <h1 className="pl-page-title">Listini Prezzi</h1>
          <p className="pl-page-subtitle">Catalogo servizi e prezzi disponibili</p>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="pl-toolbar">
        <div className="pl-search-wrapper">
          <Search size={15} className="pl-search-icon" />
          <input
            type="text"
            className="pl-search-input"
            placeholder={t('price_list.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pl-filters">
          <div className="pl-filter-select-wrapper">
            <Filter size={14} className="pl-filter-icon" />
            <select
              className="pl-filter-select"
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
            className="pl-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Solo Attivi</option>
            <option value="inactive">Solo Inattivi</option>
            <option value="all">Tutti</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pl-content"
          >
            <div className="pl-section">
              <div className="pl-section-header">
                <div className="pl-skeleton-line pl-skeleton-line--section" />
              </div>
              <div className="pl-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pl-empty"
          >
            <Package size={48} className="pl-empty-icon" />
            <p className="pl-empty-title">{t('price_list.no_items')}</p>
            <p className="pl-empty-subtitle">{t('price_list.no_items_desc')}</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pl-content"
          >
            {Object.entries(itemsByDepartment).map(([deptName, deptItems]) => (
              <section key={deptName} className="pl-section">
                <div className="pl-section-header">
                  <h2 className="pl-section-title">{deptName}</h2>
                  <span className="pl-section-count">{deptItems.length}</span>
                </div>
                <div className="pl-grid">
                  {deptItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      className="pl-card seller-card"
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      layout
                    >
                      {/* Badge categoria + inactive */}
                      <div className="pl-card-meta">
                        {item.department && (
                          <span className="pl-badge-category">{item.department.name}</span>
                        )}
                        {!item.is_active && (
                          <span className="pl-badge-inactive">Inattivo</span>
                        )}
                      </div>

                      {/* Icon visual */}
                      <div className="pl-card-icon-wrap">
                        <Package size={28} className="pl-card-icon" />
                      </div>

                      {/* Body */}
                      <div className="pl-card-body">
                        <h3 className="pl-card-name">{item.name}</h3>
                        <div className="pl-card-price">
                          {item.base_price ? (
                            <>
                              <span className="pl-price-amount">
                                €&thinsp;{item.base_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                              {item.price_type === 'variabile' && (
                                <span className="pl-price-unit">variabile</span>
                              )}
                            </>
                          ) : (
                            <span className="pl-price-contact">Prezzo su richiesta</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="pl-card-description">{item.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`pl-card-actions${!item.landing_page_url ? ' pl-card-actions--single' : ''}`}>
                        <button
                          onClick={() => navigate(`/seller/listini/${item.id}`)}
                          className="pl-action-btn pl-action-btn--primary"
                        >
                          Scheda Tecnica
                          <ChevronRight size={14} />
                        </button>
                        {item.landing_page_url && (
                          <a
                            href={item.landing_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pl-action-btn pl-action-btn--outline"
                          >
                            Presenta
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SellerPriceListPage;
