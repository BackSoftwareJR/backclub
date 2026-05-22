@php
    /** @var int $index */
    /** @var string $serviceTitle */
    /** @var \App\Models\PriceListItem|null $priceListItem */
    $plItem = $priceListItem ?? null;
@endphp

<div class="page-container page-break">
    <div class="text-small text-muted text-uppercase" style="margin-bottom: 5px;">Servizio 0{{ $index + 1 }}</div>
    <h1 style="color: #4f46e5; font-size: 26px;">{{ $serviceTitle }}</h1>
    @if($plItem && $plItem->description)
        <p class="subtitle">{{ $plItem->description }}</p>
    @endif
    <table style="width: 100%; margin-top: 25px; border-collapse: collapse;">
        <tr>
            <td width="50%" style="vertical-align: top; padding-right: 30px;">
                <h2 style="margin-top: 0; font-size: 12px; border-bottom: 2px solid #eee; color: #000;">Specifiche Tecniche</h2>
                @if($plItem && !empty($plItem->features))
                    <ul class="feature-list">
                        @foreach($plItem->features as $feature)
                            <li>{{ $feature }}</li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-muted text-small">Dettagli specifici nel capitolato.</p>
                @endif
            </td>
            <td width="50%" style="vertical-align: top;">
                @if($plItem && $plItem->operational_notes)
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 6px;">
                        <strong class="text-small text-uppercase accent" style="display: block; margin-bottom: 8px;">Metodologia Operativa</strong>
                        <div style="font-size: 11px; line-height: 1.6; color: #444; white-space: pre-line;">{!! nl2br(e($plItem->operational_notes)) !!}</div>
                    </div>
                @endif
            </td>
        </tr>
    </table>
</div>

