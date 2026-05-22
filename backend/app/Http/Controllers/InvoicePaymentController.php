<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\InvoiceInstallment;

class InvoicePaymentController extends Controller
{
    /**
     * Lista pagamenti di una fattura
     */
    public function index(Request $request, Invoice $invoice)
    {
        $payments = $invoice->payments()
            ->with(['installment', 'creator'])
            ->orderBy('payment_date', 'desc')
            ->get();

        return response()->json($payments);
    }

    /**
     * Registra pagamento
     */
    public function store(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'installment_id' => 'nullable|exists:invoice_installments,id',
            'amount_cocchi' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|max:100',
            'payment_reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'document_path' => 'nullable|string',
        ]);

        // Verifica che l'importo non superi il residuo
        $remaining = $invoice->remaining_amount;
        if ($validated['amount_cocchi'] > $remaining) {
            return response()->json([
                'message' => "L'importo supera il residuo della fattura ({$remaining} cocchi)",
            ], 422);
        }

        $validated['invoice_id'] = $invoice->id;
        $validated['created_by'] = Auth::id();

        $payment = InvoicePayment::create($validated);

        // Se è una rata specifica, aggiorna lo stato
        if ($validated['installment_id']) {
            $installment = InvoiceInstallment::find($validated['installment_id']);
            $totalPaid = $installment->getTotalPaidAttribute();
            
            if ($totalPaid >= $installment->amount_cocchi) {
                $installment->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'payment_method' => $validated['payment_method'],
                    'payment_reference' => $validated['payment_reference'],
                ]);
            }
        }

        // Aggiorna stato fattura se completamente pagata
        if ($invoice->isFullyPaid() && $invoice->status !== 'paid') {
            $invoice->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        return response()->json($payment->load(['installment', 'creator']), 201);
    }

    /**
     * Aggiorna pagamento
     */
    public function update(Request $request, InvoicePayment $invoicePayment)
    {
        $validated = $request->validate([
            'amount_cocchi' => 'numeric|min:0.01',
            'payment_date' => 'date',
            'payment_method' => 'string|max:100',
            'payment_reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'document_path' => 'nullable|string',
        ]);

        $invoicePayment->update($validated);

        return response()->json($invoicePayment->load(['installment', 'creator']));
    }

    /**
     * Elimina pagamento
     */
    public function destroy(InvoicePayment $invoicePayment)
    {
        $invoice = $invoicePayment->invoice;
        $installment = $invoicePayment->installment;

        $invoicePayment->delete();

        // Ricalcola stato rata se necessario
        if ($installment) {
            $totalPaid = $installment->getTotalPaidAttribute();
            if ($totalPaid < $installment->amount_cocchi) {
                $installment->update([
                    'status' => 'pending',
                    'paid_at' => null,
                ]);
            }
        }

        // Ricalcola stato fattura
        if (!$invoice->isFullyPaid() && $invoice->status === 'paid') {
            $invoice->update([
                'status' => 'sent',
                'paid_at' => null,
            ]);
        }

        return response()->json(null, 204);
    }
}

