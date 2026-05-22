import apiClient from './client';
import type {
  Seller,
  SellerFormData,
  ApiResponse,
} from '../types/sellers';

export interface AvailableUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  is_active: boolean;
}

export const sellersApi = {
  // Lista utenti disponibili (non venditori)
  async getAvailableUsers(search?: string, limit?: number): Promise<AvailableUser[]> {
    const response = await apiClient.get('/sellers/available-users', {
      params: { search, limit },
    });
    return response.data;
  },

  // Lista venditori
  async getAll(params?: {
    is_active?: boolean;
    expiring_contracts?: number;
    search?: string;
    with_stats?: boolean;
  }): Promise<Seller[]> {
    const response = await apiClient.get('/sellers', { params });
    return response.data;
  },

  // Dettaglio venditore
  async getById(id: number): Promise<Seller> {
    const response = await apiClient.get(`/sellers/${id}`);
    return response.data;
  },

  // Crea venditore
  async create(data: SellerFormData): Promise<Seller> {
    const response = await apiClient.post('/sellers', data);
    return response.data;
  },

  // Aggiorna venditore
  async update(id: number, data: Partial<SellerFormData>): Promise<Seller> {
    const response = await apiClient.put(`/sellers/${id}`, data);
    return response.data;
  },

  // Elimina venditore
  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/sellers/${id}`);
    return response.data;
  },

  // Upload contratto
  async uploadContract(id: number, file: File): Promise<ApiResponse<{ contract_file: string; contract_url: string }>> {
    const formData = new FormData();
    formData.append('contract', file);
    const response = await apiClient.post(`/sellers/${id}/contract`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Aggiorna settori assegnati
  async updateDepartments(
    id: number,
    departments: Array<{ id: number; is_active?: boolean; currently_working?: boolean }>
  ): Promise<any> {
    const response = await apiClient.put(`/sellers/${id}/departments`, { departments });
    return response.data;
  },

  // Aggiorna territorio
  async updateTerritory(id: number, territory: string[]): Promise<ApiResponse<{ territory: string[] }>> {
    const response = await apiClient.put(`/sellers/${id}/territory`, { territory });
    return response.data;
  },

  // Statistiche dashboard venditore
  async getSellerDashboardStats(sellerId: number, period: string = '30'): Promise<{
    pending_quotes: number;
    active_contracts: number;
    total_clients: number;
    leads_to_contact: number;
    total_revenue: number;
    current_month_revenue: number;
    revenue_change: number;
    quotes_change: number;
    contracts_change: number;
    conversion_rate: number;
    active_projects: number;
    new_clients_this_month: number;
    sales_trend: Array<{ date: string; revenue: number; count: number }>;
    urgent_leads: Array<{ id: number; company_name: string; contact_person: string; status: string; next_followup_date: string | null; priority: string }>;
    recent_quotes: Array<{ id: number; client_name: string; total_amount: number; status: string; created_at: string }>;
    recent_activities: Array<{ type: string; title: string; description: string; timestamp: string; time_ago: string; icon: string; amount?: number; status?: string }>;
  }> {
    const response = await apiClient.get(`/sellers/${sellerId}/dashboard/stats`, {
      params: { period },
    });
    return response.data.data;
  },

  // Statistiche overview (admin)
  async getOverviewStats(period: string = '30'): Promise<{
    total_revenue: number;
    active_contracts: number;
    pending_quotes: number;
    active_sellers: number;
    revenue_change: number;
    contracts_change: number;
    quotes_change: number;
    sales_trend: Array<{ date: string; revenue: number; count: number }>;
    sector_distribution: Array<{ department_id: number; department_name: string; department_code: string; count: number; total: number }>;
    recent_activities: Array<{ type: string; title: string; description: string; timestamp: string; time_ago: string; icon: string }>;
  }> {
    const response = await apiClient.get('/sellers/overview/stats', {
      params: { period },
    });
    return response.data.data;
  },
};

export default sellersApi;

