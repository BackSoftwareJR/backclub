<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentriConfiguration extends Model
{
    protected $fillable = [
        'client_id',
        'codice_fiscale',
        'num_iscr_sito',
        'denominazione',
        'ambiente',
        'is_active',
        'last_health_check_at',
        'last_health_check_status',
        'last_health_check_message',
        'settings',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_health_check_at' => 'datetime',
        'settings' => 'array',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function apiLogs(): HasMany
    {
        return $this->hasMany(RentriApiLog::class);
    }

    public function firBlocks(): HasMany
    {
        return $this->hasMany(RentriFirBlock::class);
    }

    public function firs(): HasMany
    {
        return $this->hasMany(RentriFir::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(AutodemolizioneVehicle::class);
    }

    public function getBaseUrl(): string
    {
        return config("rentri.base_urls.{$this->ambiente}")
            ?? config('rentri.base_urls.demo');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
