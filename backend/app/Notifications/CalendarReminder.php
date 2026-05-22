<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CalendarReminder extends Notification
{
    use Queueable;

    public $calendarItem;

    /**
     * Create a new notification instance.
     */
    public function __construct($calendarItem)
    {
        $this->calendarItem = $calendarItem;
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
        $startTime = \Carbon\Carbon::parse($this->calendarItem->start_time);
        $typeLabels = [
            'event' => 'Evento',
            'call' => 'Chiamata',
            'deadline' => 'Scadenza',
            'reminder' => 'Promemoria',
            'task' => 'Task',
        ];
        $typeLabel = $typeLabels[$this->calendarItem->type] ?? 'Attività';

        return (new MailMessage)
            ->subject('Promemoria: ' . $this->calendarItem->title)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('Hai un ' . strtolower($typeLabel) . ' in programma.')
            ->line('**' . $typeLabel . ':** ' . $this->calendarItem->title)
            ->line('**Data/Ora:** ' . $startTime->format('d/m/Y H:i'))
            ->when($this->calendarItem->description, function ($mail) {
                return $mail->line('**Note:** ' . $this->calendarItem->description);
            })
            ->action('Vedi Calendario', url('/freelance/calendario'))
            ->line('Non dimenticare!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        $startTime = \Carbon\Carbon::parse($this->calendarItem->start_time);
        $typeLabels = [
            'event' => 'Evento',
            'call' => 'Chiamata',
            'deadline' => 'Scadenza',
            'reminder' => 'Promemoria',
            'task' => 'Task',
        ];
        $typeLabel = $typeLabels[$this->calendarItem->type] ?? 'Attività';

        return [
            'title' => 'Promemoria: ' . $this->calendarItem->title,
            'message' => 'Hai un ' . strtolower($typeLabel) . ' in programma il ' . $startTime->format('d/m/Y') . ' alle ' . $startTime->format('H:i'),
            'type' => 'calendar_reminder',
            'calendar_item_id' => $this->calendarItem->id,
            'calendar_item_type' => $this->calendarItem->type,
            'start_time' => $this->calendarItem->start_time,
            'url' => '/freelance/calendario',
        ];
    }
}
