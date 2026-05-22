import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, X } from 'lucide-react';
import priceListApi from '../../../api/priceList';
import type { PriceListItem } from '../../../types/sellers';
import type { SelectedService } from '../../../types/quotes';
import './QuoteWizardSteps.css';

interface QuoteStep1ServicesProps {
  selectedServices: SelectedService[];
  onAddService: (service: SelectedService) => void;
  onRemoveService: (index: number) => void;
  onUpdateService: (index: number, updates: Partial<SelectedService>) => void;
}

const QuoteStep1Services: React.FC<QuoteStep1ServicesProps> = ({
  selectedServices,
  onAddService,
  onRemoveService,
  onUpdateService,
}) => {
  const [services, setServices] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    loadServices();
    loadDepartments();
  }, [departmentFilter]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 100 };
      if (departmentFilter !== 'all') {
        params.department_id = departmentFilter;
      }
      console.log('Caricamento servizi con params:', params);
      const response = await priceListApi.getAll(params);
      console.log('Risposta API:', response);
      // Laravel restituisce { data: [...], current_page: ..., ... }
      const items = response.data || [];
      console.log('Items estratti:', items.length, items);
      // Filtriamo solo i servizi attivi lato frontend
      const activeItems = items.filter((item: PriceListItem) => item.is_active !== false);
      console.log('Servizi attivi:', activeItems.length, activeItems);
      setServices(activeItems);
    } catch (error: any) {
      console.error('Errore nel caricamento servizi:', error);
      console.error('Dettagli errore:', error.response?.data || error.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await priceListApi.getAll({ per_page: 100 });
      const deptSet = new Set<string>();
      const items = response.data || [];
      items.forEach((item: PriceListItem) => {
        if (item.department) {
          deptSet.add(JSON.stringify({ id: item.department.id, name: item.department.name }));
        }
      });
      setDepartments(Array.from(deptSet).map(d => JSON.parse(d)));
    } catch (error) {
      console.error('Errore nel caricamento settori:', error);
    }
  };

  const filteredServices = services.filter(service => {
    const searchLower = searchTerm.toLowerCase();
    return (
      service.name.toLowerCase().includes(searchLower) ||
      service.description?.toLowerCase().includes(searchLower) ||
      service.department?.name.toLowerCase().includes(searchLower)
    );
  });

  const isServiceSelected = (serviceId: number): boolean => {
    return selectedServices.some(s => s.price_list_item_id === serviceId);
  };

  const handleAddService = (service: PriceListItem) => {
    if (!isServiceSelected(service.id)) {
      // Calcola il prezzo con margine applicato
      const margin = service.margin_percentage || 0;
      const priceWithMargin = service.base_price * (1 + margin / 100);
      
      const selectedService: SelectedService = {
        price_list_item_id: service.id,
        price_list_item: service,
        quantity: 1,
        unit_price: priceWithMargin,
        discount: 0,
        total: priceWithMargin,
      };
      onAddService(selectedService);
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const service = selectedServices[index];
    const newTotal = service.unit_price * quantity * (1 - service.discount / 100);
    onUpdateService(index, { quantity, total: newTotal });
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const service = selectedServices[index];
    const newTotal = price * service.quantity * (1 - service.discount / 100);
    onUpdateService(index, { unit_price: price, total: newTotal });
  };

  if (loading) {
    return (
      <div className="wizard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="quote-step-content">
      <div className="step-description">
        <p>Cerca e seleziona i servizi dal listino che vuoi includere nel preventivo.</p>
      </div>

      {/* Filtri e Ricerca */}
      <div className="services-filters">
        <div className="search-wrapper-large">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-input-large"
            placeholder="Cerca servizi per nome, descrizione o settore..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select-large"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">Tutti i settori</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className="services-grid-layout">
        {/* Servizi Disponibili */}
        <div className="services-available">
          <h3 className="section-title">Servizi Disponibili</h3>
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <p>Nessun servizio trovato</p>
            </div>
          ) : (
            <div className="services-grid">
              {filteredServices.map((service) => {
                const isSelected = isServiceSelected(service.id);
                return (
                  <div
                    key={service.id}
                    className={`service-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSelected && handleAddService(service)}
                  >
                    <div className="service-card-header">
                      <div className="service-card-title">
                        <Package size={20} />
                        <span>{service.name}</span>
                      </div>
                      {isSelected && (
                        <span className="service-selected-badge">Selezionato</span>
                      )}
                    </div>
                    {service.description && (
                      <p className="service-card-description">
                        {service.description.substring(0, 100)}...
                      </p>
                    )}
                    <div className="service-card-footer">
                      <div className="service-price">
                        € {(() => {
                          const margin = service.margin_percentage || 0;
                          const priceWithMargin = service.base_price * (1 + margin / 100);
                          return priceWithMargin.toLocaleString('it-IT', { minimumFractionDigits: 2 });
                        })()}
                      </div>
                      {service.department && (
                        <span className="service-department">
                          {service.department.name}
                        </span>
                      )}
                      {!isSelected && (
                        <button
                          className="btn-add-service"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddService(service);
                          }}
                        >
                          <Plus size={16} />
                          Aggiungi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Servizi Selezionati */}
        <div className="services-selected">
          <h3 className="section-title">
            Servizi Selezionati ({selectedServices.length})
          </h3>
          {selectedServices.length === 0 ? (
            <div className="empty-state">
              <p>Nessun servizio selezionato</p>
              <span className="empty-state-hint">Seleziona i servizi dalla lista a sinistra</span>
            </div>
          ) : (
            <div className="selected-services-list">
              {selectedServices.map((service, index) => (
                <div key={index} className="selected-service-item">
                  <div className="selected-service-header">
                    <div className="selected-service-name">
                      <Package size={16} />
                      <span>{service.price_list_item.name}</span>
                    </div>
                    <button
                      className="btn-remove-service"
                      onClick={() => onRemoveService(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="selected-service-details">
                    <div className="detail-row">
                      <label>Quantità</label>
                      <input
                        type="number"
                        min="1"
                        value={service.quantity}
                        onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                        className="quantity-input"
                      />
                    </div>
                    <div className="detail-row">
                      <label>Prezzo Unitario (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.unit_price}
                        onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                        className="price-input"
                      />
                    </div>
                    <div className="detail-row">
                      <label>Totale</label>
                      <span className="total-display">
                        € {service.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteStep1Services;

