import apiClient from './client';
import type {
  Contract,
  ContractFormData,
  PaginatedResponse,
  ApiResponse,
} from '../types/sellers';

export const contractsApi = {
  // Lista contratti con paginazione
  async getAll(params?: {
    client_id?: number;
    seller_id?: number;
    project_id?: number;
    status?: string;
    contract_type?: string;
    expiring_soon?: boolean;
    expiring_days?: number;
    signed?: boolean;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
    group_by?: string;
  }): Promise<PaginatedResponse<Contract>> {
    const response = await apiClient.get('/contracts', { params });
    return response.data;
  },

  // Dettaglio contratto
  async getById(id: number): Promise<Contract> {
    const response = await apiClient.get(`/contracts/${id}`);
    return response.data;
  },

  // Crea contratto
  async create(data: ContractFormData): Promise<Contract> {
    const response = await apiClient.post('/contracts', data);
    return response.data;
  },

  // Aggiorna contratto
  async update(id: number, data: Partial<ContractFormData>): Promise<Contract> {
    const response = await apiClient.put(`/contracts/${id}`, data);
    return response.data;
  },

  // Elimina contratto
  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/contracts/${id}`);
    return response.data;
  },

  // Upload file contratto
  async uploadFile(
    id: number, 
    file: File, 
    isRevision?: boolean, 
    revisionNotes?: string
  ): Promise<ApiResponse<{ contract_file: string; contract_url: string; status?: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (isRevision) {
      formData.append('is_revision', 'true');
      if (revisionNotes) {
        formData.append('revision_notes', revisionNotes);
      }
    }
    const response = await apiClient.post(`/contracts/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Upload contratto firmato
  async uploadSignedFile(
    id: number,
    file: File,
    signedAt?: string
  ): Promise<ApiResponse<{ signed_file: string; signed_url: string; signed_at: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (signedAt) {
      formData.append('signed_at', signedAt);
    }
    const response = await apiClient.post(`/contracts/${id}/signed`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Collega a progetto
  async linkToProject(id: number, projectId: number): Promise<ApiResponse<Contract>> {
    const response = await apiClient.put(`/contracts/${id}/project`, { crm_project_id: projectId });
    return response.data;
  },

  // Ottieni revisioni contratto
  async getRevisions(id: number): Promise<any[]> {
    const response = await apiClient.get(`/contracts/${id}/revisions`);
    return response.data;
  },

  // Avvia progetto da contratto firmato
  async startProject(id: number): Promise<ApiResponse<{ project: any; contract: Contract }>> {
    const response = await apiClient.post(`/contracts/${id}/start-project`);
    return response.data;
  },

  // Aggiorna stato contratto
  async updateStatus(id: number, status: string): Promise<ApiResponse<Contract>> {
    const response = await apiClient.put(`/contracts/${id}/status`, { status });
    return response.data;
  },

  // Ottieni documenti firmati aggiuntivi
  async getSignedDocuments(id: number): Promise<any[]> {
    const response = await apiClient.get(`/contracts/${id}/signed-documents`);
    return response.data;
  },

  // Upload documento firmato aggiuntivo
  async uploadSignedDocument(
    id: number,
    file: File,
    documentType: 'privacy_policy' | 'consent_personal_data' | 'other',
    documentName: string,
    signedAt?: string,
    notes?: string
  ): Promise<ApiResponse<{ document: any; file_url: string; contract?: Contract }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('document_name', documentName);
    if (signedAt) {
      formData.append('signed_at', signedAt);
    }
    if (notes) {
      formData.append('notes', notes);
    }
    const response = await apiClient.post(`/contracts/${id}/signed-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Salva documento con URL esterno (es. Google Drive)
  async uploadSignedDocumentUrl(
    id: number,
    externalUrl: string,
    documentType: 'privacy_policy' | 'consent_personal_data' | 'other',
    documentName: string,
    signedAt?: string,
    notes?: string
  ): Promise<ApiResponse<{ document: any; external_url: string; contract?: Contract }>> {
    const formData = new FormData();
    formData.append('external_url', externalUrl);
    formData.append('document_type', documentType);
    formData.append('document_name', documentName);
    if (signedAt) {
      formData.append('signed_at', signedAt);
    }
    if (notes) {
      formData.append('notes', notes);
    }
    const response = await apiClient.post(`/contracts/${id}/signed-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Elimina documento firmato aggiuntivo
  async deleteSignedDocument(id: number, documentId: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/contracts/${id}/signed-documents/${documentId}`);
    return response.data;
  },

  // Download file contratto
  async downloadFile(id: number, type: 'contract' | 'signed'): Promise<Blob> {
    const response = await apiClient.get(`/contracts/${id}/download/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download documento firmato aggiuntivo
  async downloadSignedDocument(id: number, documentId: number): Promise<Blob> {
    const response = await apiClient.get(`/contracts/${id}/signed-documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download revisione
  async downloadRevision(id: number, revisionId: number): Promise<Blob> {
    const response = await apiClient.get(`/contracts/${id}/revisions/${revisionId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default contractsApi;

