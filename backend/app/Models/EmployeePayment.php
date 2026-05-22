<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeePayment extends Model
{
    use HasFactory;

    protected $table = 'employee_payments';

    protected $fillable = [
        'user_id',
        'type',
        'amount_cocchi',
        'payment_date',
        'period_start',
        'period_end',
        'description',
        'reservoir_id',
        'payment_method',
        'payment_reference',
        'document_path',
        'status',
        'paid_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_cocchi' => 'decimal:2',
            'payment_date' => 'date',
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reservoir()
    {
        return $this->belongsTo(CocchiReservoir::class, 'reservoir_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

