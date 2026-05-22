import apiClient from './client';

export interface PaymentPlan {
  id: number;
  contract_id?: number;
  quote_id?: number;
  project_id?: number;
  client_id: number;
  status: 'pending' | 'active' | 'suspended' | 'completed' | 'cancelled';
  total_amount: number;
  currency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  contract?: any;
  quote?: any;
  project?: any;
  client?: any;
  installments?: PaymentPlanInstallment[];
  renewals?: PaymentPlanRenewal[];
}

export interface PaymentPlanInstallment {
  id: number;
  payment_plan_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  discount_reason?: string;
  description?: string;
  invoice_id?: number;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
  payment_type: 'installment' | 'renewal' | 'reimbursement' | 'one_time';
  payment_schedule_type?: '30_40_30' | '30_60_days' | 'installments' | 'tantum' | 'custom';
  color_code?: string;
  created_at: string;
  updated_at: string;
  invoice?: any;
}

export interface PaymentPlanRenewal {
  id: number;
  payment_plan_id: number;
  renewal_type: 'fixed' | 'variable';
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' | 'one_time';
  start_date: string;
  end_date?: string;
  months_count: number;
  fixed_amount?: number;
  variable_amounts?: Array<{ amount: number; label: string }>;
  current_month_formula?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentPlanData {
  contract_id?: number;
  quote_id?: number;
  project_id?: number;
  client_id: number;
  total_amount: number;
  start_date: string;
  end_date?: string;
  installments: Array<{
    due_date: string;
    amount: number;
    description?: string;
    payment_type?: 'installment' | 'renewal' | 'reimbursement' | 'one_time';
    payment_schedule_type?: '30_40_30' | '30_60_days' | 'installments' | 'tantum' | 'custom';
  }>;
  renewals?: Array<{
    renewal_type: 'fixed' | 'variable';
    frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' | 'one_time';
    start_date: string;
    end_date?: string;
    months_count: number;
    fixed_amount?: number;
    variable_amounts?: Array<{ amount: number; label: string }>;
  }>;
  notes?: string;
}

export const paymentPlansApi = {
  // Lista piani
  async getAll(params?: {
    status?: string;
    client_id?: number;
    project_id?: number;
    contract_id?: number;
    per_page?: number;
    page?: number;
  }) {
    const response = await apiClient.get('/payment-plans', { params });
    return response.data;
  },

  // Piani in attesa
  async getPending() {
    const response = await apiClient.get('/payment-plans/pending');
    return response.data;
  },

  // Genera piano automaticamente da contratto
  async generateFromContract(contractId: number) {
    const response = await apiClient.post(`/payment-plans/generate-from-contract/${contractId}`);
    return response.data;
  },

  // Dettaglio piano
  async getById(id: number) {
    const response = await apiClient.get(`/payment-plans/${id}`);
    return response.data;
  },

  // Crea piano
  async create(data: CreatePaymentPlanData) {
    const response = await apiClient.post('/payment-plans', data);
    return response.data;
  },

  // Aggiorna piano
  async update(id: number, data: Partial<CreatePaymentPlanData>) {
    const response = await apiClient.put(`/payment-plans/${id}`, data);
    return response.data;
  },

  // Conferma piano
  async confirm(id: number) {
    const response = await apiClient.post(`/payment-plans/${id}/confirm`);
    return response.data;
  },

  // Sospendi piano
  async suspend(id: number) {
    const response = await apiClient.post(`/payment-plans/${id}/suspend`);
    return response.data;
  },

  // Annulla piano
  async cancel(id: number) {
    const response = await apiClient.post(`/payment-plans/${id}/cancel`);
    return response.data;
  },

  // Aggiorna rate
  async updateInstallments(id: number, installments: Array<{
    id?: number;
    due_date: string;
    amount: number;
    original_amount?: number;
    discount_amount?: number;
    discount_reason?: string;
    description?: string;
  }>) {
    const response = await apiClient.post(`/payment-plans/${id}/installments`, { installments });
    return response.data;
  },

  // Aggiungi rinnovo
  async addRenewal(id: number, renewal: {
    renewal_type: 'fixed' | 'variable';
    frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' | 'one_time';
    start_date: string;
    end_date?: string;
    months_count: number;
    fixed_amount?: number;
    variable_amounts?: Array<{ amount: number; label: string }>;
  }) {
    const response = await apiClient.post(`/payment-plans/${id}/renewals`, renewal);
    return response.data;
  },

  // Modifica rinnovo
  async updateRenewal(id: number, renewalId: number, renewal: Partial<PaymentPlanRenewal>) {
    const response = await apiClient.put(`/payment-plans/${id}/renewals/${renewalId}`, renewal);
    return response.data;
  },

  // Rimuovi rinnovo
  async deleteRenewal(id: number, renewalId: number) {
    const response = await apiClient.delete(`/payment-plans/${id}/renewals/${renewalId}`);
    return response.data;
  },
};

export default paymentPlansApi;

