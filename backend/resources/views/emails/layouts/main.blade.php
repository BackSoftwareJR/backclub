<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'BackClub' }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            background-color: #f5f5f7;
            margin: 0;
            padding: 0;
            color: #1d1d1f;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }
        .content {
            padding: 40px;
        }
        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 24px;
            color: #1d1d1f;
            letter-spacing: -0.015em;
        }
        p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 24px;
            color: #1d1d1f;
        }
        .data-table {
            width: 100%;
            background-color: #f5f5f7;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            border-collapse: separate;
            border-spacing: 0;
        }
        .data-table td {
            padding: 6px 0;
            vertical-align: top;
        }
        .data-label {
            color: #86868b;
            font-size: 13px;
            font-weight: 500;
            width: 35%;
        }
        .data-value {
            color: #1d1d1f;
            font-size: 15px;
            font-weight: 400;
            text-align: right;
        }
        .button {
            display: inline-block;
            background-color: #0071e3;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 980px;
            font-size: 15px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #0077ed;
        }
        .button-danger {
            background-color: #ff3b30;
        }
        .button-danger:hover {
            background-color: #ff453a;
        }
        .footer {
            padding: 30px 40px;
            text-align: center;
            font-size: 12px;
            color: #86868b;
            background-color: #f5f5f7;
        }
        .footer a {
            color: #86868b;
            text-decoration: none;
            margin: 0 8px;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .highlight {
            color: #0071e3;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            @yield('content')
        </div>
    </div>
    
    <div class="footer">
        <p style="margin: 0 0 20px 0; font-size: 11px; color: #86868b; line-height: 1.6; text-align: center;">
            <strong>Riservatezza e Privacy</strong><br>
            Questa email è destinata esclusivamente al destinatario indicato. Se avete ricevuto questa email per errore o non siete il destinatario previsto, vi preghiamo di distruggerla immediatamente e di informarci dell'errore.
        </p>
        <p style="margin: 0 0 15px 0; font-size: 12px; color: #98989d;">
            <strong>BackClub</strong><br>
            <a href="{{ config('app.url', 'https://backclub.it') }}" style="color: #98989d; text-decoration: underline;">www.backclub.it</a> |
            <a href="mailto:info@backclub.it" style="color: #98989d; text-decoration: underline;">Contatti</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #b0b0b5;">&copy; {{ date('Y') }} BackClub. Tutti i diritti riservati.</p>
    </div>
</body>
</html>
