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
    Percent,
    Target,
    X,
    Image as ImageIcon,
    Send,
    List,
    Grid,
    Users as UsersIcon,
    AlertCircle,
    DollarSign as CocchiIcon,
    Edit,
    Trash2,
    Filter,
    Receipt,
    CreditCard,
    MessageSquare,
    FolderOpen,
    ExternalLink,
    ChevronRight,
    Github,
    Globe
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
import TaskAgentChatPanel from '../../components/Tasks/TaskAgentChatPanel';
import './ProjectDetailPage.css';

type TabType = 'overview' | 'client' | 'contracts' | 'quotes' | 'documents' | 'team' | 'project_manager' | 'tasks' | 'calendar' | 'financial' | 'crm_involved' | 'expenses' | 'analytics' | 'cover_photo';

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
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Leggi il tab dall'URL, altrimenti usa 'overview' come default
    const getTabFromUrl = (): TabType => {
        const tabParam = searchParams.get('tab');
        const validTabs: TabType[] = ['overview', 'client', 'contracts', 'quotes', 'documents', 'team', 'project_manager', 'tasks', 'calendar', 'financial', 'crm_involved', 'expenses', 'analytics', 'cover_photo'];
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
    const [showTaskFilters, setShowTaskFilters] = useState(false);
    
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
    const [taskAssignments, setTaskAssignments] = useState<Array<{
        user_id?: number;
        payment_method: 'hourly' | 'per_task' | 'per_project' | 'fixed' | 'no_payment';
        hourly_rate_cocchi?: number;
        hours_requested?: number;
        task_rate_cocchi?: number;
        project_rate_cocchi?: number;
    }>>([]);
    const [creatingTask, setCreatingTask] = useState(false);

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
        const validTabs: TabType[] = ['overview', 'client', 'contracts', 'quotes', 'documents', 'team', 'project_manager', 'tasks', 'calendar', 'financial', 'crm_involved', 'expenses', 'analytics', 'cover_photo'];
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
        if (project && activeTab === 'team') {
            loadTeamMembers();
        }
        if (project && activeTab === 'project_manager') {
            loadPmChatMessages();
            loadPmManagerInfo();
        }
        if (project && activeTab === 'tasks') {
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

    const handleSaveProjectLinks = async () => {
        if (!id || !project) return;
        const github = projectLinksEdit.github_url.trim();
        const website = projectLinksEdit.website_url.trim();
        const payload = {
            github_url: github || null,
            website_url: website || null,
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
                setSelectedTask(updatedTask);
                setShowTaskDetail(true);
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

    const getQuoteStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            pending: { label: 'In Attesa', color: '#FF9500' },
            approved: { label: 'Approvato', color: '#34C759' },
            rejected: { label: 'Rifiutato', color: '#FF2D55' },
            started: { label: 'Avviato', color: '#0A84FF' },
            completed: { label: 'Completato', color: '#5856D6' },
        };
        
        const config = statusConfig[status] || { label: status, color: '#8E8E93' };
        
        return (
            <span className="status-badge-small" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
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

    const tabs = [
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
    ];

    return (
        <div className={`project-detail-page ${activeTab !== 'overview' ? 'minimal-mode' : ''} ${activeTab === 'calendar' ? 'calendar-mode' : ''} ${isFreelanceContext ? 'freelance-gestione' : ''}`}>
            {/* Header - Minimizzato quando NON in Panoramica */}
            {activeTab === 'overview' ? (
                <div className="detail-header-section">
                    {project.cover_photo_url && (
                        <div className="detail-header-cover" style={{ backgroundImage: `url(${project.cover_photo_url})` }} />
                    )}
                    <button 
                        className="btn-back"
                        onClick={handleBack}
                    >
                        <ArrowLeft size={18} />
                        Indietro
                    </button>
                    <div className="header-content">
                        <div className="header-title-section">
                            {!project.cover_photo_url && (
                                <div className="header-icon-wrapper">
                                    <Briefcase size={28} />
                                </div>
                            )}
                            <div>
                                {canEditProjectName && editingProjectName ? (
                                    <div className="project-name-edit-row">
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
                                            className="project-name-edit-input"
                                        />
                                    </div>
                                ) : (
                                    <h1
                                        className={canEditProjectName ? 'project-name-editable' : ''}
                                        onClick={canEditProjectName ? handleStartEditProjectName : undefined}
                                        title={canEditProjectName ? 'Clicca per modificare il nome' : undefined}
                                    >
                                        {project.name}
                                        {canEditProjectName && <Edit size={16} style={{ marginLeft: '8px', opacity: 0.7, verticalAlign: 'middle' }} />}
                                    </h1>
                                )}
                                <p className="header-subtitle">{project.description || 'Nessuna descrizione'}</p>
                            </div>
                            {getStatusBadge(project.status)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="calendar-header-minimal">
                    <button 
                        className="btn-back-minimal"
                        onClick={handleBack}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="calendar-project-info">
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
                                className="project-name-edit-input calendar-project-name-edit"
                            />
                        ) : (
                            <span
                                className={`calendar-project-name ${canEditProjectName ? 'project-name-editable' : ''}`}
                                onClick={canEditProjectName ? handleStartEditProjectName : undefined}
                                title={canEditProjectName ? 'Clicca per modificare il nome' : undefined}
                            >
                                {project.name}
                                {canEditProjectName && <Edit size={14} style={{ marginLeft: '6px', opacity: 0.7, verticalAlign: 'middle' }} />}
                            </span>
                        )}
                        <span className="calendar-project-stats">
                            {formatCurrency(project.budget_cocchi || 0)} • {getProgressPercentage()}% • {formatDate(project.start_date)}
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Stats - Nascosti quando NON in Panoramica */}
            {activeTab === 'overview' && (
            <div className="quick-stats-section">
                <div className="quick-stats-grid">
                    <div className="quick-stat-card">
                        <div className="quick-stat-icon" style={{ backgroundColor: '#0A84FF15', color: '#0A84FF' }}>
                            <DollarSign size={18} />
                        </div>
                        <div className="quick-stat-content">
                            <div className="quick-stat-label">Budget</div>
                            <div className="quick-stat-value">{formatCurrency(project.budget_cocchi || 0)}</div>
                        </div>
                    </div>
                    <div className="quick-stat-card">
                        <div className="quick-stat-icon" style={{ backgroundColor: '#FF2D5515', color: '#FF2D55' }}>
                            <TrendingUp size={18} />
                        </div>
                        <div className="quick-stat-content">
                            <div className="quick-stat-label">Speso</div>
                            <div className="quick-stat-value">{formatCurrency(project.spent_cocchi || 0)}</div>
                        </div>
                    </div>
                    <div className="quick-stat-card">
                        <div className="quick-stat-icon" style={{ backgroundColor: '#34C75915', color: '#34C759' }}>
                            <Percent size={18} />
                        </div>
                        <div className="quick-stat-content">
                            <div className="quick-stat-label">Progresso Budget</div>
                            <div className="quick-stat-value">{getProgressPercentage()}%</div>
                        </div>
                    </div>
                    <div className="quick-stat-card">
                        <div className="quick-stat-icon" style={{ backgroundColor: '#5856D615', color: '#5856D6' }}>
                            <Calendar size={18} />
                        </div>
                        <div className="quick-stat-content">
                            <div className="quick-stat-label">Data Inizio</div>
                            <div className="quick-stat-value">{formatDate(project.start_date)}</div>
                        </div>
                    </div>
                    {project.manager && (
                        <div className="quick-stat-card">
                            <div className="quick-stat-icon" style={{ backgroundColor: '#FF950015', color: '#FF9500' }}>
                                <UserCheck size={18} />
                            </div>
                            <div className="quick-stat-content">
                                <div className="quick-stat-label">Project Manager</div>
                                <div className="quick-stat-value">{project.manager.name}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Tabs */}
            <div className="tabs-section">
                <div className="tabs-container">
                    <div className="tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => handleTabChange(tab.id)}
                                >
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="tab-content-section">
                <div className="tab-content">
                    {/* PANORAMICA */}
                    {activeTab === 'overview' && (
                        <div className="tab-panel overview-panel">
                            <div className="section-header">
                                <h2 className="section-title">Panoramica Progetto</h2>
                            </div>
                            
                            {/* Main Info Cards Grid */}
                            <div className="overview-main-grid">
                                {/* Informazioni Generali */}
                                <div className="overview-main-card">
                                    <div className="card-header">
                                        <div className="card-header-icon" style={{ backgroundColor: '#0A84FF15', color: '#0A84FF' }}>
                                            <Briefcase size={20} />
                                        </div>
                                        <h3 className="card-title">Informazioni Generali</h3>
                                    </div>
                                    <div className="card-content">
                                        <div className="info-row">
                                            <div className="info-label-wrapper">
                                                <span className="info-label">Nome Progetto</span>
                                            </div>
                                            <div className="info-value-wrapper">
                                                <span className="info-value-large">{project.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-label-wrapper">
                                                <span className="info-label">Stato</span>
                                            </div>
                                            <div className="info-value-wrapper">
                                                {getStatusBadge(project.status)}
                                            </div>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-label-wrapper">
                                                <Calendar size={16} />
                                                <span className="info-label">Data Inizio</span>
                                            </div>
                                            <div className="info-value-wrapper">
                                                <span className="info-value">{formatDate(project.start_date)}</span>
                                            </div>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-label-wrapper">
                                                <Calendar size={16} />
                                                <span className="info-label">Data Fine Prevista</span>
                                            </div>
                                            <div className="info-value-wrapper">
                                                <span className="info-value">{formatDate(project.end_date) || 'Non definita'}</span>
                                            </div>
                                        </div>
                                        {project.crmDepartment && (
                                            <div className="info-row">
                                                <div className="info-label-wrapper">
                                                    <span className="info-label">Dipartimento</span>
                                                </div>
                                                <div className="info-value-wrapper">
                                                    <span className="info-value">{project.crmDepartment.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Collegamenti GitHub e sito web (passati a N8N) */}
                                <div className="overview-main-card">
                                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="card-header-icon" style={{ backgroundColor: '#5856D615', color: '#5856D6' }}>
                                                <Globe size={20} />
                                            </div>
                                            <h3 className="card-title" style={{ margin: 0 }}>Collegamenti progetto</h3>
                                        </div>
                                        {canEditProjectLinks && !editingProjectLinks && (
                                            <button
                                                type="button"
                                                className="btn-add-extra-budget-small"
                                                onClick={handleStartEditProjectLinks}
                                                title="Modifica collegamenti"
                                            >
                                                <Edit size={14} />
                                                Modifica
                                            </button>
                                        )}
                                    </div>
                                    <div className="card-content">
                                        {editingProjectLinks ? (
                                            <>
                                                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                                    <label className="info-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Github size={14} /> Repository GitHub
                                                    </label>
                                                    <input
                                                        type="url"
                                                        className="form-input"
                                                        value={projectLinksEdit.github_url}
                                                        onChange={(e) => setProjectLinksEdit((p) => ({ ...p, github_url: e.target.value }))}
                                                        placeholder="https://github.com/organizzazione/repo"
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                                    <label className="info-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Globe size={14} /> Sito web
                                                    </label>
                                                    <input
                                                        type="url"
                                                        className="form-input"
                                                        value={projectLinksEdit.website_url}
                                                        onChange={(e) => setProjectLinksEdit((p) => ({ ...p, website_url: e.target.value }))}
                                                        placeholder="https://www.esempio.it"
                                                    />
                                                </div>
                                                <p className="field-hint" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#8E8E93' }}>
                                                    Verranno inviati automaticamente a N8N con i task in modalità Agente.
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        onClick={handleSaveProjectLinks}
                                                        disabled={savingProjectLinks}
                                                    >
                                                        {savingProjectLinks ? 'Salvataggio...' : 'Salva'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        onClick={handleCancelEditProjectLinks}
                                                        disabled={savingProjectLinks}
                                                    >
                                                        Annulla
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="info-row">
                                                    <div className="info-label-wrapper">
                                                        <Github size={16} />
                                                        <span className="info-label">GitHub</span>
                                                    </div>
                                                    <div className="info-value-wrapper">
                                                        {project.github_url ? (
                                                            <a
                                                                href={project.github_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="info-link"
                                                            >
                                                                {project.github_url}
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        ) : (
                                                            <span className="info-value muted">Non impostato</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="info-row">
                                                    <div className="info-label-wrapper">
                                                        <Globe size={16} />
                                                        <span className="info-label">Sito web</span>
                                                    </div>
                                                    <div className="info-value-wrapper">
                                                        {project.website_url ? (
                                                            <a
                                                                href={project.website_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="info-link"
                                                            >
                                                                {project.website_url}
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        ) : (
                                                            <span className="info-value muted">Non impostato</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Budget e Finanze */}
                                <div className="overview-main-card">
                                    <div className="card-header">
                                        <div className="card-header-icon" style={{ backgroundColor: '#34C75915', color: '#34C759' }}>
                                            <DollarSign size={20} />
                                        </div>
                                        <h3 className="card-title">Budget e Finanze</h3>
                                    </div>
                                    <div className="card-content">
                                        <div className="budget-summary">
                                            <div className="budget-item-large">
                                                <span className="budget-label">Budget Totale</span>
                                                <span className="budget-value-large">{formatCurrency(project.budget_cocchi || 0)}</span>
                                            </div>
                                            <div className="budget-progress-section">
                                                <div className="budget-progress-header">
                                                    <span className="budget-progress-label">Progresso Budget</span>
                                                    <span className="budget-progress-percentage">{getProgressPercentage()}%</span>
                                                </div>
                                                <div className="budget-progress-bar-container">
                                                    <div className="budget-progress-bar">
                                                        <div 
                                                            className="budget-progress-fill" 
                                                            style={{ 
                                                                width: `${Math.min(100, getProgressPercentage())}%`,
                                                                backgroundColor: getProgressPercentage() > 100 ? '#FF2D55' : '#34C759'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="budget-details">
                                            <div className="budget-detail-item">
                                                <div className="budget-detail-icon" style={{ backgroundColor: '#FF2D5515', color: '#FF2D55' }}>
                                                    <TrendingUp size={16} />
                                                </div>
                                                <div className="budget-detail-content">
                                                    <span className="budget-detail-label">Speso</span>
                                                    <span className="budget-detail-value negative">{formatCurrency(project.spent_cocchi || 0)}</span>
                                                </div>
                                            </div>
                                            <div className="budget-detail-item">
                                                <div className="budget-detail-icon" style={{ backgroundColor: '#0A84FF15', color: '#0A84FF' }}>
                                                    <Target size={16} />
                                                </div>
                                                <div className="budget-detail-content">
                                                    <span className="budget-detail-label">Rimanente</span>
                                                    <span className="budget-detail-value positive">{formatCurrency((project.budget_cocchi || 0) - (project.spent_cocchi || 0))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Team Section */}
                            <div className="overview-team-section">
                                <div className="team-section-header">
                                    <div className="team-header-icon" style={{ backgroundColor: '#5856D615', color: '#5856D6' }}>
                                        <Users size={20} />
                                    </div>
                                    <h3 className="team-section-title">Team e Responsabili</h3>
                                </div>
                                <div className="team-members-grid">
                                    {project.manager && (
                                        <div className="team-member-card-overview">
                                            <div className="member-avatar-overview">
                                                <UserCheck size={24} />
                                            </div>
                                            <div className="member-info-overview">
                                                <span className="member-role-overview">Project Manager</span>
                                                <span className="member-name-overview">{project.manager.name}</span>
                                                {project.manager.email && (
                                                    <span className="member-contact-overview">{project.manager.email}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {project.seller?.user && (
                                        <div className="team-member-card-overview">
                                            <div className="member-avatar-overview seller">
                                                <User size={24} />
                                            </div>
                                            <div className="member-info-overview">
                                                <span className="member-role-overview">Venditore</span>
                                                <span className="member-name-overview">{project.seller.user.name}</span>
                                                {project.seller.user.email && (
                                                    <span className="member-contact-overview">{project.seller.user.email}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {project.client && (
                                        <div className="team-member-card-overview">
                                            <div className="member-avatar-overview client">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="member-info-overview">
                                                <span className="member-role-overview">Cliente</span>
                                                <span className="member-name-overview">{project.client.company_name}</span>
                                                {project.client.contact_person && (
                                                    <span className="member-contact-overview">{project.client.contact_person}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                    {activeTab === 'contracts' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Contratti</h2>
                                <span className="section-count">{contracts.length} {contracts.length === 1 ? 'contratto' : 'contratti'}</span>
                            </div>
                            {contracts.length > 0 ? (
                                <div className="items-list">
                                    {contracts.map((contract) => (
                                        <div
                                            key={contract.id}
                                            className="item-card item-card-clickable"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(`/venditori/contratti/${contract.id}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/contratti/${contract.id}`); } }}
                                        >
                                            <div className="item-header">
                                                <div className="item-icon">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="item-info">
                                                    <h4 className="item-title">{contract.title || contract.contract_number}</h4>
                                                    <div className="item-meta">
                                                        <span>{contract.contract_number}</span>
                                                        {getContractStatusBadge(contract.status)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="btn-secondary item-card-view-btn"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/venditori/contratti/${contract.id}`); }}
                                                >
                                                    <Eye size={16} />
                                                    Visualizza
                                                </button>
                                                <ChevronRight className="item-card-chevron" size={20} aria-hidden />
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
                    )}

                    {/* PREVENTIVI */}
                    {activeTab === 'quotes' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Preventivi</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span className="section-count">{quotes.length} {quotes.length === 1 ? 'preventivo' : 'preventivi'}</span>
                                    <button 
                                        className="btn-primary"
                                        onClick={handleCreateQuote}
                                    >
                                        <Plus size={16} />
                                        Crea Preventivo
                                    </button>
                                </div>
                            </div>
                            {quotes.length > 0 ? (
                                <div className="items-list">
                                    {quotes.map((quote) => (
                                        <div
                                            key={quote.id}
                                            className="item-card item-card-clickable"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/preventivi/${quote.id}`); } }}
                                        >
                                            <div className="item-header">
                                                <div className="item-icon">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="item-info">
                                                    <h4 className="item-title">{quote.title || quote.quote_number}</h4>
                                                    <div className="item-meta">
                                                        <span>{quote.quote_number}</span>
                                                        {getQuoteStatusBadge(quote.status)}
                                                        <span className="item-amount">{formatCurrency(quote.total_amount || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="btn-secondary item-card-view-btn"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/venditori/preventivi/${quote.id}`); }}
                                                >
                                                    <Eye size={16} />
                                                    Visualizza
                                                </button>
                                                <ChevronRight className="item-card-chevron" size={20} aria-hidden />
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
                    )}

                    {/* DOCUMENTI */}
                    {activeTab === 'documents' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Documenti</h2>
                                <button 
                                    className="btn-primary"
                                    onClick={handleOpenDocumentModal}
                                >
                                    <Plus size={16} />
                                    Aggiungi Documento
                                </button>
                            </div>
                            <div className="documents-grid">
                                {/* PREVENTIVI */}
                                {quotes.length > 0 && (
                                    <div className="document-category">
                                        <h3 className="category-title">Preventivi</h3>
                                        <div className="documents-list">
                                            {quotes.map((quote) => (
                                                <div
                                                    key={quote.id}
                                                    className="document-item document-item-clickable"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => navigate(`/venditori/preventivi/${quote.id}`)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/preventivi/${quote.id}`); } }}
                                                >
                                                    <FileText size={20} />
                                                    <div className="document-info">
                                                        <span className="document-name">{quote.title || quote.quote_number}</span>
                                                        <span className="document-meta">Preventivo • {formatDate(quote.created_at)}</span>
                                                    </div>
                                                    <button
                                                        className="btn-secondary document-item-view-btn"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/venditori/preventivi/${quote.id}`); }}
                                                        title="Visualizza preventivo"
                                                    >
                                                        <Eye size={16} />
                                                        Visualizza
                                                    </button>
                                                    <ChevronRight className="document-item-chevron" size={20} aria-hidden />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CONTRATTI */}
                                {project.contracts && project.contracts.length > 0 && (
                                    <div className="document-category">
                                        <h3 className="category-title">Contratti</h3>
                                        <div className="documents-list">
                                            {project.contracts.map((contract) => (
                                                <div
                                                    key={contract.id}
                                                    className="document-item document-item-clickable"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => navigate(`/venditori/contratti/${contract.id}`)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/venditori/contratti/${contract.id}`); } }}
                                                >
                                                    <FileText size={20} />
                                                    <div className="document-info">
                                                        <span className="document-name">{contract.title || contract.contract_number}</span>
                                                        <span className="document-meta">Contratto • {formatDate((contract as any).created_at)}</span>
                                                    </div>
                                                    <button
                                                        className="btn-secondary document-item-view-btn"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/venditori/contratti/${contract.id}`); }}
                                                        title="Visualizza contratto"
                                                    >
                                                        <Eye size={16} />
                                                        Visualizza
                                                    </button>
                                                    <ChevronRight className="document-item-chevron" size={20} aria-hidden />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* DOCUMENTI FIRMATI: Privacy Policy */}
                                {project.contracts && project.contracts.some(c => c.signedDocuments && c.signedDocuments.length > 0 && c.signedDocuments.some(d => d.document_type === 'privacy_policy')) && (
                                    <div className="document-category">
                                        <h3 className="category-title">Privacy Policy</h3>
                                        <div className="documents-list">
                                            {project.contracts.flatMap(contract => 
                                                (contract.signedDocuments || [])
                                                    .filter(doc => doc.document_type === 'privacy_policy')
                                                    .map(doc => (
                                                        <div key={doc.id} className="document-item">
                                                            <FileText size={20} />
                                                            <div className="document-info">
                                                                <span className="document-name">{doc.document_name}</span>
                                                                <span className="document-meta">
                                                                    Privacy Policy • {formatDate(doc.created_at)}
                                                                    {doc.signed_at && ` • Firmato il ${formatDate(doc.signed_at)}`}
                                                                </span>
                                                            </div>
                                                            {doc.external_url ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={() => window.open(doc.external_url, '_blank')}
                                                                    title="Apri link"
                                                                >
                                                                    <Download size={16} />
                                                                    Apri Link
                                                                </button>
                                                            ) : doc.file_path ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const blob = await contractsApi.downloadSignedDocument(contract.id, doc.id);
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
                                                                    }}
                                                                    title="Scarica documento"
                                                                >
                                                                    <Download size={16} />
                                                                    Scarica
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* DOCUMENTI FIRMATI: Consenso Dati Personali */}
                                {project.contracts && project.contracts.some(c => c.signedDocuments && c.signedDocuments.length > 0 && c.signedDocuments.some(d => d.document_type === 'consent_personal_data')) && (
                                    <div className="document-category">
                                        <h3 className="category-title">Consenso Dati Personali</h3>
                                        <div className="documents-list">
                                            {project.contracts.flatMap(contract => 
                                                (contract.signedDocuments || [])
                                                    .filter(doc => doc.document_type === 'consent_personal_data')
                                                    .map(doc => (
                                                        <div key={doc.id} className="document-item">
                                                            <FileText size={20} />
                                                            <div className="document-info">
                                                                <span className="document-name">{doc.document_name}</span>
                                                                <span className="document-meta">
                                                                    Consenso Dati Personali • {formatDate(doc.created_at)}
                                                                    {doc.signed_at && ` • Firmato il ${formatDate(doc.signed_at)}`}
                                                                </span>
                                                            </div>
                                                            {doc.external_url ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={() => window.open(doc.external_url, '_blank')}
                                                                    title="Apri link"
                                                                >
                                                                    <Download size={16} />
                                                                    Apri Link
                                                                </button>
                                                            ) : doc.file_path ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const blob = await contractsApi.downloadSignedDocument(contract.id, doc.id);
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
                                                                    }}
                                                                    title="Scarica documento"
                                                                >
                                                                    <Download size={16} />
                                                                    Scarica
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* DOCUMENTI FIRMATI: Altri Documenti */}
                                {project.contracts && project.contracts.some(c => c.signedDocuments && c.signedDocuments.length > 0 && c.signedDocuments.some(d => d.document_type === 'other')) && (
                                    <div className="document-category">
                                        <h3 className="category-title">Altri Documenti</h3>
                                        <div className="documents-list">
                                            {project.contracts.flatMap(contract => 
                                                (contract.signedDocuments || [])
                                                    .filter(doc => doc.document_type === 'other')
                                                    .map(doc => (
                                                        <div key={doc.id} className="document-item">
                                                            <FileText size={20} />
                                                            <div className="document-info">
                                                                <span className="document-name">{doc.document_name}</span>
                                                                <span className="document-meta">
                                                                    Altro Documento • {formatDate(doc.created_at)}
                                                                    {doc.signed_at && ` • Firmato il ${formatDate(doc.signed_at)}`}
                                                                </span>
                                                            </div>
                                                            {doc.external_url ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={() => window.open(doc.external_url, '_blank')}
                                                                    title="Apri link"
                                                                >
                                                                    <Download size={16} />
                                                                    Apri Link
                                                                </button>
                                                            ) : doc.file_path ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const blob = await contractsApi.downloadSignedDocument(contract.id, doc.id);
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
                                                                    }}
                                                                    title="Scarica documento"
                                                                >
                                                                    <Download size={16} />
                                                                    Scarica
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Debug: mostra tutti i documenti firmati per debug */}
                                {project.contracts && project.contracts.some(c => c.signedDocuments && c.signedDocuments.length > 0) && (
                                    <div className="document-category">
                                        <h3 className="category-title">Tutti i Documenti Firmati (Debug)</h3>
                                        <div className="documents-list">
                                            {project.contracts.flatMap(contract => 
                                                (contract.signedDocuments || [])
                                                    .map(doc => (
                                                        <div key={doc.id} className="document-item">
                                                            <FileText size={20} />
                                                            <div className="document-info">
                                                                <span className="document-name">{doc.document_name}</span>
                                                                <span className="document-meta">
                                                                    Tipo: {doc.document_type} • {formatDate(doc.created_at)}
                                                                    {doc.external_url && ` • URL: ${doc.external_url.substring(0, 50)}...`}
                                                                    {doc.file_path && ` • File: ${doc.file_path}`}
                                                                </span>
                                                            </div>
                                                            {doc.external_url ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={() => window.open(doc.external_url, '_blank')}
                                                                    title="Apri link"
                                                                >
                                                                    <Download size={16} />
                                                                    Apri Link
                                                                </button>
                                                            ) : doc.file_path ? (
                                                                <button 
                                                                    className="btn-secondary"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const blob = await contractsApi.downloadSignedDocument(contract.id, doc.id);
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
                                                                    }}
                                                                    title="Scarica documento"
                                                                >
                                                                    <Download size={16} />
                                                                    Scarica
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Messaggio se non ci sono documenti */}
                                {(!quotes || quotes.length === 0) && 
                                 (!project.contracts || project.contracts.length === 0) && 
                                 (!project.contracts || !project.contracts.some(c => c.signedDocuments && c.signedDocuments.length > 0)) && (
                                <div className="empty-state-card">
                                    <FileText size={48} />
                                    <p>Nessun documento disponibile</p>
                                </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TEAM */}
                    {activeTab === 'team' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Team</h2>
                                <button 
                                    className="btn-primary"
                                    onClick={handleOpenTeamMemberModal}
                                >
                                    <Plus size={16} />
                                    Aggiungi Membro
                                </button>
                            </div>
                            <div className="team-grid">
                                {project.manager && (
                                    <div className="team-member-card">
                                        <div className="member-avatar">
                                            <User size={24} />
                                        </div>
                                        <div className="member-info">
                                            <h4 className="member-name">{project.manager.name}</h4>
                                            <span className="member-role">Project Manager</span>
                                            {project.manager.email && (
                                                <span className="member-email">{project.manager.email}</span>
                                            )}
                                        </div>
                                        <div className="member-badge manager">PM</div>
                                    </div>
                                )}
                                {project.seller?.user && (
                                    <div className="team-member-card">
                                        <div className="member-avatar">
                                            <User size={24} />
                                        </div>
                                        <div className="member-info">
                                            <h4 className="member-name">{project.seller.user.name}</h4>
                                            <span className="member-role">Venditore</span>
                                            {project.seller.user.email && (
                                                <span className="member-email">{project.seller.user.email}</span>
                                            )}
                                        </div>
                                        <div className="member-badge seller">V</div>
                                    </div>
                                )}
                                {teamMembers.map((member) => (
                                    <div key={member.id} className="team-member-card" style={{ position: 'relative' }}>
                                        <div className="member-avatar">
                                            {member.user?.avatar ? (
                                                <img src={member.user.avatar} alt={member.user.name} />
                                            ) : (
                                                <User size={24} />
                                            )}
                                        </div>
                                        <div className="member-info">
                                            <h4 className="member-name">{member.user?.name || 'Utente'}</h4>
                                            <span className="member-role">{member.role}</span>
                                            {member.user?.email && (
                                                <span className="member-email">{member.user.email}</span>
                                            )}
                                            {member.payment_methods && member.payment_methods.length > 0 && (
                                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                    Metodi: {member.payment_methods.map(m => {
                                                        const labels: Record<string, string> = {
                                                            'hourly': 'A Ore',
                                                            'per_task': 'A Task',
                                                            'per_project': 'A Progetto',
                                                            'fixed': 'Fisso',
                                                            'no_payment': 'Nessun Pagamento'
                                                        };
                                                        return labels[m];
                                                    }).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="member-badge team">TM</div>
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '12px', 
                                            right: '12px', 
                                            display: 'flex', 
                                            gap: '8px',
                                            zIndex: 10
                                        }}>
                                            <button
                                                onClick={() => handleOpenEditTeamMemberModal(member)}
                                                disabled={deletingMember}
                                                style={{
                                                    padding: '6px',
                                                    background: 'rgba(10, 132, 255, 0.1)',
                                                    border: '1px solid rgba(10, 132, 255, 0.3)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(10, 132, 255, 0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(10, 132, 255, 0.1)';
                                                }}
                                                title="Modifica membro"
                                            >
                                                <Edit size={14} color="#0A84FF" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTeamMember(member)}
                                                disabled={deletingMember}
                                                style={{
                                                    padding: '6px',
                                                    background: 'rgba(255, 59, 48, 0.1)',
                                                    border: '1px solid rgba(255, 59, 48, 0.3)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)';
                                                }}
                                                title="Rimuovi membro"
                                            >
                                                <Trash2 size={14} color="#FF3B30" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {teamMembers.length === 0 && (
                                <div className="empty-state-card">
                                    <Users size={48} />
                                    <p>Nessun altro membro del team</p>
                                </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PROJECT MANAGER - Un solo PM per progetto; i responsabili di reparto CRM si definiscono in Assegna progetto */}
                    {activeTab === 'project_manager' && (
                        <div className="tab-panel">
                            <p className="tab-hint" style={{ marginBottom: '16px', color: 'var(--text-muted, #8E8E93)', fontSize: '14px' }}>
                                Un solo Project Manager per progetto. I responsabili di reparto CRM si definiscono in &quot;Assegna progetto&quot; o nel tab Team.
                            </p>
                            {!project?.manager ? (
                                <div className="empty-state-card">
                                    <UserCheck size={48} />
                                    <p>Nessun Project Manager assegnato</p>
                                    <button 
                                        className="btn-primary"
                                        onClick={() => {
                                            setShowAssignManagerModal(true);
                                            loadAvailableUsers();
                                        }}
                                        style={{ marginTop: '16px' }}
                                    >
                                        <Plus size={16} />
                                        Assegna Project Manager
                                    </button>
                                </div>
                            ) : (
                                <div className="pm-chat-container">
                                    {/* Header con info PM */}
                                    <div className="pm-chat-header">
                                        <div className="pm-info">
                                            <div className="pm-avatar">
                                                {pmManagerInfo?.avatar ? (
                                                    <img src={pmManagerInfo.avatar} alt={pmManagerInfo.name} />
                                                ) : (
                                                    <User size={24} />
                                                )}
                                            </div>
                                            <div className="pm-details">
                                                <h3 className="pm-name">{project.manager.name}</h3>
                                                <span className="pm-status">
                                                    {pmManagerInfo?.last_access ? (
                                                        <>
                                                            <span className="status-dot online"></span>
                                                            Ultimo accesso: {formatLastAccess(pmManagerInfo.last_access)}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="status-dot offline"></span>
                                                            Mai connesso
                                                        </>
                                                    )}
                                                </span>
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

                                    {/* Chat Messages */}
                                    <div className="pm-chat-messages">
                                        {pmChatMessages.length === 0 ? (
                                            <div className="chat-empty-state">
                                                <p>Nessun messaggio ancora</p>
                                                <span>Inizia la conversazione con il Project Manager</span>
                                            </div>
                                        ) : (
                                            pmChatMessages.map((msg) => {
                                                const isMyMessage = msg.user_id === (project.manager_id || 0);
                                                return (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`chat-message ${isMyMessage ? 'message-sent' : 'message-received'}`}
                                                    >
                                                        <div className="message-content">
                                                            {msg.message_type === 'image' && (msg.media_url || msg.media_path) && (
                                                                <div className="message-image">
                                                                    <img 
                                                                        src={msg.media_url || `${window.location.origin}/storage/${msg.media_path}`} 
                                                                        alt="Immagine" 
                                                                        onClick={() => {
                                                                            const imageUrl = msg.media_url || `${window.location.origin}/storage/${msg.media_path}`;
                                                                            window.open(imageUrl, '_blank');
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            {msg.message && (
                                                                <div className="message-text">{msg.message}</div>
                                                            )}
                                                            <div className="message-meta">
                                                                <span className="message-time">{formatTime(msg.created_at)}</span>
                                                                {isMyMessage && (
                                                                    <span className="message-status">
                                                                        {msg.is_read ? (
                                                                            <span className="read-indicator">✓✓</span>
                                                                        ) : (
                                                                            <span className="sent-indicator">✓</span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={chatMessagesEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="pm-chat-input">
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
                                            className="chat-attach-btn"
                                            onClick={() => chatImageInputRef.current?.click()}
                                            title="Allega immagine"
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                        {chatImageFile && (
                                            <div className="chat-image-preview">
                                                <img src={URL.createObjectURL(chatImageFile)} alt="Preview" />
                                                <button
                                                    className="remove-image-btn"
                                                    onClick={() => {
                                                        setChatImageFile(null);
                                                        if (chatImageInputRef.current) {
                                                            chatImageInputRef.current.value = '';
                                                        }
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            className="chat-input"
                                            placeholder={chatImageFile ? "Aggiungi un messaggio (opzionale)..." : "Scrivi un messaggio..."}
                                            value={pmChatMessage}
                                            onChange={(e) => setPmChatMessage(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendPmMessage();
                                                }
                                            }}
                                            disabled={sendingMessage}
                                        />
                                        <button
                                            className="chat-send-btn"
                                            onClick={handleSendPmMessage}
                                            disabled={sendingMessage || (!pmChatMessage.trim() && !chatImageFile)}
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TASK */}
                    {activeTab === 'tasks' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Task</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {/* View switcher */}
                                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '8px' }}>
                                        <button
                                            className={tasksView === 'users' ? 'btn-secondary active' : 'btn-secondary'}
                                            onClick={() => setTasksView('users')}
                                            style={{ padding: '8px 12px' }}
                                            title="Vista per Utenti"
                                        >
                                            <UsersIcon size={16} />
                                        </button>
                                        <button
                                            className={tasksView === 'table' ? 'btn-secondary active' : 'btn-secondary'}
                                            onClick={() => setTasksView('table')}
                                            style={{ padding: '8px 12px' }}
                                            title="Vista Tabella"
                                        >
                                            <List size={16} />
                                        </button>
                                        <button
                                            className={tasksView === 'cards' ? 'btn-secondary active' : 'btn-secondary'}
                                            onClick={() => setTasksView('cards')}
                                            style={{ padding: '8px 12px' }}
                                            title="Vista Cards"
                                        >
                                            <Grid size={16} />
                                        </button>
                                    </div>
                                    <button 
                                        className="btn-secondary"
                                        onClick={() => setShowTaskFilters(!showTaskFilters)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Filter size={16} />
                                        Filtri
                                    </button>
                                    {canCreateTask && (
                                        <button 
                                            className="btn-primary"
                                            onClick={handleOpenTaskModal}
                                        >
                                            <Plus size={16} />
                                            Nuovo Task
                                        </button>
                                    )}
                            </div>
                            </div>

                            {/* Task Filters */}
                            {showTaskFilters && (
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.03)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '12px', 
                                    padding: '16px', 
                                    marginBottom: '24px',
                                    display: 'flex',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                    alignItems: 'flex-end'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Stato</label>
                                        <select
                                            value={taskFilterStatus}
                                            onChange={(e) => setTaskFilterStatus(e.target.value)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="all">Tutti</option>
                                            <option value="pending">In Attesa</option>
                                            <option value="in_progress">In Corso</option>
                                            <option value="review">In Revisione</option>
                                            <option value="completed">Completati</option>
                                            <option value="cancelled">Annullati</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Utente</label>
                                        <select
                                            value={taskFilterUser || ''}
                                            onChange={(e) => setTaskFilterUser(e.target.value ? Number(e.target.value) : null)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Tutti</option>
                                            {getTeamUsers().map(user => (
                                                <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
                                        <label style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Priorità</label>
                                        <select
                                            value={taskFilterPriority}
                                            onChange={(e) => setTaskFilterPriority(e.target.value)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="all">Tutte</option>
                                            <option value="low">Bassa</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                            <option value="urgent">Urgente</option>
                                        </select>
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => {
                                            setTaskFilterStatus('all');
                                            setTaskFilterUser(null);
                                            setTaskFilterPriority('all');
                                        }}
                                        style={{ padding: '8px 16px' }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            )}

                            {/* Reschedule Requests Section */}
                            {rescheduleRequests.filter(r => r.status === 'pending').length > 0 && (
                                <div style={{ 
                                    background: 'rgba(255, 149, 0, 0.1)', 
                                    border: '1px solid rgba(255, 149, 0, 0.3)', 
                                    borderRadius: '12px', 
                                    padding: '16px', 
                                    marginBottom: '24px' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <AlertCircle size={20} color="#FF9500" />
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Richieste di Spostamento Data</h3>
                                        <span style={{ 
                                            background: 'rgba(255, 149, 0, 0.2)', 
                                            color: '#FF9500', 
                                            padding: '2px 8px', 
                                            borderRadius: '12px', 
                                            fontSize: '12px' 
                                        }}>
                                            {rescheduleRequests.filter(r => r.status === 'pending').length}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {rescheduleRequests.filter(r => r.status === 'pending').map((req) => (
                                            <div key={req.id} style={{ 
                                                background: 'rgba(255, 255, 255, 0.05)', 
                                                padding: '12px', 
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                        {req.task?.title || 'Task #' + req.crm_project_task_id}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                        {req.user?.name} • Da {formatDate(req.current_due_date)} a {formatDate(req.requested_due_date)}
                                                        {req.reason && ` • ${req.reason}`}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={async () => {
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
                                                        }}
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                    >
                                                        Approva
                                                    </button>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={async () => {
                                                            const notes = prompt('Motivo del rifiuto (opzionale):');
                                                            if (notes !== null) {
                                                                try {
                                                                    await crmProjectTasksApi.reviewRescheduleRequest(Number(id), req.id, { 
                                                                        status: 'rejected',
                                                                        review_notes: notes || undefined
                                                                    });
                                                                    alert('✓ Richiesta rifiutata');
                                                                    await loadRescheduleRequests();
                                                                } catch (error: any) {
                                                                    alert('Errore: ' + (error.response?.data?.message || 'Errore sconosciuto'));
                                                                }
                                                            }
                                                        }}
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                    >
                                                        Rifiuta
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {loadingTasks ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <p>Caricamento task...</p>
                                </div>
                            ) : filteredTasks.length === 0 ? (
                            <div className="empty-state-card">
                                <CheckSquare size={48} />
                                <p>Nessun task disponibile</p>
                                <p className="empty-subtitle">I task verranno visualizzati qui quando verranno aggiunti al progetto</p>
                            </div>
                            ) : (
                                <>
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
                                                                <div key={task.id} className="task-item" onClick={() => {
                                                                    setSelectedTask(task);
                                                                    setShowTaskDetail(true);
                                                                }}>
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
                                        <div className="tasks-table-view">
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Task</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Assegnato a</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Stato</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Priorità</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Scadenza</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Budget</th>
                                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Progresso</th>
                                                        <th style={{ textAlign: 'right', padding: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Azioni</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTasks.map(task => (
                                                        <tr key={task.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }} onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowTaskDetail(true);
                                                        }}>
                                                            <td style={{ padding: '12px' }}>
                                                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{task.title}</div>
                                                                {task.description && (
                                                                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {task.description}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {task.assignments?.filter(a => a.is_active).map(assignment => (
                                                                        <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                                            {assignment.user?.avatar ? (
                                                                                <img src={assignment.user.avatar} alt={assignment.user.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                                                            ) : (
                                                                                <User size={16} />
                                                                            )}
                                                                            <span>{assignment.user?.name}</span>
                                                                        </div>
                                                                    ))}
                                                                    {(!task.assignments || task.assignments.filter(a => a.is_active).length === 0) && (
                                                                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>Non assegnato</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{ 
                                                                    padding: '4px 8px', 
                                                                    borderRadius: '4px', 
                                                                    fontSize: '12px',
                                                                    background: getStatusColor(task.status) + '20',
                                                                    color: getStatusColor(task.status)
                                                                }}>
                                                                    {task.status === 'in_progress' ? 'In Corso' : 
                                                                     task.status === 'completed' ? 'Completato' :
                                                                     task.status === 'review' ? 'In Revisione' :
                                                                     task.status === 'cancelled' ? 'Cancellato' : 'In Attesa'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                <span style={{ 
                                                                    padding: '4px 8px', 
                                                                    borderRadius: '4px', 
                                                                    fontSize: '12px',
                                                                    background: getPriorityColor(task.priority) + '20',
                                                                    color: getPriorityColor(task.priority)
                                                                }}>
                                                                    {task.priority === 'urgent' ? 'Urgente' :
                                                                     task.priority === 'high' ? 'Alta' :
                                                                     task.priority === 'medium' ? 'Media' : 'Bassa'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px', fontSize: '12px' }}>
                                                                {task.due_date ? formatDate(task.due_date) : '-'}
                                                            </td>
                                                            <td style={{ padding: '12px', fontSize: '12px' }}>
                                                                {task.budget_cocchi ? `${(Number(task.budget_cocchi) || 0).toFixed(2)} ¢` : '-'}
                                                            </td>
                                                            <td style={{ padding: '12px' }}>
                                                                <div style={{ 
                                                                    width: '100%', 
                                                                    height: '8px', 
                                                                    background: 'rgba(255, 255, 255, 0.1)', 
                                                                    borderRadius: '4px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <div style={{ 
                                                                        width: `${task.progress}%`, 
                                                                        height: '100%', 
                                                                        background: getStatusColor(task.status),
                                                                        transition: 'width 0.3s'
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', display: 'block' }}>
                                                                    {task.progress}%
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                                    {isPmInFreelanceContext && task.status !== 'completed' && task.status !== 'cancelled' && (
                                                                        <button
                                                                            className="btn-secondary"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleMarkTaskCompleted(task);
                                                                            }}
                                                                            style={{ padding: '6px', color: 'var(--color-success, #34C759)' }}
                                                                            title="Segna completata"
                                                                            disabled={completingTaskId === task.id}
                                                                        >
                                                                            {completingTaskId === task.id ? (
                                                                                <span style={{ fontSize: '12px' }}>...</span>
                                                                            ) : (
                                                                                <CheckCircle2 size={14} />
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="btn-secondary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedTask(task);
                                                                            setShowTaskDetail(true);
                                                                        }}
                                                                        style={{ padding: '6px' }}
                                                                        title="Dettagli"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <a
                                                                        href={`/freelance/task/${task.id}?projectId=${id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="btn-secondary"
                                                                        style={{ padding: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        title="Visualizza in un'altra pagina"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink size={14} />
                                                                    </a>
                                                                    {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                                        <>
                                                                            <button
                                                                                className="btn-secondary"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleOpenEditTaskModal(task);
                                                                                }}
                                                                                style={{ padding: '6px' }}
                                                                                title="Modifica"
                                                                            >
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button
                                                                                className="btn-secondary"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteTask(task);
                                                                                }}
                                                                                style={{ padding: '6px' }}
                                                                                title="Elimina"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {tasksView === 'cards' && (
                                        <div className="tasks-cards-view" style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                                            gap: '16px' 
                                        }}>
                                            {filteredTasks.map(task => (
                                                <div 
                                                    key={task.id} 
                                                    className="task-card"
                                                    onClick={() => {
                                                        setSelectedTask(task);
                                                        setShowTaskDetail(true);
                                                    }}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, flex: 1 }}>
                                                            {task.title}
                                                        </h3>
                                                        <span style={{ 
                                                            padding: '4px 8px', 
                                                            borderRadius: '4px', 
                                                            fontSize: '11px',
                                                            background: getPriorityColor(task.priority) + '20',
                                                            color: getPriorityColor(task.priority),
                                                            fontWeight: 600
                                                        }}>
                                                            {task.priority === 'urgent' ? 'Urgente' :
                                                             task.priority === 'high' ? 'Alta' :
                                                             task.priority === 'medium' ? 'Media' : 'Bassa'}
                                                        </span>
                                                    </div>
                                                    
                                                    {task.description && (
                                                        <p style={{ 
                                                            fontSize: '13px', 
                                                            color: 'rgba(255, 255, 255, 0.6)', 
                                                            margin: '0 0 12px 0',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                            <span style={{ 
                                                                padding: '4px 8px', 
                                                                borderRadius: '4px', 
                                                                background: getStatusColor(task.status) + '20',
                                                                color: getStatusColor(task.status)
                                                            }}>
                                                                {task.status === 'in_progress' ? 'In Corso' : 
                                                                 task.status === 'completed' ? 'Completato' :
                                                                 task.status === 'review' ? 'In Revisione' :
                                                                 task.status === 'cancelled' ? 'Cancellato' : 'In Attesa'}
                                                            </span>
                                                        </div>

                                                        {task.assignments && task.assignments.filter(a => a.is_active).length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {task.assignments.filter(a => a.is_active).map(assignment => (
                                                                    <div key={assignment.id} style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        gap: '6px',
                                                                        fontSize: '12px',
                                                                        color: 'rgba(255, 255, 255, 0.7)'
                                                                    }}>
                                                                        {assignment.user?.avatar ? (
                                                                            <img src={assignment.user.avatar} alt={assignment.user.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                                                        ) : (
                                                                            <User size={16} />
                                                                        )}
                                                                        <span>{assignment.user?.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                {task.due_date && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <CalendarIcon size={14} />
                                                                        {formatDate(task.due_date)}
                                                                </span>
                                                            )}
                                                            {task.budget_cocchi && (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <CocchiIcon size={14} />
                                                                    {(Number(task.budget_cocchi) || 0).toFixed(2)} ¢
                                                                </span>
                                                            )}
                                                        </div>
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                            <a
                                                                href={`/freelance/task/${task.id}?projectId=${id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: 'rgba(10, 132, 255, 0.2)',
                                                                    border: '1px solid rgba(10, 132, 255, 0.3)',
                                                                    borderRadius: '6px',
                                                                    color: '#0A84FF',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    textDecoration: 'none',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                title="Visualizza in un'altra pagina"
                                                            >
                                                                <ExternalLink size={14} />
                                                                Apri in nuova scheda
                                                            </a>
                                                            {isPmInFreelanceContext && task.status !== 'completed' && task.status !== 'cancelled' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleMarkTaskCompleted(task);
                                                                    }}
                                                                    disabled={completingTaskId === task.id}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: 'rgba(52, 199, 89, 0.2)',
                                                                        border: '1px solid rgba(52, 199, 89, 0.3)',
                                                                        borderRadius: '6px',
                                                                        color: '#34C759',
                                                                        cursor: completingTaskId === task.id ? 'wait' : 'pointer',
                                                                        fontSize: '12px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {completingTaskId === task.id ? '...' : <CheckCircle2 size={14} />}
                                                                    Segna completata
                                                                </button>
                                                            )}
                                                            {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(task);
                                                                    }}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: 'rgba(255, 59, 48, 0.2)',
                                                                        border: '1px solid rgba(255, 59, 48, 0.3)',
                                                                        borderRadius: '6px',
                                                                        color: '#FF3B30',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.background = 'rgba(255, 59, 48, 0.3)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)';
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Elimina
                                                                </button>
                                                            )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '12px' }}>
                                                        <div style={{ 
                                                            width: '100%', 
                                                            height: '6px', 
                                                            background: 'rgba(255, 255, 255, 0.1)', 
                                                            borderRadius: '3px',
                                                            overflow: 'hidden',
                                                            marginBottom: '4px'
                                                        }}>
                                                            <div style={{ 
                                                                width: `${task.progress}%`, 
                                                                height: '100%', 
                                                                background: getStatusColor(task.status),
                                                                transition: 'width 0.3s'
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                            {task.progress}% completato
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn-secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTask(task);
                                                                setShowTaskDetail(true);
                                                            }}
                                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        >
                                                            <Eye size={14} style={{ marginRight: '4px' }} />
                                                            Dettagli
                                                        </button>
                                                        {(!isFreelanceContext || isPmInFreelanceContext) && (
                                                            <>
                                                                <button
                                                                    className="btn-secondary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenEditTaskModal(task);
                                                                    }}
                                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                >
                                                                    <Edit size={14} style={{ marginRight: '4px' }} />
                                                                    Modifica
                                                                </button>
                                                                <button
                                                                    className="btn-secondary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(task);
                                                                    }}
                                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                >
                                                                    <Trash2 size={14} style={{ marginRight: '4px' }} />
                                                                    Elimina
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
                    {activeTab === 'financial' && (
                        <div className="tab-panel">
                            <div className="section-header">
                                <h2 className="section-title">Calendario Entrate e Uscite</h2>
                            </div>
                            <div className="financial-grid">
                                <div className="financial-card">
                                    <div className="card-header-with-action">
                                        <h3 className="card-title">Riepilogo Finanziario</h3>
                                        <button
                                            className="btn-add-extra-budget-small"
                                            onClick={() => setShowExtraBudgetModal(true)}
                                            title="Aggiungi budget extra"
                                        >
                                            <Plus size={16} />
                                            Budget Extra
                                        </button>
                                    </div>
                                    <div className="financial-summary">
                                        <div className="financial-item">
                                            <span className="financial-label">Budget Totale</span>
                                            <span className="financial-value positive">{formatCurrency(project.budget_cocchi || 0)}</span>
                                        </div>
                                        {project.settings?.extra_budget && project.settings.extra_budget.length > 0 && (
                                            <div className="financial-item">
                                                <span className="financial-label">Budget Extra</span>
                                                <span className="financial-value positive" style={{ fontSize: '0.95rem' }}>
                                                    + {formatCurrency(
                                                        project.settings.extra_budget.reduce(
                                                            (sum: number, item: any) => sum + (item.amount || 0),
                                                            0
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="financial-item">
                                            <span className="financial-label">Speso</span>
                                            <span className="financial-value negative">{formatCurrency(project.spent_cocchi || 0)}</span>
                                        </div>
                                        <div className="financial-item">
                                            <span className="financial-label">Rimanente</span>
                                            <span className="financial-value positive">{formatCurrency((project.budget_cocchi || 0) - (project.spent_cocchi || 0))}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="financial-card">
                                    <h3 className="card-title">Calendario Finanziario</h3>
                                    <FinancialCalendar 
                                        projectId={Number(id)}
                                        transactions={financialTransactions.map(t => ({
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
                    )}

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

            {/* Modal Dettaglio Task */}
            {showTaskDetail && selectedTask && (
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

                            {id && selectedTask && (
                                <TaskAgentChatPanel
                                    projectId={Number(id)}
                                    taskId={selectedTask.id}
                                    executionMode={selectedTask.execution_mode}
                                    initialN8nStatus={selectedTask.n8n_status}
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
