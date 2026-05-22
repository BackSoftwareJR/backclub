<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProjectMemberAdded extends Notification
{
    use Queueable;

    public $project;
    public $addedBy;

    /**
     * Create a new notification instance.
     */
    public function __construct($project, $addedBy = null)
    {
        $this->project = $project;
        $this->addedBy = $addedBy;
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
        $addedByName = $this->addedBy ? $this->addedBy->name : 'Admin';
        $startDate = $this->project->start_date 
            ? \Carbon\Carbon::parse($this->project->start_date)->format('d/m/Y')
            : 'Non specificata';

        return (new MailMessage)
            ->subject('Aggiunto al Progetto: ' . $this->project->name)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('Sei stato aggiunto al progetto "' . $this->project->name . '" da ' . $addedByName . '.')
            ->line('**Cliente:** ' . ($this->project->client->company_name ?? 'N/A'))
            ->line('**Data Inizio:** ' . $startDate)
            ->action('Vedi Progetto', url('/freelance/progetti/' . $this->project->id))
            ->line('Benvenuto nel team!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        return [
            'title' => 'Aggiunto al Progetto',
            'message' => 'Sei stato aggiunto al progetto "' . $this->project->name . '"' . 
                       ($this->addedBy ? ' da ' . $this->addedBy->name : ''),
            'type' => 'project_member_added',
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'added_by_name' => $this->addedBy->name ?? null,
            'url' => '/freelance/progetti/' . $this->project->id,
        ];
    }
}
