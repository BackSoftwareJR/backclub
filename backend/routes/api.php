<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\TaskRescheduleRequestController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SerbatoiController;
use App\Http\Controllers\UsciteCocchiController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceAgentController;
use App\Http\Controllers\WorkspaceUserTaskController;
use App\Http\Controllers\WorkspacePmController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::get('/auth/google/callback', [App\Http\Controllers\GoogleOAuthController::class, 'callback']);
Route::get('/oauth/google/callback', [App\Http\Controllers\GoogleOAuthController::class, 'searchConsoleCallback']);
Route::post('/internal/n8n/calendar-call-result', [App\Http\Controllers\N8nCalendarController::class, 'calendarCallResult']);

// Signed routes for email actions
Route::get('/reschedule-requests/{rescheduleRequest}/approve', [TaskRescheduleRequestController::class, 'approveFromEmail'])
    ->name('task.reschedule.approve')
    ->middleware('signed');

Route::get('/reschedule-requests/{rescheduleRequest}/reject', [TaskRescheduleRequestController::class, 'rejectFromEmail'])
    ->name('task.reschedule.reject')
    ->middleware('signed');

// Public timeline view (no auth) — share link
Route::get('/timelines/public/{token}', [App\Http\Controllers\TimelineController::class, 'showPublic']);

// Richiesta accesso BackClub (pubblica: email + privacy, invio mail ringraziamento)
Route::post('/backclub/richiedi-accesso', [App\Http\Controllers\BackClubAccessController::class, 'store']);

