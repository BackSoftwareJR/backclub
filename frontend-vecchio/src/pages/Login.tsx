import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import api from '../lib/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/login', { email, password });
            const redirectRoute = response.data.redirect_route || '/';
            login(response.data.access_token, response.data.user, redirectRoute);
            navigate(redirectRoute);
        } catch (err: any) {
            console.error('Login error:', {
                error: err,
                response: err.response,
                data: err.response?.data,
                status: err.response?.status,
                message: err.message,
            });
            
            // Handle different error types
            if (err.response?.status === 500) {
                // Check if it's a PHP version error
                const errorData = err.response?.data;
                if (typeof errorData === 'string' && errorData.includes('PHP version')) {
                    setError('Errore server: versione PHP non compatibile. Contatta l\'amministratore.');
                } else if (typeof errorData === 'string' && errorData.includes('Composer')) {
                    setError('Errore server: problema con le dipendenze. Contatta l\'amministratore.');
                } else {
                    setError('Errore del server. Riprova più tardi o contatta l\'amministratore.');
                }
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.message) {
                setError(err.message);
            } else if (!err.response) {
                setError('Errore di connessione. Verifica la tua connessione internet.');
            } else {
                setError('Login fallito. Riprova.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="glass-card w-full max-w-md p-8 rounded-2xl relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="mb-6">
                        <Logo size="lg" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Bentornato</h1>
                    <p className="text-slate-400">Accedi a Back Club</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Accedi
                    </Button>

                    <div className="text-center text-sm text-slate-400">
                        Non hai un account?{' '}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                            Registrati
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
