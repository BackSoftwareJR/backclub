<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public $task;
    public $project;

    /**
     * Create a new notification instance.
     */
    public function __construct($task, $project = null)
    {
        $this->task = $task;
        $this->project = $project ?? $task->project ?? null;
    }

    /**
     * Get the notification's delivery channels.
     * Solo database: l'email viene inviata via MailService (PHPMailer) nel controller.
     */
    public function via($notifiable): array
    {
        return ['database'];
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

        return (new MailMessage)
            ->subject('Nuovo Task Assegnato: ' . $this->task->title)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('Ti è stato assegnato un nuovo task.')
            ->line('**Task:** ' . $this->task->title)
            ->line('**Progetto:** ' . $projectName)
            ->line('**Scadenza:** ' . $dueDate)
            ->line('**Priorità:** ' . ucfirst($this->task->priority ?? 'media'))
            ->action('Vedi Task', url('/freelance/task/' . $this->task->id))
            ->line('Grazie per il tuo lavoro!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        return [
            'title' => 'Task Assegnato',
            'message' => 'Ti è stato assegnato il task "' . $this->task->title . '"' . 
                       ($this->project ? ' nel progetto "' . $this->project->name . '"' : ''),
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'project_id' => $this->project->id ?? null,
            'project_name' => $this->project->name ?? null,
            'due_date' => $this->task->due_date,
            'priority' => $this->task->priority ?? 'medium',
            'url' => '/freelance/task/' . $this->task->id,
        ];
    }
}
