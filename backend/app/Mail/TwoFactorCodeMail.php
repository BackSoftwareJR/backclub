<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $code;
    public int $expiryMinutes = 10;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $code)
    {
        $this->user = $user;
        $this->code = $code;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Codice di Verifica - Back Club',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.two_factor_code',
            with: [
                'code' => $this->code,
                'userName' => $this->user->name,
                'expiryMinutes' => $this->expiryMinutes,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
