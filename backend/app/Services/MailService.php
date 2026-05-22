<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

// Try to use PHPMailer classes, but don't fail if they're not loaded yet
// We'll load them in the constructor if needed

/**
 * MailService - PHPMailer wrapper for sending emails via Hostinger SMTP
 * 
 * This service uses PHPMailer directly (not Laravel Mail) to ensure
 * compatibility when vendor/ folder is uploaded manually to the server.
 */
class MailService
{
    private $mailer;
    private $config;

    /**
     * Initialize MailService with SMTP configuration
     */
    public function __construct()
    {
        // Ensure PHPMailer classes are available
        // Try multiple methods to load PHPMailer
        
        // Method 1: Check if class already exists (Laravel autoloader should handle this)
        if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            // Method 2: Try to load vendor/autoload.php if not already loaded
            $vendorAutoload = __DIR__ . '/../../vendor/autoload.php';
            if (file_exists($vendorAutoload)) {
                // Check if autoload is already included
                if (!defined('COMPOSER_AUTOLOAD_LOADED')) {
                    require_once $vendorAutoload;
                }
            }
            
            // Method 3: If still not loaded, try direct loading
            if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                $phpmailerPath = __DIR__ . '/../../vendor/phpmailer/phpmailer/src';
                $phpmailerFile = $phpmailerPath . '/PHPMailer.php';
                
                if (file_exists($phpmailerFile)) {
                    require_once $phpmailerFile;
                    require_once $phpmailerPath . '/SMTP.php';
                    require_once $phpmailerPath . '/Exception.php';
                } else {
                    // Provide detailed error message
                    $errorMsg = 'PHPMailer library not found. ';
                    $errorMsg .= 'Expected path: ' . $phpmailerFile . '. ';
                    $errorMsg .= 'Please ensure vendor/phpmailer/phpmailer/ is uploaded to the server. ';
                    $errorMsg .= 'Run locally: composer require phpmailer/phpmailer';
                    throw new \Exception($errorMsg);
                }
            }
        }

        // Load config - try Laravel config first, fallback to direct file
        if (function_exists('config')) {
            $this->config = config('phpmailer');
        } else {
            // Fallback: load config directly
            $configPath = __DIR__ . '/../../config/phpmailer.php';
            if (file_exists($configPath)) {
                $this->config = require $configPath;
            } else {
                throw new \Exception('PHPMailer configuration file not found');
            }
        }

        // Initialize PHPMailer
        // Use fully qualified class name to ensure it's found
        $phpmailerClass = 'PHPMailer\PHPMailer\PHPMailer';
        if (!class_exists($phpmailerClass)) {
            throw new \Exception('PHPMailer class still not available after loading attempts. Please ensure vendor/phpmailer/phpmailer/ is uploaded to the server.');
        }
        $this->mailer = new $phpmailerClass(true);

        // Configure SMTP
        $this->configureSMTP();
    }

    /**
     * Configure PHPMailer with Hostinger SMTP settings
     */
    private function configureSMTP()
    {
        try {
            // Server settings
            $this->mailer->isSMTP();
            $this->mailer->Host = $this->config['host'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $this->config['username'];
            $this->mailer->Password = $this->config['password'];
            
            // Map encryption string to PHPMailer constant
            $encryption = strtolower($this->config['encryption']);
            $phpmailerClass = 'PHPMailer\PHPMailer\PHPMailer';
            if ($encryption === 'ssl') {
                $this->mailer->SMTPSecure = $phpmailerClass::ENCRYPTION_SMTPS;
            } elseif ($encryption === 'tls') {
                $this->mailer->SMTPSecure = $phpmailerClass::ENCRYPTION_STARTTLS;
            } else {
                $this->mailer->SMTPSecure = $this->config['encryption'];
            }
            
            $this->mailer->Port = $this->config['port'];
            $this->mailer->CharSet = 'UTF-8';

            // Optional: Enable verbose debug output (disable in production)
            $smtpClass = 'PHPMailer\PHPMailer\SMTP';
            if (isset($this->config['debug']) && $this->config['debug']) {
                $this->mailer->SMTPDebug = $smtpClass::DEBUG_SERVER;
            } else {
                $this->mailer->SMTPDebug = $smtpClass::DEBUG_OFF;
            }

            // From address - MUST match SMTP username for Hostinger
            // Hostinger requires the "From" address to match the authenticated SMTP account
            $fromAddress = $this->config['from']['address'];
            $smtpUsername = $this->config['username'];
            
            // If From address doesn't match SMTP username, use SMTP username as From
            // This prevents "Sender address rejected: not owned by user" error
            if (strtolower($fromAddress) !== strtolower($smtpUsername)) {
                // Use SMTP username as From address
                $this->mailer->setFrom(
                    $smtpUsername,
                    $this->config['from']['name']
                );
                
                // Set original From address as Reply-To if different
                if (!empty($fromAddress) && strtolower($fromAddress) !== strtolower($smtpUsername)) {
                    $this->mailer->addReplyTo(
                        $fromAddress,
                        $this->config['from']['name']
                    );
                }
            } else {
                // From matches username, use it directly
                $this->mailer->setFrom(
                    $fromAddress,
                    $this->config['from']['name']
                );
            }

            // Reply-to (optional) - only if not already set above
            if (isset($this->config['reply_to']['address']) && 
                !empty($this->config['reply_to']['address']) &&
                strtolower($this->config['reply_to']['address']) !== strtolower($smtpUsername)) {
                $this->mailer->addReplyTo(
                    $this->config['reply_to']['address'],
                    $this->config['reply_to']['name'] ?? 'Support Team'
                );
            }

        } catch (\Exception $e) {
            throw new \Exception('Failed to configure SMTP: ' . $e->getMessage());
        }
    }

    /**
     * Send email with HTML template
     * 
     * @param string $to Recipient email address
     * @param string $toName Recipient name (optional)
     * @param string $subject Email subject
     * @param string $htmlBody HTML email body
     * @param string|null $textBody Plain text alternative (optional)
     * @param array $attachments Array of file paths to attach
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendEmail(
        string $to,
        string $toName = '',
        string $subject,
        string $htmlBody,
        ?string $textBody = null,
        array $attachments = []
    ): array {
        try {
            // Reset recipients for each email
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();

            // Set recipient
            $this->mailer->addAddress($to, $toName);

            // Set subject and body
            $this->mailer->isHTML(true);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $htmlBody;
            
            // Set plain text alternative if provided
            if ($textBody !== null) {
                $this->mailer->AltBody = $textBody;
            } else {
                // Auto-generate plain text from HTML (better conversion)
                $plainText = $this->convertHtmlToPlainText($htmlBody);
                $this->mailer->AltBody = $plainText;
            }
            
            // Add important headers to avoid spam
            $this->mailer->addCustomHeader('X-Mailer', 'BackSoftware CRM');
            $this->mailer->addCustomHeader('X-Priority', '3');
            $this->mailer->addCustomHeader('Precedence', 'bulk');
            
            // Set Message-ID for better deliverability
            $this->mailer->MessageID = '<' . time() . '.' . md5($to . $subject) . '@' . parse_url(config('app.url'), PHP_URL_HOST) . '>';

            // Add attachments if any
            foreach ($attachments as $attachment) {
                if (file_exists($attachment)) {
                    $this->mailer->addAttachment($attachment);
                    Log::info('Attachment added to email', ['file' => $attachment]);
                } else {
                    Log::warning('Attachment file not found', ['file' => $attachment]);
                }
            }

            // Log email details before sending
            Log::info('Sending email via PHPMailer', [
                'to' => $to,
                'toName' => $toName,
                'subject' => $subject,
                'from' => $this->mailer->From,
                'fromName' => $this->mailer->FromName,
                'hasAttachments' => !empty($attachments)
            ]);

            // Send email
            $sent = $this->mailer->send();
            
            if (!$sent) {
                $errorInfo = $this->mailer->ErrorInfo ?? 'Errore sconosciuto durante l\'invio';
                Log::error('PHPMailer send() returned false', [
                    'to' => $to,
                    'error' => $errorInfo
                ]);
                throw new \Exception('PHPMailer send() returned false: ' . $errorInfo);
            }

            Log::info('Email sent successfully via PHPMailer', [
                'to' => $to,
                'subject' => $subject
            ]);

            return [
                'success' => true,
                'message' => 'Email inviata con successo'
            ];

        } catch (\Exception $e) {
            $errorInfo = $this->mailer->ErrorInfo ?? $e->getMessage();
            \Log::error('PHPMailer error', [
                'to' => $to,
                'subject' => $subject,
                'error' => $errorInfo,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Errore nell\'invio dell\'email: ' . $errorInfo,
                'error' => $e->getMessage(),
                'error_info' => $errorInfo
            ];
        }
    }

    /**
     * Send quote email with template
     * 
     * @param string $to Recipient email address
     * @param string $clientName Client name
     * @param string $quoteTitle Titolo del preventivo (mostrato in mail e oggetto)
     * @param string $downloadLink URL to download the quote PDF
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendQuoteEmail(
        string $to,
        string $clientName,
        string $quoteTitle,
        string $downloadLink
    ): array {
        // Load email template
        $templatePath = __DIR__ . '/../../resources/views/emails/quotes/preventivo.php';
        
        if (!file_exists($templatePath)) {
            return [
                'success' => false,
                'message' => 'Template email non trovato'
            ];
        }

        // Extract variables for template
        extract([
            'clientName' => $clientName,
            'quoteTitle' => $quoteTitle,
            'downloadLink' => $downloadLink
        ]);

        // Capture template output
        ob_start();
        include $templatePath;
        $htmlBody = ob_get_clean();

        // Generate subject
        $subject = "Il tuo preventivo: " . $quoteTitle;

        // Send email
        return $this->sendEmail($to, $clientName, $subject, $htmlBody);
    }

    /**
     * Send contact email with template
     * 
     * @param string $to Recipient email address
     * @param string $recipientName Recipient name
     * @param string $subject Email subject
     * @param string $body Email body (will be wrapped in template)
     * @param string $senderName Sender name
     * @param array $attachments Array of file paths to attach
     * @return array ['success' => bool, 'message' => string, 'html_body' => string|null]
     */
    public function sendContactEmail(
        string $to,
        string $recipientName,
        string $subject,
        string $body,
        string $senderName = 'BackSoftware',
        array $attachments = []
    ): array {
        try {
            // Load email template
            $templatePath = __DIR__ . '/../../resources/views/emails/leads/contatto.php';
            
            if (!file_exists($templatePath)) {
                Log::error('Contact email template not found', [
                    'template_path' => $templatePath,
                    'to' => $to
                ]);
                return [
                    'success' => false,
                    'message' => 'Template email non trovato: ' . $templatePath
                ];
            }

            // Extract variables for template
            extract([
                'recipientName' => $recipientName,
                'body' => $body,
                'senderName' => $senderName
            ]);

            // Capture template output
            ob_start();
            include $templatePath;
            $htmlBody = ob_get_clean();
            
            // Clean up HTML to avoid spam triggers
            $htmlBody = $this->cleanEmailHtml($htmlBody);

            if (empty($htmlBody)) {
                Log::error('Contact email template produced empty output', [
                    'template_path' => $templatePath,
                    'to' => $to
                ]);
                return [
                    'success' => false,
                    'message' => 'Template email ha prodotto un output vuoto',
                    'html_body' => null
                ];
            }

            // Log email attempt
            Log::info('Attempting to send contact email', [
                'to' => $to,
                'subject' => $subject,
                'has_attachments' => !empty($attachments)
            ]);

            // Send email with attachments
            $result = $this->sendEmail($to, $recipientName, $subject, $htmlBody, null, $attachments);
            
            // Add HTML body to result for saving (IMPORTANT: must be added after sendEmail)
            // Assicurati che html_body contenga l'HTML completo, non il testo semplice
            $result['html_body'] = $htmlBody;
            
            // Log per debug
            Log::info('HTML body generated for email', [
                'to' => $to,
                'html_body_length' => strlen($htmlBody),
                'html_body_preview' => substr($htmlBody, 0, 200),
                'has_html_tags' => strpos($htmlBody, '<html') !== false || strpos($htmlBody, '<!DOCTYPE') !== false
            ]);
            
            if ($result['success']) {
                Log::info('Contact email sent successfully', [
                    'to' => $to,
                    'subject' => $subject
                ]);
            } else {
                Log::error('Contact email failed to send', [
                    'to' => $to,
                    'subject' => $subject,
                    'error' => $result['message'] ?? 'Unknown error'
                ]);
            }
            
            return $result;
        } catch (\Exception $e) {
            Log::error('Exception in sendContactEmail', [
                'to' => $to,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Errore nella preparazione email: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'html_body' => null
            ];
        }
    }

    /**
     * Clean HTML email to avoid spam filters
     * 
     * @param string $html HTML content
     * @return string Cleaned HTML
     */
    private function cleanEmailHtml(string $html): string
    {
        // Remove empty style tags
        $html = preg_replace('/<style[^>]*>\s*<\/style>/i', '', $html);
        
        // Ensure proper encoding
        if (mb_detect_encoding($html, 'UTF-8', true) !== 'UTF-8') {
            $html = mb_convert_encoding($html, 'UTF-8', 'auto');
        }
        
        // Remove suspicious patterns that trigger spam filters
        // (but keep legitimate content)
        
        return $html;
    }

    /**
     * Convert HTML to plain text (better than strip_tags)
     * 
     * @param string $html HTML content
     * @return string Plain text
     */
    private function convertHtmlToPlainText(string $html): string
    {
        // Remove script and style elements
        $html = preg_replace('/<(script|style)[^>]*>.*?<\/\1>/is', '', $html);
        
        // Convert common HTML entities
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Replace common HTML tags with line breaks
        $html = preg_replace('/<br\s*\/?>/i', "\n", $html);
        $html = preg_replace('/<\/p>/i', "\n\n", $html);
        $html = preg_replace('/<\/div>/i', "\n", $html);
        $html = preg_replace('/<\/h[1-6]>/i', "\n\n", $html);
        $html = preg_replace('/<\/li>/i', "\n", $html);
        
        // Remove all remaining HTML tags
        $text = strip_tags($html);
        
        // Clean up whitespace
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        $text = trim($text);
        
        return $text;
    }

    /**
     * Send "task assigned" email using the same PHPMailer SMTP as venditori (leads).
     * Evita errore 535 con Laravel Mail (info@backclub.it) usando PHPMAILER_* config.
     *
     * @param string $to Assignee email
     * @param string $toName Assignee name
     * @param \App\Models\Task $task Task (deve avere relation 'project' caricata)
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendTaskAssignedEmail(string $to, string $toName, $task): array
    {
        $htmlBody = view('emails.tasks.assigned', ['task' => $task])->render();
        $subject = 'Nuova Task Assegnata: ' . $task->title;
        return $this->sendEmail($to, $toName, $subject, $htmlBody);
    }

    /**
     * Send "task completed" email using the same PHPMailer SMTP as venditori.
     *
     * @param string $to Admin/recipient email
     * @param string $toName Recipient name
     * @param \App\Models\Task $task Task (deve avere relation 'project' caricata)
     * @param \App\Models\User $completer User who completed the task
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendTaskCompletedEmail(string $to, string $toName, $task, $completer): array
    {
        $htmlBody = view('emails.tasks.completed', [
            'task' => $task,
            'completer' => $completer,
        ])->render();
        $subject = 'Task Completata: ' . $task->title;
        return $this->sendEmail($to, $toName, $subject, $htmlBody);
    }

    /**
     * Send "CRM task assigned" email via PHPMailer (stessa config venditori).
     * Usato da CrmProjectTaskController invece di Laravel Mail/Notification.
     *
     * @param string $to Assignee email
     * @param string $toName Assignee name
     * @param \App\Models\CrmProjectTask $task CRM task
     * @param \App\Models\CrmProject|null $project CRM project
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendCrmTaskAssignedEmail(string $to, string $toName, $task, $project = null): array
    {
        $htmlBody = view('emails.crm_tasks.assigned', [
            'task' => $task,
            'project' => $project ?? $task->project ?? null,
            'assigneeName' => $toName,
            'subject' => 'Nuovo Task Assegnato: ' . $task->title,
        ])->render();
        $subject = 'Nuovo Task Assegnato: ' . $task->title;
        return $this->sendEmail($to, $toName, $subject, $htmlBody);
    }

    /**
     * Send "task reassigned" email via PHPMailer (stessa config dei venditori).
     * Usato da CrmProjectTaskController::reassign() invece di Laravel Mail/Notification
     * per evitare errore 535 con MAIL_USERNAME (info@backclub.it).
     *
     * @param string $to New assignee email
     * @param string $toName New assignee name
     * @param \App\Models\CrmProjectTask $task CRM task (con due_date aggiornata)
     * @param \App\Models\CrmProject|null $project CRM project
     * @param \App\Models\User|null $assignedBy User who reassigned
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendTaskReassignedEmail(string $to, string $toName, $task, $project = null, $assignedBy = null): array
    {
        $assignedByName = $assignedBy ? $assignedBy->name : 'Admin';
        $htmlBody = view('emails.crm_tasks.reassigned', [
            'task' => $task,
            'project' => $project ?? $task->project ?? null,
            'assigneeName' => $toName,
            'assignedByName' => $assignedByName,
        ])->render();
        $subject = 'Task Riassegnato: ' . $task->title;
        return $this->sendEmail($to, $toName, $subject, $htmlBody);
    }

    /**
     * Get PHPMailer instance (for advanced usage)
     * 
     * @return object PHPMailer instance
     */
    public function getMailer()
    {
        return $this->mailer;
    }
}