// ============================================================
// PUBLIC PROJECTS API - Progetti CRM pubblici per sito BackSoftware
// ============================================================
Route::prefix('public/projects')
    ->middleware(['throttle:60,1'])
    ->group(function () {
        Route::get('/', [App\Http\Controllers\PublicProjectsController::class, 'index']);
        Route::get('/{slug}', [App\Http\Controllers\PublicProjectsController::class, 'show']);
    });

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // AI Task Improvement
    Route::post('/ai/improve-task', [App\Http\Controllers\AiTaskImproveController::class, 'improve']);
    Route::post('/change-role', [AuthController::class, 'changeRole']);
    Route::post('/change-crm-department', [AuthController::class, 'changeCrmDepartment']);
    Route::post('/onboarding-preferences', [AuthController::class, 'updateOnboardingPreferences']);

    Route::prefix('auth/google')->group(function () {
        Route::get('/connect', [App\Http\Controllers\GoogleOAuthController::class, 'connect']);
        Route::get('/status', [App\Http\Controllers\GoogleOAuthController::class, 'status']);
        Route::put('/preferences', [App\Http\Controllers\GoogleOAuthController::class, 'updatePreferences']);
        Route::delete('/disconnect', [App\Http\Controllers\GoogleOAuthController::class, 'disconnect']);
    });

    // Google Search Console OAuth (flusso SPA — credenziali GOOGLE_SEO_*)
    // Nota: /oauth/google/callback è pubblico (Google reindirizza il browser senza token)
    Route::prefix('oauth/google')->group(function () {
        Route::get('/redirect', [App\Http\Controllers\GoogleOAuthController::class, 'redirect']);
        Route::get('/status', [App\Http\Controllers\GoogleOAuthController::class, 'checkConnection']);
        Route::delete('/disconnect-project', [App\Http\Controllers\GoogleOAuthController::class, 'disconnectSearchConsole']);
    });

    Route::post('/translate', [App\Http\Controllers\TranslateController::class]);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    
    // Notifications
    Route::get('/notifications', [App\Http\Controllers\NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [App\Http\Controllers\NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    
    // TIMELINES
    Route::prefix('timelines')->group(function () {
        $tc = App\Http\Controllers\TimelineController::class;
        Route::get('/',    [$tc, 'index']);
        Route::post('/',   [$tc, 'store']);
        Route::get('/{timelineId}',    [$tc, 'show']);
        Route::put('/{timelineId}',    [$tc, 'update']);
        Route::delete('/{timelineId}', [$tc, 'destroy']);
        Route::post('/{timelineId}/duplicate', [$tc, 'duplicate']);
        Route::post('/{timelineId}/share',   [$tc, 'share']);
        Route::delete('/{timelineId}/share',  [$tc, 'unshare']);

        // Phases
        Route::post('/{timelineId}/phases',                  [$tc, 'storePhase']);
        Route::put('/{timelineId}/phases/{phaseId}',         [$tc, 'updatePhase']);
        Route::delete('/{timelineId}/phases/{phaseId}',      [$tc, 'destroyPhase']);
        Route::post('/{timelineId}/phases/{phaseId}/duplicate', [$tc, 'duplicatePhase']);
        Route::post('/{timelineId}/phases/{phaseId}/move',     [$tc, 'movePhase']);

        // Steps
        Route::post('/{timelineId}/phases/{phaseId}/steps',                     [$tc, 'storeStep']);
        Route::put('/{timelineId}/phases/{phaseId}/steps/{stepId}',             [$tc, 'updateStep']);
        Route::delete('/{timelineId}/phases/{phaseId}/steps/{stepId}',          [$tc, 'destroyStep']);
        Route::post('/{timelineId}/phases/{phaseId}/steps/{stepId}/duplicate', [$tc, 'duplicateStep']);
        Route::post('/{timelineId}/phases/{phaseId}/steps/{stepId}/move',       [$tc, 'moveStep']);

        // Checklist Items
        Route::post('/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist',              [$tc, 'storeChecklistItem']);
        Route::put('/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist/{itemId}',      [$tc, 'updateChecklistItem']);
        Route::delete('/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist/{itemId}',   [$tc, 'destroyChecklistItem']);
    });

    // AGENDA - Segreteria
    Route::prefix('agenda')->group(function () {
        Route::get('/', [App\Http\Controllers\AgendaController::class, 'index']);
        Route::post('/', [App\Http\Controllers\AgendaController::class, 'store']);
        Route::get('/{id}', [App\Http\Controllers\AgendaController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\AgendaController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\AgendaController::class, 'destroy']);
        Route::post('/{id}/toggle-pin', [App\Http\Controllers\AgendaController::class, 'togglePin']);
        Route::post('/{id}/complete', [App\Http\Controllers\AgendaController::class, 'complete']);
        Route::post('/{id}/checklist-item', [App\Http\Controllers\AgendaController::class, 'updateChecklistItem']);
    });
    
    Route::apiResource('users', UserController::class);
    
    // User extra routes
    Route::post('users/{user}/toggle-access', [UserController::class, 'toggleAccess']);
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
    
    Route::apiResource('clients', ClientController::class);
    
    // Client extra routes
    Route::get('clients/{id}/projects', [App\Http\Controllers\ClientController::class, 'getProjects']);
    Route::post('clients/{id}/toggle-access', [App\Http\Controllers\ClientController::class, 'toggleAccess']);
    Route::post('clients/{id}/reset-password', [App\Http\Controllers\ClientController::class, 'resetPassword']);
    
    Route::get('/projects/{id}/messages', [App\Http\Controllers\ChatController::class, 'index']);
    Route::post('/projects/{id}/messages', [App\Http\Controllers\ChatController::class, 'store']);
    
    // Projects
    Route::apiResource('projects', App\Http\Controllers\ProjectController::class);
    Route::get('projects-dashboard-stats', [App\Http\Controllers\ProjectController::class, 'getDashboardStats']);
    Route::get('project-types', [App\Http\Controllers\ProjectController::class, 'getProjectTypes']);
    Route::get('available-templates', [App\Http\Controllers\ProjectController::class, 'getProjectTemplates']);
    Route::get('available-clients', [App\Http\Controllers\ProjectController::class, 'getAvailableClients']);
    
    // CRM Projects
    // CRM Projects - Routes specifiche prima di quelle generiche
    Route::get('crm-projects/dashboard/stats', [App\Http\Controllers\CrmProjectController::class, 'dashboardStats']);
    Route::get('crm-projects/available-users', [App\Http\Controllers\CrmProjectTeamMemberController::class, 'getAvailableUsers']);
    Route::get('crm-projects/{id}/assignment-data', [App\Http\Controllers\CrmProjectController::class, 'getAssignmentData']);
    Route::post('crm-projects/{id}/assign', [App\Http\Controllers\CrmProjectController::class, 'assign']);
    Route::post('crm-projects/{id}/add-extra-budget', [App\Http\Controllers\CrmProjectController::class, 'addExtraBudget']);
    Route::post('crm-projects/{id}/cover-photo', [App\Http\Controllers\CrmProjectController::class, 'uploadCover']);
    
    // Project Expenses
    Route::prefix('crm-projects/{id}/expenses')->group(function () {
        Route::get('/', [App\Http\Controllers\ProjectExpenseController::class, 'index']);
        Route::post('/', [App\Http\Controllers\ProjectExpenseController::class, 'store']);
        Route::put('/{expenseId}/approve', [App\Http\Controllers\ProjectExpenseController::class, 'approve']);
        Route::put('/{expenseId}/reject', [App\Http\Controllers\ProjectExpenseController::class, 'reject']);
        Route::delete('/{expenseId}', [App\Http\Controllers\ProjectExpenseController::class, 'destroy']);
    });
    
    // Project Financial Transactions
    Route::prefix('crm-projects/{id}/financial')->group(function () {
        Route::get('/transactions', [App\Http\Controllers\ProjectFinancialController::class, 'index']);
        Route::post('/transactions', [App\Http\Controllers\ProjectFinancialController::class, 'store']);
        Route::get('/crm-involved', [App\Http\Controllers\ProjectFinancialController::class, 'getCrmInvolved']);
    });
    
    // ANALISI COSTI - Cost Analysis per Progetti
    Route::prefix('crm-projects/{id}/cost-analysis')->group(function () {
        Route::get('/', [App\Http\Controllers\QuoteCostAnalysisController::class, 'index']);
        Route::post('/', [App\Http\Controllers\QuoteCostAnalysisController::class, 'store']);
        Route::get('/stats', [App\Http\Controllers\QuoteCostAnalysisController::class, 'stats']);
        Route::put('/{costId}', [App\Http\Controllers\QuoteCostAnalysisController::class, 'update']);
        Route::delete('/{costId}', [App\Http\Controllers\QuoteCostAnalysisController::class, 'destroy']);
    });
    
    // Genera analisi costi da preventivo
    Route::post('/quotes/{id}/generate-cost-analysis', [App\Http\Controllers\QuoteCostAnalysisController::class, 'generateFromQuote']);
    
    // CRM Project Team Members (prima della route generica)
    Route::prefix('crm-projects/{id}/team-members')->group(function () {
        Route::get('/', [App\Http\Controllers\CrmProjectTeamMemberController::class, 'index']);
        Route::post('/', [App\Http\Controllers\CrmProjectTeamMemberController::class, 'store']);
        Route::put('/{memberId}', [App\Http\Controllers\CrmProjectTeamMemberController::class, 'update']);
        Route::delete('/{memberId}', [App\Http\Controllers\CrmProjectTeamMemberController::class, 'destroy']);
    });
    
    // CRM Project PM Chat (prima della route generica)
    Route::prefix('crm-projects/{id}/pm-chat')->group(function () {
        Route::get('/messages', [App\Http\Controllers\CrmProjectPmChatController::class, 'getMessages']);
        Route::post('/messages', [App\Http\Controllers\CrmProjectPmChatController::class, 'sendMessage']);
        Route::get('/manager-info', [App\Http\Controllers\CrmProjectPmChatController::class, 'getManagerInfo']);
        Route::get('/unread-count', [App\Http\Controllers\CrmProjectPmChatController::class, 'getUnreadCount']);
    });
    Route::put('crm-projects/{id}/assign-manager', [App\Http\Controllers\CrmProjectPmChatController::class, 'assignManager']);
    
    // CRM Project Tasks
    Route::prefix('crm-projects/{id}/calendar')->group(function () {
        Route::get('items', [App\Http\Controllers\ProjectCalendarController::class, 'getItems']);
        Route::post('items', [App\Http\Controllers\ProjectCalendarController::class, 'createItem']);
        Route::put('items/{itemId}', [App\Http\Controllers\ProjectCalendarController::class, 'updateItem']);
        Route::delete('items/{itemId}', [App\Http\Controllers\ProjectCalendarController::class, 'deleteItem']);
        Route::put('items/{itemId}/drag', [App\Http\Controllers\ProjectCalendarController::class, 'dragItem']);
    });
    
    Route::prefix('crm-projects/{id}/tasks')->group(function () {
        Route::get('/', [App\Http\Controllers\CrmProjectTaskController::class, 'index']);
        Route::post('/', [App\Http\Controllers\CrmProjectTaskController::class, 'store']);
        Route::post('/series/analyze', [App\Http\Controllers\TaskSeriesController::class, 'analyze']);
        Route::post('/series', [App\Http\Controllers\TaskSeriesController::class, 'create']);
        Route::get('/reschedule-requests', [App\Http\Controllers\CrmProjectTaskController::class, 'getRescheduleRequests']);
        Route::get('/deletion-requests', [App\Http\Controllers\CrmProjectTaskController::class, 'getDeletionRequests']);
        Route::get('/{taskId}/events', [App\Http\Controllers\CrmProjectTaskController::class, 'getEvents']);
        Route::get('/{taskId}/notes', [App\Http\Controllers\CrmProjectTaskController::class, 'getNotes']);
        Route::post('/{taskId}/notes', [App\Http\Controllers\CrmProjectTaskController::class, 'createNote']);
        Route::patch('/{taskId}/work-notes', [App\Http\Controllers\CrmProjectTaskController::class, 'updateWorkNotes']);
        Route::get('/{taskId}/attachments', [App\Http\Controllers\CrmProjectTaskController::class, 'getAttachments']);
        Route::post('/{taskId}/attachments', [App\Http\Controllers\CrmProjectTaskController::class, 'storeAttachment']);
        Route::delete('/{taskId}/attachments/{attachmentId}', [App\Http\Controllers\CrmProjectTaskController::class, 'destroyAttachment']);
        Route::post('/{taskId}/take-charge', [App\Http\Controllers\CrmProjectTaskController::class, 'takeCharge']);
        Route::post('/{taskId}/deliver', [App\Http\Controllers\CrmProjectTaskController::class, 'deliver']);
        Route::get('/{taskId}/ai/brief', [App\Http\Controllers\TaskDetailAiController::class, 'brief']);
        Route::post('/{taskId}/ai/ask', [App\Http\Controllers\TaskDetailAiController::class, 'ask']);
        Route::get('/{taskId}/deletion-requests', [App\Http\Controllers\CrmProjectTaskController::class, 'getTaskDeletionRequests']);
        Route::get('/{taskId}', [App\Http\Controllers\CrmProjectTaskController::class, 'show']);
        Route::put('/{taskId}', [App\Http\Controllers\CrmProjectTaskController::class, 'update']);
        Route::delete('/{taskId}', [App\Http\Controllers\CrmProjectTaskController::class, 'destroy']);
        Route::put('/{taskId}/update-due-date', [App\Http\Controllers\CrmProjectTaskController::class, 'updateDueDate']);
        Route::post('/{taskId}/reschedule-request', [App\Http\Controllers\CrmProjectTaskController::class, 'createRescheduleRequest']);
        Route::post('/{taskId}/deletion-request', [App\Http\Controllers\CrmProjectTaskController::class, 'createDeletionRequest']);
        Route::post('/{taskId}/reassign', [App\Http\Controllers\CrmProjectTaskController::class, 'reassign']);
        Route::get('/{taskId}/n8n-steps', [App\Http\Controllers\CrmProjectTaskController::class, 'getN8nSteps']);
        Route::post('/{taskId}/n8n-actions', [App\Http\Controllers\CrmProjectTaskController::class, 'n8nAction']);
    });
    Route::get('crm-projects/{id}/n8n-queue-status', [App\Http\Controllers\CrmProjectTaskController::class, 'n8nQueueStatus']);

    // Coda agenti centralizzata (cross-project)
    Route::prefix('agent-queue')->group(function () {
        Route::get('/', [App\Http\Controllers\AgentQueueController::class, 'index']);
        Route::post('/reset-stuck', [App\Http\Controllers\AgentQueueController::class, 'resetStuck']);
        Route::post('/force-dispatch/{projectId}', [App\Http\Controllers\AgentQueueController::class, 'forceDispatch']);
        Route::post('/cancel-item', [App\Http\Controllers\AgentQueueController::class, 'cancelItem']);
    });
    Route::put('crm-projects/{id}/tasks/reschedule-requests/{requestId}/review', [App\Http\Controllers\CrmProjectTaskController::class, 'reviewRescheduleRequest']);
    Route::put('crm-projects/{id}/tasks/deletion-requests/{requestId}/review', [App\Http\Controllers\CrmProjectTaskController::class, 'reviewDeletionRequest']);
    
    Route::put('crm-projects/{id}/take-charge', [App\Http\Controllers\CrmProjectController::class, 'takeCharge']);
    
    // Freelance projects endpoint (prima della route generica)
    Route::get('crm-projects/freelance/my-projects', [App\Http\Controllers\CrmProjectController::class, 'getFreelanceProjects']);
    
    Route::apiResource('crm-projects', App\Http\Controllers\CrmProjectController::class);

    // CRM Projects - Public settings for website (Gestione Clienti -> Portfolio)
    Route::get('crm-projects/public-settings', [App\Http\Controllers\CrmProjectPublicController::class, 'index']);
    Route::put('crm-projects/{id}/public-settings', [App\Http\Controllers\CrmProjectPublicController::class, 'update']);
    
    // Project Templates
    Route::get('project-templates', [App\Http\Controllers\ProjectTemplateController::class, 'index']);
    Route::get('project-templates/{id}', [App\Http\Controllers\ProjectTemplateController::class, 'show']);
    Route::post('project-templates', [App\Http\Controllers\ProjectTemplateController::class, 'store']);
    Route::put('project-templates/{id}', [App\Http\Controllers\ProjectTemplateController::class, 'update']);
    Route::delete('project-templates/{id}', [App\Http\Controllers\ProjectTemplateController::class, 'destroy']);
    Route::post('project-templates/{id}/duplicate', [App\Http\Controllers\ProjectTemplateController::class, 'duplicate']);
    Route::post('project-templates/{id}/create-project', [App\Http\Controllers\ProjectTemplateController::class, 'createProjectFromTemplate']);
    Route::post('project-templates/import', [App\Http\Controllers\ProjectTemplateController::class, 'import']);
    Route::get('project-templates/{id}/export', [App\Http\Controllers\ProjectTemplateController::class, 'export']);
    
    // Template Roles
    Route::post('project-templates/{id}/roles', [App\Http\Controllers\ProjectTemplateController::class, 'addRole']);
    Route::put('project-templates/{templateId}/roles/{roleId}', [App\Http\Controllers\ProjectTemplateController::class, 'updateRole']);
    Route::delete('project-templates/{templateId}/roles/{roleId}', [App\Http\Controllers\ProjectTemplateController::class, 'deleteRole']);
    
    // Template Tasks
    Route::post('project-templates/{id}/tasks', [App\Http\Controllers\ProjectTemplateController::class, 'addTask']);
    Route::put('project-templates/{templateId}/tasks/{taskId}', [App\Http\Controllers\ProjectTemplateController::class, 'updateTask']);
    Route::delete('project-templates/{templateId}/tasks/{taskId}', [App\Http\Controllers\ProjectTemplateController::class, 'deleteTask']);
    
    // Project Members
    Route::get('projects/{project}/members', [ProjectMemberController::class, 'index']);
    Route::post('projects/{project}/members', [ProjectMemberController::class, 'store']);
    Route::put('projects/{project}/members/{member}', [ProjectMemberController::class, 'update']);
    Route::delete('projects/{project}/members/{member}', [ProjectMemberController::class, 'destroy']);
    Route::get('available-users', [ProjectMemberController::class, 'getAvailableUsers']);
    
    // Tasks
    Route::get('tasks/overdue', [TaskController::class, 'overdue']);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('events', EventController::class);

    Route::get('tasks/{task}/comments', [TaskCommentController::class, 'index']);
    Route::post('tasks/{task}/comments', [TaskCommentController::class, 'store']);

    Route::get('reschedule-requests', [App\Http\Controllers\TaskRescheduleRequestController::class, 'index']);
    Route::post('reschedule-requests', [App\Http\Controllers\TaskRescheduleRequestController::class, 'store']);
    Route::put('reschedule-requests/{rescheduleRequest}', [App\Http\Controllers\TaskRescheduleRequestController::class, 'update']);

    Route::get('/search', [App\Http\Controllers\SearchController::class, 'index']);
    
    Route::get('/security/logs', [App\Http\Controllers\SecurityController::class, 'index']);
    Route::get('/security/stats', [App\Http\Controllers\SecurityController::class, 'stats']);
    
    Route::put('/user/password', [App\Http\Controllers\AuthController::class, 'updatePassword']);
    
    Route::post('/privacy-consent', [App\Http\Controllers\PrivacyConsentController::class, 'store']);
    Route::get('/privacy-consent/check', [App\Http\Controllers\PrivacyConsentController::class, 'check']);

    // ============================================================
    // SERBATOI COCCHI - Gestione Serbatoi e Auto-distribuzione
    // ============================================================
    Route::prefix('serbatoi')->group(function () {
        Route::get('/', [SerbatoiController::class, 'index']);
        Route::get('/transactions', [SerbatoiController::class, 'transactions']);
        Route::post('/', [SerbatoiController::class, 'store']);
        Route::get('/{id}', [SerbatoiController::class, 'show']);
        Route::put('/{id}', [SerbatoiController::class, 'update']);
        Route::delete('/{id}', [SerbatoiController::class, 'destroy']);
        Route::post('/transfer', [SerbatoiController::class, 'transfer']);
        Route::post('/{id}/adjustment', [SerbatoiController::class, 'createAdjustment']);
        Route::put('/{id}/automation', [SerbatoiController::class, 'updateAutomation']);
        Route::post('/distribute-income', [SerbatoiController::class, 'distributeIncome']);
        Route::get('/{id}/comments', [SerbatoiController::class, 'getComments']);
        Route::post('/{id}/comments', [SerbatoiController::class, 'addComment']);
        Route::delete('/comments/{commentId}', [SerbatoiController::class, 'deleteComment']);
    });

    // ============================================================
    // USCITE COCCHI - Gestione Spese e Fatture
    // ============================================================
    Route::prefix('uscite-cocchi')->group(function () {
        // Search & Filters - MUST come before /{id} routes
        Route::get('/search', [App\Http\Controllers\UsciteCocchiSearchController::class, 'search']);
        Route::get('/filters', [App\Http\Controllers\UsciteCocchiSearchController::class, 'getFilters']);
        Route::get('/quick-stats', [App\Http\Controllers\UsciteCocchiSearchController::class, 'getQuickStats']);
        
        Route::get('/', [UsciteCocchiController::class, 'index']);
        Route::get('/stats', [UsciteCocchiController::class, 'stats']);
        Route::post('/', [UsciteCocchiController::class, 'store']);
        Route::get('/{id}', [UsciteCocchiController::class, 'show']);
        Route::put('/{id}', [UsciteCocchiController::class, 'update']);
        Route::delete('/{id}', [UsciteCocchiController::class, 'destroy']);
        Route::post('/{id}/invoice', [UsciteCocchiController::class, 'uploadInvoice']);
        Route::post('/{id}/mark-paid', [UsciteCocchiController::class, 'markPaid']);
        Route::post('/{id}/cancel', [UsciteCocchiController::class, 'cancel']);

        // ============================================================
        // USCITE COCCHI ADVANCED - CRM Section
        // ============================================================
        Route::prefix('crm')->group(function () {
            Route::get('/', [App\Http\Controllers\UsciteCocchiCrmController::class, 'index']);
            Route::get('/{code}', [App\Http\Controllers\UsciteCocchiCrmController::class, 'show']);
            Route::get('/{code}/payments', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getPayments']);
            Route::get('/{code}/calendar', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getCalendarEvents']);
            Route::get('/{code}/upcoming', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getUpcoming']);
            Route::get('/{code}/projects', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getProjects']);
            Route::get('/{code}/team', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getTeam']);
            Route::get('/{code}/expenses/aggregated', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getExpensesAggregated']);
            Route::get('/{code}/expenses/by-project', [App\Http\Controllers\UsciteCocchiCrmController::class, 'getExpensesByProject']);
        });

        // ============================================================
        // USCITE COCCHI ADVANCED - Users Section
        // ============================================================
        Route::prefix('users')->group(function () {
            Route::get('/', [App\Http\Controllers\UsciteCocchiUserController::class, 'index']);
            Route::get('/{id}', [App\Http\Controllers\UsciteCocchiUserController::class, 'show']);
            Route::get('/{id}/payments', [App\Http\Controllers\UsciteCocchiUserController::class, 'getPayments']);
            Route::get('/{id}/calendar', [App\Http\Controllers\UsciteCocchiUserController::class, 'getCalendarEvents']);
        });

        // ============================================================
        // USCITE COCCHI ADVANCED - Analytics
        // ============================================================
        Route::prefix('analytics')->group(function () {
            Route::get('/kpi', [App\Http\Controllers\UsciteCocchiAnalyticsController::class, 'getKPI']);
            Route::get('/charts', [App\Http\Controllers\UsciteCocchiAnalyticsController::class, 'getCharts']);
            Route::get('/trends', [App\Http\Controllers\UsciteCocchiAnalyticsController::class, 'getTrends']);
            Route::get('/breakdown', [App\Http\Controllers\UsciteCocchiAnalyticsController::class, 'getBreakdown']);
        });

        // ============================================================
        // USER MANAGEMENT - dentro uscite-cocchi per evitare cache
        // ============================================================
        Route::prefix('user-management')->group(function () {
            Route::get('/search', [App\Http\Controllers\UserManagementController::class, 'search']);
            Route::get('/{id}/detail', [App\Http\Controllers\UserManagementController::class, 'show']);
            Route::get('/{id}/work-hours', [App\Http\Controllers\UserManagementController::class, 'getWorkHours']);
            Route::post('/{id}/work-hours', [App\Http\Controllers\UserManagementController::class, 'storeWorkHours']);
            Route::put('/{id}/work-hours/{hourId}', [App\Http\Controllers\UserManagementController::class, 'updateWorkHours']);
            Route::delete('/{id}/work-hours/{hourId}', [App\Http\Controllers\UserManagementController::class, 'deleteWorkHours']);
            Route::get('/{id}/compensation', [App\Http\Controllers\UserManagementController::class, 'getCompensation']);
            Route::post('/{id}/compensation', [App\Http\Controllers\UserManagementController::class, 'storeCompensation']);
            Route::put('/{id}/compensation/{compId}', [App\Http\Controllers\UserManagementController::class, 'updateCompensation']);
            Route::get('/{id}/projects', [App\Http\Controllers\UserManagementController::class, 'getProjects']);
            Route::get('/{id}/payments', [App\Http\Controllers\UserManagementController::class, 'getPayments']);
            Route::get('/{id}/notes', [App\Http\Controllers\UserManagementController::class, 'getNotes']);
            Route::post('/{id}/notes', [App\Http\Controllers\UserManagementController::class, 'storeNote']);
            Route::delete('/{id}/notes/{noteId}', [App\Http\Controllers\UserManagementController::class, 'deleteNote']);
            Route::get('/{id}/stats', [App\Http\Controllers\UserManagementController::class, 'getStats']);
        });
    });

    // ============================================================
    // BUDGET CRM MANAGEMENT
    // ============================================================
    Route::prefix('budget')->group(function () {
        // CRM Departments
        Route::get('/crm', [App\Http\Controllers\CrmDepartmentController::class, 'index']);
        Route::post('/crm', [App\Http\Controllers\CrmDepartmentController::class, 'store']);
        Route::get('/crm/{code}', [App\Http\Controllers\CrmDepartmentController::class, 'show']);
        Route::put('/crm/{code}', [App\Http\Controllers\CrmDepartmentController::class, 'update']);
        Route::put('/crm/{code}/budget', [App\Http\Controllers\CrmDepartmentController::class, 'updateBudget']);
        Route::get('/crm/{code}/analytics', [App\Http\Controllers\CrmDepartmentController::class, 'getAnalytics']);
        
        // Team Management
        Route::get('/crm/{code}/team', [App\Http\Controllers\CrmTeamController::class, 'getTeam']);
        Route::post('/crm/{code}/team', [App\Http\Controllers\CrmTeamController::class, 'addMember']);
        Route::put('/crm/team/{id}', [App\Http\Controllers\CrmTeamController::class, 'updateAllocation']);
        Route::delete('/crm/team/{id}', [App\Http\Controllers\CrmTeamController::class, 'removeMember']);
        
        // Expenses
        Route::get('/crm/{code}/expenses', [App\Http\Controllers\CrmExpenseController::class, 'index']);
        Route::post('/crm/{code}/expenses', [App\Http\Controllers\CrmExpenseController::class, 'store']);
        Route::put('/expenses/{id}', [App\Http\Controllers\CrmExpenseController::class, 'update']);
        Route::delete('/expenses/{id}', [App\Http\Controllers\CrmExpenseController::class, 'delete']);
        
        // Economic Analysis
        Route::get('/analytics/crm/{code}', [App\Http\Controllers\EconomicAnalysisController::class, 'getCrmAnalytics']);
        Route::post('/analytics', [App\Http\Controllers\EconomicAnalysisController::class, 'store']);
        Route::put('/analytics/{id}', [App\Http\Controllers\EconomicAnalysisController::class, 'update']);
        Route::delete('/analytics/{id}', [App\Http\Controllers\EconomicAnalysisController::class, 'delete']);
        Route::get('/analytics/summary', [App\Http\Controllers\EconomicAnalysisController::class, 'globalSummary']);
        
        // Budget Distribution
        Route::post('/distribute-to-crm', [App\Http\Controllers\BudgetDistributionController::class, 'distributeToCrm']);
        Route::post('/crm/{code}/allocate-to-project', [App\Http\Controllers\BudgetDistributionController::class, 'allocateToProject']);
        
        // User Budget
        Route::get('/users', [App\Http\Controllers\UserBudgetController::class, 'index']);
        Route::get('/users/{id}', [App\Http\Controllers\UserBudgetController::class, 'show']);
        Route::get('/users/{id}/allocations', [App\Http\Controllers\UserBudgetController::class, 'getAllocations']);
        Route::get('/users/{id}/projects', [App\Http\Controllers\UserBudgetController::class, 'getProjects']);
        Route::get('/users/{id}/payments', [App\Http\Controllers\UserBudgetController::class, 'getPayments']);

        // EXPENSES WITH DOCUMENTS
        Route::post('/crm/{code}/expenses/record', [App\Http\Controllers\CrmExpenseController::class, 'recordExpenseWithDocument']);
        Route::get('/crm/{code}/expenses/documents', [App\Http\Controllers\CrmExpenseController::class, 'getDocumentedExpenses']);

        // BUDGET REDUCTION
        Route::post('/crm/{code}/reduce', [App\Http\Controllers\BudgetDistributionController::class, 'reduceCrmBudget']);
    });

    // PROJECT TYPES
    Route::prefix('project-types')->group(function () {
        Route::get('/', [App\Http\Controllers\ProjectTypeController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\ProjectTypeController::class, 'show']);
        Route::post('/', [App\Http\Controllers\ProjectTypeController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\ProjectTypeController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\ProjectTypeController::class, 'destroy']);
    });

    // CALENDAR
    Route::prefix('calendar')->group(function () {
        Route::get('/events', [App\Http\Controllers\ProjectCalendarController::class, 'index']);
        Route::post('/events', [App\Http\Controllers\ProjectCalendarController::class, 'store']);
        Route::put('/events/{id}', [App\Http\Controllers\ProjectCalendarController::class, 'update']);
        Route::delete('/events/{id}', [App\Http\Controllers\ProjectCalendarController::class, 'destroy']);
        Route::get('/upcoming', [App\Http\Controllers\ProjectCalendarController::class, 'upcoming']);
    });

    // PROJECT CHAT
    Route::prefix('projects')->group(function () {
        Route::get('/{projectId}/chat', [App\Http\Controllers\ProjectChatController::class, 'getMessages']);
        Route::post('/{projectId}/chat', [App\Http\Controllers\ProjectChatController::class, 'sendMessage']);
    });
    
    Route::prefix('chat')->group(function () {
        Route::put('/messages/{id}', [App\Http\Controllers\ProjectChatController::class, 'updateMessage']);
        Route::delete('/messages/{id}', [App\Http\Controllers\ProjectChatController::class, 'deleteMessage']);
        Route::post('/messages/{id}/read', [App\Http\Controllers\ProjectChatController::class, 'markAsRead']);
    });

    // ============================================================
    // EXPENSE MANAGEMENT ENTERPRISE SYSTEM
    // ============================================================
    
    // EXPENSE DASHBOARD
    Route::prefix('expense-dashboard')->group(function () {
        Route::get('/overview', [App\Http\Controllers\ExpenseDashboardController::class, 'overview']);
        Route::get('/kpis', [App\Http\Controllers\ExpenseDashboardController::class, 'kpis']);
        Route::get('/crm-boxes', [App\Http\Controllers\ExpenseDashboardController::class, 'crmBoxes']);
        Route::get('/upcoming-payments', [App\Http\Controllers\ExpenseDashboardController::class, 'upcomingPayments']);
        Route::get('/trends', [App\Http\Controllers\ExpenseDashboardController::class, 'trends']);
        Route::get('/by-category', [App\Http\Controllers\ExpenseDashboardController::class, 'byCategory']);
        Route::get('/by-payment-method', [App\Http\Controllers\ExpenseDashboardController::class, 'byPaymentMethod']);
    });

    // EXPENSE REIMBURSEMENTS
    Route::prefix('expense-reimbursements')->group(function () {
        Route::get('/', [App\Http\Controllers\ExpenseReimbursementController::class, 'index']);
        Route::get('/pending', [App\Http\Controllers\ExpenseReimbursementController::class, 'pending']);
        Route::get('/my', [App\Http\Controllers\ExpenseReimbursementController::class, 'my']);
        Route::get('/stats', [App\Http\Controllers\ExpenseReimbursementController::class, 'stats']);
        Route::get('/{id}', [App\Http\Controllers\ExpenseReimbursementController::class, 'show']);
        Route::post('/', [App\Http\Controllers\ExpenseReimbursementController::class, 'store']);
        Route::put('/{id}/approve', [App\Http\Controllers\ExpenseReimbursementController::class, 'approve']);
        Route::put('/{id}/reject', [App\Http\Controllers\ExpenseReimbursementController::class, 'reject']);
        Route::put('/{id}/pay', [App\Http\Controllers\ExpenseReimbursementController::class, 'pay']);
        Route::delete('/{id}', [App\Http\Controllers\ExpenseReimbursementController::class, 'destroy']);
    });

    // SUBSCRIPTIONS
    Route::prefix('subscriptions')->group(function () {
        Route::get('/', [App\Http\Controllers\SubscriptionController::class, 'index']);
        Route::get('/active', [App\Http\Controllers\SubscriptionController::class, 'active']);
        Route::get('/expiring', [App\Http\Controllers\SubscriptionController::class, 'expiring']);
        Route::get('/stats', [App\Http\Controllers\SubscriptionController::class, 'stats']);
        Route::get('/{id}', [App\Http\Controllers\SubscriptionController::class, 'show']);
        Route::post('/', [App\Http\Controllers\SubscriptionController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\SubscriptionController::class, 'update']);
        Route::put('/{id}/suspend', [App\Http\Controllers\SubscriptionController::class, 'suspend']);
        Route::put('/{id}/activate', [App\Http\Controllers\SubscriptionController::class, 'activate']);
        Route::put('/{id}/renew', [App\Http\Controllers\SubscriptionController::class, 'renew']);
        Route::delete('/{id}', [App\Http\Controllers\SubscriptionController::class, 'destroy']);
    });

    // PAYMENT METHODS
    Route::prefix('payment-methods')->group(function () {
        Route::get('/', [App\Http\Controllers\PaymentMethodController::class, 'index']);
        Route::get('/active', [App\Http\Controllers\PaymentMethodController::class, 'active']);
        Route::get('/expiring', [App\Http\Controllers\PaymentMethodController::class, 'expiring']);
        Route::get('/stats', [App\Http\Controllers\PaymentMethodController::class, 'stats']);
        Route::get('/{id}', [App\Http\Controllers\PaymentMethodController::class, 'show']);
        Route::post('/', [App\Http\Controllers\PaymentMethodController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\PaymentMethodController::class, 'update']);
        Route::put('/{id}/set-default', [App\Http\Controllers\PaymentMethodController::class, 'setDefault']);
        Route::put('/{id}/reset-monthly', [App\Http\Controllers\PaymentMethodController::class, 'resetMonthly']);
        Route::delete('/{id}', [App\Http\Controllers\PaymentMethodController::class, 'destroy']);
    });

    // EXPENSE CATEGORIES
    Route::apiResource('expense-categories', App\Http\Controllers\ExpenseCategoryController::class);

    // VENDORS
    Route::apiResource('vendors', App\Http\Controllers\VendorController::class);

    // USER DETAIL & EXPENSES
    Route::prefix('users')->group(function () {
        Route::get('/{id}/detail', [App\Http\Controllers\UserDetailController::class, 'show']);
        Route::get('/{id}/expenses', [App\Http\Controllers\UserDetailController::class, 'expenses']);
        Route::get('/{id}/reimbursements', [App\Http\Controllers\UserDetailController::class, 'reimbursements']);
        Route::get('/{id}/activity-timeline', [App\Http\Controllers\UserDetailController::class, 'activityTimeline']);
    });

    // ============================================================
    // SISTEMA GESTIONALE VENDITORI
    // ============================================================
    
    // VENDITORI - Anagrafica e Gestione
    Route::prefix('sellers')->group(function () {
        Route::get('/overview/stats', [App\Http\Controllers\SellerController::class, 'overviewStats']);
        Route::get('/dashboard/stats', [App\Http\Controllers\SellerController::class, 'dashboardStats'])->middleware('auth:sanctum');
        Route::get('/{id}/dashboard/stats', [App\Http\Controllers\SellerController::class, 'dashboardStats'])->middleware('auth:sanctum');
        Route::get('/available-users', [App\Http\Controllers\SellerController::class, 'getAvailableUsers']);
        Route::get('/', [App\Http\Controllers\SellerController::class, 'index']);
        Route::post('/', [App\Http\Controllers\SellerController::class, 'store']);
        Route::get('/{id}', [App\Http\Controllers\SellerController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\SellerController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\SellerController::class, 'destroy']);
        Route::post('/{id}/contract', [App\Http\Controllers\SellerController::class, 'uploadContract']);
        Route::put('/{id}/departments', [App\Http\Controllers\SellerController::class, 'updateDepartments']);
        Route::put('/{id}/territory', [App\Http\Controllers\SellerController::class, 'updateTerritory']);
    });

    // COMMISSIONI VENDITORI - Seller Commissions
    Route::prefix('seller-commissions')->group(function () {
        // Route per venditore (solo le proprie commissioni)
        Route::get('/', [App\Http\Controllers\SellerCommissionController::class, 'index']);
        Route::get('/contracts', [App\Http\Controllers\SellerCommissionController::class, 'contracts']);
        Route::get('/contract/{contractId}', [App\Http\Controllers\SellerCommissionController::class, 'byContract']);
        Route::get('/{id}', [App\Http\Controllers\SellerCommissionController::class, 'show']);
        
        // Route per segreteria (tutte le commissioni)
        Route::get('/all/list', [App\Http\Controllers\SellerCommissionController::class, 'all']);
        Route::get('/sellers/summary', [App\Http\Controllers\SellerCommissionController::class, 'sellersSummary']);
        Route::post('/{id}/collect', [App\Http\Controllers\SellerCommissionController::class, 'collect']);
    });

    // SELLER SUPPORT TICKETS - Venditore: crea e lista i propri ticket
    Route::prefix('seller')->group(function () {
        Route::post('/support-tickets', [App\Http\Controllers\SellerSupportTicketController::class, 'store']);
        Route::get('/support-tickets', [App\Http\Controllers\SellerSupportTicketController::class, 'index']);
        Route::get('/support-tickets/{id}', [App\Http\Controllers\SellerSupportTicketController::class, 'show']);
    });

    // SUPPORT TICKETS - Admin: lista tutti i ticket, dettaglio, aggiorna
    Route::prefix('support-tickets')->group(function () {
        Route::get('/', [App\Http\Controllers\SellerSupportTicketController::class, 'adminIndex']);
        Route::get('/{id}', [App\Http\Controllers\SellerSupportTicketController::class, 'adminShow']);
        Route::put('/{id}', [App\Http\Controllers\SellerSupportTicketController::class, 'adminUpdate']);
    });

    // FREELANCE AI Assistant - global command palette
    Route::post('freelance/ai-assistant/chat', [App\Http\Controllers\FreelanceAiAssistantController::class, 'chat']);
    Route::get('freelance/ai-morning-brief', [App\Http\Controllers\FreelanceAiAssistantController::class, 'morningBrief']);

    // FREELANCE - Endpoint ottimizzati (una chiamata invece di N+1)
    Route::get('freelance/dashboard', [App\Http\Controllers\FreelanceController::class, 'dashboard']);
    Route::get('freelance/projects', [App\Http\Controllers\FreelanceController::class, 'projects']);
    Route::get('freelance/tasks', [App\Http\Controllers\FreelanceController::class, 'tasks']);
    Route::get('freelance/requests', [App\Http\Controllers\FreelanceController::class, 'requests']);
    Route::get('freelance/chat-channels', [App\Http\Controllers\FreelanceController::class, 'chatChannels']);

    // FREELANCE CRM - Vista dedicata: tutti i dati del dipartimento (task/eventi di tutti)
    Route::prefix('freelance/crm/{code}')->group(function () {
        Route::get('dashboard', [App\Http\Controllers\FreelanceCrmController::class, 'dashboard']);
        Route::get('projects', [App\Http\Controllers\FreelanceCrmController::class, 'projects']);
        Route::get('tasks', [App\Http\Controllers\FreelanceCrmController::class, 'tasks']);
        Route::get('requests', [App\Http\Controllers\FreelanceCrmController::class, 'requests']);
        Route::get('chat-channels', [App\Http\Controllers\FreelanceCrmController::class, 'chatChannels']);
        Route::get('calendar/items', [App\Http\Controllers\FreelanceCrmController::class, 'calendarItems']);
    });

    // Freelance Calendar
    Route::prefix('freelance/calendar')->group(function () {
        Route::get('/items', [App\Http\Controllers\FreelanceCalendarController::class, 'getItems']);
        Route::get('/items/{itemId}', [App\Http\Controllers\FreelanceCalendarController::class, 'getItem']);
        Route::post('/items', [App\Http\Controllers\FreelanceCalendarController::class, 'createItem']);
        Route::put('/items/{itemId}', [App\Http\Controllers\FreelanceCalendarController::class, 'updateItem']);
        Route::delete('/items/{itemId}', [App\Http\Controllers\FreelanceCalendarController::class, 'deleteItem']);
        Route::put('/items/{itemId}/drag', [App\Http\Controllers\FreelanceCalendarController::class, 'dragItem']);
        Route::post('/items/{itemId}/complete', [App\Http\Controllers\FreelanceCalendarController::class, 'completeItem']);
    });

    // Focus Orchestrator
    Route::prefix('freelance/focus')->group(function () {
        Route::get('/session/today',           [App\Http\Controllers\FocusController::class, 'getTodaySession']);
        Route::post('/session/regenerate',     [App\Http\Controllers\FocusController::class, 'regenerateSession']);
        Route::get('/agenda',                  [App\Http\Controllers\FocusController::class, 'getAgenda']);
        Route::get('/tasks',                   [App\Http\Controllers\FocusController::class, 'getTasks']);
        Route::post('/tasks',                  [App\Http\Controllers\FocusController::class, 'createTask']);
        // wrapper must be declared BEFORE /{id} routes to avoid routing conflict
        Route::post('/tasks/wrapper',          [App\Http\Controllers\FocusController::class, 'ensureWrapper']);
        Route::put('/tasks/{id}',              [App\Http\Controllers\FocusController::class, 'updateTask']);
        Route::put('/tasks/{id}/priority',     [App\Http\Controllers\FocusController::class, 'updatePriority']);
        Route::delete('/tasks/{id}',           [App\Http\Controllers\FocusController::class, 'deleteTask']);
        Route::post('/tasks/{id}/complete',    [App\Http\Controllers\FocusController::class, 'completeTask']);
        Route::get('/patterns',                [App\Http\Controllers\FocusController::class, 'getWorkPatterns']);
        Route::post('/chat',                   [App\Http\Controllers\FocusController::class, 'chat']);
        Route::get('/preferences',             [App\Http\Controllers\FocusController::class, 'getPreferences']);
        Route::post('/preferences',            [App\Http\Controllers\FocusController::class, 'savePreferences']);
        Route::post('/analyze-text',           [App\Http\Controllers\FocusController::class, 'analyzeText']);
        Route::get('/analysis/reports',        [App\Http\Controllers\FocusController::class, 'getAnalysisReports']);
        Route::post('/analysis/run-next',      [App\Http\Controllers\FocusController::class, 'runNextAnalysisStep']);
        Route::post('/analysis/invalidate',    [App\Http\Controllers\FocusController::class, 'invalidateAnalysis']);
        // Daily check-in
        Route::post('/checkin',                [App\Http\Controllers\FocusController::class, 'storeCheckin']);
        Route::get('/checkin/today',           [App\Http\Controllers\FocusController::class, 'getCheckin']);
        Route::get('/checkin/briefing',        [App\Http\Controllers\FocusController::class, 'getCheckinBriefing']);
        // Week plan
        Route::get('/week-plan',               [App\Http\Controllers\FocusController::class, 'getWeekPlan']);
        Route::patch('/tasks/{taskId}/week-plan', [App\Http\Controllers\FocusController::class, 'updateTaskWeekPlan']);
        // Projects with tasks
        Route::get('/projects-with-tasks',     [App\Http\Controllers\FocusController::class, 'getProjectsWithTasks']);
    });

    Route::prefix('seller/calendar')->group(function () {
        Route::get('/items', [App\Http\Controllers\SellerCalendarController::class, 'getItems']);
        Route::post('/items', [App\Http\Controllers\SellerCalendarController::class, 'createItem']);
        Route::put('/items/{itemId}', [App\Http\Controllers\SellerCalendarController::class, 'updateItem']);
        Route::delete('/items/{itemId}', [App\Http\Controllers\SellerCalendarController::class, 'deleteItem']);
        Route::put('/items/{itemId}/drag', [App\Http\Controllers\SellerCalendarController::class, 'dragItem']);
        Route::post('/items/{itemId}/complete', [App\Http\Controllers\SellerCalendarController::class, 'completeItem']);
    });

    // LISTINO PREZZI - Prodotti e Servizi
    Route::apiResource('price-list', App\Http\Controllers\PriceListController::class);
    Route::get('price-list/department/{id}', [App\Http\Controllers\PriceListController::class, 'byDepartment']);
    Route::post('price-list/{id}/informative-document', [App\Http\Controllers\PriceListController::class, 'uploadInformativeDocument']);
    Route::get('price-list/{id}/informative-document/download', [App\Http\Controllers\PriceListController::class, 'downloadInformativeDocument']);
    Route::post('price-list/quote-preview', [App\Http\Controllers\PriceListController::class, 'quotePreview']);
    Route::post('price-list/quote-preview-pdf', [App\Http\Controllers\PriceListController::class, 'quotePreviewPdf']);
    
    // DOMANDE LISTINO - Questions Management
    Route::prefix('price-list/{id}/questions')->group(function () {
        Route::get('/', [App\Http\Controllers\PriceListQuestionController::class, 'index']);
        Route::post('/', [App\Http\Controllers\PriceListQuestionController::class, 'store']);
        Route::put('/{questionId}', [App\Http\Controllers\PriceListQuestionController::class, 'update']);
        Route::delete('/{questionId}', [App\Http\Controllers\PriceListQuestionController::class, 'destroy']);
        
        // Risposte (route specifiche prima di quelle generiche)
        Route::post('/{questionId}/answers', [App\Http\Controllers\PriceListQuestionController::class, 'addAnswer']);
    });
    
    // Route generiche per risposte e condizioni (fuori dal prefix per evitare conflitti)
    Route::prefix('price-list/questions')->group(function () {
        Route::put('/answers/{answerId}', [App\Http\Controllers\PriceListQuestionController::class, 'updateAnswer']);
        Route::delete('/answers/{answerId}', [App\Http\Controllers\PriceListQuestionController::class, 'deleteAnswer']);
        Route::post('/answers/{answerId}/conditions', [App\Http\Controllers\PriceListQuestionController::class, 'addCondition']);
        Route::put('/conditions/{conditionId}', [App\Http\Controllers\PriceListQuestionController::class, 'updateCondition']);
        Route::delete('/conditions/{conditionId}', [App\Http\Controllers\PriceListQuestionController::class, 'deleteCondition']);
    });

    // PREVENTIVI - Quotes Management
    Route::prefix('quotes')->group(function () {
        Route::get('/', [App\Http\Controllers\QuoteController::class, 'index']);
        Route::post('/', [App\Http\Controllers\QuoteController::class, 'store']);
        // Route specifiche devono venire prima di quelle generiche con {id}
        Route::post('/{id}/duplicate', [App\Http\Controllers\QuoteController::class, 'duplicate']);
        Route::post('/{id}/request-contract', [App\Http\Controllers\QuoteController::class, 'requestContract']);
        Route::post('/{id}/reject', [App\Http\Controllers\QuoteController::class, 'reject']);
        Route::post('/{id}/send-email', [App\Http\Controllers\QuoteController::class, 'sendEmail']);
        Route::put('/{id}/status', [App\Http\Controllers\QuoteController::class, 'updateStatus']);
        // Route generiche alla fine
        Route::get('/{id}', [App\Http\Controllers\QuoteController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\QuoteController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\QuoteController::class, 'destroy']);
    });

    // CONTRATTI - Contracts Management
    Route::prefix('contracts')->group(function () {
        Route::get('/', [App\Http\Controllers\ContractController::class, 'index']);
        Route::post('/', [App\Http\Controllers\ContractController::class, 'store']);
        // Route per download file (prima di quelle generiche)
        Route::get('/{id}/download/{type}', [App\Http\Controllers\ContractController::class, 'downloadFile'])->where('type', 'contract|signed');
        Route::get('/{id}/signed-documents/{documentId}/download', [App\Http\Controllers\ContractController::class, 'downloadSignedDocument']);
        Route::get('/{id}/revisions/{revisionId}/download', [App\Http\Controllers\ContractController::class, 'downloadRevision']);
        // Route specifiche prima di quelle generiche
        Route::put('/{id}/status', [App\Http\Controllers\ContractController::class, 'updateStatus']);
        Route::post('/{id}/file', [App\Http\Controllers\ContractController::class, 'uploadFile']);
        Route::post('/{id}/signed', [App\Http\Controllers\ContractController::class, 'uploadSignedFile']);
        Route::get('/{id}/revisions', [App\Http\Controllers\ContractController::class, 'getRevisions']);
        Route::get('/{id}/signed-documents', [App\Http\Controllers\ContractController::class, 'getSignedDocuments']);
        Route::post('/{id}/signed-documents', [App\Http\Controllers\ContractController::class, 'uploadSignedDocument']);
        Route::delete('/{id}/signed-documents/{documentId}', [App\Http\Controllers\ContractController::class, 'deleteSignedDocument']);
        Route::put('/{id}/project', [App\Http\Controllers\ContractController::class, 'linkToProject']);
        Route::post('/{id}/start-project', [App\Http\Controllers\ContractController::class, 'startProject']);
        // Route generiche alla fine
        Route::get('/{id}', [App\Http\Controllers\ContractController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\ContractController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\ContractController::class, 'destroy']);
    });

    // PIANI DI PAGAMENTO - Payment Plans Management
    Route::prefix('payment-plans')->group(function () {
        Route::get('/pending', [App\Http\Controllers\PaymentPlanController::class, 'pending']);
        Route::post('/generate-from-contract/{contractId}', [App\Http\Controllers\PaymentPlanController::class, 'generateFromContract']);
        Route::get('/', [App\Http\Controllers\PaymentPlanController::class, 'index']);
        Route::post('/', [App\Http\Controllers\PaymentPlanController::class, 'store']);
        Route::get('/{id}', [App\Http\Controllers\PaymentPlanController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\PaymentPlanController::class, 'update']);
        Route::post('/{id}/confirm', [App\Http\Controllers\PaymentPlanController::class, 'confirm']);
        Route::post('/{id}/suspend', [App\Http\Controllers\PaymentPlanController::class, 'suspend']);
        Route::post('/{id}/cancel', [App\Http\Controllers\PaymentPlanController::class, 'cancel']);
        Route::post('/{id}/installments', [App\Http\Controllers\PaymentPlanController::class, 'updateInstallments']);
        Route::post('/{id}/renewals', [App\Http\Controllers\PaymentPlanController::class, 'addRenewal']);
        Route::put('/{id}/renewals/{renewalId}', [App\Http\Controllers\PaymentPlanController::class, 'updateRenewal']);
        Route::delete('/{id}/renewals/{renewalId}', [App\Http\Controllers\PaymentPlanController::class, 'deleteRenewal']);
    });

    // FATTURE - Invoices Management
    Route::prefix('invoices')->group(function () {
        Route::get('/to-issue', [App\Http\Controllers\InvoiceController::class, 'toIssue']);
        Route::get('/to-settle', [App\Http\Controllers\InvoiceController::class, 'toSettle']);
        Route::get('/calendar', [App\Http\Controllers\InvoiceController::class, 'calendar']);
        Route::get('/last-number', [App\Http\Controllers\InvoiceController::class, 'lastNumber']);
        Route::get('/stats', [App\Http\Controllers\InvoiceController::class, 'stats']);
        Route::post('/issue', [App\Http\Controllers\InvoiceController::class, 'issue']);
        Route::get('/', [App\Http\Controllers\InvoiceController::class, 'index']);
        Route::post('/', [App\Http\Controllers\InvoiceController::class, 'store']);
        Route::get('/{id}', [App\Http\Controllers\InvoiceController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\InvoiceController::class, 'update']);
        Route::post('/{id}/settle', [App\Http\Controllers\InvoiceController::class, 'settle']);
        Route::post('/{id}/credit-note', [App\Http\Controllers\InvoiceController::class, 'creditNote']);
        Route::delete('/{id}', [App\Http\Controllers\InvoiceController::class, 'destroy']);
    });

    // LEADS - Contatti da Chiamare (CRM Leads)
    Route::prefix('leads')->group(function () {
        Route::get('/', [App\Http\Controllers\LeadController::class, 'index']);
        Route::post('/', [App\Http\Controllers\LeadController::class, 'store']);
        Route::post('/import-csv', [App\Http\Controllers\LeadController::class, 'importCsv']);
        Route::get('/{id}', [App\Http\Controllers\LeadController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\LeadController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\LeadController::class, 'destroy']);
        Route::put('/{id}/assign', [App\Http\Controllers\LeadController::class, 'assign']);
        Route::post('/{id}/convert', [App\Http\Controllers\LeadController::class, 'convertToClient']);
        Route::get('/{id}/prepare-quote', [App\Http\Controllers\LeadController::class, 'prepareForQuote']);
        Route::post('/{id}/activities', [App\Http\Controllers\LeadController::class, 'addActivity']);
        Route::get('/{id}/activities', [App\Http\Controllers\LeadController::class, 'getActivities']);
        Route::get('/{id}/pdf', [App\Http\Controllers\LeadController::class, 'generatePDF']);
        Route::post('/{id}/send-email', [App\Http\Controllers\LeadController::class, 'sendEmail']);
    });

    // GESTIONE CLIENTI - Dashboard E-commerce e Gestionale
    Route::prefix('gestione-clienti')->group(function () {
        // Clienti Attivi
        Route::get('/active-clients', [App\Http\Controllers\GestioneClientiController::class, 'getActiveClients']);
        
        // Ordini
        Route::get('/orders', [App\Http\Controllers\GestioneClientiController::class, 'getOrders']);
        Route::post('/orders', [App\Http\Controllers\GestioneClientiController::class, 'createOrder']);
        Route::put('/orders/{id}', [App\Http\Controllers\GestioneClientiController::class, 'updateOrder']);
        Route::delete('/orders/{id}', [App\Http\Controllers\GestioneClientiController::class, 'deleteOrder']);
        Route::post('/orders/{id}/send-to-sellers', [App\Http\Controllers\GestioneClientiController::class, 'sendOrderToSellers']);
        
        // Regali
        Route::get('/gifts', [App\Http\Controllers\GestioneClientiController::class, 'getGifts']);
        Route::post('/gifts', [App\Http\Controllers\GestioneClientiController::class, 'createGift']);
        Route::put('/gifts/{id}', [App\Http\Controllers\GestioneClientiController::class, 'updateGift']);
        Route::post('/gifts/{id}/send-emails', [App\Http\Controllers\GestioneClientiController::class, 'sendGiftEmails']);
        Route::delete('/gifts/{id}', [App\Http\Controllers\GestioneClientiController::class, 'deleteGift']);
        
        // Prezzi Speciali
        Route::get('/prices', [App\Http\Controllers\GestioneClientiController::class, 'getPrices']);
        Route::post('/prices', [App\Http\Controllers\GestioneClientiController::class, 'createPrice']);
        Route::put('/prices/{id}', [App\Http\Controllers\GestioneClientiController::class, 'updatePrice']);
        Route::delete('/prices/{id}', [App\Http\Controllers\GestioneClientiController::class, 'deletePrice']);
        
        // Offerte
        Route::get('/offers', [App\Http\Controllers\GestioneClientiController::class, 'getOffers']);
        Route::post('/offers', [App\Http\Controllers\GestioneClientiController::class, 'createOffer']);
        Route::put('/offers/{id}', [App\Http\Controllers\GestioneClientiController::class, 'updateOffer']);
        Route::delete('/offers/{id}', [App\Http\Controllers\GestioneClientiController::class, 'deleteOffer']);
        
        // Notizie Web
        Route::get('/news', [App\Http\Controllers\GestioneClientiController::class, 'getNews']);
        Route::post('/news', [App\Http\Controllers\GestioneClientiController::class, 'createNews']);
        Route::put('/news/{id}', [App\Http\Controllers\GestioneClientiController::class, 'updateNews']);
        Route::delete('/news/{id}', [App\Http\Controllers\GestioneClientiController::class, 'deleteNews']);
        
        // Servizi (usa PriceListItem con filtro is_visible_to_clients)
        Route::get('/services', [App\Http\Controllers\GestioneClientiController::class, 'getServices']);

        // Richieste accesso BackClub (pagina richiedi-accesso)
        Route::get('/backclub-requests', [App\Http\Controllers\GestioneClientiController::class, 'getBackclubRequests']);
    });

    // ============================================
    // WORKSPACE MODULE
    // ============================================

    // User preferences
    Route::get('/workspace/preferences', [App\Http\Controllers\WorkspaceController::class, 'getPreferences']);
    Route::put('/workspace/preferences', [App\Http\Controllers\WorkspaceController::class, 'updatePreferences']);

    // Developer workspace
    Route::prefix('workspace/developer')->group(function () {
        Route::get('/projects', [App\Http\Controllers\WorkspaceController::class, 'getDeveloperProjects']);
        Route::get('/projects/{id}', [App\Http\Controllers\WorkspaceController::class, 'getDeveloperProject']);
        Route::get('/projects/{id}/branches', [App\Http\Controllers\WorkspaceController::class, 'getProjectBranches']);
        Route::post('/projects/{id}/publish', [App\Http\Controllers\WorkspaceController::class, 'publishProject']);
        Route::post('/projects/{id}/complete', [App\Http\Controllers\WorkspaceController::class, 'completeProject']);

        // Agents
        Route::get('/projects/{projectId}/agents', [App\Http\Controllers\WorkspaceAgentController::class, 'index']);
        Route::put('/projects/{projectId}/agents/queue/reorder', [App\Http\Controllers\WorkspaceAgentController::class, 'reorderQueue']);
        Route::get('/projects/{projectId}/agents/{agentId}', [App\Http\Controllers\WorkspaceAgentController::class, 'show']);
        Route::post('/projects/{projectId}/agents', [App\Http\Controllers\WorkspaceAgentController::class, 'store']);
        Route::put('/projects/{projectId}/agents/{agentId}', [App\Http\Controllers\WorkspaceAgentController::class, 'update']);
        Route::post('/projects/{projectId}/agents/{agentId}/actions', [App\Http\Controllers\WorkspaceAgentController::class, 'action']);
        Route::post('/projects/{projectId}/agents/{agentId}/trash', [App\Http\Controllers\WorkspaceAgentController::class, 'trash']);
        Route::post('/projects/{projectId}/agents/{agentId}/restore', [App\Http\Controllers\WorkspaceAgentController::class, 'restore']);
        Route::delete('/projects/{projectId}/agents/{agentId}/force', [App\Http\Controllers\WorkspaceAgentController::class, 'forceDelete']);

        // Tasks
        Route::get('/projects/{projectId}/tasks', [App\Http\Controllers\WorkspaceUserTaskController::class, 'index']);
        Route::post('/projects/{projectId}/tasks', [App\Http\Controllers\WorkspaceUserTaskController::class, 'store']);
        Route::put('/projects/{projectId}/tasks/{taskId}', [App\Http\Controllers\WorkspaceUserTaskController::class, 'update']);

        // Orchestrator AI (Senior Care)
        Route::get('/projects/{projectId}/orchestrator', [App\Http\Controllers\WorkspaceAgentController::class, 'getOrchestratorMessages']);
        Route::post('/projects/{projectId}/orchestrator', [App\Http\Controllers\WorkspaceAgentController::class, 'createOrchestratorMessage']);
        Route::get('/projects/{projectId}/artifacts', [App\Http\Controllers\WorkspaceAgentController::class, 'getArtifacts']);
    });

    // PM workspace configuration
    Route::prefix('crm-projects/{projectId}')->group(function () {
        Route::get('/workspace-settings', [App\Http\Controllers\WorkspacePmController::class, 'getSettings']);
        Route::put('/workspace-settings', [App\Http\Controllers\WorkspacePmController::class, 'updateSettings']);
        Route::post('/workspace-branches', [App\Http\Controllers\WorkspacePmController::class, 'createBranch']);
        Route::put('/workspace-branches/{branchId}', [App\Http\Controllers\WorkspacePmController::class, 'updateBranch']);
        Route::delete('/workspace-branches/{branchId}', [App\Http\Controllers\WorkspacePmController::class, 'deleteBranch']);
    });
});

// n8n callbacks (NO auth - webhook pubblico)
Route::post('/workspace/agents/{agentId}/n8n-callback', [App\Http\Controllers\WorkspaceAgentController::class, 'n8nCallback'])
    ->name('workspace.agent.n8n-callback');

// N8N Task Webhooks (primary endpoints)
Route::post('/webhooks/n8n/task-events', [App\Http\Controllers\N8nTaskWebhookController::class, 'taskEvents'])
    ->name('webhooks.n8n.task-events');
Route::post('/webhooks/n8n/status', [App\Http\Controllers\N8nTaskWebhookController::class, 'status'])
    ->name('webhooks.n8n.status');
Route::post('/webhooks/n8n/completed', [App\Http\Controllers\N8nTaskWebhookController::class, 'completed'])
    ->name('webhooks.n8n.completed');
Route::post('/webhooks/n8n/task-log', [App\Http\Controllers\N8nTaskWebhookController::class, 'taskLog'])
    ->name('webhooks.n8n.task-log');
Route::post('/webhooks/n8n/close-task', [App\Http\Controllers\N8nTaskWebhookController::class, 'closeTask'])
    ->name('webhooks.n8n.close-task');

// Legacy callback (still working as alias)
Route::post('/crm-projects/{id}/tasks/{taskId}/n8n-callback', [App\Http\Controllers\CrmProjectTaskController::class, 'n8nCallback'])
    ->name('crm.task.n8n-callback');

// Portfolio Azienda – accesso con codice (token in header X-Portfolio-Token)
Route::prefix('portfolio')->group(function () {
    Route::post('/send-code', [App\Http\Controllers\CompanyPortfolioController::class, 'sendCode']);
    Route::post('/verify-code', [App\Http\Controllers\CompanyPortfolioController::class, 'verifyCode']);
    Route::get('/balance', [App\Http\Controllers\CompanyPortfolioController::class, 'balance']);
    Route::get('/dashboard', [App\Http\Controllers\CompanyPortfolioController::class, 'dashboard']);
    Route::get('/transactions', [App\Http\Controllers\CompanyPortfolioController::class, 'transactions']);
    Route::post('/expense', [App\Http\Controllers\CompanyPortfolioController::class, 'expense']);
    Route::post('/withdrawal', [App\Http\Controllers\CompanyPortfolioController::class, 'withdrawal']);
    Route::post('/deposit', [App\Http\Controllers\CompanyPortfolioController::class, 'deposit']);
});

// Route PDF accessibile anche senza autenticazione (per permettere apertura in nuova finestra)
Route::get('/quotes/{id}/pdf', [App\Http\Controllers\QuoteController::class, 'generatePDF']);

// Route PDF pubblica con signed URL (per email)
Route::get('/quotes/{id}/pdf/public', [App\Http\Controllers\QuoteController::class, 'generatePDFPublic'])
    ->name('quotes.pdf.public')
    ->middleware('signed');

// ============================================================
// ORGANIC WEB WORKSPACE — SEO organica orchestrata per cliente
// ============================================================
Route::prefix('organic-web')->middleware('auth:sanctum')->group(function () {
    // Projects
    Route::get('/projects', [App\Http\Controllers\OrganicWebController::class, 'indexProjects']);
    Route::post('/projects', [App\Http\Controllers\OrganicWebController::class, 'storeProject']);
    Route::get('/projects/{id}', [App\Http\Controllers\OrganicWebController::class, 'showProject']);
    Route::put('/projects/{id}', [App\Http\Controllers\OrganicWebController::class, 'updateProject']);
    Route::delete('/projects/{id}', [App\Http\Controllers\OrganicWebController::class, 'destroyProject']);

    // Skill runs per progetto
    Route::get('/projects/{id}/skill-runs', [App\Http\Controllers\OrganicWebController::class, 'indexSkillRuns']);
    Route::post('/projects/{id}/skill-runs', [App\Http\Controllers\OrganicWebController::class, 'startSkillRun']);

    // Human tasks per progetto
    Route::get('/projects/{id}/human-tasks', [App\Http\Controllers\OrganicWebController::class, 'indexProjectHumanTasks']);

    // Blog posts per progetto
    Route::get('/projects/{id}/blog-posts', [App\Http\Controllers\OrganicWebController::class, 'indexBlogPosts']);

    // SEO audits per progetto
    Route::get('/projects/{id}/seo-audits', [App\Http\Controllers\OrganicWebController::class, 'indexSeoAudits']);

    // Skill runs (globali)
    Route::get('/skill-runs/{runId}', [App\Http\Controllers\OrganicWebController::class, 'showSkillRun']);
    Route::post('/skill-runs/{runId}/cancel', [App\Http\Controllers\OrganicWebController::class, 'cancelSkillRun']);

    // Human tasks (inbox globale)
    Route::get('/human-tasks', [App\Http\Controllers\OrganicWebController::class, 'indexHumanTasks']);
    Route::post('/human-tasks/{taskId}/complete', [App\Http\Controllers\OrganicWebController::class, 'completeHumanTask']);
    Route::post('/human-tasks/{taskId}/upload', [App\Http\Controllers\OrganicWebController::class, 'uploadHumanTaskFile']);

    // Skill definitions (utility)
    Route::get('/skill-definitions', [App\Http\Controllers\OrganicWebController::class, 'indexSkillDefinitions']);

    // Human tasks — overdue (badge/alert)
    Route::get('/human-tasks/overdue', [App\Http\Controllers\OrganicWebController::class, 'overdueHumanTasks']);

    // Global stats
    Route::get('/stats', [App\Http\Controllers\OrganicWebController::class, 'globalStats']);

    // Utility: CRM projects disponibili (non ancora collegati)
    Route::get('/available-crm-projects', [App\Http\Controllers\OrganicWebController::class, 'availableCrmProjects']);
    Route::post('/projects/{id}/ai-suggest', [App\Http\Controllers\OrganicWebController::class, 'aiSuggest']);

    // Google Search Console data
    Route::get('/projects/{id}/gsc-data', [App\Http\Controllers\OrganicWebGscController::class, 'getGscData']);
    Route::post('/projects/{id}/gsc-refresh', [App\Http\Controllers\OrganicWebGscController::class, 'refreshGscData']);
    Route::get('/projects/{id}/gsc-properties', [App\Http\Controllers\OrganicWebGscController::class, 'getGscProperties']);
    Route::post('/projects/{id}/gsc-property', [App\Http\Controllers\OrganicWebGscController::class, 'selectGscProperty']);

    // Sitemap tab endpoints
    Route::get('/projects/{id}/sitemap/overview', [App\Http\Controllers\OrganicSitemapController::class, 'overview']);
    Route::get('/projects/{id}/sitemap/list', [App\Http\Controllers\OrganicSitemapController::class, 'list']);
    Route::post('/projects/{id}/sitemap/submit', [App\Http\Controllers\OrganicSitemapController::class, 'submit']);
    Route::delete('/projects/{id}/sitemap/{sitemapId}', [App\Http\Controllers\OrganicSitemapController::class, 'destroy']);
    Route::get('/projects/{id}/sitemap/urls', [App\Http\Controllers\OrganicSitemapController::class, 'urls']);
    Route::post('/projects/{id}/sitemap/inspect-url', [App\Http\Controllers\OrganicSitemapController::class, 'inspectUrl']);
    Route::post('/projects/{id}/sitemap/request-indexing', [App\Http\Controllers\OrganicSitemapController::class, 'requestIndexing']);
    Route::get('/projects/{id}/sitemap/coverage', [App\Http\Controllers\OrganicSitemapController::class, 'coverage']);
    Route::post('/projects/{id}/sitemap/sync-urls', [App\Http\Controllers\OrganicSitemapController::class, 'syncUrls']);
    Route::get('/projects/{id}/sitemap/alerts', [App\Http\Controllers\OrganicSitemapController::class, 'alerts']);
    Route::get('/projects/{id}/robots-txt', [App\Http\Controllers\OrganicSitemapController::class, 'robotsTxt']);

    // --- Advanced SEO Engine (Step 9) ---

    // Step 9.1 — Page + Query performance data
    Route::get('/projects/{id}/page-queries', [App\Http\Controllers\OrganicWebGscController::class, 'getPageQueries']);
    Route::post('/projects/{id}/page-queries/sync', [App\Http\Controllers\OrganicWebGscController::class, 'syncPageQueries']);

    // Step 9.3 — SEO Advisor (Groq AI analysis)
    Route::post('/projects/{id}/advisor/analyze-url', [App\Http\Controllers\OrganicWebGscController::class, 'analyzeUrl']);

    // Step 9.4 — Sitemap ping (re-submit to GSC)
    Route::post('/projects/{id}/sitemap/ping', [App\Http\Controllers\OrganicSitemapController::class, 'ping']);

    // Step 10.4 — Enterprise AI Framework (CanopyWave + Groq chat)
    Route::prefix('projects/{id}/ai')->group(function () {
        Route::post('/generate-audit', [App\Http\Controllers\OrganicAiController::class, 'generateAudit']);
        Route::post('/chat', [App\Http\Controllers\OrganicAiController::class, 'chat']);
        Route::get('/latest-audit', [App\Http\Controllers\OrganicAiController::class, 'latestAudit']);

        // Step 10.5 — AI Chat History (sessions + messages persistence)
        Route::get('/sessions', [App\Http\Controllers\OrganicAiChatController::class, 'index']);
        Route::post('/sessions', [App\Http\Controllers\OrganicAiChatController::class, 'store']);
        Route::get('/sessions/{sessionId}/messages', [App\Http\Controllers\OrganicAiChatController::class, 'messages']);
        Route::post('/sessions/{sessionId}/messages', [App\Http\Controllers\OrganicAiChatController::class, 'addMessage']);
        Route::delete('/sessions/{sessionId}', [App\Http\Controllers\OrganicAiChatController::class, 'destroy']);

        // Fase 2 — Deep Reports (CanopyWaveStrategyService) + Session Chat (GroqAssistantService)
        Route::post('/reports', [App\Http\Controllers\OrganicAiController::class, 'generateReport']);
        Route::get('/reports', [App\Http\Controllers\OrganicAiController::class, 'listReports']);
        Route::post('/sessions/{sessionId}/chat', [App\Http\Controllers\OrganicAiController::class, 'sessionChat']);
    });

    // --- Task 12: Advanced SEO Analysis (PageSpeed, Semantic Gap, SGE, Internal Links) ---
    Route::prefix('projects/{id}')->group(function () {
        // PageSpeed Insights — Enterprise (Task 13)
        Route::post('/pagespeed/analyze-full', [App\Http\Controllers\OrganicPageSpeedController::class, 'analyzeFull']);
        Route::post('/pagespeed/analyze-complete', [App\Http\Controllers\OrganicPageSpeedController::class, 'analyzeComplete']);
        Route::post('/pagespeed/{auditId}/generate-suggestions', [App\Http\Controllers\OrganicPageSpeedController::class, 'generateSuggestions']);
        Route::get('/pagespeed/verifications', [App\Http\Controllers\OrganicPageSpeedController::class, 'listVerifications']);
        Route::post('/pagespeed/verify-implementation', [App\Http\Controllers\OrganicPageSpeedController::class, 'verifyImplementation']);
        Route::get('/pagespeed/{auditId}', [App\Http\Controllers\OrganicPageSpeedController::class, 'getAudit']);
        Route::get('/pagespeed', [App\Http\Controllers\OrganicPageSpeedController::class, 'listAudits']);

        // PageSpeed Insights — Legacy (Task 12, retrocompatibile)
        Route::post('/pagespeed/analyze', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'analyzePageSpeed']);

        // Semantic Gap Analysis
        Route::post('/semantic-gap', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'findSemanticGap']);
        Route::get('/semantic-gap', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'listSemanticGaps']);

        // SGE / Schema Readiness
        Route::post('/sge/generate', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'generateSgeSchema']);
        Route::get('/sge', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'listSgeResults']);

        // Internal Link Graph + Orphan Detection
        Route::post('/links/extract', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'extractLinks']);
        Route::post('/links/calculate-orphans', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'calculateOrphans']);
        Route::get('/links/orphans', [App\Http\Controllers\OrganicSeoAnalysisController::class, 'listOrphans']);
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
});
