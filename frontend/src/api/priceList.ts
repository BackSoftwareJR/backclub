import apiClient from './client';
import type {
  PriceListItem,
  PriceListFormData,
  PaginatedResponse,
  ApiResponse,
} from '../types/sellers';

export const priceListApi = {
  // Lista listino con paginazione
  async getAll(params?: {
    department_id?: number;
    is_active?: boolean;
    price_type?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<PriceListItem>> {
    const response = await apiClient.get('/price-list', { params });
    return response.data;
  },

  // Dettaglio item
  async getById(id: number): Promise<PriceListItem> {
    const response = await apiClient.get(`/price-list/${id}`);
    return response.data;
  },

  // Items per settore
  async getByDepartment(departmentId: number): Promise<PriceListItem[]> {
    const response = await apiClient.get(`/price-list/department/${departmentId}`);
    return response.data;
  },

  // Crea item
  async create(data: PriceListFormData): Promise<PriceListItem> {
    const response = await apiClient.post('/price-list', data);
    return response.data;
  },

  // Aggiorna item
  async update(id: number, data: Partial<PriceListFormData>): Promise<PriceListItem> {
    const response = await apiClient.put(`/price-list/${id}`, data);
    return response.data;
  },

  // Elimina item
  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/price-list/${id}`);
    return response.data;
  },

  // Upload documento informativo PDF
  async uploadInformativeDocument(id: number, file: File): Promise<{ informative_document_path: string; informative_document_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/price-list/${id}/informative-document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download documento informativo PDF
  async downloadInformativeDocument(id: number): Promise<Blob> {
    const response = await apiClient.get(`/price-list/${id}/informative-document/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Preview HTML della pagina di preventivo per un item di listino
  async getQuotePreviewHtml(payload: {
    id?: number;
    name: string;
    description?: string;
    operational_notes?: string;
    features?: string[];
  }): Promise<string> {
    const response = await apiClient.post('/price-list/quote-preview', payload, {
      responseType: 'text',
    });
    return response.data;
  },

  // Preview PDF (blob) del preventivo per un item di listino
  async getQuotePreviewPdf(payload: {
    id?: number;
    name: string;
    description?: string;
    operational_notes?: string;
    features?: string[];
    base_price?: number;
    margin_percentage?: number;
  }): Promise<Blob> {
    const response = await apiClient.post('/price-list/quote-preview-pdf', payload, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default priceListApi;

