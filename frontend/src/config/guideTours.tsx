import { 
  BarChart3, 
  DollarSign, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Search, 
  Filter, 
  Package, 
  Plus, 
  Eye, 
  Edit, 
  FileCheck, 
  Copy, 
  Trash2, 
  Briefcase, 
  Download, 
  UserCircle, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Settings,
  List,
  Grid,
  Building2,
  PlayCircle
} from 'lucide-react';
import type { GuideStep } from '../components/Guide/GuideTour';

// ============================================================
// DASHBOARD TOUR - Tour Completo Dashboard
// ============================================================
export const dashboardTourSteps: GuideStep[] = [
  {
    target: '.venditori-page-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Dashboard Venditore
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Benvenuto nella tua dashboard personale. Qui hai una panoramica completa di tutte le tue attività commerciali.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La dashboard si aggiorna automaticamente e mostra sempre i dati più recenti.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.kpi-status-bar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Indicatori Chiave di Performance
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Questi 4 indicatori mostrano lo stato delle tue attività principali:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Preventivi in Attesa:</strong> Preventivi in attesa di approvazione</li>
          <li><strong>Contratti Attivi:</strong> Numero di contratti attualmente attivi</li>
          <li><strong>Clienti Totali:</strong> Il tuo portafoglio clienti completo</li>
          <li><strong>Contatti da Chiamare:</strong> Lead che richiedono il tuo intervento</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Suggerimento:</strong> Clicca su qualsiasi indicatore per vedere i dettagli filtrati.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Le frecce mostrano la variazione percentuale rispetto al periodo precedente.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.overview-revenue-card',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <DollarSign size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Fatturato Totale
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza il valore totale di tutti i tuoi contratti attivi. Questo è il fatturato che stai generando.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Informazioni mostrate:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Fatturato totale accumulato</li>
          <li>Fatturato del mese corrente</li>
          <li>Variazione percentuale rispetto al mese precedente</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.quick-actions-bar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Zap size={20} style={{ color: '#F59E0B' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Azioni Rapide
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Accesso veloce alle operazioni più frequenti. Da qui puoi:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Nuovo Preventivo:</strong> Avvia la creazione di un preventivo</li>
          <li><strong>Nuovo Contatto:</strong> Aggiungi un nuovo lead al CRM</li>
          <li><strong>Vedi Agenda:</strong> Apri il calendario delle attività</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.sales-trend-card',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <TrendingUp size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Andamento Vendite
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Grafico interattivo che visualizza l'andamento delle tue vendite nel tempo.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Come utilizzare il grafico:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Passa il mouse sui punti del grafico per vedere i dettagli giornalieri</li>
          <li>Usa il menu in alto a destra per cambiare il periodo (7/30/90 giorni)</li>
          <li>Il totale mostrato è la somma del periodo selezionato</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La variazione percentuale confronta il primo e l'ultimo valore del periodo.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.overview-card:has(.leads-list)',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <AlertCircle size={20} style={{ color: '#EF4444' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Contatti Urgenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Lista dei contatti che richiedono la tua attenzione immediata. Questi sono lead con priorità alta o urgente, o con follow-up programmati.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Informazioni mostrate:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Nome azienda e referente</li>
          <li>Data del prossimo follow-up</li>
          <li>Badge di priorità (alta/urgente)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Clicca su un contatto per vedere i dettagli o su "Vedi tutti" per la lista completa filtrata.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.overview-card:has(.quotes-list)',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Preventivi Recenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Gli ultimi preventivi che hai creato, con il loro stato attuale e l'importo totale.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Stati possibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>In Attesa:</strong> In attesa di approvazione del cliente</li>
          <li><strong>Approvato:</strong> Preventivo accettato dal cliente</li>
          <li><strong>Contratto Richiesto:</strong> Richiesta di conversione in contratto</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Clicca su un preventivo per vedere i dettagli completi e gestirlo.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.overview-card:has(.activities-list)',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Attività Recenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Timeline delle ultime attività del tuo account: preventivi creati, contratti firmati, clienti aggiunti, contatti aggiornati.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni attività mostra il tipo, la descrizione, l'importo (se applicabile) e il tempo trascorso.
        </p>
      </div>
    ),
    placement: 'top',
  },
];

// ============================================================
// LISTINI TOUR - Tour Completo Listini Prezzi
// ============================================================
export const listiniTourSteps: GuideStep[] = [
  {
    target: '.venditori-page-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Package size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Listini Prezzi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza tutti i prodotti e servizi disponibili nel catalogo. Questa sezione è in sola lettura per i venditori.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I listini sono organizzati per dipartimento/settore per facilitare la ricerca.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.venditori-search-wrapper',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Prodotti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca prodotti e servizi per nome, descrizione o settore. La ricerca è istantanea e filtra i risultati mentre digiti.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Puoi cercare anche per caratteristiche specifiche o parole chiave contenute nella descrizione.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.venditori-filter-wrapper',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtro per Settore
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i prodotti per dipartimento/settore per vedere solo quelli rilevanti per il tuo ambito di lavoro.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Seleziona un settore specifico dal menu a tendina per visualizzare solo i prodotti di quel settore.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.filter-select',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtro per Stato
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i prodotti per stato di disponibilità:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Solo Attivi:</strong> Mostra solo prodotti disponibili</li>
          <li><strong>Solo Inattivi:</strong> Mostra prodotti non più disponibili</li>
          <li><strong>Tutti:</strong> Mostra tutti i prodotti</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.price-list-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Package size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Card Prodotto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni card rappresenta un prodotto o servizio disponibile. Mostra tutte le informazioni essenziali per la vendita.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Informazioni mostrate:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Nome del prodotto/servizio</li>
          <li>Prezzo base (o "Prezzo su richiesta")</li>
          <li>Descrizione del prodotto</li>
          <li>Badge "Inattivo" se il prodotto non è disponibile</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Scheda Tecnica:</strong> Vedi tutti i dettagli completi del prodotto</li>
          <li><strong>Presenta:</strong> Apre la landing page dedicata (se disponibile)</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.price-list-section:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Building2 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Raggruppamento per Settore
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          I prodotti sono organizzati per dipartimento/settore per facilitare la navigazione.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni sezione mostra il nome del settore e tutti i prodotti associati in una griglia responsive.
        </p>
      </div>
    ),
    placement: 'top',
  },
];

// ============================================================
// PREVENTIVI TOUR - Tour Completo Gestione Preventivi
// ============================================================
export const preventiviTourSteps: GuideStep[] = [
  {
    target: '.seller-quotes-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Preventivi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Qui gestisci tutti i tuoi preventivi: crea nuovi preventivi, visualizza quelli esistenti, modificali e tracciali.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni preventivo può essere convertito in contratto una volta approvato dal cliente.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.seller-quotes-new-btn',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Plus size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Crea Nuovo Preventivo
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Clicca qui per avviare il wizard di creazione preventivo. Il processo è guidato in 5 step:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Step 1:</strong> Selezione servizi dal listino</li>
          <li><strong>Step 2:</strong> Configurazione dettagliata (quantità, opzioni, pagamenti)</li>
          <li><strong>Step 5:</strong> Informazioni cliente (seleziona o crea nuovo)</li>
          <li><strong>Step 7:</strong> Riepilogo e verifica</li>
          <li><strong>Step 8:</strong> Finalizzazione con titolo e note</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Il wizard salva automaticamente i tuoi progressi, così puoi completarlo in più sessioni.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-quotes-search',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Preventivi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca preventivi per numero preventivo, titolo o nome cliente. La ricerca filtra i risultati in tempo reale mentre digiti.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Utile per trovare rapidamente un preventivo specifico tra molti risultati.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-quotes-filter-pill',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtro per Stato
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i preventivi per stato per trovare rapidamente quelli che richiedono attenzione:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>In Attesa:</strong> In attesa di risposta del cliente</li>
          <li><strong>Approvato:</strong> Preventivo accettato</li>
          <li><strong>Rifiutato:</strong> Preventivo rifiutato</li>
          <li><strong>Contratto Richiesto:</strong> Pronto per la conversione</li>
          <li><strong>Avviato/Completato:</strong> Preventivo in esecuzione o completato</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Combina ricerca e filtri per trovare esattamente quello che cerchi.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-quotes-row:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Lista Preventivi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni riga rappresenta un preventivo con tutte le informazioni essenziali:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Titolo e numero preventivo</li>
          <li>Cliente (con avatar)</li>
          <li>Stato con badge colorato</li>
          <li>Data di creazione</li>
          <li>Importo totale</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Passa il mouse</strong> su una riga per vedere le azioni disponibili:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><Eye size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Visualizza:</strong> Dettagli completi del preventivo</li>
          <li><Edit size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Modifica:</strong> Modifica preventivo (se non approvato)</li>
          <li><FileCheck size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Richiedi Contratto:</strong> Richiedi conversione in contratto</li>
          <li><Copy size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Duplica:</strong> Crea una copia identica</li>
          <li><Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Elimina:</strong> Rimuovi preventivo</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// CONTRATTI TOUR - Tour Completo Gestione Contratti
// ============================================================
export const contrattiTourSteps: GuideStep[] = [
  {
    target: '.seller-contracts-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Briefcase size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Contratti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza e gestisci tutti i tuoi contratti attivi. I contratti vengono creati dalla segreteria dopo l'approvazione di un preventivo.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Qui puoi vedere lo stato, scaricare i PDF e monitorare le scadenze.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.seller-contracts-search',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Contratti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca contratti per numero contratto, titolo o nome cliente. La ricerca è istantanea e filtra i risultati in tempo reale.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Utile quando hai molti contratti e devi trovarne uno specifico rapidamente.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-contracts-filter-pill',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtro per Stato
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i contratti per stato per vedere solo quelli rilevanti:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Attivo:</strong> Contratti in corso</li>
          <li><strong>In Attesa di Firma:</strong> In attesa della firma del cliente</li>
          <li><strong>Completato:</strong> Contratti terminati con successo</li>
          <li><strong>Sospeso/Terminato:</strong> Contratti interrotti</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-contracts-view-toggle',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Cambia Vista
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Scegli tra due modalità di visualizzazione:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><List size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Vista Lista:</strong> Dettagliata, mostra tutte le informazioni in una tabella</li>
          <li><Grid size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Vista Card:</strong> Compatta, mostra informazioni essenziali in card</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La vista lista è ideale per confrontare molti contratti, la vista card per una panoramica rapida.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-contracts-row:first-child, .seller-contracts-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Briefcase size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            I Tuoi Contratti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni contratto mostra informazioni complete:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Numero contratto e titolo</li>
          <li>Cliente con avatar</li>
          <li>Valore totale del contratto</li>
          <li>Stato con badge colorato</li>
          <li>Range di date (inizio - fine)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><Eye size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Visualizza:</strong> Dettagli completi del contratto</li>
          <li><Download size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Scarica PDF:</strong> Download del documento contratto (se disponibile)</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// CLIENTI TOUR - Tour Completo Gestione Clienti
// ============================================================
export const clientiTourSteps: GuideStep[] = [
  {
    target: '.seller-clients-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <UserCircle size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Clienti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il tuo portafoglio clienti completo. Qui puoi visualizzare tutti i clienti assegnati a te, vedere le loro attività e gestire le relazioni.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni cliente mostra statistiche aggregate su preventivi, contratti e progetti associati.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.seller-clients-new-btn',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Plus size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Nuovo Cliente
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Aggiungi un nuovo cliente al sistema. Il cliente verrà automaticamente assegnato a te come venditore responsabile.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Informazioni richieste:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Nome azienda (obbligatorio)</li>
          <li>Dati di contatto (email, telefono)</li>
          <li>Informazioni anagrafiche (P.IVA, indirizzo)</li>
          <li>Referente principale</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-clients-search',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Clienti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca clienti per nome azienda, email o numero di telefono. La ricerca è istantanea con debounce di 300ms per ottimizzare le performance.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La ricerca funziona su tutti i campi principali del cliente, rendendo facile trovare anche con informazioni parziali.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.seller-clients-row:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <UserCircle size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Lista Clienti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni riga rappresenta un cliente con informazioni chiave:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Avatar:</strong> Colore generato automaticamente con iniziali</li>
          <li><strong>Nome Azienda:</strong> Nome principale e ragione sociale</li>
          <li><strong>Contatti:</strong> Email e telefono principali</li>
          <li><strong>Statistiche:</strong> Numero di preventivi, contratti e progetti</li>
          <li><strong>Ultima Attività:</strong> Data dell'ultimo preventivo creato</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Clicca su un cliente per vedere il dettaglio completo con tutte le attività associate: preventivi, contratti, progetti e pagamenti.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.seller-clients-row:first-child .seller-clients-col-stats',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Statistiche Attività
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni cliente mostra un riepilogo delle attività associate in formato compatto:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Numero di preventivi creati</li>
          <li>Numero di contratti attivi</li>
          <li>Numero di progetti associati</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Queste statistiche ti aiutano a capire rapidamente il livello di engagement con ogni cliente.
        </p>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// COMMISSIONI TOUR - Tour Completo Monitoraggio Commissioni
// ============================================================
export const commissioniTourSteps: GuideStep[] = [
  {
    target: '.commissions-hero-section',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <DollarSign size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Monitoraggio Commissioni
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza e monitora tutte le tue provvigioni in un'unica schermata. Le commissioni vengono calcolate automaticamente in base ai contratti attivi.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Le commissioni maturano in base alle rate pagate dai clienti e alla tua percentuale di fee.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.commissions-wallet-card',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <DollarSign size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Saldo Provvigioni
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il tuo saldo totale delle provvigioni disponibili per la riscossione. Questo è l'importo che puoi richiedere di riscuotere immediatamente.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Come funziona:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Le commissioni maturano quando il cliente paga una rata</li>
          <li>Diventano "liquidabili" quando sono pronte per la riscossione</li>
          <li>Il saldo si aggiorna automaticamente</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.commissions-breakdown-card',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Dettaglio Commissioni
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Suddivisione completa delle tue commissioni per stato:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#10B981' }} /> <strong>Maturate:</strong> Commissioni già riscosse e pagate</li>
          <li><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#9CA3AF' }} /> <strong>In Attesa:</strong> Commissioni in attesa di maturazione (rate non ancora pagate)</li>
          <li><strong>La Tua Fee:</strong> Percentuale di commissione applicata ai tuoi contratti</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Il totale "In Attesa" può includere anche commissioni previste per rate future.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.commissions-search-bar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Contratti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca contratti per numero, titolo o nome cliente per vedere le relative commissioni.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La ricerca filtra la tabella sottostante in tempo reale.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.commissions-table',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tabella Commissioni per Contratto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni riga mostra un contratto con le relative commissioni calcolate. Le informazioni includono:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Numero contratto e cliente</li>
          <li>Stato pagamenti con barra di progresso</li>
          <li>Importo totale del contratto</li>
          <li>La tua provvigione totale</li>
          <li>Stato commissioni (Liquidabile, In Maturazione, Completato)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Clicca su una riga</strong> per espandere e vedere:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Calcolo dettagliato della provvigione (formula: Totale × Fee%)</li>
          <li>Timeline completa dei pagamenti</li>
          <li>Stato di ogni singola rata</li>
          <li>Link per vedere il dettaglio completo</li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
];

// ============================================================
// CONTATTI TOUR - Tour Completo Gestione Contatti/Leads
// ============================================================
export const contattiTourSteps: GuideStep[] = [
  {
    target: '.apple-crm-toolbar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Phone size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Contatti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il tuo CRM per la gestione completa dei contatti e leads. Qui puoi tracciare l'intero ciclo di vendita dal primo contatto alla chiusura.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni contatto può essere qualificato, seguito e convertito in cliente e preventivo.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.apple-crm-primary-btn',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Plus size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Nuovo Contatto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Crea un nuovo contatto/lead nel sistema. Il contatto verrà automaticamente assegnato a te e avrà status iniziale "Nuovo".
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Campi disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Nome azienda (obbligatorio)</li>
          <li>Persona di contatto</li>
          <li>Telefono e email</li>
          <li>Tipologia (es: Ristorante, Hotel)</li>
          <li>Priorità (Bassa, Media, Alta, Urgente)</li>
          <li>Descrizione e note</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.apple-crm-search',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca Contatti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Cerca contatti per nome azienda, persona di contatto, descrizione o tipologia. La ricerca è istantanea e filtra i risultati mentre digiti.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Supporta ricerche parziali e cerca in tutti i campi principali del contatto.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.apple-crm-filters',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtri Avanzati
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i contatti per stato e priorità per trovare rapidamente quelli che richiedono attenzione:
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Filtro Stato:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Nuovo, Contattato, Qualificato</li>
          <li>Proposta, Negoziazione</li>
          <li>Vinto, Perso</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Filtro Priorità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Urgente, Alta, Media, Bassa</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.apple-crm-row:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Phone size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Lista Contatti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni riga mostra un contatto con informazioni essenziali:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Avatar:</strong> Colore generato automaticamente con iniziale</li>
          <li><strong>Azienda:</strong> Nome principale e tipologia</li>
          <li><strong>Referente:</strong> Persona di contatto</li>
          <li><strong>Contatti:</strong> Telefono principale</li>
          <li><strong>Priorità:</strong> Badge colorato con indicatore visivo</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni rapide disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Telefono:</strong> Clicca per vedere il numero completo</li>
          <li><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Email:</strong> Menu con opzioni: copia email o invia email da template</li>
          <li><ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Dettaglio:</strong> Vedi informazioni complete e timeline attività</li>
          <li><Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Rifiuta:</strong> Marca il contatto come perso (se non vinto)</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// AGENDA TOUR - Tour Completo Calendario e Attività
// ============================================================
export const agendaTourSteps: GuideStep[] = [
  {
    target: '.project-calendar, .seller-agenda-page',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Calendario Attività
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il tuo calendario personale per gestire appuntamenti, follow-up, scadenze e attività programmate.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Tipi di eventi supportati:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Appuntamenti con clienti</li>
          <li>Follow-up e promemoria</li>
          <li>Scadenze preventivi e contratti</li>
          <li>Chiamate programmate</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.calendar-item, .calendar-item-all-day',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Eventi del Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni evento nel calendario può essere interagito in diversi modi:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Clicca:</strong> Apri il dettaglio per modificare o vedere informazioni</li>
          <li><strong>Trascina:</strong> Sposta l'evento a un'altra data/ora (drag & drop)</li>
          <li><strong>Ridimensiona:</strong> Modifica la durata trascinando i bordi</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Gli eventi possono essere collegati a contatti o clienti per un tracciamento completo.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.calendar-week-header, .calendar-main-content',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Navigazione Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Usa i controlli del calendario per navigare tra le date:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Frecce nel mini-calendario per cambiare mese</li>
          <li>Clicca su un giorno nel mini-calendario per saltare a quella data</li>
          <li>Usa le frecce nella vista principale per navigare settimana/giorno</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La vista settimanale è ideale per vedere la settimana lavorativa, la vista mensile per una panoramica generale.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.calendar-time-slot, .calendar-time-column',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Orari
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Nella vista settimanale e giornaliera, puoi vedere gli eventi posizionati per ora del giorno.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Clicca su un orario vuoto per creare un nuovo evento</li>
          <li>Trascina eventi per spostarli a orari diversi</li>
          <li>Ridimensiona eventi trascinando i bordi superiore/inferiore</li>
          <li>Gli eventi all-day appaiono nella parte superiore</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.mini-calendar, .sidebar-mini-calendar-wrapper',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Mini Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il mini calendario laterale ti permette di navigare rapidamente tra le date e vedere quali giorni hanno eventi programmati.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Usa le frecce per cambiare mese</li>
          <li>Clicca su un giorno per saltare a quella data</li>
          <li>I giorni con eventi sono evidenziati</li>
          <li>Il giorno corrente è sempre evidenziato</li>
        </ul>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// TOUR COMPLETO - Guida attraverso tutte le sezioni
// ============================================================
export const completeTourSteps: GuideStep[] = [
  {
    target: '.seller-sidebar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <PlayCircle size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tour Completo del CRM Venditore
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Benvenuto! Questo tour completo ti guiderà attraverso tutte le funzionalità principali del CRM Venditore di BackClub.it.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>La sidebar contiene 8 sezioni principali:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Dashboard - Panoramica attività</li>
          <li>Listini - Prodotti e servizi</li>
          <li>Preventivi - Gestione preventivi</li>
          <li>Contratti - Contratti attivi</li>
          <li>Clienti - Portafoglio clienti</li>
          <li>Commissioni - Monitoraggio provvigioni</li>
          <li>Contatti - Gestione leads</li>
          <li>Agenda - Calendario attività</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          Iniziamo il tour! Segui gli step per scoprire tutte le funzionalità.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  ...dashboardTourSteps.map(step => ({ ...step })),
  ...listiniTourSteps.map(step => ({ ...step, navigateTo: '/seller/listini' })),
  ...preventiviTourSteps.map(step => ({ ...step, navigateTo: '/seller/preventivi' })),
  ...contrattiTourSteps.map(step => ({ ...step, navigateTo: '/seller/contratti' })),
  ...clientiTourSteps.map(step => ({ ...step, navigateTo: '/seller/clienti' })),
  ...commissioniTourSteps.map(step => ({ ...step, navigateTo: '/seller/commissioni' })),
  ...contattiTourSteps.map(step => ({ ...step, navigateTo: '/seller/contatti' })),
  ...agendaTourSteps.map(step => ({ ...step, navigateTo: '/seller/agenda' })),
  {
    target: '.seller-sidebar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckCircle size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tour Completato!
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Complimenti! Hai completato il tour completo del CRM Venditore. Ora conosci tutte le funzionalità principali.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Ricorda:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Puoi sempre riavviare questo tour dal menu Tutorial nella sidebar</li>
          <li>Ogni sezione ha il suo tour specifico per approfondimenti</li>
          <li>Il sistema salva automaticamente i tuoi progressi</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          Buon lavoro e buone vendite!
        </p>
      </div>
    ),
    placement: 'right',
  },
];
