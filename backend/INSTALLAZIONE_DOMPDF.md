# Installazione DomPDF per Generazione PDF Preventivi

Per abilitare la generazione PDF dei preventivi, è necessario installare la libreria DomPDF tramite Composer.

## ⚠️ IMPORTANTE: Installazione sul Server

**DomPDF deve essere installato sul server di produzione**. Il file `composer.json` è già stato aggiornato con DomPDF. Ora devi eseguire `composer install` o `composer update` sul server.

### ❌ PERCHÉ NON INSTALLARE SOLO "dompdf/dompdf"

**NON installare solo `dompdf/dompdf` manualmente!** Il codice Laravel usa `\Barryvdh\DomPDF\Facade\Pdf` che fa parte del pacchetto completo **`barryvdh/laravel-dompdf`**, che include:
- Service Provider per Laravel
- Facade per uso semplificato  
- Configurazione e integrazione con Blade

Installare solo `dompdf/dompdf` **NON funzionerà** perché mancano le integrazioni Laravel necessarie.

## Installazione sul Server (Senza SSH)

### ✅ METODO CONSIGLIATO: Pannello di Controllo Hosting

La maggior parte degli hosting provider (Hostinger, cPanel, Plesk, ecc.) offre un'interfaccia per eseguire Composer:

#### Hostinger / hPanel:
1. **Accedi al pannello di controllo Hostinger**
2. Vai su **"File Manager"** o **"Gestione File"**
3. Cerca l'opzione **"Terminale"**, **"SSH"**, o **"Composer"**
4. Se c'è un terminale integrato:
   ```bash
   cd public_html/backend
   composer install
   ```
   oppure
   ```bash
   cd public_html/backend
   composer update
   ```

#### cPanel:
1. Accedi a **cPanel**
2. Vai su **"Terminal"** o **"SSH Access"**
3. Oppure cerca **"Composer"** nelle applicazioni
4. Esegui:
   ```bash
   cd public_html/backend
   composer install
   ```

#### Plesk:
1. Accedi a **Plesk**
2. Vai su **"File Manager"**
3. Cerca **"Composer"** o **"Terminal"**
4. Esegui i comandi sopra

### Opzione Alternativa: Chiedi al Supporto Hosting

Se non trovi un modo per eseguire Composer:
1. Contatta il supporto del tuo hosting provider
2. Chiedi di eseguire questo comando nella directory `public_html/backend`:
   ```bash
   composer install
   ```
3. Oppure chiedi di installare DomPDF:
   ```bash
   composer require barryvdh/laravel-dompdf
   ```

### Opzione 3: Carica composer.json e esegui via File Manager

1. **Carica il file `composer.json` aggiornato** sul server (nella directory `public_html/backend/`)
2. Se il tuo hosting ha un'interfaccia per eseguire Composer:
   - Cerca "Composer" nel file manager
   - Seleziona la directory `backend`
   - Esegui "Install" o "Update"
3. Se non c'è un'interfaccia, contatta il supporto

### Opzione 4: Via SSH (se disponibile in futuro)

Se in futuro avrai accesso SSH:
```bash
cd /home/u589701076/domains/backclub.it/public_html/backend
composer install
```

## Pubblicazione Configurazione (Opzionale)

Se vuoi personalizzare le impostazioni di DomPDF:

```bash
php artisan vendor:publish --provider="Barryvdh\DomPDF\ServiceProvider"
```

## Verifica Installazione

Dopo l'installazione, verifica che DomPDF sia installato:

```bash
composer show barryvdh/laravel-dompdf
```

Dovresti vedere informazioni sulla versione installata.

## Test Generazione PDF

Dopo l'installazione:
1. Vai su `https://backclub.it/venditori/preventivi`
2. Clicca su un preventivo esistente
3. Clicca su "Scarica PDF"
4. Il PDF dovrebbe essere generato e scaricato correttamente

## Cosa fa il Sistema

Dopo l'installazione, il sistema:
1. Genera il PDF usando il template `resources/views/quotes/pdf.blade.php`
2. Salva il PDF nello storage (`storage/app/public/quotes/`)
3. Restituisce il PDF come download al browser

## Fallback

Se DomPDF non è installato, il sistema restituirà comunque la view HTML del preventivo, che può essere stampata dal browser. Tuttavia, per un'esperienza ottimale, è consigliabile installare DomPDF.

## Risoluzione Problemi

### Errore: "composer: command not found"
- Assicurati che Composer sia installato sul server
- Contatta il supporto hosting se necessario

### Errore: "Class 'Barryvdh\DomPDF\Facade\Pdf' not found"
- Verifica che l'installazione sia andata a buon fine: `composer show barryvdh/laravel-dompdf`
- Esegui: `composer dump-autoload`
- Verifica che il file `vendor/autoload.php` esista

### Il PDF non si scarica
- Verifica i permessi della directory `storage/app/public/quotes/`
- Esegui: `php artisan storage:link` (se necessario)

