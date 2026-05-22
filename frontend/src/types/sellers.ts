// Types per Sistema Gestionale Venditori

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

export interface CrmDepartment {
  id: number;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  budget_allocated: number;
  budget_spent: number;
  is_active: boolean;
}

export interface SellerDepartment {
  id: number;
  crm_department_id: number;
  is_active: boolean;
  currently_working: boolean;
  department?: CrmDepartment;
}

export interface Seller {
  id: number;
  user_id: number;
  contract_file?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  territory?: string[];
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  departments?: CrmDepartment[];
  seller_departments?: SellerDepartment[];
  statistics?: {
    total_contracts_value: number;
    pending_quotes_value: number;
    active_projects_count: number;
    leads_by_status: Record<string, number>;
    contract_days_remaining?: number;
    is_contract_expired: boolean;
  };
  clients_count?: number;
  quotes_count?: number;
  contracts_count?: number;
  leads_count?: number;
  projects_count?: number;
}

export interface PriceListItem {
  id: number;
  crm_department_id?: number;
  name: string;
  description?: string;
  operational_notes?: string;
  landing_page_url?: string;
  technical_sheet_url?: string;
  informative_document_path?: string;
  base_price: number;
  price_type: 'fisso' | 'variabile' | 'personalizzato';
  payment_options?: PaymentOption[];
  min_installment_amount?: number;
  max_installments?: number;
  margin_percentage?: number;
  features?: string[];
  renewal_options?: RenewalOption[];
  renewal_type?: 'obbligatorio' | 'facoltativo' | 'multi';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: CrmDepartment;
}

export interface PaymentOption {
  type: string;
  label: string;
  installments?: number;
  percentages?: number[];
  days?: number;
}

export interface RenewalOption {
  id?: string;
  duration: string; // 'monthly', 'quarterly', 'semiannual', 'annual', 'custom'
  duration_months?: number; // per custom
  price: number;
  description?: string;
  includes?: string[]; // cosa comprende il rinnovo
  is_active?: boolean;
}

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  price_list_item_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  payment_option?: PaymentOption;
  renewal_option?: RenewalOption; // Opzione di rinnovo selezionata (singolo)
  renewal_options?: RenewalOption[]; // Array di opzioni di rinnovo (multi-rinnovo)
  selected_features?: string[]; // Caratteristiche selezionate per questo item
  notes?: string;
  price_list_item?: PriceListItem;
}

export interface Quote {
  id: number;
  quote_number: string;
  client_id?: number;
  seller_id?: number;
  crm_department_id?: number;
  status: 'pending' | 'approved' | 'rejected' | 'started' | 'completed' | 'contract_requested';
  title: string;
  description?: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  valid_until?: string;
  pdf_path?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  client?: any;
  seller?: Seller;
  department?: CrmDepartment;
  creator?: User;
  items?: QuoteItem[];
  contract?: Contract;
  payment_schedule?: Array<{
    date: string;
    amount: number;
    commission: number;
    description: string;
    service_name?: string;
  }>;
}

export interface ContractRevision {
  id: number;
  contract_id: number;
  revision_number: number;
  contract_file: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  creator?: User;
}

export interface ContractSignedDocument {
  id: number;
  contract_id: number;
  document_type: 'privacy_policy' | 'consent_personal_data' | 'other';
  document_name: string;
  file_path?: string;
  external_url?: string;
  signed_at?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  creator?: User;
}

export interface Contract {
  id: number;
  contract_number: string;
  quote_id?: number;
  client_id: number;
  seller_id?: number;
  crm_project_id?: number;
  status: 'draft' | 'requested' | 'pending_signature' | 'active' | 'suspended' | 'completed' | 'terminated';
  title: string;
  description?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  payment_terms?: string;
  contract_file?: string;
  signed_file?: string;
  signed_at?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  quote?: Quote;
  client?: any;
  seller?: Seller;
  project?: any;
  creator?: User;
  revisions?: ContractRevision[];
  signedDocuments?: ContractSignedDocument[];
  statistics?: {
    days_remaining?: number;
    is_signed: boolean;
    is_active: boolean;
  };
}

export interface PhoneContact {
  number: string;
  label?: string;
  isPrimary: boolean;
}

export interface EmailContact {
  email: string;
  label?: string;
  isPrimary: boolean;
}

export interface Lead {
  id: number;
  assigned_seller_id?: number;
  company_name: string;
  tipologia?: string;
  contact_person?: string;
  address?: string;
  region?: string;
  phones?: PhoneContact[];
  emails?: EmailContact[];
  crm_department_id?: number;
  websites?: string[];
  description?: string;
  digital_status?: string;
  pitch_strategy?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_value?: number;
  expected_close_date?: string;
  source?: string;
  last_contact_date?: string;
  next_followup_date?: string;
  notes?: string;
  converted_to_client_id?: number;
  created_by?: number;
  referral_user_id?: number;
  created_at: string;
  updated_at: string;
  seller?: Seller;
  department?: CrmDepartment;
  converted_client?: any;
  creator?: User;
  referral_user?: User;
  activities?: LeadActivity[];
  activities_count?: number;
  statistics?: {
    is_converted: boolean;
    needs_followup: boolean;
    primary_phone?: string;
    primary_email?: string;
  };
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  user_id: number;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'status_change';
  description?: string;
  outcome?: string;
  email_details?: {
    to: string;
    to_name?: string;
    from: string;
    from_name?: string;
    subject: string;
    body: string;
    html_body?: string;
    attachments?: string[];
    sent_at: string;
  };
  created_at: string;
  user?: User;
}

// Form data types
export interface SellerFormData {
  user_id?: number; // Se fornito, usa utente esistente
  name: string;
  email: string;
  password?: string;
  phone?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  territory?: string[];
  commission_rate?: number;
  departments?: number[];
}

export interface PriceListFormData {
  crm_department_id?: number;
  name: string;
  description?: string;
  operational_notes?: string;
  landing_page_url?: string;
  technical_sheet_url?: string;
  base_price: number;
  price_type: 'fisso' | 'variabile' | 'personalizzato';
  payment_options?: PaymentOption[];
  min_installment_amount?: number;
  max_installments?: number;
  margin_percentage?: number;
  features?: string[];
  renewal_options?: RenewalOption[];
  renewal_type?: 'obbligatorio' | 'facoltativo' | 'multi';
  is_active?: boolean;
}

export interface QuoteFormData {
  client_id: number;
  seller_id?: number;
  crm_department_id?: number;
  title: string;
  description?: string;
  discount_percentage?: number;
  discount_amount?: number;
  tax_percentage?: number;
  notes?: string;
  valid_until?: string;
  status?: string;
  items: QuoteItem[];
}

export interface ContractFormData {
  quote_id?: number;
  client_id: number;
  seller_id?: number;
  crm_project_id?: number;
  title: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  payment_terms?: string;
  notes?: string;
  status?: string;
}

export interface LeadFormData {
  assigned_seller_id?: number;
  company_name: string;
  contact_person?: string;
  phones?: PhoneContact[];
  emails?: EmailContact[];
  crm_department_id?: number;
  websites?: string[];
  description?: string;
  status?: string;
  priority?: string;
  estimated_value?: number;
  expected_close_date?: string;
  source?: string;
  last_contact_date?: string;
  next_followup_date?: string;
  notes?: string;
}

export interface LeadActivityFormData {
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'status_change';
  description: string;
  outcome?: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

