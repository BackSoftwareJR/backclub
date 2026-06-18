import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Plus, Building2, Mail, Phone, MapPin, Search, X, Briefcase, ExternalLink, Trash2, Pencil } from 'lucide-react';
import api from '../lib/axios';
import { useNavigate } from 'react-router-dom';

interface Project {
    id: number;
    name: string;
    status: string;
    priority: string;
}

interface Client {
    id: number;
    company_name: string;
    email: string;
    vat_number: string;
    address: string;
    phone: string;
    access_enabled: boolean;
    projects?: Project[];
}

export default function Clients() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [newClient, setNewClient] = useState({
        company_name: '',
        email: '',
        vat_number: '',
        address: '',
        phone: '',
        access_enabled: false
    });

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchClients(searchQuery);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchClients = async (query = '') => {
        setIsLoading(true);
        try {
            const url = query ? `/clients?query=${query}` : '/clients';
            const response = await api.get(url);
            setClients(response.data);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClientDetails = async (id: number) => {
        try {
            const response = await api.get(`/clients/${id}`);
            setSelectedClient(response.data);
            setIsDetailsOpen(true);
        } catch (error) {
            console.error('Failed to fetch client details', error);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/clients', newClient);
            setIsCreating(false);
            setNewClient({
                company_name: '',
                email: '',
                vat_number: '',
                address: '',
                phone: '',
                access_enabled: false
            });
            fetchClients();
        } catch (error: any) {
            console.error('Failed to create client', error.response?.data || error);
            alert('Failed to create client: ' + (error.response?.data?.message || 'Unknown error'));
        }
    };

    const handleDeleteClient = async (id: number) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;
        try {
            await api.delete(`/clients/${id}`);
            if (selectedClient?.id === id) {
                setIsDetailsOpen(false);
                setSelectedClient(null);
            }
            fetchClients(searchQuery);
        } catch (error) {
            console.error('Failed to delete client', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'planning': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'on_hold': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'completed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editClientData, setEditClientData] = useState<Client | null>(null);

    const handleEditClick = (client: Client) => {
        setEditClientData(client);
        setIsEditing(true);
        setIsDetailsOpen(false); // Close details modal if open
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editClientData) return;

        try {
            await api.put(`/clients/${editClientData.id}`, editClientData);
            setIsEditing(false);
            setEditClientData(null);
            fetchClients(searchQuery);
            if (selectedClient?.id === editClientData.id) {
                fetchClientDetails(editClientData.id); // Refresh details if open
            }
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Clienti</h1>
                    <p className="text-slate-400 mt-2">Gestisci il database dei tuoi clienti</p>
                </div>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Nuovo Cliente
                </Button>
            </div>

            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Cerca per nome, email o P.IVA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>

            {/* Create Client Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Aggiungi Nuovo Cliente</h2>
                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Azienda</label>
                                <input
                                    type="text"
                                    value={newClient.company_name}
                                    onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Telefono</label>
                                    <input
                                        type="text"
                                        value={newClient.phone}
                                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Partita IVA</label>
                                <input
                                    type="text"
                                    value={newClient.vat_number}
                                    onChange={(e) => setNewClient({ ...newClient, vat_number: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Indirizzo</label>
                                <textarea
                                    value={newClient.address}
                                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Annulla</Button>
                                <Button type="submit">Crea Cliente</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {isEditing && editClientData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Modifica Cliente</h2>
                        <form onSubmit={handleUpdateClient} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Azienda</label>
                                <input
                                    type="text"
                                    value={editClientData.company_name}
                                    onChange={(e) => setEditClientData({ ...editClientData, company_name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editClientData.email}
                                        onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Telefono</label>
                                    <input
                                        type="text"
                                        value={editClientData.phone}
                                        onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Partita IVA</label>
                                <input
                                    type="text"
                                    value={editClientData.vat_number}
                                    onChange={(e) => setEditClientData({ ...editClientData, vat_number: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Indirizzo</label>
                                <textarea
                                    value={editClientData.address}
                                    onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>Annulla</Button>
                                <Button type="submit">Salva Modifiche</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Client Details Modal */}
            {isDetailsOpen && selectedClient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{selectedClient.company_name}</h2>
                                <div className="flex items-center space-x-4 text-sm text-slate-400">
                                    {selectedClient.vat_number && <span>P.IVA: {selectedClient.vat_number}</span>}
                                    {selectedClient.email && (
                                        <span className="flex items-center">
                                            <Mail className="w-3 h-3 mr-1" />
                                            {selectedClient.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => handleEditClick(selectedClient)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Modifica
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteClient(selectedClient.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Elimina
                                </Button>
                                <button
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                    <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase">Contatti</h3>
                                    <div className="space-y-3">
                                        {selectedClient.phone && (
                                            <div className="flex items-center text-slate-300">
                                                <Phone className="w-4 h-4 mr-3 text-blue-400" />
                                                {selectedClient.phone}
                                            </div>
                                        )}
                                        {selectedClient.email && (
                                            <div className="flex items-center text-slate-300">
                                                <Mail className="w-4 h-4 mr-3 text-blue-400" />
                                                {selectedClient.email}
                                            </div>
                                        )}
                                        {selectedClient.address && (
                                            <div className="flex items-start text-slate-300">
                                                <MapPin className="w-4 h-4 mr-3 text-blue-400 mt-1" />
                                                {selectedClient.address}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                        <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                                        Progetti Attivi
                                    </h3>

                                    {selectedClient.projects && selectedClient.projects.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedClient.projects.map(project => (
                                                <div
                                                    key={project.id}
                                                    onClick={() => navigate(`/projects/${project.id}`)}
                                                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                            {project.name}
                                                        </h4>
                                                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                                            {project.status.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-xs text-slate-500 capitalize">
                                                            {project.priority} Priority
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                                            <p className="text-slate-500">Nessun progetto attivo per questo cliente</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => navigate('/projects')}
                                            >
                                                Crea Nuovo Progetto
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-slate-500">Caricamento clienti...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map((client) => (
                        <div
                            key={client.id}
                            onClick={() => fetchClientDetails(client.id)}
                            className="glass-card p-6 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-blue-500/30"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="!p-2">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{client.company_name}</h3>
                            <p className="text-slate-400 text-sm mb-4">{client.vat_number || 'Nessuna P.IVA'}</p>

                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                {client.email && (
                                    <div className="flex items-center text-slate-500 text-sm">
                                        <Mail className="w-4 h-4 mr-2" />
                                        {client.email}
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center text-slate-500 text-sm">
                                        <Phone className="w-4 h-4 mr-2" />
                                        {client.phone}
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-center text-slate-500 text-sm">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        <span className="truncate">{client.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {clients.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            {searchQuery ? 'Nessun cliente trovato per la tua ricerca.' : 'Nessun cliente trovato. Aggiungine uno per iniziare.'}
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
