import apiClient from './client';

export interface RichiediAccessoPayload {
  email: string;
  privacy_accepted: boolean;
}

export interface RichiediAccessoResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export const backclubAccessApi = {
  richiediAccesso: async (data: RichiediAccessoPayload): Promise<RichiediAccessoResponse> => {
    const response = await apiClient.post<RichiediAccessoResponse>('/backclub/richiedi-accesso', data);
    return response.data;
  },
};
