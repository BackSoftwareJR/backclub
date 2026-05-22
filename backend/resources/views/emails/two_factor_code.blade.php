<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codice di Verifica</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f7;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #667eea;
            font-size: 28px;
            margin: 0;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .code-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code-label {
            color: #ffffff;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #ffffff;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .expiry {
            color: rgba(255,255,255,0.9);
            font-size: 13px;
            margin-top: 15px;
        }
        .instructions {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e7;
            font-size: 13px;
            color: #666;
        }
        /* iOS Autocomplete Format */
        .ios-code {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 Back Club</h1>
        </div>

        <div class="greeting">
            Ciao <strong>{{ $userName }}</strong>,
        </div>

        <p>Abbiamo ricevuto una richiesta di accesso al tuo account. Per completare l'autenticazione, utilizza il codice di verifica qui sotto:</p>

        <div class="code-container">
            <div class="code-label">Codice di Verifica</div>
            <div class="code">{{ $code }}</div>
            <div class="expiry">Valido per {{ $expiryMinutes }} minuti</div>
        </div>

        <!-- iOS Autocomplete Format (hidden but parsed by iOS) -->
        <p class="ios-code">Your verification code is: {{ $code }}</p>

        <div class="instructions">
            <strong>📱 Su iOS/iPhone:</strong><br>
            Il codice apparirà automaticamente sopra la tastiera quando apri l'app. Basta un tap per inserirlo!
        </div>

        <div class="warning">
            <strong>⚠️ Importante:</strong> Se non hai richiesto questo accesso, ignora questa email e considera di cambiare la tua password.
        </div>

        <p>Se hai problemi, contatta il supporto tecnico.</p>

        <div class="footer">
            <p>Questo è un messaggio automatico, non rispondere a questa email.</p>
            <p>&copy; {{ date('Y') }} Back Club. Tutti i diritti riservati.</p>
        </div>
    </div>
</body>
</html>
