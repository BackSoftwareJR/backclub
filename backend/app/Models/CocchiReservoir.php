<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CocchiReservoir extends Model
{
    use HasFactory;

    protected $table = 'cocchi_reservoirs';

    protected $fillable = [
        'name',
        'type',
        'project_id',
        'initial_balance_cocchi',
        'current_balance_cocchi',
        'description',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'initial_balance_cocchi' => 'decimal:2',
            'current_balance_cocchi' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transactions()
    {
        return $this->hasMany(CocchiReservoirTransaction::class, 'reservoir_id');
    }

    /**
     * Versa cocchi nel serbatoio
     */
    public function deposit(float $amount, string $description = null, int $createdBy = null, $relatedType = null, $relatedId = null): CocchiReservoirTransaction
    {
        $balanceBefore = $this->current_balance_cocchi;
        $this->increment('current_balance_cocchi', $amount);
        $balanceAfter = $this->current_balance_cocchi;

        return $this->transactions()->create([
            'type' => 'deposit',
            'amount_cocchi' => $amount,
            'description' => $description,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'created_by' => $createdBy ?? auth()->id(),
        ]);
    }

    /**
     * Preleva cocchi dal serbatoio
     */
    public function withdraw(float $amount, string $description = null, int $createdBy = null, $relatedType = null, $relatedId = null): CocchiReservoirTransaction
    {
        if ($this->current_balance_cocchi < $amount) {
            throw new \Exception('Saldo insufficiente nel serbatoio');
        }

        $balanceBefore = $this->current_balance_cocchi;
        $this->decrement('current_balance_cocchi', $amount);
        $balanceAfter = $this->current_balance_cocchi;

        return $this->transactions()->create([
            'type' => 'withdrawal',
            'amount_cocchi' => $amount,
            'description' => $description,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'created_by' => $createdBy ?? auth()->id(),
        ]);
    }
}

