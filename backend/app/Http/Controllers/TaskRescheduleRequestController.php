<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TaskRescheduleRequest;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Support\Facades\Auth;

class TaskRescheduleRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = TaskRescheduleRequest::with(['task.project', 'user'])
            ->orderBy('created_at', 'desc');

        if ($user->role !== 'admin') {
            $query->where(function($q) use ($user) {
                $q->whereHas('task.project', function ($subQ) use ($user) {
                    $subQ->where('manager_id', $user->id);
                })
                ->orWhere('user_id', $user->id);
            });
        }

        if ($request->has('project_id')) {
            $query->whereHas('task', function ($q) use ($request) {
                $q->where('project_id', $request->project_id);
            });
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'requested_date' => 'required|date|after:today',
            'reason' => 'nullable|string'
        ]);

        $rescheduleRequest = TaskRescheduleRequest::create([
            'task_id' => $validated['task_id'],
            'user_id' => Auth::id(),
            'requested_date' => $validated['requested_date'],
            'reason' => $validated['reason'],
            'status' => 'pending'
        ]);

        // Add system comment
        TaskComment::create([
            'task_id' => $validated['task_id'],
            'user_id' => Auth::id(),
            'content' => "Richiesta spostamento scadenza al " . date('d/m/Y', strtotime($validated['requested_date'])) . " inviata."
        ]);

        // Send email to Admin
        $adminEmail = config('mail.admin_email') ?? 'bsnoreplyslm@gmail.com';
        \Illuminate\Support\Facades\Mail::to($adminEmail)->send(new \App\Mail\TaskRescheduleRequested($rescheduleRequest));

        return response()->json($rescheduleRequest, 201);
    }

    public function update(Request $request, TaskRescheduleRequest $rescheduleRequest)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected'
        ]);

        $this->processReschedule($rescheduleRequest, $validated['status'], Auth::user());

        return response()->json($rescheduleRequest);
    }

    public function approveFromEmail(Request $request, TaskRescheduleRequest $rescheduleRequest)
    {
        if ($rescheduleRequest->status !== 'pending') {
            return response('Questa richiesta è già stata gestita.', 200);
        }

        $this->processReschedule($rescheduleRequest, 'approved', null); // System/Admin action

        return response('Richiesta approvata con successo. Puoi chiudere questa finestra.', 200);
    }

    public function rejectFromEmail(Request $request, TaskRescheduleRequest $rescheduleRequest)
    {
        if ($rescheduleRequest->status !== 'pending') {
            return response('Questa richiesta è già stata gestita.', 200);
        }

        $this->processReschedule($rescheduleRequest, 'rejected', null);

        return response('Richiesta rifiutata con successo. Puoi chiudere questa finestra.', 200);
    }

    private function processReschedule($rescheduleRequest, $status, $user)
    {
        $rescheduleRequest->update(['status' => $status]);
        $task = $rescheduleRequest->task;

        if ($status === 'approved') {
            $task->update(['due_date' => $rescheduleRequest->requested_date]);
            $content = "Richiesta di spostamento approvata. Nuova scadenza: " . $rescheduleRequest->requested_date->format('d/m/Y');
        } else {
            $content = "Richiesta di spostamento rifiutata.";
        }

        // If user is null (email action), try to find an admin to attribute the comment to
        if (!$user) {
            $user = \App\Models\User::where('role', 'admin')->first();
        }

        // Add comment only if we have a user (to avoid SQL error on non-nullable user_id)
        if ($user) {
            TaskComment::create([
                'task_id' => $task->id,
                'user_id' => $user->id,
                'content' => $content
            ]);
        }
    }
}
