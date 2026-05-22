<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractSignedDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'document_type',
        'document_name',
        'file_path',
        'external_url',
        'signed_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
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

