import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, Briefcase, CheckSquare, Users, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { Logo } from '../ui/Logo';

interface SearchResults {
    projects: any[];
    tasks: any[];
    clients: any[];
    users: any[];
    events: any[];
}

export function Header() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const search = async () => {
            if (query.length < 2) {
                setResults(null);
                return;
            }

            setIsLoading(true);
            try {
                const response = await api.get(`/search?query=${query}`);
                setResults(response.data);
                setIsOpen(true);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleResultClick = (type: string, id: number) => {
        setIsOpen(false);
        setQuery('');
        switch (type) {
            case 'project':
                navigate(`/projects/${id}`);
                break;
            case 'task':
                // For now, navigate to projects, ideally open task modal
                // You might want to implement a way to open specific task from URL
                navigate(`/tasks`);
                break;
            case 'client':
                navigate(`/clients`);
                break;
            case 'user':
                navigate(`/users`); // Assuming you have a users page
                break;
            case 'event':
                navigate(`/projects`); // Or calendar
                break;
        }
    };

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl fixed top-0 right-0 left-64 z-40 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <Logo size="sm" className="hidden md:flex" />
                <div className="relative w-96" ref={searchRef}>
                    <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-blue-500/50 focus-within:bg-slate-900 transition-all">
                        <Search className="w-4 h-4 text-slate-500 mr-2" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cerca ovunque..."
                            className="bg-transparent border-none focus:outline-none text-sm text-slate-200 placeholder:text-slate-500 w-full"
                        />
                        {isLoading && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    {isOpen && results && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto z-50">
                            {Object.entries(results).map(([category, items]) => {
                                if (items.length === 0) return null;

                                let icon, label, type;
                                switch (category) {
                                    case 'projects': icon = Briefcase; label = 'Progetti'; type = 'project'; break;
                                    case 'tasks': icon = CheckSquare; label = 'Task'; type = 'task'; break;
                                    case 'clients': icon = Users; label = 'Clienti'; type = 'client'; break;
                                    case 'users': icon = User; label = 'Utenti'; type = 'user'; break;
                                    case 'events': icon = Calendar; label = 'Eventi'; type = 'event'; break;
                                    default: return null;
                                }

                                const Icon = icon;

                                return (
                                    <div key={category} className="p-2">
                                        <div className="text-xs font-semibold text-slate-500 uppercase px-2 mb-1 flex items-center gap-2">
                                            <Icon className="w-3 h-3" />
                                            {label}
                                        </div>
                                        {items.map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleResultClick(type, item.id)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between group"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm text-slate-200 font-medium truncate group-hover:text-blue-400 transition-colors">
                                                        {item.name || item.title || item.company_name}
                                                    </div>
                                                    {(item.description || item.email) && (
                                                        <div className="text-xs text-slate-500 truncate">
                                                            {item.description || item.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}

                            {Object.values(results).every(arr => arr.length === 0) && (
                                <div className="p-4 text-center text-slate-500 text-sm">
                                    Nessun risultato trovato
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-6">
                <button className="relative text-slate-400 hover:text-slate-200 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
                </button>

                <div className="flex items-center space-x-3 pl-6 border-l border-slate-800">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-white">{user?.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.charAt(0)}
                    </div>
                </div>
            </div>
        </header>
    );
}
