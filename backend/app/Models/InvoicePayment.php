<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoicePayment extends Model
{
    use HasFactory;

    protected $table = 'invoice_payments';

    protected $fillable = [
        'invoice_id',
        'installment_id',
        'amount_cocchi',
        'payment_date',
        'payment_method',
        'payment_reference',
        'notes',
        'document_path',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_cocchi' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function installment()
    {
        return $this->belongsTo(InvoiceInstallment::class, 'installment_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

