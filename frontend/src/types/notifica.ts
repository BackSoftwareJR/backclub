export interface Notifica {
    id: number;
    tipo: 'task' | 'pagamento' | 'scadenza' | 'sistema' | 'team';
    avatar?: string;
    titolo: string;
    messaggio: string;
    tempo: string;
    letta: boolean;
    archiviata: boolean;
    eliminata: boolean;
    urgente: boolean;
    data: string;
    azioni?: {
        label: string;
        url: string;
    }[];
}

export interface NotificaFilters {
    stato: 'tutte' | 'non_lette' | 'lette' | 'archiviate' | 'eliminate' | 'urgenti';
    search: string;
    tipo?: string;
}
