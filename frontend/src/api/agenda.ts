import apiClient from './client';

export type AgendaItemType = 'memo' | 'reminder' | 'checklist' | 'event';
export type AgendaItemStatus = 'active' | 'completed' | 'cancelled';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AgendaItem {
  id: number;
  user_id: number;
  type: AgendaItemType;
  title?: string;
  content?: string;
  date?: string;
  time?: string;
  reminder_datetime?: string;
  all_day: boolean;
  end_datetime?: string;
  checklist_items?: ChecklistItem[];
  location?: string;
  participants?: number[];
  description?: string;
  status: AgendaItemStatus;
  is_pinned: boolean;
  color?: string;
  priority: number; // 0=normale, 1=alta, 2=urgente
  tags?: string[];
  notes?: string;
  related_client_id?: number;
  related_project_id?: number;
  related_invoice_id?: number;
  created_at: string;
  updated_at: string;
  related_client?: any;
  related_project?: any;
  related_invoice?: any;
}

export interface CreateAgendaItemData {
  type: AgendaItemType;
  title?: string;
  content?: string;
  date?: string;
  time?: string;
  reminder_datetime?: string;
  all_day?: boolean;
  end_datetime?: string;
  checklist_items?: ChecklistItem[];
  location?: string;
  participants?: number[];
  description?: string;
  is_pinned?: boolean;
  color?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
  related_client_id?: number;
  related_project_id?: number;
  related_invoice_id?: number;
}

export const agendaApi = {
  // Lista elementi agenda
  async getAll(params?: {
    type?: AgendaItemType;
    status?: AgendaItemStatus;
    date?: string;
    date_from?: string;
    date_to?: string;
    pinned_only?: boolean;
    upcoming_only?: boolean;
    include_memos_without_date?: boolean;
  }) {
    const response = await apiClient.get('/agenda', { params });
    return response.data;
  },

  // Dettaglio elemento
  async getById(id: number) {
    const response = await apiClient.get(`/agenda/${id}`);
    return response.data;
  },

  // Crea elemento
  async create(data: CreateAgendaItemData) {
    const response = await apiClient.post('/agenda', data);
    return response.data;
  },

  // Aggiorna elemento
  async update(id: number, data: Partial<CreateAgendaItemData>) {
    const response = await apiClient.put(`/agenda/${id}`, data);
    return response.data;
  },

  // Elimina elemento
  async delete(id: number) {
    const response = await apiClient.delete(`/agenda/${id}`);
    return response.data;
  },

  // Toggle pin
  async togglePin(id: number) {
    const response = await apiClient.post(`/agenda/${id}/toggle-pin`);
    return response.data;
  },

  // Segna come completato
  async complete(id: number) {
    const response = await apiClient.post(`/agenda/${id}/complete`);
    return response.data;
  },

  // Aggiorna item checklist
  async updateChecklistItem(id: number, itemId: string, data: {
    text?: string;
    completed?: boolean;
  }) {
    const response = await apiClient.post(`/agenda/${id}/checklist-item`, {
      item_id: itemId,
      ...data,
    });
    return response.data;
  },
};

export default agendaApi;

