<!DOCTYPE html>
<html lang="it" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>BackSoftware - Comunicazione</title>
    
    <style>
        /* --- RESET --- */
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #F5F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
        a { text-decoration: none; color: #0071e3; }
        
        /* --- STILI GENERICI --- */
        .wrapper { width: 100%; table-layout: fixed; background-color: #F5F5F7; padding-bottom: 40px; }
        .main-table { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .text-body { 
            font-size: 16px; 
            line-height: 1.8; 
            color: #1d1d1f; 
            word-wrap: break-word;
            overflow-wrap: break-word;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .text-body p { 
            margin: 0 0 18px 0; 
            line-height: 1.8;
        }
        .text-body p:last-child { 
            margin-bottom: 0; 
        }
        .text-body br {
            line-height: 1.8;
        }
        
        /* --- BOTTONI --- */
        /* Blu ripreso dal gradiente del sito */
        .btn-primary { background-color: #0071e3; color: #ffffff !important; padding: 14px 28px; border-radius: 50px; display: inline-block; font-weight: 600; text-align: center; border: 0; }
        .btn-secondary { background-color: #f2f2f7; color: #0071e3 !important; padding: 14px 28px; border-radius: 50px; display: inline-block; font-weight: 600; text-align: center; border: 1px solid #e5e5ea; }

        /* --- MOBILE --- */
        @media screen and (max-width: 600px) {
            .main-table { width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
            .content-padding { padding: 30px 20px !important; }
            .mobile-stack { display: block !important; width: 100% !important; padding-bottom: 15px; box-sizing: border-box; }
            .mobile-stack td { display: block !important; text-align: center; }
            .btn-primary, .btn-secondary { display: block; width: auto; margin-bottom: 10px; }
            .text-body { 
                font-size: 15px !important; 
                line-height: 1.7 !important; 
                padding: 0 !important;
            }
            .content-padding { 
                padding: 0 20px 30px 20px !important; 
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F7;">

    <!-- Preheader text for email clients -->
    <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        <?php echo htmlspecialchars(substr(strip_tags($body), 0, 100), ENT_QUOTES, 'UTF-8'); ?>
    </div>

    <center class="wrapper">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-top: 40px; padding-bottom: 40px;">
                    
                    <table role="presentation" class="main-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff;">
                        
                        <tr>
                            <td align="center" style="padding: 40px 0 25px 0;">
                                <a href="https://backsoftware.it" target="_blank" style="text-decoration: none;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px; padding-right: 4px;">
                                                Back
                                            </td>
                                            <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #0071e3; letter-spacing: -0.5px;">
                                                Software
                                            </td>
                                        </tr>
                                    </table>
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 0 45px 40px 45px;">
                                
                                <!-- Email Body - Il venditore inserisce già tutto il testo incluso il saluto -->
                                <div class="text-body" style="margin: 0; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #1d1d1f; padding: 0;">
                                    <?php 
                                    // Normalizza i line breaks
                                    $body = str_replace(["\r\n", "\r"], "\n", $body);
                                    
                                    // Converti il testo in HTML preservando i line breaks
                                    $formattedBody = htmlspecialchars($body, ENT_QUOTES, 'UTF-8');
                                    
                                    // Converti \n in <br> (nl2br gestisce già \r\n)
                                    $formattedBody = nl2br($formattedBody, false);
                                    
                                    // Normalizza spazi multipli (max 2 <br> consecutivi per paragrafi)
                                    $formattedBody = preg_replace('/(<br\s*\/?>\s*){3,}/i', '<br><br>', $formattedBody);
                                    
                                    // Rimuovi <br> all'inizio
                                    $formattedBody = preg_replace('/^(<br\s*\/?>\s*)+/i', '', trim($formattedBody));
                                    
                                    // Rimuovi <br> alla fine
                                    $formattedBody = preg_replace('/(<br\s*\/?>\s*)+$/i', '', $formattedBody);
                                    
                                    echo $formattedBody;
                                    ?>
                                </div>

                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px;">
                                    <tr>
                                        <td style="border-top: 1px solid #E5E5E7; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
                                    </tr>
                                </table>

                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px;">
                                    <tr>
                                        <td align="center" style="padding-bottom: 25px;">
                                            <p style="margin: 0; font-size: 15px; color: #86868b; font-family: inherit;">
                                                Come possiamo aiutarti oggi?
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td align="center" class="mobile-stack" style="padding-right: 8px; width: 50%; vertical-align: top;">
                                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            <tr>
                                                                <td align="center">
                                                                    <a href="https://wa.me/393513052627" class="btn-primary">
                                                                        Chatta su WhatsApp
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                    <td align="center" class="mobile-stack" style="padding-left: 8px; width: 50%; vertical-align: top;">
                                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            <tr>
                                                                <td align="center">
                                                                    <a href="mailto:info@backclub.it" class="btn-secondary">
                                                                        Scrivici una Email
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px;">
                                    <tr>
                                        <td style="text-align: left;">
                                            <p style="margin: 0; font-size: 16px; color: #1d1d1f; font-weight: 700; font-family: inherit;">
                                                <?php echo htmlspecialchars($senderName, ENT_QUOTES, 'UTF-8'); ?>
                                            </p>
                                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #86868b; font-family: inherit;">
                                                Team BackSoftware
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>
                    </table>
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" style="padding: 30px 20px;">
                                <!-- Informazioni Legali -->
                                <p style="margin: 0 0 20px 0; font-size: 11px; color: #86868b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">
                                    <strong>Riservatezza e Privacy</strong><br>
                                    Questa email è destinata esclusivamente al destinatario indicato. Se avete ricevuto questa email per errore o non siete il destinatario previsto, vi preghiamo di distruggerla immediatamente e di informarci dell'errore. La diffusione, la copia o l'utilizzo non autorizzato di questa comunicazione è vietata e può costituire una violazione della legge.
                                </p>
                                
                                <p style="margin: 0 0 15px 0; font-size: 12px; color: #98989d; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                    <strong>BackSoftware</strong><br>
                                    <a href="https://backsoftware.it" style="color: #98989d; text-decoration: underline;">www.backsoftware.it</a> | 
                                    <a href="https://backsoftware.it/privacy-policy" style="color: #98989d; text-decoration: underline;">Privacy Policy</a>
                                </p>
                                
                                <p style="margin: 0; font-size: 11px; color: #b0b0b5; font-family: inherit;">
                                    © <?php echo date('Y'); ?> BackSoftware. Tutti i diritti riservati.
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
