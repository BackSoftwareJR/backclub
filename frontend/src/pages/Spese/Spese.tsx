import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, Wallet, ArrowRight, Loader } from 'lucide-react';
import serbatoiApi from '../../api/serbatoi';
import usciteCocchiApi from '../../api/uscite-cocchi';
import './Spese.css';

const Spese: React.FC = () => {
    const navigate = useNavigate();

    const [totalUscite, setTotalUscite] = useState(0);
    const [totalSerbatoi, setTotalSerbatoi] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);

            // Get serbatoi stats
            const serbatoiResponse = await serbatoiApi.getAll();
            setTotalSerbatoi(serbatoiResponse.stats.total_balance);

            // Get uscite stats (current month)
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const usciteResponse = await usciteCocchiApi.getStats({ start_date: startDate, end_date: endDate });
            setTotalUscite(usciteResponse.data.total_amount);
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="spese-dashboard">

            {/* Header */}
            <div className="spese-dashboard-header">
                <h1>Gestione Spese</h1>
                <p className="subtitle">Dashboard principale spese e serbatoi Cocchi</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Loader className="spinner" size={32} />
                </div>
            ) : (
                /* Navigation Boxes */
                <div className="spese-nav-grid">
                    {/* Uscite Cocchi Box */}
                    <div className="spese-nav-box uscite" onClick={() => navigate('/uscite-cocchi-detail')}>
                        <div className="nav-box-icon">
                            <TrendingDown size={48} />
                        </div>
                        <div className="nav-box-content">
                            <h2>Uscite Cocchi</h2>
                            <div className="nav-box-value">¢ {totalUscite.toLocaleString('it-IT')}</div>
                            <p>Visualizza dettaglio transazioni, fatture e ricevute</p>
                        </div>
                        <div className="nav-box-arrow">
                            <ArrowRight size={24} />
                        </div>
                    </div>

                    {/* Serbatoi Box */}
                    <div className="spese-nav-box serbatoi" onClick={() => navigate('/serbatoi')}>
                        <div className="nav-box-icon">
                            <Wallet size={48} />
                        </div>
                        <div className="nav-box-content">
                            <h2>Serbatoi Cocchi</h2>
                            <div className="nav-box-value">¢ {totalSerbatoi.toLocaleString('it-IT')}</div>
                            <p>Gestisci riserve e automazioni distribuzione</p>
                        </div>
                        <div className="nav-box-arrow">
                            <ArrowRight size={24} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Spese;
