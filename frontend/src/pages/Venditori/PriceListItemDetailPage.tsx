import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink, Package, DollarSign, Tag, Link as LinkIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import priceListApi from '../../api/priceList';
import type { PriceListItem } from '../../types/sellers';
import './PriceListItemDetailPage.css';

const PriceListItemDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<PriceListItem | null>(null);
  const [loading, setLoading] = useState(true);

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
      alert('Errore nel caricamento del prodotto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="venditori-empty-state">
        <h3>Prodotto non trovato</h3>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate(-1)}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const priceWithMargin = item.margin_percentage 
    ? item.base_price * (1 + (item.margin_percentage / 100))
    : item.base_price;

  return (
    <div className="price-list-item-detail-page">
      <div className="detail-header">
        <button 
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Indietro
        </button>
        <div className="detail-header-content">
          <div>
            <h1 className="venditori-page-title">{item.name}</h1>
            {item.department && (
              <span 
                className="department-badge-large" 
                style={{ backgroundColor: `${item.department.color}20`, color: item.department.color }}
              >
                {item.department.name}
              </span>
            )}
          </div>
          <button
            className="venditori-btn venditori-btn-primary"
            onClick={() => navigate(`/venditori/configurazione-listini/${item.id}/edit`)}
          >
            <Edit size={18} />
            Modifica
          </button>
        </div>
      </div>

      <div className="detail-content-grid">
        {/* Informazioni Principali */}
        <div className="detail-card">
          <h3 className="detail-card-title">
            <Package size={20} />
            Informazioni Principali
          </h3>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Nome</span>
              <span className="info-value">{item.name}</span>
            </div>
            {item.description && (
              <div className="detail-info-item">
                <span className="info-label">Descrizione</span>
                <span className="info-value">{item.description}</span>
              </div>
            )}
            <div className="detail-info-item">
              <span className="info-label">Tipo Prezzo</span>
              <span className={`price-type-badge ${item.price_type}`}>
                {item.price_type === 'fisso' && 'Fisso'}
                {item.price_type === 'variabile' && 'Variabile'}
                {item.price_type === 'personalizzato' && 'Personalizzato'}
              </span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Stato</span>
              <span className={`venditori-badge ${item.is_active ? 'venditori-badge-success' : 'venditori-badge-danger'}`}>
                {item.is_active ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Prezzi e Margini */}
        <div className="detail-card">
          <h3 className="detail-card-title">
            <DollarSign size={20} />
            Prezzi e Margini
          </h3>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Prezzo Base</span>
              <span className="info-value price-value">€ {item.base_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
            {item.margin_percentage && (
              <>
                <div className="detail-info-item">
                  <span className="info-label">Margine</span>
                  <span className="info-value">{item.margin_percentage}%</span>
                </div>
                <div className="detail-info-item highlight">
                  <span className="info-label">Prezzo con Margine</span>
                  <span className="info-value price-value-highlight">€ {priceWithMargin.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            {item.min_installment_amount && (
              <div className="detail-info-item">
                <span className="info-label">Importo Minimo Rata</span>
                <span className="info-value">€ {item.min_installment_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {item.max_installments && (
              <div className="detail-info-item">
                <span className="info-label">Numero Massimo Rate</span>
                <span className="info-value">{item.max_installments}</span>
              </div>
            )}
          </div>
        </div>

        {/* Opzioni di Pagamento */}
        {item.payment_options && item.payment_options.length > 0 && (
          <div className="detail-card">
            <h3 className="detail-card-title">
              <Tag size={20} />
              Opzioni di Pagamento
            </h3>
            <div className="payment-options-display">
              {item.payment_options.map((option, index) => (
                <div key={index} className="payment-option-display-item">
                  <CheckCircle2 size={16} />
                  <span>{option.label}</span>
                  {option.installments && (
                    <span className="option-detail">({option.installments} rate)</span>
                  )}
                  {option.percentages && (
                    <span className="option-detail">({option.percentages.join('/')}%)</span>
                  )}
                  {option.days && (
                    <span className="option-detail">({option.days} giorni)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caratteristiche */}
        {item.features && item.features.length > 0 && (
          <div className="detail-card">
            <h3 className="detail-card-title">
              <CheckCircle2 size={20} />
              Caratteristiche
            </h3>
            <div className="features-display">
              {item.features.map((feature, index) => (
                <div key={index} className="feature-display-item">
                  <CheckCircle2 size={14} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opzioni di Rinnovo */}
        {item.renewal_options && item.renewal_options.length > 0 && (
          <div className="detail-card">
            <h3 className="detail-card-title">
              <RefreshCw size={20} />
              Opzioni di Rinnovo
            </h3>
            <div className="renewal-options-display">
              {item.renewal_options.map((option, index) => {
                const durationLabels: Record<string, string> = {
                  monthly: 'Mensile',
                  quarterly: 'Trimestrale (3 mesi)',
                  semiannual: 'Semestrale (6 mesi)',
                  annual: 'Annuale (12 mesi)',
                  custom: option.duration_months ? `Personalizzata (${option.duration_months} mesi)` : 'Personalizzata',
                };
                
                return (
                  <div key={index} className="renewal-option-display-item">
                    <div className="renewal-option-display-header">
                      <div>
                        <span className="renewal-duration">{durationLabels[option.duration] || option.duration}</span>
                        <span className="renewal-price">€ {option.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {option.is_active === false && (
                        <span className="venditori-badge venditori-badge-danger">Inattiva</span>
                      )}
                    </div>
                    {option.description && (
                      <p className="renewal-description">{option.description}</p>
                    )}
                    {option.includes && option.includes.length > 0 && (
                      <div className="renewal-includes-display">
                        <span className="renewal-includes-title">Comprende:</span>
                        <div className="renewal-includes-tags">
                          {option.includes.map((include, includeIndex) => (
                            <span key={includeIndex} className="include-display-tag">
                              <CheckCircle2 size={12} />
                              {include}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link Landing Page */}
        {item.landing_page_url && (
          <div className="detail-card">
            <h3 className="detail-card-title">
              <LinkIcon size={20} />
              Landing Page
            </h3>
            <a
              href={item.landing_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-page-link"
            >
              <ExternalLink size={16} />
              {item.landing_page_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceListItemDetailPage;

