import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../../../lib/axios';

interface CalendarInvoice {
    id: number;
    invoice_number: string;
    client: { company_name: string };
    total_cocchi: number;
    due_date: string;
    status: string;
}

export function InvoiceCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [invoices, setInvoices] = useState<CalendarInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, [currentDate]);

    const fetchInvoices = async () => {
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            const response = await api.get('/invoices', {
                params: {
                    date_from: `${year}-${String(month).padStart(2, '0')}-01`,
                    date_to: `${year}-${String(month).padStart(2, '0')}-31`,
                }
            });
            
            setInvoices(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // Aggiungi giorni vuoti all'inizio
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Aggiungi giorni del mese
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        
        return days;
    };

    const getInvoicesForDay = (day: number) => {
        if (!day) return [];
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return invoices.filter(inv => inv.due_date === dateStr);
    };

    const isToday = (day: number) => {
        if (!day) return false;
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const isOverdue = (invoice: CalendarInvoice) => {
        return invoice.status !== 'paid' && new Date(invoice.due_date) < new Date();
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500 text-sm">Caricamento calendario...</div>;
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5"
                    >
                        Oggi
                    </button>
                    <button
                        onClick={goToNextMonth}
                        className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {dayNames.map((day) => (
                    <div key={day} className="text-xs font-medium text-slate-500 text-center py-2">
                        {day}
                    </div>
                ))}

                {/* Calendar Days */}
                {getDaysInMonth().map((day, index) => {
                    const dayInvoices = day ? getInvoicesForDay(day) : [];
                    const overdueCount = dayInvoices.filter(isOverdue).length;

                    return (
                        <div
                            key={index}
                            className={`min-h-[80px] p-1.5 border border-slate-800 rounded-lg ${
                                isToday(day || 0) ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/30'
                            }`}
                        >
                            {day && (
                                <>
                                    <div className={`text-xs font-medium mb-1 ${
                                        isToday(day) ? 'text-blue-400' : 'text-slate-400'
                                    }`}>
                                        {day}
                                    </div>
                                    <div className="space-y-1">
                                        {dayInvoices.slice(0, 2).map((invoice) => (
                                            <div
                                                key={invoice.id}
                                                className={`text-xs p-1 rounded ${
                                                    isOverdue(invoice)
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                }`}
                                                title={invoice.invoice_number}
                                            >
                                                {invoice.total_cocchi.toFixed(0)}₵
                                            </div>
                                        ))}
                                        {dayInvoices.length > 2 && (
                                            <div className="text-xs text-slate-500">
                                                +{dayInvoices.length - 2}
                                            </div>
                                        )}
                                        {overdueCount > 0 && (
                                            <AlertCircle className="w-3 h-3 text-red-400" />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

