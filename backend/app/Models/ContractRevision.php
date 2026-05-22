<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'revision_number',
        'contract_file',
        'notes',
        'created_by',
    ];

    /**
     * Relazione con Contract
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * Relazione con User (creatore)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

