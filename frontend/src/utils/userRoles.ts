import type { User } from '../types/user';

/** Ruolo attivo nella sessione corrente (current_role ha priorità) */
export function getActiveRole(user: User | null | undefined): string | undefined {
    if (!user) return undefined;
    if (user.current_role) return user.current_role;
    if (user.roles?.length === 1) return user.roles[0];
    return user.role;
}

export function isFreelanceUser(user: User | null | undefined): boolean {
    const role = getActiveRole(user);
    return role === 'freelance';
}

export function isSellerUser(user: User | null | undefined): boolean {
    if (!user) return false;
    const activeRole = getActiveRole(user);
    return activeRole === 'venditori' || activeRole === 'seller';
}

export function isAdminUser(user: User | null | undefined): boolean {
    if (!user) return false;
    return getActiveRole(user) === 'admin';
}

export function isDeveloperUser(user: User | null | undefined): boolean {
    if (!user) return false;
    return getActiveRole(user) === 'developer';
}

/** Area staff (dashboard admin, cocchi, progetti, ecc.) - qualsiasi ruolo non freelance e non seller */
export function canAccessStaffArea(user: User | null | undefined): boolean {
    if (!user) return false;
    return !isFreelanceUser(user) && !isSellerUser(user);
}

/** Solo gli utenti con ruolo admin possono accedere alle aree admin */
export function canAccessAdminArea(user: User | null | undefined): boolean {
    return isAdminUser(user);
}

/** Workspace: freelance e developer */
export function canAccessWorkspace(user: User | null | undefined): boolean {
    if (!user) return false;
    const activeRole = getActiveRole(user);
    return activeRole === 'freelance' || activeRole === 'developer';
}

/** Controlla se l'utente ha un determinato ruolo (anche tra i ruoli multipli) */
export function userHasRole(user: User | null | undefined, role: string): boolean {
    if (!user) return false;
    if (user.roles && user.roles.includes(role)) return true;
    if (user.role === role) return true;
    return false;
}

/** Etichetta italiana per ogni ruolo */
export function getRoleLabel(role: string | null | undefined): string {
    if (!role) return 'Nessun ruolo';
    const labels: Record<string, string> = {
        admin: 'Amministratore',
        freelance: 'Freelance',
        freelancer: 'Freelance',
        venditori: 'Venditore',
        seller: 'Venditore',
        client: 'Cliente',
        clienti: 'Cliente',
        developer: 'Developer',
        dipendente: 'Dipendente',
        project_manager: 'Project Manager',
        project_master: 'Project Master',
        segreteria: 'Segreteria',
        risorse_umane: 'Risorse Umane',
        commercialista: 'Commercialista',
        manager: 'Manager',
    };
    return labels[role] ?? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

export function getHomeRouteForUser(user: User | null | undefined): string {
    if (!user) return '/login';
    if (isSellerUser(user)) return '/seller';
    if (isFreelanceUser(user)) return '/freelance';
    if (isDeveloperUser(user)) return '/workspace/developer';
    return '/dashboard';
}
