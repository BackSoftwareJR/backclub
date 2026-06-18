<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentriFirBlock extends Model
{
    protected $fillable = [
        'rentri_configuration_id',
        'codice_blocco',
        'num_iscr_sito',
        'stato',
        'fir_disponibili',
        'fir_utilizzati',
        'raw_data',
        'synced_at',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'synced_at' => 'datetime',
    ];

    public function configuration(): BelongsTo
    {
        return $this->belongsTo(RentriConfiguration::class, 'rentri_configuration_id');
    }

    public function firs(): HasMany
    {
        return $this->hasMany(RentriFir::class);
    }

    public function hasAvailableFir(): bool
    {
        return $this->fir_disponibili > $this->fir_utilizzati;
    }
}
