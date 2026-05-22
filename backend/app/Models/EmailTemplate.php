<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'subject',
        'body_html',
        'body_text',
        'variables',
        'category',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Replace variables in template with actual values
     */
    public function render(array $data): array
    {
        $subject = $this->subject;
        $bodyHtml = $this->body_html;
        $bodyText = $this->body_text ?? strip_tags($bodyHtml);

        foreach ($data as $key => $value) {
            $placeholder = '{' . $key . '}';
            $subject = str_replace($placeholder, $value, $subject);
            $bodyHtml = str_replace($placeholder, $value, $bodyHtml);
            $bodyText = str_replace($placeholder, $value, $bodyText);
        }

        return [
            'subject' => $subject,
            'body_html' => $bodyHtml,
            'body_text' => $bodyText,
        ];
    }
}

