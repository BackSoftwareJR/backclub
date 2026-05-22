<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Invoice;
use App\Models\InvoiceInstallment;

class InvoiceInstallmentController extends Controller
{
    /**
     * Lista rate di una fattura
     */
    public function index(Request $request, Invoice $invoice)
    {
        $installments = $invoice->installments()
            ->orderBy('installment_number', 'asc')
            ->get();

        return response()->json($installments);
    }

    /**
     * Crea rate per una fattura
     */
    public function createInstallments(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'installments_count' => 'required|integer|min:2|max:12',
            'first_due_date' => 'required|date',
            'interval_days' => 'required|integer|min:1',
        ]);

        // Calcola importo per rata
        $amountPerInstallment = $invoice->total_cocchi / $validated['installments_count'];

        // Elimina rate esistenti se presenti
        $invoice->installments()->delete();

        // Crea le rate
        $installments = [];
        $currentDate = \Carbon\Carbon::parse($validated['first_due_date']);

        for ($i = 1; $i <= $validated['installments_count']; $i++) {
            // Ultima rata: aggiungi il resto per evitare arrotondamenti
            $amount = ($i === $validated['installments_count']) 
                ? $invoice->total_cocchi - ($amountPerInstallment * ($validated['installments_count'] - 1))
                : $amountPerInstallment;

            $installments[] = InvoiceInstallment::create([
                'invoice_id' => $invoice->id,
                'installment_number' => $i,
                'amount_cocchi' => round($amount, 2),
                'due_date' => $currentDate->copy()->addDays(($i - 1) * $validated['interval_days'])->toDateString(),
                'status' => 'pending',
            ]);
        }

        // Aggiorna fattura
        $invoice->update([
            'payment_type' => 'installments',
            'installments_count' => $validated['installments_count'],
        ]);

        return response()->json([
            'message' => 'Rate create con successo',
            'installments' => $installments,
        ], 201);
    }

    /**
     * Aggiorna una rata
     */
    public function update(Request $request, InvoiceInstallment $invoiceInstallment)
    {
        $validated = $request->validate([
            'due_date' => 'date',
            'amount_cocchi' => 'numeric|min:0',
            'status' => 'in:pending,paid,overdue,cancelled',
            'notes' => 'nullable|string',
        ]);

        $invoiceInstallment->update($validated);

        return response()->json($invoiceInstallment->load(['invoice', 'payments']));
    }

    /**
     * Elimina una rata
     */
    public function destroy(InvoiceInstallment $invoiceInstallment)
    {
        $invoiceInstallment->delete();
        return response()->json(null, 204);
    }
}

