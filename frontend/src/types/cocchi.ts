// Cocchi (Budget) types
export interface Cocchio {
    id: number;
    tipo: 'entrata' | 'uscita';
    importo: number;
    data: string;
    progetto_id?: number;
    progetto?: {
        id: number;
        name: string;
    };
    categoria: string;
    descrizione: string;
    allegati?: string[];
    ricorrente: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateCocchioData {
    tipo: 'entrata' | 'uscita';
    importo: number;
    data: string;
    progetto_id?: number;
    categoria: string;
    descrizione: string;
    allegati?: string[];
    ricorrente: boolean;
}

export interface UpdateCocchioData extends Partial<CreateCocchioData> { }

export interface CocchiStats {
    totale_entrate: number;
    totale_uscite: number;
    saldo: number;
    entrate_mensili: number;
    uscite_mensili: number;
}
