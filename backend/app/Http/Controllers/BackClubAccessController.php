<?php

namespace App\Http\Controllers;

use App\Models\BackClubAccessRequest;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BackClubAccessController extends Controller
{
    private const NOTIFY_EMAILS = [
        'jrovera05@gmail.com',
        'backsoftware.crm@gmail.com',
    ];

    /**
     * POST /api/backclub/richiedi-accesso
     * Richiesta pubblica: email + accettazione privacy. Salva, invia ringraziamento all'utente e notifica agli admin.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'privacy_accepted' => 'required|accepted',
        ], [
            'email.required' => 'L\'email è obbligatoria.',
            'email.email' => 'Inserisci un indirizzo email valido.',
            'privacy_accepted.required' => 'Devi accettare l\'informativa sulla privacy.',
            'privacy_accepted.accepted' => 'Devi accettare l\'informativa sulla privacy.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');

        try {
            BackClubAccessRequest::create(['email' => $email]);

            $mailService = new MailService();

            // Mail di ringraziamento all'utente
            $thankYouSubject = 'Grazie per la tua richiesta di accesso al BackClub';
            $thankYouBody = '
                <p>Ciao,</p>
                <p>Grazie per aver richiesto l\'accesso al <strong>BackClub</strong>.</p>
                <p>Abbiamo ricevuto la tua richiesta. Ti contatteremo al più presto per confermare l\'attivazione.</p>
                <p>A presto,<br><strong>Il team BackClub</strong></p>
            ';
            $result = $mailService->sendEmail($email, '', $thankYouSubject, $thankYouBody);
            if (!$result['success']) {
                Log::warning('BackClub richiedi-accesso: invio email ringraziamento fallito', ['email' => $email, 'result' => $result]);
            }

            // Notifica agli admin (entrambi i destinatari)
            $notifySubject = '[BackClub] Nuova richiesta di accesso: ' . $email;
            $notifyBody = '
                <p>È stata inviata una nuova richiesta di accesso al BackClub.</p>
                <p><strong>Email richiedente:</strong> ' . htmlspecialchars($email) . '</p>
                <p><strong>Data/ora:</strong> ' . now()->format('d/m/Y H:i') . '</p>
                <p>Visualizza tutte le richieste in <a href="' . (config('app.url') ?: 'https://backclub.it') . '/gestione-clienti">Gestione Clienti → Richieste accesso BackClub</a>.</p>
            ';
            foreach (self::NOTIFY_EMAILS as $notifyTo) {
                $notifyResult = $mailService->sendEmail($notifyTo, '', $notifySubject, $notifyBody);
                if (!$notifyResult['success']) {
                    Log::warning('BackClub richiedi-accesso: notifica admin fallita', ['to' => $notifyTo, 'result' => $notifyResult]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Richiesta inviata. Controlla la tua email per il messaggio di ringraziamento.',
            ]);
        } catch (\Throwable $e) {
            Log::error('BackClub richiedi-accesso exception: ' . $e->getMessage(), [
                'email' => $email,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Si è verificato un errore. Riprova più tardi.',
            ], 500);
        }
    }
}
