import apiClient from './client';
import type {
  Lead,
  LeadFormData,
  LeadActivity,
  LeadActivityFormData,
  PaginatedResponse,
  ApiResponse,
} from '../types/sellers';

export const leadsApi = {
  // Lista leads con paginazione
  async getAll(params?: {
    seller_id?: number | 'unassigned';
    department_id?: number;
    status?: string;
    priority?: string;
    needs_followup?: boolean;
    new_only?: boolean;
    converted?: boolean;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Lead>> {
    const response = await apiClient.get('/leads', { params });
    return response.data;
  },

  // Dettaglio lead
  async getById(id: number): Promise<Lead> {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data;
  },

  // Crea lead
  async create(data: LeadFormData): Promise<Lead> {
    const response = await apiClient.post('/leads', data);
    return response.data;
  },

  // Aggiorna lead
  async update(id: number, data: Partial<LeadFormData>): Promise<Lead> {
    const response = await apiClient.put(`/leads/${id}`, data);
    return response.data;
  },

  // Elimina lead
  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/leads/${id}`);
    return response.data;
  },

  // Assegna a venditore
  async assign(id: number, sellerId: number): Promise<ApiResponse<Lead>> {
    const response = await apiClient.put(`/leads/${id}/assign`, { seller_id: sellerId });
    return response.data;
  },

  // Converti in cliente
  async convertToClient(id: number, copyData: boolean = true): Promise<ApiResponse<{ lead: Lead; client: any }>> {
    const response = await apiClient.post(`/leads/${id}/convert`, { copy_data: copyData });
    return response.data;
  },

  // Aggiungi attività
  async addActivity(id: number, data: LeadActivityFormData): Promise<ApiResponse<LeadActivity>> {
    const response = await apiClient.post(`/leads/${id}/activities`, data);
    return response.data;
  },

  // Ottieni timeline attività
  async getActivities(id: number): Promise<LeadActivity[]> {
    const response = await apiClient.get(`/leads/${id}/activities`);
    return response.data;
  },

  // Importa CSV
  async importCsv(file: File, region: string, sellerId: number): Promise<ApiResponse<{ imported: number; errors: string[]; total_errors: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('region', region);
    formData.append('seller_id', sellerId.toString());
    
    // Debug: verifica che i dati siano nel FormData
    console.log('FormData contents:', {
      hasFile: formData.has('file'),
      hasRegion: formData.has('region'),
      hasSellerId: formData.has('seller_id'),
      region,
      sellerId,
    });
    
    const response = await apiClient.post('/leads/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Prepara dati per preventivo
  async prepareForQuote(id: number): Promise<ApiResponse<{ quote_data: any; lead: Lead }>> {
    const response = await apiClient.get(`/leads/${id}/prepare-quote`);
    return response.data;
  },

  // Genera PDF scheda contatto
  async generatePDF(id: number): Promise<any> {
    const response = await apiClient.get(`/leads/${id}/pdf`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf, text/html, */*',
      },
    });
    return response;
  },

  // Invia email a contatto
  async sendEmail(id: number, data: {
    to: string;
    subject: string;
    body: string;
    attachments?: File[];
  }): Promise<{ success: boolean; message?: string; error?: string; error_details?: string; data?: any }> {
    const formData = new FormData();
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('body', data.body);
    
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await apiClient.post(`/leads/${id}/send-email`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default leadsApi;

