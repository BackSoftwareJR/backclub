<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use App\Services\MailService;
use Illuminate\Support\Facades\Log;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Task::with(['project', 'assignees', 'comments'])
            ->orderBy('created_at', 'desc');

        // Filter by Project
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Priority
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        
        // Filter by Assignee (User Filter)
        if ($request->filled('assignee_id')) {
             $query->whereHas('assignees', function ($q) use ($request) {
                $q->where('user_id', $request->assignee_id);
            });
        }

        // Role-based visibility
        if ($user->role !== 'admin') {
            // Check if strict assignment filtering is requested
            if ($request->boolean('only_assigned')) {
                 $query->whereHas('assignees', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } else {
                // Default logic: Assigned OR Project Manager
                $query->where(function ($q) use ($user) {
                    $q->whereHas('assignees', function ($subQ) use ($user) {
                        $subQ->where('user_id', $user->id);
                    })
                    ->orWhereHas('project', function ($subQ) use ($user) {
                        $subQ->where('manager_id', $user->id);
                    });
                });
            }
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'project_id' => 'required|exists:projects,id',
                'title' => 'required|string',
                'description' => 'nullable|string',
                'status' => 'required|in:pending,in_progress,review,completed,cancelled',
                'priority' => 'required|in:low,medium,high,urgent',
                'start_date' => 'nullable|date',
                'due_date' => 'nullable|date',
                'estimated_hours' => 'nullable|numeric',
                'assignees' => 'nullable|array',
                'assignees.*' => 'exists:users,id',
            ]);

            $validated['created_by'] = Auth::id();
            
            // Remove assignees from data to be saved in tasks table
            $taskData = collect($validated)->except('assignees')->toArray();
            
            $task = Task::create($taskData);
            
            if (isset($validated['assignees'])) {
                $task->assignees()->sync($validated['assignees']);
                $task->load('project');

                // Invia email agli assegnatari con MailService (PHPMailer, stesso canale dei venditori)
                $mailService = new MailService();
                foreach ($task->assignees as $assignee) {
                    try {
                        $result = $mailService->sendTaskAssignedEmail(
                            $assignee->email,
                            $assignee->name ?? $assignee->email,
                            $task
                        );
                        if (!$result['success']) {
                            Log::warning('Email task assegnata non inviata', [
                                'assignee_id' => $assignee->id,
                                'error' => $result['message'] ?? $result['error'] ?? 'unknown',
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Eccezione invio email task assegnata', [
                            'assignee_id' => $assignee->id,
                            'error' => $e->getMessage(),
                        ]);
                        // Non bloccare la creazione del task se l'email fallisce
                    }
                }
            }

            return response()->json($task->load('assignees', 'createdBy'), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }

    public function show(Task $task)
    {
        return $task->load('assignees', 'comments.user', 'documents', 'project');
    }

    public function update(Request $request, Task $task)
    {
        $oldStatus = $task->status;
        $task->update($request->except('assignees'));
        
        if ($request->has('assignees')) {
            $task->assignees()->sync($request->assignees);
            // Ideally check for new assignees and send email, but for simplicity we skip or send to all
            // Let's send to all current assignees if it's a new assignment logic, but maybe too spammy.
            // For now, only on creation is critical.
        }
        
        // Check for completion - usa MailService (PHPMailer, stesso canale dei venditori)
        if ($oldStatus !== 'completed' && $task->status === 'completed') {
            $adminEmail = config('mail.admin_email') ?? config('phpmailer.from.address') ?? 'noreply@backclub.it';
            $task->load('project');
            try {
                $mailService = new MailService();
                $mailService->sendTaskCompletedEmail(
                    $adminEmail,
                    'Admin',
                    $task,
                    Auth::user()
                );
            } catch (\Exception $e) {
                Log::error('Invio email task completata fallito', ['error' => $e->getMessage()]);
                // Non bloccare l'update del task
            }
        }
        
        return response()->json($task->load('assignees', 'createdBy'));
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(null, 204);
    }

    public function overdue(Request $request)
    {
        $user = Auth::user();
        $query = Task::where('due_date', '<', now())
            ->where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->with('project', 'assignees')
            ->orderBy('due_date', 'asc');

        if ($user->role !== 'admin') {
            $query->whereHas('project', function ($q) use ($user) {
                $q->where('manager_id', $user->id);
            });
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        return $query->get();
    }
}
