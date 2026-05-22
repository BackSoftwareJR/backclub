<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgendaItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'content',
        'date',
        'time',
        'reminder_datetime',
        'all_day',
        'end_datetime',
        'checklist_items',
        'location',
        'participants',
        'description',
        'status',
        'is_pinned',
        'color',
        'priority',
        'tags',
        'notes',
        'related_client_id',
        'related_project_id',
        'related_invoice_id',
    ];

    protected $casts = [
        'date' => 'date',
        'time' => 'datetime',
        'reminder_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'all_day' => 'boolean',
        'is_pinned' => 'boolean',
        'checklist_items' => 'array',
        'participants' => 'array',
        'tags' => 'array',
        'priority' => 'integer',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function relatedClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'related_client_id');
    }

    public function relatedProject(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'related_project_id');
    }

    public function relatedInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'related_invoice_id');
    }

    // Scopes
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePinned($query)
    {
        return $query->where('is_pinned', true);
    }

    public function scopeForDate($query, $date)
    {
        return $query->where('date', $date);
    }

    public function scopeUpcoming($query)
    {
        return $query->where(function($q) {
            $q->where('reminder_datetime', '>=', now())
              ->orWhere('date', '>=', now()->toDateString());
        });
    }

    public function scopeByPriority($query, $priority = null)
    {
        if ($priority !== null) {
            return $query->where('priority', $priority);
        }
        return $query->orderBy('priority', 'desc');
    }
}
