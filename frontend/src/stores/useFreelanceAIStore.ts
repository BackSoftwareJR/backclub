import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  actions?: AIAction[];
}

// ─── Action types the AI can execute ─────────────────────────────────────────

export type AIAction =
  | { type: 'navigate';     path: string;                        delay?: number }
  | { type: 'fill_active';  text: string;                        delay?: number }
  | { type: 'fill_element'; selector: string; text: string;      delay?: number }
  | { type: 'highlight';    selector: string;                    delay?: number }
  | { type: 'scroll_to';    selector: string;                    delay?: number }
  | { type: 'click';        selector: string;                    delay?: number }
  | { type: 'speak';        text: string;                        delay?: number };

// ─── Store ────────────────────────────────────────────────────────────────────

export interface FreelanceAIStore {
  isOpen: boolean;
  isMinimized: boolean;
  messages: AIMessage[];
  contextSnapshot: string;
  isLoading: boolean;
  // Draggable panel position (persisted)
  panelX: number;
  panelY: number;

  open: (contextSnapshot?: string) => void;
  close: () => void;
  minimize: () => void;
  restore: () => void;
  addMessage: (msg: Omit<AIMessage, 'id' | 'ts'>) => void;
  clearHistory: () => void;
  setLoading: (v: boolean) => void;
  setPanelPosition: (x: number, y: number) => void;
}

export const useFreelanceAIStore = create<FreelanceAIStore>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      messages: [],
      contextSnapshot: '',
      isLoading: false,
      panelX: -1, // -1 means use default position (bottom-right)
      panelY: -1,

      open: (contextSnapshot = '') =>
        set((s) => ({
          isOpen: true,
          isMinimized: false,
          contextSnapshot: contextSnapshot || s.contextSnapshot,
        })),

      close: () => set({ isOpen: false, isMinimized: false }),
      minimize: () => set({ isMinimized: true }),
      restore: () => set({ isMinimized: false }),

      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ts: Date.now() },
          ],
        })),

      clearHistory: () => set({ messages: [] }),
      setLoading: (v) => set({ isLoading: v }),
      setPanelPosition: (x, y) => set({ panelX: x, panelY: y }),
    }),
    {
      name: 'freelance-ai-assistant-v3',
      // Only persist position and messages; do not persist open state
      partialize: (s) => ({
        messages: s.messages.slice(-20),
        panelX: s.panelX,
        panelY: s.panelY,
      }),
    },
  ),
);
