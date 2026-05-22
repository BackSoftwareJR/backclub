<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PaymentPlan;
use App\Models\PaymentPlanInstallment;
use App\Models\CompanyPortfolioTransaction;
use App\Models\InvoiceReserveAllocation;
use App\Models\InvoiceBolloTransaction;
use App\Models\Serbatoio;
use App\Models\SerbatoioTransaction;
use App\Models\CrmProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    /**
     * GET /api/invoices
     * Lista fatture
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'project', 'paymentPlan', 'reserveAllocations.serbatoio']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('month')) {
            $query->whereMonth('issue_date', $request->month);
        }

        if ($request->has('year')) {
            $query->whereYear('issue_date', $request->year);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'LIKE', "%{$search}%")
                  ->orWhereHas('client', function($cq) use ($search) {
                      $cq->where('company_name', 'LIKE', "%{$search}%");
                  });
            });
        }

        $invoices = $query->orderBy('issue_date', 'desc')
                         ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    /**
     * GET /api/invoices/to-issue
     * Fatture da emettere (installments pending)
     */
    public function toIssue(Request $request)
    {
        $query = PaymentPlanInstallment::with([
            'paymentPlan.client',
            'paymentPlan.project',
            'paymentPlan.contract',
            'paymentPlan.quote'
        ])
        ->where('status', 'pending')
        ->whereHas('paymentPlan'); // Solo rate con piano di pagamento valido

        // Filtro per mese se specificato
        if ($request->has('month') && $request->has('year')) {
            $month = $request->input('month');
            $year = $request->input('year');
            $startDate = \Carbon\Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = \Carbon\Carbon::create($year, $month, 1)->endOfMonth();
            $query->whereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()]);
        } else {
            // Se non c'è filtro, mostra tutte le rate future o scadute (non solo quelle già scadute)
            // Mostra rate fino a 3 mesi nel futuro
            $endDate = now()->addMonths(3)->endOfMonth();
            $query->where('due_date', '<=', $endDate->toDateString());
        }

        $installments = $query->orderBy('due_date', 'asc')->get();

        $result = $installments->map(function($installment) {
            $plan = $installment->paymentPlan;
            
            // Salta rate senza piano di pagamento valido
            if (!$plan) {
                return null;
            }
            
            return [
                'installment_id' => $installment->id,
                'payment_plan_id' => $plan->id,
                'client' => $plan->client,
                'project' => $plan->project,
                'contract' => $plan->contract,
                'quote' => $plan->quote,
                'due_date' => $installment->due_date,
                'amount' => $installment->amount,
                'original_amount' => $installment->original_amount,
                'discount_amount' => $installment->discount_amount,
                'discount_reason' => $installment->discount_reason,
                'description' => $installment->description,
                'payment_type' => $installment->payment_type,
                'payment_schedule_type' => $installment->payment_schedule_type,
            ];
        })->filter(function($item) {
            return $item !== null;
        })->values();

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * GET /api/invoices/to-settle
     * Fatture da saldare (emesse ma non pagate)
     */
    public function toSettle(Request $request)
    {
        try {
            // Carica le relazioni in modo sicuro, gestendo eventuali errori
            $query = Invoice::with([
                'client:id,company_name,vat_number,email,phone',
                'project:id,name,status',
                'paymentPlan:id,client_id,project_id,status'
            ])
            ->where('type', 'invoice')
            ->where('status', 'sent')
            ->whereNull('paid_at')
            ->whereNotNull('due_date'); // Escludi fatture senza data di scadenza

            // Filtro per mese se specificato
            if ($request->has('month') && $request->has('year')) {
                $month = (int) $request->input('month');
                $year = (int) $request->input('year');
                
                // Validazione mese e anno
                if ($month < 1 || $month > 12) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mese non valido'
                    ], 400);
                }
                
                if ($year < 2000 || $year > 2100) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anno non valido'
                    ], 400);
                }
                
                try {
                    $startDate = \Carbon\Carbon::create($year, $month, 1)->startOfMonth();
                    $endDate = \Carbon\Carbon::create($year, $month, 1)->endOfMonth();
                    $query->whereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()]);
                } catch (\Exception $dateError) {
                    Log::error('Errore nella creazione delle date: ' . $dateError->getMessage());
                    return response()->json([
                        'success' => false,
                        'message' => 'Errore nella creazione delle date: ' . $dateError->getMessage()
                    ], 400);
                }
            }

            $invoices = $query->orderBy('due_date', 'asc')->get();

            return response()->json([
                'success' => true,
                'data' => $invoices
            ]);
        } catch (\Exception $e) {
            Log::error('Errore in toSettle: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Errore nel caricamento delle fatture da saldare: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/invoices/calendar
     * Rate per calendario
     */
    public function calendar(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $query = PaymentPlanInstallment::with([
            'paymentPlan.client',
            'paymentPlan.project',
            'paymentPlan.contract',
            'invoice'
        ])
        ->whereBetween('due_date', [$startDate, $endDate])
        ->where('status', '!=', 'cancelled') // Escludi rate cancellate
        ->whereHas('paymentPlan'); // Solo rate con piano di pagamento valido

        if ($request->has('client_id')) {
            $query->whereHas('paymentPlan', function($q) use ($request) {
                $q->where('client_id', $request->client_id);
            });
        }

        if ($request->has('payment_plan_id')) {
            $query->where('payment_plan_id', $request->payment_plan_id);
        }

        if ($request->has('payment_type') && $request->payment_type !== 'all') {
            $query->where('payment_type', $request->payment_type);
        }

        $installments = $query->orderBy('due_date', 'asc')->get();

        $result = $installments->map(function($installment) {
            $plan = $installment->paymentPlan;
            
            // Salta rate senza piano di pagamento valido
            if (!$plan) {
                return null;
            }
            
            // Corregge payment_type se la descrizione indica un rinnovo
            $paymentType = $installment->payment_type;
            $description = $installment->description ?? '';
            if ($paymentType !== 'renewal' && stripos($description, 'rinnovo') !== false) {
                $paymentType = 'renewal';
            }
            
            // Determina il colore se non è già impostato
            $colorCode = $installment->color_code;
            if (!$colorCode) {
                if ($installment->payment_type === 'reimbursement') {
                    $colorCode = '#FF453A'; // Rosso
                } elseif ($paymentType === 'renewal' || stripos($description, 'rinnovo') !== false) {
                    $colorCode = '#FF9500'; // Arancione
                } elseif ($installment->payment_schedule_type === '30_40_30') {
                    $colorCode = '#34C759'; // Verde
                } elseif ($installment->payment_schedule_type === '30_60_days') {
                    $colorCode = '#5856D6'; // Viola
                } else {
                    $colorCode = '#0A84FF'; // Blu default
                }
            }

            return [
                'id' => $installment->id,
                'date' => $installment->due_date->format('Y-m-d'), // Assicura formato stringa
                'amount' => $installment->amount,
                'original_amount' => $installment->original_amount,
                'discount_amount' => $installment->discount_amount,
                'discount_reason' => $installment->discount_reason,
                'description' => $description,
                'status' => $installment->status,
                'payment_type' => $paymentType, // Usa il tipo corretto
                'payment_schedule_type' => $installment->payment_schedule_type,
                'color_code' => $colorCode,
                'client' => $plan->client,
                'project' => $plan->project,
                'contract' => $plan->contract,
                'payment_plan_id' => $plan->id,
                'invoice_id' => $installment->invoice_id,
            ];
        })->filter(function($item) {
            return $item !== null;
        })->values();

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * POST /api/invoices/issue
     * Emetti fattura (con bollo automatico)
     */
    public function issue(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'installment_id' => 'required|exists:payment_plan_installments,id',
            'invoice_number' => 'required|string|unique:invoices,invoice_number',
            'issue_date' => 'required|date',
            'invoice_link' => 'nullable|string|max:500',
            'amount' => 'required|numeric|min:0',
            'reserve_allocations' => 'required|array',
            'reserve_allocations.*.serbatoio_id' => 'required|exists:serbatoi,id',
            'reserve_allocations.*.amount' => 'required|numeric|min:0',
            'reserve_allocations.*.percentage' => 'nullable|numeric|min:0',
        ], [
            'invoice_number.required' => 'Il numero fattura è obbligatorio.',
            'invoice_number.unique' => 'Questo numero fattura è già stato utilizzato. Scegline un altro.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dati non validi',
                'errors' => $validator->errors()
            ], 422);
        }

        $input = $validator->validated();
        if (!empty($input['reserve_allocations'])) {
            foreach ($input['reserve_allocations'] as $i => $allocation) {
                if (isset($allocation['percentage']) && $allocation['percentage'] !== null && $allocation['percentage'] !== '') {
                    $pct = (float) $allocation['percentage'];
                    $input['reserve_allocations'][$i]['percentage'] = min(100, max(0, round($pct, 2)));
                }
            }
        }

        DB::beginTransaction();
        try {
            $installment = PaymentPlanInstallment::with('paymentPlan')->findOrFail($request->installment_id);
            $plan = $installment->paymentPlan;

            // Calcola bollo (sempre 2.00€)
            $bolloAmount = 2.00;
            $amountBeforeBollo = $request->amount - $bolloAmount;

            // Crea fattura
            $invoice = Invoice::create([
                'invoice_number' => $request->invoice_number,
                'client_id' => $plan->client_id,
                'project_id' => $plan->project_id,
                'payment_plan_id' => $plan->id,
                'installment_number' => $installment->installment_number,
                'issue_date' => $request->issue_date,
                'due_date' => $installment->due_date,
                'amount_cocchi' => $amountBeforeBollo,
                'tax_cocchi' => 0,
                'total_cocchi' => $request->amount,
                'bollo_amount' => $bolloAmount,
                'amount_before_bollo' => $amountBeforeBollo,
                'invoice_link' => $request->invoice_link,
                'status' => 'sent',
                'type' => 'invoice',
                'created_by' => Auth::id(),
            ]);

            // Crea allocazioni riserve (usa input normalizzato)
            foreach ($input['reserve_allocations'] as $allocation) {
                InvoiceReserveAllocation::create([
                    'invoice_id' => $invoice->id,
                    'serbatoio_id' => $allocation['serbatoio_id'],
                    'amount' => $allocation['amount'],
                    'percentage' => $allocation['percentage'] ?? null,
                    'notes' => $allocation['notes'] ?? null,
                ]);
            }

            // Aggiorna installment
            $installment->invoice_id = $invoice->id;
            $installment->status = 'invoiced';
            $installment->save();

            // Crea commissione venditore se presente
            if ($plan->contract_id) {
                $contract = \App\Models\Contract::with('seller')->find($plan->contract_id);
                if ($contract && $contract->seller_id) {
                    $seller = $contract->seller;
                    if ($seller && $seller->commission_rate) {
                        // Calcola commissione sull'importo della rata (prima del bollo)
                        $commissionAmount = $installment->amount * ($seller->commission_rate / 100);
                        
                        \App\Models\SellerCommission::create([
                            'seller_id' => $seller->id,
                            'contract_id' => $contract->id,
                            'payment_plan_id' => $plan->id,
                            'invoice_id' => $invoice->id,
                            'installment_id' => $installment->id,
                            'amount' => $commissionAmount,
                            'commission_rate' => $seller->commission_rate,
                            'status' => 'pending',
                            'invoice_issued_at' => now(),
                        ]);
                    }
                }
            }

            DB::commit();

            $invoice->load(['client', 'project', 'reserveAllocations.serbatoio']);

            return response()->json([
                'success' => true,
                'data' => $invoice,
                'message' => 'Fattura emessa con successo'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'emissione della fattura: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/invoices/{id}/settle
     * Salda fattura (con distribuzione riserve e bollo)
     */
    public function settle(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'receipt_link' => 'required|string|max:500',
            'paid_at' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $invoice = Invoice::with(['reserveAllocations.serbatoio', 'paymentPlan'])->findOrFail($id);

            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Fattura già saldata'
                ], 400);
            }

            // Aggiorna fattura
            $invoice->status = 'paid';
            $invoice->paid_at = $request->paid_at;
            $invoice->receipt_link = $request->receipt_link;
            $invoice->save();

            // Aggiungi bollo al serbatoio Riserva Bollo (id 9)
            $bolloSerbatoio = Serbatoio::find(9);
            if ($bolloSerbatoio) {
                $bolloSerbatoio->addCocchi(
                    $invoice->bollo_amount,
                    'invoice_bollo',
                    "Bollo fattura {$invoice->invoice_number}",
                    null,
                    Auth::id()
                );

                // Crea record transazione bollo
                InvoiceBolloTransaction::create([
                    'invoice_id' => $invoice->id,
                    'serbatoio_id' => 9,
                    'amount' => $invoice->bollo_amount,
                    'transaction_date' => $request->paid_at,
                ]);
            }

            // Distribuisci alle riserve
            foreach ($invoice->reserveAllocations as $allocation) {
                $serbatoio = $allocation->serbatoio;
                if ($serbatoio) {
                    $serbatoio->addCocchi(
                        $allocation->amount,
                        'invoice_payment',
                        "Pagamento fattura {$invoice->invoice_number} - {$allocation->percentage}%",
                        null,
                        Auth::id()
                    );
                }
            }

            // Aggiorna installment se presente
            if ($invoice->payment_plan_id && $invoice->installment_number) {
                $installment = PaymentPlanInstallment::where('payment_plan_id', $invoice->payment_plan_id)
                    ->where('installment_number', $invoice->installment_number)
                    ->first();
                
                if ($installment) {
                    $installment->status = 'paid';
                    $installment->save();
                }
            }

            // Aggiorna budget progetto se presente
            if ($invoice->project_id) {
                $project = CrmProject::find($invoice->project_id);
                if ($project) {
                    // Trova allocazione per budget progetto (se presente)
                    $projectAllocation = $invoice->reserveAllocations()
                        ->whereHas('serbatoio', function($q) {
                            $q->where('name', 'LIKE', '%Budget%');
                        })
                        ->first();

                    if ($projectAllocation) {
                        // Aggiorna budget progetto
                        $project->budget_cocchi = ($project->budget_cocchi ?? 0) + $projectAllocation->amount;
                        $project->save();
                    }
                }
            }

            // Aggiorna commissioni venditore associate alla fattura
            $commissions = \App\Models\SellerCommission::where('invoice_id', $invoice->id)
                ->where('status', 'pending')
                ->get();
            
            foreach ($commissions as $commission) {
                $commission->status = 'pending_collection';
                $commission->invoice_paid_at = $request->paid_at;
                $commission->save();
            }

            // Portfolio azienda: aumenta il conto quando la fattura viene saldata
            CompanyPortfolioTransaction::create([
                'type' => 'invoice_settled',
                'amount' => (float) $invoice->total_cocchi,
                'description' => "Fattura {$invoice->invoice_number} saldata",
                'reference_type' => 'invoice',
                'reference_id' => $invoice->id,
                'transaction_date' => $request->paid_at,
            ]);

            DB::commit();

            $invoice->load(['client', 'project', 'reserveAllocations.serbatoio', 'bolloTransaction']);

            return response()->json([
                'success' => true,
                'data' => $invoice,
                'message' => 'Fattura saldata con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella saldatura della fattura: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/invoices/{id}/credit-note
     * Emetti nota di credito
     */
    public function creditNote(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'invoice_link' => 'required|string|max:500',
            'issue_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $originalInvoice = Invoice::findOrFail($id);

            // Genera numero nota di credito
            $year = date('Y', strtotime($request->issue_date));
            $lastNC = Invoice::where('type', 'credit_note')
                ->whereYear('issue_date', $year)
                ->orderBy('id', 'desc')
                ->first();
            
            $ncNumber = $lastNC 
                ? 'NC-' . $year . '-' . str_pad(intval(substr($lastNC->invoice_number, -4)) + 1, 4, '0', STR_PAD_LEFT)
                : 'NC-' . $year . '-0001';

            // Crea nota di credito
            $creditNote = Invoice::create([
                'invoice_number' => $ncNumber,
                'client_id' => $originalInvoice->client_id,
                'project_id' => $originalInvoice->project_id,
                'payment_plan_id' => $originalInvoice->payment_plan_id,
                'issue_date' => $request->issue_date,
                'due_date' => $request->issue_date,
                'amount_cocchi' => $request->amount,
                'tax_cocchi' => 0,
                'total_cocchi' => $request->amount,
                'bollo_amount' => 0,
                'amount_before_bollo' => $request->amount,
                'invoice_link' => $request->invoice_link,
                'status' => 'sent',
                'type' => 'credit_note',
                'credit_note_for_invoice_id' => $originalInvoice->id,
                'notes' => $request->reason,
                'created_by' => Auth::id(),
            ]);

            DB::commit();

            $creditNote->load(['client', 'creditNoteFor']);

            return response()->json([
                'success' => true,
                'data' => $creditNote,
                'message' => 'Nota di credito emessa con successo'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'emissione della nota di credito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/invoices/last-number
     * Ultimo numero fattura emessa
     */
    public function lastNumber(Request $request)
    {
        $year = $request->input('year', date('Y'));
        
        $lastInvoice = Invoice::where('type', 'invoice')
            ->whereYear('issue_date', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice) {
            // Estrai numero progressivo
            $parts = explode('-', $lastInvoice->invoice_number);
            $lastNumber = end($parts);
            $nextNumber = intval($lastNumber) + 1;
        } else {
            $nextNumber = 1;
        }

        $nextInvoiceNumber = 'FATT-' . $year . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data' => [
                'last_number' => $lastInvoice ? $lastInvoice->invoice_number : null,
                'next_number' => $nextInvoiceNumber,
            ]
        ]);
    }

    /**
     * GET /api/invoices/stats
     * KPI: fatture da incassare, incassate, da emettere
     */
    public function stats()
    {
        $toSettle = Invoice::where('type', 'invoice')
            ->where('status', 'sent')
            ->whereNull('paid_at')
            ->whereNotNull('due_date');

        $toSettleCount = (clone $toSettle)->count();
        $toSettleTotal = (clone $toSettle)->sum('total_cocchi');

        $paid = Invoice::where('type', 'invoice')->where('status', 'paid');
        $paidCount = (clone $paid)->count();
        $paidTotal = (clone $paid)->sum('total_cocchi');

        $paidThisMonth = Invoice::where('type', 'invoice')
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereMonth('paid_at', now()->month)
            ->whereYear('paid_at', now()->year);
        $paidThisMonthCount = (clone $paidThisMonth)->count();
        $paidThisMonthTotal = (clone $paidThisMonth)->sum('total_cocchi');

        $toIssueCount = PaymentPlanInstallment::where('status', 'pending')
            ->whereHas('paymentPlan')
            ->where('due_date', '<=', now()->addMonths(3)->endOfMonth()->toDateString())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'to_settle_count' => $toSettleCount,
                'to_settle_total' => (float) $toSettleTotal,
                'paid_count' => $paidCount,
                'paid_total' => (float) $paidTotal,
                'paid_this_month_count' => $paidThisMonthCount,
                'paid_this_month_total' => (float) $paidThisMonthTotal,
                'to_issue_count' => $toIssueCount,
            ]
        ]);
    }

    /**
     * GET /api/invoices/{id}
     * Dettaglio fattura
     */
    public function show($id)
    {
        $invoice = Invoice::with([
            'client',
            'project',
            'paymentPlan.installments',
            'reserveAllocations.serbatoio',
            'bolloTransaction',
            'creditNotes',
            'creditNoteFor',
            'items',
            'creator'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }

    /**
     * POST /api/invoices
     * Crea fattura al volo (associata a cliente e/o progetto, senza rata piano)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'project_id' => 'nullable|exists:crm_projects,id',
            'invoice_number' => 'required|string|unique:invoices,invoice_number',
            'issue_date' => 'required|date',
            'due_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'invoice_link' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:2000',
            'reserve_allocations' => 'nullable|array',
            'reserve_allocations.*.serbatoio_id' => 'required_with:reserve_allocations|exists:serbatoi,id',
            'reserve_allocations.*.amount' => 'required_with:reserve_allocations|numeric|min:0',
            'reserve_allocations.*.percentage' => 'nullable|numeric|min:0',
        ], [
            'invoice_number.required' => 'Il numero fattura è obbligatorio.',
            'invoice_number.unique' => 'Questo numero fattura è già stato utilizzato. Scegline un altro.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dati non validi',
                'errors' => $validator->errors()
            ], 422);
        }

        $input = $validator->validated();
        if (!empty($input['reserve_allocations'])) {
            foreach ($input['reserve_allocations'] as $i => $allocation) {
                if (isset($allocation['percentage']) && $allocation['percentage'] !== null && $allocation['percentage'] !== '') {
                    $pct = (float) $allocation['percentage'];
                    $input['reserve_allocations'][$i]['percentage'] = min(100, max(0, round($pct, 2)));
                }
            }
        }

        $bolloAmount = 2.00;
        $amount = (float) $request->amount;
        $amountBeforeBollo = $amount - $bolloAmount;
        if ($amountBeforeBollo < 0) {
            return response()->json([
                'success' => false,
                'message' => 'L\'importo deve essere almeno 2,00€ (bollo)'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $invoice = Invoice::create([
                'invoice_number' => $request->invoice_number,
                'client_id' => $request->client_id,
                'project_id' => $request->project_id,
                'payment_plan_id' => null,
                'installment_number' => null,
                'issue_date' => $request->issue_date,
                'due_date' => $request->due_date,
                'amount_cocchi' => $amountBeforeBollo,
                'tax_cocchi' => 0,
                'total_cocchi' => $amount,
                'bollo_amount' => $bolloAmount,
                'amount_before_bollo' => $amountBeforeBollo,
                'invoice_link' => $request->invoice_link,
                'notes' => $request->notes,
                'status' => 'sent',
                'type' => 'invoice',
                'created_by' => Auth::id(),
            ]);

            if (!empty($input['reserve_allocations'])) {
                foreach ($input['reserve_allocations'] as $allocation) {
                    InvoiceReserveAllocation::create([
                        'invoice_id' => $invoice->id,
                        'serbatoio_id' => $allocation['serbatoio_id'],
                        'amount' => $allocation['amount'],
                        'percentage' => $allocation['percentage'] ?? null,
                        'notes' => $allocation['notes'] ?? null,
                    ]);
                }
            }

            DB::commit();

            $invoice->load(['client', 'project', 'reserveAllocations.serbatoio']);

            return response()->json([
                'success' => true,
                'data' => $invoice,
                'message' => 'Fattura creata con successo'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione della fattura: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/invoices/{id}
     * Aggiorna fattura (solo campi modificabili)
     */
    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Non è possibile modificare una fattura già saldata'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'invoice_number' => 'sometimes|string|unique:invoices,invoice_number,' . $id,
            'issue_date' => 'sometimes|date',
            'due_date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0',
            'invoice_link' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:2000',
        ], [
            'invoice_number.unique' => 'Questo numero fattura è già stato utilizzato. Scegline un altro.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dati non validi',
                'errors' => $validator->errors()
            ], 422);
        }

        $bolloAmount = 2.00;
        $data = $request->only(['invoice_number', 'issue_date', 'due_date', 'invoice_link', 'notes']);
        if ($request->has('amount')) {
            $amount = (float) $request->amount;
            $amountBeforeBollo = $amount - $bolloAmount;
            if ($amountBeforeBollo < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'importo deve essere almeno 2,00€ (bollo)'
                ], 422);
            }
            $data['amount_cocchi'] = $amountBeforeBollo;
            $data['total_cocchi'] = $amount;
            $data['amount_before_bollo'] = $amountBeforeBollo;
            $data['bollo_amount'] = $bolloAmount;
        }

        $invoice->update($data);

        $invoice->load(['client', 'project', 'reserveAllocations.serbatoio']);

        return response()->json([
            'success' => true,
            'data' => $invoice,
            'message' => 'Fattura aggiornata con successo'
        ]);
    }

    /**
     * DELETE /api/invoices/{id}
     * Elimina (annulla) fattura. Se collegata a una rata, la rata torna pending.
     */
    public function destroy($id)
    {
        $invoice = Invoice::with('reserveAllocations')->findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Non è possibile eliminare una fattura già saldata'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Se la fattura è collegata a una rata del piano, riporta la rata a pending e scollega
            if ($invoice->payment_plan_id && $invoice->installment_number) {
                $installment = PaymentPlanInstallment::where('payment_plan_id', $invoice->payment_plan_id)
                    ->where('installment_number', $invoice->installment_number)
                    ->first();
                if ($installment) {
                    $installment->invoice_id = null;
                    $installment->status = 'pending';
                    $installment->save();
                }
            }

            // Elimina allocazioni riserve
            $invoice->reserveAllocations()->delete();

            // Elimina eventuali transazioni bollo non ancora applicate (per fatture non saldate non ci sono)
            InvoiceBolloTransaction::where('invoice_id', $invoice->id)->delete();

            // Annulla commissioni venditore collegate (pending) a questa fattura
            \App\Models\SellerCommission::where('invoice_id', $invoice->id)
                ->where('status', 'pending')
                ->delete();

            $invoice->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Fattura eliminata con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'eliminazione della fattura: ' . $e->getMessage()
            ], 500);
        }
    }
}
