import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, RefreshCw, CreditCard, CheckCircle2, Plus, Trash2, Search, Package } from 'lucide-react';
import quotesApi from '../../api/quotes';
import priceListApi from '../../api/priceList';
import type { Quote, QuoteItem, PriceListItem, PaymentOption, RenewalOption } from '../../types/sellers';
import './QuoteEditPage.css';

interface ExtendedQuoteItem extends QuoteItem {
  editingRenewal?: boolean;
  renewalPrice?: number;
  price_list_item?: PriceListItem; // Caricato separatamente se necessario
  selected_features?: string[]; // Features selezionate
  /** Chiave React per righe nuove (non ancora salvate) */
  clientTempId?: string;
}

const QuoteEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    discount_percentage: 0,
    tax_percentage: 0, // Sempre 0 - esente IVA
    valid_until: '',
  });

  const [items, setItems] = useState<ExtendedQuoteItem[]>([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<PriceListItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCustomLineModal, setShowCustomLineModal] = useState(false);
  const [customLine, setCustomLine] = useState({ description: '', unit_price: '' });

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const data = await quotesApi.getById(Number(id));
      setQuote(data);
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        notes: data.notes || '',
        discount_percentage: data.discount_percentage || 0,
        tax_percentage: 0, // Sempre 0 - esente IVA
        valid_until: data.valid_until ? data.valid_until.split('T')[0] : '',
      });

      // Carica items e per ognuno carica il price_list_item se necessario
      if (data.items) {
        const itemsWithDetails = await Promise.all(
          data.items.map(async (item) => {
            let priceListItem = item.price_list_item;
            
            // Se non c'è il price_list_item ma c'è l'ID, caricalo
            if (!priceListItem && item.price_list_item_id) {
              try {
                priceListItem = await priceListApi.getById(item.price_list_item_id);
              } catch (error) {
                console.error(`Errore nel caricamento price_list_item ${item.price_list_item_id}:`, error);
              }
            }

            // Parse selected_features se è una stringa JSON
            let selectedFeatures: string[] = [];
            if (item.selected_features) {
              if (typeof item.selected_features === 'string') {
                try {
                  selectedFeatures = JSON.parse(item.selected_features);
                } catch (e) {
                  console.error('Errore parsing selected_features:', e);
                  selectedFeatures = [];
                }
              } else if (Array.isArray(item.selected_features)) {
                selectedFeatures = item.selected_features;
              }
            }
            
            // Se non ci sono features salvate ma c'è un price_list_item, usa quelle disponibili come default
            if (selectedFeatures.length === 0 && priceListItem?.features && Array.isArray(priceListItem.features)) {
              // NON usare tutte le features come default - usa solo quelle salvate
              // selectedFeatures = priceListItem.features;
            }

            // Parse payment_option se è una stringa JSON
            let paymentOption = item.payment_option;
            if (paymentOption && typeof paymentOption === 'string') {
              try {
                paymentOption = JSON.parse(paymentOption);
              } catch (e) {
                console.error('Errore parsing payment_option:', e);
                paymentOption = undefined;
              }
            }

            // Parse renewal_option se è una stringa JSON
            let normalizedRenewalOption = item.renewal_option;
            if (normalizedRenewalOption) {
              if (typeof normalizedRenewalOption === 'string') {
                try {
                  normalizedRenewalOption = JSON.parse(normalizedRenewalOption);
                } catch (e) {
                  console.error('Errore parsing renewal_option:', e);
                  normalizedRenewalOption = undefined;
                }
              }
              
              if (normalizedRenewalOption && typeof normalizedRenewalOption === 'object') {
                normalizedRenewalOption = {
                  ...normalizedRenewalOption,
                  // Assicurati che includes sia sempre un array
                  includes: Array.isArray(normalizedRenewalOption.includes) 
                    ? normalizedRenewalOption.includes 
                    : (normalizedRenewalOption.includes ? [normalizedRenewalOption.includes] : []),
                };
              }
            }

            return {
              ...item,
              editingRenewal: false,
              renewalPrice: normalizedRenewalOption?.price || undefined,
              renewal_option: normalizedRenewalOption || undefined,
              payment_option: paymentOption || undefined,
              price_list_item: priceListItem,
              selected_features: selectedFeatures, // Features selezionate (caricate dal DB)
            } as ExtendedQuoteItem;
          })
        );
        
        setItems(itemsWithDetails);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento preventivo:', error);
      alert('Errore nel caricamento del preventivo');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await priceListApi.getAll({ is_active: true, per_page: 500, sort_by: 'name', sort_order: 'asc' });
      setCatalogItems(res.data || []);
    } catch (e) {
      console.error(e);
      alert('Impossibile caricare il listino');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (showAddServiceModal) {
      loadCatalog();
      setCatalogSearch('');
    }
  }, [showAddServiceModal]);

  const paymentOptionFromList = (pl: PriceListItem): PaymentOption | undefined => {
    const opt = pl.payment_options?.[0];
    if (!opt) return undefined;
    const normalizedType = opt.type === 'rate' ? 'installments' : opt.type;
    const po: PaymentOption = { type: normalizedType, label: opt.label };
    if (opt.installments != null) po.installments = opt.installments;
    if (opt.percentages) po.percentages = [...opt.percentages];
    if (opt.days != null) po.days = opt.days;
    if (normalizedType === 'installments' && !po.installments) po.installments = 2;
    return po;
  };

  const addServiceFromCatalog = async (pl: PriceListItem) => {
    let full = pl;
    try {
      full = await priceListApi.getById(pl.id);
    } catch {
      /* usa pl parziale */
    }
    const unit = full.base_price ?? 0;
    const newItem: ExtendedQuoteItem = {
      clientTempId: `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      price_list_item_id: full.id,
      description: full.name,
      quantity: 1,
      unit_price: unit,
      discount: 0,
      total: unit,
      price_list_item: full,
      payment_option: paymentOptionFromList(full),
      selected_features: [],
      renewal_option: undefined,
      notes: '',
    };
    setItems(prev => [...prev, newItem]);
    setShowAddServiceModal(false);
  };

  const addCustomLine = () => {
    const desc = customLine.description.trim();
    const price = parseFloat(customLine.unit_price.replace(',', '.')) || 0;
    if (!desc) {
      alert('Inserisci la descrizione della voce');
      return;
    }
    if (price < 0) {
      alert('Il prezzo non è valido');
      return;
    }
    const newItem: ExtendedQuoteItem = {
      clientTempId: `c_${Date.now()}`,
      price_list_item_id: undefined,
      description: desc,
      quantity: 1,
      unit_price: price,
      discount: 0,
      total: price,
      price_list_item: undefined,
      payment_option: undefined,
      selected_features: [],
      notes: '',
    };
    setItems(prev => [...prev, newItem]);
    setCustomLine({ description: '', unit_price: '' });
    setShowCustomLineModal(false);
  };

  const removeItemAt = (index: number) => {
    if (items.length <= 1) {
      alert('Il preventivo deve contenere almeno un servizio o voce. Aggiungi un altro servizio prima di rimuovere questo.');
      return;
    }
    if (!window.confirm('Rimuovere questo servizio dal preventivo? Ricorda di salvare le modifiche.')) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    
    // Ricalcola total se cambia quantity, unit_price o discount
    if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
      const item = updatedItems[index];
      const subtotal = item.quantity * item.unit_price;
      const discountAmount = subtotal * (item.discount / 100);
      updatedItems[index].total = subtotal - discountAmount;
    }
    
    setItems(updatedItems);
  };

  const handlePaymentOptionChange = (index: number, option: PaymentOption) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      payment_option: option,
    };
    setItems(updatedItems);
  };

  const handleFeaturesChange = (index: number, feature: string, checked: boolean) => {
    const updatedItems = [...items];
    const currentFeatures = updatedItems[index].selected_features || [];
    
    if (checked) {
      updatedItems[index].selected_features = [...currentFeatures, feature];
    } else {
      updatedItems[index].selected_features = currentFeatures.filter(f => f !== feature);
    }
    
    setItems(updatedItems);
  };

  const handleRenewalSelection = (index: number, renewal: RenewalOption | null) => {
    const updatedItems = [...items];
    if (renewal) {
      // Assicurati che il renewal_option abbia tutti i campi necessari
      updatedItems[index] = {
        ...updatedItems[index],
        renewal_option: {
          id: renewal.id,
          duration: renewal.duration,
          duration_months: renewal.duration_months,
          price: renewal.price,
          description: renewal.description,
          includes: renewal.includes || [],
          is_active: renewal.is_active !== false,
        },
        renewalPrice: renewal.price,
        editingRenewal: false,
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        renewal_option: undefined,
        renewalPrice: undefined,
        editingRenewal: false,
      };
    }
    setItems(updatedItems);
  };

  const handleRenewalPriceChange = (index: number, price: number) => {
    const updatedItems = [...items];
    if (updatedItems[index].renewal_option) {
      const currentRenewal = updatedItems[index].renewal_option!;
      updatedItems[index] = {
        ...updatedItems[index],
        renewal_option: {
          ...currentRenewal,
          price: price,
        },
        renewalPrice: price,
      };
    }
    setItems(updatedItems);
  };

  const handleRenewalFieldChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    if (updatedItems[index].renewal_option) {
      const currentRenewal = updatedItems[index].renewal_option!;
      
      // Gestisci includes in modo speciale
      if (field === 'includes') {
        updatedItems[index] = {
          ...updatedItems[index],
          renewal_option: {
            ...currentRenewal,
            includes: Array.isArray(value) ? value : [],
          },
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          renewal_option: {
            ...currentRenewal,
            [field]: value,
          },
        };
      }
      
      // Aggiorna anche renewalPrice se cambia il prezzo
      if (field === 'price') {
        updatedItems[index].renewalPrice = value;
      }
    }
    setItems(updatedItems);
  };

  const handleSave = async () => {
    if (!quote) return;

    try {
      setSaving(true);

      // Prepara items per il salvataggio
      const itemsToSave = items.map((item, index) => {
        // Assicurati che renewal_option sia un oggetto valido o null
        let renewalOption = null;
        if (item.renewal_option && (typeof item.renewal_option === 'object')) {
          // Assicurati che includes sia sempre un array
          const includesArray = Array.isArray(item.renewal_option.includes) 
            ? item.renewal_option.includes 
            : (item.renewal_option.includes ? [item.renewal_option.includes] : []);
          
          renewalOption = {
            id: item.renewal_option.id || undefined, // ID opzionale (può essere stringa o numero)
            duration: item.renewal_option.duration || 'monthly',
            duration_months: item.renewal_option.duration_months || undefined,
            price: item.renewalPrice !== undefined ? item.renewalPrice : (item.renewal_option.price || 0), // Usa il prezzo modificato se presente
            description: item.renewal_option.description || '',
            includes: includesArray,
            is_active: item.renewal_option.is_active !== false,
          };
        }

        // Prepara payment_option - assicurati che sia un oggetto valido
        let paymentOption: PaymentOption | undefined = undefined;
        if (item.payment_option) {
          // Se è una stringa, prova a parsarla
          let parsedPaymentOption: any = item.payment_option;
          if (typeof item.payment_option === 'string') {
            try {
              parsedPaymentOption = JSON.parse(item.payment_option);
            } catch (e) {
              console.error('Errore parsing payment_option:', e);
              parsedPaymentOption = undefined;
            }
          }
          
          if (parsedPaymentOption && parsedPaymentOption !== undefined && typeof parsedPaymentOption === 'object' && Object.keys(parsedPaymentOption).length > 0) {
            paymentOption = {
              type: parsedPaymentOption.type,
              label: parsedPaymentOption.label || parsedPaymentOption.type,
            } as PaymentOption;
            // Aggiungi campi opzionali se presenti
            if (parsedPaymentOption.installments !== undefined) {
              (paymentOption as any).installments = parsedPaymentOption.installments;
            }
            if (parsedPaymentOption.percentages !== undefined) {
              (paymentOption as any).percentages = [...parsedPaymentOption.percentages];
            }
            if (parsedPaymentOption.days !== undefined) {
              (paymentOption as any).days = parsedPaymentOption.days;
            }
          }
        }

        // Prepara selected_features - assicurati che sia sempre un array
        let selectedFeatures: string[] = [];
        if (item.selected_features) {
          if (Array.isArray(item.selected_features)) {
            selectedFeatures = item.selected_features;
          } else if (typeof item.selected_features === 'string') {
            try {
              selectedFeatures = JSON.parse(item.selected_features);
            } catch (e) {
              console.error('Errore parsing selected_features:', e);
              selectedFeatures = [];
            }
          }
        }

        const itemToSave: any = {
          id: item.id && !item.clientTempId ? item.id : undefined,
          price_list_item_id: item.price_list_item_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          total: item.total,
        };

        // Aggiungi payment_option SEMPRE (anche se undefined) - importante per salvare
        itemToSave.payment_option = paymentOption || null;
        
        // Aggiungi renewal_option SEMPRE (anche se null) - importante per salvare
        itemToSave.renewal_option = renewalOption || null;
        
        // Aggiungi selected_features sempre (anche se array vuoto) - importante per salvare le selezioni
        itemToSave.selected_features = selectedFeatures;
        
        // Aggiungi notes SEMPRE (anche se null o vuoto) - importante per salvare
        itemToSave.notes = item.notes || null;

        // Debug per ogni item
        console.log(`Item ${index} da salvare:`, {
          description: itemToSave.description,
          payment_option: itemToSave.payment_option,
          renewal_option: itemToSave.renewal_option,
          selected_features: itemToSave.selected_features,
          notes: itemToSave.notes,
        });

        return itemToSave;
      });

      // Prepara i dati da inviare - ASSICURATI che tutti i campi siano sempre presenti
      const updateData: any = {
        title: formData.title || '',
        description: formData.description !== undefined ? formData.description : null,
        notes: formData.notes !== undefined ? formData.notes : null,
        discount_percentage: formData.discount_percentage || 0,
        tax_percentage: 0, // Sempre 0 - esente IVA
        items: itemsToSave,
        valid_until: formData.valid_until || null, // Sempre presente, anche se null
      };

      // Debug: verifica cosa viene inviato
      console.log('=== QuoteEditPage - Dati da salvare ===');
      console.log('updateData:', JSON.stringify(updateData, null, 2));
      console.log('itemsToSave:', JSON.stringify(itemsToSave, null, 2));
      console.log('formData:', formData);
      console.log('items state:', items);

      const response = await quotesApi.update(quote.id, updateData);
      
      console.log('=== Risposta dal server ===');
      console.log('Response:', response);
      
      // Ricarica i dati aggiornati invece di navigare via
      await loadQuote();
      
      alert('Preventivo aggiornato con successo');
    } catch (error: any) {
      console.error('=== Errore nel salvataggio ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Errore nel salvataggio del preventivo';
      
      alert(`Errore: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="quote-edit-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-edit-empty">
        <h3>Preventivo non trovato</h3>
        <button onClick={() => navigate(-1)}>Torna indietro</button>
      </div>
    );
  }

  const getDurationLabel = (duration: string, durationMonths?: number) => {
    const labels: Record<string, string> = {
      monthly: 'Mensile',
      quarterly: 'Trimestrale',
      semiannual: 'Semestrale',
      annual: 'Annuale',
      custom: durationMonths ? `Personalizzata (${durationMonths} mesi)` : 'Personalizzata',
    };
    return labels[duration] || duration;
  };

  return (
    <div className="quote-edit-page">
      <div className="quote-edit-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Indietro
        </button>
        <div className="header-content">
          <h1>Modifica Preventivo {quote.quote_number}</h1>
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              <X size={18} />
              Annulla
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>

      <div className="quote-edit-content">
        {/* Informazioni Generali */}
        <div className="edit-section">
          <h2>Informazioni Generali</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Titolo *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Validità fino al</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
            <div className="form-group full-width">
              <label>Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="form-group full-width">
              <label>Note</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Sconto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>IVA (%)</label>
              <input
                type="number"
                value="0"
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                title="Esente IVA - sempre 0%"
              />
              <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Esente IVA - sempre 0%
              </small>
            </div>
          </div>
        </div>

        {/* Articoli */}
        <div className="edit-section">
          <div className="edit-section-header-row">
            <h2>Servizi e voci ({items.length})</h2>
            <div className="edit-section-actions">
              <button type="button" className="btn-add-service" onClick={() => setShowAddServiceModal(true)}>
                <Plus size={18} />
                Aggiungi dal listino
              </button>
              <button type="button" className="btn-add-service btn-add-service-secondary" onClick={() => setShowCustomLineModal(true)}>
                <Plus size={18} />
                Voce personalizzata
              </button>
            </div>
          </div>
          <p className="edit-section-hint">
            Puoi aggiungere più servizi dal listino, rimuovere singole voci (ne resta almeno una) e salvare. Le modifiche si applicano al preventivo solo dopo &quot;Salva modifiche&quot;.
          </p>
          <div className="items-list">
            {items.map((item, index) => {
              const priceListItem = item.price_list_item;
              const availablePaymentOptions = priceListItem?.payment_options || [];
              const availableRenewalOptions = priceListItem?.renewal_options || [];
              const availableFeatures = priceListItem?.features || [];

              // Riepilogo informazioni salvate
              const hasPaymentOption = item.payment_option && Object.keys(item.payment_option).length > 0;
              const hasRenewalOption = item.renewal_option && typeof item.renewal_option === 'object';
              const hasSelectedFeatures = item.selected_features && item.selected_features.length > 0;
              const hasNotes = item.notes && item.notes.trim().length > 0;

              return (
                <div key={item.id ?? item.clientTempId ?? `idx-${index}`} className="item-card">
                  <div className="item-header">
                    <h3>{item.description}</h3>
                    <div className="item-header-actions">
                      {priceListItem && (
                        <span className="item-badge">Dal Listino</span>
                      )}
                      {!priceListItem && (
                        <span className="item-badge item-badge-custom">Voce libera</span>
                      )}
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => removeItemAt(index)}
                        title={items.length <= 1 ? 'Serve almeno una voce' : 'Rimuovi dal preventivo'}
                        disabled={items.length <= 1}
                      >
                        <Trash2 size={18} />
                        Rimuovi
                      </button>
                    </div>
                  </div>
                  
                  {/* Riepilogo Informazioni Salvate */}
                  {(hasPaymentOption || hasRenewalOption || hasSelectedFeatures || hasNotes) && (
                    <div className="item-section summary-section">
                      <div className="section-title">
                        <CheckCircle2 size={18} />
                        <span>Informazioni Salvate</span>
                      </div>
                      <div className="summary-grid">
                        {hasPaymentOption && item.payment_option && (
                          <div className="summary-item">
                            <strong>Pagamento:</strong>
                            <span>
                              {item.payment_option.label || item.payment_option.type}
                              {item.payment_option.installments && ` (${item.payment_option.installments} rate)`}
                              {item.payment_option.days && ` (${item.payment_option.days} giorni)`}
                            </span>
                          </div>
                        )}
                        {hasRenewalOption && item.renewal_option && (
                          <div className="summary-item">
                            <strong>Rinnovo:</strong>
                            <span>
                              {getDurationLabel(item.renewal_option.duration, item.renewal_option.duration_months)} - 
                              € {((item.renewalPrice !== undefined ? item.renewalPrice : item.renewal_option.price) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {hasSelectedFeatures && item.selected_features && (
                          <div className="summary-item full-width">
                            <strong>Caratteristiche ({item.selected_features.length}):</strong>
                            <div className="features-summary">
                              {item.selected_features.map((feat, idx) => (
                                <span key={idx} className="feature-tag">{feat}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasNotes && (
                          <div className="summary-item full-width">
                            <strong>Note Articolo:</strong>
                            <span className="notes-preview">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Campi Base - Prezzo e Quantità */}
                  <div className="item-section">
                    <div className="section-title">
                      <span>Prezzo e Quantità</span>
                    </div>
                    <div className="item-fields">
                      <div className="field-group">
                        <label>Quantità</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="field-group">
                        <label>Prezzo Unitario (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="field-group">
                        <label>Sconto (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="field-group">
                        <label>Totale</label>
                        <div className="total-display">
                          € {item.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metodo di Pagamento */}
                  {availablePaymentOptions.length > 0 && (
                    <div className="item-section">
                      <div className="section-title">
                        <CreditCard size={18} />
                        <span>Metodo di Pagamento</span>
                      </div>
                      <div className="payment-options-grid">
                        {availablePaymentOptions.map((option, optIndex) => {
                          const optionType = option.type === 'rate' ? 'installments' : option.type;
                          const currentType = item.payment_option?.type === 'rate' ? 'installments' : item.payment_option?.type;
                          const isSelected = currentType === optionType || item.payment_option?.type === option.type;

                          return (
                            <label
                              key={optIndex}
                              className={`payment-option-card ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`payment-${index}`}
                                checked={isSelected}
                                onChange={() => {
                                  const normalizedType = option.type === 'rate' ? 'installments' : option.type;
                                  const newOption: PaymentOption = {
                                    type: normalizedType,
                                    label: option.label,
                                  };
                                  
                                  if (option.installments !== undefined) {
                                    newOption.installments = option.installments;
                                  }
                                  if (option.percentages !== undefined) {
                                    newOption.percentages = [...option.percentages];
                                  }
                                  if (option.days !== undefined) {
                                    newOption.days = option.days;
                                  }
                                  
                                  if (normalizedType === 'installments' || option.type === 'rate') {
                                    newOption.installments = newOption.installments || item.payment_option?.installments || 2;
                                  }
                                  
                                  handlePaymentOptionChange(index, newOption);
                                }}
                              />
                              <div className="option-content">
                                <span className="option-label">{option.label}</span>
                                {option.installments && (
                                  <span className="option-detail">{option.installments} rate</span>
                                )}
                                {option.days && (
                                  <span className="option-detail">{option.days} giorni</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      
                      {/* Input numero rate se installments */}
                      {(item.payment_option?.type === 'installments' || item.payment_option?.type === 'rate') && (
                        <div className="installments-control">
                          <label>Numero di Rate</label>
                          <input
                            type="number"
                            min="2"
                            max={priceListItem?.max_installments || 12}
                            value={item.payment_option?.installments || 2}
                            onChange={(e) => {
                              const numInstallments = parseInt(e.target.value) || 2;
                              if (item.payment_option) {
                                handlePaymentOptionChange(index, {
                                  ...item.payment_option,
                                  installments: numInstallments,
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Caratteristiche */}
                  {availableFeatures.length > 0 && (
                    <div className="item-section">
                      <div className="section-title">
                        <CheckCircle2 size={18} />
                        <span>Caratteristiche Incluse</span>
                      </div>
                      <div className="features-grid">
                        {availableFeatures.map((feature, featIndex) => {
                          const isSelected = item.selected_features?.includes(feature) || false;
                          return (
                            <label
                              key={featIndex}
                              className={`feature-checkbox ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleFeaturesChange(index, feature, e.target.checked)}
                              />
                              <span>{feature}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sezione Rinnovi - Dedicata e Completa */}
                  {availableRenewalOptions.length > 0 && (
                    <div className="item-section renewal-section-full">
                      <div className="section-title">
                        <RefreshCw size={18} />
                        <span>Opzioni di Rinnovo</span>
                      </div>
                      
                      {/* Selezione Rinnovo Esistente */}
                      <div className="renewal-selection">
                        <label>Seleziona Rinnovo</label>
                        <select
                          value={item.renewal_option?.id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const renewal = availableRenewalOptions.find(r => r.id === e.target.value);
                              handleRenewalSelection(index, renewal || null);
                            } else {
                              handleRenewalSelection(index, null);
                            }
                          }}
                        >
                          <option value="">Nessun rinnovo</option>
                          {availableRenewalOptions.map((renewal) => (
                            <option key={renewal.id} value={renewal.id}>
                              {getDurationLabel(renewal.duration, renewal.duration_months)} - € {renewal.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Modifica Rinnovo Selezionato */}
                      {item.renewal_option && (
                        <div className="renewal-edit-full">
                          <div className="renewal-edit-header">
                            <h4>Modifica Rinnovo</h4>
                            <button
                              className="btn-remove-renewal"
                              onClick={() => handleRenewalSelection(index, null)}
                            >
                              <Trash2 size={16} />
                              Rimuovi
                            </button>
                          </div>
                          
                          <div className="renewal-edit-fields">
                            <div className="field-group">
                              <label>Durata</label>
                              <select
                                value={item.renewal_option.duration}
                                onChange={(e) => handleRenewalFieldChange(index, 'duration', e.target.value)}
                              >
                                <option value="monthly">Mensile</option>
                                <option value="quarterly">Trimestrale</option>
                                <option value="semiannual">Semestrale</option>
                                <option value="annual">Annuale</option>
                                <option value="custom">Personalizzata</option>
                              </select>
                            </div>

                            {item.renewal_option.duration === 'custom' && (
                              <div className="field-group">
                                <label>Mesi</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.renewal_option.duration_months || 1}
                                  onChange={(e) => handleRenewalFieldChange(index, 'duration_months', parseInt(e.target.value) || 1)}
                                />
                              </div>
                            )}

                            <div className="field-group">
                              <label>Prezzo (€) *</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.renewalPrice !== undefined ? item.renewalPrice : (item.renewal_option.price || 0)}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  handleRenewalPriceChange(index, newPrice);
                                }}
                              />
                            </div>

                            <div className="field-group full-width">
                              <label>Descrizione</label>
                              <textarea
                                value={item.renewal_option.description || ''}
                                onChange={(e) => handleRenewalFieldChange(index, 'description', e.target.value)}
                                rows={2}
                              />
                            </div>

                            {/* Include - Lista modificabile */}
                            <div className="field-group full-width">
                              <label>Cosa Include</label>
                              <div className="includes-list">
                                {(Array.isArray(item.renewal_option.includes) ? item.renewal_option.includes : []).map((inc, incIndex) => (
                                  <div key={incIndex} className="include-item">
                                    <input
                                      type="text"
                                      value={inc}
                                      onChange={(e) => {
                                        const currentIncludes = Array.isArray(item.renewal_option?.includes) 
                                          ? item.renewal_option.includes 
                                          : [];
                                        const newIncludes = [...currentIncludes];
                                        newIncludes[incIndex] = e.target.value;
                                        handleRenewalFieldChange(index, 'includes', newIncludes);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-include"
                                      onClick={() => {
                                        const currentIncludes = Array.isArray(item.renewal_option?.includes) 
                                          ? item.renewal_option.includes 
                                          : [];
                                        const newIncludes = currentIncludes.filter((_, i) => i !== incIndex);
                                        handleRenewalFieldChange(index, 'includes', newIncludes);
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="btn-add-include"
                                  onClick={() => {
                                    const currentIncludes = Array.isArray(item.renewal_option?.includes) 
                                      ? item.renewal_option.includes 
                                      : [];
                                    const newIncludes = [...currentIncludes, ''];
                                    handleRenewalFieldChange(index, 'includes', newIncludes);
                                  }}
                                >
                                  <Plus size={14} />
                                  Aggiungi Include
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note Articolo */}
                  <div className="item-section">
                    <div className="section-title">
                      <span>Note Articolo</span>
                    </div>
                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      rows={3}
                      placeholder="Note aggiuntive su questo articolo..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal aggiungi dal listino */}
      {showAddServiceModal && (
        <div className="quote-edit-modal-overlay" onClick={() => setShowAddServiceModal(false)}>
          <div className="quote-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="quote-edit-modal-header">
              <h3><Package size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Aggiungi servizio dal listino</h3>
              <button type="button" className="quote-edit-modal-close" onClick={() => setShowAddServiceModal(false)} aria-label="Chiudi">
                <X size={22} />
              </button>
            </div>
            <div className="quote-edit-modal-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="Cerca per nome servizio…"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="quote-edit-modal-list">
              {catalogLoading && <p className="quote-edit-modal-loading">Caricamento listino…</p>}
              {!catalogLoading && catalogItems
                .filter(it => !catalogSearch.trim() || it.name.toLowerCase().includes(catalogSearch.trim().toLowerCase()))
                .map(it => (
                  <button
                    key={it.id}
                    type="button"
                    className="quote-edit-catalog-row"
                    onClick={() => addServiceFromCatalog(it)}
                  >
                    <span className="quote-edit-catalog-name">{it.name}</span>
                    <span className="quote-edit-catalog-price">€ {Number(it.base_price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </button>
                ))}
              {!catalogLoading && catalogItems.length === 0 && (
                <p className="quote-edit-modal-empty">Nessun servizio attivo nel listino.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal voce personalizzata */}
      {showCustomLineModal && (
        <div className="quote-edit-modal-overlay" onClick={() => setShowCustomLineModal(false)}>
          <div className="quote-edit-modal quote-edit-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="quote-edit-modal-header">
              <h3>Voce personalizzata</h3>
              <button type="button" className="quote-edit-modal-close" onClick={() => setShowCustomLineModal(false)} aria-label="Chiudi">
                <X size={22} />
              </button>
            </div>
            <div className="quote-edit-modal-body">
              <label>Descrizione / nome voce *</label>
              <input
                type="text"
                value={customLine.description}
                onChange={e => setCustomLine(c => ({ ...c, description: e.target.value }))}
                placeholder="Es. Consulenza aggiuntiva"
              />
              <label>Prezzo unitario (€) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={customLine.unit_price}
                onChange={e => setCustomLine(c => ({ ...c, unit_price: e.target.value }))}
                placeholder="0,00"
              />
              <button type="button" className="btn-primary quote-edit-modal-submit" onClick={addCustomLine}>
                Aggiungi al preventivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteEditPage;
