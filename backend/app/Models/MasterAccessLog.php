<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterAccessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'master_user_id',
        'target_user_id',
        'target_role',
        'action',
        'actions_performed',
        'reason',
        'ip_address',
        'user_agent',
        'started_at',
        'ended_at',
        'duration_seconds',
    ];

    protected $casts = [
        'actions_performed' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relazione: Admin che impersona
     */
    public function masterUser()
    {
        return $this->belongsTo(User::class, 'master_user_id');
    }

    /**
     * Relazione: Utente impersonato
     */
    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Scope: Accessi attivi (non ancora terminati)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('ended_at');
    }

    /**
     * Crea log accesso master
     */
    public static function start(User $masterUser, User $targetUser, string $targetRole, string $reason): self
    {
        return self::create([
            'master_user_id' => $masterUser->id,
            'target_user_id' => $targetUser->id,
            'target_role' => $targetRole,
            'reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'started_at' => now(),
        ]);
    }

    /**
     * Termina sessione master
     */
    public function end(): void
    {
        $this->ended_at = now();
        $this->duration_seconds = $this->started_at->diffInSeconds($this->ended_at);
        $this->save();
    }

    /**
     * Aggiungi azione eseguita
     */
    public function addAction(string $action, array $details = []): void
    {
        $actions = $this->actions_performed ?? [];
        
        $actions[] = [
            'action' => $action,
            'details' => $details,
            'timestamp' => now()->toDateTimeString(),
        ];

        $this->actions_performed = $actions;
        
        // Aggiorna anche il campo action (ultima azione)
        if (!$this->action) {
            $this->action = $action;
        }
        
        $this->save();
    }

    /**
     * Verifica se sessione è attiva
     */
    public function isActive(): bool
    {
        return $this->ended_at === null;
    }

    /**
     * Ottieni durata in formato human
     */
    public function getDurationHuman(): string
    {
        if (!$this->ended_at) {
            return $this->started_at->diffForHumans();
        }

        $seconds = $this->duration_seconds;
        $minutes = floor($seconds / 60);
        $hours = floor($minutes / 60);

        if ($hours > 0) {
            return $hours . 'h ' . ($minutes % 60) . 'm';
        }
        if ($minutes > 0) {
            return $minutes . 'm ' . ($seconds % 60) . 's';
        }
        return $seconds . 's';
    }
}

