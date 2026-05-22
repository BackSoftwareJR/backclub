import apiClient from './client';

export interface CreateTicketPayload {
  recipient_type: 'admin' | 'tecnico';
  message: string;
  subject?: string;
}

export interface SupportTicket {
  id: number;
  seller_id: number;
  seller_name?: string;
  seller_email?: string;
  recipient_type: 'admin' | 'tecnico';
  subject: string | null;
  message: string;
  category: string | null;
  status: 'aperto' | 'in_lavorazione' | 'risolto' | 'chiuso';
  priority: 'bassa' | 'media' | 'alta' | 'urgente';
  assigned_to: number | null;
  assigned_to_name?: string;
  response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

export const supportTicketsApi = {
  /** Seller: create a new ticket */
  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const response = await apiClient.post<SupportTicket>('/seller/support-tickets', payload);
    return response.data;
  },

  /** Seller: list my tickets */
  getMyTickets: async (): Promise<SupportTicket[]> => {
    const response = await apiClient.get<SupportTicket[]>('/seller/support-tickets');
    return response.data;
  },

  /** Seller: get single ticket (own only) */
  getMyTicket: async (id: number): Promise<SupportTicket> => {
    const response = await apiClient.get<SupportTicket>(`/seller/support-tickets/${id}`);
    return response.data;
  },

  /** Admin: list all tickets (with optional filters) */
  getAllTickets: async (params?: {
    status?: string;
    category?: string;
    recipient_type?: string;
    priority?: string;
    search?: string;
  }): Promise<SupportTicket[]> => {
    const response = await apiClient.get<SupportTicket[]>('/support-tickets', { params });
    return response.data;
  },

  /** Admin: get single ticket */
  getTicket: async (id: number): Promise<SupportTicket> => {
    const response = await apiClient.get<SupportTicket>(`/support-tickets/${id}`);
    return response.data;
  },

  /** Admin: update ticket (status, priority, assigned_to, response) */
  updateTicket: async (
    id: number,
    data: Partial<Pick<SupportTicket, 'status' | 'priority' | 'assigned_to' | 'response'>>
  ): Promise<SupportTicket> => {
    const response = await apiClient.put<SupportTicket>(`/support-tickets/${id}`, data);
    return response.data;
  },
};
