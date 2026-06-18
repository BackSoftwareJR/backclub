@php
    $start = \App\Support\CalendarDateTime::forDisplay($call->start_time);
    $end = \App\Support\CalendarDateTime::forDisplay($call->end_time);
    $durationMinutes = $start->diffInMinutes($end);
    $dayNumber = $start->format('j');
    $monthShort = $start->translatedFormat('M');
    $weekdayShort = $start->translatedFormat('D');
@endphp
<!DOCTYPE html>
<html lang="it" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>Invito — {{ $call->title }}</title>
    <style>
        :root { color-scheme: light only; supported-color-schemes: light; }
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; background-color: #f5f5f7 !important; }
        table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        @media screen and (max-width: 600px) {
            .shell { border-radius: 0 !important; }
            .pad { padding-left: 24px !important; padding-right: 24px !important; }
            .time-value { font-size: 28px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7 !important;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f7;">
    <tr>
        <td align="center" style="padding:48px 16px;">

            {{-- Card principale --}}
            <table role="presentation" class="shell" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">
                <tr>
                    <td class="pad" style="padding:40px 40px 32px 40px;">

                        {{-- Eyebrow --}}
                        <p style="margin:0 0 10px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#86868b;">
                            Videochiamata
                        </p>

                        {{-- Titolo --}}
                        <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:700;line-height:1.15;letter-spacing:-0.03em;color:#1d1d1f;">
                            {{ $call->title }}
                        </h1>

                        {{-- Organizzatore --}}
                        <p style="margin:0 0 32px 0;font-size:16px;line-height:1.5;color:#6e6e73;">
                            <span style="color:#1d1d1f;font-weight:600;">{{ $organizerName }}</span> ti ha invitato a partecipare.
                        </p>

                        {{-- Blocco data/orario — alto contrasto, stile Apple Calendar --}}
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#1d1d1f" style="background-color:#1d1d1f !important;border-radius:16px;margin-bottom:28px;">
                            <tr>
                                <td style="padding:28px 28px 24px 28px;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            {{-- Calendario compatto --}}
                                            <td width="64" valign="top" style="padding-right:20px;">
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="64" bgcolor="#ffffff" style="background-color:#ffffff !important;border-radius:12px;overflow:hidden;">
                                                    <tr>
                                                        <td align="center" bgcolor="#ff3b30" style="background-color:#ff3b30 !important;padding:5px 0;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;">
                                                            {{ $monthShort }}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td align="center" style="padding:8px 0 10px 0;font-size:30px;font-weight:700;line-height:1;color:#1d1d1f;letter-spacing:-0.02em;">
                                                            {{ $dayNumber }}
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            {{-- Data e ora --}}
                                            <td valign="middle">
                                                <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#98989d;">
                                                    {{ $weekdayShort }} · {{ $start->translatedFormat('j F Y') }}
                                                </p>
                                                <p class="time-value" style="margin:0 0 4px 0;font-size:32px;font-weight:700;line-height:1.1;letter-spacing:-0.03em;color:#ffffff;">
                                                    {{ $start->format('H:i') }}<span style="font-weight:400;color:#98989d;"> – </span>{{ $end->format('H:i') }}
                                                </p>
                                                <p style="margin:0;font-size:14px;font-weight:500;color:#98989d;">
                                                    Durata · {{ $durationMinutes }} min
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        @if(!empty($call->call_notes))
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f5f7" style="background-color:#f5f5f7 !important;border-radius:12px;margin-bottom:28px;">
                            <tr>
                                <td style="padding:16px 20px;">
                                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#86868b;">Note</p>
                                    <p style="margin:0;font-size:15px;line-height:1.55;color:#1d1d1f;">{{ $call->call_notes }}</p>
                                </td>
                            </tr>
                        </table>
                        @endif

                        @if($meetLink)
                        {{-- CTA principale --}}
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
                            <tr>
                                <td align="center">
                                    <a href="{{ $meetLink }}" target="_blank" rel="noopener noreferrer"
                                       style="display:inline-block;background-color:#0071e3;color:#ffffff !important;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:980px;letter-spacing:-0.01em;mso-padding-alt:0;">
                                        <!--[if mso]><i style="letter-spacing:40px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
                                        <span style="color:#ffffff;">Partecipa con Google Meet</span>
                                        <!--[if mso]><i style="letter-spacing:40px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                                    </a>
                                </td>
                            </tr>
                        </table>

                        {{-- Link copiabile --}}
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f5f5f7" style="background-color:#f5f5f7 !important;border-radius:12px;margin-bottom:28px;">
                            <tr>
                                <td style="padding:14px 18px;">
                                    <p style="margin:0 0 5px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#86868b;">Link della call</p>
                                    <a href="{{ $meetLink }}" target="_blank" rel="noopener noreferrer" style="font-size:14px;line-height:1.5;color:#0071e3;word-break:break-all;text-decoration:none;">{{ $meetLink }}</a>
                                </td>
                            </tr>
                        </table>
                        @else
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#fff8ee" style="background-color:#fff8ee !important;border-radius:12px;margin-bottom:28px;border:1px solid #ffe8c2;">
                            <tr>
                                <td style="padding:14px 18px;font-size:14px;line-height:1.5;color:#8a5a00;">
                                    Il link Google Meet sarà disponibile a breve.
                                </td>
                            </tr>
                        </table>
                        @endif

                        @if(count($participants) > 0)
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                            <tr>
                                <td>
                                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#86868b;">Partecipanti</p>
                                    @foreach($participants as $participant)
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                                        <tr>
                                            <td width="36" valign="top">
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="32" height="32" bgcolor="#e8e8ed" style="background-color:#e8e8ed !important;border-radius:50%;">
                                                    <tr>
                                                        <td align="center" valign="middle" style="font-size:13px;font-weight:600;color:#1d1d1f;">
                                                            {{ strtoupper(substr($participant['name'] ?? $participant['email'], 0, 1)) }}
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td valign="middle" style="padding-left:4px;">
                                                <p style="margin:0;font-size:15px;font-weight:500;color:#1d1d1f;line-height:1.3;">
                                                    {{ $participant['name'] ?? $participant['email'] }}
                                                </p>
                                                @if(!empty($participant['name']))
                                                <p style="margin:0;font-size:13px;color:#86868b;line-height:1.3;">{{ $participant['email'] }}</p>
                                                @endif
                                            </td>
                                        </tr>
                                    </table>
                                    @endforeach
                                </td>
                            </tr>
                        </table>
                        @endif

                    </td>
                </tr>
            </table>

            {{-- Footer minimale — nessun brand --}}
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">
                <tr>
                    <td align="center" style="padding:28px 20px 0 20px;">
                        <p style="margin:0;font-size:11px;line-height:1.65;color:#aeaeb2;text-align:center;">
                            Questa email è destinata esclusivamente al destinatario indicato.<br>
                            Se l'hai ricevuta per errore, ti preghiamo di ignorarla e cancellarla.
                        </p>
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>
