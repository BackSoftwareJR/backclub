<?php

namespace App\Http\Controllers;

use App\Models\CompanyPortfolioTransaction;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CompanyPortfolioController extends Controller
{
    private function getTokenFromRequest(Request $request): ?string
    {
        return $request->header('X-Portfolio-Token') ?: $request->input('portfolio_token');
    }

    private function validatePortfolioToken(Request $request): bool
    {
        $token = $this->getTokenFromRequest($request);
        if (!$token) {
            return false;
        }
        return Cache::has('portfolio_access_' . $token);
    }

    /**
     * POST /api/portfolio/send-code
     * Genera un codice OTP di 6 cifre, lo salva in cache e lo invia via email.
     */
    public function sendCode(Request $request)
    {
        $to = config('portfolio.code_recipient_email');

        if (empty($to)) {
            return response()->json([
                'success' => false,
                'message' => 'Configurazione portfolio non completata (email destinatario mancante).',
            ], 500);
        }

        try {
            $otp = (string) random_int(100000, 999999);
            $ttlMinutes = config('portfolio.otp_ttl_minutes', 15);
            Cache::put('portfolio_otp', $otp, now()->addMinutes($ttlMinutes));

            $mailService = new MailService();
            $subject = 'Codice accesso Portfolio Azienda - BackClub';
            $htmlBody = '
                <p>Ecco il codice per accedere al <strong>Portfolio Azienda</strong> (valido ' . $ttlMinutes . ' minuti):</p>
                <p style="font-size:1.5em; font-family:monospace; letter-spacing:0.2em; background:#f0f0f0; padding:16px; border-radius:8px;">' . htmlspecialchars($otp) . '</p>
                <p>Accedi da: <a href="' . (config('app.url') ?: 'https://backclub.it') . '/portfolio-azienda">Portfolio Azienda</a></p>
                <p>Il codice è monouso e riservato. Non condividerlo.</p>
            ';
            $result = $mailService->sendEmail($to, 'Portfolio Azienda', $subject, $htmlBody);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Codice inviato con successo a ' . $to,
                ]);
            }

            Log::warning('Portfolio send-code: invio fallito', ['result' => $result]);
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Errore nell\'invio dell\'email.',
            ], 500);
        } catch (\Throwable $e) {
            Log::error('Portfolio send-code exception: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'invio: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/portfolio/verify-code
     * Verifica il codice OTP di 6 cifre (inviato per email) e restituisce un token.
     */
    public function verifyCode(Request $request)
    {
        $code = trim((string) $request->input('code', ''));
        $expected = Cache::get('portfolio_otp');

        if ($code === '' || $expected === null || $code !== $expected) {
            return response()->json([
                'success' => false,
                'message' => 'Codice non valido o scaduto. Richiedi un nuovo codice.',
            ], 401);
        }

        Cache::forget('portfolio_otp'); // monouso

        $token = Str::random(64);
        Cache::put('portfolio_access_' . $token, true, now()->addMinutes(config('portfolio.token_ttl_minutes')));

        return response()->json([
            'success' => true,
            'token' => $token,
            'expires_in_minutes' => config('portfolio.token_ttl_minutes'),
        ]);
    }

    /**
     * GET /api/portfolio/balance
     */
    public function balance(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $balance = CompanyPortfolioTransaction::getBalance();

        return response()->json([
            'success' => true,
            'data' => ['balance' => $balance],
        ]);
    }

    /**
     * GET /api/portfolio/transactions
     */
    public function transactions(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $perPage = (int) $request->input('per_page', 50);
        $transactions = CompanyPortfolioTransaction::orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * POST /api/portfolio/expense
     */
    public function expense(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:500',
            'transaction_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $amount = -(float) $request->amount;
        $transaction = CompanyPortfolioTransaction::create([
            'type' => 'expense',
            'amount' => $amount,
            'description' => $request->description,
            'transaction_date' => $request->transaction_date,
        ]);

        return response()->json([
            'success' => true,
            'data' => $transaction,
            'balance' => CompanyPortfolioTransaction::getBalance(),
        ], 201);
    }

    /**
     * POST /api/portfolio/withdrawal
     */
    public function withdrawal(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:500',
            'transaction_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $amount = -(float) $request->amount;
        $transaction = CompanyPortfolioTransaction::create([
            'type' => 'withdrawal',
            'amount' => $amount,
            'description' => $request->description ?: 'Prelievo personale',
            'transaction_date' => $request->transaction_date,
        ]);

        return response()->json([
            'success' => true,
            'data' => $transaction,
            'balance' => CompanyPortfolioTransaction::getBalance(),
        ], 201);
    }

    /**
     * POST /api/portfolio/deposit
     * Versamento personale (entrata).
     */
    public function deposit(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:500',
            'transaction_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $amount = (float) $request->amount;
        $transaction = CompanyPortfolioTransaction::create([
            'type' => 'deposit',
            'amount' => $amount,
            'description' => $request->description ?: 'Versamento personale',
            'transaction_date' => $request->transaction_date,
        ]);

        return response()->json([
            'success' => true,
            'data' => $transaction,
            'balance' => CompanyPortfolioTransaction::getBalance(),
        ], 201);
    }

    /**
     * GET /api/portfolio/dashboard
     * Dati per grafici e KPI: saldo, andamento, totali per tipo.
     */
    public function dashboard(Request $request)
    {
        if (!$this->validatePortfolioToken($request)) {
            return response()->json(['success' => false, 'message' => 'Accesso non autorizzato'], 401);
        }

        $balance = CompanyPortfolioTransaction::getBalance();

        $months = 12;
        $balanceHistory = [];

        $allTransactions = CompanyPortfolioTransaction::orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        $byMonth = $allTransactions->groupBy(fn ($t) => $t->transaction_date->format('Y-m'));

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthDate = now()->subMonths($i);
            $key = $monthDate->format('Y-m');
            $lastDay = $monthDate->copy()->endOfMonth()->toDateString();
            $label = $monthDate->locale('it')->translatedFormat('M y');
            $balanceAtEnd = (float) $allTransactions->filter(fn ($t) => $t->transaction_date->toDateString() <= $lastDay)->sum('amount');
            $monthTx = $byMonth->get($key) ?? collect();
            $balanceHistory[] = [
                'month' => $key,
                'label' => $label,
                'balance' => round($balanceAtEnd, 2),
                'total_in' => round((float) $monthTx->filter(fn ($t) => $t->amount > 0)->sum('amount'), 2),
                'total_out' => round((float) $monthTx->filter(fn ($t) => $t->amount < 0)->sum('amount'), 2),
            ];
        }

        $startDate = now()->subMonths($months)->startOfMonth()->toDateString();
        $totalsByType = CompanyPortfolioTransaction::where('transaction_date', '>=', $startDate)
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type')
            ->map(fn ($v) => round((float) $v, 2))
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => round($balance, 2),
                'balance_history' => $balanceHistory,
                'totals_by_type' => $totalsByType,
            ],
        ]);
    }
}
