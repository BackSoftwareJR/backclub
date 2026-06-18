import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../lib/axios';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'freelance' | 'client';
    phone?: string;
}

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user?: User | null;
}

export function UserModal({ isOpen, onClose, onSuccess, user }: UserModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'freelance' | 'client'>('freelance');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setPhone(user.phone || '');
            setPassword(''); // Don't fill password on edit
        } else {
            setName('');
            setEmail('');
            setPassword('');
            setRole('freelance');
            setPhone('');
        }
        setError('');
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data: any = {
                name,
                email,
                role,
                phone,
            };

            if (password) {
                data.password = password;
            }

            if (user) {
                await api.put(`/users/${user.id}`, data);
            } else {
                await api.post('/users', data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Si è verificato un errore');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-semibold text-white">
                        {user ? 'Modifica Utente' : 'Nuovo Utente'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <Input
                        label="Nome Completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Input
                        label={user ? "Nuova Password (lascia vuoto per mantenere)" : "Password"}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!user}
                    />

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300">Ruolo</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="freelance">Freelance</option>
                            <option value="admin">Admin</option>
                            <option value="client">Cliente</option>
                        </select>
                    </div>

                    <Input
                        label="Telefono (opzionale)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" isLoading={isLoading}>
                            {user ? 'Salva Modifiche' : 'Crea Utente'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
