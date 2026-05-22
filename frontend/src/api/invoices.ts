import apiClient from './client';

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  project_id?: number;
  payment_plan_id?: number;
  installment_number?: number;
  issue_date: string;
  due_date: string;
  amount_cocchi: number;
  tax_cocchi: number;
  total_cocchi: number;
  bollo_amount: number;
  amount_before_bollo?: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  type: 'invoice' | 'credit_note';
  credit_note_for_invoice_id?: number;
  invoice_link?: string;
  receipt_link?: string;
  notes?: string;
  document_path?: string;
  created_by: number;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  client?: any;
  project?: any;
  payment_plan?: any;
  reserve_allocations?: InvoiceReserveAllocation[];
  bollo_transaction?: InvoiceBolloTransaction;
  credit_notes?: Invoice[];
  credit_note_for?: Invoice;
}

export interface InvoiceReserveAllocation {
  id: number;
  invoice_id: number;
  serbatoio_id: number;
  amount: number;
  percentage?: number;
  notes?: string;
  serbatoio?: any;
}

export interface InvoiceBolloTransaction {
  id: number;
  invoice_id: number;
  serbatoio_id: number;
  amount: number;
  transaction_date: string;
}

export interface InvoiceToIssue {
  installment_id: number;
  payment_plan_id: number;
  client: any;
  project?: any;
  contract?: any;
  quote?: any;
  due_date: string;
  amount: number;
  description?: string;
  payment_type: string;
  payment_schedule_type?: string;
}

export interface CalendarEvent {
  id: number;
  date: string;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  discount_reason?: string;
  description?: string;
  status: string;
  payment_type: string;
  payment_schedule_type?: string;
  color_code?: string;
  client: any;
  project?: any;
  contract?: any;
  payment_plan_id: number;
  invoice_id?: number;
}

export interface IssueInvoiceData {
  installment_id: number;
  invoice_number: string;
  issue_date: string;
  invoice_link?: string;
  amount: number;
  reserve_allocations: Array<{
    serbatoio_id: number;
    amount: number;
    percentage?: number;
    notes?: string;
  }>;
}

export interface SettleInvoiceData {
  receipt_link: string;
  paid_at: string;
}

export interface CreditNoteData {
  invoice_link: string;
  issue_date: string;
  amount: number;
  reason: string;
}

export interface CreateInvoiceData {
  client_id: number;
  project_id?: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount: number;
  invoice_link?: string;
  notes?: string;
  reserve_allocations?: Array<{
    serbatoio_id: number;
    amount: number;
    percentage?: number;
    notes?: string;
  }>;
}

export const invoicesApi = {
  // Lista fatture
  async getAll(params?: {
    status?: string;
    type?: string;
    client_id?: number;
    month?: number;
    year?: number;
    search?: string;
    per_page?: number;
    page?: number;
  }) {
    const response = await apiClient.get('/invoices', { params });
    return response.data;
  },

  // Fatture da emettere
  async getToIssue(params?: { month?: number; year?: number }) {
    const response = await apiClient.get('/invoices/to-issue', { params });
    return response.data;
  },

  // Fatture da saldare
  async getToSettle(params?: { month?: number; year?: number }) {
    const response = await apiClient.get('/invoices/to-settle', { params });
    return response.data;
  },

  // Calendario rate
  async getCalendar(params?: {
    start_date?: string;
    end_date?: string;
    client_id?: number;
    payment_plan_id?: number;
    payment_type?: string;
  }) {
    const response = await apiClient.get('/invoices/calendar', { params });
    return response.data;
  },

  // Ultimo numero fattura
  async getLastNumber(year?: number) {
    const response = await apiClient.get('/invoices/last-number', { params: { year } });
    return response.data;
  },

  // KPI fatture (da incassare, incassate, ecc.)
  async getStats() {
    const response = await apiClient.get('/invoices/stats');
    return response.data;
  },

  // Emetti fattura
  async issue(data: IssueInvoiceData) {
    const response = await apiClient.post('/invoices/issue', data);
    return response.data;
  },

  // Salda fattura
  async settle(id: number, data: SettleInvoiceData) {
    const response = await apiClient.post(`/invoices/${id}/settle`, data);
    return response.data;
  },

  // Emetti nota di credito
  async creditNote(id: number, data: CreditNoteData) {
    const response = await apiClient.post(`/invoices/${id}/credit-note`, data);
    return response.data;
  },

  // Dettaglio fattura
  async getById(id: number) {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },

  // Crea fattura (al volo, cliente/progetto)
  async create(data: CreateInvoiceData) {
    const response = await apiClient.post('/invoices', data);
    return response.data;
  },

  // Aggiorna fattura
  async update(id: number, data: Partial<Invoice> | { invoice_number?: string; issue_date?: string; due_date?: string; amount?: number; invoice_link?: string; notes?: string }) {
    const response = await apiClient.put(`/invoices/${id}`, data);
    return response.data;
  },

  // Elimina fattura
  async delete(id: number) {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  },
};

export default invoicesApi;

