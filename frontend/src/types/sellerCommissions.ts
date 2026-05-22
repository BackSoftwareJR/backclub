export interface SellerCommission {
  id: number;
  seller_id: number;
  contract_id: number;
  payment_plan_id: number;
  invoice_id?: number;
  installment_id?: number;
  amount: number;
  commission_rate: number;
  status: 'pending' | 'pending_collection' | 'collected';
  invoice_issued_at?: string;
  invoice_paid_at?: string;
  collected_at?: string;
  receipt_link?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  seller?: {
    id: number;
    user_id: number;
    commission_rate: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
  contract?: {
    id: number;
    contract_number: string;
    title?: string;
    client?: {
      id: number;
      company_name: string;
    };
    project?: {
      id: number;
      name: string;
    };
  };
  payment_plan?: {
    id: number;
    total_amount: number;
    status: string;
  };
  invoice?: {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    total_cocchi: number;
    status: string;
    paid_at?: string;
  };
  installment?: {
    id: number;
    installment_number: number;
    amount: number;
    due_date: string;
    status: string;
    description?: string;
  };
}

export interface SellerCommissionContract {
  contract: {
    id: number;
    contract_number: string;
    title?: string;
    status: string;
    client?: {
      id: number;
      company_name: string;
    };
    payment_plans?: Array<{
      id: number;
      status: string;
      installments?: Array<{
        id: number;
        amount: number;
        due_date: string;
        status: string;
      }>;
    }>;
  };
  total_paid: number;
  total_remaining: number;
  total_commissions: number;
  total_pending: number;
  total_pending_collection: number;
  total_collected: number;
  total_expected_commissions?: number; // Commissioni previste per questo contratto
  paid_installments_count?: number; // Numero rate pagate
  total_installments_count?: number; // Numero totale rate
  commissions_count: number;
}

export interface SellerCommissionDetail {
  contract: {
    id: number;
    contract_number: string;
    title?: string;
    client?: {
      id: number;
      company_name: string;
    };
    project?: {
      id: number;
      name: string;
    };
  };
  payment_plan?: {
    id: number;
    total_amount: number;
    status: string;
    installments?: Array<{
      id: number;
      installment_number: number;
      amount: number;
      due_date: string;
      status: string;
      description?: string;
    }>;
  };
  commissions: SellerCommission[];
  timeline: Array<{
    installment: {
      id: number;
      installment_number: number;
      amount: number;
      due_date: string;
      status: string;
      description?: string;
    };
    commission?: SellerCommission;
    invoice?: {
      id: number;
      invoice_number: string;
      issue_date: string;
      due_date: string;
      total_cocchi: number;
      status: string;
      paid_at?: string;
    };
    expected_commission?: number; // Commissione prevista calcolata
    commission_rate?: number; // Percentuale commissione per riferimento
  }>;
}

export interface SellerCommissionSummary {
  seller: {
    id: number;
    user_id: number;
    commission_rate: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
  total_count: number;
  total_amount: number;
  pending_amount: number;
  pending_collection_amount: number;
  collected_amount: number;
}
