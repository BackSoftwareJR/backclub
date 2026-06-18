v# PHPMailer Setup Guide

## Step 1: Install PHPMailer Locally

Run this command in your local `backend/` directory:

```bash
cd public_html/backend
composer require phpmailer/phpmailer
```

This will:
- Add PHPMailer to your `composer.json`
- Download PHPMailer to `vendor/phpmailer/phpmailer/`
- Update `vendor/autoload.php`

## Step 2: Configure SMTP Settings

Add these variables to your `.env` file in the `backend/` directory:

```env
# PHPMailer SMTP Configuration (Hostinger - Official Settings)
# Outgoing server (SMTP): smtp.hostinger.com
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

**Official Hostinger SMTP Settings:**
- **Server**: `smtp.hostinger.com`
- **Port**: `465`
- **Encryption**: `SSL`

**Important Notes:**
- These are the official Hostinger SMTP settings - do not change them
- The `PHPMAILER_USERNAME` should be your full email address
- The `PHPMAILER_PASSWORD` is your email account password (not your hosting password)
- Set `PHPMAILER_DEBUG=true` only for testing (it will show verbose SMTP output)

## Step 3: Upload to Server

After running `composer require`, upload the entire `vendor/` folder to your server:

1. **Locally**: The `vendor/` folder will be in `public_html/backend/vendor/`
2. **Upload**: Upload the entire `vendor/` folder to the same location on your server
3. **Verify**: Ensure `vendor/autoload.php` exists on the server

## Step 4: Test Email Sending

### API Endpoint

**POST** `/api/quotes/{id}/send-email`

**Headers:**
```
Authorization: Bearer {your_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "client@example.com",
  "client_name": "Nome Cliente" // Optional, defaults to client company name
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email inviata con successo",
  "data": {
    "quote_id": 123,
    "quote_number": "PREV-2024-001",
    "recipient": "client@example.com"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Errore nell'invio dell'email: [error details]"
}
```

### Example cURL Request

```bash
curl -X POST "https://yourdomain.com/api/quotes/123/send-email" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "client_name": "Mario Rossi"
  }'
```

## Step 5: Frontend Integration

Update your frontend code to call the email endpoint. In `QuoteStep8Finalize.tsx`, replace the TODO comment with:

```typescript
const handleSendEmail = async () => {
  if (!email) {
    alert('Inserisci un indirizzo email');
    return;
  }

  if (!quoteId) {
    await handleCreateQuote();
  }

  try {
    setSending(true);
    const response = await quotesApi.sendEmail(quoteId!, { 
      email,
      client_name: wizardData.client?.company_name || wizardData.client?.name 
    });
    
    if (response.data.success) {
      alert(`Email inviata con successo a ${email}`);
    } else {
      alert('Errore: ' + (response.data.error || 'Errore nell\'invio dell\'email'));
    }
  } catch (error: any) {
    console.error('Errore nell\'invio email:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Errore nell\'invio dell\'email';
    alert('Errore: ' + errorMessage);
  } finally {
    setSending(false);
  }
};
```

And add the `sendEmail` method to your quotes API file:

```typescript
sendEmail: async (quoteId: number, data: { email: string; client_name?: string }) => {
  const response = await api.post(`/quotes/${quoteId}/send-email`, data);
  return response;
}
```

## Troubleshooting

### Error: "PHPMailer library not found"
- Ensure `composer require phpmailer/phpmailer` was run successfully
- Verify `vendor/phpmailer/phpmailer/` exists on the server
- Check that `vendor/autoload.php` is accessible

### Error: "SMTP connect() failed"
- Verify SMTP credentials in `.env` file
- **Use official Hostinger settings**: `smtp.hostinger.com:465` with `SSL`
- Check that port 465 is not blocked by firewall
- Do NOT use port 587 with TLS for Hostinger (use 465 with SSL)
- Enable `PHPMAILER_DEBUG=true` to see detailed error messages

### Error: "Authentication failed"
- Double-check `PHPMAILER_USERNAME` (must be full email address)
- Verify `PHPMAILER_PASSWORD` is correct
- Some email providers require "App Passwords" instead of regular passwords

### Email not received
- Check spam/junk folder
- Verify sender email address is not blocked
- Check server logs: `storage/logs/laravel.log`
- Enable debug mode temporarily to see SMTP conversation

## File Structure

After setup, your files should be organized as:

```
backend/
├── app/
│   └── Services/
│       └── MailService.php          # PHPMailer wrapper service
├── config/
│   └── phpmailer.php                # SMTP configuration
├── resources/
│   └── views/
│       └── emails/
│           └── quotes/
│               └── preventivo.php    # Apple-style email template
├── vendor/
│   ├── autoload.php                 # Composer autoloader
│   └── phpmailer/
│       └── phpmailer/               # PHPMailer library
└── .env                             # Environment variables
```

## Security Notes

- **Never commit `.env` file** to version control
- Store email passwords securely
- Use environment variables for all sensitive data
- Consider using App Passwords for Gmail/Google Workspace accounts
- Regularly rotate email passwords

