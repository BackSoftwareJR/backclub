@extends('emails.layouts.main')

@section('content')
    <h1>Nuovo Accesso</h1>
    <p>È stato rilevato un nuovo accesso al tuo account Admin.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Data</td>
            <td class="data-value">{{ $time->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td class="data-label">Ora</td>
            <td class="data-value">{{ $time->format('H:i:s') }}</td>
        </tr>
        <tr>
            <td class="data-label">Indirizzo IP</td>
            <td class="data-value">{{ $ip }}</td>
        </tr>
    </table>

    <p style="font-size: 14px; color: #86868b;">Se sei stato tu, puoi ignorare questa email.</p>
@endsection
