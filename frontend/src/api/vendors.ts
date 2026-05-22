import apiClient from './client';

export interface Vendor {
  id: number;
  name: string;
  business_name?: string;
  vat_number?: string;
  tax_code?: string;
  sdi_code?: string;
  pec?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  iban?: string;
  swift?: string;
  bank_name?: string;
  contact_person?: string;
  contact_role?: string;
  contact_email?: string;
  contact_phone?: string;
  payment_terms_days?: number;
  payment_method_preferred?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export const vendorsApi = {
  getAll: async (params?: { is_active?: boolean; q?: string }): Promise<Vendor[]> => {
    const response = await apiClient.get('/vendors', { params });
    return response.data.data || response.data;
  },

  getById: async (id: number): Promise<Vendor> => {
    const response = await apiClient.get(`/vendors/${id}`);
    return response.data.data || response.data;
  },

  create: async (data: Partial<Vendor>): Promise<Vendor> => {
    const response = await apiClient.post('/vendors', data);
    return response.data.data || response.data;
  },

  update: async (id: number, data: Partial<Vendor>): Promise<Vendor> => {
    const response = await apiClient.put(`/vendors/${id}`, data);
    return response.data.data || response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/vendors/${id}`);
  },
};

export default vendorsApi;

