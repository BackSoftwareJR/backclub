// User types
export interface User {
  id: number;
  nome?: string;
  name?: string;
  email: string;
  role: 'admin' | 'manager' | 'freelance' | 'freelancer' | 'client' | 'seller' | 'venditori' | 'developer' | 'segreteria' | 'project_manager' | 'project_master' | 'dipendente' | 'risorse_umane' | 'commercialista';
  current_role?: string;
  roles?: string[]; // Array of roles for multi-role support
  crm_departments?: Array<{
    id: number;
    code: string;
    name: string;
    color: string;
    icon: string;
  }>; // Array of CRM departments user has access to
  current_crm_department?: {
    id: number;
    code: string;
    name: string;
    color: string;
    icon: string;
  } | null; // Currently selected CRM department
  avatar?: string;
  phone?: string;
  is_active: boolean;
  email_verified_at?: string;
  has_consented?: boolean;
  consent_agreed_at?: string;
  seller_id?: number; // ID del venditore associato se l'utente è un venditore
  onboarding_completed?: boolean;
  preferred_language?: string;
  preferred_theme?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  roles?: string[];
  requires_role_selection?: boolean;
}
