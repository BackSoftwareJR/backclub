import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, X, Edit2, Package } from 'lucide-react';
import { priceListQuestionsApi } from '../../api/priceListQuestions';
import type { SelectedService } from '../../types/quotes';
import './SelectedServicesSidebar.css';

interface SelectedServicesSidebarProps {
  services: SelectedService[];
  onContinue: () => void;
  onRemoveService: (index: number) => void;
  onEditService: (index: number, service: SelectedService) => void;
  canContinue: boolean;
}

const SelectedServicesSidebar: React.FC<SelectedServicesSidebarProps> = ({
  services,
  onContinue,
  onRemoveService,
  onEditService,
  canContinue,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [servicesWithQuestions, setServicesWithQuestions] = useState<Set<number>>(new Set());
  const dockRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isPopoverOpen]);

  const total = services.reduce((sum, service) => {
    const serviceTotal = typeof service.total === 'number' ? service.total : parseFloat(String(service.total || 0));
    return sum + serviceTotal;
  }, 0);

  // Check which services have questions
  React.useEffect(() => {
    const checkServicesQuestions = async () => {
      const servicesWithQuestionsSet = new Set<number>();
      
      for (const service of services) {
        const serviceId = service.price_list_item.id;
        
        // Se il servizio ha già question_answers, ha domande
        if (service.question_answers && service.question_answers.length > 0) {
          servicesWithQuestionsSet.add(serviceId);
      } else {
          // Altrimenti controlla se ci sono domande per questo servizio
          try {
            const questions = await priceListQuestionsApi.getQuestions(serviceId);
            if (questions && questions.length > 0) {
              servicesWithQuestionsSet.add(serviceId);
            }
          } catch (error) {
            console.error(`Errore nel controllo domande per servizio ${serviceId}:`, error);
          }
        }
      }
      
      setServicesWithQuestions(servicesWithQuestionsSet);
    };

    if (services.length > 0) {
      checkServicesQuestions();
    }
  }, [services]);

  if (services.length === 0) {
    return null;
  }

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPopoverOpen(!isPopoverOpen);
  };

  // Floating Dock - Bottom Center
  const dockContent = (
    <div className="selected-services-dock" ref={dockRef}>
      {/* Popover List */}
      {isPopoverOpen && (
        <div className="dock-popover">
          <div className="popover-header">
            <span className="popover-title">Riepilogo Selezione</span>
            <button
              className="popover-close-btn"
              onClick={handleInfoClick}
              title="Chiudi"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="popover-list">
            {services.map((service, index) => {
              const serviceId = service.price_list_item.id;
              const hasQuestions = servicesWithQuestions.has(serviceId);
              
              return (
                <div key={index} className="popover-item">
                  <div className="popover-item-content">
                    <div className="popover-item-icon">
                      <Package size={16} />
                    </div>
                    <div className="popover-item-info">
                      <div className="popover-item-title" title={service.price_list_item.name}>
                        {service.price_list_item.name}
                  </div>
                      <div className="popover-item-price">
                    € {service.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                  </div>
                  <div className="popover-item-actions">
                    {hasQuestions && (
                  <button
                        className="popover-action-btn popover-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditService(index, service);
                          setIsPopoverOpen(false);
                    }}
                    title="Modifica risposte"
                  >
                    <Edit2 size={14} />
                  </button>
                    )}
                  <button
                      className="popover-action-btn popover-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveService(index);
                    }}
                    title="Rimuovi servizio"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dock-content">
        <div className="dock-info">
          <span 
            className="dock-count dock-count-clickable"
            onClick={handleInfoClick}
          >
            {services.length} {services.length === 1 ? 'Servizio' : 'Servizi'} Selezionati
          </span>
          <span className="dock-separator">|</span>
          <span className="dock-total">
            Totale: € {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
          className="dock-continue-btn"
            onClick={onContinue}
            disabled={!canContinue}
          >
          Avanti
            <ChevronRight size={16} />
          </button>
      </div>
    </div>
  );

  // Renderizza nel body usando portal per essere sempre visibile
  return createPortal(dockContent, document.body);
};

export default SelectedServicesSidebar;

