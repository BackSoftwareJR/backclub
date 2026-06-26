<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\HasDatabaseNotifications;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasDatabaseNotifications;

    protected $connection = 'mysql';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'phone',
        'department',
        'is_active',
        'current_crm_department_id',
        'onboarding_completed',
        'preferred_language',
        'preferred_theme',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function privacyConsent()
    {
        return $this->hasOne(PrivacyConsent::class);
    }

    protected $appends = ['has_consented', 'consent_agreed_at', 'seller_id'];

    public function getHasConsentedAttribute()
    {
        return $this->privacyConsent()->exists();
    }

    public function getConsentAgreedAtAttribute()
    {
        return $this->privacyConsent?->agreed_at;
    }

    // CRM Budget relationships
    public function crmMemberships()
    {
        return $this->hasMany(\App\Models\CrmTeamMember::class);
    }

    public function activeCrmMemberships()
    {
        return $this->hasMany(\App\Models\CrmTeamMember::class)->where('is_active', true);
    }

    public function crmAllocations()
    {
        return $this->hasMany(\App\Models\UserCrmAllocation::class);
    }

    public function managedDepartments()
    {
        return $this->hasMany(\App\Models\CrmDepartment::class, 'manager_id');
    }

    // Expense relationships
    public function expensesAsTeamMember()
    {
        return $this->hasMany(\App\Models\UscitaCocchi::class, 'team_member_id');
    }

    public function expensesCreated()
    {
        return $this->hasMany(\App\Models\UscitaCocchi::class, 'created_by');
    }

    public function expensesPaid()
    {
        return $this->hasMany(\App\Models\UscitaCocchi::class, 'paid_by');
    }

    public function reimbursementRequests()
    {
        return $this->hasMany(\App\Models\ExpenseReimbursementRequest::class, 'user_id');
    }

    public function reimbursementsReviewed()
    {
        return $this->hasMany(\App\Models\ExpenseReimbursementRequest::class, 'reviewed_by');
    }

    public function reimbursementsPaid()
    {
        return $this->hasMany(\App\Models\ExpenseReimbursementRequest::class, 'paid_by');
    }

    public function projects()
    {
        return $this->belongsToMany(\App\Models\Project::class, 'project_members');
    }

    // User Roles relationship
    public function userRoles()
    {
        return $this->hasMany(\App\Models\UserRole::class);
    }

    public function roles()
    {
        return $this->belongsToMany(
            \App\Models\UserRole::class,
            'user_roles',
            'user_id',
            'id'
        )->withPivot('is_primary');
    }

    // Helper methods
    public function getRolesListAttribute()
    {
        return $this->userRoles()->pluck('role')->toArray();
    }

    public function hasRole($role)
    {
        return $this->userRoles()->where('role', $role)->exists();
    }

    public function getPrimaryRoleAttribute()
    {
        return $this->userRoles()->where('is_primary', true)->first()?->role ?? $this->role;
    }

    // CRM Departments relationship (many-to-many)
    public function crmDepartments()
    {
        return $this->belongsToMany(
            \App\Models\CrmDepartment::class,
            'user_crm_departments',
            'user_id',
            'crm_department_id'
        )->withTimestamps();
    }

    public function currentCrmDepartment()
    {
        return $this->belongsTo(\App\Models\CrmDepartment::class, 'current_crm_department_id');
    }

    public function getCrmDepartmentsListAttribute()
    {
        return $this->crmDepartments()->pluck('crm_departments.id')->toArray();
    }

    /**
     * Relazione con Seller (se l'utente è un venditore)
     */
    public function seller()
    {
        return $this->hasOne(Seller::class, 'user_id');
    }

    /**
     * Verifica se l'utente è un venditore
     */
    public function isSeller(): bool
    {
        return $this->role === 'venditori' || $this->role === 'seller' || $this->seller()->exists();
    }

    /**
     * Get seller_id attribute (for API responses)
     */
    public function getSellerIdAttribute()
    {
        if ($this->seller) {
            return $this->seller->id;
        }
        
        // Try to find seller if user has venditori role
        if ($this->role === 'venditori' || $this->role === 'seller') {
            $seller = \App\Models\Seller::where('user_id', $this->id)->first();
            if ($seller) {
                return $seller->id;
            }
        }
        
        return null;
    }

    public function googleIntegration()
    {
        return $this->hasOne(UserGoogleIntegration::class);
    }

    // Focus module relationships
    public function focusTasks()
    {
        return $this->hasMany(\App\Models\FocusTask::class);
    }

    public function workPattern()
    {
        return $this->hasOne(\App\Models\UserWorkPattern::class);
    }

    public function focusSessions()
    {
        return $this->hasMany(\App\Models\FocusSession::class);
    }

    public function taskMetrics()
    {
        return $this->hasMany(\App\Models\TaskMetric::class);
    }

    public function focusPreference()
    {
        return $this->hasOne(\App\Models\UserFocusPreference::class);
    }
}
