import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { AdditionalItem } from '../../../types/quotes';
import './QuoteWizardSteps.css';

interface QuoteStep3AdditionalItemsProps {
  additionalItems: AdditionalItem[];
  onAddItem: (item: { description: string; quantity: number; unit_price: number }) => void;
  onRemoveItem: (index: number) => void;
}

const QuoteStep3AdditionalItems: React.FC<QuoteStep3AdditionalItemsProps> = ({
  additionalItems,
  onAddItem,
  onRemoveItem,
}) => {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const handleAdd = () => {
    if (description.trim() && unitPrice > 0) {
      onAddItem({ description: description.trim(), quantity, unit_price: unitPrice });
      setDescription('');
      setQuantity(1);
      setUnitPrice(0);
    }
  };

  return (
    <div className="quote-step-content">
      <div className="step-description">
        <p>Aggiungi articoli o servizi aggiuntivi personalizzati non presenti nel listino.</p>
      </div>

      <div className="additional-items-form">
        <div className="form-row-items">
          <input
            type="text"
            placeholder="Descrizione articolo/servizio"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="item-input"
          />
          <input
            type="number"
            min="1"
            placeholder="Quantità"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="item-input-small"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Prezzo unitario (€)"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            className="item-input-medium"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="btn-add-item"
            disabled={!description.trim() || unitPrice <= 0}
          >
            <Plus size={18} />
            Aggiungi
          </button>
        </div>
      </div>

      {additionalItems.length > 0 && (
        <div className="additional-items-list">
          <h3 className="section-title">Articoli Aggiuntivi ({additionalItems.length})</h3>
          {additionalItems.map((item, index) => {
            const total = item.quantity * item.unit_price;
            return (
              <div key={index} className="additional-item-card">
                <div className="item-card-header">
                  <span className="item-description">{item.description}</span>
                  <button
                    className="btn-remove-item"
                    onClick={() => onRemoveItem(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="item-card-details">
                  <span>Quantità: {item.quantity}</span>
                  <span>Prezzo: € {item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  <span className="item-total">Totale: € {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuoteStep3AdditionalItems;

