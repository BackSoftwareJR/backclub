import { useState, useEffect } from 'react';
import { Receipt, Search } from 'lucide-react';
import api from '../../../lib/axios';
import { motion } from 'framer-motion';

interface Invoice {
    id: number;
    invoice_number: string;
    client: { company_name: string };
    project: { name: string } | null;
    total_cocchi: number;
    status: string;
    due_date: string;
    issue_date: string;
    payment_type: 'single' | 'installments';
    installments_count: number | null;
}

export function InvoiceList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        client_id: '',
        date_from: '',
        date_to: '',
    });

    useEffect(() => {
        fetchInvoices();
    }, [filters]);

    const fetchInvoices = async () => {
        try {
            const params: any = {};
            if (filters.status) params.status = filters.status;
            if (filters.client_id) params.client_id = filters.client_id;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;

            const response = await api.get('/invoices', { params });
            setInvoices(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
            case 'sent': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
            case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/20';
            case 'draft': return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
        }
    };

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500 text-sm">Caricamento fatture...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cerca fattura..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="draft">Bozza</option>
                        <option value="sent">Inviata</option>
                        <option value="paid">Pagata</option>
                        <option value="overdue">Scaduta</option>
                    </select>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        placeholder="Da data"
                    />
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        placeholder="A data"
                    />
                </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-2">
                {invoices.map((invoice) => (
                    <motion.div
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Receipt className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-semibold text-white">{invoice.invoice_number}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                    {invoice.payment_type === 'installments' && (
                                        <span className="text-xs text-slate-500">
                                            {invoice.installments_count} rate
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <div>{invoice.client.company_name}</div>
                                    {invoice.project && <div>Progetto: {invoice.project.name}</div>}
                                    <div className="flex items-center gap-4 mt-2">
                                        <span>Emissione: {new Date(invoice.issue_date).toLocaleDateString()}</span>
                                        <span>Scadenza: {new Date(invoice.due_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-semibold text-white mb-1">
                                    {invoice.total_cocchi.toFixed(2)} ₵
                                </div>
                                <button className="text-xs text-blue-400 hover:text-blue-300">
                                    Dettagli
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

