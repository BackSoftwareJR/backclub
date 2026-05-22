<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Codice di Verifica</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                🔐 Codice di Verifica
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Ciao <strong>{{ $user->name }}</strong>,
                            </p>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #555555;">
                                Hai richiesto di accedere al tuo account BackClub. Usa il codice qui sotto per completare il login:
                            </p>

                            <!-- Codice Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; display: inline-block;">
                                            <div style="font-size: 48px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                {{ $code }}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- iOS Autofill Support -->
                            <!-- Questo formato permette a iOS di rilevare automaticamente il codice -->
                            <div style="display: none;">
                                Your verification code is: <code>{{ $code }}</code>
                            </div>

                            <p style="margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6; color: #777777;">
                                ⏱️ Questo codice scadrà tra <strong>{{ $expiresInMinutes }} minuti</strong>.
                            </p>

                            <!-- Security Warning -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #ef4444; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #b91c1c;">
                                            ⚠️ Nota di Sicurezza
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #991b1b;">
                                            Se non hai richiesto questo codice, <strong>ignora questa email</strong> e considera di cambiare la tua password.
                                            Non condividere mai questo codice con nessuno.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #999999;">
                                Grazie,<br>
                                <strong>Il Team BackClub</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999;">
                                Questa è un'email automatica. Per favore non rispondere.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © {{ date('Y') }} BackClub. Tutti i diritti riservati.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>

