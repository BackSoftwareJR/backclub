<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceBranchRole extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'role',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(WorkspaceBranch::class);
    }
}