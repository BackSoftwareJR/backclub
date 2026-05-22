import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import priceListApi from '../../../api/priceList';
import type { PriceListItem } from '../../../types/sellers';
import type { SelectedService } from '../../../types/quotes';
import './QuoteWizardSteps.css';

interface QuoteStep4RecommendedProps {
  selectedServices: SelectedService[];
  onAddService: (service: SelectedService) => void;
}

// Algoritmo intelligente di raccomandazione (tipo McDonald's)
// Suggerisce servizi basati su: dipartimento, prezzo, keywords complementari, popolarità
const useRecommendationAlgorithm = (
  selectedServices: SelectedService[],
  allServices: PriceListItem[]
): PriceListItem[] => {
  return useMemo(() => {
    if (selectedServices.length === 0 || allServices.length === 0) {
      return [];
    }

    // 1. Estrai informazioni dai servizi selezionati
    const selectedIds = new Set(selectedServices.map(s => s.price_list_item_id));
    const selectedDepartments = new Set(
      selectedServices.map(s => s.price_list_item.crm_department_id).filter(Boolean)
    );
    const selectedPrices = selectedServices.map(s => s.total);
    const priceRange = {
      min: Math.min(...selectedPrices) * 0.7, // -30%
      max: Math.max(...selectedPrices) * 1.3, // +30%
    };

    // 2. Estrai keywords dai nomi e descrizioni dei servizi selezionati
    const selectedKeywords = new Set<string>();
    selectedServices.forEach(service => {
      const name = service.price_list_item.name.toLowerCase();
      const description = (service.price_list_item.description || '').toLowerCase();
      const words = `${name} ${description}`.split(/\s+/).filter(w => w.length > 3);
      words.forEach(word => selectedKeywords.add(word));
    });

    // 3. Mappa di servizi complementari (basato su pattern comuni)
    const complementaryPatterns: Record<string, string[]> = {
      'seo': ['analisi', 'competitor', 'keyword', 'content', 'link'],
      'marketing': ['advertising', 'campagna', 'social', 'email', 'content'],
      'web': ['hosting', 'dominio', 'ssl', 'backup', 'manutenzione'],
      'ecommerce': ['pagamento', 'spedizione', 'inventory', 'analytics'],
      'branding': ['logo', 'grafica', 'identità', 'visiva'],
      'analisi': ['report', 'dashboard', 'metriche', 'tracking'],
    };

    // 4. Calcola score per ogni servizio
    const scoredServices = allServices
      .filter(service => {
        // Filtra: non già selezionato, attivo
        return !selectedIds.has(service.id) && service.is_active !== false;
      })
      .map(service => {
        let score = 0;
        const serviceName = (service.name || '').toLowerCase();
        const serviceDesc = (service.description || '').toLowerCase();
        const serviceText = `${serviceName} ${serviceDesc}`;

        // Punteggio 1: Stesso dipartimento (peso alto: +50)
        if (service.crm_department_id && selectedDepartments.has(service.crm_department_id)) {
          score += 50;
        }

        // Punteggio 2: Range di prezzo simile (peso medio: +30)
        if (service.base_price >= priceRange.min && service.base_price <= priceRange.max) {
          score += 30;
        } else if (service.base_price >= priceRange.min * 0.5 && service.base_price <= priceRange.max * 1.5) {
          score += 15; // Range più ampio, punteggio minore
        }

        // Punteggio 3: Keywords comuni (peso medio: +20 per keyword)
        let commonKeywords = 0;
        selectedKeywords.forEach(keyword => {
          if (serviceText.includes(keyword)) {
            commonKeywords++;
          }
        });
        score += commonKeywords * 20;

        // Punteggio 4: Servizi complementari (peso alto: +40)
        Object.entries(complementaryPatterns).forEach(([pattern, complements]) => {
          if (serviceText.includes(pattern)) {
            selectedServices.forEach(selected => {
              const selectedText = `${selected.price_list_item.name} ${selected.price_list_item.description || ''}`.toLowerCase();
              complements.forEach(complement => {
                if (selectedText.includes(complement)) {
                  score += 40;
                }
              });
            });
          }
        });

        // Punteggio 5: Servizi spesso acquistati insieme (simulato con pattern)
        // Se un servizio ha keywords simili a più servizi selezionati, aumenta lo score
        const matchingSelectedCount = selectedServices.filter(selected => {
          const selectedText = `${selected.price_list_item.name} ${selected.price_list_item.description || ''}`.toLowerCase();
          const selectedWords = selectedText.split(/\s+/).filter(w => w.length > 3);
          return selectedWords.some(word => serviceText.includes(word));
        }).length;
        score += matchingSelectedCount * 10;

        return { service, score };
      })
      .filter(item => item.score > 0) // Solo servizi con score > 0
      .sort((a, b) => b.score - a.score) // Ordina per score decrescente
      .slice(0, 8) // Top 8 servizi
      .map(item => item.service);

    return scoredServices;
  }, [selectedServices, allServices]);
};

