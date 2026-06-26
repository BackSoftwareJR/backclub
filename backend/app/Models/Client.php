<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Client extends Model
{
    protected $connection = 'mysql';

    protected $fillable = [
        'seller_id',
        'company_name',
        'contact_person',
        'referente_nome',
        'referente_cognome',
        'referente_telefono',
        'referente_email',
        'partita_iva',
        'ragione_sociale',
        'visura_camerale_url',
        'visura_camerale_reminder',
        'visura_uploaded_at',
        'iban',
        'swift',
        'sdi_code',
        'pec',
        'sito_web',
        'drive_link_foto',
        'drive_link_video',
        'drive_link_materiali',
        'facebook_profile',
        'google_ads_account',
        'google_my_business',
        'privacy_sheet_url',
        'carta_servizi_url',
        'carta_identita_url',
        'codice_fiscale',
        'vat_number',
        'tax_code',
        'address',
        'phone',
        'email',
        'payment_terms',
        'credit_limit_cocchi',
        'notes',
        'access_enabled',
        'access_password',
        'is_active'
    ];

    protected $casts = [
        'access_enabled' => 'boolean',
        'visura_camerale_reminder' => 'boolean',
        'is_active' => 'boolean',
        'visura_uploaded_at' => 'datetime',
        'credit_limit_cocchi' => 'decimal:2',
    ];

    protected $appends = ['name'];

    /**
     * Get name attribute as alias for company_name
     * For backward compatibility
     */
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->company_name,
        );
    }

    /**
     * Relationships
     */
    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function activeProjects()
    {
        return $this->hasMany(Project::class)->whereIn('status', ['planning', 'active']);
    }

    public function crmProjects()
    {
        return $this->hasMany(CrmProject::class);
    }

    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function leadsConverted()
    {
        return $this->hasMany(Lead::class, 'converted_to_client_id');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithAccessEnabled($query)
    {
        return $query->where('access_enabled', true);
    }
}
