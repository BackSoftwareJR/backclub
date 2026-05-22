@extends('emails.layouts.main')

@section('content')
    <h1>Richiesta Spostamento</h1>
    <p>{{ $request->user->name }} ha richiesto di spostare la scadenza della task <strong>{{ $request->task->title }}</strong>.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $request->task->project->name }}</td>
        </tr>
        <tr>
            <td class="data-label">Scadenza Attuale</td>
            <td class="data-value">{{ \Carbon\Carbon::parse($request->task->due_date)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td class="data-label">Nuova Scadenza</td>
            <td class="data-value highlight">{{ \Carbon\Carbon::parse($request->requested_date)->format('d/m/Y') }}</td>
        </tr>
    </table>

    @if($request->reason)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px;">Motivazione</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px; margin-bottom: 30px;">
            {{ $request->reason }}
        </p>
    @endif

    <div style="text-align: center;">
        <a href="{{ $approveUrl }}" class="button" style="margin-right: 10px;">Approva</a>
        <a href="{{ $rejectUrl }}" class="button button-danger">Rifiuta</a>
    </div>
@endsection
