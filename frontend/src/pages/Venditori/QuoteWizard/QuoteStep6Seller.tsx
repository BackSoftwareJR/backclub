import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import sellersApi from '../../../api/sellers';
import type { Seller } from '../../../types/sellers';
import './QuoteWizardSteps.css';

interface QuoteStep6SellerProps {
  seller_id?: number;
  isSeller: boolean;
  onUpdate: (updates: { seller_id?: number }) => void;
}

const QuoteStep6Seller: React.FC<QuoteStep6SellerProps> = ({
  seller_id,
  isSeller,
  onUpdate,
}) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSeller) {
      loadSellers();
    }
  }, [isSeller]);

  const loadSellers = async () => {
    try {
      setLoading(true);
      console.log('Caricamento venditori...');
      const response = await sellersApi.getAll({ is_active: true });
      console.log('Risposta API venditori:', response);
      // Il backend restituisce direttamente un array, non un oggetto paginato
      const sellersList = Array.isArray(response) ? response : [];
      console.log('Venditori estratti:', sellersList.length, sellersList);
      setSellers(sellersList);
    } catch (error: any) {
      console.error('Errore nel caricamento venditori:', error);
      console.error('Dettagli errore:', error.response?.data || error.message);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  if (isSeller) {
    return (
      <div className="quote-step-content">
        <div className="step-description">
          <p>Sei un venditore. Il preventivo sarà automaticamente associato al tuo account.</p>
        </div>
        <div className="seller-info-card">
          <Users size={32} />
          <div>
            <h3>Venditore: {seller_id ? 'Selezionato' : 'Non selezionato'}</h3>
            <p>Il preventivo verrà creato con il tuo account venditore.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quote-step-content">
        <div className="wizard-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <div className="quote-step-content">
        <div className="step-description">
          <p>Seleziona il venditore a cui associare questo preventivo.</p>
        </div>
        <div className="empty-state">
          <Users size={48} />
          <p>Nessun venditore trovato</p>
          <span className="empty-state-hint">Verifica che ci siano venditori attivi nel sistema</span>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-step-content">
      <div className="step-description">
        <p>Seleziona il venditore a cui associare questo preventivo.</p>
      </div>

      <div className="sellers-grid">
        {sellers.map((seller) => (
          <div
            key={seller.id}
            className={`seller-card ${seller_id === seller.id ? 'selected' : ''}`}
            onClick={() => onUpdate({ seller_id: seller.id })}
          >
            <div className="seller-card-header">
              <div className="seller-avatar-large">
                {seller.user?.name?.[0]?.toUpperCase() || 'V'}
              </div>
              <div className="seller-card-info">
                <div className="seller-name">
                  {seller.user?.name || `Venditore #${seller.id}`}
                </div>
                <div className="seller-email">{seller.user?.email || 'N/A'}</div>
              </div>
            </div>
            <div className="seller-card-footer">
              <span className="seller-commission">
                Provvigione: {seller.commission_rate}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuoteStep6Seller;

