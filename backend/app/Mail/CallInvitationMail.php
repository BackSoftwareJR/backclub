<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Support\CalendarDateTime;

class CallInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public object $call,
        public string $organizerName,
        public ?string $meetLink = null,
        public array $participants = []
    ) {}

    public function envelope(): Envelope
    {
        $start = CalendarDateTime::forDisplay($this->call->start_time);

        return new Envelope(
            subject: $this->call->title . ' — ' . $start->translatedFormat('j M, H:i'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.calendar.call_invitation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
