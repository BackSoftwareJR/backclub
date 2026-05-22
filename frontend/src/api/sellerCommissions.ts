import apiClient from './client';
import type {
  SellerCommission,
  SellerCommissionContract,
  SellerCommissionDetail,
  SellerCommissionSummary,
} from '../types/sellerCommissions';
import type { PaginatedResponse, ApiResponse } from '../types/sellers';

export const sellerCommissionsApi = {
  // Lista commissioni venditore (filtrate per seller_id dell'utente autenticato)
  async getAll(params?: {
    status?: 'pending' | 'pending_collection' | 'collected';
    contract_id?: number;
    payment_plan_id?: number;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<SellerCommission>> {
    const response = await apiClient.get('/seller-commissions', { params });
    return response.data;
  },

  // Dettaglio commissione
  async getById(id: number): Promise<ApiResponse<SellerCommission>> {
    const response = await apiClient.get(`/seller-commissions/${id}`);
    return response.data;
  },

  // Lista contratti attivi con riepilogo commissioni
  async getContracts(): Promise<ApiResponse<{
    data: SellerCommissionContract[];
    summary: {
      commission_rate: number;
      total_pending: number;
      total_pending_collection: number;
      total_collected: number;
    };
  }>> {
    const response = await apiClient.get('/seller-commissions/contracts');
    // La risposta ha struttura: { success: true, data: { data: [...], summary: {...} } }
    // Quindi response.data è { data: [...], summary: {...} }
    return response.data;
  },

  // Dettaglio commissioni per contratto
  async getByContract(contractId: number): Promise<ApiResponse<SellerCommissionDetail>> {
    const response = await apiClient.get(`/seller-commissions/contract/${contractId}`);
    return response.data;
  },

  // ===== ENDPOINT SEGRETERIA =====

  // Lista tutte le commissioni (per segreteria)
  async getAllForSecreteria(params?: {
    seller_id?: number;
    status?: 'pending' | 'pending_collection' | 'collected';
    contract_id?: number;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<SellerCommission>> {
    const response = await apiClient.get('/seller-commissions/all/list', { params });
    return response.data;
  },

  // Riepilogo commissioni per venditore (per segreteria)
  async getSellersSummary(params?: {
    status?: 'pending' | 'pending_collection' | 'collected';
  }): Promise<ApiResponse<SellerCommissionSummary[]>> {
    const response = await apiClient.get('/seller-commissions/sellers/summary', { params });
    return response.data;
  },

  // Salda commissione (per segreteria)
  async collectCommission(
    id: number,
    data: {
      receipt_link: string;
      collected_at: string;
      notes?: string;
    }
  ): Promise<ApiResponse<SellerCommission>> {
    const response = await apiClient.post(`/seller-commissions/${id}/collect`, data);
    return response.data;
  },
};
