<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\EmployeePayment;
use App\Models\User;
use App\Models\CocchiReservoir;

class EmployeePaymentController extends Controller
{
    /**
     * Lista pagamenti dipendenti
     */
    public function index(Request $request)
    {
        $query = EmployeePayment::with(['user', 'reservoir', 'creator']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->where('payment_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('payment_date', '<=', $request->date_to);
        }

        return response()->json($query->orderBy('payment_date', 'desc')->paginate($request->get('per_page', 50)));
    }

    /**
     * Crea pagamento dipendente
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:salary,advance,expense_reimbursement,bonus,other',
            'amount_cocchi' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'description' => 'nullable|string',
            'reservoir_id' => 'nullable|exists:cocchi_reservoirs,id',
            'payment_method' => 'nullable|string|max:100',
            'payment_reference' => 'nullable|string|max:255',
            'document_path' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = 'pending';

        $payment = EmployeePayment::create($validated);

        // Se è specificato un serbatoio, preleva i cocchi
        if (isset($validated['reservoir_id'])) {
            try {
                $reservoir = CocchiReservoir::findOrFail($validated['reservoir_id']);
                $reservoir->withdraw(
                    $validated['amount_cocchi'],
                    "Pagamento {$validated['type']} a {$payment->user->name}",
                    Auth::id(),
                    'employee_payment',
                    $payment->id
                );
            } catch (\Exception $e) {
                // Se il prelievo fallisce, elimina il pagamento
                $payment->delete();
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        return response()->json($payment->load(['user', 'reservoir', 'creator']), 201);
    }

    /**
     * Marca pagamento come effettuato
     */
    public function markAsPaid(Request $request, EmployeePayment $employeePayment)
    {
        $validated = $request->validate([
            'payment_method' => 'nullable|string|max:100',
            'payment_reference' => 'nullable|string|max:255',
        ]);

        $employeePayment->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_method' => $validated['payment_method'] ?? $employeePayment->payment_method,
            'payment_reference' => $validated['payment_reference'] ?? $employeePayment->payment_reference,
        ]);

        return response()->json($employeePayment->load(['user', 'reservoir', 'creator']));
    }

    /**
     * Dettagli pagamento
     */
    public function show(EmployeePayment $employeePayment)
    {
        return response()->json($employeePayment->load(['user', 'reservoir', 'creator']));
    }

    /**
     * Aggiorna pagamento
     */
    public function update(Request $request, EmployeePayment $employeePayment)
    {
        $validated = $request->validate([
            'amount_cocchi' => 'numeric|min:0.01',
            'payment_date' => 'date',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
            'description' => 'nullable|string',
            'status' => 'in:pending,paid,cancelled',
        ]);

        $employeePayment->update($validated);

        return response()->json($employeePayment->load(['user', 'reservoir', 'creator']));
    }

    /**
     * Elimina pagamento
     */
    public function destroy(EmployeePayment $employeePayment)
    {
        // Se era stato prelevato da un serbatoio, ripristina
        if ($employeePayment->reservoir_id && $employeePayment->status === 'paid') {
            try {
                $reservoir = $employeePayment->reservoir;
                $reservoir->deposit(
                    $employeePayment->amount_cocchi,
                    "Annullamento pagamento {$employeePayment->type} a {$employeePayment->user->name}",
                    Auth::id(),
                    'employee_payment',
                    $employeePayment->id
                );
            } catch (\Exception $e) {
                // Log errore ma procedi con eliminazione
            }
        }

        $employeePayment->delete();
        return response()->json(null, 204);
    }
}

