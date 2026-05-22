<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskRescheduleRequest extends Model
{
    protected $guarded = [];

    protected $casts = [
        'requested_date' => 'date',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
