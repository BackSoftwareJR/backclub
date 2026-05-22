<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskRequestReviewed extends Notification
{
    use Queueable;

    public $request;
    public $type; // 'reschedule' or 'deletion'
    public $status; // 'approved' or 'rejected'
    public $reviewer;

    /**
     * Create a new notification instance.
     */
    public function __construct($request, $type, $status, $reviewer)
    {
        $this->request = $request;
        $this->type = $type;
        $this->status = $status;
        $this->reviewer = $reviewer;
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
        $task = $this->request->task;
        $project = $task->project ?? null;
        
        $subject = $this->type === 'reschedule' 
            ? ($this->status === 'approved' 
                ? 'Richiesta Spostamento Approvata: ' . $task->title
                : 'Richiesta Spostamento Rifiutata: ' . $task->title)
            : ($this->status === 'approved' 
                ? 'Richiesta Eliminazione Approvata: ' . $task->title
                : 'Richiesta Eliminazione Rifiutata: ' . $task->title);

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting('Ciao ' . $notifiable->name . ',');

        if ($this->type === 'reschedule') {
            if ($this->status === 'approved') {
                $message->line('La tua richiesta di spostamento scadenza per la task **' . $task->title . '** è stata **approvata**.')
                    ->line('**Nuova scadenza:** ' . \Carbon\Carbon::parse($this->request->requested_due_date)->format('d/m/Y'));
            } else {
                $message->line('La tua richiesta di spostamento scadenza per la task **' . $task->title . '** è stata **rifiutata**.');
            }
        } else {
            if ($this->status === 'approved') {
                $message->line('La tua richiesta di eliminazione per la task **' . $task->title . '** è stata **approvata**.')
                    ->line('La task è stata cancellata.');
            } else {
                $message->line('La tua richiesta di eliminazione per la task **' . $task->title . '** è stata **rifiutata**.');
            }
        }

        if ($project) {
            $message->line('**Progetto:** ' . $project->name);
        }

        if ($this->request->review_notes) {
            $message->line('**Note del revisore:**')
                ->line($this->request->review_notes);
        }

        $message->action('Vedi Task', url('/freelance/task/' . $task->id))
            ->line('Grazie per aver utilizzato BackClub!');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        $task = $this->request->task;
        $project = $task->project ?? null;

        $title = $this->type === 'reschedule' 
            ? ($this->status === 'approved' 
                ? 'Richiesta Spostamento Approvata'
                : 'Richiesta Spostamento Rifiutata')
            : ($this->status === 'approved' 
                ? 'Richiesta Eliminazione Approvata'
                : 'Richiesta Eliminazione Rifiutata');

        $message = $this->type === 'reschedule' 
            ? ($this->status === 'approved' 
                ? 'La tua richiesta di spostamento per "' . $task->title . '" è stata approvata. Nuova scadenza: ' . \Carbon\Carbon::parse($this->request->requested_due_date)->format('d/m/Y')
                : 'La tua richiesta di spostamento per "' . $task->title . '" è stata rifiutata.')
            : ($this->status === 'approved' 
                ? 'La tua richiesta di eliminazione per "' . $task->title . '" è stata approvata.'
                : 'La tua richiesta di eliminazione per "' . $task->title . '" è stata rifiutata.');

        return [
            'title' => $title,
            'message' => $message,
            'type' => $this->type,
            'status' => $this->status,
            'task_id' => $task->id,
            'task_title' => $task->title,
            'project_id' => $project->id ?? null,
            'project_name' => $project->name ?? null,
            'reviewer_name' => $this->reviewer->name ?? 'Admin',
            'review_notes' => $this->request->review_notes,
            'url' => '/freelance/task/' . $task->id,
        ];
    }
}
