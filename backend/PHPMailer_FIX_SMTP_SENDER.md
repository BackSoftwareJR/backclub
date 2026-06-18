# 🔧 Fix: SMTP Sender Address Error

## Problema
```
SMTP Error: The following recipients failed: 
Sender address rejected: not owned by user noreply@backclub.it
```

## Causa
Hostinger SMTP richiede che l'indirizzo "From" corrisponda esattamente all'username SMTP autenticato.

**Configurazione attuale:**
- Username SMTP: `noreply@backclub.it`
- From address: potrebbe essere `info@backclub.it` (da MAIL_FROM_ADDRESS)

## Soluzione Implementata

Il codice è stato aggiornato per gestire automaticamente questo problema:

1. **Verifica corrispondenza**: Se `From address` ≠ `SMTP Username`, usa automaticamente `SMTP Username` come `From`
2. **Reply-To**: Se l'indirizzo originale è diverso, lo imposta come `Reply-To` invece
3. **Fallback intelligente**: Il sistema ora usa `PHPMAILER_USERNAME` come default per `PHPMAILER_FROM_ADDRESS`

## Configurazione .env Consigliata

Assicurati che il tuo `.env` sul server abbia:

```env
# SMTP Credentials
PHPMAILER_USERNAME=noreply@backclub.it
PHPMAILER_PASSWORD=^PCmFea2@K

# From Address - DEVE corrispondere a PHPMAILER_USERNAME
PHPMAILER_FROM_ADDRESS=noreply@backclub.it
PHPMAILER_FROM_NAME=BackClub CRM

# Reply-To (opzionale, per risposte)
PHPMAILER_REPLY_TO_ADDRESS=info@backclub.it
PHPMAILER_REPLY_TO_NAME=Support Team
```

## Come Funziona Ora

### Scenario 1: From = Username (✅ Corretto)
```env
PHPMAILER_USERNAME=noreply@backclub.it
PHPMAILER_FROM_ADDRESS=noreply@backclub.it
```
**Risultato**: Email inviata con `From: noreply@backclub.it`

### Scenario 2: From ≠ Username (✅ Gestito automaticamente)
```env
PHPMAILER_USERNAME=noreply@backclub.it
PHPMAILER_FROM_ADDRESS=info@backclub.it
```
**Risultato**: 
- Email inviata con `From: noreply@backclub.it` (usa username)
- `Reply-To: info@backclub.it` (indirizzo originale)

## Test

Dopo aver aggiornato il file `MailService.php` sul server, prova a inviare un'email. L'errore dovrebbe essere risolto.

## File Aggiornati

- ✅ `app/Services/MailService.php` - Gestione automatica From/Reply-To
- ✅ `config/phpmailer.php` - Default migliorato per From address

## Nota Importante

Se vuoi che le email appaiano come inviate da `info@backclub.it`:
1. Crea un account email `info@backclub.it` su Hostinger
2. Usa le credenziali di quell'account per `PHPMAILER_USERNAME` e `PHPMAILER_PASSWORD`
3. Imposta `PHPMAILER_FROM_ADDRESS=info@backclub.it`

Altrimenti, usa `noreply@backclub.it` per tutto (consigliato per email automatiche).

