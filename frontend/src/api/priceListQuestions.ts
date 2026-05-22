import apiClient from './client';

export interface PriceListItemQuestion {
  id: number;
  price_list_item_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'text' | 'number';
  is_required: boolean;
  order: number;
  answers?: QuestionAnswer[];
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswer {
  id: number;
  question_id: number;
  answer_text: string;
  order: number;
  conditions?: AnswerCondition[];
  created_at: string;
  updated_at: string;
}

export interface AnswerCondition {
  id: number;
  answer_id: number;
  price_adjustment: number;
  cost_description?: string;
  cost_amount: number;
  work_description?: string;
  created_at: string;
  updated_at: string;
}

export const priceListQuestionsApi = {
  // Lista domande per listino
  async getQuestions(priceListItemId: number): Promise<PriceListItemQuestion[]> {
    const response = await apiClient.get(`/price-list/${priceListItemId}/questions`);
    return response.data;
  },

  // Crea domanda
  async createQuestion(
    priceListItemId: number,
    data: {
      question_text: string;
      question_type: 'multiple_choice' | 'text' | 'number';
      is_required?: boolean;
      order?: number;
    }
  ): Promise<PriceListItemQuestion> {
    const response = await apiClient.post(`/price-list/${priceListItemId}/questions`, data);
    return response.data;
  },

  // Modifica domanda
  async updateQuestion(
    priceListItemId: number,
    questionId: number,
    data: Partial<{
      question_text: string;
      question_type: 'multiple_choice' | 'text' | 'number';
      is_required: boolean;
      order: number;
    }>
  ): Promise<PriceListItemQuestion> {
    const response = await apiClient.put(`/price-list/${priceListItemId}/questions/${questionId}`, data);
    return response.data;
  },

  // Elimina domanda
  async deleteQuestion(priceListItemId: number, questionId: number): Promise<void> {
    await apiClient.delete(`/price-list/${priceListItemId}/questions/${questionId}`);
  },

  // Aggiungi risposta
  async addAnswer(
    priceListItemId: number,
    questionId: number,
    data: {
      answer_text: string;
      order?: number;
    }
  ): Promise<QuestionAnswer> {
    const response = await apiClient.post(`/price-list/${priceListItemId}/questions/${questionId}/answers`, data);
    return response.data;
  },

  // Modifica risposta
  async updateAnswer(
    answerId: number,
    data: Partial<{
      answer_text: string;
      order: number;
    }>
  ): Promise<QuestionAnswer> {
    const response = await apiClient.put(`/price-list/questions/answers/${answerId}`, data);
    return response.data;
  },

  // Elimina risposta
  async deleteAnswer(answerId: number): Promise<void> {
    await apiClient.delete(`/price-list/questions/answers/${answerId}`);
  },

  // Aggiungi condizione
  async addCondition(
    answerId: number,
    data: {
      price_adjustment: number;
      cost_description?: string;
      cost_amount?: number;
      work_description?: string;
    }
  ): Promise<AnswerCondition> {
    const response = await apiClient.post(`/price-list/questions/answers/${answerId}/conditions`, data);
    return response.data;
  },

  // Modifica condizione
  async updateCondition(
    conditionId: number,
    data: Partial<{
      price_adjustment: number;
      cost_description: string;
      cost_amount: number;
      work_description: string;
    }>
  ): Promise<AnswerCondition> {
    const response = await apiClient.put(`/price-list/questions/conditions/${conditionId}`, data);
    return response.data;
  },

  // Elimina condizione
  async deleteCondition(conditionId: number): Promise<void> {
    await apiClient.delete(`/price-list/questions/conditions/${conditionId}`);
  },
};

