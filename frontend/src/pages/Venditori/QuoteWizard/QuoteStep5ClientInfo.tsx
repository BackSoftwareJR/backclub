import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, CheckCircle2 } from 'lucide-react';
import { getClients } from '../../../api/clients';
import type { ClientInfo } from '../../../types/quotes';
import type { Client } from '../../../api/clients';
import './QuoteWizardSteps.css';
import './QuoteStep5ClientInfo.css';

interface QuoteStep5ClientInfoProps {
  client_id?: number;
  client_info: ClientInfo;
  onUpdate: (updates: { client_id?: number; client_info?: ClientInfo }) => void;
}

const QuoteStep5ClientInfo: React.FC<QuoteStep5ClientInfoProps> = ({
  client_id,
  client_info,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [useExisting, setUseExisting] = useState(!!client_id);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce per la ricerca
  useEffect(() => {
    if (useExisting) {
      const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchClients();
          setShowResults(true);
      } else if (searchTerm.length === 0) {
          setClients([]);
          setShowResults(false);
      }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, useExisting]);

  // Click outside per chiudere i risultati
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchClients = async () => {
    try {
      setLoading(true);
      const filteredClients = await getClients({ 
        search: searchTerm,
        active_only: true 
      });
      setClients(filteredClients);
    } catch (error) {
      console.error('Errore nella ricerca clienti:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    onUpdate({
      client_id: client.id,
      client_info: {
        company_name: client.company_name || '',
        email: client.email || '',
        phone: client.phone || '',
        vat_number: client.vat_number || client.partita_iva || '',
        address: client.address || '',
        city: '',
        zip_code: '',
        country: 'Italia',
      },
    });
    setSearchTerm(client.company_name);
    setShowResults(false);
  };

  const handleInfoChange = (field: keyof ClientInfo, value: string) => {
    onUpdate({
      client_info: { ...client_info, [field]: value },
    });
  };

  return (
    <div className="quote-step-content">
      <div className="client-info-container">
        {/* Segmented Control iOS-style */}
        <div className="client-segmented-control">
        <button
            type="button"
            className={`segment-button ${useExisting ? 'active' : ''}`}
            onClick={() => {
              setUseExisting(true);
              setSearchTerm('');
              setClients([]);
              setShowResults(false);
            }}
          >
          Cliente Esistente
        </button>
        <button
            type="button"
            className={`segment-button ${!useExisting ? 'active' : ''}`}
          onClick={() => {
            setUseExisting(false);
            onUpdate({ client_id: undefined });
          }}
        >
          Nuovo Cliente
        </button>
      </div>

      {useExisting ? (
          /* Search Section - Spotlight Style */
          <div className="client-search-wrapper" ref={searchRef}>
            <div className="client-search-bar">
              <Search size={20} className="client-search-icon" />
            <input
              type="text"
                className="client-search-input"
                placeholder="Cerca cliente per nome azienda o email..."
              value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.length >= 2) {
                    setShowResults(true);
                  }
                }}
                onFocus={() => {
                  if (clients.length > 0) {
                    setShowResults(true);
                  }
                }}
            />
          </div>

          {loading && (
              <div className="client-search-loading">
              <div className="loading-spinner"></div>
            </div>
          )}

            {showResults && !loading && clients.length > 0 && (
              <div className="client-search-results">
              {clients.map((client) => (
                <div
                  key={client.id}
                    className={`client-result-item ${client_id === client.id ? 'selected' : ''}`}
                  onClick={() => handleSelectClient(client)}
                >
                    <Building2 size={18} className="client-result-icon" />
                    <div className="client-result-info">
                      <div className="client-result-name">{client.company_name}</div>
                    {client.email && (
                        <div className="client-result-email">{client.email}</div>
                    )}
                    </div>
                    {client_id === client.id && (
                      <CheckCircle2 size={18} className="client-result-check" />
                    )}
                </div>
              ))}
            </div>
          )}

            {showResults && !loading && searchTerm.length >= 2 && clients.length === 0 && (
              <div className="client-search-empty">
                <p>Nessun cliente trovato</p>
            </div>
          )}

            {client_id && !showResults && (
              <div className="client-selected-badge">
                <CheckCircle2 size={16} />
                <span>Cliente selezionato</span>
            </div>
          )}
        </div>
      ) : (
          /* Form Section - Minimal 3 Fields */
          <div className="client-form-minimal">
            <div className="client-form-field">
              <label className="client-form-label">RAGIONE SOCIALE</label>
              <input
                type="text"
                className="client-form-input"
                required
                value={client_info.company_name}
                onChange={(e) => handleInfoChange('company_name', e.target.value)}
                placeholder="Es: Tech Solutions SRL"
              />
            </div>

            <div className="client-form-row">
              <div className="client-form-field client-form-field-half">
                <label className="client-form-label">EMAIL</label>
              <input
                type="email"
                  className="client-form-input"
                required
                value={client_info.email}
                onChange={(e) => handleInfoChange('email', e.target.value)}
                placeholder="email@azienda.it"
              />
            </div>

              <div className="client-form-field client-form-field-half">
                <label className="client-form-label">TELEFONO</label>
              <input
                type="tel"
                  className="client-form-input"
                value={client_info.phone || ''}
                onChange={(e) => handleInfoChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
              />
            </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default QuoteStep5ClientInfo;

