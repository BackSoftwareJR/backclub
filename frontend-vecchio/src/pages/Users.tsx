import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Briefcase } from 'lucide-react';
import { Button } from '../components/ui/Button';
import api from '../lib/axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UserModal } from '../components/users/UserModal';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'freelance' | 'client';
    phone?: string;
    created_at: string;
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;

        try {
            await api.delete(`/users/${id}`);
            setUsers(users.filter(user => user.id !== id));
        } catch (error) {
            console.error('Failed to delete user', error);
        }
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchUsers();
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                    </span>
                );
            case 'freelance':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Briefcase className="w-3 h-3 mr-1" />
                        Freelance
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        <UserIcon className="w-3 h-3 mr-1" />
                        Cliente
                    </span>
                );
        }
    };

    return (
        <DashboardLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestione Utenti</h1>
                    <p className="text-slate-400">Gestisci i membri del team, amministratori e clienti</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Utente
                </Button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cerca utenti..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Utente</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ruolo</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contatti</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Iscrizione</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Caricamento...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Nessun utente trovato
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{user.name}</div>
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {user.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(user.created_at).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                user={selectedUser}
            />
        </DashboardLayout>
    );
}
