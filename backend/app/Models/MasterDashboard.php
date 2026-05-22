<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterDashboard extends Model
{
    use HasFactory;

    protected $table = 'master_dashboards';

    protected $fillable = [
        'user_id',
        'name',
        'layout_config',
        'widgets',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'layout_config' => 'array',
            'widgets' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

