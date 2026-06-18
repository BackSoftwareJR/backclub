<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CerCode extends Model
{
    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'description',
        'is_pericoloso',
        'categoria',
        'is_active',
        'synced_at',
    ];

    protected $casts = [
        'is_pericoloso' => 'boolean',
        'is_active' => 'boolean',
        'synced_at' => 'datetime',
    ];

    public function firs(): HasMany
    {
        return $this->hasMany(RentriFir::class, 'cer_code', 'code');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopePericolosi($query)
    {
        return $query->where('is_pericoloso', true);
    }
}
