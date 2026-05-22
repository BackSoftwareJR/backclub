<!DOCTYPE html>
<html lang="it" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <meta name="color-scheme" content="light">
    <title>{{ $subject ?? 'BackClub' }}</title>
    <style>
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #F5F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1d1f; -webkit-font-smoothing: antialiased; }
        table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        a { text-decoration: none; color: #0071e3; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #F5F5F7; padding-bottom: 40px; }
        .main-table { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .content-padding { padding: 0 45px 40px 45px; }
        h1 { font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 24px; color: #1d1d1f; letter-spacing: -0.015em; }
        p { font-size: 16px; line-height: 1.6; margin-bottom: 18px; color: #1d1d1f; }
        .data-table { width: 100%; background-color: #f5f5f7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-collapse: separate; border-spacing: 0; }
        .data-table td { padding: 6px 0; vertical-align: top; }
        .data-label { color: #86868b; font-size: 13px; font-weight: 500; width: 35%; }
        .data-value { color: #1d1d1f; font-size: 15px; font-weight: 400; text-align: right; }
        .btn-primary { background-color: #0071e3; color: #ffffff !important; padding: 14px 28px; border-radius: 50px; display: inline-block; font-weight: 600; font-size: 15px; text-align: center; border: 0; }
        .btn-primary:hover { background-color: #0077ed; }
        @media screen and (max-width: 600px) {
            .main-table { width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
            .content-padding { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F7;">

    <center class="wrapper">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-top: 40px; padding-bottom: 40px;">
                    <table role="presentation" class="main-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff;">
                        <tr>
                            <td align="center" style="padding: 40px 0 25px 0;">
                                <a href="{{ config('app.url', 'https://backclub.it') }}" target="_blank" style="text-decoration: none;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                                        <tr>
                                            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px; padding-right: 4px;">Back</td>
                                            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #0071e3; letter-spacing: -0.5px;">Club</td>
                                        </tr>
                                    </table>
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td class="content-padding">
                                @yield('content')
                            </td>
                        </tr>
                    </table>

                    {{-- Footer come venditori: Riservatezza, BackClub, Privacy, Copyright --}}
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" style="padding: 30px 20px;">
                                <p style="margin: 0 0 20px 0; font-size: 11px; color: #86868b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">
                                    <strong>Riservatezza e Privacy</strong><br>
                                    Questa email è destinata esclusivamente al destinatario indicato. Se avete ricevuto questa email per errore o non siete il destinatario previsto, vi preghiamo di distruggerla immediatamente e di informarci dell'errore. La diffusione, la copia o l'utilizzo non autorizzato di questa comunicazione è vietata e può costituire una violazione della legge.
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 12px; color: #98989d; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                    <strong>BackClub</strong><br>
                                    <a href="{{ config('app.url', 'https://backclub.it') }}" style="color: #98989d; text-decoration: underline;">www.backclub.it</a> |
                                    <a href="mailto:info@backclub.it" style="color: #98989d; text-decoration: underline;">Contatti</a>
                                </p>
                                <p style="margin: 0; font-size: 11px; color: #b0b0b5; font-family: inherit;">
                                    © {{ date('Y') }} BackClub. Tutti i diritti riservati.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
