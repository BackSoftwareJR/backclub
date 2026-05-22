<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SerbatoioComment extends Model
{
    protected $table = 'serbatoio_comments';

    protected $fillable = [
        'serbatoio_id',
        'user_id',
        'comment',
    ];

    protected $appends = [
        'user_name',
        'formatted_date',
    ];

    /**
     * Relazione: Serbatoio
     */
    public function serbatoio()
    {
        return $this->belongsTo(Serbatoio::class, 'serbatoio_id');
    }

    /**
     * Relazione: Utente
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Accessor: Nome utente
     */
    public function getUserNameAttribute()
    {
        return $this->user?->name ?? 'Utente sconosciuto';
    }

    /**
     * Accessor: Data formattata
     */
    public function getFormattedDateAttribute()
    {
        return $this->created_at?->format('d/m/Y H:i') ?? '';
    }
}
