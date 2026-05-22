import { 
  Home,
  FolderKanban,
  CheckSquare,
  FileText,
  MessageSquare,
  Calendar,
  HelpCircle,
  Bell,
  Search,
  Filter,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  Settings,
  Building2,
  Download,
  PlayCircle,
  BarChart3,
  Circle,
  Zap,
  Send
} from 'lucide-react';
import type { GuideStep } from '../components/Guide/GuideTour';

// ============================================================
// FREELANCE DASHBOARD TOUR
// ============================================================
export const freelanceDashboardTourSteps: GuideStep[] = [
  {
    target: '.freelance-dashboard-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Home size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Dashboard Freelance
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Benvenuto nella tua dashboard personale. Qui hai una panoramica completa di tutte le tue attività di lavoro.
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
    target: '.freelance-dashboard-header-right',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Statistiche Rapide
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Questi indicatori mostrano lo stato delle tue attività principali:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Progetti:</strong> Numero progetti attivi assegnati a te</li>
          <li><strong>Task Oggi:</strong> Task con scadenza oggi</li>
          <li><strong>Messaggi:</strong> Messaggi non letti nelle chat progetto</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          <strong>Suggerimento:</strong> Clicca su qualsiasi indicatore per navigare direttamente alla sezione corrispondente.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-task-tabs',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tab Task e Eventi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Organizza le tue attività usando le tab:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Oggi:</strong> Task con scadenza oggi + eventi calendario di oggi</li>
          <li><strong>Prossimi:</strong> Task futuri + eventi calendario futuri</li>
          <li><strong>In Revisione:</strong> Task in stato "review" o "in_progress"</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni tab mostra una vista filtrata delle tue attività per aiutarti a concentrarti su ciò che è più importante.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-task-item, .freelance-calendar-item',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Task e Eventi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni item rappresenta un task o un evento del calendario:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Icona:</strong> Indica il tipo (task, evento, chiamata, scadenza)</li>
          <li><strong>Titolo:</strong> Nome task o evento</li>
          <li><strong>Progetto:</strong> Nome progetto (per task)</li>
          <li><strong>Data/Ora:</strong> Scadenza task o orario evento</li>
          <li><strong>Priorità:</strong> Badge colorato (per task)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Click su task:</strong> Apre dettaglio completo</li>
          <li><strong>Checkbox task:</strong> Toggle completamento rapido</li>
          <li><strong>Click su evento:</strong> Apre dettaglio evento</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.freelance-mini-calendar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Mini Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Calendario mensile compatto che mostra:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Giorno corrente evidenziato</li>
          <li>Giorni della settimana corrente evidenziati</li>
          <li>Giorni con task/eventi (pallino indicatore)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Usa le frecce per cambiare mese</li>
          <li>Clicca su un giorno per filtrare task/eventi di quel giorno</li>
          <li>Il calendario completo è disponibile nella sezione "Calendario"</li>
        </ul>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.freelance-activity-list',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Attività Recenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Mostra i prossimi 5 task ordinati per scadenza. Questi sono i task che richiedono la tua attenzione prossimamente.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Ogni item mostra il titolo del task, il progetto associato e la data di scadenza. Clicca su un task per vedere i dettagli completi.
        </p>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// FREELANCE PROGETTI TOUR
// ============================================================
export const freelanceProgettiTourSteps: GuideStep[] = [
  {
    target: '.freelance-projects-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FolderKanban size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            I Tuoi Progetti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza tutti i progetti assegnati a te. Ogni progetto mostra informazioni essenziali per una gestione efficace.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I progetti sono organizzati in una griglia responsive per una visualizzazione ottimale.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.freelance-project-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FolderKanban size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Card Progetto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni card mostra tutte le informazioni essenziali del progetto:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Icona Dipartimento:</strong> Icona/emoji del settore (Video, Web, Ads, etc.)</li>
          <li><strong>Nome Progetto:</strong> Titolo principale</li>
          <li><strong>Data Consegna:</strong> Scadenza prevista del progetto</li>
          <li><strong>Barra Progresso:</strong> Percentuale completamento (0-100%)</li>
          <li><strong>Badge PM:</strong> Tag verde "PM" visibile solo sui progetti in cui sei il Project Manager</li>
          <li><strong>Numero Task:</strong> Task assegnati a te in questo progetto</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          <strong>Clicca sulla card</strong> per vedere il dettaglio completo del progetto con tutti i task raggruppati per stato.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// FREELANCE TASK TOUR
// ============================================================
export const freelanceTaskTourSteps: GuideStep[] = [
  {
    target: '.freelance-tasks-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Gestione Task
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Vista kanban completa di tutti i tuoi task organizzati per stato. Questa vista ti permette di vedere rapidamente cosa devi fare, cosa stai facendo, e cosa è in revisione.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I task sono organizzati in 4 sezioni principali: Da Fare, In Corso, In Revisione, e Completati.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.freelance-tasks-filter',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtro per Progetto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra i task per progetto per vedere solo quelli di un progetto specifico. Utile quando lavori su più progetti contemporaneamente.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Seleziona "Tutti i progetti" per vedere tutti i task senza filtri.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.task-section:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Circle size={20} style={{ color: '#8E8E93' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Sezione "DA FARE"
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Task in stato "pending" che devi ancora iniziare. Questi sono i task nuovi assegnati a te.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Checkbox circolare:</strong> Click per prendere in carico (cambia a "in_progress")</li>
          <li><strong>Click su task:</strong> Apre dettaglio completo</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Il badge mostra il numero di task in questa sezione.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.task-section:nth-child(2)',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={20} style={{ color: '#0A84FF' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Sezione "IN CORSO"
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Task in stato "in_progress" che stai attualmente lavorando. Questi sono i task che hai preso in carico.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Azioni disponibili:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Pallino pulsante:</strong> Click per mettere in pausa (torna a "pending")</li>
          <li><strong>Click su task:</strong> Apre dettaglio dove puoi consegnare il lavoro</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Quando completi un task, clicca su "Consegna Lavoro" nel dettaglio per inviarlo in revisione.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.task-section:nth-child(3)',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Eye size={20} style={{ color: '#FF9F0A' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Sezione "IN REVISIONE"
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Task in stato "review" che hai consegnato e sono in attesa di revisione da parte del Project Manager.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Questi task non possono essere modificati fino a quando il PM non li approva o richiede modifiche. L'icona Eye indica che sono in fase di revisione.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.task-section:last-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckCircle size={20} style={{ color: '#34C759' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Sezione "COMPLETATI"
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Task completati e approvati. Questa sezione è collassabile per mantenere la vista pulita.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Click sull'header per espandere/collassare</li>
          <li>Click su checkbox completato per riaprire il task (torna a "pending")</li>
          <li>Task mostrati con stile "completato" (grigio, barrato)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Utile per vedere lo storico del tuo lavoro o riaprire task se necessario.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// FREELANCE TASK DETAIL TOUR
// ============================================================
export const freelanceTaskDetailTourSteps: GuideStep[] = [
  {
    target: '.task-action-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Dettaglio Task
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Pagina completa per gestire un task. Qui puoi vedere tutte le informazioni, gestire lo stato, aggiungere commenti, e richiedere modifiche.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          L'header è sempre visibile (sticky) per un accesso rapido alle azioni principali.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.task-action-primary-btn, .task-action-badge',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Zap size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Azione Principale
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Il pulsante principale cambia in base allo stato del task:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>"Prendi in Carico":</strong> Se task è "pending" → cambia a "in_progress"</li>
          <li><strong>"Consegna Lavoro":</strong> Se task è "in_progress" → apre modal consegna</li>
          <li><strong>Badge Stato:</strong> Se task è "review" o "completed" → mostra solo stato (non cliccabile)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La modal consegna ti permette di aggiungere feedback e valutazione soddisfazione.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.task-pending-request-banner',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={20} style={{ color: '#FF9F0A' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Richieste Pendenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Se hai inviato una richiesta di spostamento scadenza o eliminazione, questo banner mostra lo stato della richiesta.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Il banner mostra il tipo di richiesta, i dettagli (nuova data, motivo) e la data di creazione. La richiesta è in attesa di risposta dal Project Manager.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.task-checklist',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Checklist Subtask
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Se il task ha subtask, puoi gestirli qui. Ogni subtask può essere completato indipendentemente.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Click su checkbox → toggle completamento (0% ↔ 100%)</li>
          <li>Se subtask ha progress parziale, mostra percentuale</li>
          <li>Subtask completati sono barrati</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.task-comment-form',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Discussione e Commenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Usa questa sezione per comunicare con il Project Manager e il team sul task.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Funzionalità:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Vedi tutti i commenti precedenti con autore e data</li>
          <li>Scrivi nuovo commento nella textarea</li>
          <li>Click "Invia" → commento aggiunto e lista aggiornata</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.task-sidebar-info',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Informazioni Task
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          La sidebar mostra tutte le informazioni chiave del task:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Scadenza:</strong> Data con badge "In ritardo" o "Urgente" se applicabile</li>
          <li><strong>Priorità:</strong> Badge colorato (low, medium, high, urgent)</li>
          <li><strong>Progetto:</strong> Nome progetto (cliccabile → naviga a dettaglio progetto)</li>
          <li><strong>Ore Stimate:</strong> Tempo stimato per completamento</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Queste informazioni ti aiutano a pianificare il lavoro e capire le priorità.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.task-request-actions',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Richieste Modifiche
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Se hai bisogno di modificare il task, puoi richiedere:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Richiedi Spostamento:</strong> Richiedi di cambiare la data di scadenza</li>
          <li><strong>Richiedi Eliminazione:</strong> Richiedi di eliminare il task (se non più necessario)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Entrambe le richieste vengono inviate al Project Manager per l'approvazione. Puoi vedere lo stato delle richieste nella sezione "Richieste".
        </p>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// FREELANCE RICHIESTE TOUR
// ============================================================
export const freelanceRichiesteTourSteps: GuideStep[] = [
  {
    target: '.freelance-requests-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Le Tue Richieste
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza tutte le richieste di spostamento scadenza e eliminazione task che hai inviato. Puoi vedere lo stato di ogni richiesta e i dettagli della review.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Le richieste sono ordinate per data di creazione (più recenti prima).
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.freelance-requests-filters',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtri e Ricerca
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Usa i filtri per trovare rapidamente le richieste che cerchi:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Ricerca:</strong> Cerca per nome task (case-insensitive)</li>
          <li><strong>Filtro Stato:</strong> Filtra per "Tutte", "In attesa", "Approvate", "Rifiutate"</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Combina ricerca e filtri per trovare esattamente quello che cerchi.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-request-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Card Richiesta
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni card mostra una richiesta completa con:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Tipo:</strong> Icona e etichetta (Spostamento Scadenza / Eliminazione Task)</li>
          <li><strong>Stato:</strong> Badge colorato (In attesa = arancione, Approvata = verde, Rifiutata = rosso)</li>
          <li><strong>Task:</strong> Titolo task (cliccabile → naviga a dettaglio)</li>
          <li><strong>Progetto:</strong> Nome progetto associato</li>
          <li><strong>Dettagli:</strong> Data attuale, data richiesta, motivo (per spostamento) o solo motivo (per eliminazione)</li>
          <li><strong>Review:</strong> Se approvata/rifiutata, mostra reviewer, data review e note</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Clicca sul titolo del task per vedere il dettaglio completo del task.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// FREELANCE CHAT TOUR
// ============================================================
export const freelanceChatTourSteps: GuideStep[] = [
  {
    target: '.freelance-chat-sidebar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Chat con Project Manager
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Sistema di chat per comunicare con i Project Manager dei tuoi progetti. Ogni progetto ha un canale chat dedicato.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          La sidebar mostra tutti i progetti con canali chat disponibili.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.freelance-chat-channel:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Canale Chat Progetto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni canale rappresenta un progetto:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Icona:</strong> MessageSquare con badge se ci sono messaggi non letti</li>
          <li><strong>Nome Progetto:</strong> Titolo del progetto</li>
          <li><strong>Preview Ultimo Messaggio:</strong> Prime 50 caratteri dell'ultimo messaggio</li>
          <li><strong>Timestamp:</strong> Tempo relativo ultimo messaggio</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          <strong>Click sul canale</strong> per aprire la chat e vedere tutti i messaggi del progetto.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.freelance-chat-messages',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageSquare size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Area Messaggi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Visualizza tutti i messaggi del canale selezionato:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>I Tuoi Messaggi:</strong> Allineati a destra, background blu</li>
          <li><strong>Altri Messaggi:</strong> Allineati a sinistra, background grigio, con avatar e nome</li>
          <li><strong>Allegati:</strong> Se presenti, mostrati come link cliccabile</li>
          <li><strong>Timestamp:</strong> Tempo relativo per ogni messaggio</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I messaggi si aggiornano automaticamente ogni 5 secondi. Scroll automatico all'ultimo messaggio quando arrivano nuovi.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.freelance-chat-input-area',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Send size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Invio Messaggi
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Scrivi e invia messaggi al Project Manager:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Textarea:</strong> Scrivi il messaggio (supporta Enter per inviare, Shift+Enter per nuova riga)</li>
          <li><strong>Pulsante Allega:</strong> Allega file (TODO - da implementare)</li>
          <li><strong>Pulsante Invia:</strong> Invia messaggio (disabilitato se textarea vuota)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Dopo l'invio, il messaggio appare immediatamente nella chat e il contatore non letti viene resettato.
        </p>
      </div>
    ),
    placement: 'top',
  },
];

// ============================================================
// FREELANCE CALENDARIO TOUR
// ============================================================
export const freelanceCalendarioTourSteps: GuideStep[] = [
  {
    target: '.project-calendar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Calendario Attività
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Calendario completo per visualizzare e gestire eventi, task, chiamate, scadenze e promemoria. Supporta vista settimanale con drag & drop.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>Tipi di eventi supportati:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Eventi personali</li>
          <li>Task con date/ore</li>
          <li>Chiamate programmate</li>
          <li>Scadenze</li>
          <li>Promemoria</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.mini-calendar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Mini Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Calendario mensile compatto per navigazione rapida:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Usa le frecce per cambiare mese</li>
          <li>Clicca su un giorno per saltare a quella data</li>
          <li>Giorni con eventi/task sono evidenziati</li>
          <li>Giorno corrente sempre evidenziato</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Il mini calendario ti aiuta a navigare rapidamente tra le date senza dover usare le frecce della vista principale.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.calendar-item',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Eventi e Task nel Calendario
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni evento/task nel calendario può essere interagito:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Clicca:</strong> Apre modal dettaglio per vedere/modificare informazioni</li>
          <li><strong>Trascina:</strong> Sposta evento a nuova data/ora (drag & drop)</li>
          <li><strong>Ridimensiona:</strong> Trascina bordi superiore/inferiore per modificare durata</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Gli eventi completati sono mostrati con stile grigiastro e barrato. Puoi completarli dalla modal dettaglio.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.calendar-week-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Settings size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Navigazione Settimanale
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          L'header mostra i giorni della settimana corrente:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Nome giorno abbreviato (Lun, Mar, etc.)</li>
          <li>Numero giorno</li>
          <li>Giorno corrente evidenziato con cerchio rosso</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Usa le frecce nella vista principale o il mini-calendario per navigare tra le settimane.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.sidebar-calendars-section',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Filtri Progetti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Filtra gli eventi per progetto usando i checkbox:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li>Ogni progetto ha un checkbox</li>
          <li>Toggle per mostrare/nascondere eventi di quel progetto</li>
          <li>Utile quando lavori su molti progetti e vuoi vedere solo eventi specifici</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I filtri vengono applicati immediatamente e persistono durante la sessione.
        </p>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// FREELANCE PROGETTO DETAIL TOUR
// ============================================================
export const freelanceProgettoDetailTourSteps: GuideStep[] = [
  {
    target: '.project-hub-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FolderKanban size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Dettaglio Progetto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Vista completa del progetto con tutte le informazioni, task raggruppati per stato, file e documenti, e azioni rapide.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          L'header mostra il nome progetto, icona dipartimento, progresso circolare e descrizione (espandibile).
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.task-group:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Circle size={20} style={{ color: '#8E8E93' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Task "Da Fare"
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Task in stato "pending" assegnati a te in questo progetto. Questi sono i task che devi ancora iniziare.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Clicca su un task per vedere il dettaglio completo e prendere in carico.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.sidebar-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Building2 size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Info Progetto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Informazioni chiave del progetto:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Consegna Prevista:</strong> Data end_date del progetto</li>
          <li><strong>Cliente:</strong> Nome cliente (se presente)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Queste informazioni ti aiutano a capire il contesto e le scadenze del progetto.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.file-list, .sidebar-empty-state',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Download size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            File & Documenti
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Accesso rapido a tutti i file e documenti del progetto:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Link Cartelle:</strong> Cartella Documenti, Foto e Video, Materiali Social</li>
          <li><strong>Documenti Contratti:</strong> Documenti firmati del contratto</li>
          <li><strong>Download:</strong> Pulsante per scaricare ogni file</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I link si aprono in una nuova tab. I documenti possono essere scaricati direttamente.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.sidebar-action-button',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Zap size={20} style={{ color: '#F59E0B' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Azioni Rapide
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Accesso veloce alle funzionalità più usate:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li><strong>Apri Chat Progetto:</strong> Naviga direttamente alla chat del progetto</li>
          <li><strong>Segnala Problema:</strong> Naviga alla sezione Supporto per creare un ticket</li>
        </ul>
      </div>
    ),
    placement: 'left',
  },
];

// ============================================================
// FREELANCE SUPPORTO TOUR
// ============================================================
export const freelanceSupportoTourSteps: GuideStep[] = [
  {
    target: '.freelance-support-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <HelpCircle size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Centro Supporto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Sistema completo per richiedere supporto: strumenti, segnalare problemi bloccanti, o richiedere ferie/permessi.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Tutte le richieste vengono gestite dal team di supporto e puoi vedere lo stato nella lista ticket.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.freelance-support-new-btn',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Plus size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Nuova Richiesta
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Clicca qui per creare una nuova richiesta di supporto. Il form ti permetterà di:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Selezionare il tipo di richiesta</li>
          <li>Impostare la priorità</li>
          <li>Descrivere la richiesta in dettaglio</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-support-form-card',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Form Richiesta
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Compila il form per creare una nuova richiesta:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Tipo Richiesta:</strong> Strumenti, Problema Bloccante, o Ferie/Permessi</li>
          <li><strong>Priorità:</strong> Bassa, Media, Alta, Urgente</li>
          <li><strong>Descrizione:</strong> Dettagli completi della richiesta (obbligatorio)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Dopo l'invio, la richiesta apparirà nella lista con stato "In attesa" e verrà gestita dal team di supporto.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-support-ticket:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ticket Supporto
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni ticket mostra:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Tipo:</strong> Badge con tipo richiesta</li>
          <li><strong>Priorità:</strong> Badge colorato (Bassa = grigio, Media = blu, Alta = arancione, Urgente = rosso)</li>
          <li><strong>Stato:</strong> Badge con icona (In attesa, In elaborazione, Risolto)</li>
          <li><strong>Descrizione:</strong> Testo completo della richiesta</li>
          <li><strong>Date:</strong> Data creazione e data risoluzione (se risolto)</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          I ticket sono ordinati per data creazione (più recenti prima).
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// FREELANCE NOTIFICHE TOUR
// ============================================================
export const freelanceNotificheTourSteps: GuideStep[] = [
  {
    target: '.freelance-notifications-header',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Bell size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Centro Notifiche
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Sistema completo per gestire tutte le tue notifiche. Ricevi notifiche per task assegnati, messaggi, scadenze, e molto altro.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Le notifiche si aggiornano automaticamente ogni 30 secondi.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.freelance-notifications-controls',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Ricerca e Filtri
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Usa i controlli per trovare rapidamente le notifiche che cerchi:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Ricerca:</strong> Cerca per titolo o messaggio notifica</li>
          <li><strong>Tab Filtri:</strong> Tutte, Non lette, Lette, Urgenti</li>
          <li><strong>Segna tutte come lette:</strong> Marca tutte le notifiche come lette in un click</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Combina ricerca e filtri per trovare esattamente quello che cerchi.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.freelance-notification-card:first-child',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Bell size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Card Notifica
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Ogni notifica mostra:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
          <li><strong>Icona Tipo:</strong> Indica il tipo (task, progetto, messaggio, calendario, etc.)</li>
          <li><strong>Tipo:</strong> Etichetta tipo (Task Assegnato, Aggiunto al Progetto, etc.)</li>
          <li><strong>Titolo:</strong> Titolo della notifica</li>
          <li><strong>Messaggio:</strong> Descrizione completa</li>
          <li><strong>Timestamp:</strong> Tempo relativo (es: "Adesso", "5 min fa")</li>
          <li><strong>Badge Urgente:</strong> Se la notifica è urgente (scadenze, etc.)</li>
          <li><strong>Pallino Non Letta:</strong> Indica se la notifica non è stata ancora letta</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          <strong>Click sulla card</strong> per navigare automaticamente alla risorsa correlata (task, progetto, chat, etc.).
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// ============================================================
// FREELANCE TOUR COMPLETO
// ============================================================
export const freelanceCompleteTourSteps: GuideStep[] = [
  {
    target: '.freelance-sidebar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <PlayCircle size={20} style={{ color: '#6366F1' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tour Completo del CRM Freelance
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Benvenuto! Questo tour completo ti guiderà attraverso tutte le funzionalità principali del CRM Freelance di BackClub.it.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          <strong>La sidebar contiene 7 sezioni principali:</strong>
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
          <li>Dashboard - Panoramica attività</li>
          <li>Progetti - Lista progetti assegnati</li>
          <li>Task - Gestione task con vista kanban</li>
          <li>Richieste - Richieste di modifica task</li>
          <li>Chat - Comunicazione con PM</li>
          <li>Calendario - Calendario attività</li>
          <li>Supporto - Richieste supporto</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          Iniziamo il tour! Segui gli step per scoprire tutte le funzionalità.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  ...freelanceDashboardTourSteps.map(step => ({ ...step })),
  ...freelanceProgettiTourSteps.map(step => ({ ...step, navigateTo: '/freelance/progetti' })),
  ...freelanceTaskTourSteps.map(step => ({ ...step, navigateTo: '/freelance/task' })),
  ...freelanceTaskDetailTourSteps.map(step => ({ ...step, navigateTo: '/freelance/task' })),
  ...freelanceRichiesteTourSteps.map(step => ({ ...step, navigateTo: '/freelance/richieste' })),
  ...freelanceChatTourSteps.map(step => ({ ...step, navigateTo: '/freelance/chat' })),
  ...freelanceCalendarioTourSteps.map(step => ({ ...step, navigateTo: '/freelance/calendario' })),
  ...freelanceProgettoDetailTourSteps.map(step => ({ ...step, navigateTo: '/freelance/progetti' })),
  ...freelanceSupportoTourSteps.map(step => ({ ...step, navigateTo: '/freelance/supporto' })),
  ...freelanceNotificheTourSteps.map(step => ({ ...step, navigateTo: '/freelance/notifiche' })),
  {
    target: '.freelance-sidebar',
    content: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <CheckCircle size={20} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Tour Completato!
          </h3>
        </div>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Complimenti! Hai completato il tour completo del CRM Freelance. Ora conosci tutte le funzionalità principali.
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
          Buon lavoro!
        </p>
      </div>
    ),
    placement: 'right',
  },
];
