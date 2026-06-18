# ⚠️ Installazione Manuale DomPDF (Solo se Composer non è disponibile)

## Perché l'approccio "solo dompdf" NON funziona

Il codice Laravel usa `\Barryvdh\DomPDF\Facade\Pdf` che è parte del pacchetto **`barryvdh/laravel-dompdf`**, non solo `dompdf/dompdf`.

Il pacchetto `barryvdh/laravel-dompdf` include:
- Service Provider per Laravel
- Facade per uso semplificato
- Configurazione Laravel
- Integrazione con il sistema di view Blade

**Installare solo `dompdf/dompdf` NON funzionerà** perché mancano le integrazioni Laravel.

## Soluzione Consigliata: Contattare il Supporto Hosting

**La soluzione migliore è contattare il supporto del tuo hosting provider** e chiedere di eseguire:

```bash
cd /home/u589701076/domains/backclub.it/public_html/backend
composer require barryvdh/laravel-dompdf
```

Oppure, se il `composer.json` è già aggiornato:

```bash
cd /home/u589701076/domains/backclub.it/public_html/backend
composer install
```

## Installazione Manuale Completa (SOLO se assolutamente necessario)

Se **NON** puoi usare Composer e **NON** puoi contattare il supporto, puoi provare a caricare manualmente il pacchetto completo. **Questo è complesso e fragile.**

### Passo 1: Scarica il pacchetto completo

1. Vai su: https://github.com/barryvdh/laravel-dompdf/releases
2. Scarica l'ultima versione (es. `v3.0.0.zip`)
3. Estrai il file ZIP

### Passo 2: Carica nella cartella vendor

1. Carica la cartella `barryvdh/laravel-dompdf` nella directory:
   ```
   public_html/backend/vendor/barryvdh/laravel-dompdf/
   ```

2. La struttura deve essere:
   ```
   public_html/backend/vendor/barryvdh/laravel-dompdf/
   ├── src/
   ├── config/
   ├── composer.json
   └── ...
   ```

### Passo 3: Registra il Service Provider

Aggiungi manualmente il service provider in `bootstrap/providers.php`:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    Barryvdh\DomPDF\ServiceProvider::class, // Aggiungi questa riga
];
```

### Passo 4: Registra la Facade (opzionale)

Se vuoi usare la Facade, aggiungi in `config/app.php` (se esiste) o crea un alias manualmente.

### Passo 5: Aggiorna l'autoload

Esegui (se possibile):
```bash
composer dump-autoload
```

Oppure modifica manualmente `vendor/composer/autoload_psr4.php` aggiungendo:
```php
'Barryvdh\\DomPDF\\' => array($baseDir . '/barryvdh/laravel-dompdf/src'),
```

## ⚠️ PROBLEMI CON L'INSTALLAZIONE MANUALE

1. **Dipendenze mancanti**: Il pacchetto ha altre dipendenze (dompdf/dompdf, phenx/php-font-lib, ecc.) che devono essere installate
2. **Autoload complesso**: Devi modificare manualmente i file di autoload di Composer
3. **Aggiornamenti difficili**: Ogni aggiornamento richiederà di rifare tutto manualmente
4. **Compatibilità**: Potrebbero esserci problemi di compatibilità con le versioni

## ✅ RACCOMANDAZIONE FINALE

**Contatta il supporto hosting** e chiedi di eseguire Composer. È la soluzione più semplice, sicura e mantenibile.

Se il supporto non può aiutare, considera:
- Cambiare hosting provider che supporta Composer
- Usare un servizio di deployment che esegue Composer automaticamente
- Configurare un CI/CD che esegue Composer prima del deploy

