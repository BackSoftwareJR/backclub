<?php

namespace App\Http\Controllers;

use App\Models\SellerSupportTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SellerSupportTicketController extends Controller
{
    /**
     * POST /api/seller/support-tickets
     * Seller: create a new ticket
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user->seller_id) {
            return response()->json(['message' => 'Utente non è un venditore'], 403);
        }

        $validated = Validator::make($request->all(), [
            'recipient_type' => 'required|in:admin,tecnico',
            'message' => 'required|string|min:10|max:10000',
            'subject' => 'nullable|string|max:255',
        ])->validate();

        $subject = $validated['subject'] ?? null;
        if (!$subject && !empty(trim($validated['message']))) {
            $firstLine = explode("\n", trim($validated['message']))[0] ?? '';
            $subject = \Str::limit($firstLine, 80);
        }

        $category = $validated['recipient_type'] === 'admin' ? 'amministrazione' : 'tecnico';

        $ticket = SellerSupportTicket::create([
            'seller_id' => $user->seller_id,
            'recipient_type' => $validated['recipient_type'],
            'message' => $validated['message'],
            'subject' => $subject,
            'category' => $category,
            'status' => 'aperto',
            'priority' => 'media',
        ]);

        $ticket->load('seller.user');
        return response()->json($this->formatTicket($ticket), 201);
    }

    /**
     * GET /api/seller/support-tickets
     * Seller: list my tickets
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user->seller_id) {
            return response()->json(['message' => 'Utente non è un venditore'], 403);
        }

        $tickets = SellerSupportTicket::where('seller_id', $user->seller_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets->map(fn ($t) => $this->formatTicket($t)));
    }

    /**
     * GET /api/seller/support-tickets/{id}
     * Seller: get single ticket (own only)
     */
    public function show($id)
    {
        $user = Auth::user();
        if (!$user->seller_id) {
            return response()->json(['message' => 'Utente non è un venditore'], 403);
        }

        $ticket = SellerSupportTicket::where('seller_id', $user->seller_id)->findOrFail($id);
        return response()->json($this->formatTicket($ticket));
    }

    /**
     * GET /api/support-tickets
     * Admin: list all tickets (with filters)
     */
    public function adminIndex(Request $request)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Non autorizzato'], 403);
        }

        $query = SellerSupportTicket::with(['seller.user', 'assignedTo']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('recipient_type')) {
            $query->where('recipient_type', $request->recipient_type);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('subject', 'like', "%{$term}%")
                  ->orWhere('message', 'like', "%{$term}%")
                  ->orWhereHas('seller.user', function ($uq) use ($term) {
                      $uq->where('name', 'like', "%{$term}%")
                         ->orWhere('email', 'like', "%{$term}%");
                  });
            });
        }

        $tickets = $query->orderBy('created_at', 'desc')->get();
        return response()->json($tickets->map(fn ($t) => $this->formatTicketForAdmin($t)));
    }

    /**
     * GET /api/support-tickets/{id}
     * Admin: get single ticket
     */
    public function adminShow($id)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Non autorizzato'], 403);
        }

        $ticket = SellerSupportTicket::with(['seller.user', 'assignedTo'])->findOrFail($id);
        return response()->json($this->formatTicketForAdmin($ticket));
    }

    /**
     * PUT /api/support-tickets/{id}
     * Admin: update ticket (status, priority, assigned_to, response)
     */
    public function adminUpdate(Request $request, $id)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Non autorizzato'], 403);
        }

        $ticket = SellerSupportTicket::with(['seller.user', 'assignedTo'])->findOrFail($id);

        $validated = Validator::make($request->all(), [
            'status' => 'nullable|in:aperto,in_lavorazione,risolto,chiuso',
            'priority' => 'nullable|in:bassa,media,alta,urgente',
            'assigned_to' => 'nullable|exists:users,id',
            'response' => 'nullable|string|max:10000',
        ])->validate();

        if (array_key_exists('status', $validated)) {
            $ticket->status = $validated['status'];
        }
        if (array_key_exists('priority', $validated)) {
            $ticket->priority = $validated['priority'];
        }
        if (array_key_exists('assigned_to', $validated)) {
            $ticket->assigned_to = $validated['assigned_to'];
        }
        if (array_key_exists('response', $validated)) {
            $ticket->response = $validated['response'];
            $ticket->response_at = now();
        }

        $ticket->save();
        return response()->json($this->formatTicketForAdmin($ticket->fresh(['seller.user', 'assignedTo'])));
    }

    private function formatTicket(SellerSupportTicket $ticket): array
    {
        $ticket->loadMissing(['seller.user']);
        return [
            'id' => $ticket->id,
            'seller_id' => $ticket->seller_id,
            'recipient_type' => $ticket->recipient_type,
            'subject' => $ticket->subject,
            'message' => $ticket->message,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'assigned_to' => $ticket->assigned_to,
            'response' => $ticket->response,
            'response_at' => $ticket->response_at?->toIso8601String(),
            'created_at' => $ticket->created_at->toIso8601String(),
            'updated_at' => $ticket->updated_at->toIso8601String(),
        ];
    }

    private function formatTicketForAdmin(SellerSupportTicket $ticket): array
    {
        $arr = $this->formatTicket($ticket);
        $arr['seller_name'] = $ticket->seller?->user?->name ?? '';
        $arr['seller_email'] = $ticket->seller?->user?->email ?? '';
        $arr['assigned_to_name'] = $ticket->assignedTo?->name ?? null;
        return $arr;
    }
}
