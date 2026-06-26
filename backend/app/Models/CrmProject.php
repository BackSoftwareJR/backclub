<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

// Workspace models
use App\Models\CrmProjectWorkspaceSetting;
use App\Models\WorkspaceBranch;
use App\Models\WorkspaceAgent;
use App\Models\WorkspaceUserTask;

class CrmProject extends Model
{
    use HasFactory;

    protected $connection = 'mysql';

    protected $appends = ['cover_photo_url'];

    protected $fillable = [
        'name',
        'description',
        'client_id',
        'manager_id',
        'seller_id',
        'crm_department_id',
        'status',
        'start_date',
        'end_date',
        'budget_cocchi',
        'spent_cocchi',
        'settings',
        'cover_photo',
        'github_url',
        'website_url',
        // Campi pubblici per il sito BackSoftware
        'is_public',
        'public_slug',
        'public_title',
        'public_subtitle',
        'public_short_description',
        'public_long_description',
        'public_category',
        'public_status_label',
        'public_hero_image_url',
        'public_gallery',
        'public_technologies',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'budget_cocchi' => 'decimal:2',
        'spent_cocchi' => 'decimal:2',
        'settings' => 'array',
        'is_public' => 'boolean',
        'public_gallery' => 'array',
        'public_technologies' => 'array',
    ];

    /**
     * Relazione con Client
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Relazione con User (manager)
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Relazione con Seller
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    /**
     * Relazione con CrmDepartment
     */
    public function crmDepartment(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    /**
     * Relazione con Contracts
     */
    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class, 'crm_project_id');
    }

    /**
     * Relazione con Team Members
     */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(CrmProjectTeamMember::class, 'crm_project_id');
    }

    /**
     * Relazione con Tasks
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(CrmProjectTask::class, 'crm_project_id');
    }

    /**
     * Scope per stato
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope per progetti attivi
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope per venditore
     */
    public function scopeBySeller($query, $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    /**
     * Calcola budget rimanente
     */
    public function getRemainingBudget(): float
    {
        return $this->budget_cocchi - $this->spent_cocchi;
    }

    /**
     * Calcola percentuale budget utilizzata
     */
    public function getBudgetUsagePercentage(): float
    {
        if ($this->budget_cocchi <= 0) {
            return 0;
        }
        return ($this->spent_cocchi / $this->budget_cocchi) * 100;
    }

    /**
     * Restituisce il link alla copertina. In DB salviamo il link completo; se è un path (legacy) costruiamo l’URL.
     */
    public function getCoverPhotoUrlAttribute(): ?string
    {
        if (!$this->cover_photo) {
            return null;
        }
        if (str_starts_with($this->cover_photo, 'http')) {
            $url = $this->cover_photo;
            // Rimuovi /public davanti a /storage (es. .../backend/public/storage/... -> .../backend/storage/...)
            $url = preg_replace('#/public/storage/#', '/storage/', $url);
            // Normalizza legacy: /storage/ -> /storage/app/public/
            if (str_contains($url, '/storage/') && !str_contains($url, '/storage/app/public/')) {
                $url = preg_replace('#/storage/(?!app/public/)#', '/storage/app/public/', $url);
            }
            return $url;
        }
        $request = request();
        $base = $request
            ? rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/')
            : rtrim(config('app.url'), '/');
        // Base per storage: senza /public (il server serve storage da .../backend/storage/app/public/)
        $base = preg_replace('#/public$#', '', $base);
        return $base . '/storage/app/public/' . ltrim($this->cover_photo, '/');
    }

    /**
     * Relazione con Workspace Settings
     */
    public function workspaceSettings(): HasMany
    {
        return $this->hasMany(CrmProjectWorkspaceSetting::class, 'project_id');
    }

    /**
     * Relazione con Workspace Branches
     */
    public function workspaceBranches(): HasMany
    {
        return $this->hasMany(WorkspaceBranch::class, 'project_id');
    }

    /**
     * Relazione con Workspace Agents
     */
    public function workspaceAgents(): HasMany
    {
        return $this->hasMany(WorkspaceAgent::class, 'project_id');
    }

    /**
     * Relazione con Workspace User Tasks
     */
    public function workspaceUserTasks(): HasMany
    {
        return $this->hasMany(WorkspaceUserTask::class, 'project_id');
    }
}

