import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronRight, Package, Edit2, Trash2 } from 'lucide-react';
import priceListApi from '../../../api/priceList';
import { priceListQuestionsApi } from '../../../api/priceListQuestions';
import type { PriceListItem } from '../../../types/sellers';
import type { SelectedService, QuestionAnswer } from '../../../types/quotes';
import ServiceQuestionModal from '../../../components/Seller/ServiceQuestionModal';
import BottomSheet from '../../../components/Mobile/BottomSheet';
import '../../../components/Seller/ServiceQuestionModal.css';
import './QuoteStep1ShopMobile.css';

interface QuoteStep1ShopMobileProps {
  selectedServices: SelectedService[];
  onAddService: (service: SelectedService) => void;
  onRemoveService: (index: number) => void;
  onUpdateService: (index: number, updates: Partial<SelectedService>) => void;
  onContinue: () => void;
  currentStep: number;
  totalSteps: number;
}

const QuoteStep1ShopMobile: React.FC<QuoteStep1ShopMobileProps> = ({
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
  const [showSelectedServicesSheet, setShowSelectedServicesSheet] = useState(false);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

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
    try {
      const questions = await priceListQuestionsApi.getQuestions(service.id);
      
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
        setSelectedServiceForQuestions(service);
      }
    } catch (error) {
      console.error('Errore nel controllo domande:', error);
      setSelectedServiceForQuestions(service);
    }
  };

  const handleToggleService = (service: PriceListItem) => {
    if (isServiceSelected(service.id)) {
      const index = selectedServices.findIndex(s => s.price_list_item_id === service.id);
      if (index !== -1) {
        onRemoveService(index);
      }
    } else {
      handleAddToQuote(service);
    }
  };

  const handleQuestionsConfirmed = (service: PriceListItem, answers: QuestionAnswer[]) => {
    let priceAdjustments = 0;
    const firstAnswer = answers[0] as any;
    if (firstAnswer && firstAnswer.calculated_price_adjustment !== undefined) {
      priceAdjustments = firstAnswer.calculated_price_adjustment;
    }
    
    const cleanAnswers: QuestionAnswer[] = answers.map((answer) => {
      const { calculated_price_adjustment, ...rest } = answer as any;
      return rest as QuestionAnswer;
    });
    
    if (editingServiceIndex !== null) {
      const existingService = selectedServices[editingServiceIndex];
      const newTotal = existingService.unit_price + priceAdjustments;
      
      onUpdateService(editingServiceIndex, {
        question_answers: cleanAnswers,
        price_adjustments: priceAdjustments,
        total: newTotal,
      });
      setEditingServiceIndex(null);
    } else {
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

  const handleEditService = (index: number) => {
    setEditingServiceIndex(index);
    setSelectedServiceForQuestions(selectedServices[index].price_list_item);
    setShowSelectedServicesSheet(false);
  };

  // Calcola il totale
  const totalAmount = selectedServices.reduce((sum, service) => sum + (service.total || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="quote-step1-shop-mobile">
        <div className="shop-loading-mobile">
          <div className="loading-spinner-mobile"></div>
          <p>Caricamento servizi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-step1-shop-mobile">
      {/* iOS Search Bar */}
      <div className="shop-search-container-mobile">
        <div className="shop-search-bar-mobile">
          <Search size={18} className="shop-search-icon-mobile" />
          <input
            type="text"
            className="shop-search-input-mobile"
            placeholder="Cerca"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Pills - Horizontal Scrollable */}
      <div className="shop-categories-container-mobile" ref={categoriesScrollRef}>
        <div className="shop-categories-scroll-mobile">
          <button
            className={`shop-category-pill ${departmentFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDepartmentFilter('all')}
          >
            Tutti
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              className={`shop-category-pill ${departmentFilter === String(dept.id) ? 'active' : ''}`}
              onClick={() => setDepartmentFilter(String(dept.id))}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services List - iOS Inset Grouped Style */}
      <div className="shop-services-list-mobile">
        {filteredServices.length === 0 ? (
          <div className="shop-empty-state-mobile">
            <Package size={48} />
            <h3>Nessun servizio trovato</h3>
            <p>Prova a modificare la ricerca o i filtri</p>
          </div>
        ) : (
          <div className="ios-inset-grouped-list">
            {filteredServices.map((service) => {
              const isSelected = isServiceSelected(service.id);
              const margin = service.margin_percentage || 0;
              const priceWithMargin = service.base_price * (1 + margin / 100);

              return (
                <div
                  key={service.id}
                  className="shop-service-row-mobile ios-inset-grouped-cell"
                  onClick={() => handleToggleService(service)}
                >
                  {/* Icon Box */}
                  <div className="shop-service-icon-mobile">
                    <Package size={20} />
                  </div>

                  {/* Info Center */}
                  <div className="shop-service-info-mobile">
                    <div className="shop-service-name-mobile">{service.name}</div>
                    {service.description && (
                      <div className="shop-service-description-mobile">
                        {service.description}
                      </div>
                    )}
                    <div className="shop-service-price-mobile">
                      {formatCurrency(priceWithMargin)}
                    </div>
                  </div>

                  {/* Selection Checkmark */}
                  <div className="shop-service-checkmark-mobile">
                    {isSelected ? (
                      <Check size={22} className="checkmark-filled" />
                    ) : (
                      <div className="checkmark-empty" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Footer with Total and Continue Button */}
      {selectedServices.length > 0 && (
        <div className="shop-footer-mobile">
          <button
            className="shop-footer-services-btn"
            onClick={() => setShowSelectedServicesSheet(true)}
          >
            <div className="shop-footer-services-count">{selectedServices.length}</div>
            <div className="shop-footer-services-label">Servizi</div>
          </button>
          <div className="shop-footer-center">
            <div className="shop-footer-label">Totale</div>
            <div className="shop-footer-total">{formatCurrency(totalAmount)}</div>
          </div>
          <button
            className="shop-footer-continue-btn"
            onClick={onContinue}
          >
            Avanti
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Selected Services Bottom Sheet */}
      <BottomSheet
        isOpen={showSelectedServicesSheet}
        onClose={() => setShowSelectedServicesSheet(false)}
        title="Servizi Selezionati"
        snapPoints={[70, 90]}
      >
        <div className="selected-services-sheet-content">
          {selectedServices.map((service, index) => {
            const serviceItem = service.price_list_item;
            return (
              <div key={index} className="selected-service-item-mobile">
                <div className="selected-service-item-left">
                  <div className="selected-service-icon-small">
                    <Package size={16} />
                  </div>
                  <div className="selected-service-info">
                    <div className="selected-service-name">{serviceItem.name}</div>
                    <div className="selected-service-meta">
                      Quantità: {service.quantity} • {formatCurrency(service.total || 0)}
                    </div>
                  </div>
                </div>
                <div className="selected-service-item-actions">
                  <button
                    className="selected-service-action-btn"
                    onClick={() => handleEditService(index)}
                    title="Modifica"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="selected-service-action-btn selected-service-action-btn-danger"
                    onClick={() => {
                      onRemoveService(index);
                      if (selectedServices.length === 1) {
                        setShowSelectedServicesSheet(false);
                      }
                    }}
                    title="Rimuovi"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* Question Modal */}
      {selectedServiceForQuestions && (() => {
        const margin = parseFloat(String(selectedServiceForQuestions.margin_percentage || 0));
        const basePriceRaw = parseFloat(String(selectedServiceForQuestions.base_price || 0));
        const basePrice = basePriceRaw * (1 + margin / 100);
        
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
    </div>
  );
};

export default QuoteStep1ShopMobile;
