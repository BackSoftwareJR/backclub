<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskReassigned extends Notification
{
    use Queueable;

    public $task;
    public $project;
    public $assignedBy;

    /**
     * Create a new notification instance.
     */
    public function __construct($task, $project = null, $assignedBy = null)
    {
        $this->task = $task;
        $this->project = $project ?? $task->project ?? null;
        $this->assignedBy = $assignedBy;
    }

    /**
     * Get the notification's delivery channels.
     * Solo database: l'email viene inviata via MailService (PHPMailer) nel controller
     * per evitare errore 535 con Laravel Mail (MAIL_USERNAME info@backclub.it).
     *
     * @return array<int, string>
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
        $assignedByName = $this->assignedBy ? $this->assignedBy->name : 'Admin';
        $dueDate = $this->task->due_date 
            ? \Carbon\Carbon::parse($this->task->due_date)->format('d/m/Y')
            : 'Non specificata';

        return (new MailMessage)
            ->subject('Task Riassegnato: ' . $this->task->title)
            ->greeting('Ciao ' . $notifiable->name . ',')
            ->line('Il task "' . $this->task->title . '" ti è stato riassegnato da ' . $assignedByName . '.')
            ->line('**Progetto:** ' . $projectName)
            ->line('**Nuova Scadenza:** ' . $dueDate)
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
            'title' => 'Task Riassegnato',
            'message' => 'Il task "' . $this->task->title . '" ti è stato riassegnato' . 
                       ($this->assignedBy ? ' da ' . $this->assignedBy->name : ''),
            'type' => 'task_reassigned',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'project_id' => $this->project->id ?? null,
            'project_name' => $this->project->name ?? null,
            'assigned_by_name' => $this->assignedBy->name ?? null,
            'due_date' => $this->task->due_date,
            'url' => '/freelance/task/' . $this->task->id,
        ];
    }
}
