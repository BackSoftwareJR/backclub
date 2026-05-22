<!DOCTYPE html>
<html lang="it">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Scheda Contatto - {{ $lead->company_name }}</title>
    <style>
        @page { margin: 0cm; size: A4; }
        
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1d1d1f; 
            line-height: 1.5;
            font-size: 12px;
            margin: 0; 
            padding: 0; 
            background: #fff;
        }

        .page-container {
            padding: 40px 50px;
            position: relative;
        }

        .page-break { page-break-after: always; }
        .avoid-break { page-break-inside: avoid; }

        h1 { 
            font-size: 28px; 
            font-weight: 700; 
            letter-spacing: -0.8px; 
            margin-bottom: 10px; 
            color: #000; 
            line-height: 1.1;
        }
        
        h2 { 
            font-size: 16px; 
            font-weight: 600; 
            color: #000; 
            margin-top: 25px; 
            margin-bottom: 15px; 
            padding-bottom: 8px; 
            border-bottom: 1px solid #e5e5e5;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        h3 { 
            font-size: 14px; 
            font-weight: 700; 
            color: #000;
            margin-bottom: 8px; 
            margin-top: 0; 
        }

        .text-right { text-align: right; }
        .text-muted { color: #666; }
        .text-small { font-size: 10px; }
        .font-bold { font-weight: 700; }
        .text-uppercase { text-transform: uppercase; letter-spacing: 0.5px; }

        .header-table { 
            width: 100%; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #f5f5f7; 
            padding-bottom: 15px; 
        }
        
        .brand { 
            font-size: 24px; 
            font-weight: 800; 
            color: #000; 
            letter-spacing: -1px; 
            line-height: 1; 
        }
        
        .brand span { color: #4f46e5; }

        .footer-fixed { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            height: 25px; 
            text-align: center; 
            border-top: 1px solid #eee; 
            padding-top: 8px; 
            font-size: 9px; 
            color: #999; 
            background: #fff; 
            z-index: 999; 
        }

        .info-box { 
            background-color: #f9f9f9; 
            padding: 15px; 
            border-radius: 8px; 
            border: 1px solid #eee; 
            margin-bottom: 15px;
        }

        .info-grid { 
            width: 100%; 
            margin-bottom: 20px; 
            border-collapse: separate; 
            border-spacing: 15px 0; 
            margin-left: -15px; 
        }

        .info-row {
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f0f0f0;
        }

        .info-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .info-label {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 13px;
            color: #000;
            font-weight: 500;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: capitalize;
        }

        .badge-new { background: rgba(10, 132, 255, 0.15); color: #0A84FF; }
        .badge-contacted { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }
        .badge-qualified { background: rgba(10, 132, 255, 0.15); color: #0A84FF; }
        .badge-proposal { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }
        .badge-negotiation { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }
        .badge-won { background: rgba(52, 199, 89, 0.15); color: #34C759; }
        .badge-lost { background: rgba(255, 45, 85, 0.15); color: #FF2D55; }

        .badge-low { background: #f5f5f7; color: #666; }
        .badge-medium { background: rgba(10, 132, 255, 0.15); color: #0A84FF; }
        .badge-high { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }
        .badge-urgent { background: rgba(255, 45, 85, 0.15); color: #FF2D55; }

        .section-box {
            background: #fafafa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #4f46e5;
        }

        .activity-item {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f0f0f0;
        }

        .activity-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .activity-type {
            font-size: 10px;
            font-weight: 700;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .activity-date {
            font-size: 9px;
            color: #999;
            margin-top: 4px;
        }

        .activity-description {
            font-size: 11px;
            color: #333;
            margin-top: 6px;
            line-height: 1.5;
        }
    </style>
</head>
<body>

    <div class="footer-fixed">
        BackSoftware - Ivrea (TO) - Documento riservato - Generato il {{ now()->format('d/m/Y H:i') }}
    </div>

    <div class="page-container">
        
        <table class="header-table">
            <tr>
                <td style="vertical-align: middle;">
                    <div class="brand">Back<span>Software</span>.</div>
                </td>
                <td class="text-right" style="vertical-align: middle;">
                    <div class="text-uppercase text-small font-bold text-muted">Scheda Contatto</div>
                    <div style="font-size: 16px; font-weight: 700; color: #000;">{{ $lead->company_name }}</div>
                    <div class="text-small text-muted">ID: {{ $lead->id }}</div>
                </td>
            </tr>
        </table>

        <h1>{{ $lead->company_name }}</h1>
        
        @if($lead->contact_person)
        <p class="text-muted" style="margin-bottom: 25px;">Contatto: {{ $lead->contact_person }}</p>
        @endif

        @if($lead->tipologia)
        <p style="margin-bottom: 25px;">
            <span class="badge badge-low">{{ $lead->tipologia }}</span>
        </p>
        @endif

        <table class="info-grid">
            <tr>
                <td width="50%" class="info-box">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">Informazioni Principali</h3>
                    
                    @if($lead->phones && count($lead->phones) > 0)
                    <div class="info-row">
                        <div class="info-label">Telefono</div>
                        <div class="info-value">
                            @foreach($lead->phones as $phone)
                                {{ $phone['number'] }}@if(!$loop->last), @endif
                            @endforeach
                        </div>
                    </div>
                    @endif

                    @if($lead->emails && count($lead->emails) > 0)
                    <div class="info-row">
                        <div class="info-label">Email</div>
                        <div class="info-value">
                            @foreach($lead->emails as $email)
                                {{ $email['email'] }}@if(!$loop->last), @endif
                            @endforeach
                        </div>
                    </div>
                    @endif

                    @if($lead->address)
                    <div class="info-row">
                        <div class="info-label">Indirizzo</div>
                        <div class="info-value">{{ $lead->address }}</div>
                    </div>
                    @endif

                    @if($lead->region)
                    <div class="info-row">
                        <div class="info-label">Regione</div>
                        <div class="info-value">{{ $lead->region }}</div>
                    </div>
                    @endif

                    @if($lead->websites && count($lead->websites) > 0)
                    <div class="info-row">
                        <div class="info-label">Sito Web</div>
                        <div class="info-value">{{ $lead->websites[0] }}</div>
                    </div>
                    @endif

                    <div class="info-row">
                        <div class="info-label">Stato</div>
                        <div class="info-value">
                            <span class="badge badge-{{ $lead->status }}">{{ $lead->status }}</span>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">Priorità</div>
                        <div class="info-value">
                            <span class="badge badge-{{ $lead->priority }}">{{ $lead->priority }}</span>
                        </div>
                    </div>

                    @if($lead->seller && $lead->seller->user)
                    <div class="info-row">
                        <div class="info-label">Venditore Assegnato</div>
                        <div class="info-value">{{ $lead->seller->user->name }}</div>
                    </div>
                    @endif

                    @if($lead->department)
                    <div class="info-row">
                        <div class="info-label">Settore</div>
                        <div class="info-value">{{ $lead->department->name }}</div>
                    </div>
                    @endif
                </td>

                <td width="50%" class="info-box">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">Informazioni Strategiche</h3>
                    
                    @if($lead->digital_status)
                    <div class="info-row">
                        <div class="info-label">Stato Digitale Attuale</div>
                        <div class="info-value" style="white-space: pre-line;">{{ $lead->digital_status }}</div>
                    </div>
                    @endif

                    @if($lead->pitch_strategy)
                    <div class="info-row">
                        <div class="info-label">Strategia di Pitch & Opportunità</div>
                        <div class="info-value" style="white-space: pre-line;">{{ $lead->pitch_strategy }}</div>
                    </div>
                    @endif

                    @if($lead->description)
                    <div class="info-row">
                        <div class="info-label">Descrizione</div>
                        <div class="info-value" style="white-space: pre-line;">{{ $lead->description }}</div>
                    </div>
                    @endif

                    @if($lead->estimated_value)
                    <div class="info-row">
                        <div class="info-label">Valore Stimato</div>
                        <div class="info-value">€ {{ number_format($lead->estimated_value, 2, ',', '.') }}</div>
                    </div>
                    @endif

                    @if($lead->expected_close_date)
                    <div class="info-row">
                        <div class="info-label">Data Chiusura Prevista</div>
                        <div class="info-value">{{ \Carbon\Carbon::parse($lead->expected_close_date)->format('d/m/Y') }}</div>
                    </div>
                    @endif

                    @if($lead->source)
                    <div class="info-row">
                        <div class="info-label">Fonte</div>
                        <div class="info-value">{{ $lead->source }}</div>
                    </div>
                    @endif
                </td>
            </tr>
        </table>

        @if($lead->notes)
        <div class="section-box">
            <h2 style="margin-top: 0;">Note</h2>
            <div style="white-space: pre-line; font-size: 11px; line-height: 1.6; color: #333;">{{ $lead->notes }}</div>
        </div>
        @endif

        @if($lead->activities && count($lead->activities) > 0)
        <h2>Storico Attività</h2>
        <div class="section-box">
            @foreach($lead->activities->sortByDesc('created_at') as $activity)
            <div class="activity-item">
                <div class="activity-type">{{ ucfirst($activity->activity_type) }}</div>
                <div class="activity-date">{{ \Carbon\Carbon::parse($activity->created_at)->format('d/m/Y H:i') }}</div>
                @if($activity->description)
                <div class="activity-description">{{ $activity->description }}</div>
                @endif
                @if($activity->outcome)
                <div class="activity-description" style="margin-top: 4px; color: #666;">
                    <strong>Esito:</strong> {{ $activity->outcome }}
                </div>
                @endif
                @if($activity->user)
                <div class="activity-date" style="margin-top: 4px;">
                    Utente: {{ $activity->user->name }}
                </div>
                @endif
            </div>
            @endforeach
        </div>
        @endif

    </div>

</body>
</html>
