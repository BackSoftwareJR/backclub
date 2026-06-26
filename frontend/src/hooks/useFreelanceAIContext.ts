import { useLocation, useParams } from 'react-router-dom';
import { useMemo } from 'react';

export interface FreelanceAIContextPayload {
  page: string;
  path: string;
  taskId?: number;
  projectId?: number;
  crmCode?: string;
}

export interface FreelanceAIContext {
  contextLabel: string;
  contextPayload: FreelanceAIContextPayload;
}

const PAGE_LABELS: Record<string, string> = {
  '/freelance':           'Dashboard Freelance',
  '/freelance/progetti':  'Lista Progetti',
  '/freelance/task':      'Lista Task',
  '/freelance/richieste': 'Richieste',
  '/freelance/chat':      'Chat',
  '/freelance/calendario': 'Calendario',
  '/freelance/focus':     'Focus',
  '/freelance/supporto':  'Supporto',
  '/freelance/notifiche': 'Notifiche',
  '/freelance/impostazioni': 'Impostazioni',
};

export function useFreelanceAIContext(): FreelanceAIContext {
  const location = useLocation();
  const params = useParams<{ id?: string; code?: string }>();

  return useMemo<FreelanceAIContext>(() => {
    const path = location.pathname;
    const payload: FreelanceAIContextPayload = { page: '', path };

    // Task detail
    const taskMatch = path.match(/\/freelance\/task\/(\d+)/);
    if (taskMatch) {
      const taskId = Number(taskMatch[1]);
      payload.taskId = taskId;
      payload.page = `Task #${taskId}`;
      return { contextLabel: `Task #${taskId}`, contextPayload: payload };
    }

    // Project detail
    const projectMatch = path.match(/\/freelance\/progett[io]\/(\d+)/);
    if (projectMatch) {
      const projectId = Number(projectMatch[1]);
      payload.projectId = projectId;
      payload.page = `Progetto #${projectId}`;
      return { contextLabel: `Progetto #${projectId}`, contextPayload: payload };
    }

    // CRM dedicated
    const crmMatch = path.match(/\/freelance\/crm\/([^/]+)/);
    if (crmMatch) {
      const code = decodeURIComponent(crmMatch[1]);
      payload.crmCode = code;
      payload.page = `CRM ${code}`;
      return { contextLabel: `CRM — ${code}`, contextPayload: payload };
    }

    // Static pages
    for (const [prefix, label] of Object.entries(PAGE_LABELS)) {
      if (path === prefix || path.startsWith(prefix + '/')) {
        payload.page = label;
        return { contextLabel: label, contextPayload: payload };
      }
    }

    payload.page = 'Freelance';
    return { contextLabel: 'Freelance', contextPayload: payload };
  }, [location.pathname, params]);
}
