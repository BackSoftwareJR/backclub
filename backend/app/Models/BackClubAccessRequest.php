<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackClubAccessRequest extends Model
{
    protected $table = 'backclub_access_requests';

    protected $fillable = ['email'];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
