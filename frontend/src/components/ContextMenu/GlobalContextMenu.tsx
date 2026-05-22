import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  UserPlus,
  CreditCard,
  Briefcase,
  ArrowLeft,
} from 'lucide-react';
import { useContextMenu as useContextMenuContext } from '../../context/ContextMenuContext.tsx';
import { useScrollRestoration } from '../../hooks/useScrollRestoration.ts';
import ProjectSelectorModal from './ProjectSelectorModal.tsx';
import type { CrmProject } from '../../api/crmProjects';
import CreateClientModal from '../CreateClientModal/CreateClientModal';
import './GlobalContextMenu.css';

const GlobalContextMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showContextMenu } = useContextMenuContext();
  const { goBack } = useScrollRestoration();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [historyLength, setHistoryLength] = useState(window.history.length);

  // Aggiorna la lunghezza della history quando cambia la location
  React.useEffect(() => {
    setHistoryLength(window.history.length);
  }, [location]);

  // Verifica se c'è una pagina precedente nella history
  const canGoBack = historyLength > 1 || document.referrer !== '';

  const handleProjectSelected = (project: CrmProject) => {
    navigate(`/gestione-progetti/${project.id}`);
  };

  const handleClientCreated = () => {
    setShowCreateClientModal(false);
    // Ricarica la pagina corrente se necessario
    window.location.reload();
  };

  // Funzione per mostrare il menu globale
  const showGlobalContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = [
      {
        id: 'create-quote',
        label: 'Fai un preventivo',
        icon: <FileText size={16} />,
        action: () => navigate('/venditori/preventivi/nuovo'),
        shortcut: '⌘Q',
      },
      {
        id: 'create-client',
        label: 'Nuovo cliente',
        icon: <UserPlus size={16} />,
        action: () => setShowCreateClientModal(true),
        shortcut: '⌘N',
      },
      {
        id: 'view-payment-plans',
        label: 'Visualizza piani pagamento',
        icon: <CreditCard size={16} />,
        action: () => navigate('/segreteria/fatture?tab=piani'),
        shortcut: '⌘P',
      },
      {
        id: 'view-project',
        label: 'Visualizza progetto',
        icon: <Briefcase size={16} />,
        action: () => setShowProjectSelector(true),
        shortcut: '⌘J',
      },
      {
        id: 'divider-1',
        divider: true,
        label: '',
        action: () => {},
      },
      {
        id: 'go-back',
        label: 'Torna indietro',
        icon: <ArrowLeft size={16} />,
        action: () => goBack(),
        disabled: !canGoBack,
        shortcut: '⌘←',
      },
    ];

    showContextMenu(items, { x: e.clientX, y: e.clientY });
  }, [showContextMenu, canGoBack, navigate, goBack]);

  // Intercetta il tasto destro in tutta l'app (eccetto dove già gestito)
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Non intercettare se:
      // 1. C'è già un menu personalizzato (data-context-menu)
      // 2. È un elemento editabile
      // 3. Ha data-no-context-menu
      const hasCustomMenu = target.closest('[data-context-menu]');
      const isEditable = target.closest('input, textarea, [contenteditable="true"]');
      const noContextMenu = target.closest('[data-no-context-menu]');
      
      // Se ha già un menu personalizzato o è editabile, non fare nulla
      if (hasCustomMenu || isEditable || noContextMenu) {
        return;
      }
      
      // Verifica se è nel page-content (area principale dell'app)
      const isInPageContent = target.closest('.page-content');
      
      // Se è nel page-content, mostra il menu globale
      if (isInPageContent) {
        showGlobalContextMenu(e);
      }
    };

    // Aggiungi listener globale con capture per intercettare prima degli altri
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [showGlobalContextMenu]);

  return (
    <>
      <ProjectSelectorModal
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onSelect={handleProjectSelected}
      />
      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onSuccess={handleClientCreated}
      />
    </>
  );
};

export default GlobalContextMenu;

