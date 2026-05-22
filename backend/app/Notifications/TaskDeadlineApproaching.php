<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskDeadlineApproaching extends Notification
{
    use Queueable;

    public $task;
    public $project;
    public $daysUntilDeadline;

    /**
     * Create a new notification instance.
     */
    public function __construct($task, $project = null, $daysUntilDeadline = 0)
    {
        $this->task = $task;
        $this->project = $project ?? $task->project ?? null;
        $this->daysUntilDeadline = $daysUntilDeadline;
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
        $projectName = $this->project ? $this->project->name : 'Progetto';
        $dueDate = $this->task->due_date 
            ? \Carbon\Carbon::parse($this->task->due_date)->format('d/m/Y')
            : 'Non specificata';
        
        $daysText = $this->daysUntilDeadline == 0 
            ? 'oggi' 
            : ($this->daysUntilDeadline == 1 ? 'domani' : 'tra ' . $this->daysUntilDeadline . ' giorni');

        return (new MailMessage)
            ->subject('⚠️ Scadenza Imminente: ' . $this->task->title)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('La scadenza del task "' . $this->task->title . '" è ' . $daysText . '.')
            ->line('**Progetto:** ' . $projectName)
            ->line('**Scadenza:** ' . $dueDate)
            ->line('**Priorità:** ' . ucfirst($this->task->priority ?? 'media'))
            ->action('Vedi Task', url('/freelance/task/' . $this->task->id))
            ->line('Non dimenticare di completarlo in tempo!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        $daysText = $this->daysUntilDeadline == 0 
            ? 'oggi' 
            : ($this->daysUntilDeadline == 1 ? 'domani' : 'tra ' . $this->daysUntilDeadline . ' giorni');

        return [
            'title' => 'Scadenza Imminente',
            'message' => 'La scadenza del task "' . $this->task->title . '" è ' . $daysText . 
                       ($this->project ? ' nel progetto "' . $this->project->name . '"' : ''),
            'type' => 'task_deadline_approaching',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'project_id' => $this->project->id ?? null,
            'project_name' => $this->project->name ?? null,
            'due_date' => $this->task->due_date,
            'days_until_deadline' => $this->daysUntilDeadline,
            'priority' => $this->task->priority ?? 'medium',
            'url' => '/freelance/task/' . $this->task->id,
        ];
    }
}