const QuoteStep4Recommended: React.FC<QuoteStep4RecommendedProps> = ({
  selectedServices,
  onAddService,
}) => {
  const [allServices, setAllServices] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carica tutti i servizi disponibili
  useEffect(() => {
    loadAllServices();
  }, []);

  const loadAllServices = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 100, is_active: true };
      const response = await priceListApi.getAll(params);
      setAllServices(response.data || []);
    } catch (error) {
      console.error('Errore nel caricamento servizi:', error);
      setAllServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Usa l'algoritmo di raccomandazione
  const recommendedServices = useRecommendationAlgorithm(selectedServices, allServices);

  const handleAddRecommended = (service: PriceListItem) => {
    const selectedService: SelectedService = {
      price_list_item_id: service.id,
      price_list_item: service,
      quantity: 1,
      unit_price: service.base_price,
      discount: 0,
      total: service.base_price,
    };
    onAddService(selectedService);
  };

  if (loading) {
    return (
      <div className="quote-step-content">
        <div className="wizard-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (selectedServices.length === 0) {
    return (
      <div className="quote-step-content">
        <div className="step-description">
          <p>Seleziona prima alcuni servizi per vedere le raccomandazioni personalizzate.</p>
        </div>
        <div className="empty-state">
          <Sparkles size={48} />
          <p>Torna allo step precedente per selezionare i servizi</p>
        </div>
      </div>
    );
  }

  if (recommendedServices.length === 0) {
    return (
      <div className="quote-step-content">
        <div className="step-description">
          <p>Non ci sono servizi consigliati disponibili in base alla tua selezione.</p>
        </div>
        <div className="empty-state">
          <Sparkles size={48} />
          <p>Puoi procedere al prossimo step</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-step-content">
      <div className="step-description">
        <Sparkles size={18} />
        <p>
          <strong>Algoritmo intelligente attivo:</strong> Abbiamo analizzato i servizi che hai selezionato 
          e ti suggeriamo questi servizi complementari che potrebbero interessarti. 
          Basato su dipartimento, prezzo simile e servizi spesso acquistati insieme.
        </p>
      </div>

      <div className="recommended-services-grid">
        {recommendedServices.map((service) => {
          const isSelected = selectedServices.some(s => s.price_list_item_id === service.id);
          return (
            <div
              key={service.id}
              className={`recommended-service-card ${isSelected ? 'selected' : ''}`}
            >
              <div className="recommended-card-header">
                <h4>{service.name}</h4>
                {service.department && (
                  <span className="service-department">{service.department.name}</span>
                )}
              </div>
              {service.description && (
                <p className="recommended-card-description">
                  {service.description.substring(0, 120)}...
                </p>
              )}
              <div className="recommended-card-footer">
                <span className="recommended-price">
                  € {service.base_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
                {!isSelected && (
                  <button
                    className="btn-add-recommended"
                    onClick={() => handleAddRecommended(service)}
                  >
                    <Plus size={16} />
                    Aggiungi
                  </button>
                )}
                {isSelected && (
                  <span className="already-added">Già aggiunto</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuoteStep4Recommended;

