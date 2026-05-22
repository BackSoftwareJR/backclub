import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  FolderKanban, 
  FileText, 
  CreditCard,
  Phone,
  Mail,
  Edit
} from 'lucide-react';
import { getClient } from '../../api/clients';
import { crmProjectsApi } from '../../api/crmProjects';
import { contractsApi } from '../../api/contracts';
import { quotesApi } from '../../api/quotes';
import { sellerCache } from '../../utils/sellerCache';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerClientDetailMobile from './SellerClientDetailMobile';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import type { Client } from '../../api/clients';
import type { CrmProject } from '../../api/crmProjects';
import type { Contract } from '../../types/sellers';
import type { Quote } from '../../types/sellers';
import './SellerClientDetailPage.css';

type TabType = 'anagrafica' | 'progetti' | 'contratti' | 'preventivi' | 'pagamenti';

export interface ConsolidatedPayment {
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

const SellerClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
    const clientId = Number(id);
    const cached = sellerCache.detail.client.get<{ client: Client; crmProjects: CrmProject[]; contracts: Contract[]; quotes: Quote[] }>(clientId);
    if (cached) {
      setClient(cached.client);
      setCrmProjects(cached.crmProjects);
      setContracts(cached.contracts);
      setQuotes(cached.quotes);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const clientData = await getClient(clientId);
      setClient(clientData);

      let projectsData: CrmProject[] = [];
      let contractsData: Contract[] = [];
      let quotesData: Quote[] = [];
      try {
        const projectsResponse = await crmProjectsApi.getAll({ client_id: clientId, per_page: 100 });
        projectsData = projectsResponse.data;
        setCrmProjects(projectsData);
      } catch (error) {
        console.error('Errore nel caricamento progetti CRM:', error);
      }
      try {
        const contractsResponse = await contractsApi.getAll({ client_id: clientId, per_page: 100 });
        contractsData = contractsResponse.data;
        setContracts(contractsData);
      } catch (error) {
        console.error('Errore nel caricamento contratti:', error);
      }
      try {
        const quotesResponse = await quotesApi.getAll({ client_id: clientId, per_page: 100 });
        quotesData = quotesResponse.data;
        setQuotes(quotesData);
      } catch (error) {
        console.error('Errore nel caricamento preventivi:', error);
      }
      sellerCache.detail.client.set(clientId, { client: clientData, crmProjects: projectsData, contracts: contractsData, quotes: quotesData });
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
      <div className="venditori-detail-page venditori-detail-skeleton">
        <div className="venditori-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="venditori-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
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

  // Get initials for avatar
  const getInitials = () => {
    if (client.company_name) {
      return client.company_name.charAt(0).toUpperCase();
    }
    return 'C';
  };

  // Get subtitle (role/company)
  const getSubtitle = () => {
    if (client.ragione_sociale && client.ragione_sociale !== client.company_name) {
      return client.ragione_sociale;
    }
    if (client.contact_person) {
      return client.contact_person;
    }
    return null;
  };

  const projectsCount = (client as any).projects_count || crmProjects.length || 0;
  const contractsCount = (client as any).contracts_count || contracts.length || 0;
  const quotesCount = (client as any).quotes_count || quotes.length || 0;

  // Render mobile version if on mobile device
  if (isMobile && client) {
    return (
      <SellerClientDetailMobile
        client={client}
        crmProjects={crmProjects}
        contracts={contracts}
        quotes={quotes}
        consolidatedPayments={consolidatedPayments}
        totalUpcoming={totalUpcoming}
        totalToday={totalToday}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="seller-client-detail-page">
      {/* Back Button */}
      <button className="client-detail-back-btn" onClick={() => navigate('/seller/clienti')}>
        <ArrowLeft size={18} />
        Torna ai Clienti
      </button>

      {/* Unified Profile Header */}
      <div className="client-profile-header">
        <div className="profile-header-left">
          <div className="profile-avatar">
            {getInitials()}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{client.company_name}</h1>
            {getSubtitle() && (
              <p className="profile-subtitle">{getSubtitle()}</p>
            )}
          </div>
        </div>
        
        <div className="profile-header-right">
          <div className="profile-actions">
            {client.phone && (
              <button 
                className="profile-action-btn"
                onClick={() => window.location.href = `tel:${client.phone}`}
                title="Chiama"
              >
                <Phone size={18} />
              </button>
            )}
            {client.email && (
              <button 
                className="profile-action-btn"
                onClick={() => window.location.href = `mailto:${client.email}`}
                title="Invia Email"
              >
                <Mail size={18} />
              </button>
            )}
            <button 
              className="profile-action-btn"
              onClick={() => navigate(`/seller/clienti/${id}/edit`)}
              title="Modifica"
            >
              <Edit size={18} />
            </button>
          </div>
          <div className="profile-mini-stats">
            <span className="mini-stat">{quotesCount} Preventivi</span>
            <span className="mini-stat-separator">•</span>
            <span className="mini-stat">{contractsCount} Contratti</span>
            <span className="mini-stat-separator">•</span>
            <span className="mini-stat">{projectsCount} Progetti</span>
          </div>
        </div>
      </div>

      {/* iOS-style Segmented Control */}
      <div className="client-segmented-control">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`segment-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'anagrafica' && (
          <div className="anagrafica-section">
            {/* Single Unified Surface - All Groups Inside */}
            <div className="anagrafica-unified-surface">
              {/* Contatti Group */}
              <div className="info-group-header">CONTATTI</div>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{client.email || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Telefono</span>
                  <span className="info-value">{client.phone || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">PEC</span>
                  <span className="info-value">{client.pec || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Indirizzo</span>
                  <span className="info-value">{client.address || '-'}</span>
                </div>
              </div>

              {/* Dati Fiscali Group */}
              <div className="info-group-header">DATI FISCALI</div>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Ragione Sociale</span>
                  <span className="info-value">{client.ragione_sociale || client.company_name || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Partita IVA</span>
                  <span className="info-value">{client.partita_iva || client.vat_number || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Codice Fiscale</span>
                  <span className="info-value">{client.codice_fiscale || client.tax_code || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Codice SDI</span>
                  <span className="info-value">{client.sdi_code || '-'}</span>
                </div>
              </div>

              {/* Referente Group */}
              {(client.referente_nome || client.referente_cognome || client.referente_email || client.referente_telefono || client.contact_person) && (
                <>
                  <div className="info-group-header">REFERENTE</div>
                  <div className="info-list">
                    {(client.referente_nome || client.referente_cognome || client.contact_person) && (
                      <div className="info-row">
                        <span className="info-label">Nome</span>
                        <span className="info-value">
                          {client.referente_nome || client.referente_cognome
                            ? `${client.referente_nome || ''} ${client.referente_cognome || ''}`.trim()
                            : client.contact_person || '-'}
                        </span>
                      </div>
                    )}
                    {client.referente_email && (
                      <div className="info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value">{client.referente_email}</span>
                      </div>
                    )}
                    {client.referente_telefono && (
                      <div className="info-row">
                        <span className="info-label">Telefono</span>
                        <span className="info-value">{client.referente_telefono}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Altri Dati Group */}
              <div className="info-group-header">ALTRI DATI</div>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Venditore</span>
                  <span className="info-value">
                    {(client as any).seller?.user?.name || 
                     (client as any).seller?.name || 
                     'Non assegnato'}
                  </span>
                </div>
                {client.iban && (
                  <div className="info-row">
                    <span className="info-label">IBAN</span>
                    <span className="info-value">{client.iban}</span>
                  </div>
                )}
                {client.payment_terms && (
                  <div className="info-row">
                    <span className="info-label">Termini di Pagamento</span>
                    <span className="info-value">{client.payment_terms}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progetti' && (
          <div className="progetti-section">
            {crmProjects.length === 0 ? (
              <div className="client-empty-state">
                <FolderKanban size={64} className="empty-state-icon" />
                <h3 className="empty-state-title">Nessun progetto attivo</h3>
                <p className="empty-state-text">Non ci sono progetti associati a questo cliente.</p>
                <button
                  className="empty-state-button"
                  onClick={() => navigate('/seller/progetti/new')}
                >
                  Crea Nuovo Progetto
                </button>
              </div>
            ) : (
              <div className="finder-list">
                {crmProjects.map((project) => {
                  const statusBadge = getStatusBadge(project.status, 'project');
                  return (
                    <div 
                      key={project.id} 
                      className="finder-list-row"
                      onClick={() => navigate(`/seller/progetti/${project.id}`)}
                    >
                      <div className="finder-row-identity">
                        <div className="finder-row-title">{project.name}</div>
                        {project.description && (
                          <div className="finder-row-subtitle">{project.description}</div>
                        )}
                      </div>
                      <div className="finder-row-meta">
                        {project.budget_cocchi && (
                          <span className="finder-meta-item">Budget: {formatCurrency(project.budget_cocchi)}</span>
                        )}
                        {project.start_date && (
                          <span className="finder-meta-item">{formatDate(project.start_date)}</span>
                        )}
                      </div>
                      <div className="finder-row-status">
                        <span className={`status-badge status-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contratti' && (
          <div className="contratti-section">
            {contracts.length === 0 ? (
              <div className="client-empty-state">
                <FileText size={64} className="empty-state-icon" />
                <h3 className="empty-state-title">Nessun contratto trovato</h3>
                <p className="empty-state-text">Non ci sono contratti associati a questo cliente.</p>
              </div>
            ) : (
              <div className="finder-list">
                {contracts.map((contract) => {
                  const statusBadge = getStatusBadge(contract.status, 'contract');
                  return (
                    <div 
                      key={contract.id} 
                      className="finder-list-row"
                      onClick={() => navigate(`/seller/contratti/${contract.id}`)}
                    >
                      <div className="finder-row-identity">
                        <div className="finder-row-title">{contract.title || contract.contract_number}</div>
                        <div className="finder-row-subtitle">{contract.contract_number}</div>
                      </div>
                      <div className="finder-row-meta">
                        {contract.total_value && (
                          <span className="finder-meta-item">{formatCurrency(contract.total_value)}</span>
                        )}
                        {contract.start_date && (
                          <span className="finder-meta-item">{formatDate(contract.start_date)}</span>
                        )}
                      </div>
                      <div className="finder-row-status">
                        <span className={`status-badge status-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preventivi' && (
          <div className="preventivi-section">
            {quotes.length === 0 ? (
              <div className="client-empty-state">
                <FileText size={64} className="empty-state-icon" />
                <h3 className="empty-state-title">Nessun preventivo trovato</h3>
                <p className="empty-state-text">Non ci sono preventivi associati a questo cliente.</p>
              </div>
            ) : (
              <div className="finder-list">
                {quotes.map((quote) => {
                  const statusBadge = getStatusBadge(quote.status, 'quote');
                  return (
                    <div 
                      key={quote.id} 
                      className="finder-list-row"
                      onClick={() => navigate(`/seller/preventivi/${quote.id}`)}
                    >
                      <div className="finder-row-identity">
                        <div className="finder-row-title">{quote.title || quote.quote_number}</div>
                        <div className="finder-row-subtitle">{quote.quote_number}</div>
                      </div>
                      <div className="finder-row-meta">
                        {quote.total_amount && (
                          <span className="finder-meta-item">{formatCurrency(quote.total_amount)}</span>
                        )}
                        {quote.valid_until && (
                          <span className="finder-meta-item">Valido fino: {formatDate(quote.valid_until)}</span>
                        )}
                      </div>
                      <div className="finder-row-status">
                        <span className={`status-badge status-${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pagamenti' && (
          <div className="pagamenti-section">
            {activePaymentPlans.length === 0 ? (
              <div className="client-empty-state">
                <CreditCard size={64} className="empty-state-icon" />
                <h3 className="empty-state-title">Nessun piano di pagamento trovato</h3>
                <p className="empty-state-text">Non ci sono piani di pagamento attivi per questo cliente.</p>
              </div>
            ) : (
              <>
                {/* Financial Summary */}
                <div className="payment-summary-bar">
                  <div className="summary-item">
                    <span className="summary-label">Totale Incassato</span>
                    <span className="summary-value paid">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Da Incassare</span>
                    <span className="summary-value pending">{formatCurrency(totalUpcoming + totalToday)}</span>
                  </div>
                  <div className="summary-progress">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Payment Timeline - Vertical List */}
                {consolidatedPayments.length > 0 && (
                  <div className="payment-timeline-vertical">
                    {consolidatedPayments.map((payment, index) => {
                      const paymentDate = new Date(payment.date);
                      const isOverdue = payment.isPast && paymentDate < today;
                      let statusClass = 'future';
                      let statusLabel = 'Futuro';
                      
                      if (isOverdue) {
                        statusClass = 'overdue';
                        statusLabel = 'Scaduta';
                      } else if (payment.isToday) {
                        statusClass = 'today';
                        statusLabel = 'Oggi';
                      } else if (payment.isPast) {
                        statusClass = 'paid';
                        statusLabel = 'Pagato';
                      }
                      
                      return (
                        <div 
                          key={index} 
                          className={`timeline-item ${statusClass}`}
                        >
                          <div className="timeline-item-content">
                            <div className="timeline-date-badge">
                              {formatDate(payment.date)}
                            </div>
                            <div className="timeline-item-main">
                              <div className="timeline-description">
                                <span className="timeline-desc-text">{payment.description}</span>
                                {payment.service_name && (
                                  <span className="timeline-service-name">{payment.service_name}</span>
                                )}
                              </div>
                              <div className="timeline-amount">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="timeline-status-indicator">
                                <span className={`status-dot ${statusClass}`} />
                                <span className="status-label">{statusLabel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerClientDetailPage;
