<?php

namespace App\Http\Controllers;

use App\Models\PaymentPlan;
use App\Models\PaymentPlanInstallment;
use App\Models\PaymentPlanRenewal;
use App\Models\Contract;
use App\Models\Quote;
use App\Models\CrmProject;
use App\Models\ProjectCalendarEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class PaymentPlanController extends Controller
{
    /**
     * GET /api/payment-plans
     * Lista piani di pagamento
     */
    public function index(Request $request)
    {
        $query = PaymentPlan::with([
            'contract',
            'quote',
            'project',
            'client',
            'installments',
            'renewals'
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->has('contract_id')) {
            $query->where('contract_id', $request->contract_id);
        }

        $plans = $query->orderBy('created_at', 'desc')
                      ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $plans
        ]);
    }

    /**
     * GET /api/payment-plans/pending
     * Piani in attesa (contratti avviati con progetto senza piano confermato)
     */
    public function pending(Request $request)
    {
        $result = [];

        // 1. Trova payment plans con status 'pending' (già creati ma in attesa)
        $pendingPlans = PaymentPlan::with([
            'contract',
            'contract.client',
            'contract.quote.items',
            'contract.project',
            'quote.items',
            'project',
            'client'
        ])
        ->where('status', 'pending')
        ->get();

        foreach ($pendingPlans as $plan) {
            $contract = $plan->contract;
            if ($contract) {
                $result[] = [
                    'contract_id' => $contract->id,
                    'contract_number' => $contract->contract_number,
                    'client' => $contract->client ?? $plan->client,
                    'quote' => $contract->quote ?? $plan->quote,
                    'project' => $contract->project ?? $plan->project,
                    'total_value' => $contract->total_value ?? $plan->total_amount,
                    'payment_terms' => $contract->payment_terms ?? null,
                    'has_pending_plan' => true,
                    'payment_plan_id' => $plan->id,
                    'payment_plan' => $plan,
                ];
            }
        }

        // 2. Trova contratti avviati (con progetto) senza piano di pagamento
        $contractsWithoutPlan = Contract::with([
            'client',
            'quote.items',
            'project'
        ])
        ->whereNotNull('signed_at')
        ->whereNotNull('signed_file')
        ->whereNotNull('crm_project_id') // Solo contratti con progetto avviato
        ->where('status', 'active')
        ->whereDoesntHave('paymentPlans', function($q) {
            $q->whereIn('status', ['active', 'pending']);
        })
        ->get();

        foreach ($contractsWithoutPlan as $contract) {
            // Evita duplicati se già presente un payment plan pending per questo contratto
            $exists = collect($result)->contains(function($item) use ($contract) {
                return isset($item['contract_id']) && $item['contract_id'] == $contract->id;
            });

            if (!$exists) {
                $result[] = [
                'contract_id' => $contract->id,
                'contract_number' => $contract->contract_number,
                'client' => $contract->client,
                'quote' => $contract->quote,
                'project' => $contract->project,
                'total_value' => $contract->total_value,
                'payment_terms' => $contract->payment_terms,
                    'has_pending_plan' => false,
                    'payment_plan_id' => null,
                    'payment_plan' => null,
            ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * GET /api/payment-plans/{id}
     * Dettaglio piano
     */
    public function show($id)
    {
        $plan = PaymentPlan::with([
            'contract',
            'quote.items',
            'project',
            'client',
            'installments.invoice',
            'renewals',
            'creator'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $plan
        ]);
    }

    /**
     * POST /api/payment-plans
     * Crea piano (da contratto firmato)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'contract_id' => 'required_without:quote_id|exists:contracts,id',
            'quote_id' => 'required_without:contract_id|exists:quotes,id',
            'client_id' => 'required|exists:clients,id',
            'project_id' => 'nullable|exists:crm_projects,id',
            'total_amount' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'installments' => 'required|array|min:1',
            'installments.*.due_date' => 'required|date',
            'installments.*.amount' => 'required|numeric|min:0',
            'installments.*.description' => 'nullable|string',
            'installments.*.payment_type' => 'nullable|in:installment,renewal,reimbursement,one_time',
            'installments.*.payment_schedule_type' => 'nullable|in:30_40_30,30_60_days,installments,tantum,custom',
            'renewals' => 'nullable|array',
            'renewals.*.renewal_type' => 'required|in:fixed,variable',
            'renewals.*.frequency' => 'required|in:monthly,bimonthly,quarterly,semiannual,yearly,one_time',
            'renewals.*.start_date' => 'required|date',
            'renewals.*.months_count' => 'required|integer|min:1',
            'renewals.*.fixed_amount' => 'required_if:renewals.*.renewal_type,fixed|numeric|min:0',
            'renewals.*.variable_amounts' => 'required_if:renewals.*.renewal_type,variable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $plan = PaymentPlan::create([
                'contract_id' => $request->contract_id,
                'quote_id' => $request->quote_id,
                'project_id' => $request->project_id,
                'client_id' => $request->client_id,
                'status' => 'pending',
                'total_amount' => $request->total_amount,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
            ]);

            // Crea installments
            foreach ($request->installments as $index => $installment) {
                $colorCode = $this->getColorForPaymentType(
                    $installment['payment_type'] ?? 'installment',
                    $installment['payment_schedule_type'] ?? null
                );

                $originalAmount = $installment['amount'];

                PaymentPlanInstallment::create([
                    'payment_plan_id' => $plan->id,
                    'installment_number' => $index + 1,
                    'due_date' => $installment['due_date'],
                    'amount' => $installment['amount'],
                    'original_amount' => $originalAmount,
                    'discount_amount' => 0,
                    'description' => $installment['description'] ?? null,
                    'payment_type' => $installment['payment_type'] ?? 'installment',
                    'payment_schedule_type' => $installment['payment_schedule_type'] ?? null,
                    'color_code' => $colorCode,
                    'status' => 'pending',
                ]);
            }

            // Crea renewals se presenti
            if ($request->has('renewals')) {
                foreach ($request->renewals as $renewal) {
                    PaymentPlanRenewal::create([
                        'payment_plan_id' => $plan->id,
                        'renewal_type' => $renewal['renewal_type'],
                        'frequency' => $renewal['frequency'],
                        'start_date' => $renewal['start_date'],
                        'end_date' => $renewal['end_date'] ?? null,
                        'months_count' => $renewal['months_count'],
                        'fixed_amount' => $renewal['fixed_amount'] ?? null,
                        'variable_amounts' => $renewal['variable_amounts'] ?? null,
                        'is_active' => true,
                    ]);
                }
            }

            // Attiva automaticamente il piano e inserisci le rate nel calendario
            $plan->status = 'active';
            $plan->save();

            // Inserisci le rate nel calendario
            $this->createCalendarEventsForPlan($plan);

            DB::commit();

            $plan->load(['installments', 'renewals', 'contract', 'quote', 'client']);

            return response()->json([
                'success' => true,
                'data' => $plan,
                'message' => 'Piano di pagamento creato e attivato con successo'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione del piano: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/payment-plans/{id}
     * Modifica piano
     */
    public function update(Request $request, $id)
    {
        $plan = PaymentPlan::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'total_amount' => 'sometimes|numeric|min:0',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after:start_date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $plan->update($request->only([
            'total_amount',
            'start_date',
            'end_date',
            'notes'
        ]));

        $plan->load(['installments', 'renewals']);

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Piano aggiornato con successo'
        ]);
    }

    /**
     * POST /api/payment-plans/{id}/confirm
     * Conferma piano (passa da pending a active)
     */
    public function confirm($id)
    {
        $plan = PaymentPlan::with(['installments', 'project'])->findOrFail($id);

        if ($plan->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Solo piani in attesa possono essere confermati'
            ], 400);
        }

        DB::beginTransaction();
        try {
        $plan->status = 'active';
        $plan->save();

            // Inserisci le rate nel calendario
            $this->createCalendarEventsForPlan($plan);

            DB::commit();

            $plan->load(['installments', 'renewals', 'contract', 'quote', 'client']);

        return response()->json([
            'success' => true,
            'data' => $plan,
                'message' => 'Piano confermato con successo e rate inserite nel calendario'
        ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella conferma del piano: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crea eventi nel calendario per tutte le rate del piano di pagamento
     */
    private function createCalendarEventsForPlan(PaymentPlan $plan)
    {
        if (!$plan->installments || $plan->installments->isEmpty()) {
            return;
        }

        // Se non c'è un progetto associato, non possiamo creare eventi nel calendario
        if (!$plan->project_id) {
            \Log::warning("Piano di pagamento #{$plan->id} non ha un progetto associato, impossibile creare eventi nel calendario");
            return;
        }

        foreach ($plan->installments as $installment) {
            // Crea evento nel calendario solo se non esiste già
            // Usa DB::table per accedere direttamente alle colonne del database (start_time invece di start_datetime)
            $existingEvent = DB::table('project_calendar_events')
                ->where('project_id', $plan->project_id)
                ->where('start_time', $installment->due_date . ' 00:00:00')
                ->where('title', 'LIKE', '%' . $installment->description . '%')
                ->first();

            if (!$existingEvent) {
                $title = 'Rata: ' . ($installment->description ?? 'Pagamento');
                $description = sprintf(
                    "Piano di Pagamento #%d\nContratto: %s\nCliente: %s\nImporto: € %s",
                    $plan->id,
                    $plan->contract->contract_number ?? 'N/A',
                    $plan->client->company_name ?? 'N/A',
                    number_format($installment->amount, 2, ',', '.')
                );

                if ($installment->discount_amount > 0) {
                    $description .= sprintf(
                        "\nSconto: € %s\nMotivazione: %s",
                        number_format($installment->discount_amount, 2, ',', '.'),
                        $installment->discount_reason ?? 'N/A'
                    );
                }

                try {
                    // Usa DB::table per inserire direttamente con i nomi delle colonne del database
                    $userId = Auth::id();
                    DB::table('project_calendar_events')->insert([
                        'project_id' => $plan->project_id,
                        'type' => 'event',
                        'title' => $title,
                        'description' => $description,
                        'start_time' => $installment->due_date . ' 09:00:00',
                        'end_time' => $installment->due_date . ' 10:00:00',
                        'created_by' => $userId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } catch (\Exception $e) {
                    \Log::error("Errore nella creazione evento calendario per rata #{$installment->id}: " . $e->getMessage());
                }
            }
        }
    }

    /**
     * POST /api/payment-plans/{id}/suspend
     * Sospendi piano
     */
    public function suspend($id)
    {
        $plan = PaymentPlan::findOrFail($id);
        $plan->status = 'suspended';
        $plan->save();

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Piano sospeso con successo'
        ]);
    }

    /**
     * POST /api/payment-plans/{id}/cancel
     * Annulla piano
     */
    public function cancel($id)
    {
        $plan = PaymentPlan::findOrFail($id);
        $plan->status = 'cancelled';
        $plan->save();

        return response()->json([
            'success' => true,
            'data' => $plan,
            'message' => 'Piano annullato con successo'
        ]);
    }

    /**
     * POST /api/payment-plans/{id}/installments
     * Aggiungi/modifica rate
     */
    public function updateInstallments(Request $request, $id)
    {
        $plan = PaymentPlan::findOrFail($id);

        // Se l'array installments è vuoto, elimina tutte le rate esistenti e termina
        if (empty($request->installments) || !is_array($request->installments) || count($request->installments) === 0) {
            DB::beginTransaction();
            try {
                $existingInstallmentIds = $plan->installments()->pluck('id')->toArray();
                
                if (!empty($existingInstallmentIds)) {
                    PaymentPlanInstallment::where('payment_plan_id', $plan->id)
                        ->whereIn('id', $existingInstallmentIds)
                        ->delete();
                }
                
                DB::commit();
                $plan->load('installments');
                
                return response()->json([
                    'success' => true,
                    'data' => $plan,
                    'message' => 'Rate aggiornate con successo (tutte le rate sono state rimosse)'
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Errore nell\'aggiornamento delle rate: ' . $e->getMessage()
                ], 500);
            }
        }

        $validator = Validator::make($request->all(), [
            'installments' => 'required|array|min:0',
            'installments.*.id' => 'nullable|exists:payment_plan_installments,id',
            'installments.*.due_date' => 'required|date',
            'installments.*.amount' => 'required|numeric|min:0',
            'installments.*.original_amount' => 'nullable|numeric|min:0',
            'installments.*.discount_amount' => 'nullable|numeric|min:0',
            'installments.*.discount_reason' => 'nullable|string|max:1000',
            'installments.*.description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Ottieni gli ID delle rate esistenti
            $existingInstallmentIds = $plan->installments()->pluck('id')->toArray();
            
            // Raccogli gli ID delle rate inviate (quelle che devono rimanere)
            $sentInstallmentIds = [];
            
            foreach ($request->installments as $index => $installmentData) {
                if (isset($installmentData['id']) && $installmentData['id']) {
                    // Modifica esistente
                    $installment = PaymentPlanInstallment::where('payment_plan_id', $plan->id)
                        ->findOrFail($installmentData['id']);
                    
                    $sentInstallmentIds[] = $installment->id;
                    
                    // Se l'importo cambia e non c'è original_amount, salva quello originale
                    $originalAmount = $installmentData['original_amount'] ?? $installment->original_amount;
                    if (!$originalAmount && $installment->amount != $installmentData['amount']) {
                        $originalAmount = $installment->amount;
                    }
                    
                    // Se c'è uno sconto, calcola l'importo finale
                    $finalAmount = $installmentData['amount'];
                    $discountAmount = $installmentData['discount_amount'] ?? 0;
                    if ($discountAmount > 0 && $originalAmount) {
                        $finalAmount = $originalAmount - $discountAmount;
                    }
                    
                    // Tronca la descrizione a 2000 caratteri per evitare descrizioni eccessivamente lunghe
                    $description = $installmentData['description'] ?? $installment->description;
                    if ($description && mb_strlen($description) > 2000) {
                        $description = mb_substr($description, 0, 1997) . '...';
                    }
                    
                    $installment->update([
                        'installment_number' => $index + 1, // Rinumera
                        'due_date' => $installmentData['due_date'],
                        'amount' => $finalAmount,
                        'original_amount' => $originalAmount ?: $finalAmount,
                        'discount_amount' => $discountAmount,
                        'discount_reason' => $installmentData['discount_reason'] ?? null,
                        'description' => $description,
                    ]);
                } else {
                    // Nuova rata
                    $originalAmount = $installmentData['original_amount'] ?? $installmentData['amount'];
                    $discountAmount = $installmentData['discount_amount'] ?? 0;
                    $finalAmount = $originalAmount - $discountAmount;
                    
                    // Tronca la descrizione a 2000 caratteri per evitare descrizioni eccessivamente lunghe
                    $description = $installmentData['description'] ?? null;
                    if ($description && mb_strlen($description) > 2000) {
                        $description = mb_substr($description, 0, 1997) . '...';
                    }
                    
                    PaymentPlanInstallment::create([
                        'payment_plan_id' => $plan->id,
                        'installment_number' => $index + 1,
                        'due_date' => $installmentData['due_date'],
                        'amount' => $finalAmount,
                        'original_amount' => $originalAmount,
                        'discount_amount' => $discountAmount,
                        'discount_reason' => $installmentData['discount_reason'] ?? null,
                        'description' => $description,
                        'status' => 'pending',
                    ]);
                }
            }

            // Elimina le rate che non sono più presenti nell'array inviato
            $installmentsToDelete = array_diff($existingInstallmentIds, $sentInstallmentIds);
            if (!empty($installmentsToDelete)) {
                PaymentPlanInstallment::where('payment_plan_id', $plan->id)
                    ->whereIn('id', $installmentsToDelete)
                    ->delete();
            }

            DB::commit();

            $plan->load('installments');

            return response()->json([
                'success' => true,
                'data' => $plan,
                'message' => 'Rate aggiornate con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiornamento delle rate: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/payment-plans/{id}/renewals
     * Aggiungi rinnovo
     */
    public function addRenewal(Request $request, $id)
    {
        $plan = PaymentPlan::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'renewal_type' => 'required|in:fixed,variable',
            'frequency' => 'required|in:monthly,bimonthly,quarterly,semiannual,yearly,one_time',
            'start_date' => 'required|date',
            'months_count' => 'required|integer|min:1',
            'fixed_amount' => 'required_if:renewal_type,fixed|numeric|min:0',
            'variable_amounts' => 'required_if:renewal_type,variable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $renewal = PaymentPlanRenewal::create([
            'payment_plan_id' => $plan->id,
            'renewal_type' => $request->renewal_type,
            'frequency' => $request->frequency,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date ?? null,
            'months_count' => $request->months_count,
            'fixed_amount' => $request->fixed_amount ?? null,
            'variable_amounts' => $request->variable_amounts ?? null,
            'is_active' => $request->has('is_active') ? $request->is_active : true,
        ]);

        return response()->json([
            'success' => true,
            'data' => $renewal,
            'message' => 'Rinnovo aggiunto con successo'
        ], 201);
    }

    /**
     * PUT /api/payment-plans/{id}/renewals/{renewalId}
     * Modifica rinnovo
     */
    public function updateRenewal(Request $request, $id, $renewalId)
    {
        $renewal = PaymentPlanRenewal::where('payment_plan_id', $id)
            ->findOrFail($renewalId);

        $validator = Validator::make($request->all(), [
            'renewal_type' => 'sometimes|in:fixed,variable',
            'frequency' => 'sometimes|in:monthly,bimonthly,quarterly,semiannual,yearly,one_time',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date',
            'months_count' => 'sometimes|integer|min:1',
            'fixed_amount' => 'nullable|numeric|min:0',
            'variable_amounts' => 'nullable|array',
            'current_month_formula' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $renewal->update($request->only([
            'renewal_type',
            'frequency',
            'start_date',
            'end_date',
            'months_count',
            'fixed_amount',
            'variable_amounts',
            'current_month_formula',
            'is_active',
        ]));

        return response()->json([
            'success' => true,
            'data' => $renewal,
            'message' => 'Rinnovo aggiornato con successo'
        ]);
    }

    /**
     * DELETE /api/payment-plans/{id}/renewals/{renewalId}
     * Rimuovi rinnovo
     */
    public function deleteRenewal($id, $renewalId)
    {
        $renewal = PaymentPlanRenewal::where('payment_plan_id', $id)
            ->findOrFail($renewalId);

        $renewal->is_active = false;
        $renewal->save();

        return response()->json([
            'success' => true,
            'message' => 'Rinnovo rimosso con successo'
        ]);
    }

    /**
     * POST /api/payment-plans/generate-from-contract/{contractId}
     * Genera automaticamente piano di pagamento da contratto
     */
    public function generateFromContract($contractId)
    {
        $contract = Contract::with([
            'quote.items',
            'quote.items.priceListItem',
            'client',
            'project'
        ])->findOrFail($contractId);

        // Verifica che il contratto sia avviato (abbia un progetto)
        if (!$contract->crm_project_id) {
            return response()->json([
                'success' => false,
                'message' => 'Il contratto deve essere avviato (con progetto) per creare un piano di pagamento'
            ], 400);
        }

        // Verifica che non esista già un piano attivo
        $existingPlan = PaymentPlan::where('contract_id', $contractId)
            ->whereIn('status', ['active', 'pending'])
            ->first();

        if ($existingPlan) {
            return response()->json([
                'success' => false,
                'message' => 'Esiste già un piano di pagamento per questo contratto',
                'plan_id' => $existingPlan->id
            ], 400);
        }

        if (!$contract->quote || !$contract->quote->items || $contract->quote->items->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Il contratto deve avere un preventivo con items per generare il piano di pagamento'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $installments = [];
            $renewals = [];
            $startDate = $contract->start_date ? new \DateTime($contract->start_date) : new \DateTime();
            $totalAmount = 0;

            // Processa ogni item del preventivo
            foreach ($contract->quote->items as $item) {
                $itemTotal = $item->total;
                $totalAmount += $itemTotal;

                // Leggi payment_option
                $paymentOption = $item->payment_option;
                if (is_string($paymentOption)) {
                    $paymentOption = json_decode($paymentOption, true);
                }

                if (!$paymentOption || !isset($paymentOption['type'])) {
                    // Se non ha payment_option, usa pagamento unico
                    $installments[] = [
                        'due_date' => $startDate->format('Y-m-d'),
                        'amount' => $itemTotal,
                        'description' => $item->description . ' - Pagamento Unico',
                        'payment_type' => 'one_time',
                        'payment_schedule_type' => 'tantum',
                    ];
                    continue;
                }

                $paymentType = $paymentOption['type'];
                $baseDate = clone $startDate;

                // Genera rate in base al tipo di pagamento
                switch ($paymentType) {
                    case 'tantum':
                        $installments[] = [
                            'due_date' => $baseDate->format('Y-m-d'),
                            'amount' => $itemTotal,
                            'description' => $item->description . ' - Pagamento Unico',
                            'payment_type' => 'one_time',
                            'payment_schedule_type' => 'tantum',
                        ];
                        break;

                    case 'installments':
                    case 'rate':
                        $numInstallments = $paymentOption['installments'] ?? 2;
                        $installmentAmount = $itemTotal / $numInstallments;
                        for ($i = 0; $i < $numInstallments; $i++) {
                            $dueDate = clone $baseDate;
                            $dueDate->modify("+{$i} months");
                            $installments[] = [
                                'due_date' => $dueDate->format('Y-m-d'),
                                'amount' => $installmentAmount,
                                'description' => $item->description . " - Rata " . ($i + 1) . "/{$numInstallments}",
                                'payment_type' => 'installment',
                                'payment_schedule_type' => 'installments',
                            ];
                        }
                        break;

                    case 'split_30_40_30':
                    case '30_40_30':
                        // 30% subito
                        $installments[] = [
                            'due_date' => $baseDate->format('Y-m-d'),
                            'amount' => $itemTotal * 0.30,
                            'description' => $item->description . ' - Acconto 30%',
                            'payment_type' => 'installment',
                            'payment_schedule_type' => '30_40_30',
                        ];
                        // 40% dopo 1 mese
                        $midDate = clone $baseDate;
                        $midDate->modify('+1 month');
                        $installments[] = [
                            'due_date' => $midDate->format('Y-m-d'),
                            'amount' => $itemTotal * 0.40,
                            'description' => $item->description . ' - Pagamento 40%',
                            'payment_type' => 'installment',
                            'payment_schedule_type' => '30_40_30',
                        ];
                        // 30% dopo 2 mesi
                        $endDate = clone $baseDate;
                        $endDate->modify('+2 months');
                        $installments[] = [
                            'due_date' => $endDate->format('Y-m-d'),
                            'amount' => $itemTotal * 0.30,
                            'description' => $item->description . ' - Saldo 30%',
                            'payment_type' => 'installment',
                            'payment_schedule_type' => '30_40_30',
                        ];
                        break;

                    case '30_60_days':
                    case '30gg':
                        // Pagamento dopo 30 giorni
                        $dueDate = clone $baseDate;
                        $dueDate->modify('+30 days');
                        $installments[] = [
                            'due_date' => $dueDate->format('Y-m-d'),
                            'amount' => $itemTotal,
                            'description' => $item->description . ' - Pagamento 30 giorni',
                            'payment_type' => 'installment',
                            'payment_schedule_type' => '30_60_days',
                        ];
                        break;

                    case '60gg':
                        // Pagamento dopo 60 giorni
                        $dueDate = clone $baseDate;
                        $dueDate->modify('+60 days');
                        $installments[] = [
                            'due_date' => $dueDate->format('Y-m-d'),
                            'amount' => $itemTotal,
                            'description' => $item->description . ' - Pagamento 60 giorni',
                            'payment_type' => 'installment',
                            'payment_schedule_type' => '30_60_days',
                        ];
                        break;
                }

                // Gestisci rinnovi se presenti
                $renewalOption = $item->renewal_option;
                if (is_string($renewalOption)) {
                    $renewalOption = json_decode($renewalOption, true);
                }

                if ($renewalOption && isset($renewalOption['type'])) {
                    $renewalType = $renewalOption['type']; // 'fixed' o 'variable'
                    $frequency = $renewalOption['frequency'] ?? 'monthly';
                    $monthsCount = 12; // Default 12 mesi

                    if ($renewalType === 'fixed') {
                        // Piano fisso: crea 12 rate mensili
                        $fixedAmount = $renewalOption['amount'] ?? ($itemTotal / 12);
                        $renewalStartDate = clone $baseDate;
                        // Inizia dopo la fine del servizio principale (es. dopo 3 mesi se 30/40/30)
                        if ($paymentType === 'split_30_40_30' || $paymentType === '30_40_30') {
                            $renewalStartDate->modify('+3 months');
                        } else {
                            $renewalStartDate->modify('+1 month');
                        }

                        for ($i = 0; $i < $monthsCount; $i++) {
                            $dueDate = clone $renewalStartDate;
                            $dueDate->modify("+{$i} months");
                            $installments[] = [
                                'due_date' => $dueDate->format('Y-m-d'),
                                'amount' => $fixedAmount,
                                'description' => $item->description . " - Rinnovo Fisso " . ($i + 1) . "/{$monthsCount}",
                                'payment_type' => 'renewal',
                                'payment_schedule_type' => null,
                            ];
                        }

                        // Crea anche record renewal per tracciamento
                        $renewals[] = [
                            'renewal_type' => 'fixed',
                            'frequency' => 'monthly',
                            'start_date' => $renewalStartDate->format('Y-m-d'),
                            'end_date' => (clone $renewalStartDate)->modify("+{$monthsCount} months")->format('Y-m-d'),
                            'months_count' => $monthsCount,
                            'fixed_amount' => $fixedAmount,
                        ];
                    } else {
                        // Piano variabile: crea renewal record, le rate verranno scelte mese per mese
                        $variableAmounts = $renewalOption['options'] ?? [];
                        if (empty($variableAmounts)) {
                            // Se non ci sono opzioni, usa un default
                            $variableAmounts = [
                                ['amount' => $itemTotal / 12, 'label' => 'Opzione Standard']
                            ];
                        }

                        // Trova l'opzione meno cara
                        $cheapestOption = collect($variableAmounts)->sortBy('amount')->first();
                        $defaultAmount = $cheapestOption['amount'] ?? ($itemTotal / 12);

                        $renewalStartDate = clone $baseDate;
                        if ($paymentType === 'split_30_40_30' || $paymentType === '30_40_30') {
                            $renewalStartDate->modify('+3 months');
                        } else {
                            $renewalStartDate->modify('+1 month');
                        }

                        // Crea le prime 12 rate con l'opzione meno cara (default)
                        for ($i = 0; $i < $monthsCount; $i++) {
                            $dueDate = clone $renewalStartDate;
                            $dueDate->modify("+{$i} months");
                            $installments[] = [
                                'due_date' => $dueDate->format('Y-m-d'),
                                'amount' => $defaultAmount,
                                'description' => $item->description . " - Rinnovo Variabile " . ($i + 1) . "/{$monthsCount} (Default: " . $cheapestOption['label'] . ")",
                                'payment_type' => 'renewal',
                                'payment_schedule_type' => null,
                            ];
                        }

                        $renewals[] = [
                            'renewal_type' => 'variable',
                            'frequency' => 'monthly',
                            'start_date' => $renewalStartDate->format('Y-m-d'),
                            'end_date' => (clone $renewalStartDate)->modify("+{$monthsCount} months")->format('Y-m-d'),
                            'months_count' => $monthsCount,
                            'variable_amounts' => $variableAmounts,
                            'current_month_formula' => $cheapestOption['label'] ?? 'Default',
                        ];
                    }
                }
            }

            // Ordina installments per data
            usort($installments, function($a, $b) {
                return strcmp($a['due_date'], $b['due_date']);
            });

            // Calcola end_date (ultima rata + 1 mese)
            $lastInstallment = end($installments);
            $endDate = $lastInstallment ? (new \DateTime($lastInstallment['due_date']))->modify('+1 month') : null;

            // Crea piano di pagamento
            $plan = PaymentPlan::create([
                'contract_id' => $contract->id,
                'quote_id' => $contract->quote_id,
                'project_id' => $contract->crm_project_id,
                'client_id' => $contract->client_id,
                'status' => 'pending',
                'total_amount' => $totalAmount,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'notes' => 'Piano generato automaticamente da contratto ' . $contract->contract_number,
                'created_by' => Auth::id(),
            ]);

            // Crea installments
            foreach ($installments as $index => $installmentData) {
                $colorCode = $this->getColorForPaymentType(
                    $installmentData['payment_type'],
                    $installmentData['payment_schedule_type'] ?? null
                );

                $originalAmount = $installmentData['amount']; // L'importo originale è quello calcolato

                PaymentPlanInstallment::create([
                    'payment_plan_id' => $plan->id,
                    'installment_number' => $index + 1,
                    'due_date' => $installmentData['due_date'],
                    'amount' => $installmentData['amount'],
                    'original_amount' => $originalAmount,
                    'discount_amount' => 0,
                    'description' => $installmentData['description'],
                    'payment_type' => $installmentData['payment_type'],
                    'payment_schedule_type' => $installmentData['payment_schedule_type'] ?? null,
                    'color_code' => $colorCode,
                    'status' => 'pending',
                ]);
            }

            // Attiva automaticamente il piano
            $plan->status = 'active';
            $plan->save();

            // Ricarica il piano con le relazioni per creare gli eventi nel calendario
            $plan->load(['installments', 'contract', 'client', 'project']);

            // Inserisci le rate nel calendario
            $this->createCalendarEventsForPlan($plan);

            // Crea renewals
            foreach ($renewals as $renewalData) {
                PaymentPlanRenewal::create([
                    'payment_plan_id' => $plan->id,
                    'renewal_type' => $renewalData['renewal_type'],
                    'frequency' => $renewalData['frequency'],
                    'start_date' => $renewalData['start_date'],
                    'end_date' => $renewalData['end_date'] ?? null,
                    'months_count' => $renewalData['months_count'],
                    'fixed_amount' => $renewalData['fixed_amount'] ?? null,
                    'variable_amounts' => $renewalData['variable_amounts'] ?? null,
                    'current_month_formula' => $renewalData['current_month_formula'] ?? null,
                    'is_active' => true,
                ]);
            }

            DB::commit();

            $plan->load(['installments', 'renewals', 'contract', 'quote', 'client', 'project']);

            return response()->json([
                'success' => true,
                'data' => $plan,
                'message' => 'Piano di pagamento generato automaticamente con successo'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella generazione del piano: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Ottieni colore per tipo di pagamento
     */
    private function getColorForPaymentType($paymentType, $scheduleType = null)
    {
        // Rimborsi
        if ($paymentType === 'reimbursement') {
            return '#FF453A'; // Rosso
        }

        // Rinnovi
        if ($paymentType === 'renewal') {
            return '#FF9500'; // Arancione
        }

        // Rate servizi
        if ($paymentType === 'installment') {
            return '#0A84FF'; // Blu
        }

        // 30/40/30
        if ($scheduleType === '30_40_30') {
            return '#34C759'; // Verde
        }

        // 30 giorni
        if ($scheduleType === '30_60_days' && strpos($scheduleType, '30') !== false) {
            return '#5856D6'; // Viola
        }

        // 60 giorni
        if ($scheduleType === '30_60_days') {
            return '#AF52DE'; // Fucsia
        }

        // Default
        return '#0A84FF';
    }
}
