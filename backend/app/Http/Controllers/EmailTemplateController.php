<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Models\EmailTemplate;
use App\Models\EmailSentLog;

class EmailTemplateController extends Controller
{
    /**
     * Lista template
     */
    public function index(Request $request)
    {
        $query = EmailTemplate::with('creator')
            ->orderBy('created_at', 'desc');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->get());
    }

    /**
     * Crea nuovo template
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'body_html' => 'required|string',
            'body_text' => 'nullable|string',
            'variables' => 'nullable|array',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $template = EmailTemplate::create($validated);

        return response()->json($template->load('creator'), 201);
    }

    /**
     * Dettagli template
     */
    public function show(EmailTemplate $emailTemplate)
    {
        return response()->json($emailTemplate->load('creator'));
    }

    /**
     * Aggiorna template
     */
    public function update(Request $request, EmailTemplate $emailTemplate)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'subject' => 'string|max:255',
            'body_html' => 'string',
            'body_text' => 'nullable|string',
            'variables' => 'nullable|array',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $emailTemplate->update($validated);

        return response()->json($emailTemplate->load('creator'));
    }

    /**
     * Elimina template
     */
    public function destroy(EmailTemplate $emailTemplate)
    {
        $emailTemplate->delete();
        return response()->json(null, 204);
    }

    /**
     * Invia email usando template
     */
    public function send(Request $request, EmailTemplate $emailTemplate)
    {
        $validated = $request->validate([
            'to_email' => 'required|email',
            'to_name' => 'nullable|string',
            'variables' => 'required|array',
            'related_type' => 'nullable|string',
            'related_id' => 'nullable|integer',
            'attachments' => 'nullable|array',
            'attachments.*' => 'exists:documents,id',
        ]);

        // Renderizza template con variabili
        $rendered = $emailTemplate->render($validated['variables']);

        try {
            // Invia email
            Mail::send([], [], function ($message) use ($validated, $rendered) {
                $message->to($validated['to_email'], $validated['to_name'] ?? null)
                    ->subject($rendered['subject'])
                    ->html($rendered['body_html'])
                    ->text($rendered['body_text']);

                // Aggiungi allegati se presenti
                if (isset($validated['attachments'])) {
                    foreach ($validated['attachments'] as $documentId) {
                        $document = \App\Models\Document::find($documentId);
                        if ($document && file_exists(storage_path('app/' . $document->path))) {
                            $message->attach(storage_path('app/' . $document->path), [
                                'as' => $document->original_name,
                            ]);
                        }
                    }
                }
            });

            // Log email inviata
            $emailLog = EmailSentLog::create([
                'template_id' => $emailTemplate->id,
                'to_email' => $validated['to_email'],
                'to_name' => $validated['to_name'],
                'subject' => $rendered['subject'],
                'body_html' => $rendered['body_html'],
                'sent_by' => Auth::id(),
                'related_type' => $validated['related_type'] ?? null,
                'related_id' => $validated['related_id'] ?? null,
                'status' => 'sent',
                'is_template' => true,
            ]);

            // Salva allegati
            if (isset($validated['attachments'])) {
                foreach ($validated['attachments'] as $documentId) {
                    $document = \App\Models\Document::find($documentId);
                    if ($document) {
                        \App\Models\EmailAttachment::create([
                            'email_sent_log_id' => $emailLog->id,
                            'document_id' => $documentId,
                            'path' => $document->path,
                            'filename' => $document->filename,
                            'original_name' => $document->original_name,
                            'mime_type' => $document->mime_type,
                            'size' => $document->size,
                        ]);
                    }
                }
            }

            return response()->json(['message' => 'Email inviata con successo']);
        } catch (\Exception $e) {
            // Log errore
            EmailSentLog::create([
                'template_id' => $emailTemplate->id,
                'to_email' => $validated['to_email'],
                'to_name' => $validated['to_name'],
                'subject' => $rendered['subject'],
                'body_html' => $rendered['body_html'],
                'sent_by' => Auth::id(),
                'related_type' => $validated['related_type'] ?? null,
                'related_id' => $validated['related_id'] ?? null,
                'status' => 'failed',
                'is_template' => true,
            ]);

            return response()->json(['message' => 'Errore nell\'invio email: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Invia email personalizzata (senza template)
     */
    public function sendCustom(Request $request)
    {
        $validated = $request->validate([
            'to' => 'required|array',
            'to.*' => 'required|email',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'exists:documents,id',
            'related_type' => 'nullable|string',
            'related_id' => 'nullable|integer',
        ]);

        $sent = [];
        $failed = [];

        foreach ($validated['to'] as $email) {
            try {
                Mail::send([], [], function ($message) use ($email, $validated) {
                    $message->to($email)
                        ->subject($validated['subject'])
                        ->html($validated['body']);

                    // Aggiungi allegati
                    if (isset($validated['attachments'])) {
                        foreach ($validated['attachments'] as $documentId) {
                            $document = \App\Models\Document::find($documentId);
                            if ($document && file_exists(storage_path('app/' . $document->path))) {
                                $message->attach(storage_path('app/' . $document->path), [
                                    'as' => $document->original_name,
                                ]);
                            }
                        }
                    }
                });

                // Log email
                $emailLog = EmailSentLog::create([
                    'to_email' => $email,
                    'subject' => $validated['subject'],
                    'body_html' => $validated['body'],
                    'sent_by' => Auth::id(),
                    'related_type' => $validated['related_type'] ?? null,
                    'related_id' => $validated['related_id'] ?? null,
                    'status' => 'sent',
                    'is_template' => false,
                    'custom_subject' => $validated['subject'],
                    'custom_body' => $validated['body'],
                ]);

                // Salva allegati
                if (isset($validated['attachments'])) {
                    foreach ($validated['attachments'] as $documentId) {
                        $document = \App\Models\Document::find($documentId);
                        if ($document) {
                            \App\Models\EmailAttachment::create([
                                'email_sent_log_id' => $emailLog->id,
                                'document_id' => $documentId,
                                'path' => $document->path,
                                'filename' => $document->filename,
                                'original_name' => $document->original_name,
                                'mime_type' => $document->mime_type,
                                'size' => $document->size,
                            ]);
                        }
                    }
                }

                $sent[] = $email;
            } catch (\Exception $e) {
                $failed[] = ['email' => $email, 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'sent' => $sent,
            'failed' => $failed,
            'total_sent' => count($sent),
            'total_failed' => count($failed),
        ]);
    }

    /**
     * Preview template con variabili di esempio
     */
    public function preview(Request $request, EmailTemplate $emailTemplate)
    {
        $variables = $request->get('variables', []);

        $rendered = $emailTemplate->render($variables);

        return response()->json([
            'subject' => $rendered['subject'],
            'body_html' => $rendered['body_html'],
            'body_text' => $rendered['body_text'],
        ]);
    }

    /**
     * Lista email inviate
     */
    public function sentLogs(Request $request)
    {
        $query = EmailSentLog::with(['template', 'sender'])
            ->orderBy('sent_at', 'desc');

        if ($request->filled('template_id')) {
            $query->where('template_id', $request->template_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }
}

