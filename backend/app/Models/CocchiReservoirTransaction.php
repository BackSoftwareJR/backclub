<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CocchiReservoirTransaction extends Model
{
    use HasFactory;

    protected $table = 'cocchi_reservoir_transactions';

    protected $fillable = [
        'reservoir_id',
        'type',
        'amount_cocchi',
        'from_reservoir_id',
        'to_reservoir_id',
        'description',
        'related_type',
        'related_id',
        'balance_before',
        'balance_after',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_cocchi' => 'decimal:2',
            'balance_before' => 'decimal:2',
            'balance_after' => 'decimal:2',
        ];
    }

    public function reservoir()
    {
        return $this->belongsTo(CocchiReservoir::class, 'reservoir_id');
    }

    public function fromReservoir()
    {
        return $this->belongsTo(CocchiReservoir::class, 'from_reservoir_id');
    }

    public function toReservoir()
    {
        return $this->belongsTo(CocchiReservoir::class, 'to_reservoir_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function related()
    {
        return $this->morphTo();
    }
}

