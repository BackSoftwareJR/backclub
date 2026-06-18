# 📦 Guida: Caricare DomPDF sul Server (Installato Localmente)

DomPDF è stato installato localmente. Ecco quali file caricare sul server.

## 📋 File e Cartelle da Caricare

Carica queste **7 cartelle** nella directory `public_html/backend/vendor/` sul server:

### 1. Pacchetto Principale Laravel
```
vendor/barryvdh/laravel-dompdf/
```
**Cartella completa** - contiene il service provider e la facade Laravel

### 2. Dipendenze DomPDF Core
```
vendor/dompdf/dompdf/
vendor/dompdf/php-font-lib/
vendor/dompdf/php-svg-lib/
```

### 3. Dipendenze Aggiuntive
```
vendor/sabberworm/php-css-parser/
vendor/masterminds/html5/
vendor/thecodingmachine/safe/
```

### 4. File Autoload (IMPORTANTE!)

Devi anche aggiornare questi file nella cartella `vendor/composer/`:
```
vendor/composer/autoload_psr4.php
vendor/composer/autoload_static.php
vendor/composer/autoload_classmap.php
vendor/composer/autoload_real.php
```

**Oppure** carica l'intera cartella `vendor/composer/` se preferisci (ma fai un backup prima!).

## 📝 Istruzioni Step-by-Step

### Passo 1: Prepara i File Localmente

1. Vai nella directory del progetto:
   ```bash
   cd /Users/julianrovera/Downloads/backclub.it/public_html/backend
   ```

2. Le cartelle da caricare sono già presenti in `vendor/`

### Passo 2: Carica sul Server

**Opzione A: Via File Manager (Consigliato)**

1. Accedi al File Manager del tuo hosting
2. Vai in `public_html/backend/vendor/`
3. Carica queste 7 cartelle (mantenendo la struttura):
   - `barryvdh/laravel-dompdf/`
   - `dompdf/dompdf/`
   - `dompdf/php-font-lib/`
   - `dompdf/php-svg-lib/`
   - `sabberworm/php-css-parser/`
   - `masterminds/html5/`
   - `thecodingmachine/safe/`

**Opzione B: Via FTP/SFTP**

1. Connettiti via FTP/SFTP al server
2. Vai in `public_html/backend/vendor/`
3. Carica le 7 cartelle sopra

### Passo 3: Aggiorna l'Autoload

Dopo aver caricato i file, devi aggiornare l'autoload di Composer sul server.

**✅ METODO CONSIGLIATO: Carica i file autoload aggiornati**

I file autoload sono già stati generati localmente e contengono tutte le configurazioni necessarie. Carica questi file dalla tua installazione locale:

```
vendor/composer/autoload_psr4.php
vendor/composer/autoload_static.php
vendor/composer/autoload_classmap.php
vendor/composer/autoload_real.php
```

**Oppure** carica l'intera cartella `vendor/composer/` (ma fai un backup di quella esistente sul server prima!).

**Alternativa: Se hai accesso a un terminale sul server:**
```bash
cd public_html/backend
composer dump-autoload
```

**Alternativa: Aggiornamento Manuale (solo se necessario)**

Se non puoi caricare i file autoload, aggiungi manualmente queste righe in `vendor/composer/autoload_psr4.php` nell'array di ritorno:

```php
'Barryvdh\\DomPDF\\' => array($vendorDir . '/barryvdh/laravel-dompdf/src'),
'Dompdf\\' => array($vendorDir . '/dompdf/dompdf/src'),
'FontLib\\' => array($vendorDir . '/dompdf/php-font-lib/src/FontLib'),
'Svg\\' => array($vendorDir . '/dompdf/php-svg-lib/src/Svg'),
'Sabberworm\\CSS\\' => array($vendorDir . '/sabberworm/php-css-parser/src'),
'Masterminds\\' => array($vendorDir . '/masterminds/html5/src'),
'Safe\\' => array($vendorDir . '/thecodingmachine/safe/lib'),
'Safe\\Exceptions\\' => array($vendorDir . '/thecodingmachine/safe/lib/Exceptions'),
```

### Passo 4: Registra il Service Provider

**IMPORTANTE**: Dopo aver caricato i file, devi registrare il Service Provider di DomPDF.

Apri il file `bootstrap/providers.php` sul server e aggiungi questa riga:

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    Barryvdh\DomPDF\ServiceProvider::class, // Aggiungi questa riga
];
```

**Oppure** carica il file `bootstrap/providers.php` aggiornato dalla tua installazione locale (è già stato aggiornato).

### Passo 5: Verifica l'Installazione

1. Vai su `https://backclub.it/venditori/preventivi`
2. Apri un preventivo
3. Clicca su "Scarica PDF"
4. Dovrebbe funzionare!

## 🔍 Verifica File Caricati

Assicurati che sul server esistano questi file:

```
public_html/backend/vendor/barryvdh/laravel-dompdf/src/ServiceProvider.php
public_html/backend/vendor/barryvdh/laravel-dompdf/src/Facade/Pdf.php
public_html/backend/vendor/dompdf/dompdf/src/Dompdf.php
```

## ⚠️ Note Importanti

1. **Mantieni la struttura delle cartelle**: Le cartelle devono essere esattamente nella stessa posizione relativa
2. **Permessi**: Assicurati che i file abbiano i permessi corretti (di solito 644 per file, 755 per cartelle)
3. **Autoload**: Se `composer dump-autoload` non è disponibile, devi aggiornare manualmente i file autoload (vedi sopra)

## 🆘 Risoluzione Problemi

### Errore: "Class 'Barryvdh\DomPDF\Facade\Pdf' not found"

- Verifica che la cartella `vendor/barryvdh/laravel-dompdf/` esista sul server
- Controlla che `vendor/composer/autoload_psr4.php` contenga la riga per `Barryvdh\\DomPDF\\`

### Errore: "Class 'Dompdf\Dompdf' not found"

- Verifica che la cartella `vendor/dompdf/dompdf/` esista sul server
- Controlla l'autoload per `Dompdf\\`

### Errore: "Target class [dompdf.wrapper] does not exist"

**Questo errore significa che il Service Provider non è registrato!**

1. Apri il file `bootstrap/providers.php` sul server
2. Assicurati che contenga:
   ```php
   <?php
   
   return [
       App\Providers\AppServiceProvider::class,
       Barryvdh\DomPDF\ServiceProvider::class, // Deve essere presente!
   ];
   ```
3. Se manca, aggiungi la riga `Barryvdh\DomPDF\ServiceProvider::class,`
4. Svuota la cache di Laravel (se possibile):
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

### Il PDF non si genera

- Controlla i log Laravel: `storage/logs/laravel.log`
- Verifica i permessi della cartella `storage/app/public/quotes/`

## ✅ Checklist Finale

- [ ] Caricate tutte le 5 cartelle in `vendor/` (barryvdh, dompdf, sabberworm, masterminds, thecodingmachine)
- [ ] Aggiornato i file autoload in `vendor/composer/` (o eseguito `composer dump-autoload`)
- [ ] **Registrato il Service Provider in `bootstrap/providers.php`** ⚠️ IMPORTANTE!
- [ ] Verificato che i file esistano sul server
- [ ] Testato la generazione PDF

