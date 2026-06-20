<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notifica in-app quando un agente N8N completa, fallisce o entra in review.
 * Inviata al creatore del task e agli utenti assegnati.
 */
class AgentTaskCompleted extends Notification
{
    use Queueable;

    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED    = 'failed';
    public const STATUS_REVIEW    = 'review';

    public function __construct(
        public readonly int    $taskId,
        public readonly string $taskTitle,
        public readonly int    $projectId,
        public readonly string $projectName,
        public readonly string $agentStatus,  // completed | failed | review
        public readonly ?string $errorMessage = null,
        public readonly ?int   $workspaceAgentId = null,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        [$title, $message, $type] = match ($this->agentStatus) {
            self::STATUS_COMPLETED => [
                '✅ Agente completato',
                "Il task \"{$this->taskTitle}\" è stato completato dall'agente AI.",
                'agent_completed',
            ],
            self::STATUS_FAILED => [
                '❌ Agente fallito',
                "Il task \"{$this->taskTitle}\" ha incontrato un errore: " . ($this->errorMessage ?? 'errore sconosciuto'),
                'agent_failed',
            ],
            self::STATUS_REVIEW => [
                '👁 Revisione richiesta',
                "Il task \"{$this->taskTitle}\" è pronto per la revisione umana.",
                'agent_review',
            ],
            default => [
                'Agente aggiornato',
                "Il task \"{$this->taskTitle}\" ha ricevuto un aggiornamento dall'agente AI.",
                'agent_update',
            ],
        };

        $url = '/freelance/task/' . $this->taskId . '?projectId=' . $this->projectId;
        if ($this->workspaceAgentId) {
            $url = '/workspace/developer/progetti/' . $this->projectId . '/lavorazioni/' . $this->workspaceAgentId;
        }

        return [
            'title'              => $title,
            'message'            => $message,
            'type'               => $type,
            'task_id'            => $this->taskId,
            'task_title'         => $this->taskTitle,
            'project_id'         => $this->projectId,
            'project_name'       => $this->projectName,
            'agent_status'       => $this->agentStatus,
            'workspace_agent_id' => $this->workspaceAgentId,
            'url'                => $url,
        ];
    }
}
