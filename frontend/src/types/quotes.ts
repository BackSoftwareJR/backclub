// Types per Wizard Preventivi

import type { PriceListItem, PaymentOption, RenewalOption } from './sellers';

export interface PaymentScheduleItem {
  date: string; // Data di pagamento
  amount: number; // Importo da incassare
  commission: number; // Provvigione su questo pagamento
  description: string; // Descrizione (es: "Rata 1/3", "Acconto 30%", etc.)
}

export interface QuestionAnswer {
  question_id: number;
  answer_id?: number; // Per multiple choice
  text_answer?: string; // Per domande testo
  number_answer?: number; // Per domande numero
}

export interface SelectedService {
  price_list_item_id: number;
  price_list_item: PriceListItem;
  quantity: number;
  unit_price: number;
  discount: number;
  payment_option?: PaymentOption;
  selected_renewal?: RenewalOption; // Rinnovo singolo (obbligatorio/facoltativo)
  selected_renewals?: RenewalOption[]; // Multi-rinnovo (array)
  selected_features?: string[];
  margin_adjustment?: number; // percentuale di aggiustamento margine (+ o -)
  total: number;
  payment_schedule?: PaymentScheduleItem[]; // Date e importi pagamento
  question_answers?: QuestionAnswer[]; // Risposte alle domande del servizio
  price_adjustments?: number; // Totale aggiustamenti prezzo da domande
}

export interface AdditionalItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface ClientInfo {
  company_name: string;
  email: string;
  phone?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  country?: string;
}

export interface QuoteWizardData {
  selectedServices: SelectedService[];
  additionalItems: AdditionalItem[];
  client_id?: number;
  client_info: ClientInfo;
  seller_id?: number;
  title: string;
  description?: string;
  notes?: string;
  discount_percentage: number;
  tax_percentage: number;
  valid_until?: string;
}

export interface PaymentSchedule {
  date: string;
  amount: number;
  commission: number;
  description: string;
  service_name?: string;
}

export interface QuoteCalculation {
  services_subtotal: number;
  additional_items_subtotal: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  seller_commission: number; // Provvigione totale calcolata su tutti gli incassi
  seller_commission_percentage: number;
  available_margin: number;
  used_margin: number;
  payment_schedule: PaymentSchedule[]; // Timeline pagamenti e provvigioni
  total_renewals: number; // Totale rinnovi annuali (singoli + multi)
}

