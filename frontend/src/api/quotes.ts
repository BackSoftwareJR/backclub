import apiClient from './client';
import type {
  Quote,
  QuoteFormData,
  PaginatedResponse,
  ApiResponse,
} from '../types/sellers';

export const quotesApi = {
  // Lista preventivi con paginazione
  async getAll(params?: {
    client_id?: number;
    seller_id?: number;
    department_id?: number;
    status?: string;
    expiring_soon?: boolean;
    expiring_days?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Quote>> {
    const response = await apiClient.get('/quotes', { params });
    return response.data;
  },

  // Dettaglio preventivo
  async getById(id: number): Promise<Quote> {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },

  // Crea preventivo
  async create(data: QuoteFormData): Promise<Quote> {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },

  // Aggiorna preventivo
  async update(id: number, data: Partial<QuoteFormData>): Promise<Quote> {
    const response = await apiClient.put(`/quotes/${id}`, data);
    return response.data;
  },

  // Elimina preventivo
  async delete(id: number, forceDeleteWithContract: boolean = false): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/quotes/${id}`, {
      params: forceDeleteWithContract ? { force_delete_with_contract: true } : {}
    });
    return response.data;
  },

  // Cambia stato
  async updateStatus(id: number, status: string): Promise<ApiResponse<Quote>> {
    const response = await apiClient.put(`/quotes/${id}/status`, { status });
    return response.data;
  },

  // Genera PDF
  async generatePDF(id: number): Promise<any> {
    const response = await apiClient.get(`/quotes/${id}/pdf`, {
      responseType: 'blob', // Importante: ricevi il PDF come blob
      headers: {
        'Accept': 'application/pdf, text/html, */*', // Accetta sia PDF che HTML
      },
    });
    return response;
  },

  // Duplica preventivo
  async duplicate(id: number): Promise<Quote> {
    const response = await apiClient.post(`/quotes/${id}/duplicate`);
    return response.data;
  },

  // Richiedi contratto da preventivo
  async requestContract(id: number): Promise<ApiResponse<{ contract: any }>> {
    const response = await apiClient.post(`/quotes/${id}/request-contract`);
    return response.data;
  },

  // Rifiuta preventivo
  async reject(id: number): Promise<ApiResponse<Quote>> {
    const response = await apiClient.post(`/quotes/${id}/reject`);
    return response.data;
  },

  // Invia preventivo via email
  async sendEmail(id: number, email: string, clientName?: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post(`/quotes/${id}/send-email`, { 
      email,
      client_name: clientName 
    });
    return response.data;
  },
};

export default quotesApi;

