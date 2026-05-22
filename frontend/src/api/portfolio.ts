import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';
const PORTFOLIO_TOKEN_KEY = 'portfolio_azienda_token';

export const getPortfolioToken = () => localStorage.getItem(PORTFOLIO_TOKEN_KEY);
export const setPortfolioToken = (token: string) => localStorage.setItem(PORTFOLIO_TOKEN_KEY, token);
export const clearPortfolioToken = () => localStorage.removeItem(PORTFOLIO_TOKEN_KEY);

const portfolioClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

portfolioClient.interceptors.request.use((config) => {
  const token = getPortfolioToken();
  if (token && config.headers) {
    config.headers['X-Portfolio-Token'] = token;
  }
  return config;
});

export interface PortfolioTransaction {
  id: number;
  type: 'invoice_settled' | 'expense' | 'withdrawal' | 'deposit';
  amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: number | null;
  transaction_date: string;
  created_at: string;
}

export interface PortfolioDashboard {
  balance: number;
  balance_history: Array<{
    month: string;
    label: string;
    balance: number;
    total_in: number;
    total_out: number;
  }>;
  totals_by_type: Record<string, number>;
}

export const portfolioApi = {
  async sendCode() {
    const { data } = await axios.post(`${API_URL}/portfolio/send-code`);
    return data;
  },

  async verifyCode(code: string) {
    const { data } = await portfolioClient.post('/portfolio/verify-code', { code });
    return data;
  },

  async getBalance() {
    const { data } = await portfolioClient.get('/portfolio/balance');
    return data;
  },

  async getDashboard() {
    const { data } = await portfolioClient.get('/portfolio/dashboard');
    return data;
  },

  async getTransactions(params?: { per_page?: number; page?: number }) {
    const { data } = await portfolioClient.get('/portfolio/transactions', { params });
    return data;
  },

  async addExpense(payload: { amount: number; description?: string; transaction_date: string }) {
    const { data } = await portfolioClient.post('/portfolio/expense', payload);
    return data;
  },

  async addWithdrawal(payload: { amount: number; description?: string; transaction_date: string }) {
    const { data } = await portfolioClient.post('/portfolio/withdrawal', payload);
    return data;
  },

  async addDeposit(payload: { amount: number; description?: string; transaction_date: string }) {
    const { data } = await portfolioClient.post('/portfolio/deposit', payload);
    return data;
  },
};
