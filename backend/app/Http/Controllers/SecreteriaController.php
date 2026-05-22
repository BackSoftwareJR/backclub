<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Models\Project;
use App\Models\Client;
use App\Models\User;
use App\Models\Task;
use App\Models\Event;
use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\Invoice;
use App\Models\FinancialTransaction;
use App\Models\EmailTemplate;
use App\Models\EmailSentLog;
use Carbon\Carbon;

class SecreteriaController extends Controller
{
    /**
     * Middleware: solo segreteria e admin possono accedere
     */
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = Auth::user();
            if (!$user || !$user->canAccessSecreteria()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            return $next($request);
        });
    }

    /**
     * Dashboard Segreteria
     */
    public function dashboard()
    {
        $data = [
            'overview' => $this->getOverview(),
            'projects_summary' => $this->getProjectsSummary(),
            'clients_summary' => $this->getClientsSummary(),
            'users_summary' => $this->getUsersSummary(),
            'recent_invoices' => $this->getRecentInvoices(),
            'pending_tasks' => $this->getPendingTasks(),
            'upcoming_events' => $this->getUpcomingEvents(),
        ];

        return response()->json($data);
    }

    /**
     * Overview generale
     */
    private function getOverview(): array
    {
        return [
            'total_projects' => Project::count(),
            'active_projects' => Project::where('status', 'active')->count(),
            'total_clients' => Client::where('is_active', true)->count(),
            'total_users' => User::where('is_active', true)
                ->whereIn('role', ['dipendente', 'freelance'])
                ->count(),
            'pending_invoices' => Invoice::where('status', 'sent')->count(),
            'overdue_invoices' => Invoice::where('status', 'overdue')->count(),
        ];
    }

    /**
     * Riepilogo progetti
     */
    private function getProjectsSummary(): array
    {
        $projects = Project::with(['client', 'manager'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'client' => $project->client?->company_name,
                    'manager' => $project->manager?->name,
                    'status' => $project->status,
                    'priority' => $project->priority,
                    'budget_cocchi' => (float) ($project->budget_cocchi ?? 0),
                    'spent_cocchi' => (float) $project->spent_cocchi,
                ];
            });

        return [
            'total' => Project::count(),
            'recent' => $projects,
        ];
    }

    /**
     * Riepilogo clienti
     */
    private function getClientsSummary(): array
    {
        $clients = Client::where('is_active', true)
            ->orderBy('company_name', 'asc')
            ->get()
            ->map(function ($client) {
                $projectsCount = Project::where('client_id', $client->id)->count();
                $totalInvoiced = Invoice::where('client_id', $client->id)
                    ->where('status', 'paid')
                    ->sum('total_cocchi');

                return [
                    'id' => $client->id,
                    'company_name' => $client->company_name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'projects_count' => $projectsCount,
                    'total_invoiced' => (float) $totalInvoiced,
                ];
            });

        return [
            'total' => Client::where('is_active', true)->count(),
            'list' => $clients,
        ];
    }

    /**
     * Riepilogo utenti (dipendenti e freelance)
     */
    private function getUsersSummary(): array
    {
        $users = User::where('is_active', true)
            ->whereIn('role', ['dipendente', 'freelance'])
            ->orWhereHas('roles', function ($q) {
                $q->whereIn('role', ['dipendente', 'freelance']);
            })
            ->orderBy('name', 'asc')
            ->get()
            ->map(function ($user) {
                $tasksCount = Task::whereHas('assignees', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })->count();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'phone' => $user->phone,
                    'department' => $user->department,
                    'tasks_count' => $tasksCount,
                ];
            });

        return [
            'total' => $users->count(),
            'list' => $users,
        ];
    }

    /**
     * Fatture recenti
     */
    private function getRecentInvoices(): array
    {
        return Invoice::with(['client', 'project'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'client' => $invoice->client?->company_name,
                    'project' => $invoice->project?->name,
                    'total_cocchi' => (float) $invoice->total_cocchi,
                    'status' => $invoice->status,
                    'due_date' => $invoice->due_date,
                ];
            })
            ->toArray();
    }

    /**
     * Task in sospeso
     */
    private function getPendingTasks(): array
    {
        return Task::with(['project', 'assignees'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderBy('due_date', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'project' => $task->project?->name,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'assignees' => $task->assignees->pluck('name')->toArray(),
                ];
            })
            ->toArray();
    }

    /**
     * Eventi imminenti
     */
    private function getUpcomingEvents(): array
    {
        return Event::with(['project', 'createdBy'])
            ->where('start_date', '>=', now())
            ->orderBy('start_date', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'project' => $event->project?->name,
                    'start_date' => $event->start_date,
                    'end_date' => $event->end_date,
                    'type' => $event->type,
                    'location' => $event->location,
                ];
            })
            ->toArray();
    }

    /**
     * Lista tutti i progetti
     */
    public function projects(Request $request)
    {
        $query = Project::with(['client', 'manager', 'members']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        return response()->json($query->get());
    }

    /**
     * Lista tutti i clienti
     */
    public function clients()
    {
        $clients = Client::where('is_active', true)
            ->withCount('projects')
            ->orderBy('company_name', 'asc')
            ->get();

        return response()->json($clients);
    }

    /**
     * Lista dipendenti e freelance
     */
    public function users()
    {
        $users = User::where('is_active', true)
            ->where(function ($q) {
                $q->whereIn('role', ['dipendente', 'freelance'])
                  ->orWhereHas('roles', function ($q2) {
                      $q2->whereIn('role', ['dipendente', 'freelance']);
                  });
            })
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($users);
    }

    /**
     * Invia email personalizzata (usa EmailTemplateController)
     */
    public function sendEmail(Request $request)
    {
        // Delega a EmailTemplateController::sendCustom
        $emailController = new \App\Http\Controllers\EmailTemplateController();
        return $emailController->sendCustom($request);
    }

    /**
     * Crea task in un progetto
     */
    public function createTask(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'required|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'assignees' => 'nullable|array',
            'assignees.*' => 'exists:users,id',
        ]);

        $validated['created_by'] = Auth::id();

        $task = Task::create($validated);

        if (isset($validated['assignees'])) {
            $task->assignees()->sync($validated['assignees']);
        }

        return response()->json($task->load(['project', 'assignees', 'createdBy']), 201);
    }

    /**
     * Crea evento nel calendario progetto
     */
    public function createEvent(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'type' => 'required|in:event,meeting,deadline,call',
            'location' => 'nullable|string|max:255',
        ]);

        $validated['created_by'] = Auth::id();

        $event = Event::create($validated);

        return response()->json($event->load(['project', 'createdBy']), 201);
    }

    /**
     * Gestione documenti
     */
    public function documents(Request $request)
    {
        $query = Document::with(['category', 'uploadedBy', 'attachable']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('attachable_type')) {
            $query->where('attachable_type', $request->attachable_type);
        }

        if ($request->filled('attachable_id')) {
            $query->where('attachable_id', $request->attachable_id);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    /**
     * Categorie documenti
     */
    public function documentCategories()
    {
        $categories = DocumentCategory::with('children')
            ->whereNull('parent_id')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($categories);
    }

    /**
     * Gestione fatture
     */
    public function invoices(Request $request)
    {
        $query = Invoice::with(['client', 'project', 'items']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    /**
     * Crea fattura
     */
    public function createInvoice(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price_cocchi' => 'required|numeric|min:0',
            'tax_cocchi' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Calcola totali
        $amountCocchi = 0;
        foreach ($validated['items'] as $item) {
            $itemTotal = $item['quantity'] * $item['unit_price_cocchi'];
            $amountCocchi += $itemTotal;
        }

        $taxCocchi = $validated['tax_cocchi'] ?? 0;
        $totalCocchi = $amountCocchi + $taxCocchi;

        // Crea fattura
        $invoice = Invoice::create([
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'client_id' => $validated['client_id'],
            'project_id' => $validated['project_id'] ?? null,
            'issue_date' => $validated['issue_date'],
            'due_date' => $validated['due_date'],
            'amount_cocchi' => $amountCocchi,
            'tax_cocchi' => $taxCocchi,
            'total_cocchi' => $totalCocchi,
            'notes' => $validated['notes'] ?? null,
            'created_by' => Auth::id(),
            'status' => 'draft',
        ]);

        // Crea righe fattura
        foreach ($validated['items'] as $item) {
            $invoice->items()->create([
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price_cocchi' => $item['unit_price_cocchi'],
                'total_cocchi' => $item['quantity'] * $item['unit_price_cocchi'],
            ]);
        }

        return response()->json($invoice->load(['client', 'project', 'items']), 201);
    }

    /**
     * Assegna cocchi a progetto
     */
    public function assignCocchi(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'amount_cocchi' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $project = Project::findOrFail($validated['project_id']);
        
        $oldBudget = $project->budget_cocchi ?? 0;
        $newBudget = $oldBudget + $validated['amount_cocchi'];

        $project->update([
            'budget_cocchi' => $newBudget,
        ]);

        // Crea transazione finanziaria
        FinancialTransaction::create([
            'type' => 'entrata',
            'amount_cocchi' => $validated['amount_cocchi'],
            'description' => $validated['description'] ?? "Assegnazione budget progetto: {$project->name}",
            'category' => 'budget_assignment',
            'project_id' => $project->id,
            'user_id' => Auth::id(),
            'transaction_date' => now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Cocchi assegnati con successo',
            'project' => $project->fresh(),
        ]);
    }
}

