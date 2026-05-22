import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import './FinancialCalendar.css';

interface FinancialTransaction {
    id: number;
    type: 'entrata' | 'uscita';
    amount: number;
    description: string;
    date: Date;
    category?: string;
}

interface FinancialCalendarProps {
    projectId?: number;
    transactions?: FinancialTransaction[];
    onDateSelect?: (date: Date) => void;
}

const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ 
    transactions = [],
    onDateSelect 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [monthTransactions, setMonthTransactions] = useState<Map<string, { entrate: number; uscite: number }>>(new Map());

    const DAYS_OF_WEEK = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];
    const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    // Calcola transazioni per giorno
    useEffect(() => {
        const transactionsByDay = new Map<string, { entrate: number; uscite: number }>();
        
        transactions.forEach(trans => {
            const dateKey = trans.date.toISOString().split('T')[0];
            const existing = transactionsByDay.get(dateKey) || { entrate: 0, uscite: 0 };
            
            if (trans.type === 'entrata') {
                existing.entrate += trans.amount;
            } else {
                existing.uscite += trans.amount;
            }
            
            transactionsByDay.set(dateKey, existing);
        });
        
        setMonthTransactions(transactionsByDay);
    }, [transactions]);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        if (onDateSelect) {
            onDateSelect(date);
        }
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    
    // Aggiungi giorni del mese
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date | null) => {
        if (!date || !selectedDate) return false;
        return date.toDateString() === selectedDate.toDateString();
    };

    // Calcola totali mese
    const monthTotalEntrate = Array.from(monthTransactions.values()).reduce((sum, t) => sum + t.entrate, 0);
    const monthTotalUscite = Array.from(monthTransactions.values()).reduce((sum, t) => sum + t.uscite, 0);
    const monthSaldo = monthTotalEntrate - monthTotalUscite;

    return (
        <div className="financial-calendar">
            <div className="financial-calendar-header">
                <button 
                    className="calendar-nav-btn"
                    onClick={() => handleMonthChange('prev')}
                >
                    <ChevronLeft size={18} />
                </button>
                <h3 className="calendar-month-title">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button 
                    className="calendar-nav-btn"
                    onClick={() => handleMonthChange('next')}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="financial-calendar-grid">
                {/* Days of week header */}
                <div className="calendar-weekdays">
                    {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="calendar-days-grid">
                    {days.map((date, index) => {
                        if (!date) {
                            return <div key={`empty-${index}`} className="calendar-day empty" />;
                        }

                        const dateKey = date.toISOString().split('T')[0];
                        const dayTransactions = monthTransactions.get(dateKey) || { entrate: 0, uscite: 0 };
                        const hasTransactions = dayTransactions.entrate > 0 || dayTransactions.uscite > 0;
                        const isTodayDate = isToday(date);
                        const isSelectedDate = isSelected(date);

                        return (
                            <div
                                key={dateKey}
                                className={`calendar-day ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''} ${hasTransactions ? 'has-transactions' : ''}`}
                                onClick={() => handleDateClick(date)}
                            >
                                <div className="calendar-day-number">{date.getDate()}</div>
                                {hasTransactions && (
                                    <div className="calendar-day-transactions">
                                        {dayTransactions.entrate > 0 && (
                                            <div className="transaction-indicator entrata" title={`Entrate: ${dayTransactions.entrate.toFixed(2)}`}>
                                                <TrendingUp size={10} />
                                            </div>
                                        )}
                                        {dayTransactions.uscite > 0 && (
                                            <div className="transaction-indicator uscita" title={`Uscite: ${dayTransactions.uscite.toFixed(2)}`}>
                                                <TrendingDown size={10} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Panel */}
            <div className="financial-summary-panel">
                <div className="summary-item">
                    <div className="summary-label">Entrate</div>
                    <div className="summary-value positive">{monthTotalEntrate.toFixed(2)}</div>
                </div>
                <div className="summary-item">
                    <div className="summary-label">Uscite</div>
                    <div className="summary-value negative">{monthTotalUscite.toFixed(2)}</div>
                </div>
                <div className="summary-item total">
                    <div className="summary-label">Saldo</div>
                    <div className={`summary-value ${monthSaldo >= 0 ? 'positive' : 'negative'}`}>
                        {monthSaldo >= 0 ? '+' : ''}{monthSaldo.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialCalendar;

