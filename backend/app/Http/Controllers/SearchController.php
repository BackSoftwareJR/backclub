<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Task;
use App\Models\Client;
use App\Models\User;
use App\Models\Event;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->input('query');

        if (!$query) {
            return response()->json([]);
        }

        $projects = Project::where('name', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'description']);

        $tasks = Task::where('title', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->with('project:id,name')
            ->limit(5)
            ->get(['id', 'title', 'description', 'project_id']);

        $clients = Client::where('company_name', 'like', "%{$query}%")
            ->orWhere('email', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'company_name', 'email']);

        $users = User::where('name', 'like', "%{$query}%")
            ->orWhere('email', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'email', 'avatar']);
            
        $events = Event::where('title', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'title', 'start_date']);

        return response()->json([
            'projects' => $projects,
            'tasks' => $tasks,
            'clients' => $clients,
            'users' => $users,
            'events' => $events,
        ]);
    }
}
