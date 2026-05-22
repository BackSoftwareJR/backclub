@php
    /** @var \App\Models\PriceListItem $item */
@endphp

<style>
    @page { margin: 0cm; size: A4; }
    body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1d1d1f;
        line-height: 1.4;
        font-size: 12px;
        margin: 0;
        padding: 0;
        background: #f5f5f7;
    }

    .page-container {
        padding: 24px 28px;
        position: relative;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
    }

    .page-break {
        page-break-after: always;
    }

    .text-small { font-size: 10px; }
    .text-muted { color: #888; }
    .text-uppercase { text-transform: uppercase; letter-spacing: 0.5px; }
    .accent { color: #4f46e5; }

    h1 {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.8px;
        margin-bottom: 10px;
        color: #4f46e5;
        line-height: 1.1;
    }

    h2 {
        font-size: 12px;
        font-weight: 600;
        color: #000;
        margin-top: 0;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 2px solid #eee;
    }

    .subtitle {
        font-size: 13px;
        color: #666;
        font-weight: 400;
        margin-bottom: 15px;
        line-height: 1.5;
    }

    .feature-list {
        list-style: none;
        padding: 0;
        margin: 10px 0;
    }

    .feature-list li {
        padding: 6px 0 6px 15px;
        position: relative;
        color: #444;
        border-bottom: 1px solid #f9f9f9;
        font-size: 11px;
    }

    .feature-list li:before {
        content: "";
        background-color: #4f46e5;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        position: absolute;
        left: 0;
        top: 12px;
    }
</style>

<div class="page-container">
    @include('quotes._item_page', [
        'index' => 0,
        'serviceTitle' => $item->name,
        'priceListItem' => $item,
    ])
</div>

