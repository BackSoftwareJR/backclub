import { useState, useEffect } from 'react';
import { ProjectCalendar } from '../projects/ProjectCalendar';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';

export function DashboardCalendar() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Filters
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');

    useEffect(() => {
        fetchProjects();
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [selectedProject, selectedUser, user]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchData = async () => {
        if (!user) return;

        try {
            // Fetch Tasks
            let taskQuery = '/tasks?';
            if (selectedProject) taskQuery += `&project_id=${selectedProject}`;
            if (selectedUser) taskQuery += `&assignee_id=${selectedUser}`;

            // For non-admins, enforce strict assignment visibility for the calendar
            if (user.role !== 'admin') {
                taskQuery += '&only_assigned=true';
            }

            const tasksRes = await api.get(taskQuery);
            setTasks(tasksRes.data);

            // Fetch Events
            let eventQuery = '/events?';
            if (selectedProject) eventQuery += `&project_id=${selectedProject}`;
            if (selectedUser) eventQuery += `&user_id=${selectedUser}`; // Filter by creator if user selected

            const eventsRes = await api.get(eventQuery);
            setEvents(eventsRes.data);

        } catch (error) {
            console.error('Failed to fetch calendar data', error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="glass-card p-4 rounded-xl flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm font-medium">Filtra per Progetto:</span>
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Tutti i progetti</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {user?.role === 'admin' && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm font-medium">Filtra per Utente:</span>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Tutti gli utenti</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <ProjectCalendar
                tasks={tasks}
                events={events}
                onTaskUpdate={fetchData}
                projects={projects}
                projectId={selectedProject || undefined} // Pass projectId if selected, otherwise undefined
            />
        </div>
    );
}
