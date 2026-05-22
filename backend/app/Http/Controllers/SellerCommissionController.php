<?php

namespace App\Http\Controllers;

use App\Models\SellerCommission;
use App\Models\Contract;
use App\Models\PaymentPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SellerCommissionController extends Controller
{
    /**
     * GET /api/seller-commissions
     * Lista commissioni venditore (filtrate per seller_id dell'utente autenticato)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Verifica che l'utente sia un venditore
        if (!$user->seller_id) {
            return response()->json([
                'success' => false,
                'message' => 'Utente non è un venditore'
            ], 403);
        }

        $query = SellerCommission::with([
            'seller.user',
            'contract.client',
            'paymentPlan',
            'invoice',
            'installment'
        ])->where('seller_id', $user->seller_id);

        // Filtro per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro per contratto
        if ($request->has('contract_id')) {
            $query->where('contract_id', $request->contract_id);
        }

        // Filtro per payment plan
        if ($request->has('payment_plan_id')) {
            $query->where('payment_plan_id', $request->payment_plan_id);
        }

        $commissions = $query->orderBy('created_at', 'desc')
                            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $commissions
        ]);
    }

    /**
     * GET /api/seller-commissions/{id}
     * Dettaglio commissione
     */
    public function show($id)
    {
        $user = Auth::user();
        
        $commission = SellerCommission::with([
            'seller.user',
            'contract.client',
            'contract.project',
            'paymentPlan.installments',
            'invoice',
            'installment'
        ])->where('seller_id', $user->seller_id)
          ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $commission
        ]);
    }

    /**
     * GET /api/seller-commissions/contracts
     * Lista contratti attivi con riepilogo commissioni
     */
    public function contracts(Request $request)
    {
        $user = Auth::user();
        
        if (!$user->seller_id) {
            return response()->json([
                'success' => false,
                'message' => 'Utente non è un venditore'
            ], 403);
        }

        // Carica dati venditore per ottenere commission_rate
        $seller = \App\Models\Seller::find($user->seller_id);
        $commissionRate = $seller ? floatval($seller->commission_rate ?? 0) : 0;

        // Carica contratti attivi del venditore (anche senza commissioni ancora create)
        // Mostra tutti i contratti attivi, anche se non hanno payment plan
        $contracts = Contract::with(['client', 'paymentPlans' => function($query) {
                $query->where('status', 'active');
            }, 'paymentPlans.installments'])
            ->where('seller_id', $user->seller_id)
            ->where('status', 'active')
            ->get();
        
        // Log di debug
        \Log::info('SellerCommissionController::contracts', [
            'seller_id' => $user->seller_id,
            'contracts_count' => $contracts->count(),
            'contracts_ids' => $contracts->pluck('id')->toArray(),
        ]);

        // Se non ci sono contratti, restituisci array vuoto ma con summary
        if ($contracts->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'data' => [],
                    'summary' => [
                        'commission_rate' => $commissionRate,
                        'total_pending' => 0,
                        'total_pending_collection' => 0,
                        'total_collected' => 0,
                        'total_expected' => 0, // Commissioni previste
                    ]
                ]
            ]);
        }

        // Calcola totali aggregati
        $allCommissions = SellerCommission::where('seller_id', $user->seller_id)->get();
        $totalPendingAll = $allCommissions->where('status', 'pending')->sum('amount');
        $totalPendingCollectionAll = $allCommissions->where('status', 'pending_collection')->sum('amount');
        $totalCollectedAll = $allCommissions->where('status', 'collected')->sum('amount');

        $result = $contracts->map(function ($contract) use ($user, $commissionRate) {
            // Carica commissioni per questo contratto
            $commissions = SellerCommission::where('contract_id', $contract->id)
                ->where('seller_id', $user->seller_id)
                ->get();

            // Calcola totali per stato
            $totalPending = $commissions->where('status', 'pending')->sum('amount');
            $totalPendingCollection = $commissions->where('status', 'pending_collection')->sum('amount');
            $totalCollected = $commissions->where('status', 'collected')->sum('amount');
            $totalCommissions = $commissions->sum('amount');

            // Calcola totale saldato e rimanente dal payment plan
            $totalPaid = 0;
            $totalRemaining = 0;
            $totalExpectedCommissions = 0; // Commissioni previste per questo contratto
            $paidInstallmentsCount = 0;
            $totalInstallmentsCount = 0;
            
            $paymentPlan = $contract->paymentPlans()->where('status', 'active')->first();
            if ($paymentPlan) {
                $installments = $paymentPlan->installments;
                $totalPaid = $installments->where('status', 'paid')->sum('amount');
                $totalRemaining = $installments->where('status', '!=', 'paid')->sum('amount');
                $totalInstallmentsCount = $installments->count();
                $paidInstallmentsCount = $installments->where('status', 'paid')->count();
                
                // Calcola commissioni previste per rate senza commissione ancora creata
                foreach ($installments as $installment) {
                    $hasCommission = $commissions->where('installment_id', $installment->id)->isNotEmpty();
                    if (!$hasCommission) {
                        // Calcola commissione prevista
                        $expectedCommission = $installment->amount * ($commissionRate / 100);
                        $totalExpectedCommissions += $expectedCommission;
                    }
                }
            }

            // Log di debug per ogni contratto
            \Log::info('SellerCommissionController::contracts - Contract processed', [
                'contract_id' => $contract->id,
                'contract_number' => $contract->contract_number,
                'has_payment_plan' => $paymentPlan ? true : false,
                'commissions_count' => $commissions->count(),
                'total_commissions' => $totalCommissions,
                'total_expected_commissions' => $totalExpectedCommissions,
            ]);

            return [
                'contract' => $contract,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining,
                'total_commissions' => $totalCommissions,
                'total_pending' => $totalPending,
                'total_pending_collection' => $totalPendingCollection,
                'total_collected' => $totalCollected,
                'total_expected_commissions' => $totalExpectedCommissions, // Commissioni previste
                'paid_installments_count' => $paidInstallmentsCount, // Numero rate pagate
                'total_installments_count' => $totalInstallmentsCount, // Numero totale rate
                'commissions_count' => $commissions->count(),
            ];
        });

        // Calcola totale commissioni previste aggregate
        $totalExpectedAll = $result->sum('total_expected_commissions');

        // Log di debug finale
        \Log::info('SellerCommissionController::contracts - Response prepared', [
            'result_count' => $result->count(),
            'summary' => [
                'commission_rate' => $commissionRate,
                'total_pending' => $totalPendingAll,
                'total_pending_collection' => $totalPendingCollectionAll,
                'total_collected' => $totalCollectedAll,
            ]
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'data' => $result,
                'summary' => [
                    'commission_rate' => $commissionRate,
                    'total_pending' => $totalPendingAll,
                    'total_pending_collection' => $totalPendingCollectionAll,
                    'total_collected' => $totalCollectedAll,
                    'total_expected' => $totalExpectedAll, // Commissioni previste aggregate
                ]
            ]
        ]);
    }

    /**
     * GET /api/seller-commissions/contract/{contractId}
     * Dettaglio commissioni per contratto
     */
    public function byContract($contractId, Request $request)
    {
        $user = Auth::user();
        
        if (!$user->seller_id) {
            return response()->json([
                'success' => false,
                'message' => 'Utente non è un venditore'
            ], 403);
        }

        // Verifica che il contratto appartenga al venditore
        $contract = Contract::with('client', 'project')
            ->where('seller_id', $user->seller_id)
            ->findOrFail($contractId);

        // Carica payment plan
        $paymentPlan = PaymentPlan::with('installments')
            ->where('contract_id', $contractId)
            ->where('status', 'active')
            ->first();

        // Carica commissioni
        $commissions = SellerCommission::with(['invoice', 'installment'])
            ->where('contract_id', $contractId)
            ->where('seller_id', $user->seller_id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Carica dati venditore per ottenere commission_rate
        $seller = \App\Models\Seller::find($user->seller_id);
        $commissionRate = $seller ? floatval($seller->commission_rate ?? 0) : 0;

        // Prepara timeline installments con commissioni associate e commissione prevista
        $timeline = [];
        if ($paymentPlan) {
            foreach ($paymentPlan->installments as $installment) {
                $commission = $commissions->firstWhere('installment_id', $installment->id);
                
                // Calcola commissione prevista anche se non c'è ancora una commissione creata
                $expectedCommission = $installment->amount * ($commissionRate / 100);
                
                $timeline[] = [
                    'installment' => $installment,
                    'commission' => $commission,
                    'invoice' => $commission ? $commission->invoice : null,
                    'expected_commission' => $expectedCommission, // Commissione prevista calcolata
                    'commission_rate' => $commissionRate, // Percentuale commissione per riferimento
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'contract' => $contract,
                'payment_plan' => $paymentPlan,
                'commissions' => $commissions,
                'timeline' => $timeline,
            ]
        ]);
    }

    /**
     * GET /api/seller-commissions/all
     * Lista tutte le commissioni (per segreteria)
     */
    public function all(Request $request)
    {
        $query = SellerCommission::with([
            'seller.user',
            'contract.client',
            'paymentPlan',
            'invoice',
            'installment'
        ]);

        // Filtro per venditore
        if ($request->has('seller_id')) {
            $query->where('seller_id', $request->seller_id);
        }

        // Filtro per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro per contratto
        if ($request->has('contract_id')) {
            $query->where('contract_id', $request->contract_id);
        }

        $commissions = $query->orderBy('created_at', 'desc')
                            ->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $commissions
        ]);
    }

    /**
     * GET /api/seller-commissions/sellers/summary
     * Riepilogo commissioni per venditore (per segreteria)
     */
    public function sellersSummary(Request $request)
    {
        // Carica tutti i venditori attivi
        $sellers = \App\Models\Seller::with('user')
            ->where('is_active', 1)
            ->get();

        // Log di debug
        \Log::info('SellerCommissionController::sellersSummary', [
            'sellers_count' => $sellers->count(),
            'sellers_ids' => $sellers->pluck('id')->toArray(),
        ]);

        // Per ogni venditore, calcola le commissioni
        $result = $sellers->map(function ($seller) use ($request) {
            $query = SellerCommission::where('seller_id', $seller->id);

            // Filtro per stato
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $commissions = $query->get();

            return [
                'seller' => $seller,
                'total_count' => $commissions->count(),
                'total_amount' => $commissions->sum('amount'),
                'pending_amount' => $commissions->where('status', 'pending')->sum('amount'),
                'pending_collection_amount' => $commissions->where('status', 'pending_collection')->sum('amount'),
                'collected_amount' => $commissions->where('status', 'collected')->sum('amount'),
            ];
        });

        // Log di debug finale
        \Log::info('SellerCommissionController::sellersSummary - Response prepared', [
            'result_count' => $result->count(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * POST /api/seller-commissions/{id}/collect
     * Salda commissione (per segreteria)
     */
    public function collect(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'receipt_link' => 'required|string|max:500',
            'collected_at' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $commission = SellerCommission::findOrFail($id);

        if ($commission->status === 'collected') {
            return response()->json([
                'success' => false,
                'message' => 'Commissione già riscossa'
            ], 400);
        }

        if ($commission->status !== 'pending_collection') {
            return response()->json([
                'success' => false,
                'message' => 'La commissione deve essere in stato "In Attesa di Riscossione" per essere saldata'
            ], 400);
        }

        $commission->status = 'collected';
        $commission->collected_at = $request->collected_at;
        $commission->receipt_link = $request->receipt_link;
        $commission->notes = $request->notes;
        $commission->save();

        $commission->load(['seller.user', 'contract.client', 'invoice']);

        return response()->json([
            'success' => true,
            'data' => $commission,
            'message' => 'Commissione saldata con successo'
        ]);
    }
}
