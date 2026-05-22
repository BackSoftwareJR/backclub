import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Package, Check } from 'lucide-react';
import priceListApi from '../../../api/priceList';
import { priceListQuestionsApi } from '../../../api/priceListQuestions';
import type { PriceListItem } from '../../../types/sellers';
import type { SelectedService, QuestionAnswer } from '../../../types/quotes';
import ServiceQuestionModal from '../../../components/Seller/ServiceQuestionModal';
import SelectedServicesSidebar from '../../../components/Seller/SelectedServicesSidebar';
import '../../../components/Seller/ServiceQuestionModal.css';
import '../../../components/Seller/SelectedServicesSidebar.css';
import './QuoteStep1Shop.css';

interface QuoteStep1ShopProps {
  selectedServices: SelectedService[];
  onAddService: (service: SelectedService) => void;
  onRemoveService: (index: number) => void;
  onUpdateService: (index: number, updates: Partial<SelectedService>) => void;
  onContinue: () => void;
}

const QuoteStep1Shop: React.FC<QuoteStep1ShopProps> = ({
  selectedServices,
  onAddService,
  onRemoveService,
  onUpdateService,
  onContinue,
}) => {
  const [services, setServices] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedServiceForQuestions, setSelectedServiceForQuestions] = useState<PriceListItem | null>(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);

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
      const response = await priceListApi.getAll(params);
      const items = response.data || [];
      const activeItems = items.filter((item: PriceListItem) => item.is_active !== false);
      setServices(activeItems);
    } catch (error: any) {
      console.error('Errore nel caricamento servizi:', error);
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
    const matchesSearch = (
      service.name.toLowerCase().includes(searchLower) ||
      service.description?.toLowerCase().includes(searchLower) ||
      service.department?.name.toLowerCase().includes(searchLower)
    );
    const matchesDepartment = departmentFilter === 'all' || 
      (service.department && String(service.department.id) === departmentFilter);
    return matchesSearch && matchesDepartment;
  });

  const isServiceSelected = (serviceId: number): boolean => {
    return selectedServices.some(s => s.price_list_item_id === serviceId);
  };

  const handleAddToQuote = async (service: PriceListItem) => {
    // Controlla se ci sono domande per questo servizio
    try {
      const questions = await priceListQuestionsApi.getQuestions(service.id);
      
      // Se non ci sono domande, aggiungi direttamente il servizio
      if (!questions || questions.length === 0) {
        const margin = service.margin_percentage || 0;
        const basePrice = service.base_price * (1 + margin / 100);
        
        const selectedService: SelectedService = {
          price_list_item_id: service.id,
          price_list_item: service,
          quantity: 1,
          unit_price: basePrice,
          discount: 0,
          total: basePrice,
          question_answers: [],
          price_adjustments: 0,
        };
        
        onAddService(selectedService);
      } else {
        // Se ci sono domande, apri il modal
        setSelectedServiceForQuestions(service);
      }
    } catch (error) {
      console.error('Errore nel controllo domande:', error);
      // In caso di errore, apri comunque il modal per sicurezza
    setSelectedServiceForQuestions(service);
    }
  };

  const handleQuestionsConfirmed = (service: PriceListItem, answers: QuestionAnswer[]) => {
    // Gli aggiustamenti sono già calcolati nel modal e passati come calculated_price_adjustment
    // Usa quello se disponibile, altrimenti calcola
    let priceAdjustments = 0;
    
    // Estrai calculated_price_adjustment se presente (viene passato come proprietà extra)
    const firstAnswer = answers[0] as any;
    if (firstAnswer && firstAnswer.calculated_price_adjustment !== undefined) {
      priceAdjustments = firstAnswer.calculated_price_adjustment;
    }
    
    // Rimuovi calculated_price_adjustment dalle risposte prima di salvare
    const cleanAnswers: QuestionAnswer[] = answers.map((answer) => {
      const { calculated_price_adjustment, ...rest } = answer as any;
      return rest as QuestionAnswer;
    });
    
    if (editingServiceIndex !== null) {
      // Modifica servizio esistente - mantieni prezzo base esistente
      const existingService = selectedServices[editingServiceIndex];
      const newTotal = existingService.unit_price + priceAdjustments;
      
      onUpdateService(editingServiceIndex, {
        question_answers: cleanAnswers,
        price_adjustments: priceAdjustments,
        total: newTotal,
      });
      setEditingServiceIndex(null);
    } else {
      // Aggiungi nuovo servizio
      // Calcola il prezzo con margine applicato
      const margin = service.margin_percentage || 0;
      const basePrice = service.base_price * (1 + margin / 100);
      
      const selectedService: SelectedService = {
        price_list_item_id: service.id,
        price_list_item: service,
        quantity: 1,
        unit_price: basePrice,
        discount: 0,
        total: basePrice + priceAdjustments,
        question_answers: cleanAnswers,
        price_adjustments: priceAdjustments,
      };
      
      onAddService(selectedService);
    }
    
    setSelectedServiceForQuestions(null);
  };

  const handleEditService = (index: number, service: SelectedService) => {
    setEditingServiceIndex(index);
    setSelectedServiceForQuestions(service.price_list_item);
  };

  const handleViewDetails = (service: PriceListItem) => {
    if (service.landing_page_url) {
      window.open(service.landing_page_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="quote-step1-shop">
        <div className="shop-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento servizi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-step1-shop">
      {/* Search Bar and Filters */}
      <div className="shop-search-container">
        <div className="shop-search-wrapper">
          <Search size={20} className="shop-search-icon" />
          <input
            type="text"
            className="shop-search-input"
            placeholder="Cerca servizi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="shop-filter-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">Tutte le tipologie</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Services Grid - Compact & Clickable */}
      <div className="shop-services-grid-compact">
        {filteredServices.length === 0 ? (
          <div className="shop-empty-state">
            <Package size={64} />
            <h3>Nessun servizio trovato</h3>
            <p>Prova a modificare i termini di ricerca</p>
          </div>
        ) : (
          filteredServices.map((service) => {
            const isSelected = isServiceSelected(service.id);
            const margin = service.margin_percentage || 0;
            const priceWithMargin = service.base_price * (1 + margin / 100);

            return (
              <div
                key={service.id}
                className={`shop-service-card-compact ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (isSelected) {
                    // Se già selezionato, rimuovi
                    const index = selectedServices.findIndex(s => s.price_list_item_id === service.id);
                    if (index !== -1) {
                      onRemoveService(index);
                    }
                  } else {
                    // Se non selezionato, aggiungi
                    handleAddToQuote(service);
                  }
                }}
              >
                {/* Checkmark Badge - Top Right */}
                {isSelected && (
                  <div className="service-checkmark-badge">
                    <Check size={12} />
                  </div>
                )}

                {/* Icon - Top Left */}
                <div className="service-card-icon-compact">
                  <Package size={20} />
                  </div>
                  
                {/* Content */}
                <div className="service-card-body-compact">
                  <h3 className="service-card-name-compact" title={service.name}>
                    {service.name}
                  </h3>
                    {service.description && (
                    <p className="service-card-description-compact" title={service.description}>
                      {service.description}
                      </p>
                    )}
                  <div className="service-card-price-compact">
                        € {priceWithMargin.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* External Link - Bottom Right (if available) */}
                  {service.landing_page_url && (
                    <button
                    className="service-card-external-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(service);
                    }}
                      title="Visualizza dettagli"
                    >
                    <ExternalLink size={14} />
                    </button>
                  )}
              </div>
            );
          })
        )}
      </div>

      {/* Question Modal */}
      {selectedServiceForQuestions && (() => {
        // Calcola prezzo base - assicurati che siano numeri
        const margin = parseFloat(String(selectedServiceForQuestions.margin_percentage || 0));
        const basePriceRaw = parseFloat(String(selectedServiceForQuestions.base_price || 0));
        const basePrice = basePriceRaw * (1 + margin / 100);
        
        // Se stiamo modificando un servizio esistente, usa il suo prezzo base
        const existingUnitPrice = editingServiceIndex !== null && editingServiceIndex >= 0 && editingServiceIndex < selectedServices.length
          ? parseFloat(String(selectedServices[editingServiceIndex].unit_price || 0))
          : null;
        
        const finalBasePrice = existingUnitPrice !== null ? existingUnitPrice : basePrice;
        
        return (
          <ServiceQuestionModal
            serviceId={selectedServiceForQuestions.id}
            serviceName={selectedServiceForQuestions.name}
            basePrice={finalBasePrice}
            existingAnswers={
              editingServiceIndex !== null && editingServiceIndex >= 0 && editingServiceIndex < selectedServices.length
                ? selectedServices[editingServiceIndex]?.question_answers || []
                : selectedServices.find(s => s.price_list_item_id === selectedServiceForQuestions.id)
                    ?.question_answers || []
            }
            onClose={() => {
              setSelectedServiceForQuestions(null);
              setEditingServiceIndex(null);
            }}
            onConfirm={(answers) => handleQuestionsConfirmed(selectedServiceForQuestions, answers)}
          />
        );
      })()}

      {/* Floating Dock */}
      <SelectedServicesSidebar
        services={selectedServices}
        onContinue={onContinue}
        onRemoveService={onRemoveService}
        onEditService={handleEditService}
        canContinue={selectedServices.length > 0}
      />
    </div>
  );
};

export default QuoteStep1Shop;

