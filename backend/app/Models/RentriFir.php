<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class RentriFir extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'rentri_configuration_id',
        'rentri_fir_block_id',
        'autodemolizione_vehicle_id',
        'codice_blocco',
        'progressivo',
        'numero_fir',
        'stato',
        'tipo_fir',
        'is_pericoloso',
        'data_emissione',
        'rentri_transazione_id',
        'xml_vidimato',
        'xfir_payload',
        'produttore_num_iscr',
        'trasportatore_num_iscr',
        'destinatario_num_iscr',
        'peso_kg',
        'quantita',
        'unita_misura',
        'cer_code',
        'descrizione_rifiuto',
        'targa_veicolo',
        'vin',
        'raw_vidimazione',
        'raw_trasmissione',
        'raw_validazione',
        'created_by',
    ];

    protected $casts = [
        'is_pericoloso' => 'boolean',
        'data_emissione' => 'date',
        'peso_kg' => 'decimal:3',
        'quantita' => 'decimal:3',
        'raw_vidimazione' => 'array',
        'raw_trasmissione' => 'array',
        'raw_validazione' => 'array',
    ];

    public function configuration(): BelongsTo
    {
        return $this->belongsTo(RentriConfiguration::class, 'rentri_configuration_id');
    }

    public function firBlock(): BelongsTo
    {
        return $this->belongsTo(RentriFirBlock::class, 'rentri_fir_block_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(AutodemolizioneVehicle::class, 'autodemolizione_vehicle_id');
    }

    public function cerCode(): BelongsTo
    {
        return $this->belongsTo(CerCode::class, 'cer_code', 'code');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function linkedVehicle(): HasOne
    {
        return $this->hasOne(AutodemolizioneVehicle::class, 'rentri_fir_id');
    }

    public function isEditable(): bool
    {
        return in_array($this->stato, ['bozza', 'vidimazione_in_corso'], true);
    }

    public function requiresXfir(): bool
    {
        return $this->is_pericoloso || $this->tipo_fir === 'digitale';
    }
}
