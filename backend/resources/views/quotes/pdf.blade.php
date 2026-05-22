<!DOCTYPE html>
<html lang="it">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Preventivo {{ $quote->quote_number }}</title>
    <style>
        /* --- 1. CORE & TYPOGRAPHY --- */
        @page { margin: 0cm; size: A4; }
        
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1d1d1f; 
            line-height: 1.4; /* Leggermente più compatto */
            font-size: 12px;
            margin: 0; padding: 0; background: #fff;
        }

        .page-container {
            padding: 40px 50px; /* Margini ottimizzati per evitare overflow */
            position: relative;
        }

        /* Gestione Pagine */
        .page-break { page-break-after: always; }
        .avoid-break { page-break-inside: avoid; }

        /* Typography */
        h1 { 
            font-size: 30px; /* Dimensione controllata */
            font-weight: 700; 
            letter-spacing: -0.8px; 
            margin-bottom: 10px; 
            color: #000; 
            line-height: 1.1;
        }
        
        h2 { 
            font-size: 16px; font-weight: 600; color: #000; 
            margin-top: 25px; margin-bottom: 15px; 
            padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;
        }

        h3 { 
            font-size: 14px; font-weight: 700; color: #000;
            margin-bottom: 5px; margin-top: 0; 
        }

        .accent { color: #4f46e5; } 

        .subtitle {
            font-size: 13px; color: #666; font-weight: 400;
            margin-bottom: 25px; line-height: 1.5; max-width: 95%;
        }
        
        /* Utilities */
        .text-right { text-align: right; }
        .text-muted { color: #888; }
        .text-small { font-size: 10px; }
        .font-bold { font-weight: 700; }
        .text-uppercase { text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* --- HEADER & FOOTER --- */
        .brand { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -1px; line-height: 1; }
        .brand span { color: #4f46e5; } 
        
        .header-table { width: 100%; margin-bottom: 25px; border-bottom: 2px solid #f5f5f7; padding-bottom: 15px; }
        
        .footer-fixed {
            position: fixed; bottom: 0; left: 0; right: 0; height: 20px;
            text-align: center; border-top: 1px solid #eee; padding-top: 5px;
            font-size: 8px; color: #999; background: #fff; z-index: 999;
        }

        /* --- COMPONENTI GRAFICI --- */
        /* Header Info Boxes */
        .info-box { background-color: #f9f9f9; padding: 15px; border-radius: 8px; vertical-align: top; border: 1px solid #eee; }
        .info-grid { width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 15px 0; margin-left: -15px; }

        /* Executive Summary */
        .exec-summary {
            background: #f4f4f7; border-left: 4px solid #4f46e5;
            padding: 15px; margin-bottom: 30px; border-radius: 0 6px 6px 0;
        }

        /* Feature Cards (FIXED: Altezza e Spaziatura) */
        .feature-cards-table {
            width: 100%; 
            margin-top: 20px; 
            border-collapse: separate; 
            border-spacing: 15px 0; /* Spazio orizzontale tra le celle */
            margin-left: -15px; /* Compensazione margine sinistro */
        }
        .feature-card {
            background: #fff; 
            border: 1px solid #eee; 
            border-radius: 10px;
            padding: 20px; 
            vertical-align: top;
            /* Rimosso height: 100% per evitare box stirati */
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }
        .feature-card h3 { color: #4f46e5; margin-bottom: 8px; font-size: 13px; }
        .feature-card p { margin: 0; font-size: 11px; line-height: 1.5; color: #555; }

        /* Quote Hero */
        .hero-quote {
            margin-top: 40px; text-align: center; padding: 20px;
            background: #fff; border-top: 1px solid #f5f5f7;
        }
        .hero-quote-text { font-size: 18px; font-weight: 400; color: #111; font-style: italic; line-height: 1.4; }
        
        /* Liste & Tabelle Prezzi */
        .feature-list { list-style: none; padding: 0; margin: 10px 0; }
        .feature-list li { 
            padding: 6px 0 6px 15px; position: relative; color: #444; 
            border-bottom: 1px solid #f9f9f9; font-size: 11px;
        }
        .feature-list li:before { 
            content: ""; background-color: #4f46e5; width: 4px; height: 4px; border-radius: 50%;
            position: absolute; left: 0; top: 12px; 
        }

        .mini-list { list-style: none; padding: 0; margin: 5px 0 0 0; }
        .mini-list li { padding: 2px 0 2px 10px; position: relative; color: #666; font-size: 10px; }
        .mini-list li:before { content: "-"; position: absolute; left: 0; color: #4f46e5; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th {
            text-align: left; padding: 10px 0; border-bottom: 2px solid #000; color: #000;
            font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;
        }
        .items-table td { padding: 12px 0; border-bottom: 1px solid #eee; color: #111; font-size: 12px; vertical-align: top; }
        
        .options-table tr.option-header { background-color: #f4f4f7; }
        .options-table td { padding: 12px 15px; }

        .totals-table { width: 45%; margin-left: auto; border-collapse: collapse; margin-top: 10px; }
        .totals-table td { padding: 6px 0; text-align: right; font-size: 12px; }
        .total-final { 
            font-size: 18px; font-weight: 700; color: #4f46e5; 
            border-top: 1px solid #ddd; padding-top: 10px !important; margin-top: 10px;
        }

        /* Appendici Style */
        .appendix-header { text-align: left; margin-bottom: 30px; }
        .appendix-tag {
            background: #000; color: #fff; padding: 4px 8px; font-size: 9px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 10px;
        }
        .appendix-intro { font-size: 12px; color: #444; margin-bottom: 25px; line-height: 1.5; }
        
        .grid-2x2 { width: 100%; border-collapse: separate; border-spacing: 15px; }
        .grid-cell { 
            background: #f9f9f9; padding: 20px; border-radius: 6px; vertical-align: top; width: 50%; border: 1px solid #eee;
        }
        .cell-title { font-weight: 700; font-size: 13px; color: #000; margin-bottom: 8px; display: block; }
        .cell-text { font-size: 11px; color: #555; line-height: 1.4; text-align: justify; }

        .bc-box { background: #111; color: #fff; padding: 30px; border-radius: 10px; margin-top: 25px; margin-bottom: 25px; }
        .bc-stat-number { font-size: 28px; font-weight: 700; color: #4f46e5; display: block; }
        .bc-stat-label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 1px; }

HTML

    <style>
        /* --- CORE STYLES (Mantenere quelli precedenti + Queste aggiunte) --- */
        @page { margin: 0cm; size: A4; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1d1d1f; line-height: 1.5; font-size: 12px; margin: 0; padding: 0; background: #fff; }
        .page-container { padding: 45px 55px; position: relative; }
        .page-break { page-break-after: always; }
        .avoid-break { page-break-inside: avoid; }
        
        /* Typography */
        h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.8px; margin-bottom: 10px; color: #000; line-height: 1.1; }
        h2 { font-size: 16px; font-weight: 600; color: #000; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5; text-transform: uppercase; letter-spacing: 0.5px; }
        h3 { font-size: 14px; font-weight: 700; color: #000; margin-bottom: 5px; margin-top: 0; }
        .accent { color: #4f46e5; }
        .subtitle { font-size: 13px; color: #666; font-weight: 400; margin-bottom: 30px; line-height: 1.5; max-width: 95%; }
        
        /* Utilities */
        .text-right { text-align: right; }
        .text-muted { color: #888; }
        .text-small { font-size: 10px; }
        .font-bold { font-weight: 700; }
        .text-uppercase { text-transform: uppercase; letter-spacing: 0.5px; }

        /* Header & Footer */
        .header-table { width: 100%; margin-bottom: 30px; border-bottom: 2px solid #f5f5f7; padding-bottom: 15px; }
        .brand { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -1px; line-height: 1; }
        .brand span { color: #4f46e5; }
        .footer-fixed { position: fixed; bottom: 0; left: 0; right: 0; height: 25px; text-align: center; border-top: 1px solid #eee; padding-top: 8px; font-size: 9px; color: #999; background: #fff; z-index: 999; }

        /* Info Boxes & Cards (Standard) */
        .info-box { background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
        .info-grid { width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 15px 0; margin-left: -15px; }
        .hero-quote { margin-top: 40px; text-align: center; padding: 25px; background: #fff; border-top: 1px solid #f5f5f7; }
        .hero-quote-text { font-size: 20px; font-weight: 400; color: #111; font-style: italic; line-height: 1.4; }

        /* Tables */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { text-align: left; padding: 10px 0; border-bottom: 2px solid #000; color: #000; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
        .items-table td { padding: 12px 0; border-bottom: 1px solid #eee; color: #111; font-size: 12px; vertical-align: top; }
        .totals-table { width: 45%; margin-left: auto; border-collapse: collapse; margin-top: 10px; }
        .totals-table td { padding: 6px 0; text-align: right; font-size: 12px; }
        .total-final { font-size: 18px; font-weight: 700; color: #4f46e5; border-top: 1px solid #ddd; padding-top: 10px !important; margin-top: 10px; }

        /* --- NUOVI STILI PER LE APPENDICI (Target: Densità & Layout) --- */
        
        .appendix-header { margin-bottom: 30px; border-bottom: 4px solid #4f46e5; padding-bottom: 15px; display: inline-block; width: 100%; }
        .appendix-tag { background: #000; color: #fff; padding: 5px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: inline-block; }
        .appendix-intro { font-size: 13px; color: #444; line-height: 1.6; margin-bottom: 30px; font-weight: 500; }

        /* Grid 2x2 Potenziata */
        .grid-2x2 { width: 100%; border-collapse: separate; border-spacing: 15px; margin-bottom: 30px; }
        .grid-cell { background: #f8f9fa; padding: 25px; border-radius: 6px; vertical-align: top; width: 50%; border: 1px solid #e0e0e0; }
        .cell-title { font-weight: 700; font-size: 13px; color: #000; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
        .cell-text { font-size: 11px; color: #555; line-height: 1.5; text-align: justify; }

        /* Tech Stack Badges (New) */
        .tech-badge { display: inline-block; background: #eef2ff; color: #4f46e5; padding: 6px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-right: 5px; margin-bottom: 5px; border: 1px solid #c7d2fe; }
        
        /* Checklist Style (New) */
        .check-row { padding: 8px 0; border-bottom: 1px dashed #ddd; font-size: 11px; color: #444; }
        .check-icon { color: #4f46e5; font-weight: bold; margin-right: 10px; }

        /* Workflow Steps (New) */
        .step-table { width: 100%; border-collapse: separate; border-spacing: 10px; margin-top: 20px; }
        .step-cell { background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px; width: 25%; vertical-align: top; }
        .step-num { font-size: 24px; font-weight: 800; color: #e0e0e0; display: block; margin-bottom: 5px; }
        .step-title { font-size: 12px; font-weight: 700; color: #000; margin-bottom: 5px; display: block; }
        .step-desc { font-size: 10px; color: #666; line-height: 1.4; }

        /* BackClub Enhanced */
        .bc-hero { background: #111; color: #fff; padding: 35px; border-radius: 12px; margin-bottom: 30px; position: relative; overflow: hidden; }
        .bc-hero h2 { color: #fff; border: none; margin: 0 0 10px 0; font-size: 22px; }
        .bc-card { background: #f4f4f7; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 15px; }
        .bc-card strong { display: block; color: #000; font-size: 13px; margin-bottom: 5px; }
        .bc-card p { margin: 0; font-size: 11px; color: #555; line-height: 1.5; }
    </style>
</head>
<body>

    <div class="footer-fixed">
        BackSoftware - Ivrea (TO) - Documento riservato - Generato il {{ now()->format('d/m/Y') }}
    </div>

    <div class="page-container page-break">
        
        <table class="header-table">
            <tr>
                <td style="vertical-align: middle;">
                    <div class="brand">Back<span>Software</span>.</div>
                </td>
                <td class="text-right" style="vertical-align: middle;">
                    <div class="text-uppercase text-small font-bold text-muted">Offerta</div>
                    <div style="font-size: 16px; font-weight: 700; color: #000;">{{ $quote->quote_number }}</div>
                    <div class="text-small text-muted">{{ \Carbon\Carbon::parse($quote->created_at)->format('d/m/Y') }}</div>
                </td>
            </tr>
        </table>

        <table class="info-grid">
            <tr>
                <td width="50%" class="info-box">
                    <strong class="text-uppercase text-small text-muted" style="display:block; margin-bottom:4px;">Cliente</strong>
                    <span style="font-size: 14px; font-weight: 700; display:block; margin-bottom:2px; color:#000;">{{ $quote->client->company_name ?? 'Cliente' }}</span>
                    <span class="text-muted text-small">{{ $quote->client->address ?? '' }}</span>
                </td>
                <td width="50%" class="info-box">
                    <strong class="text-uppercase text-small text-muted" style="display:block; margin-bottom:4px;">Progetto</strong>
                    <span style="font-size: 14px; font-weight: 700; display:block; margin-bottom:2px; color:#000;">{{ $quote->title ?? 'Ecosistema Digitale' }}</span>
                    <span class="text-muted text-small">Validità: {{ $quote->valid_until ? \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') : '30 giorni' }}</span>
                </td>
            </tr>
        </table>

        <h1 style="margin-top: 10px; font-size: 32px;">Più di una Software House.</h1>
        <p class="subtitle">
            Costruiamo ecosistemi digitali partendo dal cuore tecnologico di Ivrea. La nostra missione è eliminare il superfluo per offrirti strumenti potenti, sicuri e proprietari.
        </p>

        <div class="exec-summary">
            <strong style="color: #4f46e5; font-size: 11px; text-transform: uppercase;">Executive Summary</strong>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #444; line-height: 1.5;">
                Questo documento delinea la proposta per lo sviluppo del vostro nuovo ecosistema digitale. L'offerta garantisce massima proprietà intellettuale, scalabilità futura e infrastruttura enterprise, minimizzando i costi ricorrenti.
            </p>
        </div>

        <table class="feature-cards-table">
            <tr>
                <td width="33%" class="feature-card">
                    <h3>Sviluppo Sartoriale</h3>
                    <p>
                        Non usiamo soluzioni pre-confezionate. Scriviamo codice su misura che diventa un tuo asset proprietario. <br><br><strong>Nessuna licenza, proprietà 100% tua.</strong>
                    </p>
                </td>
                <td width="33%" class="feature-card">
                    <h3>BackClub Network</h3>
                    <p>
                        Entrare in BackSoftware significa accedere a un <strong>network esclusivo</strong> di partner e imprenditori per creare sinergie di valore e opportunità B2B.
                    </p>
                </td>
                <td width="33%" class="feature-card">
                    <h3>Trasparenza Totale</h3>
                    <p>
                        Eliminiamo i filtri. Avrai un canale diretto <strong>dev-to-dev</strong> con chi sviluppa fisicamente il progetto. Nessun costo nascosto o account manager inutile.
                    </p>
                </td>
            </tr>
        </table>

        <div class="hero-quote">
            <div class="hero-quote-text">
                "La tecnologia non deve essere un costo,<br>ma un <strong class="accent">moltiplicatore di valore</strong>."
            </div>
        </div>
    </div>

    @foreach($quote->items as $index => $item)
        @include('quotes._item_page', [
            'index' => $index,
            'serviceTitle' => $item->description,
            'priceListItem' => $item->priceListItem ?? null,
        ])
    @endforeach

    <div class="page-container page-break">
        <h1>Sicurezza & Mantenimento</h1>
        <p class="subtitle">Protezione dei dati, infrastruttura e continuità del servizio.</p>

        <div class="info-box" style="margin-bottom: 30px; padding: 15px; background: #fff; border: 2px solid #f5f5f7;">
            <table style="width: 100%;">
                <tr>
                    <td width="33%"><strong>Data Sovereignty EU</strong><br><span class="text-muted text-small">Server Tier IV in UE</span></td>
                    <td width="33%"><strong>Backup Crittografati</strong><br><span class="text-muted text-small">Disaster Recovery</span></td>
                    <td width="33%"><strong>99.9% Uptime</strong><br><span class="text-muted text-small">SLA Garantito</span></td>
                </tr>
            </table>
        </div>

        <h2>Piano di Mantenimento</h2>
        <p class="text-small text-muted" style="margin-bottom: 20px;">
            Opzioni disponibili per garantire aggiornamenti, sicurezza e performance nel tempo.
        </p>

        <table class="items-table options-table">
            @php $hasRenewals = false; @endphp
            @foreach($quote->items as $item)
                
                {{-- Multi-Rinnovo --}}
                @if($item->renewal_options)
                    @php
                    $renewals = is_array($item->renewal_options) ? $item->renewal_options : json_decode($item->renewal_options, true);
                    if (is_array($renewals) && count($renewals) > 0) { $hasRenewals = true; }
                    @endphp
                    @if(is_array($renewals) && count($renewals) > 0)
                    <tr class="option-header">
                        <td colspan="3">
                            <strong>Opzioni per: {{ $item->description }}</strong>
                        </td>
                    </tr>
                    @foreach($renewals as $renewal)
                    <tr>
                        <td width="60%">
                            <span style="color: #4f46e5; font-weight: 700; font-size: 12px;">{{ $renewal['description'] ?? 'Opzione' }}</span>
                            @if(isset($renewal['includes']) && is_array($renewal['includes']) && count($renewal['includes']) > 0)
                            <div style="margin-top: 5px;">
                                <strong class="text-small text-muted">Include:</strong>
                                <ul class="mini-list">
                                    @foreach($renewal['includes'] as $inc)
                                        <li>{{ $inc }}</li>
                                    @endforeach
                                </ul>
                            </div>
                            @elseif(isset($renewal['notes']))
                                 <br><span class="text-muted text-small">{{ $renewal['notes'] }}</span>
                            @endif
                        </td>
                        <td width="20%"><span class="text-small text-muted text-uppercase">Mensile</span></td>
                        <td width="20%" class="text-right font-bold" style="font-size: 13px;">€ {{ number_format($renewal['price'] ?? 0, 2, ',', '.') }}</td>
                    </tr>
                    @endforeach
                    @endif
                @endif
                
                {{-- Rinnovo Singolo --}}
                @if($item->renewal_option && !$item->renewal_options)
                     @php
                    $renewal = is_array($item->renewal_option) ? $item->renewal_option : json_decode($item->renewal_option, true);
                    if ($renewal) { $hasRenewals = true; }
                    @endphp
                    @if($renewal)
                     <tr>
                        <td width="60%">
                            <strong>{{ $item->description }} (Canone)</strong>
                             @if(isset($renewal['includes']) && is_array($renewal['includes']) && count($renewal['includes']) > 0)
                            <div style="margin-top: 5px;">
                                <ul class="mini-list">
                                    @foreach($renewal['includes'] as $inc)
                                        <li>{{ $inc }}</li>
                                    @endforeach
                                </ul>
                            </div>
                            @endif
                        </td>
                         <td width="20%"><span class="text-small text-muted">Annuale</span></td>
                        <td width="20%" class="text-right font-bold">€ {{ number_format($renewal['price'] ?? 0, 2, ',', '.') }}</td>
                     </tr>
                    @endif
                @endif
            @endforeach
            
            @if(!$hasRenewals)
                <tr><td colspan="3" class="text-center text-muted" style="padding: 20px; border:none;">Nessun costo di rinnovo previsto.</td></tr>
            @endif
        </table>
    </div>

    <div class="page-container page-break">
        <h2 style="border-bottom: none; margin-bottom: 10px; margin-top: 0;">Riepilogo Economico</h2>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th width="5%">#</th>
                    <th width="65%">Servizio</th>
                    <th width="30%" class="text-right">Importo</th>
                </tr>
            </thead>
            <tbody>
                @foreach($quote->items as $idx => $item)
                <tr>
                    <td class="text-muted">0{{ $idx + 1 }}</td>
                    <td><strong>{{ $item->description }}</strong></td>
                    <td class="text-right font-bold">€ {{ number_format($item->total, 2, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals-table">
            <tr>
                <td class="text-muted">Imponibile</td>
                <td class="font-bold">€ {{ number_format($quote->subtotal, 2, ',', '.') }}</td>
            </tr>
            @if($quote->discount_amount > 0)
            <tr>
                <td class="text-muted">Sconto ({{ number_format($quote->discount_percentage ?? 0, 1) }}%)</td>
                <td class="text-muted">- € {{ number_format($quote->discount_amount, 2, ',', '.') }}</td>
            </tr>
            @endif
            <tr>
                <td class="text-muted">IVA ({{ $quote->vat_rate ?? '0' }}%)</td>
                <td>€ {{ number_format($quote->tax_amount ?? 0, 2, ',', '.') }}</td>
            </tr>
            <tr>
                <td style="padding-top:10px;"><strong class="text-uppercase" style="font-size: 11px; color: #000;">Totale Investimento</strong></td>
                <td class="total-final">€ {{ number_format($quote->total_amount, 2, ',', '.') }}</td>
            </tr>
        </table>

        <div style="margin-top: 60px; page-break-inside: avoid;">
            <table width="100%">
                <tr>
                    <td width="60%" style="vertical-align: bottom;">
                        <p class="text-small text-muted" style="margin: 0; line-height: 1.5;">
                            Procedendo con la firma, il Cliente accetta i termini economici e le specifiche tecniche.<br>
                            Questo documento ha validità legale.
                        </p>
                    </td>
                    <td width="40%" class="text-center">
                        <div style="border-bottom: 2px solid #000; height: 35px; width: 90%; margin: 0 auto;"></div>
                        <div style="font-size: 9px; margin-top: 5px; color: #000; font-weight: 700; text-transform: uppercase;">Per Accettazione</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

<div class="page-container page-break">
        <div class="appendix-header">
            <span class="appendix-tag">Appendice A</span>
            <h1 style="margin: 5px 0 0 0;">Sicurezza & Compliance.</h1>
        </div>
        
        <p class="appendix-intro">
            Non ci limitiamo a "mettere online" il software. Costruiamo una fortezza digitale attorno ai tuoi dati. Di seguito dettagliamo l'infrastruttura, lo stack tecnologico e i protocolli di conformità che garantiscono la continuità del tuo business.
        </p>

        <table class="grid-2x2" style="margin-bottom: 25px;">
            <tr>
                <td class="grid-cell">
                    <span class="cell-title">Data Sovereignty EU</span>
                    <span class="cell-text">
                        I tuoi dati non lasciano mai l'Europa. Utilizziamo region AWS/DigitalOcean a Milano e Francoforte. Questo garantisce latenza zero e totale conformità legale alle normative GDPR italiane ed europee.
                    </span>
                </td>
                <td class="grid-cell">
                    <span class="cell-title">Crittografia Militare</span>
                    <span class="cell-text">
                        Ogni singolo dato sensibile nel database è cifrato con algoritmo AES-256. Le chiavi di decrittazione sono conservate in un Hardware Security Module (HSM) separato fisicamente dai dati.
                    </span>
                </td>
            </tr>
            <tr>
                <td class="grid-cell">
                    <span class="cell-title">Disaster Recovery</span>
                    <span class="cell-text">
                        Backup incrementali ogni ora e completi ogni 24 ore. I backup vengono replicati in una regione geografica diversa (es. Dublino) per garantire il ripristino anche in caso di disastro fisico del datacenter primario.
                    </span>
                </td>
                <td class="grid-cell">
                    <span class="cell-title">Protezione Attiva</span>
                    <span class="cell-text">
                        Firewall WAF configurato per bloccare attacchi SQL Injection, XSS e DDoS. Monitoraggio automatico 24/7 dei log di accesso per identificare anomalie comportamentali in tempo reale.
                    </span>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: separate; border-spacing: 20px 0; margin-left: -20px;">
            <tr>
                <td width="55%" style="vertical-align: top; padding: 20px; background: #fff; border: 1px solid #eee; border-radius: 8px;">
                    <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">Technology Stack</h3>
                    <p style="font-size: 11px; color: #666; margin-bottom: 15px;">
                        Utilizziamo tecnologie standard di mercato, stabili e supportate, per evitare il "lock-in" tecnologico.
                    </p>
                    <div>
                        <span class="tech-badge">PHP 8.2+</span>
                        <span class="tech-badge">Laravel Enterprise</span>
                        <span class="tech-badge">MySQL 8 / Postgres</span>
                        <span class="tech-badge">Redis Cache</span>
                        <span class="tech-badge">Docker Containers</span>
                        <span class="tech-badge">Nginx Server</span>
                        <span class="tech-badge">Vue.js / React</span>
                        <span class="tech-badge">AWS S3 Storage</span>
                    </div>
                </td>
                <td width="45%" style="vertical-align: top; padding: 20px; background: #fcfcfc; border: 1px solid #eee; border-radius: 8px;">
                    <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">Protocollo Compliance</h3>
                    <div class="check-row"><span class="check-icon">&#8226;</span> GDPR Compliant by Design</div>
                    <div class="check-row"><span class="check-icon">&#8226;</span> OWASP Top 10 Security Check</div>
                    <div class="check-row"><span class="check-icon">&#8226;</span> Audit Log delle attività</div>
                    <div class="check-row"><span class="check-icon">&#8226;</span> Cookie & Consent Manager</div>
                    <div class="check-row"><span class="check-icon">&#8226;</span> Penetration Test (Annuale)</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="page-container page-break">
        <div class="appendix-header">
            <span class="appendix-tag">Appendice B</span>
            <h1 style="margin: 5px 0 0 0;">Metodologia & Workflow.</h1>
        </div>
        
        <p class="appendix-intro">
            L'eccellenza non è un atto, ma un'abitudine. Il nostro processo di sviluppo è stato raffinato in oltre 50 progetti enterprise per garantire prevedibilità, qualità e rispetto dei tempi. Ecco esattamente cosa succede dopo la firma.
        </p>

        <h3 style="margin-top: 20px;">Il Nostro Ciclo Agile</h3>
        <table class="step-table">
            <tr>
                <td class="step-cell">
                    <span class="step-num">01</span>
                    <span class="step-title">Kick-off & Analisi</span>
                    <span class="step-desc">
                        Workshop tecnico di 4 ore per definire i requisiti granulari, la UX/UI e l'architettura database.
                    </span>
                </td>
                <td class="step-cell">
                    <span class="step-num">02</span>
                    <span class="step-title">Sviluppo (Sprint)</span>
                    <span class="step-desc">
                        Cicli di lavoro di 2 settimane. Al termine di ogni sprint, rilasciamo una demo testabile in ambiente di staging.
                    </span>
                </td>
                <td class="step-cell">
                    <span class="step-num">03</span>
                    <span class="step-title">Testing & QA</span>
                    <span class="step-desc">
                        Debug intensivo, stress test e validazione utente (UAT) per garantire assenza di errori critici.
                    </span>
                </td>
                <td class="step-cell" style="background: #f0f0f5; border-color: #4f46e5;">
                    <span class="step-num" style="color: #4f46e5;">04</span>
                    <span class="step-title">Deploy & Scale</span>
                    <span class="step-desc">
                        Messa in produzione sui server definitivi, configurazione monitoraggio e formazione al tuo staff.
                    </span>
                </td>
            </tr>
        </table>

        <table style="width: 100%; margin-top: 40px; border-collapse: separate; border-spacing: 20px 0; margin-left: -20px;">
            <tr>
                <td width="50%" style="vertical-align: top;">
                    <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h3 style="margin-bottom: 10px;">I 3 Pilastri BackSoftware</h3>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="margin-bottom: 15px;">
                                <strong style="display:block; font-size:12px;">1. Dev-to-Dev Diretto</strong>
                                <span style="font-size: 11px; color: #666; display:block; margin-top:4px;">Niente account manager. Parli direttamente con chi scrive il codice. Meno incomprensioni, più velocità.</span>
                            </li>
                            <li style="margin-bottom: 15px;">
                                <strong style="display:block; font-size:12px;">2. Proprietà Intellettuale</strong>
                                <span style="font-size: 11px; color: #666; display:block; margin-top:4px;">Il codice è tuo. Al saldo fattura ti consegniamo repository Git e accessi database. Nessun vincolo.</span>
                            </li>
                            <li>
                                <strong style="display:block; font-size:12px;">3. No Over-Engineering</strong>
                                <span style="font-size: 11px; color: #666; display:block; margin-top:4px;">Risolviamo il problema nel modo più semplice ed efficace. Non complichiamo le cose per gonfiare il preventivo.</span>
                            </li>
                        </ul>
                    </div>
                </td>
                <td width="50%" style="vertical-align: top;">
                    <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
                        <h3 style="margin-bottom: 10px;">Communication Suite</h3>
                        <p style="font-size: 11px; color: #666; margin-bottom: 15px;">
                            La trasparenza richiede gli strumenti giusti. Ecco dove vivrà il tuo progetto:
                        </p>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding-bottom: 10px;">
                                    <strong>Slack / Discord</strong><br>
                                    <span style="font-size: 10px; color: #888;">Chat diretta col team</span>
                                </td>
                                <td style="padding-bottom: 10px;">
                                    <strong>Trello / Jira</strong><br>
                                    <span style="font-size: 10px; color: #888;">Monitoraggio task</span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>GitHub / GitLab</strong><br>
                                    <span style="font-size: 10px; color: #888;">Codice sorgente</span>
                                </td>
                                <td>
                                    <strong>Google Meet</strong><br>
                                    <span style="font-size: 10px; color: #888;">Update settimanali</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="page-container">
        <div class="appendix-header">
            <span class="appendix-tag" style="background: #4f46e5;">Esclusiva Clienti</span>
            <h1 style="margin: 5px 0 0 0;">Benvenuto nel BackClub.</h1>
        </div>

        <p class="appendix-intro">
            Il software è solo lo strumento. Il business è fatto di relazioni. <strong>BackClub</strong> è il nostro ecosistema privato che connette clienti, investitori e partner tecnologici per generare valore oltre il codice.
        </p>

        <div class="bc-hero">
            <table style="width: 100%; color: #fff;">
                <tr>
                    <td width="65%" style="vertical-align: middle; padding-right: 30px;">
                        <h2>Il network che accelera la crescita.</h2>
                        <p style="color: #ccc; font-size: 12px; line-height: 1.6;">
                            Entrare in BackSoftware. Non è un semplice "bonus", è un acceleratore di business.
                        </p>
                        <div style="margin-top: 20px;">
                            <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px; font-size: 10px; margin-right: 10px;"> B2B Matching</span>
                            <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px; font-size: 10px;"> Investor Deck Review</span>
                        </div>
                    </td>
                    <td width="35%" style="vertical-align: middle; border-left: 1px solid #444; padding-left: 30px; text-align: center;">
                         <span style="font-size: 36px; font-weight: 700; color: #4f46e5; display: block;">Back</span>
                         <span style="font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px;">Club</span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="background: #fff; border: 1px dashed #ccc; border-radius: 8px; padding: 20px;">
            <table style="width: 100%;">
                <tr>
                    <td width="70%">
                        <strong style="font-size: 13px;">Richiedi l'accesso</strong>
                        <p style="font-size: 11px; color: #666; margin-top: 5px;">
                            Inserisci la tua email nella pagina di registrazione: riceverai una mail di ringraziamento e l'accesso al BackClub dopo aver accettato privacy e condizioni.
                        </p>
                    </td>
                    <td width="30%" class="text-right">
                        <a href="https://backclub.it/richiedi-accesso" style="background: #000; color: #fff; text-decoration: none; padding: 10px 15px; border-radius: 6px; font-size: 11px; font-weight: 700;">Richiedi accesso -&gt;</a>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <p style="font-size: 10px; color: #999;">L'iscrizione al BackClub è gratuita.</p>
        </div>
    </div>

</body>
</html>