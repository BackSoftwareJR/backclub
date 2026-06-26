<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicKeywordSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'organic_project_id',
        'snapshot_date',
        'month',
        'year',
        'raw_keywords',
        'clustered_keywords',
        'primary_cluster',
        'search_intents',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'snapshot_date' => 'date',
        'raw_keywords' => 'array',
        'clustered_keywords' => 'array',
        'primary_cluster' => 'array',
        'search_intents' => 'array',
        'approved_at' => 'datetime',
    ];

    public function organicProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_project_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
