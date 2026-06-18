import { useState, useEffect } from 'react';
import { FileText, Search, Folder, Download } from 'lucide-react';
import api from '../../../lib/axios';
import { motion } from 'framer-motion';

interface Document {
    id: number;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    category: { name: string } | null;
    uploaded_by: { name: string };
    created_at: string;
    attachable_type: string;
    attachable_id: number;
}

export function DocumentManager() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        category_id: '',
        attachable_type: '',
        search: '',
    });

    useEffect(() => {
        fetchDocuments();
        fetchCategories();
    }, [filters]);

    const fetchDocuments = async () => {
        try {
            const params: any = {};
            if (filters.category_id) params.category_id = filters.category_id;
            if (filters.attachable_type) params.attachable_type = filters.attachable_type;

            const response = await api.get('/segreteria/documents', { params });
            setDocuments(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to fetch documents', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/segreteria/document-categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const filteredDocuments = documents.filter(doc => {
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return (
                doc.original_name.toLowerCase().includes(searchLower) ||
                doc.filename.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500 text-sm">Caricamento documenti...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Cerca documenti..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={filters.category_id}
                        onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Tutte le categorie</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        value={filters.attachable_type}
                        onChange={(e) => setFilters({ ...filters, attachable_type: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Tutti i tipi</option>
                        <option value="App\\Models\\Project">Progetti</option>
                        <option value="App\\Models\\Task">Task</option>
                        <option value="App\\Models\\Invoice">Fatture</option>
                    </select>
                </div>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{doc.original_name}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                        <span>{formatFileSize(doc.size)}</span>
                                        {doc.category && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Folder className="w-3 h-3" />
                                                    {doc.category.name}
                                                </span>
                                            </>
                                        )}
                                        <span>•</span>
                                        <span>Caricato da {doc.uploaded_by.name}</span>
                                        <span>•</span>
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

