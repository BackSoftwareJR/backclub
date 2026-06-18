import { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import api from '../../../lib/axios';
import { motion } from 'framer-motion';

interface Reservoir {
    id: number;
    name: string;
    type: 'company' | 'project';
    project: { name: string } | null;
    current_balance_cocchi: number;
    initial_balance_cocchi: number;
    description: string;
}

export function CocchiReservoirs() {
    const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<'all' | 'company' | 'project'>('all');

    useEffect(() => {
        fetchReservoirs();
    }, [selectedType]);

    const fetchReservoirs = async () => {
        try {
            const params: any = {};
            if (selectedType !== 'all') {
                params.type = selectedType;
            }

            const response = await api.get('/cocchi-reservoirs', { params });
            setReservoirs(response.data);
        } catch (error) {
            console.error('Failed to fetch reservoirs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalBalance = reservoirs.reduce((sum, r) => sum + parseFloat(r.current_balance_cocchi.toString()), 0);
    const companyReservoirs = reservoirs.filter(r => r.type === 'company');
    const projectReservoirs = reservoirs.filter(r => r.type === 'project');

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500 text-sm">Caricamento serbatoi...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2">Totale Cocchi</div>
                    <div className="text-2xl font-semibold text-white">{totalBalance.toFixed(2)} ₵</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2">Serbatoi Aziendali</div>
                    <div className="text-2xl font-semibold text-white">{companyReservoirs.length}</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2">Serbatoi Progetto</div>
                    <div className="text-2xl font-semibold text-white">{projectReservoirs.length}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSelectedType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedType === 'all'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                >
                    Tutti
                </button>
                <button
                    onClick={() => setSelectedType('company')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedType === 'company'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                >
                    Aziendali
                </button>
                <button
                    onClick={() => setSelectedType('project')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedType === 'project'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                >
                    Progetto
                </button>
            </div>

            {/* Reservoirs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reservoirs.map((reservoir) => (
                    <motion.div
                        key={reservoir.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Coins className="w-5 h-5 text-purple-400" />
                                <div>
                                    <div className="text-sm font-semibold text-white">{reservoir.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {reservoir.type === 'company' ? 'Aziendale' : 'Progetto'}
                                    </div>
                                </div>
                            </div>
                            {reservoir.type === 'project' && reservoir.project && (
                                <span className="text-xs text-slate-500">{reservoir.project.name}</span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Saldo Attuale</div>
                                <div className="text-xl font-semibold text-white">
                                    {parseFloat(reservoir.current_balance_cocchi.toString()).toFixed(2)} ₵
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">
                                    <TrendingUp className="w-3 h-3" />
                                    Versa
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                                    <TrendingDown className="w-3 h-3" />
                                    Preleva
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs hover:bg-blue-500/20 transition-colors">
                                    <ArrowRightLeft className="w-3 h-3" />
                                    Trasferisci
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

