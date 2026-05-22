<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewMessageReceived extends Notification
{
    use Queueable;

    public $message;
    public $project;
    public $sender;

    /**
     * Create a new notification instance.
     */
    public function __construct($message, $project = null, $sender = null)
    {
        $this->message = $message;
        $this->project = $project;
        $this->sender = $sender;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $senderName = $this->sender ? $this->sender->name : 'Utente';
        $projectName = $this->project ? $this->project->name : 'Progetto';
        $messagePreview = strlen($this->message->message) > 100 
            ? substr($this->message->message, 0, 100) . '...'
            : $this->message->message;

        return (new MailMessage)
            ->subject('Nuovo Messaggio da ' . $senderName . ' - ' . $projectName)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('Hai ricevuto un nuovo messaggio da ' . $senderName . ' nel progetto "' . $projectName . '".')
            ->line('**Messaggio:**')
            ->line($messagePreview)
            ->action('Vedi Chat', url('/freelance/chat'))
            ->line('Rispondi quando puoi!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        $messagePreview = strlen($this->message->message) > 150 
            ? substr($this->message->message, 0, 150) . '...'
            : $this->message->message;

        return [
            'title' => 'Nuovo Messaggio',
            'message' => ($this->sender ? $this->sender->name : 'Utente') . 
                       ' ha inviato un messaggio' . 
                       ($this->project ? ' nel progetto "' . $this->project->name . '"' : '') . 
                       ': ' . $messagePreview,
            'type' => 'new_message_received',
            'project_id' => $this->project->id ?? null,
            'project_name' => $this->project->name ?? null,
            'sender_id' => $this->sender->id ?? null,
            'sender_name' => $this->sender->name ?? null,
            'message_id' => $this->message->id ?? null,
            'url' => '/freelance/chat',
        ];
    }
}
