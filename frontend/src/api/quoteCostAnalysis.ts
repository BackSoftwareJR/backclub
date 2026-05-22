import apiClient from './client';

export interface QuoteCostAnalysis {
  id: number;
  quote_id?: number;
  crm_project_id: number;
  quote_item_id?: number;
  description: string;
  cost_amount: number;
  is_auto_generated: boolean;
  work_description?: string;
  created_at: string;
  updated_at: string;
  quote?: {
    id: number;
    quote_number: string;
  };
  quoteItem?: {
    id: number;
    description: string;
    price_list_item?: {
      id: number;
      name: string;
    };
  };
}

export interface CostAnalysisStats {
  total_cost: number;
  auto_generated_cost: number;
  manual_cost: number;
  items_count: number;
}

export const quoteCostAnalysisApi = {
  // Lista analisi costi per progetto
  async getByProject(projectId: number): Promise<QuoteCostAnalysis[]> {
    const response = await apiClient.get(`/crm-projects/${projectId}/cost-analysis`);
    return response.data;
  },

  // Statistiche analisi costi
  async getStats(projectId: number): Promise<CostAnalysisStats> {
    const response = await apiClient.get(`/crm-projects/${projectId}/cost-analysis/stats`);
    return response.data;
  },

  // Crea voce analisi costi manuale
  async create(
    projectId: number,
    data: {
      quote_id?: number;
      quote_item_id?: number;
      description: string;
      cost_amount: number;
      work_description?: string;
    }
  ): Promise<QuoteCostAnalysis> {
    const response = await apiClient.post(`/crm-projects/${projectId}/cost-analysis`, data);
    return response.data;
  },

  // Modifica voce analisi costi
  async update(
    costId: number,
    data: Partial<{
      description: string;
      cost_amount: number;
      work_description: string;
    }>
  ): Promise<QuoteCostAnalysis> {
    const response = await apiClient.put(`/crm-projects/cost-analysis/${costId}`, data);
    return response.data;
  },

  // Elimina voce analisi costi
  async delete(costId: number): Promise<void> {
    await apiClient.delete(`/crm-projects/cost-analysis/${costId}`);
  },

  // Genera analisi costi da preventivo
  async generateFromQuote(quoteId: number): Promise<{
    message: string;
    generated: QuoteCostAnalysis[];
  }> {
    const response = await apiClient.post(`/quotes/${quoteId}/generate-cost-analysis`);
    return response.data;
  },
};

