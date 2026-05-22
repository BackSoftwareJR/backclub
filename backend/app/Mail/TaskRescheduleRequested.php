<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskRescheduleRequested extends Mailable
{
    use Queueable, SerializesModels;

    public $request;
    public $approveUrl;
    public $rejectUrl;

    /**
     * Create a new message instance.
     */
    public function __construct($request)
    {
        $this->request = $request;
        
        // Generate signed URLs for one-click action
        // We assume routes 'task.reschedule.approve' and 'task.reschedule.reject' exist
        $this->approveUrl = \Illuminate\Support\Facades\URL::signedRoute('task.reschedule.approve', ['rescheduleRequest' => $request->id]);
        $this->rejectUrl = \Illuminate\Support\Facades\URL::signedRoute('task.reschedule.reject', ['rescheduleRequest' => $request->id]);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Richiesta Spostamento Task: ' . $this->request->task->title,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.tasks.reschedule_requested',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
