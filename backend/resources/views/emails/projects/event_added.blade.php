@extends('emails.layouts.main')

@section('content')
    <h1>Nuovo Evento</h1>
    <p>È stato aggiunto un evento al progetto <strong>{{ $event->project->name }}</strong>.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Titolo</td>
            <td class="data-value">{{ $event->title }}</td>
        </tr>
        <tr>
            <td class="data-label">Data</td>
            <td class="data-value">{{ \Carbon\Carbon::parse($event->start_date)->format('d/m/Y H:i') }}</td>
        </tr>
        <tr>
            <td class="data-label">Tipo</td>
            <td class="data-value">{{ ucfirst($event->type ?? 'Evento') }}</td>
        </tr>
        @if($event->location)
        <tr>
            <td class="data-label">Luogo</td>
            <td class="data-value">{{ $event->location }}</td>
        </tr>
        @endif
    </table>

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.url') }}/dashboard" class="button">Vedi Calendario</a>
    </div>
@endsection
