<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentriApiLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'rentri_configuration_id',
        'correlation_id',
        'method',
        'endpoint',
        'request_headers',
        'request_body',
        'response_status',
        'response_headers',
        'response_body',
        'duration_ms',
        'error_message',
        'rentri_transazione_id',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'request_headers' => 'array',
        'response_headers' => 'array',
        'created_at' => 'datetime',
    ];

    public function configuration(): BelongsTo
    {
        return $this->belongsTo(RentriConfiguration::class, 'rentri_configuration_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
