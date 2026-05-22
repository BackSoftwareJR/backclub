<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'amount_cocchi',
        'description',
        'category',
        'project_id',
        'client_id',
        'user_id',
        'transaction_date',
        'reference_number',
        'document_path',
    ];

    protected function casts(): array
    {
        return [
            'amount_cocchi' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

