<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskDeletionRequestReviewed extends Mailable
{
    use Queueable, SerializesModels;

    public $request;
    public $status; // 'approved' or 'rejected'
    public $reviewer;

    /**
     * Create a new message instance.
     */
    public function __construct($request, $status, $reviewer)
    {
        $this->request = $request;
        $this->status = $status;
        $this->reviewer = $reviewer;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $task = $this->request->task;
        $subject = $this->status === 'approved' 
            ? 'Richiesta Eliminazione Approvata: ' . $task->title
            : 'Richiesta Eliminazione Rifiutata: ' . $task->title;

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.tasks.deletion_request_reviewed',
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
