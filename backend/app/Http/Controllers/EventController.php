<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Event;
use Illuminate\Support\Facades\Auth;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $query = Event::with('project', 'creator');
        $user = Auth::user();
        
        // Filter by Project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        } else {
            // If no project_id is specified
            if ($user->role !== 'admin') {
                // Non-admins only see events for projects they are members of
                $query->whereHas('project', function($q) use ($user) {
                    $q->whereHas('members', function($m) use ($user) {
                        $m->where('user_id', $user->id);
                    })
                    ->orWhere('manager_id', $user->id);
                });
            }
        }

        // Filter by User (Creator) - mostly for Admin use or specific filtering
        if ($request->has('user_id')) {
            $query->where('created_by', $request->user_id);
        }
        
        // Filter by date range if provided
        if ($request->has('start') && $request->has('end')) {
            $query->whereBetween('start_date', [$request->start, $request->end]);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'project_id' => 'nullable|exists:projects,id',
            'type' => 'nullable|string',
            'location' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();

        $event = Event::create($validated);

        // Send email to project members
        if ($event->project_id) {
            $project = \App\Models\Project::with('members')->find($event->project_id);
            if ($project) {
                foreach ($project->members as $member) {
                    if ($member->id !== Auth::id()) { // Don't send to self
                        \Illuminate\Support\Facades\Mail::to($member->email)->send(new \App\Mail\ProjectEventAdded($event));
                    }
                }
            }
        }

        return response()->json($event, 201);
    }

    public function show(Event $event)
    {
        return $event->load('project', 'creator');
    }

    public function update(Request $request, Event $event)
    {
        // Authorization check (optional, e.g., only creator or admin)
        if ($event->created_by !== Auth::id() && Auth::user()->role !== 'admin') {
             // For now, let's allow project members to edit if we had that check, but simple check:
             // return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'string',
            'description' => 'nullable|string',
            'start_date' => 'date',
            'end_date' => 'date|after_or_equal:start_date',
            'project_id' => 'nullable|exists:projects,id',
            'type' => 'nullable|string',
            'location' => 'nullable|string',
        ]);

        $event->update($validated);

        return response()->json($event);
    }

    public function destroy(Event $event)
    {
        $event->delete();
        return response()->json(null, 204);
    }
}
