import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetConfig = {
  id: string;
  type: string;
  isVisible: boolean;
  order: number;
  colSpan: number;
  rowSpan: number;
};

export type TemplateId = 'focus' | 'lavoro' | 'chat' | 'minimal' | 'concentrazione' | 'custom';

export type LayoutTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  emoji: string;
  gridTemplateAreas: string;
  gridTemplateRows: string;
  widgetIds: string[];
};

/** Preset curati: 4 colonne, righe auto/1fr per area principale, footer utility ampio. */
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'focus',
    name: 'Focus AI',
    description: 'Roadmap AI a sinistra, attività team a destra',
    emoji: '⚡',
    widgetIds: ['header', 'copilot', 'activity', 'notes', 'files', 'pm'],
    gridTemplateAreas: `
      "header   header   header   header"
      "copilot  copilot  activity activity"
      "notes    files    pm       pm"
    `,
    gridTemplateRows: 'auto 1fr minmax(140px, auto)',
  },
  {
    id: 'lavoro',
    name: 'Lavoro',
    description: 'Attività grande al centro, AI e strumenti laterali',
    emoji: '💼',
    widgetIds: ['header', 'activity', 'copilot', 'notes', 'files', 'pm'],
    gridTemplateAreas: `
      "header   header   header   header"
      "activity activity activity copilot"
      "notes    notes    files    pm"
    `,
    gridTemplateRows: 'auto 1fr minmax(140px, auto)',
  },
  {
    id: 'chat',
    name: 'Comunicazione',
    description: 'Chat team ampia + assistente AI laterale',
    emoji: '💬',
    widgetIds: ['header', 'activity', 'assistant', 'notes', 'files', 'pm'],
    gridTemplateAreas: `
      "header   header   header   header"
      "activity activity activity assistant"
      "notes    files    pm       pm"
    `,
    gridTemplateRows: 'auto 1fr minmax(140px, auto)',
  },
  {
    id: 'concentrazione',
    name: 'Concentrazione',
    description: 'Checklist, timer Pomodoro e roadmap AI',
    emoji: '🧠',
    widgetIds: ['header', 'checklist', 'timer', 'copilot', 'notes', 'pm'],
    gridTemplateAreas: `
      "header    header    header    header"
      "checklist checklist timer     timer"
      "checklist checklist copilot   copilot"
      "notes     notes     pm        pm"
    `,
    gridTemplateRows: 'auto minmax(210px, 0.4fr) 1fr minmax(120px, auto)',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Solo task, AI e azioni essenziali',
    emoji: '◻',
    widgetIds: ['header', 'copilot', 'activity', 'pm'],
    gridTemplateAreas: `
      "header   header   header   header"
      "copilot  copilot  activity activity"
      "pm       pm       pm       pm"
    `,
    gridTemplateRows: 'auto 1fr minmax(108px, auto)',
  },
];

// Grid custom: 24 colonne, 8px per unità riga (più facile da ridimensionare)
export const BENTO_GRID_COLS = 24;
export const BENTO_GRID_ROW_PX = 8;

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'header',    type: 'header',    isVisible: true,  order: 0,  colSpan: 24, rowSpan: 20 },
  { id: 'copilot',   type: 'copilot',   isVisible: true,  order: 1,  colSpan: 12, rowSpan: 48 },
  { id: 'activity',  type: 'activity',  isVisible: true,  order: 2,  colSpan: 12, rowSpan: 48 },
  { id: 'assistant', type: 'assistant', isVisible: false, order: 3,  colSpan: 8,  rowSpan: 48 },
  { id: 'pm',        type: 'pm',        isVisible: true,  order: 4,  colSpan: 8,  rowSpan: 22 },
  { id: 'notes',     type: 'notes',     isVisible: true,  order: 5,  colSpan: 8,  rowSpan: 22 },
  { id: 'files',     type: 'files',     isVisible: true,  order: 6,  colSpan: 8,  rowSpan: 22 },
  { id: 'checklist', type: 'checklist', isVisible: false, order: 7,  colSpan: 12, rowSpan: 40 },
  { id: 'clock',     type: 'clock',     isVisible: false, order: 8,  colSpan: 6,  rowSpan: 28 },
  { id: 'timer',     type: 'timer',     isVisible: false, order: 9,  colSpan: 12, rowSpan: 32 },
  { id: 'agent',     type: 'agent',     isVisible: false, order: 10, colSpan: 12, rowSpan: 40 },
];

function widgetsForTemplate(templateId: TemplateId, current: WidgetConfig[]): WidgetConfig[] {
  const template = LAYOUT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return current;

  const allowed = new Set(template.widgetIds);
  return current.map((w) => ({
    ...w,
    isVisible: allowed.has(w.id),
  }));
}

interface BentoStore {
  widgets: WidgetConfig[];
  isEditMode: boolean;
  activeTemplate: TemplateId;
  toggleEditMode: () => void;
  toggleWidgetVisibility: (id: string) => void;
  reorderWidgets: (orderedIds: string[]) => void;
  updateWidgetSpan: (id: string, colSpan: number, rowSpan: number) => void;
  setTemplate: (id: TemplateId) => void;
  resetLayout: () => void;
}

export const useBentoStore = create<BentoStore>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,
      isEditMode: false,
      activeTemplate: 'focus',

      toggleEditMode: () =>
        set((s) => ({
          isEditMode: !s.isEditMode,
          activeTemplate: !s.isEditMode ? 'custom' : s.activeTemplate,
        })),

      toggleWidgetVisibility: (id) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, isVisible: !w.isVisible } : w,
          ),
          activeTemplate: 'custom',
        })),

      reorderWidgets: (orderedIds) =>
        set((s) => {
          const byId = Object.fromEntries(s.widgets.map((w) => [w.id, w]));
          const reordered = orderedIds
            .filter((id) => byId[id])
            .map((id, index) => ({ ...byId[id], order: index }));
          const untouched = s.widgets.filter((w) => !orderedIds.includes(w.id));
          return { widgets: [...reordered, ...untouched], activeTemplate: 'custom' };
        }),

      updateWidgetSpan: (id, colSpan, rowSpan) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, colSpan, rowSpan } : w,
          ),
          activeTemplate: 'custom',
        })),

      setTemplate: (id) => {
        set((s) => ({
          activeTemplate: id,
          isEditMode: false,
          widgets: widgetsForTemplate(id, s.widgets),
        }));
      },

      resetLayout: () =>
        set({ widgets: DEFAULT_WIDGETS, activeTemplate: 'focus', isEditMode: false }),
    }),
    { name: 'bento-layout-v6' },
  ),
);
