<?php

namespace App\Http\Controllers;

use App\Models\ProjectChatMessage;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ProjectChatController extends Controller
{
    /**
     * GET /api/projects/{projectId}/chat
     * Get chat messages for a project
     */
    public function getMessages(Request $request, $projectId)
    {
        $isPmChat = $request->get('is_pm_chat', false);
        $limit = $request->get('limit', 50);
        $offset = $request->get('offset', 0);

        $messages = ProjectChatMessage::where('project_id', $projectId)
            ->where('is_pm_chat', $isPmChat)
            ->with(['user', 'parentMessage'])
            ->orderBy('created_at', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $messages->reverse()->values(),
            'has_more' => ProjectChatMessage::where('project_id', $projectId)
                ->where('is_pm_chat', $isPmChat)
                ->count() > ($offset + $limit),
        ]);
    }

    /**
     * POST /api/projects/{projectId}/chat
     * Send a message
     */
    public function sendMessage(Request $request, $projectId)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
            'is_pm_chat' => 'nullable|boolean',
            'parent_message_id' => 'nullable|exists:project_chat_messages,id',
            'attachments' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Verify project exists
            $project = Project::findOrFail($projectId);

            $message = ProjectChatMessage::create([
                'project_id' => $projectId,
                'user_id' => auth()->id(),
                'message' => $request->message,
                'is_pm_chat' => $request->is_pm_chat ?? false,
                'parent_message_id' => $request->parent_message_id,
                'attachments' => $request->attachments,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Message sent successfully',
                'data' => $message->load('user'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error sending message: ' . $e->getMessage() ,
            ], 500);
        }
    }

    /**
     * PUT /api/chat/messages/{id}
     * Edit a message
     */
    public function updateMessage(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $chatMessage = ProjectChatMessage::findOrFail($id);

            // Only allow user to edit their own messages
            if ($chatMessage->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to edit this message',
                ], 403);
            }

            $chatMessage->update($request->only('message'));

            return response()->json([
                'success' => true,
                'message' => 'Message updated successfully',
                'data' => $chatMessage->fresh()->load('user'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating message: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/chat/messages/{id}
     * Delete a message
     */
    public function deleteMessage($id)
    {
        try {
            $chatMessage = ProjectChatMessage::findOrFail($id);

            // Only allow user to delete their own messages
            if ($chatMessage->user_id !== auth()->id() && !auth()->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to delete this message',
                ], 403);
            }

            $chatMessage->delete();

            return response()->json([
                'success' => true,
                'message' => 'Message deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting message: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/chat/messages/{id}/read
     * Mark message as read
     */
    public function markAsRead($id)
    {
        try {
            $chatMessage = ProjectChatMessage::findOrFail($id);
            $chatMessage->update(['is_read' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Message marked as read',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error marking message as read: ' . $e->getMessage(),
            ], 500);
        }
    }
}
