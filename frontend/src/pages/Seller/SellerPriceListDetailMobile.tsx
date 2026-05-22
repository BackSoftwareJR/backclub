import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Package,
  Download,
  FileText,
  Globe,
} from 'lucide-react';
import priceListApi from '../../api/priceList';
import type { PriceListItem } from '../../types/sellers';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerPriceListDetailMobile.css';

const SellerPriceListDetailMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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
      hapticButtonPress();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="price-list-detail-mobile-ios">
        <SkeletonLoader type="list" count={5} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="price-list-detail-mobile-ios">
        <div className="price-list-detail-empty">
          <Package size={64} className="price-list-detail-empty-icon" />
          <h3 className="price-list-detail-empty-title">{t('price_list.detail.not_found')}</h3>
          <button
            onClick={() => {
              hapticButtonPress();
              navigate('/seller/listini');
            }}
            className="ios-button-primary"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="price-list-detail-mobile-ios">
      {/* Header */}
      <div className="price-list-detail-header">
        <button
          onClick={() => {
            hapticButtonPress();
            navigate('/seller/listini');
          }}
          className="price-list-detail-back-btn"
        >
          <ArrowLeft size={20} style={{ color: 'var(--ios-system-blue)' }} />
          <span style={{ color: 'var(--ios-system-blue)', fontFamily: 'var(--ios-font-family)', fontSize: '17px' }}>
            {t('common.back')}
          </span>
        </button>
        <h1 className="ios-large-title">{item.name}</h1>
        {item.department && (
          <p className="price-list-detail-subtitle">{item.department.name}</p>
        )}
      </div>

      {/* Content */}
      <div className="price-list-detail-content">
        {/* Prezzo */}
        <div className="ios-inset-grouped">
          <ul className="ios-inset-grouped-list">
            <li className="ios-inset-grouped-cell">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                <span style={{ 
                  fontFamily: 'var(--ios-font-family)',
                  fontSize: '13px',
                  color: 'var(--ios-secondary-label)',
                  textTransform: 'uppercase',
                }}>
                  {t('price_list.detail.price')}
                </span>
                {item.base_price ? (
                  <span style={{
                    fontFamily: 'var(--ios-font-family)',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: 'var(--ios-system-blue)',
                  }}>
                    {formatCurrency(item.base_price)}
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--ios-font-family)',
                    fontSize: '17px',
                    fontStyle: 'italic',
                    color: 'var(--ios-secondary-label)',
                  }}>
                    {t('price_list.price_on_request')}
                  </span>
                )}
                {item.price_type === 'variabile' && (
                  <span style={{
                    fontFamily: 'var(--ios-font-family)',
                    fontSize: '13px',
                    color: 'var(--ios-secondary-label)',
                    marginTop: '4px',
                  }}>
                    ({t('price_list.detail.variable')})
                  </span>
                )}
              </div>
            </li>
          </ul>
        </div>

        {/* Descrizione */}
        {item.description && (
          <div className="price-list-detail-description-section">
            <h3 className="price-list-detail-section-title">{t('price_list.detail.description')}</h3>
            <div 
              className="price-list-detail-description-content"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>
        )}

        {/* Caratteristiche */}
        {item.features && item.features.length > 0 && (
          <div className="price-list-detail-features-section">
            <h3 className="price-list-detail-section-title">{t('price_list.detail.features')}</h3>
            <div className="ios-inset-grouped">
              <ul className="ios-inset-grouped-list">
                {item.features.map((feature, index) => (
                  <li key={index} className="ios-inset-grouped-cell">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--ios-system-blue)',
                        marginTop: '8px',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontFamily: 'var(--ios-font-family)',
                        fontSize: '17px',
                        color: 'var(--ios-label)',
                        lineHeight: '22px',
                      }}>
                        {feature}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Azioni */}
        <div className="price-list-detail-actions-section">
          <h3 className="price-list-detail-section-title">{t('common.actions')}</h3>
          
          {item.informative_document_path && (
            <button
              onClick={handleDownloadDocument}
              disabled={downloading}
              className="price-list-detail-action-btn price-list-detail-action-btn-primary"
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
              className="price-list-detail-action-btn price-list-detail-action-btn-secondary"
              onClick={() => hapticButtonPress()}
            >
              <FileText size={20} />
              <span>{t('price_list.detail.technical_sheet')}</span>
              <ExternalLink size={18} />
            </a>
          )}

          {item.landing_page_url && (
            <a
              href={item.landing_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="price-list-detail-action-btn price-list-detail-action-btn-secondary"
              onClick={() => hapticButtonPress()}
            >
              <Globe size={20} />
              <span>{t('price_list.detail.present')}</span>
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerPriceListDetailMobile;
