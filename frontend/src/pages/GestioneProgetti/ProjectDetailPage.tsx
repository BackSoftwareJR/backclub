import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { 
    ArrowLeft,
    Briefcase,
    Building2,
    FileText,
    Users,
    CheckSquare,
    Calendar,
    TrendingUp,
    DollarSign,
    BarChart3,
    Clock,
    UserCheck,
    Play,
    CheckCircle2,
    Eye,
    Download,
    Mail,
    Phone,
    MapPin,
    User,
    Plus,
    Calendar as CalendarIcon,
    Target,
    X,
    Image as ImageIcon,
    List,
    Grid,
    AlertCircle,
    DollarSign as CocchiIcon,
    Edit,
    Trash2,
    Receipt,
    CreditCard,
    MessageSquare,
    FolderOpen,
    ExternalLink,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Github,
    Globe,
    Monitor,
    MoreHorizontal
} from 'lucide-react';
import { 
    crmProjectsApi, 
    type CrmProject, 
    crmProjectTeamMembersApi, 
    type CrmProjectTeamMember, 
    type User as AvailableUser,
    crmProjectPmChatApi,
    type CrmProjectPmChatMessage,
    type PmChatManagerInfo,
    crmProjectTasksApi,
    type CrmProjectTask,
    type CrmProjectTaskRescheduleRequest,
    type TaskExecutionMode,
    crmProjectExpensesApi,
    type ProjectExpense,
    crmProjectFinancialApi
} from '../../api/crmProjects';
import { quotesApi } from '../../api/quotes';
import { contractsApi } from '../../api/contracts';
import type { Quote, Contract } from '../../types/sellers';
import { getCrmDepartments, type CrmDepartment as CrmDepartmentType } from '../../api/crmDepartments';
import { useAuth } from '../../context/AuthContext';
import AddExtraBudgetModal from '../AssegnaProgetto/AddExtraBudgetModal';
import ProjectCalendar from '../../components/ProjectCalendar/ProjectCalendar';
import FinancialCalendar from '../../components/FinancialCalendar/FinancialCalendar';
import TaskExecutionModeSelector from '../../components/Tasks/TaskExecutionModeSelector';
import ExactPromptCheckbox from '../../components/Tasks/ExactPromptCheckbox';
import TaskAgentControlPanel from '../../components/Tasks/TaskAgentControlPanel';
import WorkspaceTab from './tabs/WorkspaceTab';
import { motion, AnimatePresence } from 'framer-motion';
import './ProjectDetailPage.css';

type TabType = 'overview' | 'client' | 'contracts' | 'quotes' | 'documents' | 'team' | 'project_manager' | 'tasks' | 'calendar' | 'financial' | 'crm_involved' | 'expenses' | 'analytics' | 'cover_photo' | 'workspace';

const bentoContainerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const bentoCardVariants = {
    hidden: { opacity: 0, y: 14 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.26,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

const AVATAR_COLORS = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA',
    '#007AFF', '#5856D6', '#FF2D55', '#AF52DE', '#FF6B35',
];

const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getInitialColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const PAYMENT_LABELS: Record<string, string> = {
    hourly: 'A Ore',
    per_task: 'A Task',
    per_project: 'A Progetto',
    fixed: 'Fisso',
    no_payment: 'Nessun Pagamento',
};

const ProjectDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const isFreelanceContext = location.pathname.startsWith('/freelance/progetti/') && location.pathname.endsWith('/gestione');
    const handleBack = () => {
        if (isFreelanceContext) {
            navigate('/freelance/progetti');
        } else {
            navigate(-1);
        }
    };
    const [searchParams, setSearchParams] = useSearchParams();
    const [project, setProject] = useState<CrmProject | null>(null);
    const isPmInFreelanceContext = isFreelanceContext && project != null && user?.id === project.manager_id;

    const handleOpenTaskDetail = (task: CrmProjectTask) => {
        if (isPmInFreelanceContext && id) {
            const returnTo = `${location.pathname}?tab=tasks`;
            navigate(`/freelance/task/${task.id}?projectId=${id}`, { state: { returnTo } });
            return;
        }
        setSelectedTask(task);
        setShowTaskDetail(true);
    };
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Leggi il tab dall'URL, altrimenti usa 'overview' come default
    const getTabFromUrl = (): TabType => {
        const tabParam = searchParams.get('tab');
        const validTabs: TabType[] = ['overview', 'client', 'contracts', 'quotes', 'documents', 'team', 'project_manager', 'tasks', 'calendar', 'financial', 'crm_involved', 'expenses', 'analytics', 'cover_photo', 'workspace'];
        if (tabParam && validTabs.includes(tabParam as TabType)) {
            return tabParam as TabType;
        }
        return 'overview';
    };
    
    const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl());
    
    // Document upload state
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
    const [documentType, setDocumentType] = useState<'privacy_policy' | 'consent_personal_data' | 'other'>('other');
    const [documentName, setDocumentName] = useState('');
    const [documentExternalUrl, setDocumentExternalUrl] = useState('');
    const [documentNotes, setDocumentNotes] = useState('');
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
    
    // Team members state
    const [teamMembers, setTeamMembers] = useState<CrmProjectTeamMember[]>([]);
    const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
    const [showEditTeamMemberModal, setShowEditTeamMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState<CrmProjectTeamMember | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [memberRole, setMemberRole] = useState('');
    const [memberPaymentMethods, setMemberPaymentMethods] = useState<Array<'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment'>>([]);
    const [memberProjectRateCocchi, setMemberProjectRateCocchi] = useState('');
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [updatingMember, setUpdatingMember] = useState(false);
    const [deletingMember, setDeletingMember] = useState(false);
    
    // Extra budget modal
    const [showExtraBudgetModal, setShowExtraBudgetModal] = useState(false);
    
    // PM Chat state
    const [pmChatMessages, setPmChatMessages] = useState<CrmProjectPmChatMessage[]>([]);
    const [pmManagerInfo, setPmManagerInfo] = useState<PmChatManagerInfo | null>(null);
    const [pmChatMessage, setPmChatMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
    const [chatImageFile, setChatImageFile] = useState<File | null>(null);
    const chatImageInputRef = useRef<HTMLInputElement>(null);
    const chatMessagesEndRef = useRef<HTMLDivElement>(null);
    
    // Tasks state
    const [tasks, setTasks] = useState<CrmProjectTask[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<CrmProjectTask[]>([]);
    const [tasksView, setTasksView] = useState<'users' | 'table' | 'cards'>('table');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showTaskDetail, setShowTaskDetail] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<CrmProjectTask | null>(null);
    const [rescheduleRequests, setRescheduleRequests] = useState<CrmProjectTaskRescheduleRequest[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
    
    // Task filters
    const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
    const [taskFilterUser, setTaskFilterUser] = useState<number | null>(null);
    const [taskFilterPriority, setTaskFilterPriority] = useState<string>('all');
    const [taskGroupBy, setTaskGroupBy] = useState<'none' | 'status' | 'assignee' | 'priority'>('none');
    const [activeTaskRowMenu, setActiveTaskRowMenu] = useState<number | null>(null);
    
    // Financial transactions state
    const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
    
    // Expenses state
    const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
    const [pendingExpenses, setPendingExpenses] = useState<ProjectExpense[]>([]);
    const [reimbursementRequests, setReimbursementRequests] = useState<ProjectExpense[]>([]);
    const [userExpenses, setUserExpenses] = useState<ProjectExpense[]>([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        type: 'project' as 'project' | 'user',
        user_id: null as number | null,
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        payment_method: '',
        receipt_file: null as File | null,
        is_reimbursement_request: false
    });
    const expenseReceiptInputRef = useRef<HTMLInputElement>(null);
    
    // CRM Involved state
    const [crmInvolved, setCrmInvolved] = useState<any[]>([]);
    const [loadingCrmInvolved, setLoadingCrmInvolved] = useState(false);
    const [crmDepartments, setCrmDepartments] = useState<CrmDepartmentType[]>([]);
    
    // Reassign state
    const [reassignUserId, setReassignUserId] = useState<number | null>(null);
    const [reassignDueDate, setReassignDueDate] = useState('');
    const [reassigningTask, setReassigningTask] = useState(false);
    
    // Task form state
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'>('pending');
    const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [taskStartDate, setTaskStartDate] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskCrmLabelId, setTaskCrmLabelId] = useState<number | null>(null);
    const [taskExecutionMode, setTaskExecutionMode] = useState<TaskExecutionMode>('human');
    const [taskExactPrompt, setTaskExactPrompt] = useState(false);
    const [taskAssignments, setTaskAssignments] = useState<Array<{
        user_id?: number;
        payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
        hourly_rate_cocchi?: number;
        hours_requested?: number;
        task_rate_cocchi?: number;
        project_rate_cocchi?: number;
    }>>([]);
    const [creatingTask, setCreatingTask] = useState(false);

    // Hero scroll tracking
    const [heroScrolled, setHeroScrolled] = useState(false);

    // Cover photo state
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null); // anteprima locale prima/durante upload
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Edit project name (solo PM o admin)
    const [editingProjectName, setEditingProjectName] = useState(false);
    const [projectNameEditValue, setProjectNameEditValue] = useState('');
    const projectNameInputRef = useRef<HTMLInputElement>(null);
    const canEditProjectName = user?.role === 'admin' || isPmInFreelanceContext;
    const canEditProjectLinks = canEditProjectName;
    const canCreateTask = user?.role === 'admin' || (project != null && user?.id === project.manager_id);

    const [editingProjectLinks, setEditingProjectLinks] = useState(false);
    const [projectLinksEdit, setProjectLinksEdit] = useState({ github_url: '', website_url: '' });
    const [savingProjectLinks, setSavingProjectLinks] = useState(false);

    // Revoca object URL per evitare memory leak
    useEffect(() => {
        return () => {
            if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
        };
    }, [coverPreviewUrl]);

    useEffect(() => {
        const onScroll = () => setHeroScrolled(window.scrollY > 160);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (id) {
            loadProject();
        }
        // Carica i CRM departments una volta
        loadCrmDepartments();
    }, [id]);

    const loadCrmDepartments = async () => {
        try {
            const crms = await getCrmDepartments(true);
            setCrmDepartments(crms);
        } catch (error) {
            console.error('Error loading CRM departments:', error);
        }
    };

    // Sincronizza il tab con l'URL quando cambia l'URL (es. navigazione avanti/indietro)
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const validTabs: TabType[] = ['overview', 'client', 'contracts', 'quotes', 'documents', 'team', 'project_manager', 'tasks', 'calendar', 'financial', 'crm_involved', 'expenses', 'analytics', 'cover_photo', 'workspace'];
        const tabFromUrl: TabType = (tabParam && validTabs.includes(tabParam as TabType)) ? (tabParam as TabType) : 'overview';
        
        setActiveTab(prevTab => {
            if (tabFromUrl !== prevTab) {
                return tabFromUrl;
            }
            return prevTab;
        });
    }, [searchParams]);

    // Funzione per cambiare tab e aggiornare l'URL
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newSearchParams = new URLSearchParams(searchParams);
        if (tab === 'overview') {
            // Rimuovi il parametro tab se è 'overview' (default)
            newSearchParams.delete('tab');
        } else {
            newSearchParams.set('tab', tab);
        }
        setSearchParams(newSearchParams, { replace: true });
    };

    useEffect(() => {
        if (project && activeTab === 'quotes') {
            loadQuotes();
        }
        if (project && activeTab === 'contracts') {
            loadContracts();
        }
        if (project && activeTab === 'documents') {
            loadQuotes();
        }
        if (project && (activeTab === 'team' || activeTab === 'overview')) {
            loadTeamMembers();
        }
        if (project && activeTab === 'project_manager') {
            loadPmChatMessages();
            loadPmManagerInfo();
        }
        if (project && (activeTab === 'tasks' || activeTab === 'overview')) {
            loadTasks();
            loadRescheduleRequests();
        }
        if (project && activeTab === 'financial') {
            loadFinancialTransactions();
        }
        if (project && activeTab === 'expenses') {
            loadExpenses();
        }
        if (project && activeTab === 'crm_involved') {
            loadCrmInvolved();
        }
    }, [project, activeTab]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const response = await crmProjectsApi.getById(Number(id));
            setProject(response.data);
        } catch (error: any) {
            console.error('Error loading project:', error);
            alert('Errore nel caricamento del progetto');
        } finally {
            setLoading(false);
        }
    };

    const loadQuotes = async () => {
        if (!project?.client_id) return;
        try {
            const response = await quotesApi.getAll({ 
                client_id: project.client_id,
                per_page: 100 
            });
            setQuotes(response.data);
        } catch (error) {
            console.error('Error loading quotes:', error);
        }
    };

    const loadContracts = async () => {
        if (!project?.client_id) return;
        try {
            const response = await contractsApi.getAll({ 
                client_id: project.client_id,
                per_page: 100 
            });
            setContracts(response.data);
        } catch (error) {
            console.error('Error loading contracts:', error);
        }
    };

    const loadTeamMembers = async () => {
        if (!id) return;
        try {
            const response = await crmProjectTeamMembersApi.getByProject(Number(id));
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    };

    const loadAvailableUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await crmProjectTeamMembersApi.getAvailableUsers();
            setAvailableUsers(response.data);
        } catch (error) {
            console.error('Error loading available users:', error);
            alert('Errore nel caricamento degli utenti disponibili');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleOpenTeamMemberModal = () => {
        setShowTeamMemberModal(true);
        setSelectedUserId(null);
        setMemberRole('');
        setMemberPaymentMethods([]);
        setMemberProjectRateCocchi('');
        loadAvailableUsers();
    };

    const handleCloseTeamMemberModal = () => {
        setShowTeamMemberModal(false);
        setSelectedUserId(null);
        setMemberRole('');
        setMemberPaymentMethods([]);
        setMemberProjectRateCocchi('');
    };

    const handleAddTeamMember = async () => {
        if (!id || !selectedUserId || !memberRole.trim()) {
            alert('Compila tutti i campi obbligatori');
            return;
        }

        if (memberPaymentMethods.length === 0) {
            alert('Seleziona almeno un metodo di pagamento');
            return;
        }

        // Se per_project è selezionato, verifica che project_rate_cocchi sia presente
        if (memberPaymentMethods.includes('per_project') && !memberProjectRateCocchi) {
            alert('È richiesto il campo "Tariffa Progetto" quando si seleziona il metodo di pagamento "A Progetto"');
            return;
        }

        try {
            setAddingMember(true);
            await crmProjectTeamMembersApi.addMember(Number(id), {
                user_id: selectedUserId,
                role: memberRole,
                payment_methods: memberPaymentMethods,
                project_rate_cocchi: memberProjectRateCocchi ? parseFloat(memberProjectRateCocchi) : undefined,
            });
            alert('✓ Membro aggiunto con successo!');
            handleCloseTeamMemberModal();
            await loadTeamMembers();
            await loadProject(); // Ricarica il progetto per aggiornare i dati
        } catch (error: any) {
            console.error('Error adding team member:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'aggiunta del membro';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setAddingMember(false);
        }
    };

    const handleTogglePaymentMethod = (method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment') => {
        if (memberPaymentMethods.includes(method)) {
            setMemberPaymentMethods(memberPaymentMethods.filter(m => m !== method));
            // Se rimuovi per_project, rimuovi anche project_rate_cocchi
            if (method === 'per_project') {
                setMemberProjectRateCocchi('');
            }
        } else {
            // Se selezioni no_payment, rimuovi tutti gli altri
            if (method === 'no_payment') {
                setMemberPaymentMethods(['no_payment']);
                setMemberProjectRateCocchi('');
            } else {
                // Se selezioni altro, rimuovi no_payment
                setMemberPaymentMethods([...memberPaymentMethods.filter(m => m !== 'no_payment'), method]);
            }
        }
    };

    const handleOpenEditTeamMemberModal = (member: CrmProjectTeamMember) => {
        setEditingMember(member);
        setMemberRole(member.role);
        setMemberPaymentMethods(member.payment_methods || []);
        setMemberProjectRateCocchi(member.project_rate_cocchi ? member.project_rate_cocchi.toString() : '');
        setShowEditTeamMemberModal(true);
    };

    const handleCloseEditTeamMemberModal = () => {
        setShowEditTeamMemberModal(false);
        setEditingMember(null);
        setMemberRole('');
        setMemberPaymentMethods([]);
        setMemberProjectRateCocchi('');
    };

    const handleUpdateTeamMember = async () => {
        if (!id || !editingMember || !memberRole.trim()) {
            alert('Compila tutti i campi obbligatori');
            return;
        }

        if (memberPaymentMethods.length === 0) {
            alert('Seleziona almeno un metodo di pagamento');
            return;
        }

        // Se per_project è selezionato, verifica che project_rate_cocchi sia presente
        if (memberPaymentMethods.includes('per_project') && !memberProjectRateCocchi) {
            alert('È richiesto il campo "Tariffa Progetto" quando si seleziona il metodo di pagamento "A Progetto"');
            return;
        }

        try {
            setUpdatingMember(true);
            await crmProjectTeamMembersApi.updateMember(Number(id), editingMember.id, {
                role: memberRole,
                payment_methods: memberPaymentMethods,
                project_rate_cocchi: memberProjectRateCocchi ? parseFloat(memberProjectRateCocchi) : undefined,
            });
            alert('✓ Membro aggiornato con successo!');
            handleCloseEditTeamMemberModal();
            await loadTeamMembers();
            await loadProject(); // Ricarica il progetto per aggiornare i dati
        } catch (error: any) {
            console.error('Error updating team member:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'aggiornamento del membro';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setUpdatingMember(false);
        }
    };

    const handleDeleteTeamMember = async (member: CrmProjectTeamMember) => {
        if (!id) return;

        if (!confirm(`Sei sicuro di voler rimuovere ${member.user?.name || 'questo membro'} dal team?`)) {
            return;
        }

        try {
            setDeletingMember(true);
            await crmProjectTeamMembersApi.removeMember(Number(id), member.id);
            alert('✓ Membro rimosso con successo!');
            await loadTeamMembers();
            await loadProject(); // Ricarica il progetto per aggiornare i dati
        } catch (error: any) {
            console.error('Error removing team member:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nella rimozione del membro';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setDeletingMember(false);
        }
    };

    // PM Chat functions
    const loadPmChatMessages = async () => {
        if (!id) return;
        try {
            const response = await crmProjectPmChatApi.getMessages(Number(id));
            setPmChatMessages(response.data);
            // Scroll to bottom after messages load
            setTimeout(() => {
                chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error: any) {
            console.error('Error loading PM chat messages:', error);
            if (error.response?.status !== 404) {
                alert('Errore nel caricamento dei messaggi');
            }
        }
    };

    const loadPmManagerInfo = async () => {
        if (!id) return;
        try {
            const response = await crmProjectPmChatApi.getManagerInfo(Number(id));
            setPmManagerInfo(response.data);
        } catch (error: any) {
            console.error('Error loading PM manager info:', error);
            if (error.response?.status !== 404) {
                // Non mostrare errore se non c'è manager
            }
        }
    };

    const handleSendPmMessage = async () => {
        if (!id) return;
        
        if (!pmChatMessage.trim() && !chatImageFile) {
            alert('Inserisci un messaggio o seleziona un\'immagine');
            return;
        }

        try {
            setSendingMessage(true);
            const messageType = chatImageFile ? 'image' : 'text';
            await crmProjectPmChatApi.sendMessage(Number(id), {
                message: pmChatMessage || undefined,
                message_type: messageType,
                file: chatImageFile || undefined,
            });
            setPmChatMessage('');
            setChatImageFile(null);
            if (chatImageInputRef.current) {
                chatImageInputRef.current.value = '';
            }
            await loadPmChatMessages();
        } catch (error: any) {
            console.error('Error sending PM message:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'invio del messaggio';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleAssignManager = async () => {
        if (!id || !selectedManagerId) {
            alert('Seleziona un Project Manager');
            return;
        }

        try {
            await crmProjectPmChatApi.assignManager(Number(id), selectedManagerId);
            alert('✓ Project Manager assegnato con successo!');
            setShowAssignManagerModal(false);
            setSelectedManagerId(null);
            await loadProject();
            await loadPmManagerInfo();
            await loadPmChatMessages();
        } catch (error: any) {
            console.error('Error assigning manager:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'assegnazione del manager';
            alert(`Errore: ${errorMessage}`);
        }
    };

    const handleCreateQuote = () => {
        if (!project?.client_id) {
            alert('Impossibile creare un preventivo: il progetto non ha un cliente associato');
            return;
        }

        // Prepara i dati del cliente per il wizard
        const client = project.client || {} as any;
        const quoteData = {
            client_id: project.client_id,
            client_info: {
                company_name: client.company_name || '',
                email: client.email || '',
                phone: client.phone || '',
                vat_number: client.vat_number || client.partita_iva || '',
                address: client.address || '',
                city: client.city || '',
                zip_code: client.zip_code || client.cap || '',
                country: client.country || 'Italia',
            },
            seller_id: project.seller_id || undefined,
            title: project.name ? `Preventivo per ${project.name}` : `Preventivo per ${client.company_name || 'Cliente'}`,
            description: project.description || '',
            notes: project.description ? `Progetto: ${project.name}\n${project.description}` : `Progetto: ${project.name}`,
        };

        // Naviga al wizard preventivi con i dati precompilati
        navigate('/venditori/preventivi/nuovo', {
            state: {
                fromProject: true,
                projectId: project.id,
                quoteData: quoteData,
            },
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'ora';
        if (minutes < 60) return `${minutes}m fa`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h fa`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}g fa`;
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    };

    const formatLastAccess = (dateString: string | null) => {
        if (!dateString) return 'Mai';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Online ora';
        if (minutes < 60) return `${minutes} minuti fa`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ore fa`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Ieri';
        if (days < 7) return `${days} giorni fa`;
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Task functions
    const loadTasks = async () => {
        if (!id) return;
        try {
            setLoadingTasks(true);
            const response = await crmProjectTasksApi.getByProject(Number(id));
            setTasks(response.data);
            applyTaskFilters(response.data);
        } catch (error: any) {
            console.error('Error loading tasks:', error);
            alert('Errore nel caricamento dei task');
        } finally {
            setLoadingTasks(false);
        }
    };

    const applyTaskFilters = (tasksList: CrmProjectTask[] = tasks) => {
        let filtered = [...tasksList];

        // Filtro per stato
        if (taskFilterStatus !== 'all') {
            filtered = filtered.filter(t => t.status === taskFilterStatus);
        }

        // Filtro per utente
        if (taskFilterUser) {
            filtered = filtered.filter(t => 
                t.assignments?.some(a => a.is_active && a.user_id === taskFilterUser)
            );
        }

        // Filtro per priorità
        if (taskFilterPriority !== 'all') {
            filtered = filtered.filter(t => t.priority === taskFilterPriority);
        }

        setFilteredTasks(filtered);
    };

    useEffect(() => {
        applyTaskFilters();
    }, [taskFilterStatus, taskFilterUser, taskFilterPriority, tasks]);

    const loadRescheduleRequests = async () => {
        if (!id) return;
        try {
            const response = await crmProjectTasksApi.getRescheduleRequests(Number(id));
            setRescheduleRequests(response.data);
        } catch (error: any) {
            console.error('Error loading reschedule requests:', error);
        }
    };

    // Load financial transactions
    const loadFinancialTransactions = async () => {
        if (!id) return;
        try {
            const response = await crmProjectFinancialApi.getTransactions(Number(id));
            setFinancialTransactions(response.data || []);
        } catch (error) {
            console.error('Error loading financial transactions:', error);
            // Fallback: leggi dai settings se l'API fallisce
            if (project?.settings?.extra_budget) {
                const transactions: any[] = [];
                project.settings.extra_budget.forEach((item: any) => {
                    transactions.push({
                        id: `entrata-${item.added_at}`,
                        type: 'entrata',
                        amount_cocchi: item.amount,
                        description: `Aumento budget da ${item.crm_name}`,
                        transaction_date: item.added_at ? new Date(item.added_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        category: 'budget_increase'
                    });
                });
                setFinancialTransactions(transactions);
            }
        }
    };

    // Load expenses
    const loadExpenses = async () => {
        if (!id) return;
        try {
            setLoadingExpenses(true);
            const response = await crmProjectExpensesApi.getByProject(Number(id));
            
            // Filtra per tipo
            const allExpenses = response.data;
            setProjectExpenses(allExpenses.filter(e => e.type === 'project'));
            setUserExpenses(allExpenses.filter(e => e.type === 'user'));
            
            // Filtra per stato
            setPendingExpenses(allExpenses.filter(e => e.status === 'pending'));
            setReimbursementRequests(allExpenses.filter(e => e.is_reimbursement_request === true));
        } catch (error) {
            console.error('Error loading expenses:', error);
            alert('Errore nel caricamento delle spese');
        } finally {
            setLoadingExpenses(false);
        }
    };

    // Load CRM involved
    const loadCrmInvolved = async () => {
        if (!id || !project) return;
        try {
            setLoadingCrmInvolved(true);
            
            // Usa l'API backend che legge da tutte le fonti
            const response = await crmProjectFinancialApi.getCrmInvolved(Number(id));
            setCrmInvolved(response.data || []);
        } catch (error) {
            console.error('Error loading CRM involved:', error);
            // Fallback: leggi dai settings se l'API fallisce
            const crmList: any[] = [];
            
            // Da extra_budget
            if (project.settings?.extra_budget) {
                const uniqueCrm = new Map();
                project.settings.extra_budget.forEach((item: any) => {
                    if (!uniqueCrm.has(item.crm_id)) {
                        uniqueCrm.set(item.crm_id, {
                            id: item.crm_id,
                            name: item.crm_name,
                            total_budget_added: item.amount,
                            first_added_at: item.added_at
                        });
                    } else {
                        uniqueCrm.get(item.crm_id).total_budget_added += (item.amount || 0);
                    }
                });
                crmList.push(...Array.from(uniqueCrm.values()));
            }
            
            // Da crm_assignments
            if (project.settings?.crm_assignments) {
                project.settings.crm_assignments.forEach((assignment: any) => {
                    const crmId = assignment.crm_department_id;
                    const found = crmList.find(c => c.id === crmId);
                    if (!found) {
                        crmList.push({
                            id: crmId,
                            name: assignment.description || 'CRM',
                            total_budget_added: 0,
                            first_added_at: project.settings?.assignment?.assigned_at || null
                        });
                    }
                });
            }
            
            // Aggiungi CRM principale del progetto
            if (project.crm_department_id) {
                const found = crmList.find(c => c.id === project.crm_department_id);
                if (!found && project.crmDepartment) {
                    crmList.push({
                        id: project.crm_department_id,
                        name: project.crmDepartment.name || 'CRM Principale',
                        total_budget_added: 0,
                        first_added_at: null
                    });
                }
            }
            
            setCrmInvolved(crmList);
        } finally {
            setLoadingCrmInvolved(false);
        }
    };

    const handleOpenTaskModal = () => {
        setShowTaskModal(true);
        setTaskTitle('');
        setTaskDescription('');
        setTaskStatus('pending');
        setTaskPriority('medium');
        setTaskStartDate('');
        setTaskDueDate('');
        setTaskCrmLabelId(null);
        setTaskExecutionMode('human');
        setTaskExactPrompt(false);
        setTaskAssignments([]);
        // Carica team members se non già caricati
        if (project && teamMembers.length === 0) {
            loadTeamMembers();
        }
    };

    const handleCloseTaskModal = () => {
        setShowTaskModal(false);
        setShowEditTaskModal(false);
        setTaskTitle('');
        setTaskDescription('');
        setTaskStatus('pending');
        setTaskPriority('medium');
        setTaskStartDate('');
        setTaskDueDate('');
        setTaskCrmLabelId(null);
        setTaskExecutionMode('human');
        setTaskExactPrompt(false);
        setTaskAssignments([]);
    };

    const handleOpenEditTaskModal = (task: CrmProjectTask) => {
        setSelectedTask(task);
        setTaskTitle(task.title);
        setTaskDescription(task.description || '');
        setTaskStatus(task.status);
        setTaskPriority(task.priority);
        setTaskStartDate(task.start_date || '');
        setTaskDueDate(task.due_date || '');
        setTaskAssignments(task.assignments?.filter(a => a.is_active).map(a => ({
            user_id: a.user_id,
            payment_method: a.payment_method,
            hourly_rate_cocchi: a.hourly_rate_cocchi || undefined,
            hours_requested: a.hours_requested || undefined,
            task_rate_cocchi: a.task_rate_cocchi || undefined,
            project_rate_cocchi: a.project_rate_cocchi || undefined,
        })) || []);
        setShowEditTaskModal(true);
    };

    useEffect(() => {
        const editTaskId = searchParams.get('editTask');
        if (!editTaskId || !id || activeTab !== 'tasks' || tasks.length === 0) return;
        const taskIdNum = Number(editTaskId);
        if (Number.isNaN(taskIdNum)) return;
        const task = tasks.find((t) => t.id === taskIdNum);
        if (!task) return;
        handleOpenEditTaskModal(task);
        const next = new URLSearchParams(searchParams);
        next.delete('editTask');
        setSearchParams(next, { replace: true });
    }, [searchParams, tasks, activeTab, id]);

    const handleStartEditProjectName = () => {
        if (!project) return;
        setProjectNameEditValue(project.name);
        setEditingProjectName(true);
    };

    useEffect(() => {
        if (editingProjectName) {
            const t = setTimeout(() => projectNameInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [editingProjectName]);

    const handleSaveProjectName = async () => {
        if (!id || !project) return;
        const trimmed = projectNameEditValue.trim();
        if (trimmed === project.name) {
            setEditingProjectName(false);
            return;
        }
        if (!trimmed) {
            setProjectNameEditValue(project.name);
            setEditingProjectName(false);
            return;
        }
        try {
            const response = await crmProjectsApi.update(Number(id), { name: trimmed });
            setProject(response.data);
            setEditingProjectName(false);
        } catch (error: any) {
            console.error('Error updating project name:', error);
            alert(error.response?.data?.message || 'Errore nel salvare il nome del progetto');
        }
    };

    const handleCancelEditProjectName = () => {
        setProjectNameEditValue(project?.name ?? '');
        setEditingProjectName(false);
    };

    const handleStartEditProjectLinks = () => {
        if (!project) return;
        setProjectLinksEdit({
            github_url: project.github_url || '',
            website_url: project.website_url || '',
        });
        setEditingProjectLinks(true);
    };

    const handleCancelEditProjectLinks = () => {
        setEditingProjectLinks(false);
        setProjectLinksEdit({
            github_url: project?.github_url || '',
            website_url: project?.website_url || '',
        });
    };

    const normalizeProjectUrl = (value: string): string | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    const handleSaveProjectLinks = async () => {
        if (!id || !project) return;
        const payload = {
            github_url: normalizeProjectUrl(projectLinksEdit.github_url),
            website_url: normalizeProjectUrl(projectLinksEdit.website_url),
        };
        if (
            (payload.github_url === (project.github_url || null)) &&
            (payload.website_url === (project.website_url || null))
        ) {
            setEditingProjectLinks(false);
            return;
        }
        try {
            setSavingProjectLinks(true);
            const response = await crmProjectsApi.update(Number(id), payload);
            setProject(response.data);
            setEditingProjectLinks(false);
        } catch (error: any) {
            console.error('Error updating project links:', error);
            const errs = error.response?.data?.errors;
            const msg = errs
                ? Object.values(errs).flat().join(', ')
                : (error.response?.data?.message || 'Errore nel salvare i collegamenti');
            alert(msg);
        } finally {
            setSavingProjectLinks(false);
        }
    };

    const handleMarkTaskCompleted = async (task: CrmProjectTask) => {
        if (!id || task.status === 'completed' || task.status === 'cancelled') return;
        try {
            setCompletingTaskId(task.id);
            await crmProjectTasksApi.update(Number(id), task.id, { status: 'completed' });
            await loadTasks();
            if (selectedTask?.id === task.id) {
                setSelectedTask(prev => prev ? { ...prev, status: 'completed' } : null);
            }
        } catch (error: any) {
            console.error('Error marking task completed:', error);
            alert(error.response?.data?.message || 'Errore nel segnare la task come completata');
        } finally {
            setCompletingTaskId(null);
        }
    };

    const handleUpdateTask = async () => {
        if (!id || !selectedTask || !taskTitle.trim()) {
            alert('Inserisci almeno un titolo per il task');
            return;
        }

        // Filtra le assegnazioni valide
        const validAssignments = taskAssignments.filter(a => 
            a.user_id && a.user_id > 0 && a.payment_method
        );

        try {
            setCreatingTask(true);
            const taskData: any = {
                title: taskTitle,
                description: taskDescription || undefined,
                status: taskStatus,
                priority: taskPriority,
                start_date: taskStartDate || undefined,
                due_date: taskDueDate || undefined,
                assignments: validAssignments.length > 0 ? validAssignments.map(a => ({
                    user_id: a.user_id,
                    payment_method: a.payment_method,
                    hourly_rate_cocchi: a.hourly_rate_cocchi,
                    hours_requested: a.hours_requested,
                    task_rate_cocchi: a.task_rate_cocchi,
                    project_rate_cocchi: a.project_rate_cocchi,
                })) : undefined,
            };

            await crmProjectTasksApi.update(Number(id), selectedTask.id, taskData);
            alert('✓ Task aggiornato con successo!');
            handleCloseTaskModal();
            await loadTasks();
            await loadProject();
        } catch (error: any) {
            console.error('Error updating task:', error);
            if (error.response?.data?.errors) {
                console.error('Validation error:', error.response.data);
            }
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'aggiornamento del task';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setCreatingTask(false);
        }
    };

    const handleDeleteTask = async (task: CrmProjectTask) => {
        if (!id) return;

        if (!confirm(`Sei sicuro di voler eliminare il task "${task.title}"?`)) {
            return;
        }

        try {
            await crmProjectTasksApi.delete(Number(id), task.id);
            alert('✓ Task eliminato con successo!');
            await loadTasks();
            await loadProject();
        } catch (error: any) {
            console.error('Error deleting task:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nell\'eliminazione del task';
            alert(`Errore: ${errorMessage}`);
        }
    };

    const handleReassignTask = async () => {
        if (!id || !selectedTask || !reassignUserId || !reassignDueDate) {
            alert('Seleziona un utente e una data di scadenza');
            return;
        }

        try {
            setReassigningTask(true);
            await crmProjectTasksApi.reassign(Number(id), selectedTask.id, {
                new_user_id: reassignUserId,
                new_due_date: reassignDueDate,
            });
            alert('✓ Task riassegnato con successo!');
            setShowReassignModal(false);
            setReassignUserId(null);
            setReassignDueDate('');
            await loadTasks();
            // Ricarica il task per avere i dati aggiornati
            const taskResponse = await crmProjectTasksApi.getByProject(Number(id));
            const updatedTask = taskResponse.data.find(t => t.id === selectedTask.id);
            if (updatedTask) {
                if (isPmInFreelanceContext) {
                    navigate(`/freelance/task/${updatedTask.id}?projectId=${id}`, {
                        state: { returnTo: `${location.pathname}?tab=tasks` },
                    });
                } else {
                    setSelectedTask(updatedTask);
                    setShowTaskDetail(true);
                }
            }
        } catch (error: any) {
            console.error('Error reassigning task:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nella riassegnazione del task';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setReassigningTask(false);
        }
    };

    const handleCreateTask = async () => {
        if (!id || !taskTitle.trim()) {
            alert('Inserisci almeno un titolo per il task');
            return;
        }

        if (
            (taskExecutionMode === 'human' || taskExecutionMode === 'agent_human') &&
            taskAssignments.filter((a) => a.user_id).length === 0
        ) {
            alert('Per le modalità Umano e Agente + Umano è richiesta almeno un\'assegnazione');
            return;
        }

        try {
            setCreatingTask(true);
            const taskData: any = {
                title: taskTitle,
                description: taskDescription || undefined,
                execution_mode: taskExecutionMode,
                exact_prompt: taskExecutionMode !== 'human' ? taskExactPrompt : false,
                status: taskExecutionMode === 'agent' ? undefined : taskStatus,
                priority: taskPriority,
                start_date: taskStartDate || undefined,
                due_date: taskDueDate || undefined,
                crm_label_id: taskCrmLabelId || undefined,
                assignments: taskAssignments.length > 0 ? taskAssignments : undefined,
            };

            const response = await crmProjectTasksApi.create(Number(id), taskData);
            alert(`✓ ${response.message || 'Task creato con successo!'}`);
            handleCloseTaskModal();
            await loadTasks();
            await loadProject();
        } catch (error: any) {
            console.error('Error creating task:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nella creazione del task';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setCreatingTask(false);
        }
    };

    const handleAddAssignment = () => {
        setTaskAssignments([...taskAssignments, {
            user_id: undefined,
            payment_method: 'hourly' as 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment',
        }]);
    };

    const handleRemoveAssignment = (index: number) => {
        setTaskAssignments(taskAssignments.filter((_, i) => i !== index));
    };

    const handleUpdateAssignment = (index: number, field: string, value: any) => {
        // Usa la forma funzionale di setState per assicurarsi di avere lo stato più recente
        setTaskAssignments(prevAssignments => {
            const updated = [...prevAssignments];
            
            // Assicurati che l'assegnazione esista
            if (!updated[index]) {
                console.error('Assignment at index does not exist:', index);
                return prevAssignments;
            }
            
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Ottieni i metodi di pagamento disponibili per un utente del team
    // Ottieni i metodi di pagamento preferiti per un utente del team
    const getPreferredPaymentMethodsForUser = (userId: number | undefined): Array<'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment'> => {
        if (!userId) return [];
        
        // Cerca il team member
        const teamMember = teamMembers.find(m => m.user_id === userId);
        if (teamMember && teamMember.payment_methods && teamMember.payment_methods.length > 0) {
            return teamMember.payment_methods;
        }
        
        return [];
    };

    // Ottieni il project_rate_cocchi predefinito per un utente
    const getDefaultProjectRateForUser = (userId: number | undefined): number | null => {
        if (!userId) return null;
        const teamMember = teamMembers.find(m => m.user_id === userId);
        return teamMember?.project_rate_cocchi || null;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#FF3B30';
            case 'high': return '#FF9500';
            case 'medium': return '#0A84FF';
            case 'low': return '#34C759';
            default: return '#8E8E93';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#34C759';
            case 'in_progress': return '#0A84FF';
            case 'review': return '#FF9500';
            case 'cancelled': return '#8E8E93';
            case 'pending': return '#FF9500';
            default: return '#8E8E93';
        }
    };

    // Ottieni gli utenti del team del progetto (team members + manager + seller)
    const getTeamUsers = () => {
        const teamUsers: Array<{ id: number; name: string; email?: string; role?: string }> = [];
        const addedUserIds = new Set<number>();
        
        // Aggiungi team members - INCLUDE TUTTI, anche se non hanno la relazione user popolata
        teamMembers.forEach(member => {
            if (!addedUserIds.has(member.user_id)) {
                if (member.user) {
                    // Se la relazione user è popolata, usa i dati completi
                    teamUsers.push({
                        id: member.user_id,
                        name: member.user.name,
                        email: member.user.email,
                        role: member.role || 'Team Member'
                    });
                } else {
                    // Se la relazione user non è popolata, usa almeno l'ID e un nome generico
                    // Questo può succedere se l'utente è stato aggiunto ma la relazione non è stata caricata
                    teamUsers.push({
                        id: member.user_id,
                        name: `Utente #${member.user_id}`,
                        email: undefined,
                        role: member.role || 'Team Member'
                    });
                }
                addedUserIds.add(member.user_id);
            }
        });
        
        // Aggiungi manager se presente
        if (project?.manager && !addedUserIds.has(project.manager.id)) {
            teamUsers.push({
                id: project.manager.id,
                name: project.manager.name,
                email: project.manager.email,
                role: 'Project Manager'
            });
            addedUserIds.add(project.manager.id);
        }
        
        // Aggiungi seller se presente
        if (project?.seller?.user && !addedUserIds.has(project.seller.user.id)) {
            teamUsers.push({
                id: project.seller.user.id,
                name: project.seller.user.name,
                email: project.seller.user.email,
                role: 'Venditore'
            });
            addedUserIds.add(project.seller.user.id);
        }
        
        return teamUsers;
    };

    // Ottieni i CRM assegnati al progetto per la selezione dell'etichetta
    const getAssignedCrms = () => {
        const crms: Array<{ id: number; name: string; code?: string }> = [];
        const addedCrmIds = new Set<number>();
        
        // Da crm_assignments nei settings
        if (project?.settings?.crm_assignments && Array.isArray(project.settings.crm_assignments)) {
            project.settings.crm_assignments.forEach((assignment: any) => {
                const crmId = assignment.crm_department_id;
                if (crmId && !addedCrmIds.has(crmId)) {
                    // Cerca il CRM nella lista caricata per ottenere il nome corretto
                    const crmDepartment = crmDepartments.find(c => c.id === crmId);
                    crms.push({
                        id: crmId,
                        name: crmDepartment?.name || project.crmDepartment?.name || `CRM ${crmId}`,
                        code: crmDepartment?.code || project.crmDepartment?.code
                    });
                    addedCrmIds.add(crmId);
                }
            });
        }
        
        // Aggiungi CRM principale del progetto se presente
        if (project?.crm_department_id && !addedCrmIds.has(project.crm_department_id)) {
            const crmDepartment = crmDepartments.find(c => c.id === project.crm_department_id);
            crms.push({
                id: project.crm_department_id,
                name: crmDepartment?.name || project.crmDepartment?.name || `CRM ${project.crm_department_id}`,
                code: crmDepartment?.code || project.crmDepartment?.code
            });
            addedCrmIds.add(project.crm_department_id);
        }
        
        return crms;
    };

    // Calcola budget rimanente del progetto
    const getRemainingBudget = () => {
        if (!project) return 0;
        const budget = Number(project.budget_cocchi) || 0;
        const spent = Number(project.spent_cocchi) || 0;
        const remaining = budget - spent;
        return isNaN(remaining) ? 0 : remaining;
    };

    // Calcola budget totale delle assegnazioni correnti
    const calculateTotalAssignmentsBudget = () => {
        let total = 0;
        taskAssignments.forEach(assignment => {
            switch (assignment.payment_method) {
                case 'hourly':
                    if (assignment.hourly_rate_cocchi && assignment.hours_requested) {
                        total += (Number(assignment.hourly_rate_cocchi) || 0) * (Number(assignment.hours_requested) || 0);
                    }
                    break;
                case 'per_task':
                    total += Number(assignment.task_rate_cocchi) || 0;
                    break;
                case 'per_project':
                    total += Number(assignment.project_rate_cocchi) || 0;
                    break;
                case 'fixed':
                    // Nessun cocco per pagamento fisso
                    break;
                case 'no_payment':
                    // Nessun pagamento
                    break;
            }
        });
        return total;
    };

    const getProjectStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            in_attesa_presa_carico: '#FF9500',
            preso_in_carico: '#0A84FF',
            avviato: '#34C759',
            active: '#34C759',
            paused: '#FF9500',
            completed: '#0A84FF',
            archived: '#8E8E93',
        };
        return colors[status] || '#0A84FF';
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
            in_attesa_presa_carico: { label: 'In Attesa Presa in Carico', color: '#FF9500', icon: Clock },
            preso_in_carico: { label: 'Preso in Carico', color: '#0A84FF', icon: UserCheck },
            avviato: { label: 'Avviato', color: '#34C759', icon: Play },
            active: { label: 'Attivo', color: '#34C759', icon: CheckCircle2 },
            paused: { label: 'In Pausa', color: '#FF9500', icon: Clock },
            completed: { label: 'Completato', color: '#0A84FF', icon: CheckCircle2 },
            archived: { label: 'Archiviato', color: '#8E8E93', icon: FileText },
        };
        
        const config = statusConfig[status] || statusConfig.active;
        const Icon = config.icon;
        
        return (
            <span className="status-badge" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const getContractStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            requested: { label: 'Richiesta', color: '#FF9500' },
            pending_signature: { label: 'In Attesa Firma', color: '#FF9500' },
            active: { label: 'Attivo', color: '#34C759' },
            completed: { label: 'Completato', color: '#0A84FF' },
            terminated: { label: 'Terminato', color: '#8E8E93' },
        };
        
        const config = statusConfig[status] || { label: status, color: '#8E8E93' };
        
        return (
            <span className="status-badge-small" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };


    const getProgressPercentage = () => {
        if (!project?.budget_cocchi || project.budget_cocchi === 0) return 0;
        return Math.min(100, Math.round((project.spent_cocchi || 0) / project.budget_cocchi * 100));
    };

    const handleOpenDocumentModal = () => {
        if (!project?.contracts || project.contracts.length === 0) {
            alert('Non ci sono contratti associati a questo progetto. Devi prima creare un contratto.');
            return;
        }
        // Se c'è solo un contratto, selezionalo automaticamente
        if (project.contracts.length === 1) {
            setSelectedContractId(project.contracts[0].id);
        } else {
            setSelectedContractId(null);
        }
        setShowDocumentModal(true);
    };

    const handleCloseDocumentModal = () => {
        setShowDocumentModal(false);
        setSelectedContractId(null);
        setDocumentType('other');
        setDocumentName('');
        setDocumentExternalUrl('');
        setDocumentNotes('');
    };

    const handleAddDocument = async () => {
        if (!selectedContractId) {
            alert('Seleziona un contratto');
            return;
        }

        if (!documentName.trim()) {
            alert('Inserisci un nome per il documento');
            return;
        }

        if (!documentExternalUrl.trim()) {
            alert('Inserisci un URL valido per il documento');
            return;
        }

        // Validazione URL base
        try {
            new URL(documentExternalUrl);
        } catch {
            alert('Inserisci un URL valido (deve iniziare con http:// o https://)');
            return;
        }

        try {
            setUploadingDocument(true);
            await contractsApi.uploadSignedDocumentUrl(
                selectedContractId,
                documentExternalUrl,
                documentType,
                documentName,
                undefined,
                documentNotes || undefined
            );
            
            // La risposta ha message o data, quindi è andata a buon fine
            alert('✓ Documento aggiunto con successo!');
            handleCloseDocumentModal();
            
            // Ricarica il progetto per aggiornare i documenti
            await loadProject();
            
            // Se siamo nella tab documenti, ricarica anche i preventivi
            if (activeTab === 'documents') {
                await loadQuotes();
            }
        } catch (error: any) {
            console.error('Errore nell\'aggiunta documento:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Errore nell\'aggiunta del documento';
            alert(`Errore: ${errorMessage}`);
        } finally {
            setUploadingDocument(false);
        }
    };

    if (loading) {
        return (
            <div className="project-detail-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento progetto...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="project-detail-page">
                <div className="error-state">
                    <p>Progetto non trovato</p>
                    <button onClick={handleBack}>Torna ai Progetti</button>
                </div>
            </div>
        );
    }

    const allTabs = [
        { id: 'overview' as TabType, label: 'Panoramica', icon: Briefcase },
        { id: 'client' as TabType, label: 'Cliente', icon: Building2 },
        { id: 'contracts' as TabType, label: 'Contratti', icon: FileText },
        { id: 'quotes' as TabType, label: 'Preventivi', icon: FileText },
        { id: 'documents' as TabType, label: 'Documenti', icon: FileText },
        { id: 'team' as TabType, label: 'Team', icon: Users },
        { id: 'project_manager' as TabType, label: 'Project Manager', icon: UserCheck },
        { id: 'tasks' as TabType, label: 'Task', icon: CheckSquare },
        { id: 'calendar' as TabType, label: 'Calendario', icon: Calendar },
        { id: 'financial' as TabType, label: 'Finanziario', icon: DollarSign },
        { id: 'crm_involved' as TabType, label: 'CRM Coinvolti', icon: FolderOpen },
        { id: 'expenses' as TabType, label: 'Spese', icon: Receipt },
        { id: 'analytics' as TabType, label: 'Analitica', icon: BarChart3 },
        { id: 'cover_photo' as TabType, label: 'Foto copertina', icon: ImageIcon },
        { id: 'workspace' as TabType, label: 'WorkSpace', icon: Monitor },
    ];

    // Filter tabs based on user permissions
    const canAccessWorkspace = user?.role === 'admin' || (project && user?.id === project.manager_id);
    const tabs = allTabs.filter(tab => {
        if (tab.id === 'workspace') {
            return canAccessWorkspace;
        }
        return true;
    });

    return (
        <div className={`project-detail-page pdp-shell ${activeTab !== 'overview' ? 'minimal-mode' : ''} ${activeTab === 'calendar' ? 'calendar-mode' : ''} ${isFreelanceContext ? 'freelance-gestione' : ''}`}>
            {/* Cover Hero Header */}
            <div className="pdp-hero">
                {(coverPreviewUrl || project.cover_photo_url) ? (
                    <img
                        src={coverPreviewUrl || project.cover_photo_url!}
                        alt="Copertina progetto"
                        className="pdp-hero-img"
                    />
                ) : (
                    <div
                        className="pdp-hero-fallback"
                        style={{ '--pdp-dept-color': project.crmDepartment?.color ?? getProjectStatusColor(project.status) } as React.CSSProperties}
                    />
                )}
                <div className="pdp-hero-gradient" />

                {/* Back button top-left */}
                <button className="pdp-hero-back" onClick={handleBack}>
                    <ArrowLeft size={15} />
                    Indietro
                </button>

                {/* Action buttons top-right */}
                <div className="pdp-hero-actions">
                    <button
                        className="pdp-hero-action-btn"
                        onClick={() => handleTabChange('cover_photo')}
                        title="Cambia foto copertina"
                    >
                        <ImageIcon size={15} />
                    </button>
                    {project.website_url && (
                        <a
                            href={project.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pdp-hero-action-btn"
                            title="Apri sito web"
                        >
                            <ExternalLink size={15} />
                        </a>
                    )}
                    {project.github_url && (
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pdp-hero-action-btn"
                            title="Repository GitHub"
                        >
                            <Github size={15} />
                        </a>
                    )}
                </div>

                {/* Project name bottom-left */}
                <div className="pdp-hero-title-row">
                    {canEditProjectName && editingProjectName ? (
                        <input
                            ref={projectNameInputRef}
                            type="text"
                            value={projectNameEditValue}
                            onChange={(e) => setProjectNameEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveProjectName();
                                if (e.key === 'Escape') handleCancelEditProjectName();
                            }}
                            onBlur={handleSaveProjectName}
                            className="pdp-hero-name-input"
                        />
                    ) : (
                        <h1
                            className={`pdp-hero-name${canEditProjectName ? ' pdp-hero-name--editable' : ''}`}
                            onClick={canEditProjectName ? handleStartEditProjectName : undefined}
                            title={canEditProjectName ? 'Clicca per modificare il nome' : undefined}
                        >
                            {project.name}
                            {canEditProjectName && <Edit size={13} className="pdp-hero-name-edit-icon" />}
                        </h1>
                    )}
                </div>
            </div>

            {/* Metrics Bar */}
            <motion.div
                className={`pdp-metrics-bar${heroScrolled ? ' pdp-metrics-bar--stuck' : ''}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <div className="pdp-metrics-inner">
                    {getStatusBadge(project.status)}
                    <span className="pdp-metrics-div" />
                    <div className="pdp-metric">
                        <span className="pdp-metric-label">Budget</span>
                        <span className="pdp-metric-value">{formatCurrency(project.budget_cocchi || 0)}</span>
                    </div>
                    <span className="pdp-metrics-div" />
                    <div className="pdp-metric">
                        <span className="pdp-metric-label">Speso</span>
                        <span className="pdp-metric-value">{formatCurrency(project.spent_cocchi || 0)}</span>
                    </div>
                    <span className="pdp-metrics-div" />
                    <div className="pdp-metric">
                        <span className="pdp-metric-label">Avanzamento</span>
                        <span className="pdp-metric-value">{getProgressPercentage()}%</span>
                    </div>
                    <span className="pdp-metrics-div" />
                    <div className="pdp-metric">
                        <span className="pdp-metric-label">Fine</span>
                        <span className="pdp-metric-value">{formatDate(project.end_date)}</span>
                    </div>
                    {project.manager && (
                        <>
                            <span className="pdp-metrics-div" />
                            <div className="pdp-metric pdp-metric--pm">
                                <div className="pdp-pm-avatar pdp-pm-avatar--placeholder">
                                    <User size={11} />
                                </div>
                                <div className="pdp-metric-stack">
                                    <span className="pdp-metric-label">PM</span>
                                    <span className="pdp-metric-value">{project.manager.name}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Segmented Control Tab Bar */}
            <div className={`pdp-tabs-bar${heroScrolled ? ' pdp-tabs-bar--stuck' : ''}`}>
                <div className="pdp-segmented">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`pdp-seg-btn${activeTab === tab.id ? ' pdp-seg-btn--active' : ''}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {activeTab === tab.id && (
                                <motion.span
                                    layoutId="pdp-seg-active"
                                    className="pdp-seg-bg"
                                    transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                                />
                            )}
                            <span className="pdp-seg-label">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="tab-content-section">
                <div className="tab-content">
                    {/* PANORAMICA — Bento Grid */}
                    {activeTab === 'overview' && (
                        <div className="tab-panel overview-panel">
                            <motion.div
                                className="pd-bento-grid"
                                variants={bentoContainerVariants}
                                initial="hidden"
                                animate="show"
                            >
                                {/* ── Row 1 ── */}

                                {/* 1. Descrizione (4 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-4" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">DESCRIZIONE</span>
                                        {canEditProjectName && (
                                            <button className="pd-bento-action-btn" onClick={handleStartEditProjectName} title="Modifica">
                                                <Edit size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {project.description ? (
                                        <p className="pd-bento-desc-text">{project.description}</p>
                                    ) : (
                                        <div className="pd-bento-empty-state">
                                            <Edit size={22} className="pd-bento-empty-icon" />
                                            <p className="pd-bento-empty-msg">Nessuna descrizione</p>
                                            {canEditProjectName && (
                                                <button className="pd-bento-empty-cta" onClick={handleStartEditProjectName}>
                                                    + Aggiungi descrizione
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* 2. Progresso Ring (2 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-2 pd-bento-card--center" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">PROGRESSO</span>
                                    </div>
                                    <div className="pd-bento-ring-wrapper">
                                        {(() => {
                                            const pct = getProgressPercentage();
                                            const r = 42;
                                            const circ = 2 * Math.PI * r;
                                            const offset = circ * (1 - pct / 100);
                                            const ringColor = pct >= 100 ? '#34C759' : pct >= 75 ? '#FF9500' : pct >= 40 ? '#007AFF' : '#FF3B30';
                                            return (
                                                <svg className="pd-bento-ring-svg" viewBox="0 0 96 96" width="96" height="96">
                                                    <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                                                    <circle
                                                        cx="48" cy="48" r={r}
                                                        fill="none"
                                                        stroke={ringColor}
                                                        strokeWidth="6"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${circ}`}
                                                        strokeDashoffset={`${offset}`}
                                                        transform="rotate(-90 48 48)"
                                                    />
                                                    <text x="48" y="44" textAnchor="middle" className="pd-bento-ring-num">{pct}%</text>
                                                    <text x="48" y="58" textAnchor="middle" className="pd-bento-ring-sub-svg">completato</text>
                                                </svg>
                                            );
                                        })()}
                                    </div>
                                </motion.div>

                                {/* 3. Quick Links (2 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-2" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">COLLEGAMENTI</span>
                                        {canEditProjectLinks && (
                                            <button className="pd-bento-action-btn" onClick={handleStartEditProjectLinks} title="Modifica">
                                                <Edit size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {editingProjectLinks ? (
                                        <div className="pd-bento-links-edit">
                                            <input
                                                type="text"
                                                className="pd-bento-link-input"
                                                value={projectLinksEdit.github_url}
                                                onChange={(e) => setProjectLinksEdit((p) => ({ ...p, github_url: e.target.value }))}
                                                placeholder="GitHub URL"
                                            />
                                            <input
                                                type="text"
                                                className="pd-bento-link-input"
                                                value={projectLinksEdit.website_url}
                                                onChange={(e) => setProjectLinksEdit((p) => ({ ...p, website_url: e.target.value }))}
                                                placeholder="Sito web URL"
                                            />
                                            <div className="pd-bento-links-edit-actions">
                                                <button className="pd-bento-save-btn" onClick={handleSaveProjectLinks} disabled={savingProjectLinks}>
                                                    {savingProjectLinks ? '...' : 'Salva'}
                                                </button>
                                                <button className="pd-bento-cancel-btn" onClick={handleCancelEditProjectLinks} disabled={savingProjectLinks}>
                                                    Annulla
                                                </button>
                                            </div>
                                        </div>
                                    ) : (project.github_url || project.website_url) ? (
                                        <div className="pd-bento-links">
                                            {project.github_url && (
                                                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="pd-bento-link-pill">
                                                    <Github size={14} />
                                                    GitHub
                                                </a>
                                            )}
                                            {project.website_url && (
                                                <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="pd-bento-link-pill">
                                                    <Globe size={14} />
                                                    Sito Web
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="pd-bento-empty-state">
                                            <ExternalLink size={22} className="pd-bento-empty-icon" />
                                            <p className="pd-bento-empty-msg">Nessun collegamento</p>
                                            {canEditProjectLinks && (
                                                <button className="pd-bento-empty-cta" onClick={handleStartEditProjectLinks}>
                                                    + Aggiungi link
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* 4. Date Chiave (4 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-4" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">DATE CHIAVE</span>
                                    </div>
                                    <div className="pd-bento-timeline">
                                        <div className="pd-bento-tl-item">
                                            <div className="pd-bento-tl-dot" style={{ backgroundColor: '#34C759' }} />
                                            <div className="pd-bento-tl-content">
                                                <span className="pd-bento-tl-label">Inizio</span>
                                                <span className="pd-bento-tl-date">{formatDate(project.start_date)}</span>
                                            </div>
                                        </div>
                                        <div className="pd-bento-tl-line" />
                                        <div className="pd-bento-tl-item">
                                            <div className="pd-bento-tl-dot" style={{ backgroundColor: '#007AFF' }} />
                                            <div className="pd-bento-tl-content">
                                                <span className="pd-bento-tl-label">Oggi</span>
                                                <span className="pd-bento-tl-date">
                                                    {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="pd-bento-tl-line" />
                                        <div className="pd-bento-tl-item">
                                            {(() => {
                                                const isOverdue = project.end_date && new Date(project.end_date) < new Date();
                                                return (
                                                    <>
                                                        <div className="pd-bento-tl-dot" style={{ backgroundColor: isOverdue ? '#FF3B30' : '#FF9500' }} />
                                                        <div className="pd-bento-tl-content">
                                                            <span className="pd-bento-tl-label">Scadenza</span>
                                                            <span className="pd-bento-tl-date" style={{ color: isOverdue ? '#FF3B30' : undefined }}>
                                                                {project.end_date ? formatDate(project.end_date) : 'Non definita'}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* ── Row 2 ── */}

                                {/* 5. Ultimi Task (6 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-6" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">ULTIMI TASK</span>
                                        <button className="pd-bento-action-btn" onClick={() => handleTabChange('tasks')} title="Vedi tutti">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                    {tasks.length > 0 ? (
                                        <>
                                            <div className="pd-bento-task-list">
                                                {tasks.slice(-3).reverse().map((task) => {
                                                    const priorityColors: Record<string, string> = {
                                                        low: '#34C759',
                                                        medium: '#FF9500',
                                                        high: '#FF3B30',
                                                        urgent: '#AF52DE',
                                                    };
                                                    const statusColors: Record<string, string> = {
                                                        pending: '#8E8E93',
                                                        in_progress: '#007AFF',
                                                        review: '#FF9500',
                                                        completed: '#34C759',
                                                        cancelled: '#FF3B30',
                                                    };
                                                    const statusLabels: Record<string, string> = {
                                                        pending: 'Atteso',
                                                        in_progress: 'In corso',
                                                        review: 'Review',
                                                        completed: 'Fatto',
                                                        cancelled: 'Annullato',
                                                    };
                                                    const firstAssignee = task.assignments?.find((a) => a.is_active);
                                                    const dotColor = priorityColors[task.priority] ?? '#8E8E93';
                                                    const badgeColor = statusColors[task.status] ?? '#8E8E93';
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className="pd-bento-task-row"
                                                            onClick={() => handleOpenTaskDetail(task)}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenTaskDetail(task); } }}
                                                        >
                                                            <div className="pd-bento-task-dot" style={{ backgroundColor: dotColor }} />
                                                            <span className="pd-bento-task-name">{task.title}</span>
                                                            {firstAssignee?.user && (
                                                                <div className="pd-bento-task-avatar" title={firstAssignee.user.name}>
                                                                    {firstAssignee.user.avatar ? (
                                                                        <img src={firstAssignee.user.avatar} alt={firstAssignee.user.name} />
                                                                    ) : (
                                                                        <span>{firstAssignee.user.name.charAt(0).toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <span
                                                                className="pd-bento-task-badge"
                                                                style={{ backgroundColor: `${badgeColor}22`, color: badgeColor }}
                                                            >
                                                                {statusLabels[task.status] ?? task.status}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button className="pd-bento-footer-link" onClick={() => handleTabChange('tasks')}>
                                                Vedi tutti i task →
                                            </button>
                                        </>
                                    ) : (
                                        <div className="pd-bento-empty-state">
                                            <CheckSquare size={22} className="pd-bento-empty-icon" />
                                            <p className="pd-bento-empty-msg">Nessun task</p>
                                            {canCreateTask && (
                                                <button className="pd-bento-empty-cta" onClick={() => handleTabChange('tasks')}>
                                                    + Aggiungi task
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* 6. Finanze (3 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-3" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">FINANZE</span>
                                        <button className="pd-bento-action-btn" onClick={() => handleTabChange('financial')} title="Vedi finanze">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                    {(() => {
                                        const budget = project.budget_cocchi || 0;
                                        const spent = project.spent_cocchi || 0;
                                        const remaining = budget - spent;
                                        const pct = getProgressPercentage();
                                        const isOver = spent > budget && budget > 0;
                                        const barColor = isOver ? '#FF3B30' : pct > 75 ? '#FF9500' : '#34C759';
                                        return (
                                            <div className="pd-bento-fin-content">
                                                <div className="pd-bento-fin-bar-row">
                                                    <div className="pd-bento-fin-bar">
                                                        <div
                                                            className="pd-bento-fin-bar-fill"
                                                            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
                                                        />
                                                    </div>
                                                    <span className="pd-bento-fin-pct" style={{ color: barColor }}>{pct}%</span>
                                                </div>
                                                <div className="pd-bento-fin-rows">
                                                    <div className="pd-bento-fin-row">
                                                        <span className="pd-bento-fin-label">Budget</span>
                                                        <span className="pd-bento-fin-val">{formatCurrency(budget)}</span>
                                                    </div>
                                                    <div className="pd-bento-fin-row">
                                                        <span className="pd-bento-fin-label">Speso</span>
                                                        <span className="pd-bento-fin-val" style={{ color: isOver ? '#FF3B30' : undefined }}>
                                                            {formatCurrency(spent)}
                                                        </span>
                                                    </div>
                                                    <div className="pd-bento-fin-row">
                                                        <span className="pd-bento-fin-label">Rimasto</span>
                                                        <span className="pd-bento-fin-val" style={{ color: remaining < 0 ? '#FF3B30' : '#34C759' }}>
                                                            {formatCurrency(remaining)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="pd-bento-fin-trend">
                                                    <TrendingUp size={13} style={{ color: barColor, flexShrink: 0 }} />
                                                    <span style={{ color: barColor }}>
                                                        {isOver ? 'Sforamento budget' : pct > 75 ? 'Budget quasi esaurito' : 'Budget in ordine'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </motion.div>

                                {/* 7. Team Avatars (3 cols) */}
                                <motion.div className="pd-bento-card pd-bento-col-3" variants={bentoCardVariants}>
                                    <div className="pd-bento-header">
                                        <span className="pd-bento-label">TEAM</span>
                                        <button className="pd-bento-action-btn" onClick={() => handleTabChange('team')} title="Gestisci team">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                    {(() => {
                                        const allMembers: Array<{ name: string; avatar: string | null; role: string }> = [
                                            ...(project.manager ? [{ name: project.manager.name, avatar: null, role: 'PM' }] : []),
                                            ...teamMembers
                                                .filter((m) => m.is_active && m.user)
                                                .map((m) => ({ name: m.user!.name, avatar: m.user!.avatar, role: m.role })),
                                        ];
                                        const visibleMembers = allMembers.slice(0, 5);
                                        const extraCount = allMembers.length > 5 ? allMembers.length - 5 : 0;
                                        return (
                                            <>
                                                {allMembers.length > 0 ? (
                                                    <>
                                                        <div className="pd-bento-avatar-stack">
                                                            {visibleMembers.map((m, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="pd-bento-avatar"
                                                                    title={`${m.name} · ${m.role}`}
                                                                    style={{ zIndex: 5 - i }}
                                                                >
                                                                    {m.avatar ? (
                                                                        <img src={m.avatar} alt={m.name} />
                                                                    ) : (
                                                                        <span>{m.name.charAt(0).toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {extraCount > 0 && (
                                                                <div className="pd-bento-avatar pd-bento-avatar-more">
                                                                    +{extraCount}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="pd-bento-team-names">
                                                            {visibleMembers.slice(0, 2).map((m) => m.name).join(', ')}
                                                            {visibleMembers.length > 2 && <span className="pd-bento-team-more"> e altri</span>}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <div className="pd-bento-empty-state">
                                                        <Users size={22} className="pd-bento-empty-icon" />
                                                        <p className="pd-bento-empty-msg">Nessun membro</p>
                                                    </div>
                                                )}
                                                <button className="pd-bento-footer-link" onClick={() => handleTabChange('team')}>
                                                    Gestisci team →
                                                </button>
                                            </>
                                        );
                                    })()}
                                </motion.div>
                            </motion.div>
                        </div>
                    )}

                    {/* CLIENTE */}
                    {activeTab === 'client' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Dati Cliente</h2>
                            </div>
                            {project.client ? (
                                <div className="client-detail-card">
                                    <div className="client-header">
                                        <div className="client-icon">
                                            <Building2 size={32} />
                                        </div>
                                        <div>
                                            <h3>{project.client.company_name}</h3>
                                            {project.client.contact_person && (
                                                <p className="client-contact">{project.client.contact_person}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="client-info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Azienda</span>
                                            <span className="info-value">{project.client.company_name}</span>
                                        </div>
                                        {project.client.contact_person && (
                                            <div className="info-item">
                                                <span className="info-label">Persona di Contatto</span>
                                                <span className="info-value">{project.client.contact_person}</span>
                                            </div>
                                        )}
                                        {(project.client as any)?.email && (
                                            <div className="info-item">
                                                <span className="info-label">Email</span>
                                                <span className="info-value">
                                                    <a href={`mailto:${(project.client as any).email}`} className="info-link">
                                                        <Mail size={14} />
                                                        {(project.client as any).email}
                                                    </a>
                                                </span>
                                            </div>
                                        )}
                                        {(project.client as any)?.phone && (
                                            <div className="info-item">
                                                <span className="info-label">Telefono</span>
                                                <span className="info-value">
                                                    <a href={`tel:${(project.client as any).phone}`} className="info-link">
                                                        <Phone size={14} />
                                                        {(project.client as any).phone}
                                                    </a>
                                                </span>
                                            </div>
                                        )}
                                        {(project.client as any)?.address && (
                                            <div className="info-item">
                                                <span className="info-label">Indirizzo</span>
                                                <span className="info-value">
                                                    <MapPin size={14} />
                                                    {(project.client as any).address}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="client-actions">
                                        <button 
                                            className="btn-primary"
                                            onClick={() => navigate(`/venditori/clienti/${project.client_id}`)}
                                        >
                                            <Eye size={16} />
                                            Visualizza Dettagli Cliente
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state-card">
                                    <Building2 size={48} />
                                    <p>Nessun cliente associato a questo progetto</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTRATTI */}
                    {activeTab === 'contracts' && (() => {
                        const contractGroups: Array<{ label: string; items: typeof contracts }> = [
                            { label: 'Attivi', items: contracts.filter(c => c.status === 'active') },
                            { label: 'In Attesa', items: contracts.filter(c => c.status === 'requested' || c.status === 'pending_signature' || c.status === 'draft') },
                            { label: 'Completati', items: contracts.filter(c => c.status === 'completed') },
                            { label: 'Archiviati', items: contracts.filter(c => c.status === 'terminated' || c.status === 'suspended') },
                        ].filter(g => g.items.length > 0);
                        return (
                            <div className="tab-panel">
                                <div className="pd-inset-section-header">
                                    <h2 className="section-title">Contratti</h2>
                                    <div className="pd-inset-section-actions">
                                        <span className="pd-inset-total-count">{contracts.length} {contracts.length === 1 ? 'contratto' : 'contratti'}</span>
                                    </div>
                                </div>
                                {contracts.length > 0 ? (
                                    <div className="pd-inset-groups">
                                        {contractGroups.map(group => (
                                            <div key={group.label} className="pd-inset-group">
                                                <div className="pd-inset-group-header">
                                                    <span className="pd-inset-group-label">{group.label}</span>
                                                    <span className="pd-inset-count-badge">{group.items.length}</span>
                                                </div>
                                                <div className="pd-inset-container">
                                                    {group.items.map((contract, idx) => (
                                                        <div
                                                            key={contract.id}
                                                            className={`pd-inset-row${idx === group.items.length - 1 ? ' pd-inset-row--last' : ''}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => navigate(`/venditori/contratti/${contract.id}`)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/contratti/${contract.id}`); } }}
                                                        >
                                                            <div className="pd-inset-row-icon" style={{ background: 'rgba(10,132,255,0.15)', color: '#0A84FF' }}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div className="pd-inset-row-body">
                                                                <span className="pd-inset-row-primary">{contract.title || contract.contract_number}</span>
                                                                <span className="pd-inset-row-secondary">
                                                                    <span className="pd-inset-row-mono">{contract.contract_number}</span>
                                                                </span>
                                                            </div>
                                                            <div className="pd-inset-row-right">
                                                                {getContractStatusBadge(contract.status)}
                                                                <div className="pd-inset-more-wrap" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="pd-inset-more-btn"
                                                                        onBlur={() => setTimeout(() => setOpenRowMenuId(null), 120)}
                                                                        onClick={() => setOpenRowMenuId(openRowMenuId === `contract-${contract.id}` ? null : `contract-${contract.id}`)}
                                                                        aria-label="Altre azioni"
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </button>
                                                                    {openRowMenuId === `contract-${contract.id}` && (
                                                                        <div className="pd-inset-dropdown">
                                                                            <button className="pd-inset-dropdown-item" onMouseDown={() => { navigate(`/venditori/contratti/${contract.id}`); setOpenRowMenuId(null); }}>
                                                                                <Eye size={14} /> Visualizza
                                                                            </button>
                                                                            <button className="pd-inset-dropdown-item pd-inset-dropdown-item--danger" onMouseDown={() => setOpenRowMenuId(null)}>
                                                                                <Trash2 size={14} /> Elimina
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-card">
                                        <FileText size={48} />
                                        <p>Nessun contratto associato a questo progetto</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* PREVENTIVI */}
                    {activeTab === 'quotes' && (() => {
                        const quoteGroups: Array<{ label: string; items: typeof quotes }> = [
                            { label: 'In Attesa', items: quotes.filter(q => q.status === 'pending' || q.status === 'contract_requested') },
                            { label: 'Attivi', items: quotes.filter(q => q.status === 'started') },
                            { label: 'Accettati', items: quotes.filter(q => q.status === 'approved') },
                            { label: 'Completati', items: quotes.filter(q => q.status === 'completed') },
                            { label: 'Rifiutati', items: quotes.filter(q => q.status === 'rejected') },
                        ].filter(g => g.items.length > 0);
                        return (
                            <div className="tab-panel">
                                <div className="pd-inset-section-header">
                                    <h2 className="section-title">Preventivi</h2>
                                    <div className="pd-inset-section-actions">
                                        <span className="pd-inset-total-count">{quotes.length} {quotes.length === 1 ? 'preventivo' : 'preventivi'}</span>
                                        <button className="pd-inset-add-btn" onClick={handleCreateQuote}>
                                            <Plus size={14} />
                                            Aggiungi
                                        </button>
                                    </div>
                                </div>
                                {quotes.length > 0 ? (
                                    <div className="pd-inset-groups">
                                        {quoteGroups.map(group => (
                                            <div key={group.label} className="pd-inset-group">
                                                <div className="pd-inset-group-header">
                                                    <span className="pd-inset-group-label">{group.label}</span>
                                                    <span className="pd-inset-count-badge">{group.items.length}</span>
                                                </div>
                                                <div className="pd-inset-container">
                                                    {group.items.map((quote, idx) => (
                                                        <div
                                                            key={quote.id}
                                                            className={`pd-inset-row${idx === group.items.length - 1 ? ' pd-inset-row--last' : ''}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/preventivi/${quote.id}`); } }}
                                                        >
                                                            <div className="pd-inset-row-icon" style={{ background: 'rgba(52,199,89,0.15)', color: '#34C759' }}>
                                                                <Receipt size={16} />
                                                            </div>
                                                            <div className="pd-inset-row-body">
                                                                <span className="pd-inset-row-primary">{quote.title || quote.quote_number}</span>
                                                                <span className="pd-inset-row-secondary">
                                                                    <span className="pd-inset-row-mono">{quote.quote_number}</span>
                                                                    {quote.client && (
                                                                        <span>{(quote.client as any).company_name || (quote.client as any).name || ''}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="pd-inset-row-right">
                                                                <span className={`pd-inset-amount${quote.status === 'approved' || quote.status === 'started' ? ' pd-inset-amount--accepted' : ''}`}>
                                                                    {formatCurrency(quote.total_amount || 0)}
                                                                </span>
                                                                <div className="pd-inset-more-wrap" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="pd-inset-more-btn"
                                                                        onBlur={() => setTimeout(() => setOpenRowMenuId(null), 120)}
                                                                        onClick={() => setOpenRowMenuId(openRowMenuId === `quote-${quote.id}` ? null : `quote-${quote.id}`)}
                                                                        aria-label="Altre azioni"
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </button>
                                                                    {openRowMenuId === `quote-${quote.id}` && (
                                                                        <div className="pd-inset-dropdown">
                                                                            <button className="pd-inset-dropdown-item" onMouseDown={() => { navigate(`/venditori/preventivi/${quote.id}`); setOpenRowMenuId(null); }}>
                                                                                <Eye size={14} /> Visualizza
                                                                            </button>
                                                                            <button className="pd-inset-dropdown-item pd-inset-dropdown-item--danger" onMouseDown={() => setOpenRowMenuId(null)}>
                                                                                <Trash2 size={14} /> Elimina
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-card">
                                        <FileText size={48} />
                                        <p>Nessun preventivo associato a questo progetto</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* DOCUMENTI */}
                    {activeTab === 'documents' && (() => {
                        const getDocIcon = (name: string) => {
                            const ext = (name.split('.').pop() || '').toLowerCase();
                            if (ext === 'pdf') return { bg: 'rgba(255,59,48,0.15)', color: '#FF3B30' };
                            if (['doc', 'docx'].includes(ext)) return { bg: 'rgba(0,122,255,0.15)', color: '#007AFF' };
                            if (['xls', 'xlsx', 'csv'].includes(ext)) return { bg: 'rgba(52,199,89,0.15)', color: '#34C759' };
                            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { bg: 'rgba(255,149,0,0.15)', color: '#FF9500' };
                            return { bg: 'rgba(142,142,147,0.15)', color: '#8E8E93' };
                        };

                        const handleDocDownload = async (contractId: number, doc: { id: number; document_name: string; file_path?: string; external_url?: string }) => {
                            if (doc.external_url) {
                                window.open(doc.external_url, '_blank');
                            } else if (doc.file_path) {
                                try {
                                    const blob = await contractsApi.downloadSignedDocument(contractId, doc.id);
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.document_name;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } catch (error) {
                                    console.error('Errore nel download:', error);
                                    alert('Errore nel download del documento');
                                }
                            }
                        };

                        const hasAnyDocuments = quotes.length > 0 || (project.contracts && project.contracts.length > 0);

                        return (
                            <div className="tab-panel">
                                <div className="pd-inset-section-header">
                                    <h2 className="section-title">Documenti</h2>
                                    <div className="pd-inset-section-actions">
                                        <button className="pd-inset-add-btn" onClick={handleOpenDocumentModal}>
                                            <Plus size={14} />
                                            Aggiungi
                                        </button>
                                    </div>
                                </div>
                                {hasAnyDocuments ? (
                                    <div className="pd-inset-groups">
                                        {/* Preventivi group */}
                                        {quotes.length > 0 && (
                                            <div className="pd-inset-group">
                                                <div className="pd-inset-group-header">
                                                    <span className="pd-inset-group-label">Preventivi</span>
                                                    <span className="pd-inset-count-badge">{quotes.length}</span>
                                                </div>
                                                <div className="pd-inset-container">
                                                    {quotes.map((quote, idx) => (
                                                        <div
                                                            key={quote.id}
                                                            className={`pd-inset-row${idx === quotes.length - 1 ? ' pd-inset-row--last' : ''}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/preventivi/${quote.id}`); } }}
                                                        >
                                                            <div className="pd-inset-row-icon" style={{ background: 'rgba(52,199,89,0.15)', color: '#34C759' }}>
                                                                <Receipt size={16} />
                                                            </div>
                                                            <div className="pd-inset-row-body">
                                                                <span className="pd-inset-row-primary">{quote.title || quote.quote_number}</span>
                                                                <span className="pd-inset-row-secondary">Preventivo • {formatDate(quote.created_at)}</span>
                                                            </div>
                                                            <div className="pd-inset-row-right">
                                                                <div className="pd-inset-more-wrap" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="pd-inset-more-btn"
                                                                        onBlur={() => setTimeout(() => setOpenRowMenuId(null), 120)}
                                                                        onClick={() => setOpenRowMenuId(openRowMenuId === `doc-quote-${quote.id}` ? null : `doc-quote-${quote.id}`)}
                                                                        aria-label="Altre azioni"
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </button>
                                                                    {openRowMenuId === `doc-quote-${quote.id}` && (
                                                                        <div className="pd-inset-dropdown">
                                                                            <button className="pd-inset-dropdown-item" onMouseDown={() => { navigate(`/venditori/preventivi/${quote.id}`); setOpenRowMenuId(null); }}>
                                                                                <Eye size={14} /> Visualizza
                                                                            </button>
                                                                            <button className="pd-inset-dropdown-item pd-inset-dropdown-item--danger" onMouseDown={() => setOpenRowMenuId(null)}>
                                                                                <Trash2 size={14} /> Elimina
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Groups by contract name */}
                                        {project.contracts && project.contracts.map((contract) => {
                                            const signedDocs = contract.signedDocuments || [];
                                            return (
                                                <div key={contract.id} className="pd-inset-group">
                                                    <div className="pd-inset-group-header">
                                                        <span className="pd-inset-group-label">{contract.title || contract.contract_number}</span>
                                                        <span className="pd-inset-count-badge">{1 + signedDocs.length}</span>
                                                    </div>
                                                    <div className="pd-inset-container">
                                                        {/* Contract row */}
                                                        <div
                                                            className={`pd-inset-row${signedDocs.length === 0 ? ' pd-inset-row--last' : ''}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => navigate(`/venditori/contratti/${contract.id}`)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/contratti/${contract.id}`); } }}
                                                        >
                                                            <div className="pd-inset-row-icon" style={{ background: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div className="pd-inset-row-body">
                                                                <span className="pd-inset-row-primary">{contract.title || contract.contract_number}</span>
                                                                <span className="pd-inset-row-secondary">Contratto • {formatDate((contract as any).created_at)}</span>
                                                            </div>
                                                            <div className="pd-inset-row-right">
                                                                <div className="pd-inset-more-wrap" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="pd-inset-more-btn"
                                                                        onBlur={() => setTimeout(() => setOpenRowMenuId(null), 120)}
                                                                        onClick={() => setOpenRowMenuId(openRowMenuId === `doc-contract-${contract.id}` ? null : `doc-contract-${contract.id}`)}
                                                                        aria-label="Altre azioni"
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </button>
                                                                    {openRowMenuId === `doc-contract-${contract.id}` && (
                                                                        <div className="pd-inset-dropdown">
                                                                            <button className="pd-inset-dropdown-item" onMouseDown={() => { navigate(`/venditori/contratti/${contract.id}`); setOpenRowMenuId(null); }}>
                                                                                <Eye size={14} /> Visualizza
                                                                            </button>
                                                                            <button className="pd-inset-dropdown-item pd-inset-dropdown-item--danger" onMouseDown={() => setOpenRowMenuId(null)}>
                                                                                <Trash2 size={14} /> Elimina
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Signed document rows */}
                                                        {signedDocs.map((doc, idx) => {
                                                            const iconStyle = getDocIcon(doc.document_name);
                                                            const menuId = `doc-signed-${doc.id}`;
                                                            const hasDownload = !!(doc.external_url || doc.file_path);
                                                            return (
                                                                <div
                                                                    key={doc.id}
                                                                    className={`pd-inset-row${idx === signedDocs.length - 1 ? ' pd-inset-row--last' : ''}`}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => { if (hasDownload) handleDocDownload(contract.id, doc); }}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (hasDownload) handleDocDownload(contract.id, doc); } }}
                                                                >
                                                                    <div className="pd-inset-row-icon" style={{ background: iconStyle.bg, color: iconStyle.color }}>
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <div className="pd-inset-row-body">
                                                                        <span className="pd-inset-row-primary">{doc.document_name}</span>
                                                                        <span className="pd-inset-row-secondary">
                                                                            {formatDate(doc.created_at)}
                                                                            {doc.signed_at && ` • Firmato ${formatDate(doc.signed_at)}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="pd-inset-row-right">
                                                                        <div className="pd-inset-more-wrap" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                className="pd-inset-more-btn"
                                                                                onBlur={() => setTimeout(() => setOpenRowMenuId(null), 120)}
                                                                                onClick={() => setOpenRowMenuId(openRowMenuId === menuId ? null : menuId)}
                                                                                aria-label="Altre azioni"
                                                                            >
                                                                                <MoreHorizontal size={16} />
                                                                            </button>
                                                                            {openRowMenuId === menuId && (
                                                                                <div className="pd-inset-dropdown">
                                                                                    {hasDownload && (
                                                                                        <button className="pd-inset-dropdown-item" onMouseDown={() => { handleDocDownload(contract.id, doc); setOpenRowMenuId(null); }}>
                                                                                            <Download size={14} /> Scarica
                                                                                        </button>
                                                                                    )}
                                                                                    <button className="pd-inset-dropdown-item pd-inset-dropdown-item--danger" onMouseDown={() => setOpenRowMenuId(null)}>
                                                                                        <Trash2 size={14} /> Elimina
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state-card">
                                        <FileText size={48} />
                                        <p>Nessun documento disponibile</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* TEAM */}
                    {activeTab === 'team' && (
                        <div className="tab-panel">
                            <div className="pd-team-grid">
                                {project.manager && (
                                    <div className="pd-team-card">
                                        <div className="pd-team-avatar-wrap">
                                            <div
                                                className="pd-team-avatar pd-team-avatar--pm"
                                                style={{ background: getInitialColor(project.manager.name) }}
                                            >
                                                <span className="pd-team-initials">{getInitials(project.manager.name)}</span>
                                            </div>
                                        </div>
                                        <div className="pd-team-name">{project.manager.name}</div>
                                        <div className="pd-team-role-badge">Project Manager</div>
                                    </div>
                                )}
                                {project.seller?.user && (
                                    <div className="pd-team-card">
                                        <div className="pd-team-avatar-wrap">
                                            <div
                                                className="pd-team-avatar"
                                                style={{ background: getInitialColor(project.seller.user.name) }}
                                            >
                                                <span className="pd-team-initials">{getInitials(project.seller.user.name)}</span>
                                            </div>
                                        </div>
                                        <div className="pd-team-name">{project.seller.user.name}</div>
                                        <div className="pd-team-role-badge">Venditore</div>
                                    </div>
                                )}
                                {teamMembers.map((member) => (
                                    <div key={member.id} className="pd-team-card">
                                        <div className="pd-team-avatar-wrap">
                                            {member.user?.avatar ? (
                                                <img
                                                    className="pd-team-avatar"
                                                    src={member.user.avatar}
                                                    alt={member.user.name}
                                                />
                                            ) : (
                                                <div
                                                    className="pd-team-avatar"
                                                    style={{ background: getInitialColor(member.user?.name || '') }}
                                                >
                                                    <span className="pd-team-initials">{getInitials(member.user?.name || 'U')}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pd-team-name">{member.user?.name || 'Utente'}</div>
                                        <div className="pd-team-role-badge">{member.role}</div>
                                        {(member.payment_methods?.length > 0 || member.project_rate_cocchi != null) && (
                                            <div className="pd-team-payment-row">
                                                {member.payment_methods?.slice(0, 1).map((m) => (
                                                    <span key={m} className="pd-team-pay-method">{PAYMENT_LABELS[m] ?? m}</span>
                                                ))}
                                                {member.project_rate_cocchi != null && (
                                                    <span className="pd-team-cocchi-rate">
                                                        <CocchiIcon size={11} />
                                                        {member.project_rate_cocchi}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="pd-team-actions">
                                            <button
                                                onClick={() => handleOpenEditTeamMemberModal(member)}
                                                disabled={deletingMember}
                                                className="pd-team-action-btn pd-team-action-btn--edit"
                                                title="Modifica membro"
                                            >
                                                <Edit size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTeamMember(member)}
                                                disabled={deletingMember}
                                                className="pd-team-action-btn pd-team-action-btn--remove"
                                                title="Rimuovi membro"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="pd-team-card pd-team-card--add"
                                    onClick={handleOpenTeamMemberModal}
                                >
                                    <Plus size={22} className="pd-team-add-icon" />
                                    <span className="pd-team-add-label">Aggiungi membro</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PROJECT MANAGER - Un solo PM per progetto; i responsabili di reparto CRM si definiscono in Assegna progetto */}
                    {activeTab === 'project_manager' && (
                        <div className="tab-panel">
                            {!project?.manager ? (
                                <div className="pd-pmchat-empty-state">
                                    <UserCheck size={48} />
                                    <p>Nessun Project Manager assegnato</p>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setShowAssignManagerModal(true);
                                            loadAvailableUsers();
                                        }}
                                    >
                                        <Plus size={16} />
                                        Assegna Project Manager
                                    </button>
                                </div>
                            ) : (
                                <div className="pd-pmchat-container">
                                    {/* Header */}
                                    <div className="pd-pmchat-header">
                                        <div className="pd-pmchat-header-info">
                                            <div className="pd-pmchat-header-avatar">
                                                {pmManagerInfo?.avatar ? (
                                                    <img src={pmManagerInfo.avatar} alt={pmManagerInfo.name} />
                                                ) : (
                                                    <span>{getInitials(project.manager.name)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="pd-pmchat-header-name">{project.manager.name}</div>
                                                <div className="pd-pmchat-header-status">
                                                    {pmManagerInfo?.last_access ? (
                                                        <>
                                                            <span className="pd-pmchat-status-dot pd-pmchat-status-dot--online" />
                                                            Ultimo accesso: {formatLastAccess(pmManagerInfo.last_access)}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="pd-pmchat-status-dot pd-pmchat-status-dot--offline" />
                                                            Mai connesso
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => {
                                                setShowAssignManagerModal(true);
                                                loadAvailableUsers();
                                            }}
                                        >
                                            Cambia PM
                                        </button>
                                    </div>

                                    {/* Messages */}
                                    <div className="pd-pmchat-messages">
                                        {pmChatMessages.length === 0 ? (
                                            <div className="pd-pmchat-empty">
                                                <MessageSquare size={40} />
                                                <p>Nessun messaggio ancora</p>
                                                <span>Inizia la conversazione con il Project Manager</span>
                                            </div>
                                        ) : (
                                            pmChatMessages.map((msg, index) => {
                                                const isMyMessage = msg.user_id === user?.id;
                                                const prevMsg = index > 0 ? pmChatMessages[index - 1] : null;
                                                const nextMsg = index < pmChatMessages.length - 1 ? pmChatMessages[index + 1] : null;

                                                const msgDate = new Date(msg.created_at);
                                                const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                                                const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                                                const prevIsSameSender = !!prevMsg && prevMsg.user_id === msg.user_id;
                                                const prevWithin5Min = !!prevMsg && msgDate.getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000;
                                                const isGrouped = prevIsSameSender && prevWithin5Min;

                                                const nextIsSameSender = !!nextMsg && nextMsg.user_id === msg.user_id;
                                                const nextWithin5Min = !!nextMsg && new Date(nextMsg.created_at).getTime() - msgDate.getTime() < 5 * 60 * 1000;
                                                const isLastInGroup = !nextIsSameSender || !nextWithin5Min;

                                                const today = new Date();
                                                const yesterday = new Date(today);
                                                yesterday.setDate(yesterday.getDate() - 1);
                                                let dateLabel = '';
                                                if (msgDate.toDateString() === today.toDateString()) dateLabel = 'Oggi';
                                                else if (msgDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ieri';
                                                else dateLabel = msgDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {showDateSep && (
                                                            <div className="pd-pmchat-date-sep">
                                                                <span>{dateLabel}</span>
                                                            </div>
                                                        )}
                                                        <motion.div
                                                            className={`pd-pmchat-msg-row${isMyMessage ? ' pd-pmchat-msg-row--sent' : ' pd-pmchat-msg-row--recv'}${isGrouped ? ' pd-pmchat-msg-row--grouped' : ''}`}
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.18 }}
                                                        >
                                                            {!isMyMessage && (
                                                                <div className={`pd-pmchat-bubble-avatar${isGrouped ? ' pd-pmchat-bubble-avatar--hidden' : ''}`}>
                                                                    {!isGrouped && (
                                                                        pmManagerInfo?.avatar ? (
                                                                            <img src={pmManagerInfo.avatar} alt="" />
                                                                        ) : (
                                                                            <span>{getInitials(project.manager?.name || 'PM')}</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="pd-pmchat-bubble-col">
                                                                {!isMyMessage && !isGrouped && (
                                                                    <div className="pd-pmchat-sender-name">{msg.user?.name || project.manager?.name}</div>
                                                                )}
                                                                <div className={`pd-pmchat-bubble${isMyMessage ? ' pd-pmchat-bubble--sent' : ' pd-pmchat-bubble--recv'}${isLastInGroup ? ' pd-pmchat-bubble--last' : ''}`}>
                                                                    {msg.message_type === 'image' && (msg.media_url || msg.media_path) && (
                                                                        <div
                                                                            className="pd-pmchat-img-msg"
                                                                            onClick={() => {
                                                                                const imageUrl = msg.media_url || `${window.location.origin}/storage/${msg.media_path}`;
                                                                                window.open(imageUrl, '_blank');
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={msg.media_url || `${window.location.origin}/storage/${msg.media_path}`}
                                                                                alt="Immagine"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {msg.message && (
                                                                        <div className="pd-pmchat-bubble-text">{msg.message}</div>
                                                                    )}
                                                                    <div className="pd-pmchat-bubble-meta">
                                                                        <span className="pd-pmchat-bubble-time">{formatTime(msg.created_at)}</span>
                                                                        {isMyMessage && (
                                                                            <span className="pd-pmchat-read-status">
                                                                                {msg.is_read ? (
                                                                                    <span style={{ color: '#4FC3F7' }}>✓✓</span>
                                                                                ) : (
                                                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>✓</span>
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                        <div ref={chatMessagesEndRef} />
                                    </div>

                                    {/* Input bar */}
                                    <div className="pd-pmchat-input-bar">
                                        <input
                                            type="file"
                                            ref={chatImageInputRef}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setChatImageFile(file);
                                                    setPmChatMessage('');
                                                }
                                            }}
                                        />
                                        <button
                                            className="pd-pmchat-attach-btn"
                                            onClick={() => chatImageInputRef.current?.click()}
                                            title="Allega immagine"
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                        {chatImageFile && (
                                            <div className="pd-pmchat-img-preview">
                                                <img src={URL.createObjectURL(chatImageFile)} alt="Preview" />
                                                <button
                                                    className="pd-pmchat-img-remove"
                                                    onClick={() => {
                                                        setChatImageFile(null);
                                                        if (chatImageInputRef.current) {
                                                            chatImageInputRef.current.value = '';
                                                        }
                                                    }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                        <textarea
                                            className="pd-pmchat-textarea"
                                            placeholder={chatImageFile ? 'Aggiungi un messaggio (opzionale)...' : 'Scrivi un messaggio...'}
                                            value={pmChatMessage}
                                            onChange={(e) => {
                                                setPmChatMessage(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendPmMessage();
                                                }
                                            }}
                                            disabled={sendingMessage}
                                            rows={1}
                                        />
                                        <AnimatePresence>
                                            {(pmChatMessage.trim() || chatImageFile) && (
                                                <motion.button
                                                    type="button"
                                                    className="pd-pmchat-send-btn"
                                                    onClick={handleSendPmMessage}
                                                    disabled={sendingMessage}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                >
                                                    <ArrowUp size={16} />
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TASK */}
                    {activeTab === 'tasks' && (
                        <div className="tab-panel">
                            {/* ── TOOLBAR ── */}
                            <div className="pd-tasks-toolbar">
                                <div className="pd-tasks-toolbar-left">
                                    <span className="pd-tasks-title">Task</span>
                                    <span className="pd-tasks-count">{tasks.length}</span>
                                </div>
                                <div className="pd-tasks-filter-pills">
                                    <button className={`pd-tasks-pill${taskFilterStatus === 'all' && taskFilterPriority === 'all' ? ' active' : ''}`} onClick={() => { setTaskFilterStatus('all'); setTaskFilterPriority('all'); setTaskFilterUser(null); }}>Tutti</button>
                                    <button className={`pd-tasks-pill${taskFilterStatus === 'in_progress' ? ' active' : ''}`} onClick={() => { setTaskFilterStatus('in_progress'); setTaskFilterPriority('all'); }}>In Corso</button>
                                    <button className={`pd-tasks-pill${taskFilterStatus === 'review' ? ' active' : ''}`} onClick={() => { setTaskFilterStatus('review'); setTaskFilterPriority('all'); }}>In Revisione</button>
                                    <button className={`pd-tasks-pill${taskFilterStatus === 'completed' ? ' active' : ''}`} onClick={() => { setTaskFilterStatus('completed'); setTaskFilterPriority('all'); }}>Completati</button>
                                    <button className={`pd-tasks-pill${taskFilterPriority === 'urgent' ? ' active' : ''}`} onClick={() => { setTaskFilterPriority(taskFilterPriority === 'urgent' ? 'all' : 'urgent'); setTaskFilterStatus('all'); }}>Urgenti</button>
                                </div>
                                <div className="pd-tasks-toolbar-right">
                                    {canCreateTask && (
                                        <button className="pd-tasks-new-btn" onClick={handleOpenTaskModal}>
                                            <Plus size={14} />
                                            Nuovo Task
                                        </button>
                                    )}
                                    <div className="pd-tasks-view-toggle">
                                        <button className={`pd-tasks-view-btn${tasksView === 'table' ? ' active' : ''}`} onClick={() => setTasksView('table')} title="Vista Lista"><List size={14} /></button>
                                        <button className={`pd-tasks-view-btn${tasksView === 'cards' ? ' active' : ''}`} onClick={() => setTasksView('cards')} title="Vista Card"><Grid size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* ── ACTIVE FILTER CHIPS ── */}
                            {(taskFilterStatus !== 'all' || taskFilterUser !== null || taskFilterPriority !== 'all') && (
                                <div className="pd-tasks-active-filters">
                                    {taskFilterStatus !== 'all' && (
                                        <span className="pd-tasks-filter-chip">
                                            {taskFilterStatus === 'in_progress' ? 'In Corso' : taskFilterStatus === 'completed' ? 'Completati' : taskFilterStatus === 'review' ? 'In Revisione' : taskFilterStatus === 'cancelled' ? 'Annullati' : 'In Attesa'}
                                            <button className="pd-tasks-chip-remove" onClick={() => setTaskFilterStatus('all')}><X size={10} /></button>
                                        </span>
                                    )}
                                    {taskFilterUser !== null && (
                                        <span className="pd-tasks-filter-chip">
                                            {getTeamUsers().find(u => u.id === taskFilterUser)?.name ?? `Utente #${taskFilterUser}`}
                                            <button className="pd-tasks-chip-remove" onClick={() => setTaskFilterUser(null)}><X size={10} /></button>
                                        </span>
                                    )}
                                    {taskFilterPriority !== 'all' && (
                                        <span className="pd-tasks-filter-chip urgent">
                                            {taskFilterPriority === 'urgent' ? 'Urgenti' : taskFilterPriority === 'high' ? 'Alta' : taskFilterPriority === 'medium' ? 'Media' : 'Bassa'}
                                            <button className="pd-tasks-chip-remove" onClick={() => setTaskFilterPriority('all')}><X size={10} /></button>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* ── RESCHEDULE REQUESTS ── */}
                            {rescheduleRequests.filter(r => r.status === 'pending').length > 0 && (
                                <div className="pd-tasks-reschedule-banner">
                                    <div className="pd-tasks-reschedule-header">
                                        <AlertCircle size={18} color="#FF9500" />
                                        <span className="pd-tasks-reschedule-title">Richieste di Spostamento Data</span>
                                        <span className="pd-tasks-reschedule-count">{rescheduleRequests.filter(r => r.status === 'pending').length}</span>
                                    </div>
                                    <div className="pd-tasks-reschedule-list">
                                        {rescheduleRequests.filter(r => r.status === 'pending').map((req) => (
                                            <div key={req.id} className="pd-tasks-reschedule-item">
                                                <div>
                                                    <div className="pd-tasks-reschedule-task-title">{req.task?.title || 'Task #' + req.crm_project_task_id}</div>
                                                    <div className="pd-tasks-reschedule-meta">
                                                        {req.user?.name} • Da {formatDate(req.current_due_date)} a {formatDate(req.requested_due_date)}
                                                        {req.reason && ` • ${req.reason}`}
                                                    </div>
                                                </div>
                                                <div className="pd-tasks-reschedule-actions">
                                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={async () => {
                                                        if (confirm('Approvare questa richiesta?')) {
                                                            try {
                                                                await crmProjectTasksApi.reviewRescheduleRequest(Number(id), req.id, { status: 'approved' });
                                                                alert('✓ Richiesta approvata');
                                                                await loadRescheduleRequests();
                                                                await loadTasks();
                                                            } catch (error: any) {
                                                                alert('Errore: ' + (error.response?.data?.message || 'Errore sconosciuto'));
                                                            }
                                                        }
                                                    }}>Approva</button>
                                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={async () => {
                                                        const notes = prompt('Motivo del rifiuto (opzionale):');
                                                        if (notes !== null) {
                                                            try {
                                                                await crmProjectTasksApi.reviewRescheduleRequest(Number(id), req.id, { status: 'rejected', review_notes: notes || undefined });
                                                                alert('✓ Richiesta rifiutata');
                                                                await loadRescheduleRequests();
                                                            } catch (error: any) {
                                                                alert('Errore: ' + (error.response?.data?.message || 'Errore sconosciuto'));
                                                            }
                                                        }
                                                    }}>Rifiuta</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {loadingTasks ? (
                                <div className="pd-tasks-loading"><p>Caricamento task...</p></div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="pd-tasks-empty">
                                    <CheckSquare size={40} className="pd-tasks-empty-icon" />
                                    <p className="pd-tasks-empty-title">Nessun task trovato</p>
                                    {canCreateTask && (
                                        <button className="pd-tasks-empty-btn" onClick={handleOpenTaskModal}>
                                            <Plus size={14} />
                                            Crea il primo task
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* ── GROUPING TOGGLE ── */}
                                    <div className="pd-tasks-groupby-row">
                                        <span className="pd-tasks-groupby-label">Raggruppa per:</span>
                                        {(['none', 'status', 'assignee', 'priority'] as const).map(g => (
                                            <button
                                                key={g}
                                                className={`pd-tasks-groupby-pill${taskGroupBy === g ? ' active' : ''}`}
                                                onClick={() => setTaskGroupBy(g)}
                                            >
                                                {g === 'none' ? 'Nessuno' : g === 'status' ? 'Status' : g === 'assignee' ? 'Assegnato' : 'Priorità'}
                                            </button>
                                        ))}
                                    </div>

                                    {tasksView === 'users' && (
                                        <div className="tasks-users-view">
                                            {/* Vista per Utenti - raggruppa per utente assegnato */}
                                            {Array.from(new Set(tasks.flatMap(t => t.assignments?.filter(a => a.is_active).map(a => a.user_id) || []))).map(userId => {
                                                const userTasks = filteredTasks.filter(t => 
                                                    t.assignments?.some(a => a.is_active && a.user_id === userId)
                                                );
                                                const user = userTasks[0]?.assignments?.find(a => a.user_id === userId)?.user;
                                                if (!user) return null;
                                                
                                                return (
                                                    <div key={userId} className="user-task-group">
                                                        <div className="user-task-header">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                {user.avatar ? (
                                                                    <img src={user.avatar} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <User size={20} />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{user.name}</h3>
                                                                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                        {userTasks.length} task
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="user-tasks-list">
                                                            {userTasks.map(task => (
                                                                <div key={task.id} className="task-item" onClick={() => handleOpenTaskDetail(task)}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                                                        <div style={{ flex: 1 }}>
                                                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                                                                                {task.title}
                                                                            </h4>
                                                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                                <span style={{ 
                                                                                    padding: '2px 8px', 
                                                                                    borderRadius: '4px', 
                                                                                    background: getStatusColor(task.status) + '20',
                                                                                    color: getStatusColor(task.status)
                                                                                }}>
                                                                                    {task.status === 'in_progress' ? 'In Corso' : 
                                                                                     task.status === 'completed' ? 'Completato' :
                                                                                     task.status === 'review' ? 'In Revisione' :
                                                                                     task.status === 'cancelled' ? 'Cancellato' : 'In Attesa'}
                                                                                </span>
                                                                                <span style={{ 
                                                                                    padding: '2px 8px', 
                                                                                    borderRadius: '4px', 
                                                                                    background: getPriorityColor(task.priority) + '20',
                                                                                    color: getPriorityColor(task.priority)
                                                                                }}>
                                                                                    {task.priority === 'urgent' ? 'Urgente' :
                                                                                     task.priority === 'high' ? 'Alta' :
                                                                                     task.priority === 'medium' ? 'Media' : 'Bassa'}
                                                                                </span>
                                                                                {task.due_date && (
                                                                                    <span>
                                                                                        <CalendarIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                                                        {formatDate(task.due_date)}
                                                                                    </span>
                                                                                )}
                                                                                {task.budget_cocchi && (
                                                                                    <span>
                                                                                        <CocchiIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                                                        {(Number(task.budget_cocchi) || 0).toFixed(2)} ¢
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {isPmInFreelanceContext && task.status !== 'completed' && task.status !== 'cancelled' && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleMarkTaskCompleted(task);
                                                                                    }}
                                                                                    disabled={completingTaskId === task.id}
                                                                                    style={{
                                                                                        padding: '6px 10px',
                                                                                        background: 'rgba(52, 199, 89, 0.2)',
                                                                                        border: '1px solid rgba(52, 199, 89, 0.3)',
                                                                                        borderRadius: '6px',
                                                                                        color: '#34C759',
                                                                                        cursor: completingTaskId === task.id ? 'wait' : 'pointer',
                                                                                        fontSize: '11px',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '4px',
                                                                                        whiteSpace: 'nowrap'
                                                                                    }}
                                                                                    title="Segna completata"
                                                                                >
                                                                                    {completingTaskId === task.id ? '...' : <CheckCircle2 size={14} />}
                                                                                    Completata
                                                                                </button>
                                                                            )}
                                                                            <div style={{ 
                                                                                width: '60px', 
                                                                                height: '60px', 
                                                                                borderRadius: '8px', 
                                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600
                                                                            }}>
                                                                                {task.progress}%
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {tasksView === 'table' && (
                                        <div className="pd-tasks-grid-container" onClick={() => setActiveTaskRowMenu(null)}>
                                            {/* ── GRID HEADER ── */}
                                            <div className="pd-tasks-grid-header">
                                                <div className="pd-tasks-col pd-tasks-col-checkbox" />
                                                <div className="pd-tasks-col pd-tasks-col-priority">Priorità</div>
                                                <div className="pd-tasks-col pd-tasks-col-title">Titolo</div>
                                                <div className="pd-tasks-col pd-tasks-col-assignee">Assegnato</div>
                                                <div className="pd-tasks-col pd-tasks-col-status">Status</div>
                                                <div className="pd-tasks-col pd-tasks-col-due">Scadenza</div>
                                                <div className="pd-tasks-col pd-tasks-col-actions" />
                                            </div>
                                            {/* ── GRID BODY (with optional grouping) ── */}
                                            {(() => {
                                                const computeGroups = () => {
                                                    if (taskGroupBy === 'status') {
                                                        const order = ['pending', 'in_progress', 'review', 'completed', 'cancelled'] as const;
                                                        const labels: Record<string, string> = { pending: 'In Attesa', in_progress: 'In Corso', review: 'In Revisione', completed: 'Completati', cancelled: 'Annullati' };
                                                        return order.map(s => ({ key: s as string, label: labels[s] as string | null, tasks: filteredTasks.filter(t => t.status === s) })).filter(g => g.tasks.length > 0);
                                                    }
                                                    if (taskGroupBy === 'priority') {
                                                        const order = ['urgent', 'high', 'medium', 'low'] as const;
                                                        const labels: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Bassa' };
                                                        return order.map(p => ({ key: p as string, label: labels[p] as string | null, tasks: filteredTasks.filter(t => t.priority === p) })).filter(g => g.tasks.length > 0);
                                                    }
                                                    if (taskGroupBy === 'assignee') {
                                                        const m = new Map<string, { label: string; tasks: CrmProjectTask[] }>();
                                                        filteredTasks.forEach(task => {
                                                            const active = task.assignments?.filter(a => a.is_active) ?? [];
                                                            if (active.length === 0) {
                                                                if (!m.has('__none')) m.set('__none', { label: 'Non assegnato', tasks: [] });
                                                                m.get('__none')!.tasks.push(task);
                                                            } else {
                                                                active.forEach(a => {
                                                                    const key = `u${a.user_id}`;
                                                                    if (!m.has(key)) m.set(key, { label: a.user?.name ?? `#${a.user_id}`, tasks: [] });
                                                                    m.get(key)!.tasks.push(task);
                                                                });
                                                            }
                                                        });
                                                        return Array.from(m.entries()).map(([k, v]) => ({ key: k, label: v.label as string | null, tasks: v.tasks }));
                                                    }
                                                    return [{ key: 'all', label: null as string | null, tasks: filteredTasks }];
                                                };
                                                return computeGroups().map((group) => (
                                                    <React.Fragment key={group.key}>
                                                        {group.label !== null && (
                                                            <div className="pd-tasks-group-header-row">
                                                                <span className="pd-tasks-group-name">{group.label}</span>
                                                                <span className="pd-tasks-group-badge">{group.tasks.length}</span>
                                                            </div>
                                                        )}
                                                        {group.tasks.map((task, idx) => (
                                                            <div
                                                                key={task.id}
                                                                className={`pd-tasks-grid-row${task.status === 'completed' ? ' completed' : ''}${idx === group.tasks.length - 1 ? ' last' : ''}`}
                                                                onClick={() => handleOpenTaskDetail(task)}
                                                            >
                                                                {/* Checkbox */}
                                                                <div className="pd-tasks-col pd-tasks-col-checkbox" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className={`pd-tasks-checkbox${task.status === 'completed' ? ' checked' : ''}`}
                                                                        onClick={() => { if (task.status !== 'completed') handleMarkTaskCompleted(task); }}
                                                                        disabled={completingTaskId === task.id}
                                                                        title={task.status === 'completed' ? 'Completato' : 'Segna completato'}
                                                                    >
                                                                        {task.status === 'completed' && <CheckCircle2 size={10} />}
                                                                    </button>
                                                                </div>
                                                                {/* Priority dot */}
                                                                <div className="pd-tasks-col pd-tasks-col-priority">
                                                                    <span
                                                                        className="pd-tasks-priority-dot"
                                                                        style={{ background: task.priority === 'urgent' ? '#FF3B30' : task.priority === 'high' ? '#FF9500' : task.priority === 'medium' ? '#007AFF' : 'rgba(255,255,255,0.2)' }}
                                                                        title={task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Bassa'}
                                                                    />
                                                                </div>
                                                                {/* Title */}
                                                                <div className="pd-tasks-col pd-tasks-col-title">
                                                                    <span className={`pd-tasks-task-title${task.status === 'completed' ? ' completed' : ''}`}>
                                                                        {task.title}
                                                                    </span>
                                                                </div>
                                                                {/* Assignee */}
                                                                <div className="pd-tasks-col pd-tasks-col-assignee">
                                                                    {task.assignments && task.assignments.filter(a => a.is_active).length > 0 ? (
                                                                        <div className="pd-tasks-avatar-stack">
                                                                            {task.assignments.filter(a => a.is_active).slice(0, 3).map((assignment, aIdx) => (
                                                                                <div
                                                                                    key={assignment.id}
                                                                                    className="pd-tasks-avatar"
                                                                                    style={{ zIndex: 10 - aIdx, marginLeft: aIdx > 0 ? '-4px' : '0' }}
                                                                                    title={assignment.user?.name}
                                                                                >
                                                                                    {assignment.user?.avatar ? (
                                                                                        <img src={assignment.user.avatar} alt={assignment.user.name} />
                                                                                    ) : (
                                                                                        <span>{assignment.user?.name?.charAt(0) ?? '?'}</span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                            {task.assignments.filter(a => a.is_active).length === 1 && (
                                                                                <span className="pd-tasks-assignee-name">
                                                                                    {task.assignments.find(a => a.is_active)?.user?.name}
                                                                                </span>
                                                                            )}
                                                                            {task.assignments.filter(a => a.is_active).length > 3 && (
                                                                                <span className="pd-tasks-avatar-more">+{task.assignments.filter(a => a.is_active).length - 3}</span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="pd-tasks-unassigned">—</span>
                                                                    )}
                                                                </div>
                                                                {/* Status badge */}
                                                                <div className="pd-tasks-col pd-tasks-col-status">
                                                                    <span className={`pd-tasks-status-badge pd-tasks-status-${task.status}`}>
                                                                        {task.status === 'in_progress' ? 'In Corso' : task.status === 'completed' ? 'Completato' : task.status === 'review' ? 'In Revisione' : task.status === 'cancelled' ? 'Annullato' : 'In Attesa'}
                                                                    </span>
                                                                </div>
                                                                {/* Due date */}
                                                                <div className="pd-tasks-col pd-tasks-col-due">
                                                                    {task.due_date ? (
                                                                        <span style={{ fontSize: '12px', color: (() => { const d = new Date(task.due_date); d.setHours(0,0,0,0); const n = new Date(); n.setHours(0,0,0,0); return d < n ? '#FF3B30' : d.getTime() === n.getTime() ? '#FF9500' : 'rgba(255,255,255,0.4)'; })() }}>
                                                                            {formatDate(task.due_date)}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
                                                                    )}
                                                                </div>
                                                                {/* Row actions (three-dot menu) */}
                                                                <div className="pd-tasks-col pd-tasks-col-actions" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="pd-tasks-actions-wrap">
                                                                        <button
                                                                            className="pd-tasks-more-btn"
                                                                            onClick={() => setActiveTaskRowMenu(activeTaskRowMenu === task.id ? null : task.id)}
                                                                            title="Azioni"
                                                                        >
                                                                            <MoreHorizontal size={14} />
                                                                        </button>
                                                                        {activeTaskRowMenu === task.id && (
                                                                            <div className="pd-tasks-row-menu">
                                                                                <button className="pd-tasks-row-menu-item" onClick={() => { handleOpenTaskDetail(task); setActiveTaskRowMenu(null); }}>
                                                                                    <Eye size={13} /> Visualizza
                                                                                </button>
                                                                                {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                                                    <button className="pd-tasks-row-menu-item" onClick={() => { handleOpenEditTaskModal(task); setActiveTaskRowMenu(null); }}>
                                                                                        <Edit size={13} /> Riassegna
                                                                                    </button>
                                                                                )}
                                                                                {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                                                    <button className="pd-tasks-row-menu-item danger" onClick={() => { handleDeleteTask(task); setActiveTaskRowMenu(null); }}>
                                                                                        <Trash2 size={13} /> Elimina
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </React.Fragment>
                                                ));
                                            })()}
                                        </div>
                                    )}

                                    {tasksView === 'cards' && (
                                        <div className="pd-tasks-cards-view">
                                            {filteredTasks.map(task => (
                                                <div key={task.id} className="pd-tasks-card" onClick={() => handleOpenTaskDetail(task)}>
                                                    <div className="pd-tasks-card-header">
                                                        <h3 className={`pd-tasks-card-title${task.status === 'completed' ? ' completed' : ''}`}>{task.title}</h3>
                                                        <span className={`pd-tasks-status-badge pd-tasks-status-${task.status}`}>
                                                            {task.status === 'in_progress' ? 'In Corso' : task.status === 'completed' ? 'Completato' : task.status === 'review' ? 'In Revisione' : task.status === 'cancelled' ? 'Annullato' : 'In Attesa'}
                                                        </span>
                                                    </div>
                                                    {task.description && (
                                                        <p className="pd-tasks-card-desc">{task.description}</p>
                                                    )}
                                                    <div className="pd-tasks-card-meta">
                                                        <span className="pd-tasks-card-priority">
                                                            <span className="pd-tasks-priority-dot" style={{ background: task.priority === 'urgent' ? '#FF3B30' : task.priority === 'high' ? '#FF9500' : task.priority === 'medium' ? '#007AFF' : 'rgba(255,255,255,0.2)' }} />
                                                            {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Bassa'}
                                                        </span>
                                                        {task.due_date && (
                                                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: (() => { const d = new Date(task.due_date); d.setHours(0,0,0,0); const n = new Date(); n.setHours(0,0,0,0); return d < n ? '#FF3B30' : d.getTime() === n.getTime() ? '#FF9500' : 'rgba(255,255,255,0.4)'; })() }}>
                                                                <CalendarIcon size={12} />{formatDate(task.due_date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.assignments && task.assignments.filter(a => a.is_active).length > 0 && (
                                                        <div className="pd-tasks-avatar-stack" style={{ marginTop: '10px' }}>
                                                            {task.assignments.filter(a => a.is_active).slice(0, 3).map((assignment, aIdx) => (
                                                                <div key={assignment.id} className="pd-tasks-avatar" style={{ zIndex: 10 - aIdx, marginLeft: aIdx > 0 ? '-4px' : '0' }} title={assignment.user?.name}>
                                                                    {assignment.user?.avatar ? (
                                                                        <img src={assignment.user.avatar} alt={assignment.user.name} />
                                                                    ) : (
                                                                        <span>{assignment.user?.name?.charAt(0) ?? '?'}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {task.assignments.filter(a => a.is_active).length === 1 && (
                                                                <span className="pd-tasks-assignee-name">{task.assignments.find(a => a.is_active)?.user?.name}</span>
                                                            )}
                                                            {task.assignments.filter(a => a.is_active).length > 3 && (
                                                                <span className="pd-tasks-avatar-more">+{task.assignments.filter(a => a.is_active).length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="pd-tasks-card-progress">
                                                        <div className="pd-tasks-card-progress-bar">
                                                            <div className="pd-tasks-card-progress-fill" style={{ width: `${task.progress}%`, background: getStatusColor(task.status) }} />
                                                        </div>
                                                        <span className="pd-tasks-card-progress-label">{task.progress}%</span>
                                                    </div>
                                                    <div className="pd-tasks-card-actions" onClick={(e) => e.stopPropagation()}>
                                                        <button className="pd-tasks-card-btn" onClick={() => handleOpenTaskDetail(task)}>
                                                            <Eye size={13} /> Dettagli
                                                        </button>
                                                        {isPmInFreelanceContext && task.status !== 'completed' && task.status !== 'cancelled' && (
                                                            <button className="pd-tasks-card-btn success" onClick={() => handleMarkTaskCompleted(task)} disabled={completingTaskId === task.id}>
                                                                <CheckCircle2 size={13} /> {completingTaskId === task.id ? '...' : 'Completata'}
                                                            </button>
                                                        )}
                                                        {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                            <>
                                                                <button className="pd-tasks-card-btn" onClick={() => handleOpenEditTaskModal(task)}>
                                                                    <Edit size={13} /> Modifica
                                                                </button>
                                                                <button className="pd-tasks-card-btn danger" onClick={() => handleDeleteTask(task)}>
                                                                    <Trash2 size={13} /> Elimina
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* CALENDARIO */}
                    {activeTab === 'calendar' && project && (
                        <div className="tab-panel calendar-tab-panel">
                            <ProjectCalendar
                                projectId={project.id}
                                tasks={tasks}
                            />
                        </div>
                    )}

                    {/* FINANZIARIO */}
                    {activeTab === 'financial' && (() => {
                        const _budget   = project.budget_cocchi || 0;
                        const _spent    = project.spent_cocchi  || 0;
                        const _avail    = _budget - _spent;
                        const _pct      = _budget > 0 ? Math.min((_spent / _budget) * 100, 100) : 0;
                        const _barColor = _pct >= 90 ? '#FF3B30' : _pct >= 70 ? '#FF9500' : '#34C759';
                        return (
                        <div className="tab-panel">
                            <div className="pd-fin-layout">

                                {/* ── LEFT COLUMN: Financial Summary ── */}
                                <div className="pd-fin-left">

                                    {/* 1. Riepilogo Principale */}
                                    <div className="pd-fin-section-label">Riepilogo Principale</div>
                                    <div className="pd-fin-card pd-fin-summary-card">
                                        <div className="pd-fin-card-header">
                                            <span className="pd-fin-card-title">Budget &amp; Spese</span>
                                            <button
                                                className="pd-fin-extra-budget-btn"
                                                onClick={() => setShowExtraBudgetModal(true)}
                                                title="Aggiungi budget extra"
                                            >
                                                <Plus size={13} />
                                                Budget Extra
                                            </button>
                                        </div>

                                        {/* 3 stat tiles */}
                                        <div className="pd-fin-stat-tiles-row">
                                            <div className="pd-fin-stat-tile">
                                                <div className="pd-fin-stat-trend pd-fin-trend-blue">
                                                    <TrendingUp size={11} />
                                                </div>
                                                <div className="pd-fin-stat-value">{formatCurrency(_budget)}</div>
                                                <div className="pd-fin-stat-label">Budget Totale</div>
                                            </div>
                                            <div className="pd-fin-stat-tile">
                                                <div className="pd-fin-stat-trend pd-fin-trend-orange">
                                                    <ArrowUp size={11} />
                                                </div>
                                                <div className="pd-fin-stat-value">{formatCurrency(_spent)}</div>
                                                <div className="pd-fin-stat-label">Speso</div>
                                            </div>
                                            <div className="pd-fin-stat-tile">
                                                <div className={`pd-fin-stat-trend ${_avail < 0 ? 'pd-fin-trend-red' : 'pd-fin-trend-green'}`}>
                                                    {_avail < 0 ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
                                                </div>
                                                <div className={`pd-fin-stat-value ${_avail < 0 ? 'pd-fin-negative' : 'pd-fin-positive'}`}>
                                                    {formatCurrency(_avail)}
                                                </div>
                                                <div className="pd-fin-stat-label">Disponibile</div>
                                            </div>
                                        </div>

                                        {/* Budget utilization bar */}
                                        <div className="pd-fin-utilization">
                                            <div className="pd-fin-util-header">
                                                <span className="pd-fin-util-label">Utilizzo Budget</span>
                                                <span className="pd-fin-util-pct" style={{ color: _barColor }}>
                                                    {_pct.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="pd-fin-progress-track">
                                                <div
                                                    className="pd-fin-progress-fill"
                                                    style={{ width: `${_pct}%`, backgroundColor: _barColor }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Transazioni Recenti */}
                                    <div className="pd-fin-section-label">Transazioni Recenti</div>
                                    <div className="pd-fin-card pd-fin-inset-card">
                                        {financialTransactions.length === 0 ? (
                                            <div className="pd-fin-empty-row">Nessuna transazione</div>
                                        ) : (
                                            <>
                                                {financialTransactions.slice(0, 5).map((t: any, idx: number) => {
                                                    const isIncome = t.type === 'entrata';
                                                    const amt = parseFloat(t.amount_cocchi || t.amount || 0);
                                                    const rawDate = t.transaction_date || t.date || t.created_at || null;
                                                    return (
                                                        <div key={t.id ?? idx} className="pd-fin-tx-row">
                                                            <div className={`pd-fin-tx-icon ${isIncome ? 'pd-fin-icon-green' : 'pd-fin-icon-red'}`}>
                                                                {isIncome ? <TrendingUp size={14} /> : <Receipt size={14} />}
                                                            </div>
                                                            <div className="pd-fin-tx-info">
                                                                <span className="pd-fin-tx-desc">
                                                                    {t.description || t.category || (isIncome ? 'Entrata' : 'Uscita')}
                                                                </span>
                                                            </div>
                                                            <div className="pd-fin-tx-meta">
                                                                <span className="pd-fin-tx-date">{formatDate(rawDate)}</span>
                                                                <span className={`pd-fin-tx-amount ${isIncome ? 'pd-fin-positive' : 'pd-fin-negative'}`}>
                                                                    {isIncome ? '+' : '-'}{formatCurrency(Math.abs(amt))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {financialTransactions.length > 5 && (
                                                    <div className="pd-fin-footer-link">
                                                        Vedi tutte le transazioni →
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* 3. Spese Progetto */}
                                    <div className="pd-fin-section-label">Spese Progetto</div>
                                    <div className="pd-fin-card pd-fin-inset-card">
                                        {projectExpenses.length === 0 ? (
                                            <div className="pd-fin-empty-row">Nessuna spesa di progetto</div>
                                        ) : (
                                            <>
                                                {projectExpenses.slice(0, 5).map((exp, idx) => (
                                                    <div key={exp.id ?? idx} className="pd-fin-tx-row">
                                                        <div className="pd-fin-tx-icon pd-fin-icon-orange">
                                                            <Receipt size={14} />
                                                        </div>
                                                        <div className="pd-fin-tx-info">
                                                            <span className="pd-fin-tx-desc">{exp.title}</span>
                                                        </div>
                                                        <div className="pd-fin-tx-meta">
                                                            <span className="pd-fin-tx-date">{formatDate(exp.expense_date)}</span>
                                                            <span className="pd-fin-tx-amount pd-fin-negative">
                                                                -{formatCurrency(exp.amount_cocchi)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {projectExpenses.length > 5 && (
                                                    <div className="pd-fin-footer-link">
                                                        Vedi tutte le spese →
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* ── RIGHT COLUMN: Calendar ── */}
                                <div className="pd-fin-right">
                                    <div className="pd-fin-section-label">Calendario Finanziario</div>
                                    <div className="pd-fin-card pd-fin-calendar-wrap">
                                        <FinancialCalendar
                                            projectId={Number(id)}
                                            transactions={financialTransactions.map((t: any) => ({
                                                id: t.id,
                                                type: t.type,
                                                amount: parseFloat(t.amount_cocchi || t.amount || 0),
                                                description: t.description || '',
                                                date: new Date(t.transaction_date || t.date || t.created_at),
                                                category: t.category
                                            }))}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                        );
                    })()}

                    {/* CRM COINVOLTI */}
                    {activeTab === 'crm_involved' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">CRM Coinvolti</h2>
                            </div>
                            {loadingCrmInvolved ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Caricamento...</p>
                                </div>
                            ) : crmInvolved.length > 0 ? (
                                <div className="crm-involved-list">
                                    {crmInvolved.map((crm) => (
                                        <div key={crm.id} className="crm-involved-card">
                                            <div className="crm-involved-header">
                                                <div className="crm-involved-icon">
                                                    <FolderOpen size={24} />
                                                </div>
                                                <div className="crm-involved-info">
                                                    <h3 className="crm-involved-name">{crm.name}</h3>
                                                    <p className="crm-involved-meta">
                                                        {crm.total_budget_added > 0 ? `Budget aggiunto: ${formatCurrency(crm.total_budget_added)}` : 'CRM assegnato'}
                                                        {crm.first_added_at && ` • ${formatDate(crm.first_added_at)}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="crm-involved-instructions">
                                                <h4 className="instructions-title">Istruzioni Project Manager</h4>
                                                <div className="instructions-placeholder">
                                                    <MessageSquare size={20} />
                                                    <p>Nessuna istruzione disponibile</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state-card">
                                    <FolderOpen size={48} />
                                    <p>Nessun CRM coinvolto in questo progetto</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SPESE */}
                    {activeTab === 'expenses' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Spese</h2>
                                <button 
                                    className="btn-primary"
                                    onClick={() => setShowExpenseModal(true)}
                                >
                                    <Plus size={16} />
                                    Aggiungi Spesa
                                </button>
                            </div>
                            
                            {loadingExpenses ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Caricamento spese...</p>
                                </div>
                            ) : (
                                <div className="expenses-container">
                                    {/* Spese di Progetto */}
                                    <div className="expenses-section">
                                        <h3 className="expenses-section-title">Spese di Progetto</h3>
                                        {projectExpenses.length > 0 ? (
                                            <div className="expenses-list">
                                                {projectExpenses.map((expense) => (
                                                    <div key={expense.id} className="expense-card">
                                                        <div className="expense-header">
                                                            <div className="expense-icon">
                                                                <Receipt size={20} />
                                                            </div>
                                                            <div className="expense-info">
                                                                <h4 className="expense-title">{expense.title}</h4>
                                                                <p className="expense-meta">
                                                                    {formatDate(expense.expense_date)} • {formatCurrency(expense.amount_cocchi)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {expense.description && (
                                                            <p className="expense-description">{expense.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state-small">
                                                <p>Nessuna spesa di progetto</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Spese da Approvare */}
                                    <div className="expenses-section">
                                        <h3 className="expenses-section-title">Spese da Approvare</h3>
                                        {pendingExpenses.length > 0 ? (
                                            <div className="expenses-list">
                                                {pendingExpenses.map((expense) => (
                                                    <div key={expense.id} className="expense-card pending">
                                                        <div className="expense-header">
                                                            <div className="expense-icon">
                                                                <AlertCircle size={20} />
                                                            </div>
                                                            <div className="expense-info">
                                                                <h4 className="expense-title">{expense.title}</h4>
                                                                <p className="expense-meta">
                                                                    {formatDate(expense.expense_date)} • {formatCurrency(expense.amount_cocchi)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="expense-actions">
                                                            <button className="btn-secondary">Approva</button>
                                                            <button className="btn-secondary">Rifiuta</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state-small">
                                                <p>Nessuna spesa in attesa di approvazione</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Richieste di Rimborso */}
                                    <div className="expenses-section">
                                        <h3 className="expenses-section-title">Richieste di Rimborso</h3>
                                        {reimbursementRequests.length > 0 ? (
                                            <div className="expenses-list">
                                                {reimbursementRequests.map((request) => (
                                                    <div key={request.id} className="expense-card reimbursement">
                                                        <div className="expense-header">
                                                            <div className="expense-icon">
                                                                <CreditCard size={20} />
                                                            </div>
                                                            <div className="expense-info">
                                                                <h4 className="expense-title">{request.title}</h4>
                                                                <p className="expense-meta">
                                                                    {request.user_name || 'Utente'} • {formatDate(request.expense_date)} • {formatCurrency(request.amount_cocchi)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {request.description && (
                                                            <p className="expense-description">{request.description}</p>
                                                        )}
                                                        {request.receipt_file_path && (
                                                            <div className="expense-receipt">
                                                                <img 
                                                                    src={request.receipt_file_path} 
                                                                    alt="Ricevuta" 
                                                                    style={{ maxWidth: '200px', borderRadius: '8px' }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="expense-status">
                                                            <span className={`status-badge-small ${request.status === 'pending' ? 'pending' : request.status === 'approved' ? 'approved' : 'rejected'}`}>
                                                                {request.status === 'pending' ? 'In Attesa' : request.status === 'approved' ? 'Approvato' : 'Rifiutato'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state-small">
                                                <p>Nessuna richiesta di rimborso</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Spese per Utenti */}
                                    <div className="expenses-section">
                                        <h3 className="expenses-section-title">Spese per Utenti</h3>
                                        {userExpenses.length > 0 ? (
                                            <div className="expenses-list">
                                                {userExpenses.map((expense) => (
                                                    <div key={expense.id} className="expense-card user-expense">
                                                        <div className="expense-header">
                                                            <div className="expense-icon">
                                                                <User size={20} />
                                                            </div>
                                                            <div className="expense-info">
                                                                <h4 className="expense-title">{expense.title}</h4>
                                                                <p className="expense-meta">
                                                                    {expense.user_name || 'Utente'} • {formatDate(expense.expense_date)} • {formatCurrency(expense.amount_cocchi)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {expense.description && (
                                                            <p className="expense-description">{expense.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state-small">
                                                <p>Nessuna spesa per utenti</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANALITICA */}
                    {activeTab === 'analytics' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Analitica</h2>
                            </div>
                            <div className="analytics-grid">
                                <div className="analytics-card">
                                    <h3 className="card-title">Analisi Spese</h3>
                                    <div className="analytics-placeholder">
                                        <BarChart3 size={48} />
                                        <p>Grafici e analisi delle spese</p>
                                        <p className="placeholder-subtitle">Visualizzazione dettagliata delle spese per categoria</p>
                                    </div>
                                </div>
                                <div className="analytics-card">
                                    <h3 className="card-title">Performance Team</h3>
                                    <div className="analytics-placeholder">
                                        <Users size={48} />
                                        <p>Performance del team</p>
                                        <p className="placeholder-subtitle">Metriche e statistiche sulle prestazioni del team</p>
                                    </div>
                                </div>
                                <div className="analytics-card">
                                    <h3 className="card-title">Performance Progetto</h3>
                                    <div className="analytics-placeholder">
                                        <Target size={48} />
                                        <p>Performance del progetto</p>
                                        <p className="placeholder-subtitle">KPI e metriche di successo del progetto</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FOTO COPERTINA */}
                    {activeTab === 'cover_photo' && (
                        <div className="tab-panel cover-photo-panel">
                            <div className="section-header">
                                <h2 className="section-title">Foto copertina</h2>
                            </div>
                            <p className="cover-photo-description">
                                Carica un'immagine da usare come copertina del progetto. Verrà mostrata nell'intestazione della pagina e nelle card della lista progetti.
                            </p>
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                className="cover-photo-input"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !id) return;
                                    // Revoca eventuale anteprima precedente
                                    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                                    // Anteprima locale immediata
                                    const objectUrl = URL.createObjectURL(file);
                                    setCoverPreviewUrl(objectUrl);
                                    setUploadingCover(true);
                                    try {
                                        const res = await crmProjectsApi.uploadCoverPhoto(Number(id), file);
                                        if (res.data) {
                                            setProject(res.data);
                                            if (objectUrl) URL.revokeObjectURL(objectUrl);
                                            setCoverPreviewUrl(null);
                                        }
                                    } catch (err) {
                                        console.error('Errore upload copertina:', err);
                                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                                        setCoverPreviewUrl(null);
                                    } finally {
                                        setUploadingCover(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <div className="cover-photo-actions">
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={uploadingCover}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    {uploadingCover ? 'Caricamento...' : 'Carica foto copertina'}
                                </button>
                            </div>
                            {/* Anteprima: sempre visibile in questa vista */}
                            <div className="cover-photo-preview-wrapper">
                                <p className="cover-photo-label">Anteprima</p>
                                {project.cover_photo_url || coverPreviewUrl ? (
                                    <div className="cover-photo-preview">
                                        <img
                                            src={project.cover_photo_url || coverPreviewUrl || ''}
                                            alt="Copertina progetto"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                ) : (
                                    <div className="cover-photo-placeholder">
                                        <ImageIcon size={48} />
                                        <span>Nessuna copertina caricata. Carica un'immagine per vedere l'anteprima.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* WORKSPACE */}
                    {activeTab === 'workspace' && project && (
                        <WorkspaceTab projectId={project.id} project={project} />
                    )}
                </div>
            </div>

            {/* Modal Aggiungi Documento */}
            {showDocumentModal && (
                <div className="modal-overlay" onClick={handleCloseDocumentModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Aggiungi Documento</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseDocumentModal}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {project?.contracts && project.contracts.length > 1 ? (
                                <div className="form-group">
                                    <label>Contratto *</label>
                                    <select
                                        value={selectedContractId || ''}
                                        onChange={(e) => setSelectedContractId(Number(e.target.value))}
                                        className="form-input"
                                        required
                                    >
                                        <option value="">Seleziona un contratto</option>
                                        {project.contracts.map((contract) => (
                                            <option key={contract.id} value={contract.id}>
                                                {contract.title || contract.contract_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : project?.contracts && project.contracts.length === 1 ? (
                                <div className="form-group">
                                    <label>Contratto</label>
                                    <div className="form-input" style={{ 
                                        background: 'rgba(10, 132, 255, 0.1)', 
                                        borderColor: 'rgba(10, 132, 255, 0.3)',
                                        color: '#0A84FF',
                                        cursor: 'default'
                                    }}>
                                        {project.contracts[0].title || project.contracts[0].contract_number}
                                    </div>
                                </div>
                            ) : null}

                            <div className="form-group">
                                <label>Tipo Documento</label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value as any)}
                                    className="form-input"
                                >
                                    <option value="privacy_policy">Privacy Policy</option>
                                    <option value="consent_personal_data">Consenso Trattamento Dati</option>
                                    <option value="other">Altro</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nome Documento *</label>
                                <input
                                    type="text"
                                    value={documentName}
                                    onChange={(e) => setDocumentName(e.target.value)}
                                    placeholder="Es: Privacy Policy v2.0"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>URL Esterno * (es. Google Drive)</label>
                                <input
                                    type="url"
                                    value={documentExternalUrl}
                                    onChange={(e) => setDocumentExternalUrl(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="form-input"
                                    required
                                    disabled={uploadingDocument}
                                />
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Inserisci il link al documento (Google Drive, Dropbox, ecc.)
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Note (opzionale)</label>
                                <textarea
                                    value={documentNotes}
                                    onChange={(e) => setDocumentNotes(e.target.value)}
                                    placeholder="Note aggiuntive sul documento"
                                    className="form-input"
                                    rows={3}
                                    disabled={uploadingDocument}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCloseDocumentModal}
                                disabled={uploadingDocument}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAddDocument}
                                disabled={uploadingDocument || !documentName.trim() || !documentExternalUrl.trim() || !selectedContractId}
                            >
                                <Plus size={16} />
                                {uploadingDocument ? 'Aggiunta in corso...' : 'Aggiungi Documento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Aggiungi Membro Team */}
            {showTeamMemberModal && (
                <div className="modal-overlay" onClick={handleCloseTeamMemberModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Aggiungi Membro al Team</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseTeamMemberModal}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Persona *</label>
                                <select
                                    value={selectedUserId || ''}
                                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                                    className="form-input"
                                    required
                                    disabled={loadingUsers || addingMember}
                                >
                                    <option value="">Seleziona una persona</option>
                                    {availableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} {user.email && `(${user.email})`}
                                        </option>
                                    ))}
                                </select>
                                {loadingUsers && (
                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Caricamento utenti...
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Ruolo nel Progetto *</label>
                                <input
                                    type="text"
                                    value={memberRole}
                                    onChange={(e) => setMemberRole(e.target.value)}
                                    placeholder="Es: Sviluppatore, Designer, Copywriter..."
                                    className="form-input"
                                    required
                                    disabled={addingMember}
                                />
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Specifica il ruolo che questa persona avrà nel progetto
                                </small>
                            </div>

                            <div className="form-divider"></div>

                            <div className="form-group">
                                <label>Metodi di Pagamento *</label>
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
                                    Seleziona uno o più metodi di pagamento disponibili per questo utente
                                </small>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { value: 'hourly', label: 'A Ore', description: 'Pagamento basato su ore lavorate' },
                                        { value: 'per_task', label: 'A Task', description: 'Pagamento fisso per ogni task completato' },
                                        { value: 'per_project', label: 'A Progetto', description: 'Pagamento fisso per l\'intero progetto' },
                                        { value: 'fixed', label: 'Fisso (Nessun Cocco)', description: 'Pagamento fisso senza addebito cocchi' },
                                        { value: 'no_payment', label: 'Nessun Pagamento', description: 'Nessun pagamento per questo utente' },
                                    ].map((method) => (
                                        <label
                                            key={method.value}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: memberPaymentMethods.includes(method.value as any) ? 'rgba(10, 132, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${memberPaymentMethods.includes(method.value as any) ? 'rgba(10, 132, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={memberPaymentMethods.includes(method.value as any)}
                                                onChange={() => handleTogglePaymentMethod(method.value as any)}
                                                disabled={addingMember}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
                                                    {method.label}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    {method.description}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {memberPaymentMethods.length === 0 && (
                                    <small style={{ color: 'rgba(255, 149, 0, 0.8)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                                        Seleziona almeno un metodo di pagamento
                                    </small>
                                )}
                            </div>

                            {memberPaymentMethods.includes('per_project') && (
                                <div className="form-group">
                                    <label>Tariffa Progetto (Cocchi) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={memberProjectRateCocchi}
                                        onChange={(e) => setMemberProjectRateCocchi(e.target.value)}
                                        placeholder="0.00"
                                        className="form-input"
                                        required
                                        disabled={addingMember}
                                    />
                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Importo fisso in cocchi per l'intero progetto
                                    </small>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCloseTeamMemberModal}
                                disabled={addingMember}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAddTeamMember}
                                disabled={addingMember || !selectedUserId || !memberRole.trim()}
                            >
                                <Plus size={16} />
                                {addingMember ? 'Aggiunta in corso...' : 'Aggiungi Membro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Modifica Membro Team */}
            {showEditTeamMemberModal && editingMember && (
                <div className="modal-overlay" onClick={handleCloseEditTeamMemberModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Modifica Membro del Team</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseEditTeamMemberModal}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Utente</label>
                                <input
                                    type="text"
                                    value={editingMember.user?.name || ''}
                                    className="form-input"
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    L'utente non può essere modificato
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Ruolo nel Progetto *</label>
                                <input
                                    type="text"
                                    value={memberRole}
                                    onChange={(e) => setMemberRole(e.target.value)}
                                    placeholder="Es: Sviluppatore, Designer, Copywriter..."
                                    className="form-input"
                                    required
                                    disabled={updatingMember}
                                />
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Specifica il ruolo che questa persona ha nel progetto
                                </small>
                            </div>

                            <div className="form-divider"></div>

                            <div className="form-group">
                                <label>Metodi di Pagamento *</label>
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
                                    Seleziona uno o più metodi di pagamento disponibili per questo utente
                                </small>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { value: 'hourly', label: 'A Ore', description: 'Pagamento basato su ore lavorate' },
                                        { value: 'per_task', label: 'A Task', description: 'Pagamento fisso per ogni task completato' },
                                        { value: 'per_project', label: 'A Progetto', description: 'Pagamento fisso per l\'intero progetto' },
                                        { value: 'fixed', label: 'Fisso (Nessun Cocco)', description: 'Pagamento fisso senza addebito cocchi' },
                                        { value: 'no_payment', label: 'Nessun Pagamento', description: 'Nessun pagamento per questo utente' },
                                    ].map((method) => (
                                        <label
                                            key={method.value}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: memberPaymentMethods.includes(method.value as any) ? 'rgba(10, 132, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${memberPaymentMethods.includes(method.value as any) ? 'rgba(10, 132, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={memberPaymentMethods.includes(method.value as any)}
                                                onChange={() => handleTogglePaymentMethod(method.value as any)}
                                                disabled={updatingMember}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
                                                    {method.label}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    {method.description}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {memberPaymentMethods.length === 0 && (
                                    <small style={{ color: 'rgba(255, 149, 0, 0.8)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                                        Seleziona almeno un metodo di pagamento
                                    </small>
                                )}
                            </div>

                            {memberPaymentMethods.includes('per_project') && (
                                <div className="form-group">
                                    <label>Tariffa Progetto (Cocchi) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={memberProjectRateCocchi}
                                        onChange={(e) => setMemberProjectRateCocchi(e.target.value)}
                                        placeholder="0.00"
                                        className="form-input"
                                        required
                                        disabled={updatingMember}
                                    />
                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Importo fisso in cocchi per l'intero progetto
                                    </small>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCloseEditTeamMemberModal}
                                disabled={updatingMember}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleUpdateTeamMember}
                                disabled={updatingMember || !memberRole.trim() || memberPaymentMethods.length === 0}
                            >
                                <Edit size={16} />
                                {updatingMember ? 'Aggiornamento in corso...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crea Task */}
            {showTaskModal && (
                <div className="modal-overlay" onClick={handleCloseTaskModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Crea Nuovo Task</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseTaskModal}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Titolo Task *</label>
                                <input
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="Es: Sviluppo landing page"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrizione</label>
                                <textarea
                                    value={taskDescription}
                                    onChange={(e) => setTaskDescription(e.target.value)}
                                    placeholder="Descrizione dettagliata del task..."
                                    className="form-input"
                                    rows={4}
                                />
                            </div>

                            <TaskExecutionModeSelector
                                value={taskExecutionMode}
                                onChange={setTaskExecutionMode}
                                disabled={creatingTask}
                            />

                            {taskExecutionMode === 'agent' && (
                                <div style={{
                                    marginBottom: '20px',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(10, 132, 255, 0.1)',
                                    border: '1px solid rgba(10, 132, 255, 0.25)',
                                    fontSize: '13px',
                                    color: 'rgba(255, 255, 255, 0.75)',
                                }}>
                                    L&apos;agente N8N elaborerà la task in background. Al termine del workflow la task verrà segnata come completata automaticamente.
                                </div>
                            )}

                            {(taskExecutionMode === 'agent' || taskExecutionMode === 'agent_human') && (
                                <ExactPromptCheckbox
                                    checked={taskExactPrompt}
                                    onChange={setTaskExactPrompt}
                                    disabled={creatingTask}
                                    id="task-exact-prompt"
                                />
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: taskExecutionMode !== 'agent' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                                {taskExecutionMode !== 'agent' && (
                                <div className="form-group">
                                    <label>Stato</label>
                                    <select
                                        value={taskStatus}
                                        onChange={(e) => setTaskStatus(e.target.value as any)}
                                        className="form-input"
                                    >
                                        <option value="pending">In Attesa</option>
                                        <option value="in_progress">In Corso</option>
                                        <option value="review">In Revisione</option>
                                        <option value="completed">Completato</option>
                                        <option value="cancelled">Cancellato</option>
                                    </select>
                                </div>
                                )}

                                <div className="form-group">
                                    <label>Priorità</label>
                                    <select
                                        value={taskPriority}
                                        onChange={(e) => setTaskPriority(e.target.value as any)}
                                        className="form-input"
                                    >
                                        <option value="low">Bassa</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Data Inizio</label>
                                    <input
                                        type="date"
                                        value={taskStartDate}
                                        onChange={(e) => setTaskStartDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Data Scadenza</label>
                                    <input
                                        type="date"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* CRM Label Selection */}
                            {getAssignedCrms().length > 0 && (
                                <div className="form-group">
                                    <label>Etichetta CRM</label>
                                    <select
                                        value={taskCrmLabelId || ''}
                                        onChange={(e) => setTaskCrmLabelId(e.target.value ? Number(e.target.value) : null)}
                                        className="form-input"
                                    >
                                        <option value="">Nessuna etichetta (visibile a tutti)</option>
                                        {getAssignedCrms().map((crm) => (
                                            <option key={crm.id} value={crm.id}>
                                                {crm.name} {crm.code && `(${crm.code})`}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Seleziona un CRM per limitare la visibilità della task. Se selezioni un CRM, la task sarà visibile solo agli utenti di quel CRM che fanno parte del progetto e al responsabile del CRM.
                                    </small>
                                </div>
                            )}

                            {/* Budget Info */}
                            <div style={{ 
                                padding: '16px', 
                                background: 'rgba(10, 132, 255, 0.1)', 
                                borderRadius: '8px',
                                border: '1px solid rgba(10, 132, 255, 0.2)',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: 600 }}>Budget Progetto</label>
                                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0A84FF' }}>
                                        {(Number(getRemainingBudget()) || 0).toFixed(2)} ¢
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                    Budget totale: {(Number(project?.budget_cocchi) || 0).toFixed(2)} ¢ • 
                                    Speso: {(Number(project?.spent_cocchi) || 0).toFixed(2)} ¢ • 
                                    Rimanente: {(Number(getRemainingBudget()) || 0).toFixed(2)} ¢
                                </div>
                                {taskAssignments.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>Budget richiesto per questa task:</span>
                                            <span style={{ fontSize: '16px', fontWeight: 600, color: calculateTotalAssignmentsBudget() > getRemainingBudget() ? '#FF3B30' : '#34C759' }}>
                                                {(Number(calculateTotalAssignmentsBudget()) || 0).toFixed(2)} ¢
                                            </span>
                                        </div>
                                        {calculateTotalAssignmentsBudget() > getRemainingBudget() && (
                                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '6px', fontSize: '12px', color: '#FF3B30' }}>
                                                ⚠️ Il budget richiesto supera il budget rimanente del progetto
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-divider"></div>

                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontWeight: 600 }}>Assegnazioni Utenti</label>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleAddAssignment}
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                        <Plus size={14} />
                                        Aggiungi Assegnazione
                                    </button>
                                </div>

                                {taskAssignments.length === 0 ? (
                                    <div style={{ 
                                        padding: '16px', 
                                        background: 'rgba(255, 255, 255, 0.03)', 
                                        borderRadius: '8px', 
                                        textAlign: 'center',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '14px'
                                    }}>
                                        Nessuna assegnazione. Aggiungi almeno un utente per calcolare il budget.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {taskAssignments.map((assignment, index) => (
                                            <div key={index} style={{ 
                                                padding: '16px', 
                                                background: 'rgba(255, 255, 255, 0.03)', 
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Assegnazione {index + 1}</h4>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        onClick={() => handleRemoveAssignment(index)}
                                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                                    <label>Utente del Team *</label>
                                                    <select
                                                        value={assignment.user_id ? String(assignment.user_id) : ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const userId = value ? Number(value) : undefined;
                                                            
                                                            // Verifica che l'utente esista nella lista
                                                            if (userId) {
                                                                const availableUsers = getTeamUsers();
                                                                const userExists = availableUsers.some(u => u.id === userId);
                                                                
                                                                if (!userExists) {
                                                                    console.error(`Utente ${userId} non trovato nella lista dei team users`);
                                                                    alert(`Errore: L'utente selezionato (ID: ${userId}) non è disponibile nella lista.`);
                                                                    return;
                                                                }
                                                            }
                                                            
                                                            handleUpdateAssignment(index, 'user_id', userId);
                                                            
                                                            // Se l'utente ha metodi preferiti, suggerisci il primo come default
                                                            if (userId) {
                                                                const preferredMethods = getPreferredPaymentMethodsForUser(userId);
                                                                if (preferredMethods.length > 0) {
                                                                    handleUpdateAssignment(index, 'payment_method', preferredMethods[0]);
                                                                    
                                                                    // Se il metodo preferito è per_project e c'è una tariffa predefinita, impostala
                                                                    if (preferredMethods[0] === 'per_project') {
                                                                        const defaultRate = getDefaultProjectRateForUser(userId);
                                                                        if (defaultRate !== null) {
                                                                            handleUpdateAssignment(index, 'project_rate_cocchi', defaultRate);
                                                                        }
                                                                    }
                                                                } else {
                                                                    // Se non ha metodi preferiti, mantieni o imposta "hourly" come default
                                                                    if (!assignment.payment_method) {
                                                                        handleUpdateAssignment(index, 'payment_method', 'hourly');
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className="form-input"
                                                        required
                                                    >
                                                        <option value="">Seleziona utente del team</option>
                                                        {getTeamUsers().map((user) => (
                                                            <option key={user.id} value={String(user.id)}>
                                                                {user.name} {user.email && `(${user.email})`} {user.role && ` - ${user.role}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {getTeamUsers().length === 0 && (
                                                        <small style={{ color: 'rgba(255, 149, 0, 0.8)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                                            Nessun membro nel team. Aggiungi membri nella sezione Team prima di creare task.
                                                        </small>
                                                    )}
                                                    {assignment.user_id && (() => {
                                                        const preferredMethods = getPreferredPaymentMethodsForUser(assignment.user_id);
                                                        if (preferredMethods.length > 0) {
                                                            const labels: Record<string, string> = {
                                                                'hourly': 'A Ore',
                                                                'per_task': 'A Task',
                                                                'per_project': 'A Progetto',
                                                                'fixed': 'Fisso',
                                                                'no_payment': 'Nessun Pagamento'
                                                            };
                                                            return (
                                                                <small style={{ color: 'rgba(10, 132, 255, 0.8)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                                                    💡 Questo utente preferisce essere pagato con: {preferredMethods.map(m => labels[m]).join(', ')}
                                                                </small>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                                    <label>Metodo di Pagamento *</label>
                                                    <select
                                                        value={assignment.payment_method || 'hourly'}
                                                        onChange={(e) => {
                                                            const newMethod = e.target.value as any;
                                                            handleUpdateAssignment(index, 'payment_method', newMethod);
                                                            
                                                            // Reset campi specifici quando cambia metodo
                                                            if (newMethod !== 'hourly') {
                                                                handleUpdateAssignment(index, 'hourly_rate_cocchi', undefined);
                                                                handleUpdateAssignment(index, 'hours_requested', undefined);
                                                            }
                                                            if (newMethod !== 'per_task') {
                                                                handleUpdateAssignment(index, 'task_rate_cocchi', undefined);
                                                            }
                                                            if (newMethod !== 'per_project') {
                                                                // Se l'utente ha un project_rate_cocchi predefinito, ripristinalo quando si seleziona per_project
                                                                const defaultRate = getDefaultProjectRateForUser(assignment.user_id);
                                                                if (defaultRate !== null && newMethod === 'per_project') {
                                                                    handleUpdateAssignment(index, 'project_rate_cocchi', defaultRate);
                                                                } else {
                                                                    handleUpdateAssignment(index, 'project_rate_cocchi', undefined);
                                                                }
                                                            }
                                                        }}
                                                        className="form-input"
                                                        required
                                                    >
                                                        <option value="hourly">A Ore</option>
                                                        <option value="per_task">A Task</option>
                                                        <option value="per_project">A Progetto</option>
                                                        <option value="fixed">Fisso (Nessun Cocco)</option>
                                                        <option value="no_payment">Nessun Pagamento</option>
                                                    </select>
                                                </div>

                                                {assignment.payment_method === 'hourly' && (
                                                    <>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                            <div className="form-group">
                                                                <label>Tariffa Oraria (Cocchi) *</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={assignment.hourly_rate_cocchi || ''}
                                                                    onChange={(e) => handleUpdateAssignment(index, 'hourly_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    className="form-input"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Ore Richieste *</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    value={assignment.hours_requested || ''}
                                                                    onChange={(e) => handleUpdateAssignment(index, 'hours_requested', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0"
                                                                    className="form-input"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        {assignment.hourly_rate_cocchi && assignment.hours_requested && (
                                                            <div style={{ 
                                                                padding: '8px', 
                                                                background: 'rgba(10, 132, 255, 0.1)', 
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                color: '#0A84FF'
                                                            }}>
                                                                Costo totale: {((Number(assignment.hourly_rate_cocchi) || 0) * (Number(assignment.hours_requested) || 0)).toFixed(2)} ¢
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {assignment.payment_method === 'per_task' && (
                                                    <div className="form-group">
                                                        <label>Tariffa per Task (Cocchi) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={assignment.task_rate_cocchi || ''}
                                                            onChange={(e) => handleUpdateAssignment(index, 'task_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                            className="form-input"
                                                            required
                                                        />
                                                    </div>
                                                )}

                                                {assignment.payment_method === 'per_project' && (
                                                    <div className="form-group">
                                                        <label>Tariffa Progetto (Cocchi) *</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={assignment.project_rate_cocchi || ''}
                                                            onChange={(e) => handleUpdateAssignment(index, 'project_rate_cocchi', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                            className="form-input"
                                                            required
                                                        />
                                                        {(() => {
                                                            const defaultRate = getDefaultProjectRateForUser(assignment.user_id);
                                                            if (defaultRate !== null) {
                                                                return (
                                                                    <small style={{ color: 'rgba(10, 132, 255, 0.8)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                                                        Tariffa predefinita per questo utente: {(Number(defaultRate) || 0).toFixed(2)} ¢
                                                                    </small>
                                                                );
                                                            }
                                                            return (
                                                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                                                    Tariffa definita quando si aggiunge l'utente al progetto
                                                                </small>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {assignment.payment_method === 'fixed' && (
                                                    <div style={{ 
                                                        padding: '8px', 
                                                        background: 'rgba(142, 142, 147, 0.1)', 
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        color: 'rgba(255, 255, 255, 0.6)'
                                                    }}>
                                                        Nessun cocco verrà addebitato per questa task
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCloseTaskModal}
                                disabled={creatingTask}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateTask}
                                disabled={creatingTask || !taskTitle.trim()}
                            >
                                <Plus size={16} />
                                {creatingTask
                                    ? (taskExecutionMode === 'agent' || taskExecutionMode === 'agent_human'
                                        ? 'Avvio agente in corso...'
                                        : 'Creazione in corso...')
                                    : 'Crea task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Dettaglio Task (non usato per PM in contesto freelance — apre pagina dedicata) */}
            {showTaskDetail && selectedTask && !isPmInFreelanceContext && (
                <div className="modal-overlay" onClick={() => setShowTaskDetail(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{selectedTask.title}</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setShowTaskDetail(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Stato</label>
                                    <span style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: '6px', 
                                        fontSize: '13px',
                                        background: getStatusColor(selectedTask.status) + '20',
                                        color: getStatusColor(selectedTask.status),
                                        fontWeight: 600
                                    }}>
                                        {selectedTask.status === 'in_progress' ? 'In Corso' : 
                                         selectedTask.status === 'completed' ? 'Completato' :
                                         selectedTask.status === 'review' ? 'In Revisione' :
                                         selectedTask.status === 'cancelled' ? 'Cancellato' : 'In Attesa'}
                                    </span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Priorità</label>
                                    <span style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: '6px', 
                                        fontSize: '13px',
                                        background: getPriorityColor(selectedTask.priority) + '20',
                                        color: getPriorityColor(selectedTask.priority),
                                        fontWeight: 600
                                    }}>
                                        {selectedTask.priority === 'urgent' ? 'Urgente' :
                                         selectedTask.priority === 'high' ? 'Alta' :
                                         selectedTask.priority === 'medium' ? 'Media' : 'Bassa'}
                                    </span>
                                </div>
                            </div>

                            {selectedTask.description && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'block' }}>Descrizione</label>
                                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                                        {selectedTask.description}
                                    </p>
                                </div>
                            )}

                            {id && selectedTask && selectedTask.execution_mode && selectedTask.execution_mode !== 'human' && (
                                <TaskAgentControlPanel
                                    projectId={Number(id)}
                                    taskId={selectedTask.id}
                                    task={selectedTask}
                                    onTaskUpdate={async () => {
                                        await loadTasks();
                                        // Refresh selectedTask data
                                        const updatedTasks = await crmProjectTasksApi.getByProject(Number(id));
                                        const updatedTask = updatedTasks.data.find(t => t.id === selectedTask.id);
                                        if (updatedTask) {
                                            setSelectedTask(updatedTask);
                                        }
                                    }}
                                />
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                {selectedTask.start_date && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Data Inizio</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{formatDate(selectedTask.start_date)}</div>
                                    </div>
                                )}
                                {selectedTask.due_date && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Data Scadenza</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{formatDate(selectedTask.due_date)}</div>
                                    </div>
                                )}
                                {selectedTask.estimated_hours && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Ore Stimate</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedTask.estimated_hours} ore</div>
                                    </div>
                                )}
                                {selectedTask.budget_cocchi && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>Budget</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0A84FF' }}>
                                            {(Number(selectedTask.budget_cocchi) || 0).toFixed(2)} ¢
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedTask.assignments && selectedTask.assignments.filter(a => a.is_active).length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px', display: 'block', fontWeight: 600 }}>Assegnazioni</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedTask.assignments.filter(a => a.is_active).map(assignment => (
                                            <div key={assignment.id} style={{ 
                                                padding: '12px', 
                                                background: 'rgba(255, 255, 255, 0.03)', 
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {assignment.user?.avatar ? (
                                                            <img src={assignment.user.avatar} alt={assignment.user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                                        ) : (
                                                            <User size={24} />
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{assignment.user?.name}</div>
                                                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                {assignment.payment_method === 'hourly' ? 'A Ore' :
                                                                 assignment.payment_method === 'per_task' ? 'A Task' :
                                                                 assignment.payment_method === 'per_project' ? 'A Progetto' : 'Fisso'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {assignment.total_cost_cocchi !== null && assignment.total_cost_cocchi > 0 && (
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A84FF' }}>
                                                            {(Number(assignment.total_cost_cocchi) || 0).toFixed(2)} ¢
                                                        </div>
                                                    )}
                                                </div>
                                                {assignment.payment_method === 'hourly' && assignment.hourly_rate_cocchi && assignment.hours_requested && (
                                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                        {assignment.hourly_rate_cocchi} ¢/ora × {assignment.hours_requested} ore
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Progresso</label>
                                <div style={{ 
                                    width: '100%', 
                                    height: '12px', 
                                    background: 'rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{ 
                                        width: `${selectedTask.progress}%`, 
                                        height: '100%', 
                                        background: getStatusColor(selectedTask.status),
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {selectedTask.progress}% completato
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowTaskDetail(false)}
                            >
                                Chiudi
                            </button>
                            <a
                                href={`/freelance/task/${selectedTask.id}?projectId=${id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <ExternalLink size={16} />
                                Visualizza in un'altra pagina
                            </a>
                            {isPmInFreelanceContext && selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                                <button
                                    className="btn-primary"
                                    onClick={() => handleMarkTaskCompleted(selectedTask)}
                                    disabled={completingTaskId === selectedTask.id}
                                    style={{ background: 'var(--color-success, #34C759)', color: '#fff' }}
                                >
                                    <CheckCircle2 size={16} />
                                    {completingTaskId === selectedTask.id ? '...' : 'Segna completata'}
                                </button>
                            )}
                            {(!isFreelanceContext || isPmInFreelanceContext) && (
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleDeleteTask(selectedTask).then(() => setShowTaskDetail(false))}
                                    style={{ color: 'var(--color-danger, #FF3B30)' }}
                                >
                                    <Trash2 size={16} />
                                    Elimina
                                </button>
                            )}
                            {(!isFreelanceContext || isPmInFreelanceContext) && (
                                <>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => {
                                            setShowReassignModal(true);
                                            setReassignUserId(null);
                                            setReassignDueDate(selectedTask.due_date || '');
                                        }}
                                    >
                                        <User size={16} />
                                        Riassegna
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={async () => {
                                            const newDate = prompt('Nuova data scadenza (YYYY-MM-DD):', selectedTask.due_date || '');
                                            if (newDate) {
                                                try {
                                                    await crmProjectTasksApi.updateDueDate(Number(id), selectedTask.id, newDate);
                                                    alert('✓ Data aggiornata');
                                                    await loadTasks();
                                                    const taskResponse = await crmProjectTasksApi.getByProject(Number(id));
                                                    const updatedTask = taskResponse.data.find(t => t.id === selectedTask.id);
                                                    if (updatedTask) {
                                                        setSelectedTask(updatedTask);
                                                    }
                                                } catch (error: any) {
                                                    alert('Errore: ' + (error.response?.data?.message || 'Errore sconosciuto'));
                                                }
                                            }
                                        }}
                                    >
                                        <CalendarIcon size={16} />
                                        Modifica Scadenza
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setShowTaskDetail(false);
                                            handleOpenEditTaskModal(selectedTask);
                                        }}
                                    >
                                        <Edit size={16} />
                                        Modifica Task
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Assegna Project Manager */}
            {showAssignManagerModal && (
                <div className="modal-overlay" onClick={() => setShowAssignManagerModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Assegna Project Manager (un solo PM per progetto)</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setShowAssignManagerModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Project Manager *</label>
                                <select
                                    value={selectedManagerId || ''}
                                    onChange={(e) => setSelectedManagerId(Number(e.target.value))}
                                    className="form-input"
                                    required
                                    disabled={loadingUsers}
                                >
                                    <option value="">Seleziona un Project Manager</option>
                                    {availableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} {user.email && `(${user.email})`}
                                        </option>
                                    ))}
                                </select>
                                {loadingUsers && (
                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        Caricamento utenti...
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowAssignManagerModal(false)}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAssignManager}
                                disabled={!selectedManagerId}
                            >
                                <UserCheck size={16} />
                                Assegna
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Modifica Task */}
            {showEditTaskModal && selectedTask && (
                <div className="modal-overlay" onClick={handleCloseTaskModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Modifica Task</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseTaskModal}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Titolo *</label>
                                <input
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="Titolo del task"
                                    className="form-input"
                                    required
                                    disabled={creatingTask}
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrizione</label>
                                <textarea
                                    value={taskDescription}
                                    onChange={(e) => setTaskDescription(e.target.value)}
                                    placeholder="Descrizione dettagliata del task"
                                    className="form-input"
                                    rows={4}
                                    disabled={creatingTask}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Stato</label>
                                    <select
                                        value={taskStatus}
                                        onChange={(e) => setTaskStatus(e.target.value as any)}
                                        className="form-input"
                                        disabled={creatingTask}
                                    >
                                        <option value="pending">In Attesa</option>
                                        <option value="in_progress">In Corso</option>
                                        <option value="review">In Revisione</option>
                                        <option value="completed">Completato</option>
                                        <option value="cancelled">Annullato</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Priorità</label>
                                    <select
                                        value={taskPriority}
                                        onChange={(e) => setTaskPriority(e.target.value as any)}
                                        className="form-input"
                                        disabled={creatingTask}
                                    >
                                        <option value="low">Bassa</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Data Inizio</label>
                                    <input
                                        type="date"
                                        value={taskStartDate}
                                        onChange={(e) => setTaskStartDate(e.target.value)}
                                        className="form-input"
                                        disabled={creatingTask}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Data Scadenza</label>
                                    <input
                                        type="date"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="form-input"
                                        disabled={creatingTask}
                                    />
                                </div>
                            </div>

                            <div className="form-divider"></div>

                            <div className="form-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Assegnazioni</span>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handleAddAssignment}
                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                        disabled={creatingTask}
                                    >
                                        <Plus size={14} />
                                        Aggiungi
                                    </button>
                                </label>
                                {taskAssignments.map((assignment, index) => (
                                    <div key={index} style={{ 
                                        background: 'rgba(255, 255, 255, 0.03)', 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        marginBottom: '12px' 
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Assegnazione {index + 1}</span>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => handleRemoveAssignment(index)}
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                disabled={creatingTask}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Utente *</label>
                                                <select
                                                    value={assignment.user_id || ''}
                                                    onChange={(e) => handleUpdateAssignment(index, 'user_id', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="form-input"
                                                    style={{ fontSize: '14px', padding: '8px' }}
                                                    disabled={creatingTask}
                                                >
                                                    <option value="">Seleziona utente</option>
                                                    {getTeamUsers().map(user => (
                                                        <option key={user.id} value={user.id}>{user.name}</option>
                                                    ))}
                                                </select>
                                                {assignment.user_id && (
                                                    <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                                        {(() => {
                                                            const preferredMethods = getPreferredPaymentMethodsForUser(assignment.user_id);
                                                            return preferredMethods.length > 0 
                                                                ? `Preferenze: ${preferredMethods.join(', ')}`
                                                                : '';
                                                        })()}
                                                    </small>
                                                )}
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Metodo Pagamento *</label>
                                                <select
                                                    value={assignment.payment_method}
                                                    onChange={(e) => handleUpdateAssignment(index, 'payment_method', e.target.value)}
                                                    className="form-input"
                                                    style={{ fontSize: '14px', padding: '8px' }}
                                                    disabled={creatingTask || !assignment.user_id}
                                                >
                                                    <option value="hourly">A Ore</option>
                                                    <option value="per_task">A Task</option>
                                                    <option value="per_project">A Progetto</option>
                                                    <option value="fixed">Fisso</option>
                                                    <option value="no_payment">Nessun Pagamento</option>
                                                </select>
                                            </div>
                                        </div>
                                        {assignment.payment_method === 'hourly' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                                <div>
                                                    <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Tariffa Oraria (Cocchi)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={assignment.hourly_rate_cocchi || ''}
                                                        onChange={(e) => handleUpdateAssignment(index, 'hourly_rate_cocchi', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="form-input"
                                                        style={{ fontSize: '14px', padding: '8px' }}
                                                        disabled={creatingTask}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Ore Richieste</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={assignment.hours_requested || ''}
                                                        onChange={(e) => handleUpdateAssignment(index, 'hours_requested', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="form-input"
                                                        style={{ fontSize: '14px', padding: '8px' }}
                                                        disabled={creatingTask}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {assignment.payment_method === 'per_task' && (
                                            <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Tariffa Task (Cocchi)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={assignment.task_rate_cocchi || ''}
                                                    onChange={(e) => handleUpdateAssignment(index, 'task_rate_cocchi', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="form-input"
                                                    style={{ fontSize: '14px', padding: '8px' }}
                                                    disabled={creatingTask}
                                                />
                                            </div>
                                        )}
                                        {assignment.payment_method === 'per_project' && (
                                            <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Tariffa Progetto (Cocchi)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={assignment.project_rate_cocchi || ''}
                                                    onChange={(e) => handleUpdateAssignment(index, 'project_rate_cocchi', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="form-input"
                                                    style={{ fontSize: '14px', padding: '8px' }}
                                                    disabled={creatingTask}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCloseTaskModal}
                                disabled={creatingTask}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleUpdateTask}
                                disabled={creatingTask || !taskTitle.trim()}
                            >
                                <Edit size={16} />
                                {creatingTask ? 'Aggiornamento in corso...' : 'Aggiorna Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Riassegna Task */}
            {showReassignModal && selectedTask && (
                <div className="modal-overlay" onClick={() => setShowReassignModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Riassegna Task</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setShowReassignModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Task</label>
                                <input
                                    type="text"
                                    value={selectedTask.title}
                                    className="form-input"
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="form-group">
                                <label>Utente Attuale</label>
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    {selectedTask.assignments?.filter(a => a.is_active).map(assignment => (
                                        <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {assignment.user?.avatar ? (
                                                <img src={assignment.user.avatar} alt={assignment.user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                            ) : (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={16} />
                                                </div>
                                            )}
                                            <span>{assignment.user?.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Nuovo Utente *</label>
                                <select
                                    value={reassignUserId || ''}
                                    onChange={(e) => setReassignUserId(e.target.value ? Number(e.target.value) : null)}
                                    className="form-input"
                                    required
                                    disabled={reassigningTask}
                                >
                                    <option value="">Seleziona un utente</option>
                                    {getTeamUsers().filter(user => 
                                        !selectedTask.assignments?.some(a => a.is_active && a.user_id === user.id)
                                    ).map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nuova Data di Scadenza *</label>
                                <input
                                    type="date"
                                    value={reassignDueDate}
                                    onChange={(e) => setReassignDueDate(e.target.value)}
                                    className="form-input"
                                    required
                                    disabled={reassigningTask}
                                />
                                <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    La task verrà riassegnata al nuovo utente con questa data di scadenza
                                </small>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowReassignModal(false)}
                                disabled={reassigningTask}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleReassignTask}
                                disabled={reassigningTask || !reassignUserId || !reassignDueDate}
                            >
                                <User size={16} />
                                {reassigningTask ? 'Riassegnazione in corso...' : 'Riassegna Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Budget Modal */}
            {id && (
                <AddExtraBudgetModal
                    isOpen={showExtraBudgetModal}
                    onClose={() => setShowExtraBudgetModal(false)}
                    onSuccess={async () => {
                        // Ricarica il progetto
                        if (id) {
                            try {
                                const response = await crmProjectsApi.getById(Number(id));
                                setProject(response.data);
                                await loadFinancialTransactions();
                            } catch (error) {
                                console.error('Error reloading project:', error);
                            }
                        }
                    }}
                    projectId={Number(id)}
                />
            )}

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Aggiungi Spesa</h2>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setShowExpenseModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!id) return;
                            
                            if (!expenseForm.title.trim() || !expenseForm.amount || (expenseForm.type === 'user' && !expenseForm.user_id)) {
                                alert('Compila tutti i campi obbligatori');
                                return;
                            }

                            try {
                                setSavingExpense(true);
                                await crmProjectExpensesApi.create(Number(id), {
                                    type: expenseForm.type,
                                    user_id: expenseForm.type === 'user' ? expenseForm.user_id : null,
                                    title: expenseForm.title,
                                    description: expenseForm.description || undefined,
                                    amount_cocchi: parseFloat(expenseForm.amount),
                                    expense_date: expenseForm.date,
                                    category: expenseForm.category || undefined,
                                    payment_method: expenseForm.payment_method || undefined,
                                    is_reimbursement_request: expenseForm.is_reimbursement_request,
                                    receipt_file: expenseForm.receipt_file || undefined,
                                });
                                
                                alert('✓ Spesa creata con successo!');
                                setShowExpenseModal(false);
                                
                                // Reset form
                                setExpenseForm({
                                    type: 'project',
                                    user_id: null,
                                    title: '',
                                    description: '',
                                    amount: '',
                                    date: new Date().toISOString().split('T')[0],
                                    category: '',
                                    payment_method: '',
                                    receipt_file: null,
                                    is_reimbursement_request: false
                                });
                                if (expenseReceiptInputRef.current) {
                                    expenseReceiptInputRef.current.value = '';
                                }
                                
                                // Ricarica spese e progetto
                                await loadExpenses();
                                await loadProject();
                            } catch (error: any) {
                                console.error('Error creating expense:', error);
                                const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Errore nella creazione della spesa';
                                alert(`Errore: ${errorMessage}`);
                            } finally {
                                setSavingExpense(false);
                            }
                        }}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tipo Spesa *</label>
                                    <select
                                        value={expenseForm.type}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, type: e.target.value as 'project' | 'user' }))}
                                        className="form-input"
                                        required
                                    >
                                        <option value="project">Spesa di Progetto</option>
                                        <option value="user">Spesa per Utente</option>
                                    </select>
                                </div>

                                {expenseForm.type === 'user' && (
                                    <>
                                        <div className="form-group">
                                            <label>Utente *</label>
                                            <select
                                                value={expenseForm.user_id || ''}
                                                onChange={(e) => setExpenseForm(prev => ({ ...prev, user_id: e.target.value ? Number(e.target.value) : null }))}
                                                className="form-input"
                                                required
                                            >
                                                <option value="">Seleziona utente</option>
                                                {getTeamUsers().map(user => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={expenseForm.is_reimbursement_request}
                                                    onChange={(e) => setExpenseForm(prev => ({ ...prev, is_reimbursement_request: e.target.checked }))}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                Richiesta di Rimborso / Richiesta Spesa
                                            </label>
                                        </div>
                                    </>
                                )}

                                <div className="form-group">
                                    <label>Titolo *</label>
                                    <input
                                        type="text"
                                        value={expenseForm.title}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="form-input"
                                        placeholder="Breve titolo della spesa"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Motivo / Descrizione</label>
                                    <textarea
                                        value={expenseForm.description}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="form-input"
                                        rows={3}
                                        placeholder="Descrizione dettagliata della spesa"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Importo (Cocchi) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={expenseForm.amount}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                            className="form-input"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Data *</label>
                                        <input
                                            type="date"
                                            value={expenseForm.date}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Categoria</label>
                                    <input
                                        type="text"
                                        value={expenseForm.category}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="form-input"
                                        placeholder="Categoria spesa (opzionale)"
                                    />
                                </div>

                                {(expenseForm.type === 'user' && expenseForm.is_reimbursement_request) && (
                                    <>
                                        <div className="form-group">
                                            <label>Metodo di Pagamento</label>
                                            <select
                                                value={expenseForm.payment_method}
                                                onChange={(e) => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value }))}
                                                className="form-input"
                                            >
                                                <option value="">Seleziona metodo</option>
                                                <option value="bank_transfer">Bonifico</option>
                                                <option value="paypal">PayPal</option>
                                                <option value="credit_card">Carta di Credito</option>
                                                <option value="cash">Contanti</option>
                                                <option value="other">Altro</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Ricevuta / Screenshot</label>
                                            <input
                                                type="file"
                                                ref={expenseReceiptInputRef}
                                                accept="image/*,.pdf"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setExpenseForm(prev => ({ ...prev, receipt_file: file }));
                                                    }
                                                }}
                                                className="form-input"
                                                style={{ padding: '8px' }}
                                            />
                                            {expenseForm.receipt_file && (
                                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={16} />
                                                    <span style={{ fontSize: '12px' }}>{expenseForm.receipt_file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExpenseForm(prev => ({ ...prev, receipt_file: null }));
                                                            if (expenseReceiptInputRef.current) {
                                                                expenseReceiptInputRef.current.value = '';
                                                            }
                                                        }}
                                                        style={{ 
                                                            padding: '4px 8px', 
                                                            background: 'rgba(255, 59, 48, 0.1)', 
                                                            border: '1px solid rgba(255, 59, 48, 0.3)',
                                                            borderRadius: '4px',
                                                            color: '#FF3B30',
                                                            cursor: 'pointer',
                                                            fontSize: '11px'
                                                        }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowExpenseModal(false)}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={savingExpense || !expenseForm.title.trim() || !expenseForm.amount || (expenseForm.type === 'user' && !expenseForm.user_id)}
                                >
                                    {savingExpense ? 'Salvataggio...' : 'Salva Spesa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailPage;
