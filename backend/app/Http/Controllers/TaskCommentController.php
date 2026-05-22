<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        return $task->comments()->with('user')->get();
    }

    public function store(Request $request, Task $task)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'content' => $validated['content'],
            'user_id' => Auth::id(),
            'read_by' => json_encode([Auth::id()]),
        ]);

        return response()->json($comment->load('user'), 201);
    }
}
