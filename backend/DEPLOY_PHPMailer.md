# 🚀 Guida Caricamento PHPMailer sul Server

## ✅ Stato Locale
PHPMailer è stato installato localmente con successo!

## 📦 File da Caricare sul Server

### 1. **Cartella `vendor/phpmailer/` (IMPORTANTE)**

Devi caricare l'intera cartella `vendor/phpmailer/` sul server.

**Percorso locale:**
```
public_html/backend/vendor/phpmailer/
```

**Percorso sul server:**
```
/home/u589701076/domains/backclub.it/public_html/backend/vendor/phpmailer/
```

**Contenuto da caricare:**
- `vendor/phpmailer/phpmailer/` (intera cartella con tutti i file)

### 2. **File `vendor/autoload.php` (AGGIORNATO)**

Il file `vendor/autoload.php` è stato aggiornato e include PHPMailer.

**Percorso locale:**
```
public_html/backend/vendor/autoload.php
```

**Percorso sul server:**
```
/home/u589701076/domains/backclub.it/public_html/backend/vendor/autoload.php
```

⚠️ **IMPORTANTE**: Sostituisci il file esistente con quello aggiornato.

### 3. **File `composer.json` e `composer.lock` (AGGIORNATI)**

Questi file sono stati aggiornati per includere PHPMailer.

**File da caricare:**
- `public_html/backend/composer.json`
- `public_html/backend/composer.lock`

### 4. **File già creati (verifica che siano presenti)**

Assicurati che questi file siano presenti sul server:

- ✅ `app/Services/MailService.php`
- ✅ `config/phpmailer.php`
- ✅ `resources/views/emails/quotes/preventivo.php`
- ✅ `app/Http/Controllers/QuoteController.php` (aggiornato con metodo `sendEmail`)
- ✅ `routes/api.php` (aggiornato con route email)

## 📋 Checklist Caricamento

### Opzione A: Caricamento Manuale (FTP/SFTP)

1. **Carica la cartella PHPMailer:**
   ```
   Locale: public_html/backend/vendor/phpmailer/
   Server: /home/u589701076/domains/backclub.it/public_html/backend/vendor/phpmailer/
   ```

2. **Carica/aggiorna autoload.php:**
   ```
   Locale: public_html/backend/vendor/autoload.php
   Server: /home/u589701076/domains/backclub.it/public_html/backend/vendor/autoload.php
   ```

3. **Carica composer.json e composer.lock:**
   ```
   Locale: public_html/backend/composer.json
   Locale: public_html/backend/composer.lock
   Server: /home/u589701076/domains/backclub.it/public_html/backend/
   ```

### Opzione B: Caricamento Completo vendor/ (PIÙ SICURO)

Se preferisci, puoi caricare l'intera cartella `vendor/` aggiornata:

```
Locale: public_html/backend/vendor/
Server: /home/u589701076/domains/backclub.it/public_html/backend/vendor/
```

⚠️ **Attenzione**: Questo sovrascriverà l'intera cartella vendor. Assicurati di avere un backup.

## 🔍 Verifica Post-Caricamento

Dopo il caricamento, verifica che questi file esistano sul server:

```bash
# Verifica PHPMailer
/home/u589701076/domains/backclub.it/public_html/backend/vendor/phpmailer/phpmailer/src/PHPMailer.php

# Verifica autoload
/home/u589701076/domains/backclub.it/public_html/backend/vendor/autoload.php
```

## ⚙️ Configurazione .env sul Server

Assicurati che il file `.env` sul server contenga queste variabili:

```env
# PHPMailer SMTP Configuration (Hostinger)
PHPMAILER_HOST=smtp.hostinger.com
PHPMAILER_PORT=465
PHPMAILER_ENCRYPTION=ssl
PHPMAILER_USERNAME=noreply@backclub.it
PHPMAILER_PASSWORD=^PCmFea2@K
PHPMAILER_FROM_ADDRESS=noreply@backclub.it
PHPMAILER_FROM_NAME=BackClub CRM
PHPMAILER_REPLY_TO_ADDRESS=support@backclub.it
PHPMAILER_REPLY_TO_NAME=Support Team
PHPMAILER_DEBUG=false
```

## 🧪 Test

Dopo il caricamento, testa l'invio email:

1. Accedi al sistema
2. Vai a un preventivo
3. Clicca su "Invia via email"
4. Verifica che l'email venga inviata correttamente

## ❌ Risoluzione Errori

### Errore: "Class PHPMailer\PHPMailer\PHPMailer not found"

**Causa**: PHPMailer non è stato caricato correttamente sul server.

**Soluzione**:
1. Verifica che `vendor/phpmailer/phpmailer/src/PHPMailer.php` esista sul server
2. Verifica che `vendor/autoload.php` sia aggiornato
3. Pulisci la cache Laravel: `php artisan config:clear`

### Errore: "SMTP connect() failed"

**Causa**: Credenziali SMTP errate o porta bloccata.

**Soluzione**:
1. Verifica le credenziali nel file `.env`
2. Verifica che la porta 465 non sia bloccata dal firewall
3. Abilita debug temporaneamente: `PHPMAILER_DEBUG=true`

## 📁 Struttura Finale sul Server

Dopo il caricamento, la struttura dovrebbe essere:

```
/home/u589701076/domains/backclub.it/public_html/backend/
├── vendor/
│   ├── autoload.php                    ← AGGIORNATO
│   ├── phpmailer/
│   │   └── phpmailer/
│   │       ├── src/
│   │       │   ├── PHPMailer.php      ← NUOVO
│   │       │   ├── SMTP.php            ← NUOVO
│   │       │   └── Exception.php       ← NUOVO
│   │       └── ...
│   └── ...
├── app/
│   └── Services/
│       └── MailService.php            ← GIÀ PRESENTE
├── config/
│   └── phpmailer.php                  ← GIÀ PRESENTE
├── resources/
│   └── views/
│       └── emails/
│           └── quotes/
│               └── preventivo.php      ← GIÀ PRESENTE
└── composer.json                       ← AGGIORNATO
```

## ✅ Comando Rapido per Verifica

Dopo il caricamento, puoi verificare che PHPMailer sia caricato correttamente creando un file di test temporaneo:

```php
<?php
// test-phpmailer.php (da eliminare dopo il test)
require __DIR__ . '/vendor/autoload.php';

if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    echo "✅ PHPMailer caricato correttamente!";
} else {
    echo "❌ PHPMailer NON trovato!";
}
```

Visita: `https://backclub.it/backend/test-phpmailer.php`

**⚠️ RICORDA**: Elimina il file di test dopo la verifica per motivi di sicurezza!

