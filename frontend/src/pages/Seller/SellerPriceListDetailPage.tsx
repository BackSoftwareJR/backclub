import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  FileText,
  Globe,
  Package,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import priceListApi from '../../api/priceList';
import type { PriceListItem } from '../../types/sellers';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerPriceListDetailMobile from './SellerPriceListDetailMobile';
import './SellerPriceListDetailPage.css';

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const SellerPriceListDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const [item, setItem] = useState<PriceListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await priceListApi.getById(Number(id));
      setItem(data);
    } catch (error) {
      console.error('Errore nel caricamento prodotto:', error);
      alert(t('price_list.detail.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!item?.informative_document_path) return;
    try {
      setDownloading(true);
      const blob = await priceListApi.downloadInformativeDocument(item.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento-informativo-${item.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Errore nel download:', error);
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || t('price_list.detail.download_error'));
    } finally {
      setDownloading(false);
    }
  };

  if (isMobile) return <SellerPriceListDetailMobile />;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);

  if (loading) {
    return (
      <div className="pld-page">
        <div className="pld-header pld-header--skeleton">
          <div className="pld-skeleton-line pld-skeleton-line--breadcrumb" />
          <div className="pld-skeleton-line pld-skeleton-line--title" />
          <div className="pld-skeleton-line pld-skeleton-line--badge" />
        </div>
        <div className="pld-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="pld-card pld-card--skeleton seller-card">
              <div className="pld-skeleton-line pld-skeleton-line--card-title" />
              <div className="pld-skeleton-line pld-skeleton-line--card-body" />
              <div className="pld-skeleton-line pld-skeleton-line--card-body pld-skeleton-line--short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="pld-empty">
        <Package size={48} className="pld-empty-icon" />
        <p className="pld-empty-title">{t('price_list.detail.not_found')}</p>
        <button
          className="pld-back-btn"
          onClick={() => navigate('/seller/listini')}
        >
          <ArrowLeft size={15} />
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="pld-page">
      {/* ── Header ── */}
      <motion.header
        className="pld-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
      >
        {/* Breadcrumb */}
        <nav className="pld-breadcrumb">
          <button
            className="pld-breadcrumb-link"
            onClick={() => navigate('/seller/listini')}
          >
            Listini Prezzi
          </button>
          <ChevronRight size={13} className="pld-breadcrumb-sep" />
          <span className="pld-breadcrumb-current">{item.name}</span>
        </nav>

        <div className="pld-header-row">
          <button
            className="pld-back-btn"
            onClick={() => navigate('/seller/listini')}
          >
            <ArrowLeft size={15} />
            {t('common.back')}
          </button>
          <div className="pld-header-info">
            <h1 className="pld-title">{item.name}</h1>
            <div className="pld-header-badges">
              {item.department && (
                <span className="pld-badge-dept">{item.department.name}</span>
              )}
              {!item.is_active && (
                <span className="pld-badge-inactive">Inattivo</span>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Content grid ── */}
      <div className="pld-grid">
        {/* Prezzo */}
        <motion.div
          className="pld-card seller-card"
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h3 className="pld-card-title">{t('price_list.detail.price')}</h3>
          <div className="pld-price-display">
            {item.base_price ? (
              <>
                <span className="pld-price-amount">{formatCurrency(item.base_price)}</span>
                {item.price_type === 'variabile' && (
                  <span className="pld-price-badge">{t('price_list.detail.variable')}</span>
                )}
              </>
            ) : (
              <span className="pld-price-contact">{t('price_list.price_on_request')}</span>
            )}
          </div>
        </motion.div>

        {/* Descrizione */}
        <motion.div
          className="pld-card seller-card"
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h3 className="pld-card-title">{t('price_list.detail.description')}</h3>
          {item.description ? (
            <div
              className="pld-description"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          ) : (
            <p className="pld-text-muted">{t('price_list.detail.no_description')}</p>
          )}
        </motion.div>

        {/* Azioni */}
        {(item.informative_document_path || item.technical_sheet_url || item.landing_page_url) && (
          <motion.div
            className="pld-card seller-card"
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="pld-card-title">{t('common.actions')}</h3>
            <div className="pld-actions">
              {item.informative_document_path && (
                <button
                  onClick={handleDownloadDocument}
                  disabled={downloading}
                  className="pld-action-btn pld-action-btn--accent"
                >
                  <Download size={16} />
                  <span>
                    {downloading ? t('common.loading') : t('price_list.detail.download_document')}
                  </span>
                </button>
              )}
              {item.technical_sheet_url && (
                <a
                  href={item.technical_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pld-action-btn pld-action-btn--outline"
                >
                  <FileText size={16} />
                  <span>{t('price_list.detail.technical_sheet')}</span>
                  <ExternalLink size={13} className="pld-action-external" />
                </a>
              )}
              {item.landing_page_url && (
                <a
                  href={item.landing_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pld-action-btn pld-action-btn--outline"
                >
                  <Globe size={16} />
                  <span>{t('price_list.detail.present')}</span>
                  <ExternalLink size={13} className="pld-action-external" />
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Caratteristiche */}
        {item.features && item.features.length > 0 && (
          <motion.div
            className="pld-card seller-card"
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="pld-card-title">{t('price_list.detail.features')}</h3>
            <ul className="pld-features">
              {item.features.map((feature, index) => (
                <li key={index} className="pld-feature-item">{feature}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SellerPriceListDetailPage;
