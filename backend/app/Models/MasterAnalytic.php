<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterAnalytic extends Model
{
    use HasFactory;

    protected $table = 'master_analytics';

    protected $fillable = [
        'metric_name',
        'metric_value',
        'metric_type',
        'period_type',
        'period_date',
        'project_id',
        'client_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metric_value' => 'decimal:2',
            'period_date' => 'date',
            'metadata' => 'array',
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
}

