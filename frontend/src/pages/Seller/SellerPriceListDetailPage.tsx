import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  FileText,
  Globe,
} from 'lucide-react';
import priceListApi from '../../api/priceList';
import type { PriceListItem } from '../../types/sellers';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerPriceListDetailMobile from './SellerPriceListDetailMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerPriceListDetailPage.css';

const SellerPriceListDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const [item, setItem] = useState<PriceListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem();
    }
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
    if (!item || !item.informative_document_path) return;

    try {
      setDownloading(true);
      const blob = await priceListApi.downloadInformativeDocument(item.id);
      
      // Crea URL e scarica
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento-informativo-${item.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download:', error);
      alert(error.response?.data?.error || t('price_list.detail.download_error'));
    } finally {
      setDownloading(false);
    }
  };

  if (isMobile) {
    return <SellerPriceListDetailMobile />;
  }

  if (loading) {
    return (
      <div className="price-list-detail-page price-list-detail-skeleton">
        <div className="seller-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="seller-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="venditori-empty-state">
        <h3>{t('price_list.detail.not_found')}</h3>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/seller/listini')}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="seller-price-list-detail-page">
      <div className="detail-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/seller/listini')}
        >
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
        <div className="detail-header-content">
          <div>
            <h1 className="venditori-page-title">{item.name}</h1>
            {item.department && (
              <span className="department-badge-large">
                {item.department.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="detail-content-grid">
        {/* Descrizione Completa */}
        <div className="detail-card">
          <h3 className="card-title">{t('price_list.detail.description')}</h3>
          {item.description ? (
            <div 
              className="description-content"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          ) : (
            <p className="text-muted">{t('price_list.detail.no_description')}</p>
          )}
        </div>

        {/* Prezzo */}
        <div className="detail-card">
          <h3 className="card-title">{t('price_list.detail.price')}</h3>
          <div className="price-display">
            {item.base_price ? (
              <>
                <span className="price-amount-large">{formatCurrency(item.base_price)}</span>
                {item.price_type === 'variabile' && (
                  <span className="price-type-badge">{t('price_list.detail.variable')}</span>
                )}
              </>
            ) : (
              <span className="price-contact">{t('price_list.price_on_request')}</span>
            )}
          </div>
        </div>

        {/* Azioni */}
        <div className="detail-card">
          <h3 className="card-title">{t('common.actions')}</h3>
          <div className="actions-grid">
            {item.informative_document_path && (
              <button
                onClick={handleDownloadDocument}
                disabled={downloading}
                className="action-button action-button-primary"
              >
                <Download size={20} />
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
                className="action-button action-button-secondary"
              >
                <FileText size={20} />
                <span>{t('price_list.detail.technical_sheet')}</span>
                <ExternalLink size={16} />
              </a>
            )}

            {item.landing_page_url && (
              <a
                href={item.landing_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button action-button-secondary"
              >
                <Globe size={20} />
                <span>{t('price_list.detail.present')}</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>

        {/* Caratteristiche */}
        {item.features && item.features.length > 0 && (
          <div className="detail-card">
            <h3 className="card-title">{t('price_list.detail.features')}</h3>
            <ul className="features-list">
              {item.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPriceListDetailPage;
