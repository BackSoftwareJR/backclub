import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  FolderKanban, 
  FileText, 
  CreditCard,
  Calendar,
  Euro,
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { getClient } from '../../api/clients';
import { crmProjectsApi } from '../../api/crmProjects';
import { contractsApi } from '../../api/contracts';
import { quotesApi } from '../../api/quotes';
import type { Client } from '../../api/clients';
import type { CrmProject } from '../../api/crmProjects';
import type { Contract } from '../../types/sellers';
import type { Quote } from '../../types/sellers';
import './ClienteVenditoriDetailPage.css';

type TabType = 'anagrafica' | 'progetti' | 'contratti' | 'preventivi' | 'pagamenti';

const ClienteVenditoriDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [crmProjects, setCrmProjects] = useState<CrmProject[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('anagrafica');

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const clientData = await getClient(Number(id));
      setClient(clientData);

      // Carica progetti CRM
      try {
        const projectsResponse = await crmProjectsApi.getAll({ client_id: Number(id), per_page: 100 });
        setCrmProjects(projectsResponse.data);
      } catch (error) {
        console.error('Errore nel caricamento progetti CRM:', error);
      }

      // Carica contratti
      try {
        const contractsResponse = await contractsApi.getAll({ client_id: Number(id), per_page: 100 });
        setContracts(contractsResponse.data);
      } catch (error) {
        console.error('Errore nel caricamento contratti:', error);
      }

      // Carica preventivi
      try {
        const quotesResponse = await quotesApi.getAll({ client_id: Number(id), per_page: 100 });
        setQuotes(quotesResponse.data);
      } catch (error) {
        console.error('Errore nel caricamento preventivi:', error);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati cliente:', error);
      alert('Errore nel caricamento dei dati del cliente');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: 'project' | 'contract' | 'quote' = 'project') => {
    if (type === 'project') {
      const badges: Record<string, { label: string; class: string }> = {
        active: { label: 'Attivo', class: 'success' },
        paused: { label: 'In Pausa', class: 'warning' },
        completed: { label: 'Completato', class: 'info' },
        archived: { label: 'Archiviato', class: 'secondary' },
      };
      return badges[status] || { label: status, class: '' };
    }
    if (type === 'contract') {
      const badges: Record<string, { label: string; class: string }> = {
        draft: { label: 'Bozza', class: 'warning' },
        requested: { label: 'Richiesta', class: 'info' },
        pending_signature: { label: 'In Attesa di Firma', class: 'warning' },
        active: { label: 'Attivo', class: 'success' },
        suspended: { label: 'Sospeso', class: 'danger' },
        completed: { label: 'Completato', class: 'info' },
        terminated: { label: 'Terminato', class: 'danger' },
      };
      return badges[status] || { label: status, class: '' };
    }
    if (type === 'quote') {
      const badges: Record<string, { label: string; class: string }> = {
        draft: { label: 'Bozza', class: 'warning' },
        sent: { label: 'Inviato', class: 'info' },
        viewed: { label: 'Visualizzato', class: 'info' },
        accepted: { label: 'Accettato', class: 'success' },
        rejected: { label: 'Rifiutato', class: 'danger' },
        expired: { label: 'Scaduto', class: 'secondary' },
      };
      return badges[status] || { label: status, class: '' };
    }
    return { label: status, class: '' };
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (!amount) return '€ 0,00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="venditori-empty-state">
        <User size={64} className="venditori-empty-state-icon" />
        <h3>Cliente non trovato</h3>
        <button
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate(-1)}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'anagrafica' as TabType, label: 'Anagrafica', icon: User },
    { id: 'progetti' as TabType, label: 'Progetti', icon: FolderKanban },
    { id: 'contratti' as TabType, label: 'Contratti', icon: FileText },
    { id: 'preventivi' as TabType, label: 'Preventivi', icon: FileText },
    { id: 'pagamenti' as TabType, label: 'Piani di Pagamento', icon: CreditCard },
  ];

  // Estrai piani di pagamento da quote e contratti
  interface PaymentPlan {
    id: number;
    type: 'quote' | 'contract';
    title: string;
    schedule: Array<{
      date: string;
      amount: number;
      commission: number;
      description: string;
      service_name?: string;
    }>;
    total: number;
    status: string;
    quote_number?: string;
    contract_number?: string;
    valid_until?: string;
  }

  interface ConsolidatedPayment {
    date: string;
    amount: number;
    commission: number;
    description: string;
    service_name?: string;
    planTitle: string;
    planType: 'quote' | 'contract';
    planId: number;
    status: string;
    isPast: boolean;
    isToday: boolean;
    isUpcoming: boolean;
  }

  // Funzione per calcolare payment schedule in base al tipo (stessa logica del wizard)
  const calculatePaymentScheduleFromOption = (
    total: number,
    paymentOption: any,
    startDate: Date = new Date()
  ): Array<{ date: string; amount: number; commission: number; description: string }> => {
    const schedule: Array<{ date: string; amount: number; commission: number; description: string }> = [];
    
    if (!paymentOption) {
      schedule.push({
        date: startDate.toISOString().split('T')[0],
        amount: total,
        commission: 0,
        description: 'Pagamento Unico',
      });
      return schedule;
    }

    const today = new Date(startDate);
    
    switch (paymentOption.type) {
      case 'tantum':
        schedule.push({
          date: today.toISOString().split('T')[0],
          amount: total,
          commission: 0,
          description: 'Pagamento Unico',
        });
        break;
        
      case 'installments':
      case 'rate':
        const installments = paymentOption.installments || 2;
        const installmentAmount = total / installments;
        for (let i = 0; i < installments; i++) {
          const paymentDate = new Date(today);
          paymentDate.setMonth(paymentDate.getMonth() + i);
          schedule.push({
            date: paymentDate.toISOString().split('T')[0],
            amount: installmentAmount,
            commission: 0,
            description: `Rata ${i + 1}/${installments}`,
          });
        }
        break;
        
      case 'split_30_40_30':
      case '30_40_30':
        schedule.push({
          date: today.toISOString().split('T')[0],
          amount: total * 0.3,
          commission: 0,
          description: 'Acconto 30%',
        });
        const midDate = new Date(today);
        midDate.setMonth(midDate.getMonth() + 1);
        schedule.push({
          date: midDate.toISOString().split('T')[0],
          amount: total * 0.4,
          commission: 0,
          description: 'Pagamento 40%',
        });
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 2);
        schedule.push({
          date: endDate.toISOString().split('T')[0],
          amount: total * 0.3,
          commission: 0,
          description: 'Saldo 30%',
        });
        break;
        
      case '30_60_days':
        schedule.push({
          date: today.toISOString().split('T')[0],
          amount: total * 0.3,
          commission: 0,
          description: 'Acconto 30%',
        });
        const laterDate = new Date(today);
        laterDate.setDate(laterDate.getDate() + 60);
        schedule.push({
          date: laterDate.toISOString().split('T')[0],
          amount: total * 0.7,
          commission: 0,
          description: 'Saldo 70% (60 giorni)',
        });
        break;
        
      case 'custom':
        if (paymentOption.percentages && paymentOption.percentages.length > 0) {
          paymentOption.percentages.forEach((percentage: number, index: number) => {
            const amount = total * (percentage / 100);
            const paymentDate = new Date(today);
            if (index > 0) {
              paymentDate.setMonth(paymentDate.getMonth() + index);
            }
            schedule.push({
              date: paymentDate.toISOString().split('T')[0],
              amount: amount,
              commission: 0,
              description: `Pagamento ${percentage}%`,
            });
          });
        }
        break;
        
      default:
        schedule.push({
          date: today.toISOString().split('T')[0],
          amount: total,
          commission: 0,
          description: 'Pagamento Unico',
        });
    }
    
    return schedule;
  };

  const paymentPlans: PaymentPlan[] = [];

  // Estrai piani di pagamento dai preventivi
  quotes.forEach(quote => {
    if (quote.payment_schedule && Array.isArray(quote.payment_schedule) && quote.payment_schedule.length > 0) {
      // Usa il payment_schedule esistente
      paymentPlans.push({
        id: quote.id,
        type: 'quote',
        title: quote.title || quote.quote_number,
        schedule: quote.payment_schedule,
        total: quote.total_amount || 0,
        status: quote.status,
        quote_number: quote.quote_number,
        valid_until: quote.valid_until || undefined,
      });
    } else if (quote.total_amount && (quote.status === 'approved' || quote.status === 'started')) {
      // Se non c'è payment_schedule, prova a ricrearlo dagli items
      let schedule: Array<{ date: string; amount: number; commission: number; description: string }> = [];
      
      if (quote.items && Array.isArray(quote.items) && quote.items.length > 0) {
        // Raccogli tutti i payment_option dagli items e calcola schedule per ogni servizio
        const allPayments: Array<{ date: string; amount: number; commission: number; description: string; service_name?: string }> = [];
        
        quote.items.forEach((item: any) => {
          // Usa il totale già calcolato dell'item (include sconti)
          const itemTotal = item.total || 0;
          
          // Leggi e parsa payment_option
          let itemPaymentOption = null;
          if (item.payment_option) {
            if (typeof item.payment_option === 'string') {
              try {
                itemPaymentOption = JSON.parse(item.payment_option);
              } catch (e) {
                console.error('Errore parsing payment_option:', e, item.payment_option);
              }
            } else if (typeof item.payment_option === 'object') {
              itemPaymentOption = item.payment_option;
            }
          }
          
          // Calcola schedule per questo item
          if (itemPaymentOption && itemPaymentOption.type) {
            const itemSchedule = calculatePaymentScheduleFromOption(
              itemTotal,
              itemPaymentOption,
              quote.valid_until ? new Date(quote.valid_until) : new Date()
            );
            
            itemSchedule.forEach(payment => {
              allPayments.push({
                ...payment,
                service_name: item.description || item.price_list_item?.name,
              });
            });
          } else {
            // Se non ha payment_option, usa pagamento unico per questo item
            allPayments.push({
              date: quote.valid_until || new Date().toISOString().split('T')[0],
              amount: itemTotal,
              commission: 0,
              description: 'Pagamento Unico',
              service_name: item.description || item.price_list_item?.name,
            });
          }
        });
        
        // Ordina per data e raggruppa per data se necessario
        allPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Raggruppa pagamenti nella stessa data
        const groupedPayments = new Map<string, { date: string; amount: number; commission: number; description: string }>();
        
        allPayments.forEach(payment => {
          const key = payment.date;
          if (groupedPayments.has(key)) {
            const existing = groupedPayments.get(key)!;
            existing.amount += payment.amount;
            // Mantieni la descrizione più generica se ci sono più servizi
            if (allPayments.filter(p => p.date === key).length > 1) {
              existing.description = 'Pagamento multiplo';
            }
          } else {
            groupedPayments.set(key, {
              date: payment.date,
              amount: payment.amount,
              commission: payment.commission,
              description: payment.description,
            });
          }
        });
        
        schedule = Array.from(groupedPayments.values());
      }
      
      // Se ancora non abbiamo schedule, usa pagamento unico
      if (schedule.length === 0) {
        schedule = [{
          date: quote.valid_until || new Date().toISOString().split('T')[0],
          amount: quote.total_amount,
          commission: 0,
          description: 'Pagamento Unico',
        }];
      }
      
      paymentPlans.push({
        id: quote.id,
        type: 'quote',
        title: quote.title || quote.quote_number,
        schedule,
        total: quote.total_amount || 0,
        status: quote.status,
        quote_number: quote.quote_number,
        valid_until: quote.valid_until || undefined,
      });
    }
  });

  // Estrai piani di pagamento dai contratti attivi
  contracts.forEach(contract => {
    if (contract.status === 'active' && contract.total_value) {
      const totalValue = contract.total_value;
      const startDate = contract.start_date ? new Date(contract.start_date) : new Date();
      let schedule: Array<{ date: string; amount: number; commission: number; description: string }> = [];
      
      // Prova a interpretare payment_terms per capire il tipo di pagamento
    if (contract.payment_terms) {
        const paymentTerms = contract.payment_terms.toLowerCase();
        
        // Verifica se è 30/40/30 o 30-40-30
        if (paymentTerms.includes('30') && paymentTerms.includes('40') && paymentTerms.includes('30')) {
          schedule = calculatePaymentScheduleFromOption(totalValue, { type: 'split_30_40_30' }, startDate);
        }
        // Verifica se è 30/60 o 30-60
        else if (paymentTerms.includes('30') && paymentTerms.includes('60')) {
          schedule = calculatePaymentScheduleFromOption(totalValue, { type: '30_60_days' }, startDate);
        }
        // Verifica se contiene "rate" o "rata"
        else if (paymentTerms.includes('rate') || paymentTerms.includes('rata')) {
          // Estrai numero di rate se presente
          const rateMatch = paymentTerms.match(/(\d+)\s*(rate|rata)/i);
          const numRate = rateMatch ? parseInt(rateMatch[1]) : 2;
          schedule = calculatePaymentScheduleFromOption(totalValue, { type: 'installments', installments: numRate }, startDate);
        }
        // Altrimenti crea rate mensili basate su date
        else {
          const endDate = contract.end_date ? new Date(contract.end_date) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
          const monthsDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
          const monthlyAmount = totalValue / monthsDiff;
          
          for (let i = 0; i < monthsDiff; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i);
            schedule.push({
              date: paymentDate.toISOString().split('T')[0],
              amount: monthlyAmount,
              commission: 0,
              description: `Rata ${i + 1}/${monthsDiff}`,
            });
          }
        }
      }
      
      // Se non abbiamo schedule, usa pagamento unico
      if (schedule.length === 0) {
        schedule = [{
          date: contract.start_date || new Date().toISOString().split('T')[0],
          amount: totalValue,
          commission: 0,
          description: 'Pagamento Unico',
        }];
      }
      
      paymentPlans.push({
        id: contract.id,
        type: 'contract',
        title: contract.title || contract.contract_number,
        schedule,
        total: totalValue,
        status: contract.status,
        contract_number: contract.contract_number,
      });
    }
  });

  // Filtra per mostrare solo preventivi approvati o contratti attivi
  const activePaymentPlans = paymentPlans.filter(plan => 
    (plan.type === 'quote' && (plan.status === 'approved' || plan.status === 'started')) ||
    (plan.type === 'contract' && plan.status === 'active')
  );

  // Consolida tutte le rate in un unico array per il calendario
  const consolidatedPayments: ConsolidatedPayment[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  activePaymentPlans.forEach(plan => {
    plan.schedule.forEach(payment => {
      const paymentDate = new Date(payment.date);
      paymentDate.setHours(0, 0, 0, 0);
      
      const isPast = paymentDate < today;
      const isToday = paymentDate.getTime() === today.getTime();
      const isUpcoming = paymentDate > today;

      consolidatedPayments.push({
        date: payment.date,
        amount: payment.amount,
        commission: payment.commission,
        description: payment.description,
        service_name: payment.service_name,
        planTitle: plan.title,
        planType: plan.type,
        planId: plan.id,
        status: plan.status,
        isPast,
        isToday,
        isUpcoming,
      });
    });
  });

  // Ordina per data
  consolidatedPayments.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  // Calcola totali
  const totalAmount = consolidatedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = consolidatedPayments.filter(p => p.isPast).reduce((sum, p) => sum + p.amount, 0);
  const totalUpcoming = consolidatedPayments.filter(p => p.isUpcoming).reduce((sum, p) => sum + p.amount, 0);
  const totalToday = consolidatedPayments.filter(p => p.isToday).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="cliente-venditori-detail-page">
      {/* Header */}
      <div className="detail-header-section">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Torna ai Clienti
        </button>

        <div className="cliente-header-main">
          <div className="cliente-header-left">
          <div className="cliente-avatar-large">
            {client.company_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="cliente-header-details">
            <h1>{client.company_name}</h1>
              {client.ragione_sociale && client.ragione_sociale !== client.company_name ? (
              <p className="azienda-name">{client.ragione_sociale}</p>
              ) : client.contact_person ? (
                <p className="azienda-name">{client.contact_person}</p>
              ) : null}
          </div>
        </div>

          <div className="quick-stats-horizontal">
            <div className="quick-stat-item">
            <div className="stat-icon progetti">
              <FolderKanban size={18} />
            </div>
              <div className="stat-content">
                <div className="stat-value">{(client as any).projects_count || crmProjects.length || 0}</div>
              <div className="stat-label">Progetti</div>
            </div>
          </div>
            <div className="quick-stat-item">
            <div className="stat-icon contratti">
              <FileText size={18} />
            </div>
              <div className="stat-content">
                <div className="stat-value">{(client as any).contracts_count || contracts.length || 0}</div>
              <div className="stat-label">Contratti</div>
            </div>
          </div>
            <div className="quick-stat-item">
            <div className="stat-icon preventivi">
              <FileText size={18} />
            </div>
              <div className="stat-content">
                <div className="stat-value">{(client as any).quotes_count || quotes.length || 0}</div>
              <div className="stat-label">Preventivi</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-navigation">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'anagrafica' && (
          <div className="anagrafica-section">
            <h2>Dati Anagrafici</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Ragione Sociale</label>
                <p>{client.ragione_sociale || client.company_name || '-'}</p>
              </div>
              <div className="info-item">
                <label>Partita IVA</label>
                <p>{client.partita_iva || client.vat_number || '-'}</p>
              </div>
              <div className="info-item">
                <label>Codice Fiscale</label>
                <p>{client.codice_fiscale || client.tax_code || '-'}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{client.email || '-'}</p>
              </div>
              <div className="info-item">
                <label>Telefono</label>
                <p>{client.phone || '-'}</p>
              </div>
              <div className="info-item">
                <label>PEC</label>
                <p>{client.pec || '-'}</p>
              </div>
              <div className="info-item full-width">
                <label>Indirizzo</label>
                <p>{client.address || '-'}</p>
              </div>
              <div className="info-item">
                <label>Referente</label>
                <p>
                  {client.referente_nome || client.referente_cognome
                    ? `${client.referente_nome || ''} ${client.referente_cognome || ''}`.trim()
                    : client.contact_person || '-'}
                </p>
              </div>
              <div className="info-item">
                <label>Email Referente</label>
                <p>{client.referente_email || '-'}</p>
              </div>
              <div className="info-item">
                <label>Telefono Referente</label>
                <p>{client.referente_telefono || '-'}</p>
              </div>
              <div className="info-item">
                <label>Venditore</label>
                <p>
                  {(client as any).seller?.user?.name || 
                   (client as any).seller?.name || 
                   'Non assegnato'}
                </p>
              </div>
              <div className="info-item">
                <label>IBAN</label>
                <p>{client.iban || '-'}</p>
              </div>
              <div className="info-item">
                <label>Codice SDI</label>
                <p>{client.sdi_code || '-'}</p>
              </div>
              <div className="info-item">
                <label>Termini di Pagamento</label>
                <p>{client.payment_terms || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progetti' && (
          <div className="progetti-section">
            <h2>Progetti</h2>
            {crmProjects.length === 0 ? (
              <div className="empty-section">
                <FolderKanban size={48} />
                <p>Nessun progetto trovato</p>
              </div>
            ) : (
              <div className="progetti-grid">
                {crmProjects.map((project) => {
                  const statusBadge = getStatusBadge(project.status, 'project');
                  return (
                    <div key={project.id} className="progetto-card-detail">
                      <div className="progetto-header">
                        <h3>{project.name}</h3>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="progetto-description">{project.description}</p>
                      )}
                      <div className="progetto-stats">
                        <div className="progetto-stat">
                          <span className="label">Budget:</span>
                          <span className="value">{formatCurrency(project.budget_cocchi)}</span>
                        </div>
                        <div className="progetto-stat">
                          <span className="label">Speso:</span>
                          <span className="value">{formatCurrency(project.spent_cocchi)}</span>
                        </div>
                        {project.start_date && (
                          <div className="progetto-stat">
                            <span className="label">Inizio:</span>
                            <span className="value">{formatDate(project.start_date)}</span>
                          </div>
                        )}
                        {project.end_date && (
                          <div className="progetto-stat">
                            <span className="label">Fine:</span>
                            <span className="value">{formatDate(project.end_date)}</span>
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-link-small"
                        onClick={() => navigate(`/progetti/${project.id}`)}
                      >
                        Vedi dettagli →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contratti' && (
          <div className="contratti-section">
            <h2>Contratti</h2>
            {contracts.length === 0 ? (
              <div className="empty-section">
                <FileText size={48} />
                <p>Nessun contratto trovato</p>
              </div>
            ) : (
              <div className="contratti-list">
                {contracts.map((contract) => {
                  const statusBadge = getStatusBadge(contract.status, 'contract');
                  return (
                    <div key={contract.id} className="contratto-card">
                      <div className="contratto-header">
                        <div>
                          <h3>{contract.title || contract.contract_number}</h3>
                          <p className="contratto-number">{contract.contract_number}</p>
                        </div>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="contratto-body">
                        {contract.total_value && (
                          <div className="contratto-value">
                            <Euro size={16} />
                            {formatCurrency(contract.total_value)}
                          </div>
                        )}
                        {contract.start_date && (
                          <div className="contratto-date">
                            <Calendar size={14} />
                            Inizio: {formatDate(contract.start_date)}
                          </div>
                        )}
                        {contract.end_date && (
                          <div className="contratto-date">
                            <Calendar size={14} />
                            Fine: {formatDate(contract.end_date)}
                          </div>
                        )}
                        {contract.payment_terms && (
                          <div className="contratto-payment">
                            Termini: {contract.payment_terms}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-link-small"
                        onClick={() => navigate(`/venditori/contratti/${contract.id}`)}
                      >
                        Vedi dettagli →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preventivi' && (
          <div className="preventivi-section">
            <h2>Preventivi</h2>
            {quotes.length === 0 ? (
              <div className="empty-section">
                <FileText size={48} />
                <p>Nessun preventivo trovato</p>
              </div>
            ) : (
              <div className="preventivi-list">
                {quotes.map((quote) => {
                  const statusBadge = getStatusBadge(quote.status, 'quote');
                  return (
                    <div key={quote.id} className="preventivo-card">
                      <div className="preventivo-header">
                        <div>
                          <h3>{quote.title || quote.quote_number}</h3>
                          <p className="preventivo-number">{quote.quote_number}</p>
                        </div>
                        <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="preventivo-body">
                        {quote.total_amount && (
                          <div className="preventivo-value">
                            <Euro size={16} />
                            {formatCurrency(quote.total_amount)}
                          </div>
                        )}
                        {quote.valid_until && (
                          <div className="preventivo-date">
                            <Calendar size={14} />
                            Valido fino: {formatDate(quote.valid_until)}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-link-small"
                        onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                      >
                        Vedi dettagli →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pagamenti' && (
          <div className="pagamenti-section">
            <div className="pagamenti-header">
            <h2>Piani di Pagamento</h2>
            </div>

            {activePaymentPlans.length === 0 ? (
              <div className="empty-section">
                <CreditCard size={48} />
                <p>Nessun piano di pagamento trovato</p>
              </div>
            ) : (
              <>
                {/* Riepilogo Finanziario */}
                <div className="payment-summary-cards">
                  <div className="payment-summary-card">
                    <div className="summary-icon" style={{ backgroundColor: '#0A84FF15', color: '#0A84FF' }}>
                      <Euro size={20} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Totale da Incassare</div>
                      <div className="summary-value">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
                  <div className="payment-summary-card">
                    <div className="summary-icon" style={{ backgroundColor: '#34C75915', color: '#34C759' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Pagato</div>
                      <div className="summary-value">{formatCurrency(totalPaid)}</div>
                    </div>
                  </div>
                  <div className="payment-summary-card">
                    <div className="summary-icon" style={{ backgroundColor: '#FF950015', color: '#FF9500' }}>
                      <Clock size={20} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Oggi</div>
                      <div className="summary-value">{formatCurrency(totalToday)}</div>
                    </div>
                  </div>
                  <div className="payment-summary-card">
                    <div className="summary-icon" style={{ backgroundColor: '#5856D615', color: '#5856D6' }}>
                      <TrendingUp size={20} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">In Scadenza</div>
                      <div className="summary-value">{formatCurrency(totalUpcoming)}</div>
                    </div>
                  </div>
                </div>

                {/* Calendario Rate */}
                {consolidatedPayments.length > 0 && (
                  <div className="payment-calendar-section">
                    <h3 className="section-subtitle">
                      <CalendarIcon size={20} />
                      Calendario Rate
                    </h3>
                    <div className="payment-calendar-grid">
                      {consolidatedPayments.map((payment, index) => {
                        const paymentDate = new Date(payment.date);
                        const isOverdue = payment.isPast && paymentDate < today;
                        
                        return (
                          <div 
                            key={index} 
                            className={`payment-calendar-item ${payment.isPast ? 'past' : ''} ${payment.isToday ? 'today' : ''} ${isOverdue ? 'overdue' : ''}`}
                          >
                            <div className="calendar-item-date">
                              <Calendar size={16} />
                              <div>
                                <div className="date-day">{formatDate(payment.date)}</div>
                                {payment.isToday && (
                                  <span className="date-badge today-badge">Oggi</span>
                                )}
                                {isOverdue && (
                                  <span className="date-badge overdue-badge">Scaduta</span>
                                )}
                              </div>
                            </div>
                            <div className="calendar-item-amount">
                              <div className="amount-value">{formatCurrency(payment.amount)}</div>
                              {payment.commission > 0 && (
                                <div className="amount-commission">Commissione: {formatCurrency(payment.commission)}</div>
                              )}
                            </div>
                            <div className="calendar-item-details">
                              <div className="detail-description">{payment.description}</div>
                              <div className="detail-plan">
                                {payment.planType === 'quote' ? (
                                  <FileText size={12} />
                                ) : (
                                  <CreditCard size={12} />
                                )}
                                {payment.planTitle}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dettaglio Piani */}
                <div className="payment-plans-detail-section">
                  <h3 className="section-subtitle">Dettaglio Piani</h3>
              <div className="payment-plans-list">
                    {activePaymentPlans.map((plan) => {
                  const statusBadge = getStatusBadge(plan.status, plan.type === 'quote' ? 'quote' : 'contract');
                  return (
                    <div key={`${plan.type}-${plan.id}`} className="payment-plan-card">
                      <div className="payment-plan-header">
                            <div className="plan-header-left">
                              <div className="plan-icon-wrapper">
                                {plan.type === 'quote' ? (
                                  <FileText size={20} />
                                ) : (
                                  <CreditCard size={20} />
                                )}
                              </div>
                        <div>
                          <h3>{plan.title}</h3>
                                {plan.quote_number && (
                                  <p className="plan-number">Preventivo: {plan.quote_number}</p>
                                )}
                                {plan.contract_number && (
                                  <p className="plan-number">Contratto: {plan.contract_number}</p>
                                )}
                              </div>
                            </div>
                            <div className="plan-header-right">
                          <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        <div className="payment-plan-total">
                          <Euro size={16} />
                          {formatCurrency(plan.total)}
                              </div>
                        </div>
                      </div>
                      {plan.schedule && plan.schedule.length > 0 ? (
                        <div className="payment-schedule">
                              <h4>Scadenza Rate ({plan.schedule.length})</h4>
                          <div className="schedule-list">
                                {plan.schedule.map((payment, index) => {
                                  const paymentDate = new Date(payment.date);
                                  const isPast = paymentDate < today;
                                  const isToday = paymentDate.getTime() === today.getTime();
                                  
                                  return (
                                    <div 
                                      key={index} 
                                      className={`schedule-item ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}`}
                                    >
                                <div className="schedule-date">
                                  <Calendar size={14} />
                                  {formatDate(payment.date)}
                                        {isToday && <span className="schedule-badge today">Oggi</span>}
                                        {isPast && !isToday && <span className="schedule-badge past">Scaduta</span>}
                                </div>
                                <div className="schedule-amount">
                                  {formatCurrency(payment.amount)}
                                </div>
                                {payment.description && (
                                  <div className="schedule-description">{payment.description}</div>
                                )}
                                      {payment.service_name && (
                                        <div className="schedule-service">{payment.service_name}</div>
                                      )}
                              </div>
                                  );
                                })}
                          </div>
                        </div>
                      ) : (
                        <div className="payment-plan-no-schedule">
                          Piano di pagamento non strutturato
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteVenditoriDetailPage;

