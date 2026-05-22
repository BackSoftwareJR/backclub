import apiClient from './client';

// ==================== Types ====================

export interface Client {
    id: number;
    company_name: string;
    contact_person?: string;
    referente_nome?: string;
    referente_cognome?: string;
    referente_telefono?: string;
    referente_email?: string;
    partita_iva?: string;
    ragione_sociale?: string;
    visura_camerale_url?: string;
    visura_camerale_reminder?: boolean;
    visura_uploaded_at?: string;
    iban?: string;
    swift?: string;
    sdi_code?: string;
    pec?: string;
    sito_web?: string;
    drive_link_foto?: string;
    drive_link_video?: string;
    drive_link_materiali?: string;
    facebook_profile?: string;
    google_ads_account?: string;
    google_my_business?: string;
    privacy_sheet_url?: string;
    carta_servizi_url?: string;
    carta_identita_url?: string;
    codice_fiscale?: string;
    vat_number?: string;
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    payment_terms?: string;
    credit_limit_cocchi?: number;
    notes?: string;
    access_enabled?: boolean;
    access_password?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    
    // Counts
    projects_count?: number;
    active_projects_count?: number;
    
    // Relations
    projects?: any[];
}

export interface CreateClientData {
    company_name: string;
    ragione_sociale?: string;
    contact_person?: string;
    referente_nome?: string;
    referente_cognome?: string;
    referente_telefono?: string;
    referente_email?: string;
    partita_iva?: string;
    codice_fiscale?: string;
    vat_number?: string;
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    iban?: string;
    swift?: string;
    sdi_code?: string;
    pec?: string;
    sito_web?: string;
    drive_link_foto?: string;
    drive_link_video?: string;
    drive_link_materiali?: string;
    facebook_profile?: string;
    google_ads_account?: string;
    google_my_business?: string;
    visura_camerale_url?: string;
    visura_camerale_reminder?: boolean;
    privacy_sheet_url?: string;
    carta_servizi_url?: string;
    carta_identita_url?: string;
    payment_terms?: string;
    credit_limit_cocchi?: number;
    notes?: string;
    access_enabled?: boolean;
    access_password?: string;
    is_active?: boolean;
}

export interface UpdateClientData extends Partial<CreateClientData> {}

// ==================== API Functions ====================

/**
 * Get all clients with optional filters
 */
export const getClients = async (params?: {
    search?: string;
    active_only?: boolean;
    with_access?: boolean;
    seller_id?: number;
}): Promise<Client[]> => {
    try {
        const response = await apiClient.get('/clients', { params });
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch clients');
    } catch (error: any) {
        console.error('Error fetching clients:', error);
        throw error.response?.data?.message || error.message || 'Error loading clients';
    }
};

/**
 * Get single client with full details
 */
export const getClient = async (clientId: number): Promise<Client> => {
    try {
        const response = await apiClient.get(`/clients/${clientId}`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch client');
    } catch (error: any) {
        console.error('Error fetching client:', error);
        throw error.response?.data?.message || error.message || 'Error loading client';
    }
};

/**
 * Create new client
 */
export const createClient = async (data: CreateClientData): Promise<Client> => {
    try {
        const response = await apiClient.post('/clients', data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create client');
    } catch (error: any) {
        console.error('Error creating client:', error);
        console.error('Error details:', error.response?.data);
        
        // Return detailed error message
        if (error.response?.data?.errors) {
            const errors = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(errors);
        }
        
        throw error.response?.data?.message || error.message || 'Error creating client';
    }
};

/**
 * Update client
 */
export const updateClient = async (clientId: number, data: UpdateClientData): Promise<Client> => {
    try {
        const response = await apiClient.put(`/clients/${clientId}`, data);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update client');
    } catch (error: any) {
        console.error('Error updating client:', error);
        console.error('Error details:', error.response?.data);
        
        // Return detailed error message
        if (error.response?.data?.errors) {
            const errors = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(errors);
        }
        
        throw error.response?.data?.message || error.message || 'Error updating client';
    }
};

/**
 * Delete client
 */
export const deleteClient = async (clientId: number): Promise<void> => {
    try {
        const response = await apiClient.delete(`/clients/${clientId}`);
        
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete client');
        }
    } catch (error: any) {
        console.error('Error deleting client:', error);
        throw error.response?.data?.message || error.message || 'Error deleting client';
    }
};

/**
 * Get client projects
 */
export const getClientProjects = async (clientId: number): Promise<any[]> => {
    try {
        const response = await apiClient.get(`/clients/${clientId}/projects`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch client projects');
    } catch (error: any) {
        console.error('Error fetching client projects:', error);
        throw error.response?.data?.message || error.message || 'Error loading client projects';
    }
};

/**
 * Toggle client access
 */
export const toggleClientAccess = async (clientId: number): Promise<Client> => {
    try {
        const response = await apiClient.post(`/clients/${clientId}/toggle-access`);
        
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to toggle client access');
    } catch (error: any) {
        console.error('Error toggling client access:', error);
        throw error.response?.data?.message || error.message || 'Error toggling access';
    }
};

/**
 * Reset client password
 */
export const resetClientPassword = async (clientId: number, password: string): Promise<void> => {
    try {
        const response = await apiClient.post(`/clients/${clientId}/reset-password`, { password });
        
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to reset password');
        }
    } catch (error: any) {
        console.error('Error resetting password:', error);
        throw error.response?.data?.message || error.message || 'Error resetting password';
    }
};

export default {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getClientProjects,
    toggleClientAccess,
    resetClientPassword,
};

