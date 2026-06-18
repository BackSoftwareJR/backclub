<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutodemolizioneVehicle extends Model
{
    protected $fillable = [
        'rentri_configuration_id',
        'client_id',
        'targa',
        'vin',
        'marca',
        'modello',
        'anno_immatricolazione',
        'data_ingresso',
        'data_demolizione',
        'peso_kg',
        'cer_code_default',
        'stato',
        'notes',
        'rentri_fir_id',
        'created_by',
    ];

    protected $casts = [
        'data_ingresso' => 'date',
        'data_demolizione' => 'date',
        'peso_kg' => 'decimal:2',
        'anno_immatricolazione' => 'integer',
    ];

    public function configuration(): BelongsTo
    {
        return $this->belongsTo(RentriConfiguration::class, 'rentri_configuration_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function fir(): BelongsTo
    {
        return $this->belongsTo(RentriFir::class, 'rentri_fir_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeByStato($query, string $stato)
    {
        return $query->where('stato', $stato);
    }
}
