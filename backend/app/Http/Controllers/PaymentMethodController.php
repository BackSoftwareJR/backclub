<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    /**
     * GET /api/payment-methods
     * Lista metodi pagamento
     */
    public function index(Request $request)
    {
        $query = PaymentMethod::with(['serbatoio', 'assignedTo']);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('cards_only')) {
            $query->cards();
        }

        $methods = $query->orderBy('is_default', 'desc')
                         ->orderBy('name', 'asc')
                         ->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    /**
     * GET /api/payment-methods/active
     * Solo metodi attivi
     */
    public function active()
    {
        $methods = PaymentMethod::active()
            ->orderBy('is_default', 'desc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    /**
     * GET /api/payment-methods/expiring
     * Carte in scadenza
     */
    public function expiring()
    {
        $methods = PaymentMethod::expiringSoon(90)->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    /**
     * GET /api/payment-methods/{id}
     * Dettaglio metodo pagamento
     */
    public function show($id)
    {
        $method = PaymentMethod::with(['serbatoio', 'assignedTo'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $method,
        ]);
    }

    /**
     * POST /api/payment-methods
     * Crea nuovo metodo pagamento
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:contanti,bonifico,carta_credito,carta_debito,paypal,stripe,revolut,altro',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'card_holder' => 'nullable|string|max:255',
            'card_last_4' => 'nullable|string|size:4',
            'card_brand' => 'nullable|string|max:50',
            'card_expiry_month' => 'nullable|integer|min:1|max:12',
            'card_expiry_year' => 'nullable|integer|min:' . date('Y'),
            'card_type' => 'nullable|in:credito,debito,prepagata',
            'bank_name' => 'nullable|string|max:255',
            'iban' => 'nullable|string|max:34',
            'swift' => 'nullable|string|max:11',
            'account_holder' => 'nullable|string|max:255',
            'wallet_email' => 'nullable|email',
            'wallet_account_id' => 'nullable|string|max:255',
            'serbatoio_id' => 'nullable|exists:serbatoi,id',
            'assigned_to_user_id' => 'nullable|exists:users,id',
            'monthly_limit' => 'nullable|numeric|min:0',
            'transaction_limit' => 'nullable|numeric|min:0',
            'is_company_owned' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $method = PaymentMethod::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Metodo pagamento creato',
            'data' => $method,
        ], 201);
    }

    /**
     * PUT /api/payment-methods/{id}
     * Aggiorna metodo pagamento
     */
    public function update($id, Request $request)
    {
        $method = PaymentMethod::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'card_expiry_month' => 'nullable|integer|min:1|max:12',
            'card_expiry_year' => 'nullable|integer|min:' . date('Y'),
            'monthly_limit' => 'nullable|numeric|min:0',
            'transaction_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $method->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Metodo pagamento aggiornato',
            'data' => $method->fresh(),
        ]);
    }

    /**
     * PUT /api/payment-methods/{id}/set-default
     * Imposta come metodo predefinito
     */
    public function setDefault($id)
    {
        $method = PaymentMethod::findOrFail($id);
        $method->setAsDefault();

        return response()->json([
            'success' => true,
            'message' => 'Metodo impostato come predefinito',
            'data' => $method,
        ]);
    }

    /**
     * PUT /api/payment-methods/{id}/reset-monthly
     * Reset spesa mensile
     */
    public function resetMonthly($id)
    {
        $method = PaymentMethod::findOrFail($id);
        $method->resetMonthlySpent();

        return response()->json([
            'success' => true,
            'message' => 'Spesa mensile azzerata',
            'data' => $method,
        ]);
    }

    /**
     * DELETE /api/payment-methods/{id}
     * Elimina metodo pagamento
     */
    public function destroy($id)
    {
        $method = PaymentMethod::findOrFail($id);
        
        if ($method->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi eliminare il metodo predefinito',
            ], 400);
        }

        $method->delete();

        return response()->json([
            'success' => true,
            'message' => 'Metodo pagamento eliminato',
        ]);
    }

    /**
     * GET /api/payment-methods/stats
     * Statistiche metodi pagamento
     */
    public function stats()
    {
        $stats = [
            'total_active' => PaymentMethod::active()->count(),
            'total_cards' => PaymentMethod::cards()->active()->count(),
            'cards_expiring' => PaymentMethod::expiringSoon(90)->count(),
            'by_type' => PaymentMethod::active()
                ->selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->get(),
            'total_monthly_limit' => PaymentMethod::active()->sum('monthly_limit'),
            'total_spent_this_month' => PaymentMethod::active()->sum('current_month_spent'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

