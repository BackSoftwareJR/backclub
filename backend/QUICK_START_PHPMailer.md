# PHPMailer Quick Start Guide

## 🚀 Composer Command

Run this command in your local `backend/` directory:

```bash
cd public_html/backend
composer require phpmailer/phpmailer
```

## 📋 What Was Created

### 1. **MailService.php** (`app/Services/MailService.php`)
   - Reusable PHPMailer wrapper class
   - Handles Hostinger SMTP configuration
   - Provides `sendQuoteEmail()` method for sending quote emails

### 2. **phpmailer.php** (`config/phpmailer.php`)
   - Configuration file for SMTP settings
   - Reads from `.env` file

### 3. **preventivo.php** (`resources/views/emails/quotes/preventivo.php`)
   - Apple-style HTML email template
   - Table-based layout with inline CSS
   - Responsive and email client compatible

### 4. **QuoteController::sendEmail()** Method
   - New endpoint: `POST /api/quotes/{id}/send-email`
   - Handles email sending with error handling

## ⚙️ Configuration

Add to your `.env` file (Official Hostinger SMTP Settings):

```env
# Official Hostinger SMTP Settings:
# Server: smtp.hostinger.com
# Port: 465
# Encryption: SSL
PHPMAILER_HOST=smtp.hostinger.com
PHPMAILER_PORT=465
PHPMAILER_ENCRYPTION=ssl
PHPMAILER_USERNAME=your-email@yourdomain.com
PHPMAILER_PASSWORD=your-email-password
PHPMAILER_FROM_ADDRESS=noreply@yourdomain.com
PHPMAILER_FROM_NAME=BackClub CRM
PHPMAILER_REPLY_TO_ADDRESS=support@yourdomain.com
PHPMAILER_REPLY_TO_NAME=Support Team
PHPMAILER_DEBUG=false
```

## 📤 Usage Example

### Backend (PHP)
```php
use App\Services\MailService;

$mailService = new MailService();
$result = $mailService->sendQuoteEmail(
    'client@example.com',
    'Mario Rossi',
    'PREV-2024-001',
    'https://yourdomain.com/api/quotes/123/pdf'
);

if ($result['success']) {
    // Email sent successfully
} else {
    // Handle error: $result['message']
}
```

### API Endpoint
```bash
POST /api/quotes/{id}/send-email
Content-Type: application/json
Authorization: Bearer {token}

{
  "email": "client@example.com",
  "client_name": "Mario Rossi"
}
```

### Frontend (TypeScript/React)
```typescript
// In your quotes API file
sendEmail: async (quoteId: number, data: { email: string; client_name?: string }) => {
  const response = await api.post(`/quotes/${quoteId}/send-email`, data);
  return response;
}

// Usage
await quotesApi.sendEmail(quoteId, {
  email: 'client@example.com',
  client_name: 'Mario Rossi'
});
```

## 📁 File Structure

```
backend/
├── app/
│   └── Services/
│       └── MailService.php              ← PHPMailer service
├── config/
│   └── phpmailer.php                    ← SMTP configuration
├── resources/
│   └── views/
│       └── emails/
│           └── quotes/
│               └── preventivo.php       ← Email template
├── app/Http/Controllers/
│   └── QuoteController.php              ← Updated with sendEmail()
└── routes/
    └── api.php                          ← Updated with email route
```

## 🔧 Deployment Steps

1. **Local**: Run `composer require phpmailer/phpmailer`
2. **Upload**: Upload entire `vendor/` folder to server
3. **Configure**: Add SMTP settings to `.env` on server
4. **Test**: Use API endpoint to send test email

## ✅ Testing

Test the email sending with:

```bash
curl -X POST "https://yourdomain.com/api/quotes/123/send-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "client_name": "Test Client"}'
```

## 🎨 Email Template Features

- ✅ Apple/Stripe-style design
- ✅ Table-based layout (email client compatible)
- ✅ Inline CSS (no external stylesheets)
- ✅ Responsive design
- ✅ Works in Outlook, Gmail, Apple Mail
- ✅ Clean typography (San Francisco/Helvetica)
- ✅ Prominent CTA button
- ✅ Professional footer

## 📚 Full Documentation

See `PHPMailer_SETUP.md` for detailed setup instructions and troubleshooting.

