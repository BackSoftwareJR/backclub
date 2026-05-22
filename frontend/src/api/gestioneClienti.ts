import apiClient from './client';

// ==================== Types ====================

export interface ClientPrice {
    id: number;
    client_id: number;
    client_name?: string;
    service_id: number;
    service_name?: string;
    price: number;
    original_price: number;
    discount_percentage: number;
    is_active: boolean;
    valid_from?: string;
    valid_until?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface Offer {
    id: number;
    title: string;
    description: string;
    discount_percentage: number;
    service_ids: number[];
    client_ids: number[] | null;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    image_url?: string;
    terms_conditions?: string;
    created_at: string;
    updated_at: string;
}

export interface Service {
    id: number;
    name: string;
    description: string;
    base_price: number;
    category?: string;
    is_active: boolean;
    is_visible_to_clients: boolean;
    image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface BackClubAccessRequest {
    id: number;
    email: string;
    created_at: string;
}

export interface NewsArticle {
    id: number;
    title: string;
    content: string;
    excerpt: string;
    image_url?: string;
    author: string;
    category: string;
    is_published: boolean;
    published_at?: string;
    tags?: string[];
    views_count: number;
    created_at: string;
    updated_at: string;
}

export interface ClientOrder {
    id: number;
    order_number: string;
    client_id: number;
    client_name?: string;
    order_source: 'dal_sito' | 'referral' | 'cliente_diretto';
    status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
    total_amount: number;
    discount_amount: number;
    final_amount: number;
    items: Array<{
        service_id: number;
        service_name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    project_info?: {
        obiettivi?: string;
        idee?: string;
        ispirazioni?: string;
        note?: string;
        budget_previsto?: number;
        tempistiche?: string;
    };
    notes?: string;
    order_date: string;
    delivery_date?: string;
    payment_method?: string;
    payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
    quote_id?: number;
    sent_to_sellers?: boolean;
    referral_user_id?: number;
    referral_user_name?: string;
    created_at: string;
    updated_at: string;
}

export interface ClientGift {
    id: number;
    title: string;
    description: string;
    gift_type: 'discount' | 'service' | 'credit' | 'custom';
    discount_percentage?: number;
    credit_amount?: number;
    service_id?: number;
    service_name?: string;
    client_ids: number[];
    client_names?: string[];
    valid_from: string;
    valid_until: string;
    email_subject?: string;
    email_body?: string;
    email_status: 'draft' | 'scheduled' | 'sent' | 'failed';
    email_sent_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ==================== API ====================

export const gestioneClientiApi = {
    // Prezzi Speciali
    getPrices: async (params?: { client_id?: number; is_active?: boolean }): Promise<ClientPrice[]> => {
        const response = await apiClient.get<{ success: boolean; data: ClientPrice[] }>('/gestione-clienti/prices', { params });
        return response.data.data;
    },

    createPrice: async (data: {
        client_id: number;
        service_id: number;
        price: number;
        valid_from?: string;
        valid_until?: string;
        notes?: string;
    }): Promise<ClientPrice> => {
        const response = await apiClient.post<{ success: boolean; data: ClientPrice }>('/gestione-clienti/prices', data);
        return response.data.data;
    },

    updatePrice: async (id: number, data: Partial<{
        price: number;
        valid_from?: string;
        valid_until?: string;
        is_active?: boolean;
        notes?: string;
    }>): Promise<ClientPrice> => {
        const response = await apiClient.put<{ success: boolean; data: ClientPrice }>(`/gestione-clienti/prices/${id}`, data);
        return response.data.data;
    },

    deletePrice: async (id: number): Promise<void> => {
        await apiClient.delete(`/gestione-clienti/prices/${id}`);
    },

    // Offerte
    getOffers: async (params?: { is_active?: boolean }): Promise<Offer[]> => {
        const response = await apiClient.get<{ success: boolean; data: Offer[] }>('/gestione-clienti/offers', { params });
        return response.data.data;
    },

    createOffer: async (data: {
        title: string;
        description: string;
        discount_percentage: number;
        service_ids?: number[];
        client_ids?: number[];
        valid_from: string;
        valid_until: string;
        image_url?: string;
        terms_conditions?: string;
    }): Promise<Offer> => {
        const response = await apiClient.post<{ success: boolean; data: Offer }>('/gestione-clienti/offers', data);
        return response.data.data;
    },

    updateOffer: async (id: number, data: Partial<{
        title: string;
        description: string;
        discount_percentage: number;
        service_ids?: number[];
        client_ids?: number[];
        valid_from: string;
        valid_until: string;
        image_url?: string;
        terms_conditions?: string;
        is_active?: boolean;
    }>): Promise<Offer> => {
        const response = await apiClient.put<{ success: boolean; data: Offer }>(`/gestione-clienti/offers/${id}`, data);
        return response.data.data;
    },

    deleteOffer: async (id: number): Promise<void> => {
        await apiClient.delete(`/gestione-clienti/offers/${id}`);
    },

    // Notizie
    getNews: async (params?: { is_published?: boolean; category?: string }): Promise<NewsArticle[]> => {
        const response = await apiClient.get<{ success: boolean; data: NewsArticle[] }>('/gestione-clienti/news', { params });
        return response.data.data;
    },

    createNews: async (data: {
        title: string;
        content: string;
        excerpt?: string;
        image_url?: string;
        author: string;
        category?: string;
        tags?: string[];
        is_published?: boolean;
        published_at?: string;
    }): Promise<NewsArticle> => {
        const response = await apiClient.post<{ success: boolean; data: NewsArticle }>('/gestione-clienti/news', data);
        return response.data.data;
    },

    updateNews: async (id: number, data: Partial<{
        title: string;
        content: string;
        excerpt?: string;
        image_url?: string;
        author: string;
        category?: string;
        tags?: string[];
        is_published?: boolean;
        published_at?: string;
    }>): Promise<NewsArticle> => {
        const response = await apiClient.put<{ success: boolean; data: NewsArticle }>(`/gestione-clienti/news/${id}`, data);
        return response.data.data;
    },

    deleteNews: async (id: number): Promise<void> => {
        await apiClient.delete(`/gestione-clienti/news/${id}`);
    },

    // Servizi
    getServices: async (params?: { is_visible_to_clients?: boolean; is_active?: boolean }): Promise<Service[]> => {
        const response = await apiClient.get<{ success: boolean; data: Service[] }>('/gestione-clienti/services', { params });
        return response.data.data;
    },

    // Clienti Attivi
    getActiveClients: async (): Promise<any[]> => {
        const response = await apiClient.get<{ success: boolean; data: any[] }>('/gestione-clienti/active-clients');
        return response.data.data;
    },

    // Ordini
    getOrders: async (params?: { client_id?: number; status?: string }): Promise<ClientOrder[]> => {
        const response = await apiClient.get<{ success: boolean; data: ClientOrder[] }>('/gestione-clienti/orders', { params });
        return response.data.data;
    },

    createOrder: async (data: {
        client_id: number;
        items: Array<{ service_id: number; quantity: number; price: number }>;
        discount_amount?: number;
        notes?: string;
        delivery_date?: string;
        payment_method?: string;
    }): Promise<ClientOrder> => {
        const response = await apiClient.post<{ success: boolean; data: ClientOrder }>('/gestione-clienti/orders', data);
        return response.data.data;
    },

    updateOrder: async (id: number, data: Partial<{
        status: string;
        payment_status: string;
        notes: string;
        delivery_date: string;
    }>): Promise<ClientOrder> => {
        const response = await apiClient.put<{ success: boolean; data: ClientOrder }>(`/gestione-clienti/orders/${id}`, data);
        return response.data.data;
    },

    deleteOrder: async (id: number): Promise<void> => {
        await apiClient.delete(`/gestione-clienti/orders/${id}`);
    },

    sendOrderToSellers: async (id: number): Promise<{ success: boolean; quote_id: number; message: string }> => {
        const response = await apiClient.post<{ success: boolean; quote_id: number; message: string }>(`/gestione-clienti/orders/${id}/send-to-sellers`);
        return response.data;
    },

    // Regali
    getGifts: async (params?: { is_active?: boolean; email_status?: string }): Promise<ClientGift[]> => {
        const response = await apiClient.get<{ success: boolean; data: ClientGift[] }>('/gestione-clienti/gifts', { params });
        return response.data.data;
    },

    createGift: async (data: {
        title: string;
        description: string;
        gift_type: 'discount' | 'service' | 'credit' | 'custom';
        discount_percentage?: number;
        credit_amount?: number;
        service_id?: number;
        client_ids: number[];
        valid_from: string;
        valid_until: string;
        email_subject?: string;
        email_body?: string;
    }): Promise<ClientGift> => {
        const response = await apiClient.post<{ success: boolean; data: ClientGift }>('/gestione-clienti/gifts', data);
        return response.data.data;
    },

    updateGift: async (id: number, data: Partial<{
        title: string;
        description: string;
        email_subject: string;
        email_body: string;
        is_active: boolean;
        email_status: string;
    }>): Promise<ClientGift> => {
        const response = await apiClient.put<{ success: boolean; data: ClientGift }>(`/gestione-clienti/gifts/${id}`, data);
        return response.data.data;
    },

    sendGiftEmails: async (id: number): Promise<{ success: boolean; message: string; sent_count: number }> => {
        const response = await apiClient.post<{ success: boolean; message: string; sent_count: number }>(`/gestione-clienti/gifts/${id}/send-emails`);
        return response.data;
    },

    deleteGift: async (id: number): Promise<void> => {
        await apiClient.delete(`/gestione-clienti/gifts/${id}`);
    },

    // Richieste accesso BackClub
    getBackclubRequests: async (): Promise<BackClubAccessRequest[]> => {
        const response = await apiClient.get<{ success: boolean; data: BackClubAccessRequest[] }>('/gestione-clienti/backclub-requests');
        return response.data.data;
    },
};

export default gestioneClientiApi;

